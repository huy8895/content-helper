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

      // 5. Hiển thị toast thông báo bắt đầu
      if (window.ContentHelper) {
        ContentHelper.showToast(
          `⚡ Bắt đầu chạy parallel: ${scenarioName} (${prompts[0]?.label || 'N/A'})`,
          'info'
        );
      }

      // 6. Tạo PromptSequencer và chạy
      const sequencer = new PromptSequencer(
        prompts,
        _sendPrompt,
        _waitForResponse,
        (idx, total) => {
          console.log(`📊 [ParallelWorker] Tiến trình: ${idx}/${total}`);
        },
        `Parallel: ${scenarioName}`
      );

      // 7. Chạy sequencer và đợi hoàn thành
      await new Promise((resolve) => {
        sequencer.start(() => resolve());
      });

      // 8. Thu thập nội dung AI response từ tab
      const collectedContent = _collectContent();
      console.log(`✅ [ParallelWorker] Task "${taskId}" hoàn thành! Content: ${collectedContent.length} ký tự`);

      if (window.ContentHelper) {
        ContentHelper.showToast(
          `✅ Hoàn thành: ${scenarioName} (${prompts[0]?.label || 'N/A'})`,
          'success'
        );
      }

      // 9. Ghi kết quả vào chrome.storage.local
      await _updateTaskInStorage(taskData.sessionId, taskId, {
        status: 'completed',
        label: prompts[0]?.label || taskId,
        content: collectedContent
      });

    } catch (error) {
      console.error(`❌ [ParallelWorker] Task "${taskId}" lỗi:`, error);

      if (window.ContentHelper) {
        ContentHelper.showToast(`❌ Lỗi: ${error.message}`, 'error');
      }

      // Ghi lỗi vào chrome.storage.local
      await _updateTaskInStorage(taskData.sessionId, taskId, {
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
      // Trả lời ngay để background biết đã nhận
      sendResponse({ received: true });
    }
  });

  // ── Public API ──────────────────────────────────────────────────
  return {
    // Expose cho testing/debugging
    _expandScenario,
    _getLoopKey,
  };

})();
