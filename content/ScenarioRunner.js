// --- START OF FILE ScenarioRunner.js (UPDATED) ---

const ScenarioRunnerInnerHTML = `
  <div class="sr-header">
    <span class="sr-title">📤 Scenario Runner</span>
  </div>

  <!-- THAY THẾ DROPDOWN BẰNG Ô TÌM KIẾM -->
  <div id="sr-scenario-browser">
    <label class="sr-label" for="sr-scenario-search">Chọn kịch bản:</label>
    <input type="text" id="sr-scenario-search" placeholder="🔍 Tìm kịch bản theo tên hoặc nhóm...">
    <div id="sr-scenario-dropdown" class="hidden-dropdown"></div>
  </div>
  <!-- KẾT THÚC THAY THẾ -->

  <label class="sr-label" for="step-select">Bắt đầu từ câu số:</label>
  <select id="step-select" disabled>
    <option value="0">(Chọn kịch bản để hiện danh sách)</option>
  </select>

  <div id="scenario-inputs" style="margin-top: 10px;"></div>

  <div class="sr-controls">
    <button id="sr-addqueue">➕ Thêm vào hàng đợi <span id="sr-queue-count">0</span></button>
    <button id="sr-start">▶️ Bắt đầu</button>
    <button id="sr-pause" disabled>⏸ Dừng</button>
    <button id="sr-resume" disabled>▶️ Tiếp</button>
  </div>
  
  <div class="sr-queue-box">
    <strong>Hàng đợi:</strong>
    <ul id="sr-queue-list"></ul>
  </div>
`;

