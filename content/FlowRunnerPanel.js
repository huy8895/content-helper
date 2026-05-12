/**
 * FlowRunnerPanel.js
 * Giao diện thực thi Kịch bản liên hoàn (Flow) trên các trang chat AI.
 * Khởi tạo FlowSequencer để điều khiển quá trình chạy (chạy, tạm dừng, thử lại, bỏ qua).
 */

const FlowRunnerInnerHTML = `
  <div class="sr-header flex items-center mb-4 cursor-move select-none">
    <span class="text-xl mr-2">🔗</span>
    <div>
      <h3 class="m-0 text-base font-bold text-gray-900 leading-tight">Flow Runner</h3>
      <div class="text-[10px] text-gray-500 font-medium tracking-tight">Thực thi kịch bản liên hoàn</div>
    </div>
  </div>

  <div id="flow-browser" class="mb-4 relative">
    <label class="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest pl-1">CHỌN FLOW</label>
    <select id="flow-select" class="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:border-indigo-500 transition-all outline-none">
      <option value="">-- Đang tải dữ liệu... --</option>
    </select>
  </div>

  <div class="bg-gray-50/50 p-3 rounded-xl border border-gray-100 mb-4">
    <label class="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest pl-1">BẮT ĐẦU TỪ BƯỚC</label>
    <select id="flow-step-select" class="w-full h-9 px-3 text-sm font-bold text-indigo-600 bg-white border border-gray-300 rounded-lg outline-none focus:border-indigo-500 transition-all cursor-pointer" disabled>
      <option value="0">Vui lòng chọn Flow...</option>
    </select>
  </div>

  <div id="flow-inputs" class="space-y-3 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100 max-h-48 overflow-y-auto custom-scrollbar">
    <div class="text-xs text-gray-500 italic text-center">Các biến cấu hình sẽ hiển thị ở đây.</div>
  </div>

  <!-- Thanh tiến trình -->
  <div id="flow-progress-box" class="mb-4 hidden">
    <div class="flex justify-between items-end mb-1.5 px-1">
      <div class="text-[10px] font-bold text-gray-500 uppercase">
        Step <span id="flow-progress-step" class="text-indigo-600">0</span> / <span id="flow-progress-total">0</span>
      </div>
      <div id="flow-progress-status" class="text-xs font-black text-indigo-600">Đang chạy...</div>
    </div>
    <div class="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50">
      <div id="flow-progress-bar" class="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out" style="width: 0%"></div>
    </div>
    <div id="flow-step-details" class="mt-2 text-[10px] text-gray-500 italic truncate"></div>
    
    <!-- Controls khi gặp lỗi -->
    <div id="flow-error-controls" class="mt-2 flex gap-2 hidden">
      <button id="flow-retry-btn" class="flex-1 h-7 bg-orange-50 text-orange-600 border border-orange-200 rounded text-[10px] font-bold hover:bg-orange-100 transition-all">🔄 Thử lại (Retry)</button>
      <button id="flow-skip-btn" class="flex-1 h-7 bg-gray-100 text-gray-600 border border-gray-200 rounded text-[10px] font-bold hover:bg-gray-200 transition-all">⏭ Bỏ qua (Skip)</button>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-2 mb-4">
    <button id="flow-start-btn" class="h-9 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg text-[11px] hover:bg-indigo-100 transition-all active:scale-95 shadow-sm">
      ▶️ Bắt đầu Flow
    </button>
  </div>

  <div class="flex gap-2">
    <button id="flow-pause-btn" class="flex-1 h-8 bg-white border border-gray-100 text-gray-400 font-bold rounded-lg text-[10px] hover:bg-gray-50 hover:text-gray-600 transition-all active:scale-95 disabled:opacity-30" disabled>⏸ Tạm dừng</button>
    <button id="flow-resume-btn" class="flex-1 h-8 bg-white border border-indigo-100 text-indigo-400 font-bold rounded-lg text-[10px] hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95 disabled:opacity-30" disabled>▶️ Tiếp tục</button>
  </div>
`;

