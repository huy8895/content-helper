// --- START OF FILE ScenarioRunner.js (UPDATED) ---

const ScenarioRunnerInnerHTML = `
  <div class="ts-title flex items-center mb-6 cursor-move select-none">
    <span class="text-2xl mr-3">📤</span>
    <div>
      <h3 class="m-0 text-lg font-bold text-gray-900 leading-tight">Scenario Runner</h3>
      <div class="text-xs text-gray-500 mt-0.5 font-medium">Execute automation sequences</div>
    </div>
  </div>

  <div id="sr-scenario-browser" class="mb-5 relative">
    <label class="text-[11px] font-bold text-gray-500 uppercase mb-2 block tracking-wider" for="sr-scenario-search">CHỌN KỊCH BẢN</label>
    <div class="relative">
      <input type="text" id="sr-scenario-search" 
        class="w-full h-11 pl-10 pr-4 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
        placeholder="🔍 Tìm kịch bản theo tên hoặc nhóm...">
      <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
    </div>
    <div id="sr-scenario-dropdown" class="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto hidden-dropdown custom-scrollbar p-1"></div>
  </div>

  <div class="flex items-center gap-3 mb-5">
    <div class="flex-1">
      <label class="text-[11px] font-bold text-gray-500 uppercase mb-1 block" for="step-select">BẮT ĐẦU TỪ CÂU</label>
      <select id="step-select" class="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50" disabled>
        <option value="0">(Chọn kịch bản)</option>
      </select>
    </div>
  </div>

  <div id="scenario-inputs" class="space-y-4 mb-6 bg-gray-50/50 p-4 rounded-2xl border border-gray-100"></div>

  <!-- Thanh tiến trình -->
  <div id="sr-progress-box" class="mb-6 hidden">
    <div class="flex justify-between items-end mb-2">
      <div class="text-xs font-bold text-gray-700">
        Đang chạy: <span id="sr-progress-step" class="text-indigo-600">0</span>/<span id="sr-progress-total">0</span>
      </div>
      <div id="sr-progress-percent" class="text-lg font-black text-indigo-600 leading-none">0%</div>
    </div>
    <div class="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50">
      <div id="sr-progress-bar" class="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.4)]"></div>
    </div>
    <div id="sr-done-list" class="flex flex-wrap gap-1.5 mt-3 max-h-24 overflow-y-auto custom-scrollbar"></div>
  </div>

  <div class="grid grid-cols-2 gap-3 mb-6">
    <button id="sr-addqueue" class="h-11 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-50 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2">
      ➕ Hàng đợi <span id="sr-queue-count" class="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px]">0</span>
    </button>
    <button id="sr-start" class="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-md shadow-indigo-100">
      ▶️ Bắt đầu ngay
    </button>
  </div>

  <div class="flex gap-2 mb-6">
    <button id="sr-pause" class="flex-1 h-10 bg-white border border-gray-200 text-gray-500 font-bold rounded-lg text-xs hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-30" disabled>⏸ Tạm dừng</button>
    <button id="sr-resume" class="flex-1 h-10 bg-indigo-50 text-indigo-600 font-bold rounded-lg text-xs hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-30" disabled>▶️ Tiếp tục</button>
  </div>
  
  <div class="sr-queue-box flex-1 overflow-hidden flex flex-col">
    <label class="text-[11px] font-bold text-gray-400 uppercase mb-2 tracking-widest block">DỰ KIẾN HÀNG ĐỢI</label>
    <ul id="sr-queue-list" class="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar"></ul>
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
    this.el.className = "panel-box ts-panel w-[500px] p-6 rounded-2xl shadow-2xl bg-white border border-gray-100 flex flex-col relative animate-in";
    this.el.style.maxHeight = "850px";
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
        item.className = "px-4 py-3 hover:bg-indigo-50 cursor-pointer transition-all border-b border-gray-50 last:border-0 flex items-center justify-between group";

        const titleSpan = document.createElement("span");
        titleSpan.className = "text-sm text-gray-700 font-medium group-hover:text-indigo-600";
        titleSpan.textContent = group ? `[${group}] ${name}` : name;

        item.appendChild(titleSpan);
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
            item.div.style.display = "flex";
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
        wrapper.className = "sr-input-group flex flex-col gap-1.5";
        const label = document.createElement("label");
        label.className = "text-[11px] font-bold text-gray-500 uppercase tracking-widest pl-1";
        label.textContent = varName;

        let inputEl;
        // === CẬP NHẬT LOGIC TẠO INPUT ===
        const baseClasses = "w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none";

        if (optionsStr) {
          // Nếu có danh sách lựa chọn, tạo dropdown
          inputEl = document.createElement("select");
          inputEl.className = `${baseClasses} h-10 font-bold text-indigo-600 cursor-pointer`;
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
          inputEl.className = `${baseClasses} h-10 font-bold text-indigo-600`;
          inputEl.placeholder = "Số lần lặp (vd: 3)";
        } else if (q.type === "list" && varName === loopKey) {
          // 'list' sẽ là textarea
          inputEl = document.createElement("textarea");
          inputEl.className = `${baseClasses} min-h-[60px] font-mono text-xs text-indigo-600`;
          inputEl.placeholder = "Các giá trị, cách nhau bằng dấu phẩy (vd: value1, value2)";
        } else {
          // Các biến còn lại mặc định là textarea
          inputEl = document.createElement("textarea");
          inputEl.className = `${baseClasses} min-h-[80px]`;
          inputEl.placeholder = "Nhập nội dung cho " + varName;
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
      (idx, total) => {
        console.log(`📤 ${idx}/${total} done`);
        this._updateProgress(idx, total);
      }, "ScenarioRunner"
    );

    this._showProgress(true);
    this._updateProgress(0, bigList.length);
    this._clearDoneList(); // Xóa danh sách cũ khi bắt đầu mới
    this.sequencer.start(() => this._resetControls());
  }

  _resetControls() {
    this.el.querySelector("#sr-start").disabled = false;
    this.el.querySelector("#sr-addqueue").disabled = false;
    this.el.querySelector("#sr-pause").disabled = true;
    this.el.querySelector("#sr-resume").disabled = true;

    // KHÔNG TỰ ĐỘNG ẨN THANH TIẾN TRÌNH THEO YÊU CẦU NGƯỜI DÙNG
    console.log("🏁 Scenario completed. Progress bar remains visible.");
  }

  _showProgress(show) {
    const box = this.el.querySelector("#sr-progress-box");
    if (box) {
      if (show) box.classList.remove('hidden');
      else box.classList.add('hidden');
    }
  }

  _updateProgress(idx, total) {
    const bar = this.el.querySelector("#sr-progress-bar");
    const textStep = this.el.querySelector("#sr-progress-step");
    const textTotal = this.el.querySelector("#sr-progress-total");
    const textPercent = this.el.querySelector("#sr-progress-percent");

    if (!bar || !textStep || !textTotal || !textPercent) return;

    textStep.textContent = idx;
    textTotal.textContent = total;

    const percent = total > 0 ? Math.round((idx / total) * 100) : 0;
    textPercent.textContent = `${percent}%`;
    bar.style.width = `${percent}%`;

    // Cập nhật danh sách "Done" nếu có label cho bước vừa hoàn thành (idx-1)
    if (idx > 0 && this.sequencer && this.sequencer.prompts) {
      const lastPrompt = this.sequencer.prompts[idx - 1];
      if (lastPrompt && lastPrompt.label) {
        this._addDoneItem(lastPrompt.label);
      }
    }
  }

  _clearDoneList() {
    const list = this.el.querySelector("#sr-done-list");
    if (list) list.innerHTML = "";
  }

  _addDoneItem(label) {
    const list = this.el.querySelector("#sr-done-list");
    if (!list) return;

    // Nếu đã tồn tại thì không thêm nữa (tránh trùng lặp nếu logic sequencer gọi nhiều lần)
    if (Array.from(list.children).some(el => el.textContent === label)) return;

    const span = document.createElement("span");
    span.className = "sr-done-item-tag";
    span.textContent = label;
    list.appendChild(span);

    // Tự động cuộn xuống cuối danh sách nếu quá dài
    list.scrollTop = list.scrollHeight;
  }
  // Thay thế hàm này trong file ScenarioRunner.js

  _expandScenario(questions, values) {
    const result = [];
    for (const q of questions) {
      if (q.type === "text") {
        result.push({ text: q.text, label: null });
      } else if (q.type === "variable") {
        const filled = q.text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => values[k] || "");
        result.push({ text: filled, label: null });
      } else if (q.type === "loop") {
        const loopKey = this._getLoopKey(q);
        const count = parseInt(values[loopKey] || "0", 10);
        for (let i = 1; i <= count; i++) {
          const prompt = q.text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => {
            if (k === loopKey) return String(i);
            return values[k] || "";
          });
          result.push({ text: prompt, label: `Kỳ ${i}` });
        }
      }
      else if (q.type === "list") {
        const loopKey = this._getLoopKey(q);
        const listValues = (values[loopKey] || "")
          .split(',')
          .map(v => v.trim())
          .filter(Boolean);

        for (const itemValue of listValues) {
          const prompt = q.text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => {
            if (k === loopKey) return itemValue;
            return values[k] || "";
          });
          result.push({ text: prompt, label: itemValue });
        }
      }
    }
    return result;
  }

  async _sendPrompt(prompt) {
    const text = typeof prompt === 'string' ? prompt : prompt.text;
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
        <li class="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-start justify-between group hover:bg-white hover:border-indigo-100 transition-all">
          <div class="flex-1 min-w-0 pr-3">
             <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-black text-gray-400">#${i + 1}</span>
                <span class="text-xs font-bold text-gray-900 truncate">${job.name}</span>
                <span class="text-[10px] font-medium text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-100">Step ${job.startAt + 1}+</span>
             </div>
             <div class="text-[10px] text-gray-500 italic truncate" title="${fullVars}">${shortenedVars}</div>
          </div>
          <button class="sr-queue-copy w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-[10px] hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-90" data-idx="${i}" title="Copy prompts to clipboard">
             📋
          </button>
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