window.ScenarioRunner = class {
  constructor(onClose) {
    console.log("▶️ [ScenarioRunner] init");
    if (!window.ChatAdapter) {
      alert("Không tìm thấy ChatAdapter phù hợp cho trang hiện tại. Scenario Runner sẽ bị vô hiệu.");
      throw new Error("ChatAdapter not available");
    }

    this.onClose = onClose;
    this.sequencer = null;
    this.templates = {};
    this.queue = [];
    this._render();
  }

  _render() {
    console.log("🎛 [ScenarioRunner] render UI");
    this.el = document.createElement("div");
    this.el.id = "scenario-runner";
    this.el.classList.add("panel-box");
    this.el.innerHTML = ScenarioRunnerInnerHTML;

    ChatGPTHelper.mountPanel(this.el);

    // Tải kịch bản và thiết lập giao diện tìm kiếm mới
    this._setupScenarioSearch();

    // Gắn sự kiện cho các nút điều khiển
    this._attachControlEvents();

    ChatGPTHelper.makeDraggable(this.el, ".sr-header");
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());
  }

  /**
   * Tải danh sách kịch bản và thiết lập ô tìm kiếm động
   */

  _setupScenarioSearch() {
    chrome.storage.local.get("scenarioTemplates", (items) => {
      this.templates = items.scenarioTemplates || {};
      const searchBox = this.el.querySelector("#sr-scenario-search");
      const dropdown = this.el.querySelector("#sr-scenario-dropdown");
      const browserWrapper = this.el.querySelector("#sr-scenario-browser");

      // Tạo các item trong danh sách thả xuống
      Object.keys(this.templates).forEach((name) => {
        const raw = this.templates[name];
        const group = Array.isArray(raw) ? "" : (raw.group || "");

        const item = document.createElement("div");
        item.textContent = group ? `[${group}] ${name}` : name;
        item.className = "scenario-dropdown-item";
        item.dataset.name = name;
        item.dataset.group = group.toLowerCase();

        // Sử dụng 'mousedown' để đảm bảo sự kiện được xử lý trước 'blur'
        item.addEventListener("mousedown", (e) => {
          e.preventDefault(); // Ngăn input mất focus ngay lập tức

          searchBox.value = item.textContent;
          dropdown.classList.add("hidden-dropdown"); // Ẩn ngay
          this._onScenarioSelected(name);

          // Chủ động làm input mất focus
          searchBox.blur();
        });

        dropdown.appendChild(item);
      });

      // --- PHẦN BỊ THIẾU ĐÃ ĐƯỢC KHÔI PHỤC ---
      // Gắn sự kiện cho ô tìm kiếm
      searchBox.addEventListener("input", () => {
        dropdown.classList.remove("hidden-dropdown");
        const keyword = searchBox.value.trim();

        const items = Array.from(dropdown.querySelectorAll(".scenario-dropdown-item"));
        const scoredItems = items.map(div => {
          const score = ChatGPTHelper.fuzzySearch(keyword, div.textContent);
          return { div, score };
        });

        // Sắp xếp và hiển thị
        scoredItems.forEach(item => {
          if (item.score > 0) {
            item.div.style.display = "block";
            // Sử dụng style.order để sắp xếp mà không cần re-append (Flexbox)
            // Mặc định dropdown là flex column
            item.div.style.order = -item.score;
          } else {
            item.div.style.display = "none";
          }
        });
      });

      // Cần đảm bảo dropdown là flex column để 'order' hoạt động
      dropdown.style.display = "flex";
      dropdown.style.flexDirection = "column";
      // --- KẾT THÚC PHẦN KHÔI PHỤC ---

      // Hiện dropdown khi người dùng focus
      searchBox.addEventListener("focus", () => {
        dropdown.classList.remove("hidden-dropdown");
      });

      // Ẩn dropdown khi click ra ngoài
      document.addEventListener('click', (event) => {
        if (!browserWrapper.contains(event.target)) {
          dropdown.classList.add('hidden-dropdown');
        }
      });
    });
  }
  /**
   * Hàm được gọi khi một kịch bản được chọn từ danh sách
   * @param {string} name Tên của kịch bản
   */

  _onScenarioSelected(name) {
    const raw = this.templates[name] || {};
    const list = Array.isArray(raw) ? raw : (raw.questions || []);
    console.log("📋 Đã chọn kịch bản:", name);

    const stepSelect = this.el.querySelector("#step-select");
    stepSelect.innerHTML = list.map((q, idx) => {
      const preview = q.text?.slice(0, 40) || "";
      return `<option value="${idx}" title="${q.text}">#${idx + 1}: ${preview}...</option>`;
    }).join("");
    stepSelect.disabled = list.length === 0;

    const inputPanel = this.el.querySelector("#scenario-inputs");
    inputPanel.innerHTML = "";
    const shown = new Set();

    list.forEach(q => {
      const matches = [...q.text.matchAll(/\$\{([^}|]+)(?:\|([^}]+))?\}/g)];
      const loopKey = this._getLoopKey(q);

      matches.forEach(match => {
        const varName = match[1];
        const optionsStr = match[2];

        if (shown.has(varName)) return;
        shown.add(varName);

        const wrapper = document.createElement("div");
        wrapper.className = "sr-input-group";
        const label = document.createElement("label");
        label.textContent = `🧩 ${varName}:`;

        let inputEl;
        // === CẬP NHẬT LOGIC TẠO INPUT ===
        if (optionsStr) {
          // Nếu có danh sách lựa chọn, tạo dropdown
          inputEl = document.createElement("select");
          const options = optionsStr.split(',').map(v => v.trim()).filter(Boolean);
          options.forEach(opt => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt;
            inputEl.appendChild(option);
          });
        } else if (q.type === "loop" && varName === loopKey) {
          // 'loop' vẫn là input number
          inputEl = document.createElement("input");
          inputEl.type = "number";
          inputEl.placeholder = "Số lần lặp (vd: 3)";
        } else if (q.type === "list" && varName === loopKey) {
          // 'list' sẽ là textarea
          inputEl = document.createElement("textarea");
          inputEl.rows = 2;
          inputEl.placeholder = "Các giá trị, cách nhau bằng dấu phẩy (vd: value1, value2)";
        } else {
          // Các biến còn lại mặc định là textarea
          inputEl = document.createElement("textarea");
          inputEl.rows = 2;
          inputEl.placeholder = "Nhập nội dung...";
        }
        // === KẾT THÚC CẬP NHẬT ===

        inputEl.dataset.key = varName;
        inputEl.addEventListener("input", () => this._saveVariableValues(name));
        wrapper.appendChild(label);
        wrapper.appendChild(inputEl);
        inputPanel.appendChild(wrapper);
      });
    });

    chrome.storage.local.get("scenarioInputValues", (result) => {
      const saved = result.scenarioInputValues?.[name] || {};
      inputPanel.querySelectorAll("[data-key]").forEach(el => {
        const key = el.dataset.key;
        const val = saved[key];
        if (val !== undefined) {
          el.value = val; // Logic tải lại giá trị đã lưu không cần thay đổi
        }
      });
    });
  }
  /**
   * Gắn sự kiện cho các nút Start, Pause, Resume, Add to Queue
   */
  // Thay thế hàm này trong file ScenarioRunner.js

  _attachControlEvents() {
    const btnStart = this.el.querySelector('#sr-start');
    const btnPause = this.el.querySelector('#sr-pause');
    const btnResume = this.el.querySelector('#sr-resume');
    const btnAdd = this.el.querySelector("#sr-addqueue");

    btnStart.onclick = () => this._start();
    btnPause.onclick = () => {
      this.sequencer?.pause();
      btnPause.disabled = true;
      btnResume.disabled = false;
    };
    btnResume.onclick = () => {
      this.sequencer?.resume();
      btnResume.disabled = true;
      btnPause.disabled = false;
    };
    btnAdd.onclick = () => {
      // Lấy tên kịch bản từ ô search thay vì select
      const selectedText = this.el.querySelector("#sr-scenario-search").value;
      const selectedDiv = Array.from(this.el.querySelectorAll('.scenario-dropdown-item')).find(d => d.textContent === selectedText);

      if (!selectedDiv) {
        return alert("Vui lòng chọn một kịch bản hợp lệ từ danh sách!");
      }
      const name = selectedDiv.dataset.name;

      const startAt = parseInt(this.el.querySelector("#step-select").value || "0", 10);
      const values = this._readVariableValues();
      this.queue.push({ name, startAt, values });

      this._refreshQueueUI();
      alert(`✅ Đã thêm bộ biến vào hàng đợi (#${this.queue.length}). Bạn có thể nhập bộ tiếp theo.`);

      // === GỌI HÀM MỚI TẠI ĐÂY ===
      this._clearVariableInputs();
    };
  }
  // Thay thế hàm này trong file ScenarioRunner.js

  _readVariableValues() {
    const data = {};
    this.el.querySelectorAll("[data-key]").forEach(el => {
      const k = el.dataset.key;
      // Áp dụng logic mới: luôn lấy giá trị và trim()
      data[k] = el.value.trim();
    });
    return data;
  }

  _updateQueueIndicator() {
    this.el.querySelector("#sr-queue-count").textContent = String(this.queue.length);
  }
  _getLoopKey(q) {
    return q.loopKey || (q.text.match(/\$\{(\w+)\}/) || [])[1];
  }
  // Thay thế hàm này trong file ScenarioRunner.js

  _saveVariableValues(templateName) {
    const inputPanel = this.el.querySelector("#scenario-inputs");
    const data = {};
    inputPanel.querySelectorAll("[data-key]").forEach(el => {
      const key = el.dataset.key;

      // === THAY ĐỔI LOGIC XỬ LÝ TEXTAREA ===
      if (el.tagName === "TEXTAREA") {
        // Giữ nguyên toàn bộ nội dung, chỉ xóa khoảng trắng thừa ở đầu/cuối cả đoạn
        data[key] = el.value.trim();
      } else {
        // Các input khác (như 'number' cho vòng lặp) vẫn xử lý như cũ
        data[key] = el.value.trim();
      }
    });

    chrome.storage.local.get("scenarioInputValues", (items) => {
      const all = items.scenarioInputValues || {};
      all[templateName] = data;
      chrome.storage.local.set({ scenarioInputValues: all });
    });
  } async _start() {
    if (this.queue.length === 0) {
      const selectedText = this.el.querySelector("#sr-scenario-search").value;
      const selectedDiv = Array.from(this.el.querySelectorAll('.scenario-dropdown-item')).find(d => d.textContent === selectedText);
      if (!selectedDiv) return alert("Vui lòng chọn một kịch bản hợp lệ từ danh sách.");

      const name = selectedDiv.dataset.name;
      const startAt = parseInt(this.el.querySelector("#step-select").value || "0", 10);
      const values = this._readVariableValues();
      this.queue.push({ name, startAt, values });
    }
    this.el.querySelector("#sr-start").disabled = true;
    this.el.querySelector("#sr-addqueue").disabled = true;
    this.el.querySelector("#sr-pause").disabled = false;
    this.el.querySelector("#sr-resume").disabled = true;
    const bigList = [];
    for (const job of this.queue) {
      const raw = this.templates[job.name];
      if (!raw) {
        console.warn("⚠️ Template not found:", job.name);
        continue;
      }
      const tplArr = Array.isArray(raw) ? raw : (raw.questions || []);
      const slice = tplArr.slice(job.startAt);
      const prompts = this._expandScenario(slice, job.values);
      bigList.push(...prompts);
    }
    this.queue = [];
    this._refreshQueueUI();
    this._updateQueueIndicator();
    if (bigList.length === 0) {
      alert("Không có prompt nào để chạy.");
      this._resetControls();
      return;
    }
    this.sequencer = new PromptSequencer(
      bigList, this._sendPrompt.bind(this), this._waitForResponse.bind(this),
      (idx, total) => console.log(`📤 ${idx}/${total} done`), "ScenarioRunner"
    );
    this.sequencer.start(() => this._resetControls());
  }
  _resetControls() {
    this.el.querySelector("#sr-start").disabled = false;
    this.el.querySelector("#sr-addqueue").disabled = false;
    this.el.querySelector("#sr-pause").disabled = true;
    this.el.querySelector("#sr-resume").disabled = true;
  }
  // Thay thế hàm này trong file ScenarioRunner.js

  _expandScenario(questions, values) {
    const result = [];
    for (const q of questions) {
      if (q.type === "text") {
        result.push(q.text);
      } else if (q.type === "variable") {
        const filled = q.text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => values[k] || "");
        result.push(filled);
      } else if (q.type === "loop") {
        const loopKey = this._getLoopKey(q);
        const count = parseInt(values[loopKey] || "0", 10);
        for (let i = 1; i <= count; i++) {
          const prompt = q.text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => {
            if (k === loopKey) return String(i);
            return values[k] || "";
          });
          result.push(prompt);
        }
      }
      // === THÊM LOGIC MỚI CHO 'list' ===
      else if (q.type === "list") {
        const loopKey = this._getLoopKey(q);
        // Lấy chuỗi giá trị và tách nó ra thành mảng bằng dấu phẩy
        const listValues = (values[loopKey] || "")
          .split(',')
          .map(v => v.trim()) // Xóa khoảng trắng thừa
          .filter(Boolean);     // Loại bỏ các mục rỗng

        // Lặp qua từng giá trị trong mảng
        for (const itemValue of listValues) {
          // Thay thế biến loopKey bằng giá trị hiện tại, và các biến khác nếu có
          const prompt = q.text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => {
            if (k === loopKey) {
              return itemValue; // Thay thế bằng giá trị từ danh sách
            }
            return values[k] || ""; // Thay thế các biến thường khác
          });
          result.push(prompt);
        }
      }
      // === KẾT THÚC LOGIC MỚI ===
    }
    return result;
  } async _sendPrompt(text) {
    console.log("💬 [ScenarioRunner] send prompt →", text.slice(0, 40));
    const chat = window.ChatAdapter;
    const textarea = chat.getTextarea();
    if (!textarea) throw new Error("❌ Không tìm thấy ô nhập");
    if (textarea.tagName === 'TEXTAREA') {
      textarea.value = text;
    } else {
      textarea.innerHTML = '';
      textarea.appendChild(Object.assign(document.createElement('p'), { textContent: text }));
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    const sendBtn = await this._waitForAdapterBtn(() => chat.getSendBtn());
    sendBtn?.click();
  }
  _waitForResponse(timeout = 600000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const timer = setInterval(() => {
        const done = window.ChatAdapter.isDone();
        if (done) {
          clearInterval(timer);
          resolve();
        }
        if (Date.now() - start > timeout) {
          clearInterval(timer);
          reject(new Error("Timeout waiting for response"));
        }
      }, 1000);
    });
  }
  _waitForAdapterBtn(fnGet, maxRetries = 25, interval = 300) {
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
  destroy() {
    console.log("❌ [ScenarioRunner] destroy");
    this.el?.remove();
    this.onClose();
    this.sequencer?.stop();
  }
  // Thay thế hàm này trong file ScenarioRunner.js

  // Thay thế toàn bộ hàm _refreshQueueUI() bằng phiên bản này

  _refreshQueueUI() {
    this._updateQueueIndicator();
    const listEl = this.el.querySelector("#sr-queue-list");
    listEl.innerHTML = this.queue.map((job, i) => {
      // 1. Tạo chuỗi biến đầy đủ như cũ
      const fullVars = Object.entries(job.values)
        .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('|') : v}`)
        .join(', ');

      // 2. Sử dụng hàm helper để rút gọn chuỗi đó
      const shortenedVars = this._shortenText(fullVars); // Mặc định là 60 ký tự

      // 3. Sử dụng cả 2 phiên bản trong HTML
      return `
        <li>
          <span>
            #${i + 1} <em>${job.name}</em> (từ câu ${job.startAt + 1}) – 
            <b title="${fullVars}">${shortenedVars}</b>
          </span>
          <button class="sr-queue-copy" data-idx="${i}" title="Copy prompts to clipboard">📋</button>
        </li>
      `;
    }).join("");

    // Gắn lại sự kiện cho các nút copy
    listEl.querySelectorAll('.sr-queue-copy').forEach(btn => {
      btn.onclick = (e) => {
        // Dùng currentTarget để đảm bảo lấy đúng button
        const index = parseInt(e.currentTarget.dataset.idx, 10);
        this._copyQueueItem(index);
      };
    });
  }
  // Thêm hàm mới này vào class ScenarioRunner

  /**
   * Biên dịch và sao chép một mục trong hàng đợi vào clipboard
   * @param {number} index - Vị trí của mục trong this.queue
   */
  _copyQueueItem(index) {
    const job = this.queue[index];
    if (!job) {
      console.error("Không tìm thấy mục để copy tại index:", index);
      return;
    }

    // Lấy template, hỗ trợ cả 2 định dạng
    const raw = this.templates[job.name];
    if (!raw) {
      console.warn("⚠️ Template not found:", job.name);
      return;
    }
    const tplArr = Array.isArray(raw) ? raw : (raw.questions || []);

    // "Biên dịch" các prompt
    const slice = tplArr.slice(job.startAt);
    const prompts = this._expandScenario(slice, job.values);

    if (prompts.length === 0) {
      alert("Không có prompt nào được tạo ra từ mục này.");
      return;
    }

    // Nối tất cả các prompt lại, cách nhau bằng hai dòng mới
    const fullText = prompts.join('\n\n---\n\n');

    // Sao chép vào clipboard
    navigator.clipboard.writeText(fullText).then(() => {
      alert(`✅ Đã sao chép ${prompts.length} prompt vào clipboard!`);
    }).catch(err => {
      console.error('Lỗi khi sao chép:', err);
      alert('❌ Đã xảy ra lỗi khi sao chép.');
    });
  }

  // Thêm hàm mới này vào class ScenarioRunner, ví dụ: trước hàm destroy()

  /**
   * Rút gọn văn bản nếu nó dài hơn giới hạn cho phép.
   * @param {string} text - Văn bản cần rút gọn.
   * @param {number} maxLength - Chiều dài tối đa.
   * @returns {string} - Văn bản đã được rút gọn.
   */
  _shortenText(text, maxLength = 60) {
    if (typeof text !== 'string' || text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  }

  /**
   * Xóa nội dung của tất cả các ô nhập liệu biến trên giao diện.
   */
  _clearVariableInputs() {
    this.el.querySelectorAll('#scenario-inputs [data-key]').forEach(inputEl => {
      inputEl.value = '';
    });
    console.log("📝 Đã xóa trắng các ô nhập liệu biến.");

    // Tùy chọn: Focus vào ô nhập liệu đầu tiên để người dùng có thể gõ ngay
    const firstInput = this.el.querySelector('#scenario-inputs [data-key]');
    if (firstInput) {
      firstInput.focus();
    }
  }

  /**
   * Kiểm tra xem kịch bản có đang chạy hay không.
   * @returns {boolean} true nếu đang chạy.
   */
  _isBusy() {
    return this.sequencer && !this.sequencer.stopped && this.sequencer.idx < this.sequencer.prompts.length;
  }
};
// --- END OF FILE ScenarioRunner.js (UPDATED) ---