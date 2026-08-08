// --- STAGE: ScenarioRunner.js (CLEANED & COMPACT) ---

const ScenarioRunnerInnerHTML = `
  <div class="sr-header flex items-center mb-4 cursor-move select-none">
    <span class="text-xl mr-2">📤</span>
    <div>
      <h3 class="m-0 text-base font-bold text-gray-900 leading-tight">Scenario Runner</h3>
      <div class="text-[10px] text-gray-500 font-medium tracking-tight">Execute automation sequences</div>
    </div>
  </div>

  <!-- Banner khôi phục phiên song song bị gián đoạn -->
  <div id="sr-restore-banner" class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex flex-col gap-1.5 hidden animate-in">
    <div class="flex items-center justify-between">
      <div class="text-xs font-bold text-amber-800 flex items-center gap-1 select-none">
        <span>⚡</span> Khôi phục phiên chạy song song
      </div>
      <span class="text-[10px] text-amber-600 animate-pulse select-none">⏳ Gián đoạn</span>
    </div>
    <div class="text-[10px] text-amber-700 font-medium leading-relaxed" id="sr-restore-desc">
      Đang tải thông tin...
    </div>
    <div class="flex gap-2 justify-end mt-1">
      <button id="sr-restore-cancel" class="px-2.5 py-1 text-[9px] font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-all active:scale-95 shadow-sm">
        Bỏ qua & Xóa
      </button>
      <button id="sr-restore-confirm" class="px-3 py-1 text-[9px] font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-all shadow-sm active:scale-95">
        Tiếp tục chạy
      </button>
    </div>
  </div>

  <div id="sr-scenario-browser" class="mb-4 relative">
    <label class="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest pl-1" for="sr-scenario-search">CHỌN KỊCH BẢN</label>
    <div class="relative">
      <input type="text" id="sr-scenario-search" 
        class="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:border-indigo-500 transition-all outline-none" 
        placeholder="Tìm kịch bản nhanh...">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
    </div>
    <div id="sr-scenario-dropdown" class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl z-[100] max-h-48 overflow-y-auto hidden-dropdown custom-scrollbar p-1 flex flex-col"></div>
  </div>

  <div class="bg-gray-50/50 p-3 rounded-xl border border-gray-100 mb-4">
    <label class="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest pl-1" for="step-select">BẮT ĐẦU TỪ BƯỚC</label>
    <select id="step-select" class="w-full h-9 px-3 text-sm font-bold text-indigo-600 bg-white border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all cursor-pointer" disabled>
      <option value="0">Vui lòng chọn kịch bản...</option>
    </select>
  </div>
  </div>

  <div class="flex items-center justify-between mb-1.5 pl-1">
    <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">THÔNG TIN ĐẦU VÀO</label>
    <button id="sr-clear-inputs" class="text-[9px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded transition-all active:scale-95" title="Xóa toàn bộ nội dung đã nhập">🧹 Xóa Form</button>
  </div>
  <div id="scenario-inputs" class="space-y-3 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100 max-h-48 overflow-y-auto custom-scrollbar"></div>

  <!-- Thanh tiến trình -->
  <div id="sr-progress-box" class="mb-4 hidden">
    <div class="flex justify-between items-end mb-1.5 px-1">
      <div class="text-[10px] font-bold text-gray-500 uppercase">
        <span id="sr-progress-step" class="text-indigo-600">0</span> / <span id="sr-progress-total">0</span> Prompts
      </div>
      <div class="flex items-center gap-2">
        <span id="sr-polling-dot" class="w-2 h-2 rounded-full bg-green-400 hidden" style="animation:pulse 1s ease-in-out infinite"></span>
        <button id="sr-download-zip" class="h-6 px-2.5 flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 font-bold rounded-lg text-[10px] hover:bg-purple-100 transition-all active:scale-95 shadow-sm hidden" title="Tải kết quả đã xong dưới dạng ZIP">
          📦 <span id="sr-zip-count">0</span>/<span id="sr-zip-total">0</span>
        </button>
        <div id="sr-progress-percent" class="text-sm font-black text-indigo-600">0%</div>
      </div>
    </div>
    <div class="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50">
      <div id="sr-progress-bar" class="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"></div>
    </div>
    <div id="sr-done-list" class="flex flex-wrap gap-1 mt-2 max-h-16 overflow-y-auto custom-scrollbar"></div>
    <div id="sr-split-detail" class="mt-2 space-y-1 max-h-32 overflow-y-auto custom-scrollbar hidden"></div>
  </div>

  <div class="grid grid-cols-3 gap-2 mb-2">
    <button id="sr-addqueue" class="h-9 bg-white border border-gray-200 text-gray-500 font-bold rounded-lg text-[10px] hover:bg-gray-50 hover:text-gray-700 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1.5">
      ➕ Hàng đợi <span id="sr-queue-count" class="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px]">0</span>
    </button>
    <button id="sr-start" class="h-9 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg text-[11px] hover:bg-indigo-100 transition-all active:scale-95 shadow-sm">
      ▶️ Tuần tự
    </button>
    <button id="sr-parallel" class="h-9 bg-amber-50 border border-amber-200 text-amber-700 font-bold rounded-lg text-[10px] hover:bg-amber-100 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1" title="Mỗi giá trị list chạy trên 1 tab riêng (Gemini, DeepSeek, v.v.)">
      ⚡ Song song
      <input type="number" id="sr-parallel-tabs" value="5" min="1" max="10"
        class="w-8 h-6 text-center text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded-md outline-none focus:border-amber-500"
        title="Số tab đồng thời" onclick="event.stopPropagation()" />
    </button>
  </div>
  <div class="grid grid-cols-2 gap-2 mb-4">
    <button id="sr-split-tabs" class="h-9 bg-teal-50 border border-teal-200 text-teal-700 font-bold rounded-lg text-[10px] hover:bg-teal-100 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1" title="Chia đều items vào N tab, mỗi tab chạy nhiều items tuần tự">
      🔀 Chia tab
      <input type="number" id="sr-split-tabs-count" value="3" min="1" max="10"
        class="w-8 h-6 text-center text-[10px] font-bold text-teal-700 bg-teal-100 border border-teal-300 rounded-md outline-none focus:border-teal-500"
        title="Số tab sẽ mở" onclick="event.stopPropagation()" />
    </button>
    <button id="sr-parallel-stop" class="h-9 bg-red-50 border border-red-200 text-red-700 font-bold rounded-lg text-[10px] hover:bg-red-100 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1 hidden" title="Hủy bỏ toàn bộ phiên chạy song song và đóng các tab con">
      🛑 Dừng chạy
    </button>
    <button id="sr-split-tabs-stop" class="h-9 bg-red-50 border border-red-200 text-red-700 font-bold rounded-lg text-[10px] hover:bg-red-100 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1 hidden" title="Hủy bỏ toàn bộ phiên chia tab và đóng các tab con">
      🛑 Dừng chia tab
    </button>
  </div>

  <!-- Lựa chọn chuyển tab khi chạy song song -->
  <div class="flex flex-col gap-2 mb-4 px-1">
    <label class="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer select-none">
      <input type="checkbox" id="sr-parallel-active" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked>
      <span>Tự động chuyển sang tab mới mở</span>
    </label>
    <div class="flex items-center gap-1.5 text-[11px] text-gray-600 select-none">
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input type="checkbox" id="sr-auto-switch-tabs" class="rounded border-gray-300 text-teal-600 focus:ring-teal-500">
        <span>Tự động xoay vòng tab mỗi</span>
      </label>
      <input type="number" id="sr-auto-switch-interval" value="5" min="1" max="60"
        class="w-10 h-6 text-center text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-md outline-none focus:border-teal-500"
        title="Số giây mỗi lần xoay vòng" />
      <span>giây (Chống ngủ đông)</span>
    </div>
  </div>

  <div class="flex gap-2 mb-4">
    <button id="sr-pause" class="flex-1 h-8 bg-white border border-gray-100 text-gray-400 font-bold rounded-lg text-[10px] hover:bg-gray-50 hover:text-gray-600 transition-all active:scale-95 disabled:opacity-30" disabled>⏸ Tạm dừng</button>
    <button id="sr-resume" class="flex-1 h-8 bg-white border border-indigo-100 text-indigo-400 font-bold rounded-lg text-[10px] hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95 disabled:opacity-30" disabled>▶️ Tiếp tục</button>
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
      ContentHelper.showToast("Không tìm thấy ChatAdapter phù hợp cho trang hiện tại. Scenario Runner sẽ bị vô hiệu.", "error");
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

    ContentHelper.mountPanel(this.el);

    // Tải kịch bản và thiết lập giao diện tìm kiếm mới
    this._setupScenarioSearch();

    // Gắn sự kiện cho các nút điều khiển
    this._attachControlEvents();

    ContentHelper.makeDraggable(this.el, ".sr-header");
    ContentHelper.addCloseButton(this.el, () => this.destroy());

    // Nút thu nhỏ (minimize) — tạo bong bóng Messenger khi click
    this._minimizeCtrl = ContentHelper.addMinimizeButton(this.el, {
      icon: '📤',
      tooltip: 'Scenario Runner',
      getBadgeInfo: () => this._getBubbleBadgeInfo()
    });

    // Kiểm tra xem có phiên parallel nào bị gián đoạn trước đó không
    this._checkInterruptedParallelSession();
  }

  /**
   * Trả về thông tin badge cho bong bóng (bubble) dựa trên trạng thái sequencer.
   * @returns {{ text: string, status: string }}
   */
  _getBubbleBadgeInfo() {
    if (!this.sequencer || this.sequencer.stopped) {
      return { text: '−', status: 'idle' };
    }
    const idx = this.sequencer.idx || 0;
    const total = this.sequencer.prompts?.length || 0;
    if (this.sequencer.paused) {
      return { text: `${idx}/${total}`, status: 'paused' };
    }
    // Đang chạy
    return { text: `${idx}/${total}`, status: 'running' };
  }

  /**
   * Kiểm tra storage để phát hiện và khôi phục phiên song song bị gián đoạn dở dang
   */
  _checkInterruptedParallelSession() {
    chrome.storage.local.get(null, (items) => {
      // Tìm key parallel_session_*
      const sessionKeys = Object.keys(items).filter(k => k.startsWith('parallel_session_'));
      if (sessionKeys.length === 0) return;

      // Tìm session gần nhất bị gián đoạn (done < total)
      let interruptedSession = null;
      let interruptedKey = null;

      for (const key of sessionKeys) {
        const session = items[key];
        if (!session || !session.tasks) continue;

        const tasks = Object.values(session.tasks);
        const total = session.total || tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const failed = tasks.filter(t => t.status === 'failed').length;
        const done = completed + failed;

        if (done < total) {
          interruptedSession = session;
          interruptedKey = key;
          break;
        }
      }

      if (!interruptedSession) return;

      const sessionId = interruptedSession.sessionId;
      const tasks = Object.values(interruptedSession.tasks);
      const total = interruptedSession.total || tasks.length;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const failed = tasks.filter(t => t.status === 'failed').length;
      const done = completed + failed;

      // Lấy tên kịch bản từ task đầu tiên
      const firstTask = tasks[0];
      const scenarioName = firstTask?.scenarioName || "Không rõ";

      const banner = this.el.querySelector('#sr-restore-banner');
      const desc = this.el.querySelector('#sr-restore-desc');
      const btnConfirm = this.el.querySelector('#sr-restore-confirm');
      const btnCancel = this.el.querySelector('#sr-restore-cancel');

      if (!banner || !desc || !btnConfirm || !btnCancel) return;

      desc.innerHTML = `Phát hiện kịch bản <b>"${scenarioName}"</b> chạy song song bị dừng dở dang.<br/>Tiến độ: <b>${done}/${total}</b> prompts đã hoàn thành.`;
      banner.classList.remove('hidden');

      btnConfirm.onclick = () => {
        // Disable controls + Thay đổi nút bấm
        this.el.querySelector('#sr-start').disabled = true;
        this.el.querySelector('#sr-parallel').classList.add('hidden');
        this.el.querySelector('#sr-parallel-stop').classList.remove('hidden');
        this.el.querySelector('#sr-addqueue').disabled = true;

        // Thiết lập trạng thái song song để polling
        this._parallelRunning = true;
        this._parallelSessionId = sessionId;
        this._parallelTotal = total;
        this._parallelDoneCount = completed;

        // Hiển thị progress bar + nút download ZIP
        this._showProgress(true);
        this._updateParallelProgress(completed, total);
        this._clearDoneList();
        this._showDownloadZipBtn(true, completed, total);

        // Đưa các task đã hoàn thành hoặc lỗi trước đó vào danh sách hiển thị
        tasks.forEach(t => {
          if (t.status === 'completed' || t.status === 'failed') {
            this._addDoneItem(t.label || t.taskId);
          }
        });

        // Gửi tin nhắn khôi phục lên background
        chrome.runtime.sendMessage({
          type: 'PARALLEL_RESUME',
          sessionId: sessionId
        }, (response) => {
          if (chrome.runtime.lastError || !response?.success) {
            console.error('❌ [ScenarioRunner] Lỗi khôi phục parallel:', chrome.runtime.lastError || response?.error);
            ContentHelper.showToast('❌ Lỗi khôi phục phiên chạy song song.', 'error');
            this._resetControls();
            this._parallelRunning = false;
          } else {
            ContentHelper.showToast('⚡ Đã khôi phục và tiếp tục chạy phiên song song!', 'success');
            banner.classList.add('hidden');
            this._startParallelPolling();
          }
        });
      };

      btnCancel.onclick = () => {
        chrome.runtime.sendMessage({
          type: 'PARALLEL_CLEANUP_SESSION',
          sessionId: sessionId
        }, () => {
          banner.classList.add('hidden');
          ContentHelper.showToast('🗑️ Đã bỏ qua và xóa phiên song song bị gián đoạn.', 'info');
        });
      };
    });
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
          const score = ContentHelper.fuzzySearch(keyword, div.textContent);
          return { div, score };
        });

        scoredItems.forEach(item => {
          if (item.score > 0) {
            item.div.style.setProperty('display', 'flex', 'important');
            item.div.style.order = -item.score;
          } else {
            item.div.style.setProperty('display', 'none', 'important');
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
        const baseClasses = "w-full px-2 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none";

        if (optionsStr) {
          inputEl = document.createElement("select");
          inputEl.className = `${baseClasses} h-8 font-bold text-indigo-700 cursor-pointer border-gray-300`;
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
          inputEl.className = `${baseClasses} min-h-[50px] font-mono text-[10px] text-indigo-600 resize-y`;
          inputEl.placeholder = "Các giá trị, cách nhau bằng dấu phẩy...";
        } else {
          inputEl = document.createElement("textarea");
          inputEl.className = `${baseClasses} min-h-[60px] resize-y`;
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
    const btnParallel = this.el.querySelector('#sr-parallel');
    const btnParallelStop = this.el.querySelector('#sr-parallel-stop');
    const btnSplitTabs = this.el.querySelector('#sr-split-tabs');
    const btnSplitTabsStop = this.el.querySelector('#sr-split-tabs-stop');
    const btnClearInputs = this.el.querySelector('#sr-clear-inputs');

    if (btnClearInputs) {
      btnClearInputs.onclick = () => this._clearVariableInputs();
    }

    btnStart.onclick = () => this._start();
    btnParallel.onclick = (e) => {
      // Không trigger khi click vào input số tab
      if (e.target.id === 'sr-parallel-tabs') return;
      this._startParallel();
    };
    if (btnParallelStop) {
      btnParallelStop.onclick = () => this._stopParallelSession();
    }
    btnSplitTabs.onclick = (e) => {
      if (e.target.id === 'sr-split-tabs-count') return;
      this._startSplitTabs();
    };
    if (btnSplitTabsStop) {
      btnSplitTabsStop.onclick = () => this._stopSplitTabsSession();
    }
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
        ContentHelper.showToast("Vui lòng chọn một kịch bản hợp lệ từ danh sách!", "warning");
        return;
      }
      const name = selectedDiv.dataset.name;
      const startAt = parseInt(this.el.querySelector("#step-select").value || "0", 10);
      const values = this._readVariableValues();
      this.queue.push({ name, startAt, values });

      this._refreshQueueUI();
      ContentHelper.showToast(`✅ Đã thêm(#${this.queue.length}) vào hàng đợi.`, "success");
      this._clearVariableInputs();
    };

    // Nút Download ZIP
    const btnDownloadZip = this.el.querySelector('#sr-download-zip');
    if (btnDownloadZip) {
      btnDownloadZip.onclick = () => this._downloadParallelZip();
    }

    // Checkbox Tự động chuyển sang tab mới mở
    const checkboxActive = this.el.querySelector('#sr-parallel-active');
    if (checkboxActive) {
      chrome.storage.local.get('srParallelActive', (result) => {
        if (result.srParallelActive !== undefined) {
          checkboxActive.checked = result.srParallelActive;
        }
      });
      checkboxActive.addEventListener('change', () => {
        chrome.storage.local.set({ srParallelActive: checkboxActive.checked });
      });
    }

    // Checkbox Tự động xoay vòng tab
    const checkboxAutoSwitch = this.el.querySelector('#sr-auto-switch-tabs');
    if (checkboxAutoSwitch) {
      chrome.storage.local.get('srAutoSwitchTabs', (result) => {
        if (result.srAutoSwitchTabs !== undefined) {
          checkboxAutoSwitch.checked = result.srAutoSwitchTabs;
        }
      });
      checkboxAutoSwitch.addEventListener('change', () => {
        const isChecked = checkboxAutoSwitch.checked;
        chrome.storage.local.set({ srAutoSwitchTabs: isChecked });
        
        // Nếu đang chạy Chia tab, gửi thông báo ngay cho background
        if (this._splitTabsRunning && this._splitTabsSessionId) {
          const autoSwitchInterval = parseInt(this.el.querySelector('#sr-auto-switch-interval')?.value || '5', 10);
          chrome.runtime.sendMessage({
            type: 'SPLIT_TABS_TOGGLE_AUTO_SWITCH',
            sessionId: this._splitTabsSessionId,
            autoSwitchTabs: isChecked,
            autoSwitchInterval: autoSwitchInterval
          });
        }
      });
    }

    // Input số giây Tự động xoay vòng tab
    const inputAutoSwitchInterval = this.el.querySelector('#sr-auto-switch-interval');
    if (inputAutoSwitchInterval) {
      chrome.storage.local.get('srAutoSwitchInterval', (result) => {
        if (result.srAutoSwitchInterval !== undefined) {
          inputAutoSwitchInterval.value = result.srAutoSwitchInterval;
        }
      });
      inputAutoSwitchInterval.addEventListener('change', () => {
        const val = parseInt(inputAutoSwitchInterval.value || '5', 10);
        chrome.storage.local.set({ srAutoSwitchInterval: val });
        
        // Cập nhật ngay nếu đang bật và đang chạy
        if (this._splitTabsRunning && this._splitTabsSessionId && checkboxAutoSwitch?.checked) {
          chrome.runtime.sendMessage({
            type: 'SPLIT_TABS_TOGGLE_AUTO_SWITCH',
            sessionId: this._splitTabsSessionId,
            autoSwitchTabs: true,
            autoSwitchInterval: val
          });
        }
      });
    }
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
      if (!selectedDiv) {
        ContentHelper.showToast("Vui lòng chọn một kịch bản!", "warning");
        return;
      }

      const name = selectedDiv.dataset.name;
      const startAt = parseInt(this.el.querySelector("#step-select").value || "0", 10);
      const values = this._readVariableValues();
      this.queue.push({ name, startAt, values });
    }

    this.el.querySelector("#sr-start").disabled = true;
    this.el.querySelector("#sr-addqueue").disabled = true;
    this.el.querySelector("#sr-parallel").disabled = true;
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
      ContentHelper.showToast("Không có prompt nào.", "warning");
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
    this.el.querySelector("#sr-parallel").disabled = false;
    this.el.querySelector("#sr-parallel").classList.remove('hidden');
    this.el.querySelector("#sr-parallel-stop").classList.add('hidden');
    this.el.querySelector("#sr-split-tabs").disabled = false;
    this.el.querySelector("#sr-split-tabs").classList.remove('hidden');
    this.el.querySelector("#sr-split-tabs-stop").classList.add('hidden');
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

  /**
   * Chờ AI phản hồi xong – sử dụng ResponseWaiter (MutationObserver + setTimeout fallback).
   * Không bị throttle khi tab ẩn, có auto-scroll khi AI sinh nội dung.
   * @param {number} timeout - Thời gian tối đa chờ (ms), mặc định 10 phút
   */
  _waitForResponse(timeout = 600000) {
    return ResponseWaiter.waitForDone({ timeout, autoScroll: true });
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
    navigator.clipboard.writeText(prompts.map(p => p.text).join('\n\n---\n\n')).then(() => ContentHelper.showToast(`✅ Copied!`, "success"));
  }

  _shortenText(text, maxLength = 60) {
    return (text.length <= maxLength) ? text : text.slice(0, maxLength) + '...';
  }

  _isBusy() {
    return (!!this.sequencer && !this.sequencer.stopped) || this._parallelRunning || this._splitTabsRunning;
  }

  _clearVariableInputs() {
    this.el.querySelectorAll('#scenario-inputs [data-key]').forEach(el => el.value = '');
    this.el.querySelector('#scenario-inputs [data-key]')?.focus();
  }

  // ═══════════════════════════════════════════════════════════════
  // Parallel Execution – Chạy song song trên nhiều tab
  // ═══════════════════════════════════════════════════════════════

  /**
   * Bắt đầu chạy song song: phân tách list thành các task riêng biệt,
   * gửi cho background tạo tab và điều phối.
   * Chỉ áp dụng cho question type "list".
   */
  _startParallel() {
    // 1. Lấy scenario đang chọn
    const selectedText = this.el.querySelector("#sr-scenario-search").value;
    const selectedDiv = Array.from(this.el.querySelectorAll('.scenario-dropdown-item'))
      .find(d => d.textContent === selectedText);

    if (!selectedDiv) {
      ContentHelper.showToast("Vui lòng chọn một kịch bản!", "warning");
      return;
    }

    const name = selectedDiv.dataset.name;
    const raw = this.templates[name];
    if (!raw) return;

    const tplArr = Array.isArray(raw) ? raw : (raw.questions || []);
    const startAt = parseInt(this.el.querySelector("#step-select").value || "0", 10);
    const values = this._readVariableValues();

    // 2. Tìm question type "list" để lấy loopKey và danh sách giá trị
    const slice = tplArr.slice(startAt);
    const listQuestion = slice.find(q => q.type === 'list');

    if (!listQuestion) {
      ContentHelper.showToast("⚠️ Kịch bản không có bước dạng 'list'. Chỉ dạng list mới hỗ trợ chạy song song.", "warning");
      return;
    }

    const loopKey = this._getLoopKey(listQuestion);
    const listValuesStr = values[loopKey] || '';
    const listValues = listValuesStr.split(',').map(v => v.trim()).filter(Boolean);

    if (listValues.length === 0) {
      ContentHelper.showToast("⚠️ Danh sách giá trị rỗng. Hãy nhập các giá trị cách nhau bằng dấu phẩy.", "warning");
      return;
    }

    // 3. Lấy số tab đồng thời từ input
    const maxConcurrent = parseInt(this.el.querySelector('#sr-parallel-tabs').value || '5', 10);
    const activeTab = this.el.querySelector('#sr-parallel-active')?.checked ?? true;

    // 4. Xác định base URL động dựa trên trang AI đang sử dụng
    let baseUrl = window.location.origin + '/';
    if (window.location.hostname.includes('gemini.google.com')) {
      baseUrl = 'https://gemini.google.com/app';
    } else if (window.location.hostname.includes('chatgpt.com')) {
      baseUrl = 'https://chatgpt.com/';
    } else if (window.location.hostname.includes('deepseek.com')) {
      baseUrl = 'https://chat.deepseek.com/';
    } else if (window.location.hostname.includes('qwen.ai')) {
      baseUrl = 'https://chat.qwen.ai/';
    } else if (window.location.hostname.includes('grok.com')) {
      baseUrl = 'https://grok.com/';
    }

    // 5. Tạo danh sách tasks – mỗi giá trị trong list = 1 task
    const sessionId = `parallel_${Date.now()}`;
    const tasks = listValues.map((itemValue, idx) => {
      const taskValues = { ...values, [loopKey]: itemValue };
      return {
        taskId: `${sessionId}_${idx}_${itemValue}`,
        label: itemValue,
        scenarioName: name,
        values: taskValues,
        startAt: startAt
      };
    });

    console.log(`⚡ [ScenarioRunner] Parallel: ${tasks.length} tasks, max ${maxConcurrent} tabs`);
    console.log(`📋 [ScenarioRunner] Tasks:`, tasks);

    // 6. Disable controls + Thay đổi nút bấm
    this.el.querySelector('#sr-start').disabled = true;
    this.el.querySelector('#sr-parallel').classList.add('hidden');
    this.el.querySelector('#sr-parallel-stop').classList.remove('hidden');
    this.el.querySelector('#sr-addqueue').disabled = true;
    this._parallelRunning = true;
    this._parallelSessionId = sessionId;
    this._parallelTotal = tasks.length;
    this._parallelDoneCount = 0;

    // 7. Hiển thị progress + nút download ZIP
    this._showProgress(true);
    this._updateProgress(0, tasks.length);
    this._clearDoneList();
    this._showDownloadZipBtn(true, 0, tasks.length);

    // 8. Gửi PARALLEL_START đến background
    chrome.runtime.sendMessage({
      type: 'PARALLEL_START',
      sessionId: sessionId,
      tasks: tasks,
      baseUrl: baseUrl,
      maxConcurrent: maxConcurrent,
      activeTab: activeTab
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ [ScenarioRunner] Lỗi gửi PARALLEL_START:', chrome.runtime.lastError);
        ContentHelper.showToast('❌ Lỗi khởi tạo chạy song song.', 'error');
        this._resetControls();
        this._parallelRunning = false;
      } else {
        ContentHelper.showToast(
          `⚡ Đã bắt đầu chạy song song ${tasks.length} tasks trên tối đa ${maxConcurrent} tab!`,
          'success'
        );
        // Bắt đầu polling storage mỗi 3 giây
        this._startParallelPolling();
      }
    });
  }

  /**
   * Bắt đầu polling chrome.storage.local mỗi 3 giây.
   */
  _startParallelPolling() {
    this._stopParallelPolling();
    this._polledLabels = new Set();
    this._parallelPollTimer = setInterval(() => this._pollParallelStatus(), 3000);
    console.log('🔄 [ScenarioRunner] Bắt đầu polling storage mỗi 3s');
  }

  /**
   * Dừng polling.
   */
  _stopParallelPolling() {
    if (this._parallelPollTimer) {
      clearInterval(this._parallelPollTimer);
      this._parallelPollTimer = null;
    }
    const dot = this.el?.querySelector('#sr-polling-dot');
    if (dot) dot.classList.add('hidden');
  }

  /**
   * Đọc trạng thái session từ chrome.storage.local và cập nhật UI.
   */
  _pollParallelStatus() {
    if (!this._parallelSessionId) return;

    // Hiệu ứng polling: hiện dot xanh nhấp nháy
    const dot = this.el.querySelector('#sr-polling-dot');
    if (dot) {
      dot.classList.remove('hidden');
      setTimeout(() => dot.classList.add('hidden'), 1500);
    }

    const key = `parallel_session_${this._parallelSessionId}`;
    chrome.storage.local.get(key, (result) => {
      const session = result[key];
      if (!session) return;

      const tasks = Object.values(session.tasks);
      const completed = tasks.filter(t => t.status === 'completed');
      const failed = tasks.filter(t => t.status === 'failed');
      const total = session.total;
      const done = completed.length + failed.length;

      // Cập nhật progress bar
      this._updateParallelProgress(done, total);

      // Cập nhật nút Download ZIP
      this._parallelDoneCount = completed.length;
      this._showDownloadZipBtn(true, completed.length, total);

      // Thêm labels mới vào danh sách đã xong
      [...completed, ...failed].forEach(t => {
        if (!this._polledLabels.has(t.taskId)) {
          this._polledLabels.add(t.taskId);
          this._addDoneItem(t.label || t.taskId);
        }
      });

      // Kiểm tra hoàn thành
      if (done >= total && this._parallelRunning) {
        this._stopParallelPolling();
        this._resetControls();
        this._parallelRunning = false;

        let msg = `🎉 Hoàn thành: ${completed.length}/${total} thành công`;
        if (failed.length > 0) msg += `, ${failed.length} lỗi`;
        ContentHelper.showToast(msg, failed.length > 0 ? 'warning' : 'success');
      }
    });
  }

  /**
   * Cập nhật progress bar cho chế độ parallel.
   * (Tái sử dụng UI elements của progress bar hiện tại)
   * @param {number} done - Số task đã xong
   * @param {number} total - Tổng số task
   */
  _updateParallelProgress(done, total) {
    const bar = this.el.querySelector("#sr-progress-bar");
    const textStep = this.el.querySelector("#sr-progress-step");
    const textTotal = this.el.querySelector("#sr-progress-total");
    const textPercent = this.el.querySelector("#sr-progress-percent");

    if (!bar || !textStep || !textTotal || !textPercent) return;

    textStep.textContent = done;
    textTotal.textContent = total;

    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    textPercent.textContent = `${percent}%`;
    bar.style.width = `${percent}%`;
  }

  /**
   * Hiển/ẩn nút Download ZIP và cập nhật số lượng.
   * @param {boolean} show - Hiển hay ẩn nút
   * @param {number} doneCount - Số kết quả đã sẵn sàng
   * @param {number} total - Tổng số task
   */
  _showDownloadZipBtn(show, doneCount = 0, total = 0) {
    const btn = this.el.querySelector('#sr-download-zip');
    if (!btn) return;

    if (show) {
      btn.classList.remove('hidden');
      const countEl = this.el.querySelector('#sr-zip-count');
      const totalEl = this.el.querySelector('#sr-zip-total');
      if (countEl) countEl.textContent = doneCount;
      if (totalEl) totalEl.textContent = total;

      // Disable nếu chưa có kết quả nào
      btn.disabled = doneCount === 0;
      btn.style.opacity = doneCount === 0 ? '0.4' : '1';
    } else {
      btn.classList.add('hidden');
    }
  }

  /**
   * Gửi yêu cầu tạo ZIP và tải xuống từ background.
   */
  _downloadParallelZip() {
    if (!this._parallelSessionId) {
      ContentHelper.showToast('⚠️ Không có phiên parallel nào để tải.', 'warning');
      return;
    }

    if (this._parallelDoneCount === 0) {
      ContentHelper.showToast('⚠️ Chưa có kết quả nào hoàn thành.', 'warning');
      return;
    }

    ContentHelper.showToast(`📦 Đang tạo ZIP với ${this._parallelDoneCount} file...`, 'info');

    chrome.runtime.sendMessage({
      type: 'PARALLEL_DOWNLOAD_ZIP',
      sessionId: this._parallelSessionId
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ [ScenarioRunner] Lỗi gửi PARALLEL_DOWNLOAD_ZIP:', chrome.runtime.lastError);
        ContentHelper.showToast('❌ Lỗi tải ZIP.', 'error');
        return;
      }

      if (response?.status === 'completed') {
        ContentHelper.showToast(`✅ Đã tải ZIP với ${response.count} file!`, 'success');
      } else if (response?.status === 'error') {
        ContentHelper.showToast(`❌ Lỗi: ${response.message}`, 'error');
      }
    });
  }

  /**
   * Dừng chạy phiên song song hiện tại, đóng các tab con và reset UI.
   */
  _stopParallelSession() {
    if (!this._parallelSessionId) return;

    const sessionId = this._parallelSessionId;
    this._stopParallelPolling();

    chrome.runtime.sendMessage({
      type: 'PARALLEL_STOP',
      sessionId: sessionId
    }, (response) => {
      this._parallelRunning = false;
      this._parallelSessionId = null;
      this._resetControls();
      this._showProgress(false);
      this._showDownloadZipBtn(false);
      ContentHelper.showToast('🛑 Đã dừng phiên chạy song song và đóng các tab con.', 'info');
    });
  }

  destroy() {
    this._minimizeCtrl?.destroy();
    this.el?.remove();
    this.onClose();
    this.sequencer?.stop();
    // Dừng polling
    this._stopParallelPolling();
    this._stopSplitTabsPolling();
    // Dọn session parallel từ background + storage
    if (this._parallelSessionId) {
      chrome.runtime.sendMessage({
        type: 'PARALLEL_CLEANUP_SESSION',
        sessionId: this._parallelSessionId
      });
    }
    // Dọn session split tabs từ background + storage
    if (this._splitTabsSessionId) {
      chrome.runtime.sendMessage({
        type: 'SPLIT_TABS_CLEANUP_SESSION',
        sessionId: this._splitTabsSessionId
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Split Tabs – Chia đều items vào N tab
  // ═══════════════════════════════════════════════════════════════

  /**
   * Bắt đầu chia tab: phân chia list items đều vào N tab,
   * mỗi tab chạy nhiều items tuần tự.
   */
  _startSplitTabs() {
    // 1. Lấy scenario đang chọn
    const selectedText = this.el.querySelector("#sr-scenario-search").value;
    const selectedDiv = Array.from(this.el.querySelectorAll('.scenario-dropdown-item'))
      .find(d => d.textContent === selectedText);

    if (!selectedDiv) {
      ContentHelper.showToast("Vui lòng chọn một kịch bản!", "warning");
      return;
    }

    const name = selectedDiv.dataset.name;
    const raw = this.templates[name];
    if (!raw) return;

    const tplArr = Array.isArray(raw) ? raw : (raw.questions || []);
    const startAt = parseInt(this.el.querySelector("#step-select").value || "0", 10);
    const values = this._readVariableValues();

    // 2. Tìm question type "list" để lấy loopKey và danh sách giá trị
    const slice = tplArr.slice(startAt);
    const listQuestion = slice.find(q => q.type === 'list');

    if (!listQuestion) {
      ContentHelper.showToast("⚠️ Kịch bản không có bước dạng 'list'. Chỉ dạng list mới hỗ trợ chia tab.", "warning");
      return;
    }

    const loopKey = this._getLoopKey(listQuestion);
    const listValuesStr = values[loopKey] || '';
    const listValues = listValuesStr.split(',').map(v => v.trim()).filter(Boolean);

    if (listValues.length === 0) {
      ContentHelper.showToast("⚠️ Danh sách giá trị rỗng. Hãy nhập các giá trị cách nhau bằng dấu phẩy.", "warning");
      return;
    }

    // 3. Lấy số tab từ input
    let numTabs = parseInt(this.el.querySelector('#sr-split-tabs-count').value || '3', 10);
    numTabs = Math.min(numTabs, listValues.length); // Không mở nhiều tab hơn số items
    const activeTab = this.el.querySelector('#sr-parallel-active')?.checked ?? true;
    const autoSwitchTabs = this.el.querySelector('#sr-auto-switch-tabs')?.checked ?? false;
    const autoSwitchInterval = parseInt(this.el.querySelector('#sr-auto-switch-interval')?.value || '5', 10);

    // 4. Chia đều items vào N tab
    const chunkSize = Math.ceil(listValues.length / numTabs);
    const chunks = [];
    for (let i = 0; i < listValues.length; i += chunkSize) {
      chunks.push(listValues.slice(i, i + chunkSize));
    }

    // 5. Xác định base URL động
    let baseUrl = window.location.origin + '/';
    if (window.location.hostname.includes('gemini.google.com')) {
      baseUrl = 'https://gemini.google.com/app';
    } else if (window.location.hostname.includes('chatgpt.com')) {
      baseUrl = 'https://chatgpt.com/';
    } else if (window.location.hostname.includes('deepseek.com')) {
      baseUrl = 'https://chat.deepseek.com/';
    } else if (window.location.hostname.includes('qwen.ai')) {
      baseUrl = 'https://chat.qwen.ai/';
    } else if (window.location.hostname.includes('grok.com')) {
      baseUrl = 'https://grok.com/';
    }

    // 6. Tạo danh sách tasks – mỗi task chứa nhiều items
    const sessionId = `split_tabs_${Date.now()}`;
    const tasks = chunks.map((itemGroup, idx) => {
      const taskValues = { ...values };
      return {
        taskId: `${sessionId}_tab${idx}`,
        label: `Tab ${idx + 1} (${itemGroup.length} items)`,
        scenarioName: name,
        values: taskValues,
        items: itemGroup,
        loopKey: loopKey,
        startAt: startAt
      };
    });

    console.log(`🔀 [ScenarioRunner] Split Tabs: ${listValues.length} items → ${tasks.length} tabs`);
    console.log(`📋 [ScenarioRunner] Chunks:`, chunks);

    // 7. Disable controls + thay đổi nút bấm
    this.el.querySelector('#sr-start').disabled = true;
    this.el.querySelector('#sr-parallel').classList.add('hidden');
    this.el.querySelector('#sr-split-tabs').classList.add('hidden');
    this.el.querySelector('#sr-split-tabs-stop').classList.remove('hidden');
    this.el.querySelector('#sr-addqueue').disabled = true;
    this._splitTabsRunning = true;
    this._splitTabsSessionId = sessionId;
    this._splitTabsTotal = tasks.length;
    this._splitTabsDoneCount = 0;

    // 8. Hiển thị progress
    this._showProgress(true);
    this._updateParallelProgress(0, tasks.length);
    this._clearDoneList();

    // 9. Gửi SPLIT_TABS_START đến background
    chrome.runtime.sendMessage({
      type: 'SPLIT_TABS_START',
      sessionId: sessionId,
      tasks: tasks,
      baseUrl: baseUrl,
      activeTab: activeTab,
      autoSwitchTabs: autoSwitchTabs,
      autoSwitchInterval: autoSwitchInterval
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ [ScenarioRunner] Lỗi gửi SPLIT_TABS_START:', chrome.runtime.lastError);
        ContentHelper.showToast('❌ Lỗi khởi tạo chia tab.', 'error');
        this._resetControls();
        this._splitTabsRunning = false;
      } else {
        ContentHelper.showToast(
          `🔀 Đã bắt đầu chia ${listValues.length} items vào ${tasks.length} tab!`,
          'success'
        );
        this._startSplitTabsPolling();
      }
    });
  }

  /**
   * Bắt đầu polling chrome.storage.local mỗi 3 giây cho split tabs.
   */
  _startSplitTabsPolling() {
    this._stopSplitTabsPolling();
    this._splitTabsPolledLabels = new Set();
    this._splitTabsPollTimer = setInterval(() => this._pollSplitTabsStatus(), 3000);
    console.log('🔄 [ScenarioRunner] Bắt đầu polling split tabs storage mỗi 3s');
  }

  /**
   * Dừng polling split tabs.
   */
  _stopSplitTabsPolling() {
    if (this._splitTabsPollTimer) {
      clearInterval(this._splitTabsPollTimer);
      this._splitTabsPollTimer = null;
    }
  }

  /**
   * Đọc trạng thái session split tabs từ chrome.storage.local và cập nhật UI.
   * Đọc meta key và các per-task keys.
   */
  _pollSplitTabsStatus() {
    if (!this._splitTabsSessionId) return;

    // Hiệu ứng polling: hiện dot xanh nhấp nháy
    const dot = this.el.querySelector('#sr-polling-dot');
    if (dot) {
      dot.classList.remove('hidden');
      setTimeout(() => dot.classList.add('hidden'), 1500);
    }

    const metaKey = `split_tabs_meta_${this._splitTabsSessionId}`;
    chrome.storage.local.get(metaKey, (metaResult) => {
      const meta = metaResult[metaKey];
      if (!meta) return;

      const taskKeys = meta.taskIds.map(id => `split_task_${id}`);
      chrome.storage.local.get(taskKeys, (taskResult) => {
        const tasks = Object.values(taskResult);
        const completed = tasks.filter(t => t.status === 'completed');
        const failed = tasks.filter(t => t.status === 'failed');
        const total = meta.total;
        const done = completed.length + failed.length;

        // Cập nhật progress bar
        this._updateParallelProgress(done, total);

        // Hiển thị panel chi tiết
        this._updateSplitTabsDetailUI(tasks);

        // Thêm labels mới vào danh sách đã xong
        [...completed, ...failed].forEach(t => {
          if (!this._splitTabsPolledLabels.has(t.taskId)) {
            this._splitTabsPolledLabels.add(t.taskId);
            this._addDoneItem(t.label || t.taskId);
          }
        });

        // Kiểm tra hoàn thành
        if (done >= total && this._splitTabsRunning) {
          this._stopSplitTabsPolling();
          this._resetControls();
          this._splitTabsRunning = false;

          let msg = `🎉 Chia tab hoàn thành: ${completed.length}/${total} tab thành công`;
          if (failed.length > 0) msg += `, ${failed.length} lỗi`;
          ContentHelper.showToast(msg, failed.length > 0 ? 'warning' : 'success');
        }
      });
    });
  }

  /**
   * Render chi tiết từng tab lên UI (items done, running, waiting).
   */
  _updateSplitTabsDetailUI(tasks) {
    const detailContainer = this.el.querySelector('#sr-split-detail');
    if (!detailContainer) return;

    detailContainer.classList.remove('hidden');
    detailContainer.innerHTML = tasks.map(task => {
      const itemsHtml = task.items.map((item, idx) => {
        if (task.completedItems.includes(item)) return `<span class="text-green-500 font-bold" title="Done">✅ ${item}</span>`;
        if (task.status === 'running' && task.currentItem === item) return `<span class="text-teal-500 font-bold animate-pulse" title="Running">🔄 ${item}</span>`;
        if (task.status === 'failed') return `<span class="text-red-500 font-bold" title="Failed">❌ ${item}</span>`;
        return `<span class="text-gray-400 font-medium" title="Waiting">⏳ ${item}</span>`;
      }).join('<span class="text-gray-300 mx-1">|</span>');

      return `
        <div class="bg-white border border-gray-100 rounded p-1.5 text-[9px] flex flex-col gap-1">
          <div class="flex justify-between items-center">
            <span class="font-bold text-gray-700">🔀 ${task.label || task.taskId}</span>
            <span class="${task.status === 'completed' ? 'text-green-600' : task.status === 'running' ? 'text-teal-600 animate-pulse' : 'text-gray-500'} font-bold">
              ${task.status === 'completed' ? 'Done' : task.status === 'running' ? 'Running' : task.status === 'failed' ? 'Failed' : 'Pending'}
            </span>
          </div>
          <div class="flex flex-wrap gap-x-1">${itemsHtml}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Dừng chạy phiên chia tab hiện tại, đóng các tab con và reset UI.
   */
  _stopSplitTabsSession() {
    if (!this._splitTabsSessionId) return;

    const sessionId = this._splitTabsSessionId;
    this._stopSplitTabsPolling();

    chrome.runtime.sendMessage({
      type: 'SPLIT_TABS_STOP',
      sessionId: sessionId
    }, (response) => {
      this._splitTabsRunning = false;
      this._splitTabsSessionId = null;
      this._resetControls();
      this._showProgress(false);
      const detail = this.el.querySelector('#sr-split-detail');
      if (detail) detail.innerHTML = '';
      ContentHelper.showToast('🛑 Đã dừng phiên chia tab và đóng các tab con.', 'info');
    });
  }
};