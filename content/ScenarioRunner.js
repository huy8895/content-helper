// --- STAGE: ScenarioRunner.js (CLEANED & COMPACT) ---

const ScenarioRunnerInnerHTML = `
  <div class="sr-header flex items-center mb-4 cursor-move select-none">
    <span class="text-xl mr-2">📤</span>
    <div>
      <h3 class="m-0 text-base font-bold text-gray-900 leading-tight">Scenario Runner</h3>
      <div class="text-[10px] text-gray-500 font-medium tracking-tight">Execute automation sequences</div>
    </div>
  </div>

  <div id="sr-scenario-browser" class="mb-4 relative">
    <label class="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest pl-1" for="sr-scenario-search">CHỌN KỊCH BẢN</label>
    <div class="relative">
      <input type="text" id="sr-scenario-search" 
        class="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-indigo-500 transition-all outline-none" 
        placeholder="Tìm kịch bản nhanh...">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
    </div>
    <div id="sr-scenario-dropdown" class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl z-[100] max-h-48 overflow-y-auto hidden-dropdown custom-scrollbar p-1 flex flex-col"></div>
  </div>

  <div class="flex items-center gap-3 mb-4">
    <div class="flex-1">
      <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block pl-1" for="step-select">BẮT ĐẦU TỪ CÂU</label>
      <select id="step-select" class="w-full h-8 px-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all disabled:opacity-50" disabled>
        <option value="0">(Chọn kịch bản)</option>
      </select>
    </div>
  </div>

  <div id="scenario-inputs" class="space-y-3 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100 max-h-48 overflow-y-auto custom-scrollbar"></div>

  <!-- Thanh tiến trình -->
  <div id="sr-progress-box" class="mb-4 hidden">
    <div class="flex justify-between items-end mb-1.5 px-1">
      <div class="text-[10px] font-bold text-gray-500 uppercase">
        <span id="sr-progress-step" class="text-indigo-600">0</span> / <span id="sr-progress-total">0</span> Prompts
      </div>
      <div id="sr-progress-percent" class="text-sm font-black text-indigo-600">0%</div>
    </div>
    <div class="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50">
      <div id="sr-progress-bar" class="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"></div>
    </div>
    <div id="sr-done-list" class="flex flex-wrap gap-1 mt-2 max-h-16 overflow-y-auto custom-scrollbar"></div>
  </div>

  <div class="grid grid-cols-2 gap-2 mb-4">
    <button id="sr-addqueue" class="h-9 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg text-[10px] hover:bg-gray-50 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1.5">
      ➕ Hàng đợi <span id="sr-queue-count" class="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px]">0</span>
    </button>
    <button id="sr-start" class="h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] transition-all active:scale-95 shadow-md shadow-indigo-100">
      ▶️ Bắt đầu ngay
    </button>
  </div>

  <div class="flex gap-2 mb-4">
    <button id="sr-pause" class="flex-1 h-8 bg-white border border-gray-200 text-gray-500 font-bold rounded-lg text-[10px] hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-30" disabled>⏸ Tạm dừng</button>
    <button id="sr-resume" class="flex-1 h-8 bg-indigo-50 text-indigo-600 font-bold rounded-lg text-[10px] hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-30" disabled>▶️ Tiếp tục</button>
  </div>
  
  <div class="sr-queue-box flex-1 overflow-hidden flex flex-col">
    <label class="text-[9px] font-black text-gray-400 uppercase mb-1.5 tracking-[0.15em] block pl-1">DỰ KIẾN HÀNG ĐỢI</label>
    <ul id="sr-queue-list" class="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar"></ul>
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
    this.el.className = "panel-box ts-panel w-[420px] p-4 rounded-xl shadow-2xl bg-white border border-gray-100 flex flex-col relative animate-in";
    this.el.style.maxHeight = "720px";
    this.el.innerHTML = ScenarioRunnerInnerHTML;

    ChatGPTHelper.mountPanel(this.el);

    // Tải kịch bản và thiết lập giao diện tìm kiếm mới
    this._setupScenarioSearch();

    // Gắn sự kiện cho các nút điều khiển
    this._attachControlEvents();

    ChatGPTHelper.makeDraggable(this.el, ".sr-header");
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());
  }

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
        item.className = "scenario-dropdown-item px-3 py-2 hover:bg-indigo-50 cursor-pointer transition-all border-b border-gray-50 last:border-0 flex items-center justify-between group";

        const titleSpan = document.createElement("span");
        titleSpan.className = "text-[11px] text-gray-700 font-bold group-hover:text-indigo-600";
        titleSpan.textContent = group ? `[${group}] ${name}` : name;

        item.appendChild(titleSpan);
        item.dataset.name = name;
        item.dataset.group = group.toLowerCase();

        // Sử dụng 'mousedown' để đảm bảo sự kiện được xử lý trước 'blur'
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          searchBox.value = item.textContent;
          dropdown.classList.add("hidden-dropdown");
          this._onScenarioSelected(name);
          searchBox.blur();
        });

        dropdown.appendChild(item);
      });

      searchBox.addEventListener("input", () => {
        dropdown.classList.remove("hidden-dropdown");
        const keyword = searchBox.value.trim();

        const items = Array.from(dropdown.querySelectorAll(".scenario-dropdown-item"));
        const scoredItems = items.map(div => {
          const score = ChatGPTHelper.fuzzySearch(keyword, div.textContent);
          return { div, score };
        });

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

      searchBox.addEventListener("focus", () => {
        dropdown.classList.remove("hidden-dropdown");
      });

      document.addEventListener('click', (event) => {
        if (!browserWrapper.contains(event.target)) {
          dropdown.classList.add('hidden-dropdown');
        }
      });
    });
  }

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
        wrapper.className = "sr-input-group flex flex-col gap-1";
        const label = document.createElement("label");
        label.className = "text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1";
        label.textContent = varName;

        let inputEl;
        const baseClasses = "w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none";

        if (optionsStr) {
          inputEl = document.createElement("select");
          inputEl.className = `${baseClasses} h-8 font-bold text-indigo-600 cursor-pointer`;
          const options = optionsStr.split(',').map(v => v.trim()).filter(Boolean);
          options.forEach(opt => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt;
            inputEl.appendChild(option);
          });
        } else if (q.type === "loop" && varName === loopKey) {
          inputEl = document.createElement("input");
          inputEl.type = "number";
          inputEl.className = `${baseClasses} h-8 font-bold text-indigo-600`;
          inputEl.placeholder = "Số lần lặp (vd: 3)";
        } else if (q.type === "list" && varName === loopKey) {
          inputEl = document.createElement("textarea");
          inputEl.className = `${baseClasses} min-h-[50px] font-mono text-[10px] text-indigo-600`;
          inputEl.placeholder = "Các giá trị, cách nhau bằng dấu phẩy...";
        } else {
          inputEl = document.createElement("textarea");
          inputEl.className = `${baseClasses} min-h-[60px]`;
          inputEl.placeholder = "Nhập nội dung cho " + varName;
        }

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
          el.value = val;
        }
      });
    });
  }

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
      alert(`✅ Đã thêm(#${this.queue.length}) vào hàng đợi.`);
      this._clearVariableInputs();
    };
  }

  _readVariableValues() {
    const data = {};
    this.el.querySelectorAll("[data-key]").forEach(el => {
      data[el.dataset.key] = el.value.trim();
    });
    return data;
  }

  _updateQueueIndicator() {
    this.el.querySelector("#sr-queue-count").textContent = String(this.queue.length);
  }

  _getLoopKey(q) {
    return q.loopKey || (q.text.match(/\$\{(\w+)\}/) || [])[1];
  }

  _saveVariableValues(templateName) {
    const inputPanel = this.el.querySelector("#scenario-inputs");
    const data = {};
    inputPanel.querySelectorAll("[data-key]").forEach(el => {
      data[el.dataset.key] = el.value.trim();
    });

    chrome.storage.local.get("scenarioInputValues", (items) => {
      const all = items.scenarioInputValues || {};
      all[templateName] = data;
      chrome.storage.local.set({ scenarioInputValues: all });
    });
  }

  async _start() {
    if (this.queue.length === 0) {
      const selectedText = this.el.querySelector("#sr-scenario-search").value;
      const selectedDiv = Array.from(this.el.querySelectorAll('.scenario-dropdown-item')).find(d => d.textContent === selectedText);
      if (!selectedDiv) return alert("Vui lòng chọn một kịch bản!");

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
      if (!raw) continue;
      const tplArr = Array.isArray(raw) ? raw : (raw.questions || []);
      const slice = tplArr.slice(job.startAt);
      const prompts = this._expandScenario(slice, job.values);
      bigList.push(...prompts);
    }

    this.queue = [];
    this._refreshQueueUI();
    this._updateQueueIndicator();

    if (bigList.length === 0) {
      alert("Không có prompt nào.");
      this._resetControls();
      return;
    }

    this.sequencer = new PromptSequencer(
      bigList, this._sendPrompt.bind(this), this._waitForResponse.bind(this),
      (idx, total) => {
        this._updateProgress(idx, total);
      }, "ScenarioRunner"
    );

    this._showProgress(true);
    this._updateProgress(0, bigList.length);
    this._clearDoneList();
    this.sequencer.start(() => this._resetControls());
  }

  _resetControls() {
    this.el.querySelector("#sr-start").disabled = false;
    this.el.querySelector("#sr-addqueue").disabled = false;
    this.el.querySelector("#sr-pause").disabled = true;
    this.el.querySelector("#sr-resume").disabled = true;
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
    if (Array.from(list.children).some(el => el.textContent === label)) return;

    const span = document.createElement("span");
    span.className = "bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[9px] font-bold border border-indigo-100";
    span.textContent = label;
    list.appendChild(span);
    list.scrollTop = list.scrollHeight;
  }

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
          result.push({ text: prompt, label: `Lần ${i}` });
        }
      } else if (q.type === "list") {
        const loopKey = this._getLoopKey(q);
        const listValues = (values[loopKey] || "").split(',').map(v => v.trim()).filter(Boolean);
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
    const chat = window.ChatAdapter;
    const textarea = chat.getTextarea();
    if (!textarea) throw new Error("❌ No input");
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
        if (window.ChatAdapter.isDone()) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - start > timeout) {
          clearInterval(timer);
          reject(new Error("Timeout"));
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

  _refreshQueueUI() {
    this._updateQueueIndicator();
    const listEl = this.el.querySelector("#sr-queue-list");
    listEl.innerHTML = this.queue.map((job, i) => {
      const fullVars = Object.entries(job.values).map(([k, v]) => `${k}=${v}`).join(', ');
      const shortenedVars = this._shortenText(fullVars);
      return `
        <li class="bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex items-start justify-between group hover:bg-white hover:border-indigo-100 transition-all">
          <div class="flex-1 min-w-0 pr-2">
             <div class="flex items-center gap-1.5 mb-0.5">
                <span class="text-[9px] font-black text-gray-300">#${i + 1}</span>
                <span class="text-xs font-bold text-gray-700 truncate">${job.name}</span>
             </div>
             <div class="text-[10px] text-gray-400 italic truncate" title="${fullVars}">${shortenedVars}</div>
          </div>
          <button class="sr-queue-copy w-6 h-6 flex items-center justify-center bg-white border border-gray-100 rounded-md text-[10px] hover:bg-indigo-600 hover:text-white transition-all active:scale-90" data-idx="${i}">
             📋
          </button>
        </li>
      `;
    }).join("");

    listEl.querySelectorAll('.sr-queue-copy').forEach(btn => {
      btn.onclick = (e) => this._copyQueueItem(parseInt(e.currentTarget.dataset.idx, 10));
    });
  }

  _copyQueueItem(index) {
    const job = this.queue[index];
    if (!job) return;
    const raw = this.templates[job.name];
    if (!raw) return;
    const tplArr = Array.isArray(raw) ? raw : (raw.questions || []);
    const prompts = this._expandScenario(tplArr.slice(job.startAt), job.values);
    if (prompts.length === 0) return;
    navigator.clipboard.writeText(prompts.map(p => p.text).join('\n\n---\n\n')).then(() => alert(`✅ Copied!`));
  }

  _shortenText(text, maxLength = 60) {
    return (text.length <= maxLength) ? text : text.slice(0, maxLength) + '...';
  }

  _isBusy() {
    return !!this.sequencer && !this.sequencer.stopped;
  }

  _clearVariableInputs() {
    this.el.querySelectorAll('#scenario-inputs [data-key]').forEach(el => el.value = '');
    this.el.querySelector('#scenario-inputs [data-key]')?.focus();
  }

  destroy() {
    this.el?.remove();
    this.onClose();
    this.sequencer?.stop();
  }
};