/**
 * ParallelWorker.js
 * =================
 * Content script chạy trên mỗi tab con khi ScenarioRunner chạy chế độ song song.
 * 
 * Chức năng:
 *   - Lắng nghe message PARALLEL_EXEC_TASK từ background
 *   - Đợi ChatAdapter sẵn sàng trên tab mới
 *   - Load scenario template từ chrome.storage.local
 *   - Tạo danh sách prompt (expand variables) và chạy PromptSequencer
 *   - Gửi PARALLEL_TASK_DONE về background khi hoàn thành hoặc lỗi
 * 
 * Lưu ý:
 *   - Tab con chạy headless (không mở UI ScenarioRunner)
 *   - Mỗi tab chỉ xử lý 1 giá trị trong list (ví dụ: 1 ngôn ngữ)
 *   - Hiện chỉ hỗ trợ Gemini (gemini.google.com)
 */

window.ParallelWorker = (() => {
  // ── Cấu hình ────────────────────────────────────────────────────
  const CONFIG = {
    adapterPollInterval: 500,   // ms - tần suất kiểm tra ChatAdapter
    adapterMaxWait: 30000,      // ms - thời gian tối đa chờ ChatAdapter (30s)
    delayBeforeStart: 2000,     // ms - delay sau khi adapter sẵn sàng trước khi bắt đầu
  };

  // ── Biến trạng thái của task hiện tại ───────────────────────────
  let _currentSessionId = null;
  let _currentTaskId = null;
  let _hasSentFirstPrompt = false;

  /**
   * Đợi ChatAdapter sẵn sàng trên tab hiện tại.
   * @returns {Promise<object>} ChatAdapter instance
   * @throws {Error} nếu timeout
   */
  function _waitForAdapter() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const poll = setInterval(() => {
        // Kiểm tra ChatAdapter đã được khởi tạo và có textarea (trang đã load xong)
        if (window.ChatAdapter && window.ChatAdapter.getTextarea()) {
          clearInterval(poll);
          console.log('✅ [ParallelWorker] ChatAdapter đã sẵn sàng');
          resolve(window.ChatAdapter);
          return;
        }

        // Timeout
        if (Date.now() - startTime > CONFIG.adapterMaxWait) {
          clearInterval(poll);
          reject(new Error('⏰ [ParallelWorker] Timeout chờ ChatAdapter'));
        }
      }, CONFIG.adapterPollInterval);
    });
  }

  /**
   * Load scenario templates từ chrome.storage.local.
   * @returns {Promise<object>} Object chứa tất cả scenario templates
   */
  function _loadTemplates() {
    return new Promise((resolve) => {
      chrome.storage.local.get('scenarioTemplates', (items) => {
        resolve(items.scenarioTemplates || {});
      });
    });
  }

  /**
   * Trích xuất text sạch từ một DOM element (logic tương tự ContentCopyPanel._getText).
   * Loại bỏ button, script, style và chuẩn hóa whitespace.
   * @param {HTMLElement} el - DOM element chứa nội dung
   * @returns {string} Text đã được làm sạch
   */
  function _getText(el) {
    if (!el) return '';
    const wrapper = document.createElement('div');
    const clone = el.cloneNode(true);
    wrapper.appendChild(clone);

    // Loại bỏ UI elements không cần thiết
    wrapper.querySelectorAll('button, .sr-only, script, style').forEach(x => x.remove());

    // Thay <br> thành newline
    wrapper.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

    // Block elements → thêm \n\n
    wrapper.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(b => b.after('\n\n'));

    // Div, Li, Tr → \n
    wrapper.querySelectorAll('div, li, tr').forEach(b => b.after('\n'));

    let text = wrapper.textContent;
    return text.replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Thu thập toàn bộ nội dung AI response từ tab hiện tại.
   * Dùng ChatAdapter.getContentElements() để lấy các phần tử nội dung,
   * rồi extract text sạch từ mỗi phần tử.
   * @returns {string} Toàn bộ nội dung AI đã ghép lại
   */
  function _collectContent() {
    const chat = window.ChatAdapter;
    if (!chat || typeof chat.getContentElements !== 'function') {
      console.warn('⚠️ [ParallelWorker] ChatAdapter.getContentElements không khả dụng');
      return '';
    }

    const elements = chat.getContentElements();
    if (!elements || elements.length === 0) {
      console.warn('⚠️ [ParallelWorker] Không tìm thấy content elements');
      return '';
    }

    console.log(`📄 [ParallelWorker] Thu thập ${elements.length} content blocks`);
    return elements.map(el => _getText(el)).join('\n\n==========\n\n');
  }

  /**
   * Thu thập nội dung AI response có retry và delay.
   * Rất hữu ích khi tab con chạy ẩn (background) và trình duyệt trì hoãn việc render DOM.
   * 
   * @param {number} maxWaitMs - Thời gian tối đa chờ DOM render (ms)
   * @param {number} pollIntervalMs - Tần suất kiểm tra (ms)
   * @returns {Promise<string>} Nội dung thu thập được
   */
  async function _collectContentWithRetry(maxWaitMs = 5000, pollIntervalMs = 500) {
    const startTime = Date.now();
    console.log("🔍 [ParallelWorker] Bắt đầu thu thập dữ liệu (có cơ chế kiểm tra blank)...");
    
    while (Date.now() - startTime < maxWaitMs) {
      const content = _collectContent();
      if (content && content.trim().length > 0) {
        console.log(`✨ [ParallelWorker] Đã thu thập thành công sau ${Date.now() - startTime}ms!`);
        return content;
      }
      console.log(`⏳ [ParallelWorker] Nội dung trống, đang đợi DOM render... (chờ thêm tối đa ${Math.max(0, maxWaitMs - (Date.now() - startTime))}ms)`);
      await new Promise(r => setTimeout(r, pollIntervalMs));
    }
    
    // Fallback trả về kết quả kiểm tra cuối cùng
    return _collectContent();
  }

  /**
   * Lấy loopKey từ question definition.
   * (Copy logic từ ScenarioRunner._getLoopKey)
   * @param {object} q - Question object
   * @returns {string} loopKey
   */
  function _getLoopKey(q) {
    return q.loopKey || (q.text.match(/\$\{(\w+)\}/) || [])[1];
  }

  /**
   * Cập nhật trạng thái task trong chrome.storage.local.
   * @param {string} sessionId - ID phiên parallel
   * @param {string} taskId - ID task cần cập nhật
   * @param {object} updates - Dữ liệu cập nhật {status, content, error, label}
   * @returns {Promise<boolean>}
   */
  function _updateTaskInStorage(sessionId, taskId, updates) {
    const key = `parallel_session_${sessionId}`;
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        const session = result[key];
        if (!session || !session.tasks[taskId]) {
          console.warn(`⚠️ [ParallelWorker] Không tìm thấy task ${taskId} trong storage`);
          resolve(false);
          return;
        }
        session.tasks[taskId] = { ...session.tasks[taskId], ...updates, updatedAt: Date.now() };
        chrome.storage.local.set({ [key]: session }, () => {
          console.log(`💾 [ParallelWorker] Đã ghi task "${taskId}" → ${updates.status} vào storage`);
          resolve(true);
        });
      });
    });
  }

  /**
   * Mở rộng (expand) scenario thành danh sách prompt.
   * Xử lý đặc biệt: với question type "list", chỉ thay thế loopKey = singleValue
   * (thay vì lặp qua tất cả giá trị).
   * 
   * @param {Array} questions - Danh sách câu hỏi từ scenario template
   * @param {object} values - Giá trị các biến
   * @returns {Array<{text: string, label: string|null}>} Danh sách prompt đã expand
   */
  function _expandScenario(questions, values) {
    const result = [];

    for (const q of questions) {
      if (q.type === 'text') {
        // Gửi nguyên văn, không thay thế biến
        result.push({ text: q.text, label: null });

      } else if (q.type === 'variable') {
        // Thay thế ${key} bằng giá trị tương ứng
        const filled = q.text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => values[k] || '');
        result.push({ text: filled, label: null });

      } else if (q.type === 'loop') {
        // Lặp N lần
        const loopKey = _getLoopKey(q);
        const count = parseInt(values[loopKey] || '0', 10);
        for (let i = 1; i <= count; i++) {
          const prompt = q.text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => {
            if (k === loopKey) return String(i);
            return values[k] || '';
          });
          result.push({ text: prompt, label: `Lần ${i}` });
        }

      } else if (q.type === 'list') {
        // Trong chế độ parallel, mỗi tab chỉ nhận 1 giá trị cho loopKey
        // values[loopKey] đã được set = giá trị đơn (không phải danh sách phẩy)
        const loopKey = _getLoopKey(q);
        const singleValue = values[loopKey] || '';
        const prompt = q.text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => {
          if (k === loopKey) return singleValue;
          return values[k] || '';
        });
        result.push({ text: prompt, label: singleValue });
      }
    }

    return result;
  }

  /**
   * Gửi prompt vào ô nhập và click nút gửi.
   * (Tương tự ScenarioRunner._sendPrompt)
   * @param {object|string} prompt - Prompt object hoặc string
   */
  async function _sendPrompt(prompt) {
    const text = typeof prompt === 'string' ? prompt : prompt.text;
    const chat = window.ChatAdapter;
    const textarea = chat.getTextarea();

    if (!textarea) throw new Error('❌ [ParallelWorker] Không tìm thấy textarea');

    // Gemini sử dụng contenteditable div, không phải textarea
    if (textarea.tagName === 'TEXTAREA') {
      textarea.value = text;
    } else {
      textarea.innerHTML = '';
      textarea.appendChild(Object.assign(document.createElement('p'), { textContent: text }));
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    // Đợi nút gửi sẵn sàng rồi click
    const sendBtn = await _waitForElement(() => chat.getSendBtn(), 25, 300);
    sendBtn?.click();

    // Thông báo cho background biết câu hỏi đầu tiên đã được gửi đi
    if (!_hasSentFirstPrompt) {
      _hasSentFirstPrompt = true;
      try {
        chrome.runtime.sendMessage({
          type: 'PARALLEL_TASK_FIRST_PROMPT_SENT',
          sessionId: _currentSessionId,
          taskId: _currentTaskId
        });
        console.log('📨 [ParallelWorker] Đã báo gửi prompt đầu tiên cho background');
      } catch (e) {
        console.warn('⚠️ [ParallelWorker] Không gửi được tin nhắn báo gửi prompt đầu tiên:', e);
      }
    }
  }

  /**
   * Chờ AI phản hồi xong – sử dụng ResponseWaiter.
   * @param {number} timeout - Thời gian tối đa chờ (ms)
   * @returns {Promise<void>}
   */
  function _waitForResponse(timeout = 600000) {
    return ResponseWaiter.waitForDone({ timeout, autoScroll: true });
  }

  /**
   * Chờ một element xuất hiện bằng polling.
   * @param {Function} fnGet - Hàm trả về element hoặc null
   * @param {number} maxRetries - Số lần thử tối đa
   * @param {number} interval - Khoảng cách giữa các lần thử (ms)
   * @returns {Promise<HTMLElement|null>}
   */
  function _waitForElement(fnGet, maxRetries = 25, interval = 300) {
    return new Promise((resolve) => {
      let tries = 0;
      const id = setInterval(() => {
        const el = fnGet();
        if (el || tries >= maxRetries) {
          clearInterval(id);
          resolve(el);
        }
        tries++;
      }, interval);
    });
  }

  /**
   * Xử lý chính: nhận task từ background và thực thi.
   * @param {object} taskData - Dữ liệu task
   * @param {string} taskData.taskId - ID duy nhất của task
   * @param {string} taskData.scenarioName - Tên scenario template
   * @param {object} taskData.values - Giá trị các biến (loopKey đã = giá trị đơn)
   * @param {number} taskData.startAt - Bắt đầu từ bước nào
   */
  async function _executeTask(taskData) {
    const { taskId, scenarioName, values, startAt } = taskData;

    _currentSessionId = taskData.sessionId;
    _currentTaskId = taskId;
    _hasSentFirstPrompt = false;

    console.log(`🚀 [ParallelWorker] Bắt đầu task "${taskId}" cho scenario "${scenarioName}"`);
    console.log(`📋 [ParallelWorker] Giá trị biến:`, values);

    try {
      // 1. Đợi ChatAdapter sẵn sàng
      await _waitForAdapter();

      // 2. Delay để đảm bảo trang ổn định
      await new Promise(r => setTimeout(r, CONFIG.delayBeforeStart));

      // 2b. Kích hoạt cuộc trò chuyện tạm thời để tránh làm rác lịch sử Gemini của người dùng
      if (window.ChatAdapter && typeof window.ChatAdapter.enableTemporaryChat === 'function') {
        try {
          await window.ChatAdapter.enableTemporaryChat();
        } catch (e) {
          console.warn("⚠️ [ParallelWorker] Không thể bật trò chuyện tạm thời:", e);
        }
      }

      // 3. Load scenario template
      const templates = await _loadTemplates();
      const raw = templates[scenarioName];

      if (!raw) {
        throw new Error(`Không tìm thấy scenario "${scenarioName}"`);
      }

      // 4. Lấy danh sách questions và expand thành prompts
      const tplArr = Array.isArray(raw) ? raw : (raw.questions || []);
      const slice = tplArr.slice(startAt);
      const prompts = _expandScenario(slice, values);

      if (prompts.length === 0) {
        throw new Error('Không có prompt nào sau khi expand');
      }

      console.log(`📝 [ParallelWorker] Sẽ gửi ${prompts.length} prompt(s)`);

      // 6. Tạo PromptSequencer và chạy
      const sequencer = new PromptSequencer(
        prompts,
        _sendPrompt,
        _waitForResponse,
        (idx, total) => {
          console.log(`📊 [ParallelWorker] Tiến trình: ${idx}/${total}`);
        },
        `Parallel: ${scenarioName}`,
        true // Silent mode
      );

      // 7. Chạy sequencer và đợi hoàn thành
      await new Promise((resolve) => {
        sequencer.start(() => resolve());
      });

      // 7b. Kích hoạt (active) tab phụ lên màn hình chính để browser kích hoạt render DOM
      console.log("🖱️ [ParallelWorker] Yêu cầu active tab...");
      try {
        await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'PARALLEL_ACTIVE_TAB' }, (res) => {
            resolve(res);
          });
        });
      } catch (e) {
        console.warn("⚠️ [ParallelWorker] Không thể active tab:", e);
      }

      // Đợi 1 giây để trang web render lại DOM
      await new Promise(r => setTimeout(r, 1000));

      // 8. Thu thập nội dung AI response từ tab (có retry nếu trống)
      const collectedContent = await _collectContentWithRetry(5000, 500);
      console.log(`✅ [ParallelWorker] Task "${taskId}" hoàn thành! Content: ${collectedContent.length} ký tự`);

      // 8b. Hiển thị hộp thoại hỏi người dùng có muốn đóng tab không
      const label = taskData.label || taskId;
      const contentPreview = collectedContent.trim().length > 0 
        ? `Đã thu thập thành công (${collectedContent.length} ký tự).` 
        : "⚠️ CẢNH BÁO: Dữ liệu thu thập bị TRỐNG (blank)!";

      const shouldClose = confirm(
        `[Content Helper] Kịch bản song song cho: "${label}" đã HOÀN THÀNH!\n\n` +
        `${contentPreview}\n\n` +
        `Bạn có muốn ĐÓNG tab này không?\n` +
        `(Chọn OK để đóng tab ngay, chọn Cancel để giữ lại tab xem chi tiết)`
      );

      // 9. Ghi kết quả vào chrome.storage.local (label giữ nguyên từ ScenarioRunner)
      await _updateTaskInStorage(taskData.sessionId, taskId, {
        status: 'completed',
        content: collectedContent,
        shouldCloseTab: shouldClose
      });

    } catch (error) {
      console.error(`❌ [ParallelWorker] Task "${taskId}" lỗi:`, error);

      // Chủ động active tab lỗi lên
      try {
        await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'PARALLEL_ACTIVE_TAB' }, () => resolve());
        });
      } catch (e) {}

      const label = taskData.label || taskId;
      const shouldClose = confirm(
        `❌ [Content Helper] Kịch bản song song cho: "${label}" bị LỖI!\n\n` +
        `Lỗi: ${error.message}\n\n` +
        `Bạn có muốn ĐÓNG tab này không?`
      );

      // Ghi lỗi vào chrome.storage.local
      await _updateTaskInStorage(taskData.sessionId, taskId, {
        status: 'failed',
        error: error.message,
        shouldCloseTab: shouldClose
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Split Tabs – Xử lý nhiều items tuần tự trên 1 tab (v2)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Cập nhật trạng thái task vào storage key riêng (KHÔNG race condition).
   * Mỗi task ghi thẳng vào `split_task_{taskId}` — không đọc/ghi session chung.
   * @param {string} taskId - ID task
   * @param {object} updates - Dữ liệu cập nhật
   * @returns {Promise<void>}
   */
  function _updateSplitTaskInStorage(taskId, updates) {
    const key = `split_task_${taskId}`;
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        const existing = result[key] || {};
        const merged = { ...existing, ...updates, updatedAt: Date.now() };
        chrome.storage.local.set({ [key]: merged }, () => {
          console.log(`💾 [ParallelWorker] split_task "${taskId}" → ${updates.status || 'update'}`);
          resolve();
        });
      });
    });
  }

  /**
   * Yêu cầu background tạm activate tab hiện tại.
   * Giúp tránh Chrome throttle setTimeout/setInterval khi tab ẩn.
   * @returns {Promise<void>}
   */
  function _activateCurrentTab() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'SPLIT_TABS_ACTIVATE_TAB' }, () => {
          resolve();
        });
      } catch (e) {
        console.warn('⚠️ [ParallelWorker] Không thể activate tab:', e);
        resolve();
      }
    });
  }

  // ── Mini Panel UI cho worker tab ──────────────────────────────

  let _splitPanel = null;

  /**
   * Tạo mini panel hiển thị trạng thái trên worker tab.
   * @param {string} label - Label của task (ví dụ: "Tab 1 (3 items)")
   * @param {Array<string>} items - Danh sách items
   * @param {string} scenarioName - Tên scenario
   */
  function _createSplitPanel(label, items, scenarioName) {
    if (_splitPanel) _splitPanel.remove();

    const el = document.createElement('div');
    el.id = 'split-worker-panel';
    el.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
      width: 360px; max-height: 400px; overflow-y: auto;
      background: #1a1a2e; color: #e0e0e0; border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px; padding: 16px;
    `;

    const itemsHtml = items.map((item, i) => 
      `<span id="split-item-${i}" style="
        display: inline-block; padding: 2px 8px; margin: 2px;
        border-radius: 12px; font-size: 10px; font-weight: 600;
        background: rgba(255,255,255,0.08); color: #888;
      ">⏳ ${item}</span>`
    ).join('');

    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div>
          <div style="font-weight:700; font-size:13px; color:#5eead4;">🔀 ${label}</div>
          <div style="font-size:10px; color:#888; margin-top:2px;">${scenarioName}</div>
        </div>
        <button id="split-panel-minimize" style="
          background: none; border: none; color: #888; cursor: pointer; font-size: 16px;
          padding: 4px; line-height: 1;
        " title="Thu nhỏ">−</button>
      </div>
      <div id="split-panel-body">
        <div style="margin-bottom:8px;">
          <div style="font-size:10px; font-weight:700; color:#666; text-transform:uppercase; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
            <span>Items</span>
            <div style="display:flex; gap:8px;">
              <button id="split-panel-sync-btn" style="background:none; border:none; color:#facc15; cursor:pointer; font-size:9px; padding:0; line-height:1;" title="Đồng bộ tên lên trò chuyện">Đồng bộ tên</button>
              <button id="split-panel-copy-btn" style="background:none; border:none; color:#5eead4; cursor:pointer; font-size:9px; padding:0; line-height:1;">Copy</button>
            </div>
          </div>
          <textarea id="split-panel-copy-text" readonly style="
            width: 100%; height: 28px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); 
            border-radius: 6px; color: #888; font-size: 9px; padding: 4px 6px; margin-bottom: 6px; 
            resize: none; outline: none; font-family: monospace; white-space: nowrap; overflow-x: auto;
          ">${items.join(', ')}</textarea>
          <div id="split-items-list" style="line-height:1.8;">${itemsHtml}</div>
        </div>
        <div style="margin-bottom:8px;">
          <div style="font-size:10px; font-weight:700; color:#666; text-transform:uppercase; margin-bottom:4px;">Prompt</div>
          <div id="split-prompt-progress" style="
            display:flex; align-items:center; gap:8px;
          ">
            <div style="flex:1; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden;">
              <div id="split-prompt-bar" style="height:100%; width:0%; background:#5eead4; border-radius:2px; transition:width 0.3s;"></div>
            </div>
            <span id="split-prompt-text" style="font-size:10px; color:#5eead4; font-weight:700;">0/0</span>
          </div>
        </div>
        <div id="split-current-prompt" style="
          font-size:10px; color:#aaa; background:rgba(255,255,255,0.05);
          padding:8px; border-radius:8px; max-height:60px; overflow-y:auto;
          word-break:break-word; line-height:1.4;
        ">Đang chuẩn bị...</div>
      </div>
    `;

    document.body.appendChild(el);
    _splitPanel = el;

    // Nút minimize
    let minimized = false;
    el.querySelector('#split-panel-minimize').onclick = () => {
      minimized = !minimized;
      el.querySelector('#split-panel-body').style.display = minimized ? 'none' : 'block';
      el.querySelector('#split-panel-minimize').textContent = minimized ? '+' : '−';
    };

    // Nút copy items
    const copyBtn = el.querySelector('#split-panel-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = el.querySelector('#split-panel-copy-text')?.value || '';
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = 'Copied!';
        }).catch(() => {
          copyBtn.textContent = 'Error';
        }).finally(() => {
          setTimeout(() => {
            if (copyBtn) copyBtn.textContent = 'Copy';
          }, 2000);
        });
      });
    }

    // Nút đồng bộ tên
    const syncBtn = el.querySelector('#split-panel-sync-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        const text = el.querySelector('#split-panel-copy-text')?.value || '';
        if (!text) return;
        
        syncBtn.textContent = 'Đang sync...';
        
        // Tìm nút edit
        const editBtn = document.querySelector('button[aria-label="Edit prompt title and description"]');
        if (!editBtn) {
          syncBtn.textContent = 'Lỗi: Không tìm thấy nút edit';
          setTimeout(() => { syncBtn.textContent = 'Đồng bộ tên'; }, 2000);
          return;
        }

        editBtn.click();

        // Chờ popup mở lên
        let retries = 0;
        const waitPopup = setInterval(() => {
          retries++;
          const popup = document.querySelector('ms-save-prompt-dialog');
          if (popup) {
            clearInterval(waitPopup);
            const nameInput = popup.querySelector('input[aria-label="Prompt name text field"]');
            const saveBtn = popup.querySelector('button.ms-button-primary[aria-label="Save title and description"]');
            
            if (nameInput) {
              nameInput.value = text;
              nameInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            if (saveBtn) {
              setTimeout(() => {
                saveBtn.click();
                syncBtn.textContent = 'Thành công!';
                setTimeout(() => { syncBtn.textContent = 'Đồng bộ tên'; }, 2000);
              }, 100);
            }
          } else if (retries > 20) { // Chờ tối đa 4s (20 * 200ms)
            clearInterval(waitPopup);
            syncBtn.textContent = 'Lỗi: Không mở được popup';
            setTimeout(() => { syncBtn.textContent = 'Đồng bộ tên'; }, 2000);
          }
        }, 200);
      });
    }
  }

  /**
   * Cập nhật trạng thái item trên panel.
   * @param {number} index - Index của item
   * @param {'waiting'|'running'|'done'|'error'} status
   */
  function _updatePanelItem(index, status) {
    if (!_splitPanel) return;
    const el = _splitPanel.querySelector(`#split-item-${index}`);
    if (!el) return;

    const styles = {
      waiting: { bg: 'rgba(255,255,255,0.08)', color: '#888', icon: '⏳' },
      running: { bg: 'rgba(94,234,212,0.15)', color: '#5eead4', icon: '🔄' },
      done:    { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', icon: '✅' },
      error:   { bg: 'rgba(248,113,113,0.15)', color: '#f87171', icon: '❌' },
    };
    const s = styles[status] || styles.waiting;
    el.style.background = s.bg;
    el.style.color = s.color;
    el.textContent = `${s.icon} ${el.textContent.replace(/^[^\s]+\s/, '')}`;
  }

  /**
   * Cập nhật progress prompt trên panel.
   * @param {number} current - Prompt hiện tại
   * @param {number} total - Tổng số prompts
   * @param {string} promptText - Nội dung prompt đang gửi
   */
  function _updatePanelPrompt(current, total, promptText) {
    if (!_splitPanel) return;
    const bar = _splitPanel.querySelector('#split-prompt-bar');
    const text = _splitPanel.querySelector('#split-prompt-text');
    const content = _splitPanel.querySelector('#split-current-prompt');

    if (bar) bar.style.width = `${total > 0 ? Math.round((current / total) * 100) : 0}%`;
    if (text) text.textContent = `${current}/${total}`;
    if (content) content.textContent = promptText || '';
  }

  /**
   * Hiện trạng thái hoàn thành trên panel.
   * @param {boolean} success
   * @param {string} message
   */
  function _showPanelDone(success, message) {
    if (!_splitPanel) return;
    const content = _splitPanel.querySelector('#split-current-prompt');
    if (content) {
      content.style.background = success ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)';
      content.style.color = success ? '#4ade80' : '#f87171';
      content.textContent = message;
    }
  }

  /**
   * Xử lý chính cho Split Tabs: nhận task chứa nhiều items và chạy tuần tự.
   * Hiển thị mini panel, ghi per-task storage, activate tab trước gửi prompt.
   */
  async function _executeSplitTask(taskData) {
    const { taskId, scenarioName, values, items, loopKey, startAt } = taskData;
    const sessionId = taskData.sessionId;
    const label = taskData.label || taskId;

    console.log(`🔀 [ParallelWorker] Bắt đầu split task "${taskId}" với ${items.length} items`);

    // Tạo mini panel UI
    _createSplitPanel(label, items, scenarioName);

    try {
      // 1. Đợi ChatAdapter sẵn sàng
      await _waitForAdapter();
      await new Promise(r => setTimeout(r, CONFIG.delayBeforeStart));

      // 1b. Kích hoạt cuộc trò chuyện tạm thời
      if (window.ChatAdapter && typeof window.ChatAdapter.enableTemporaryChat === 'function') {
        try {
          await window.ChatAdapter.enableTemporaryChat();
        } catch (e) {
          console.warn("⚠️ [ParallelWorker] Không thể bật trò chuyện tạm thời:", e);
        }
      }

      // 2. Load scenario template
      const templates = await _loadTemplates();
      const raw = templates[scenarioName];
      if (!raw) throw new Error(`Không tìm thấy scenario "${scenarioName}"`);

      const tplArr = Array.isArray(raw) ? raw : (raw.questions || []);
      const slice = tplArr.slice(startAt);

      // 3. Lặp qua từng item
      const completedItems = [];

      for (let i = 0; i < items.length; i++) {
        const currentItem = items[i];
        console.log(`🔀 [ParallelWorker] === Item ${i + 1}/${items.length}: "${currentItem}" ===`);

        // Cập nhật UI + storage
        _updatePanelItem(i, 'running');
        await _updateSplitTaskInStorage(taskId, {
          status: 'running',
          currentItem: currentItem,
          currentIndex: i,
          completedItems: completedItems.slice()
        });

        // Expand scenario
        const itemValues = { ...values, [loopKey]: currentItem };
        const prompts = _expandScenario(slice, itemValues);

        if (prompts.length === 0) {
          console.warn(`⚠️ Không có prompt cho item "${currentItem}", bỏ qua`);
          completedItems.push(currentItem);
          _updatePanelItem(i, 'done');
          continue;
        }

        _updatePanelPrompt(0, prompts.length, prompts[0]?.text || '');

        // Tạo PromptSequencer — dùng wrapper sendPrompt có activate tab
        const sendPromptWithActivate = async (prompt) => {
          // Activate tab trước khi gửi prompt để tránh throttle
          await _activateCurrentTab();
          await new Promise(r => setTimeout(r, 300));
          await _sendPrompt(prompt);
        };

        const sequencer = new PromptSequencer(
          prompts,
          sendPromptWithActivate,
          _waitForResponse,
          (idx, total) => {
            console.log(`📊 [ParallelWorker] Item "${currentItem}": ${idx}/${total}`);
            _updatePanelPrompt(idx, total, idx < prompts.length ? (prompts[idx]?.text || '') : 'Hoàn thành');
          },
          `Split: ${scenarioName} - ${currentItem}`,
          true
        );

        await new Promise((resolve) => {
          sequencer.start(() => resolve());
        });

        completedItems.push(currentItem);
        _updatePanelItem(i, 'done');
        _updatePanelPrompt(prompts.length, prompts.length, '✅ Done');

        // Cập nhật storage sau mỗi item
        await _updateSplitTaskInStorage(taskId, {
          status: 'running',
          currentItem: currentItem,
          currentIndex: i,
          completedItems: completedItems.slice()
        });

        console.log(`✅ Item "${currentItem}" hoàn thành (${completedItems.length}/${items.length})`);
      }

      // 4. Tất cả items xong
      console.log(`🎉 Split task "${taskId}" hoàn thành! ${completedItems.length}/${items.length} items`);
      _showPanelDone(true, `🎉 Hoàn thành ${completedItems.length}/${items.length} items!`);

      await _updateSplitTaskInStorage(taskId, {
        status: 'completed',
        completedItems: completedItems,
        currentItem: null,
        currentIndex: items.length
      });

    } catch (error) {
      console.error(`❌ Split task "${taskId}" lỗi:`, error);
      _showPanelDone(false, `❌ Lỗi: ${error.message}`);

      await _updateSplitTaskInStorage(taskId, {
        status: 'failed',
        error: error.message
      });
    }
  }

  // ── Lắng nghe message từ background ──────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'PARALLEL_EXEC_TASK') {
      console.log('📨 [ParallelWorker] Nhận task:', msg);
      _executeTask(msg);
      sendResponse({ received: true });
    }

    if (msg.type === 'SPLIT_TABS_EXEC_TASK') {
      console.log('📨 [ParallelWorker] Nhận split task:', msg);
      _executeSplitTask(msg);
      sendResponse({ received: true });
    }
  });

  // ── Public API ──────────────────────────────────────────────────
  return {
    _expandScenario,
    _getLoopKey,
  };

})();