window.FlowRunnerPanel = class {
  constructor(onClose) {
    console.log("▶️ [FlowRunnerPanel] init");
    if (!window.ChatAdapter) {
      ContentHelper.showToast("Không tìm thấy ChatAdapter phù hợp. Flow Runner sẽ bị vô hiệu.", "error");
      throw new Error("ChatAdapter not available");
    }

    this.onClose = onClose;
    this.sequencer = null;
    this.flowConfigs = {};
    this.allScenarios = {};
    
    // Lưu các biến override của người dùng nhập trên UI
    this.userInputs = {}; 
    
    this._render();
    this._loadData();
  }

  _render() {
    this.el = document.createElement("div");
    this.el.id = "flow-runner-panel";
    this.el.className = "panel-box ts-panel w-[400px] p-4 rounded-xl shadow-2xl bg-white border border-gray-100 flex flex-col relative animate-in";
    this.el.innerHTML = FlowRunnerInnerHTML;

    ContentHelper.mountPanel(this.el);
    ContentHelper.makeDraggable(this.el, ".sr-header");
    ContentHelper.addCloseButton(this.el, () => this.destroy());

    this._attachEvents();
  }

  async _loadData() {
    chrome.storage.local.get(["flowConfigs", "scenarioTemplates"], (result) => {
      this.flowConfigs = result.flowConfigs || {};
      this.allScenarios = result.scenarioTemplates || {};

      const selectEl = this.el.querySelector("#flow-select");
      selectEl.innerHTML = '<option value="">-- Chọn Flow --</option>';

      Object.keys(this.flowConfigs).forEach(flowName => {
        const option = document.createElement('option');
        option.value = flowName;
        option.textContent = flowName;
        selectEl.appendChild(option);
      });
    });
  }

  _attachEvents() {
    const flowSelect = this.el.querySelector("#flow-select");
    flowSelect.addEventListener("change", (e) => this._onFlowSelected(e.target.value));

    this.el.querySelector("#flow-start-btn").onclick = () => this._startFlow();
    
    const pauseBtn = this.el.querySelector("#flow-pause-btn");
    const resumeBtn = this.el.querySelector("#flow-resume-btn");
    
    pauseBtn.onclick = () => {
      this.sequencer?.pause();
      pauseBtn.disabled = true;
      resumeBtn.disabled = false;
      this.el.querySelector("#flow-progress-status").textContent = "Đã tạm dừng";
    };
    
    resumeBtn.onclick = () => {
      this.sequencer?.resume();
      resumeBtn.disabled = true;
      pauseBtn.disabled = false;
      this.el.querySelector("#flow-progress-status").textContent = "Đang chạy...";
    };

    // Nút xử lý lỗi
    this.el.querySelector("#flow-retry-btn").onclick = () => {
      this._hideErrorControls();
      this.el.querySelector("#flow-progress-status").textContent = "Đang thử lại...";
      this.sequencer?.retry();
    };

    this.el.querySelector("#flow-skip-btn").onclick = () => {
      this._hideErrorControls();
      this.el.querySelector("#flow-progress-status").textContent = "Đã bỏ qua, tiếp tục...";
      this.sequencer?.skip();
    };
    
    // Lưu tạm các giá trị khi người dùng gõ
    this.el.querySelector("#flow-inputs").addEventListener("input", (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        const key = e.target.dataset.key;
        if (key) {
          this.userInputs[key] = e.target.value;
        }
      }
    });
  }

  _onFlowSelected(flowName) {
    this.userInputs = {}; // Reset overrides
    
    const stepSelect = this.el.querySelector("#flow-step-select");
    const inputsContainer = this.el.querySelector("#flow-inputs");
    
    if (!flowName || !this.flowConfigs[flowName]) {
      stepSelect.innerHTML = '<option value="0">Vui lòng chọn Flow...</option>';
      stepSelect.disabled = true;
      inputsContainer.innerHTML = '<div class="text-xs text-gray-500 italic text-center">Các biến cấu hình sẽ hiển thị ở đây.</div>';
      return;
    }

    const flowData = this.flowConfigs[flowName];
    const steps = flowData.steps || [];

    // Tạo danh sách các bước
    stepSelect.innerHTML = steps.map((s, idx) => {
      return `<option value="${idx}">Bước ${idx + 1}: ${s.scenarioName}</option>`;
    }).join("");
    stepSelect.disabled = steps.length === 0;

    // Render toàn bộ các biến cấu hình từ tất cả các step
    inputsContainer.innerHTML = "";
    const renderedVars = new Set();

    steps.forEach((step, stepIdx) => {
      const scName = step.scenarioName;
      if (!this.allScenarios[scName]) return;
      
      const raw = this.allScenarios[scName];
      const q = Array.isArray(raw) ? raw[0] : (raw.questions || [])[0];
      if (!q) return;

      const matches = [...q.text.matchAll(/\$\{([^}|]+)(?:\|([^}]+))?\}/g)];
      
      matches.forEach(match => {
        const varName = match[1];
        const optionsStr = match[2];
        
        // Tạo unique key cho biến của bước này để tránh trùng lặp giữa các bước nếu cùng tên biến
        // Nhưng nếu người dùng muốn override chung thì sao? 
        // Trong spec: "Các flow là độc lập nhau", mỗi step có thể có default value riêng. 
        // Ta sẽ cho phép override dựa trên: stepIndex_varName
        const uniqueKey = `step${stepIdx}_${varName}`;

        if (renderedVars.has(uniqueKey)) return;
        renderedVars.add(uniqueKey);

        const defaultValue = step.defaultValues?.[varName] || '';
        
        // Khởi tạo giá trị ban đầu vào userInputs
        this.userInputs[uniqueKey] = defaultValue;

        const wrapper = document.createElement("div");
        wrapper.className = "flex flex-col gap-1";
        
        const label = document.createElement("label");
        label.className = "text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1";
        label.textContent = `[Bước ${stepIdx + 1}] ${varName}`;

        let inputEl;
        const baseClasses = "w-full px-2 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:border-indigo-500 transition-all outline-none";

        if (optionsStr) {
          inputEl = document.createElement("select");
          inputEl.className = `${baseClasses} h-8 font-bold text-indigo-700 cursor-pointer`;
          const options = optionsStr.split(',').map(v => v.trim()).filter(Boolean);
          options.forEach(opt => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt;
            if (opt === defaultValue) option.selected = true;
            inputEl.appendChild(option);
          });
        } else {
          inputEl = document.createElement("textarea");
          inputEl.className = `${baseClasses} min-h-[40px] resize-y`;
          inputEl.value = defaultValue;
          inputEl.placeholder = "Nhập giá trị override...";
        }

        inputEl.dataset.key = uniqueKey;
        
        wrapper.appendChild(label);
        wrapper.appendChild(inputEl);
        inputsContainer.appendChild(wrapper);
      });
    });

    if (renderedVars.size === 0) {
      inputsContainer.innerHTML = '<div class="text-xs text-gray-500 italic text-center">Flow này không chứa biến nào cần cấu hình.</div>';
    }
  }

  _startFlow() {
    const flowName = this.el.querySelector("#flow-select").value;
    if (!flowName || !this.flowConfigs[flowName]) {
      ContentHelper.showToast("Vui lòng chọn Flow!", "warning");
      return;
    }

    const startStepIdx = parseInt(this.el.querySelector("#flow-step-select").value || "0", 10);
    const flowData = this.flowConfigs[flowName];
    const steps = flowData.steps || [];

    // Expand tất cả các prompt từ các bước
    const flatPrompts = [];
    
    // Duyệt từ bước được chọn trở đi
    for (let i = startStepIdx; i < steps.length; i++) {
      const step = steps[i];
      const scName = step.scenarioName;
      if (!this.allScenarios[scName]) continue;
      
      const raw = this.allScenarios[scName];
      const q = Array.isArray(raw) ? raw[0] : (raw.questions || [])[0];
      if (!q) continue;

      // Chuẩn bị dictionary các giá trị cho bước này
      const stepValues = {};
      
      // Tìm các biến cần thiết cho câu hỏi này
      const matches = [...q.text.matchAll(/\$\{([^}|]+)(?:\|([^}]+))?\}/g)];
      matches.forEach(m => {
        const varName = m[1];
        const uniqueKey = `step${i}_${varName}`;
        stepValues[varName] = this.userInputs[uniqueKey] || "";
      });

      // Sử dụng logic expand tương tự ScenarioRunner để hỗ trợ Text, Variable, Loop, List
      const expanded = this._expandQuestion(q, stepValues, i);
      flatPrompts.push(...expanded);
    }

    if (flatPrompts.length === 0) {
      ContentHelper.showToast("Không có câu hỏi (prompt) nào để chạy.", "warning");
      return;
    }

    // Vô hiệu hóa nút cấu hình
    this.el.querySelector("#flow-start-btn").disabled = true;
    this.el.querySelector("#flow-pause-btn").disabled = false;
    this.el.querySelector("#flow-resume-btn").disabled = true;
    this.el.querySelector("#flow-select").disabled = true;
    this.el.querySelector("#flow-step-select").disabled = true;
    
    this._showProgress(true);

    this.sequencer = new FlowSequencer(
      flatPrompts,
      this._sendPrompt.bind(this),
      this._waitForResponse.bind(this),
      (idx, total, status) => this._onProgress(idx, total, status),
      (idx, err) => this._onError(idx, err)
    );

    this.sequencer.start(() => {
      this._resetUI();
      ContentHelper.showToast("🎉 Flow đã chạy xong!", "success");
    });
  }

  _expandQuestion(q, values, stepIndex) {
    const result = [];
    
    // Lấy loopKey nếu có
    const loopKey = q.loopKey || (q.text.match(/\$\{(\w+)\}/) || [])[1];

    if (q.type === "text") {
      result.push({ text: q.text, label: `[Step ${stepIndex + 1}] Text` });
    } else if (q.type === "variable" || !q.type) { // Default to variable
      const filled = q.text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => values[k] || "");
      result.push({ text: filled, label: `[Step ${stepIndex + 1}]` });
    } else if (q.type === "loop") {
      const count = parseInt(values[loopKey] || "0", 10);
      for (let i = 1; i <= count; i++) {
        const prompt = q.text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => {
          if (k === loopKey) return String(i);
          return values[k] || "";
        });
        result.push({ text: prompt, label: `[Step ${stepIndex + 1}] Lần ${i}` });
      }
    } else if (q.type === "list") {
      const listValues = (values[loopKey] || "").split(',').map(v => v.trim()).filter(Boolean);
      for (const itemValue of listValues) {
        const prompt = q.text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => {
          if (k === loopKey) return itemValue;
          return values[k] || "";
        });
        result.push({ text: prompt, label: `[Step ${stepIndex + 1}] ${itemValue}` });
      }
    }
    return result;
  }

  _onProgress(idx, total, status) {
    const bar = this.el.querySelector("#flow-progress-bar");
    const textStep = this.el.querySelector("#flow-progress-step");
    const textTotal = this.el.querySelector("#flow-progress-total");
    const statusEl = this.el.querySelector("#flow-progress-status");
    const detailsEl = this.el.querySelector("#flow-step-details");

    textStep.textContent = idx;
    textTotal.textContent = total;

    const percent = total > 0 ? Math.round((idx / total) * 100) : 0;
    bar.style.width = `${percent}%`;

    if (this.sequencer && this.sequencer.steps[idx]) {
      detailsEl.textContent = this.sequencer.steps[idx].label || "";
    }

    switch (status) {
      case 'running':
        statusEl.textContent = "Đang xử lý...";
        statusEl.className = "text-xs font-black text-indigo-600";
        bar.className = "h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out";
        break;
      case 'success':
        statusEl.textContent = "Thành công!";
        statusEl.className = "text-xs font-black text-green-600";
        bar.className = "h-full bg-green-500 rounded-full transition-all duration-500 ease-out";
        break;
      case 'error':
        statusEl.textContent = "Lỗi!";
        statusEl.className = "text-xs font-black text-red-600";
        bar.className = "h-full bg-red-500 rounded-full transition-all duration-500 ease-out";
        break;
      case 'skipped':
        statusEl.textContent = "Đã bỏ qua";
        statusEl.className = "text-xs font-black text-gray-500";
        break;
      case 'done':
        statusEl.textContent = "Hoàn thành";
        statusEl.className = "text-xs font-black text-green-600";
        bar.style.width = "100%";
        break;
    }
  }

  _onError(idx, err) {
    ContentHelper.showToast(`Lỗi tại bước ${idx}: ${err.message}`, "error");
    // Hiện nút Retry/Skip
    this.el.querySelector("#flow-error-controls").classList.remove("hidden");
    this.el.querySelector("#flow-pause-btn").disabled = true;
    this.el.querySelector("#flow-resume-btn").disabled = true;
  }

  _hideErrorControls() {
    this.el.querySelector("#flow-error-controls").classList.add("hidden");
    this.el.querySelector("#flow-pause-btn").disabled = false;
  }

  _showProgress(show) {
    const box = this.el.querySelector("#flow-progress-box");
    if (show) box.classList.remove('hidden');
    else box.classList.add('hidden');
  }

  _resetUI() {
    this.el.querySelector("#flow-start-btn").disabled = false;
    this.el.querySelector("#flow-pause-btn").disabled = true;
    this.el.querySelector("#flow-resume-btn").disabled = true;
    this.el.querySelector("#flow-select").disabled = false;
    this.el.querySelector("#flow-step-select").disabled = false;
  }

  // --- Logic gửi prompt & chờ phản hồi (Tái sử dụng từ ScenarioRunner) ---
  
  async _sendPrompt(promptText) {
    const chat = window.ChatAdapter;
    const textarea = chat.getTextarea();
    if (!textarea) throw new Error("Không tìm thấy ô nhập liệu");
    
    if (textarea.tagName === 'TEXTAREA') {
      textarea.value = promptText;
    } else {
      textarea.innerHTML = '';
      textarea.appendChild(Object.assign(document.createElement('p'), { textContent: promptText }));
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    
    const sendBtn = await this._waitForAdapterBtn(() => chat.getSendBtn());
    if (sendBtn) {
      sendBtn.click();
    } else {
      throw new Error("Không tìm thấy nút gửi");
    }
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

  _isBusy() {
    return !!this.sequencer && !this.sequencer.stopped;
  }

  destroy() {
    this.el?.remove();
    this.onClose();
    this.sequencer?.stop();
  }
};
