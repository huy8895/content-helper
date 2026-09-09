/**
 * FlowRunnerPanel.js
 * Giao diện thực thi Kịch bản liên hoàn (Flow) trên các trang chat AI.
 * Khởi tạo FlowSequencer để điều khiển quá trình chạy (chạy, tạm dừng, thử lại, bỏ qua).
 */

window.FlowRunnerPanel = class extends window.BasePanel {
  constructor(onClose) {
    if (!window.ChatAdapter) {
      ContentHelper.showToast("Không tìm thấy ChatAdapter phù hợp. Flow Runner sẽ bị vô hiệu.", "error");
      throw new Error("ChatAdapter not available");
    }

    super({
      id: "flow-runner-panel",
      title: "Trình chạy Luồng",
      icon: "🔀",
      onClose: onClose,
      view: window.FlowRunnerView
    });

    console.log("▶️ [FlowRunnerPanel] init");
    this.sequencer = null;
    this.flowConfigs = {};
    this.allScenarios = {};
    
    // Lưu các biến override của người dùng nhập trên UI
    this.userInputs = {}; 
    
    this._attachEvents();
    this._loadData();
  }

  /**
   * Trả về thông tin badge cho bong bóng (bubble) dựa trên trạng thái sequencer.
   * FlowSequencer sử dụng: .currentIndex, .isPaused, .stopped, .steps
   * @returns {{ text: string, status: string }}
   */
  _getBubbleBadgeInfo() {
    if (!this.sequencer || this.sequencer.stopped) {
      return { text: '−', status: 'idle' };
    }
    const idx = this.sequencer.currentIndex || 0;
    const total = this.sequencer.steps?.length || 0;
    if (this.sequencer.isPaused) {
      return { text: `${idx}/${total}`, status: 'paused' };
    }
    // Đang chạy
    return { text: `${idx}/${total}`, status: 'running' };
  }

  async _loadData() {
    chrome.storage.local.get(["flowConfigs", "scenarioTemplates", "flowRunnerCache", "flowRunnerLastFlow"], (result) => {
      this.flowConfigs = result.flowConfigs || {};
      this.allScenarios = result.scenarioTemplates || {};
      this.cachedInputs = result.flowRunnerCache || {};

      const selectEl = this.el.querySelector("#flow-select");
      const dropdown = this.el.querySelector("#flow-dropdown");
      if (selectEl) selectEl.innerHTML = '<option value="">-- Chọn Flow --</option>';
      if (dropdown) dropdown.innerHTML = '';

      Object.keys(this.flowConfigs).forEach(flowName => {
        if (selectEl) {
          const option = document.createElement('option');
          option.value = flowName;
          option.textContent = flowName;
          selectEl.appendChild(option);
        }

        if (dropdown) {
          const item = document.createElement("div");
          item.className = "scenario-dropdown-item custom-dropdown-item ts-item-row";

          const groupTag = document.createElement("span");
          groupTag.className = "ts-group-tag";
          groupTag.textContent = "FLOW";
          item.appendChild(groupTag);

          const titleSpan = document.createElement("span");
          titleSpan.className = "ts-item-row__text font-bold";
          titleSpan.textContent = flowName;
          item.appendChild(titleSpan);

          item.dataset.name = flowName;

          item.addEventListener("mousedown", (e) => {
            e.preventDefault();
            this._selectFlow(flowName, flowName);
          });

          dropdown.appendChild(item);
        }
      });
      
      this._setupFlowSearch();

      const lastFlow = result.flowRunnerLastFlow;
      if (lastFlow && this.flowConfigs[lastFlow]) {
        this._selectFlow(lastFlow, lastFlow);
      }
    });
  }

  _selectFlow(name, displayText) {
    const searchBox = this.el.querySelector("#flow-search");
    const dropdown = this.el.querySelector("#flow-dropdown");
    const selectEl = this.el.querySelector("#flow-select");

    if (searchBox) {
      searchBox.value = displayText || name;
      searchBox.dataset.selectedName = name;
      searchBox.blur();
    }
    if (selectEl) {
      selectEl.value = name;
    }
    if (dropdown) {
      dropdown.classList.add("hidden-dropdown");
    }

    chrome.storage.local.set({ flowRunnerLastFlow: name });
    this._onFlowSelected(name);
  }

  _setupFlowSearch() {
    const searchBox = this.el.querySelector("#flow-search");
    const dropdown = this.el.querySelector("#flow-dropdown");
    const browserWrapper = this.el.querySelector("#flow-browser");

    if (!searchBox || !dropdown || !browserWrapper) return;

    dropdown.style.display = "flex";
    dropdown.style.flexDirection = "column";

    // Tìm kiếm fuzzy khi người dùng gõ
    searchBox.oninput = () => {
      dropdown.classList.remove("hidden-dropdown");
      const keyword = searchBox.value.trim();
      const items = Array.from(dropdown.querySelectorAll(".scenario-dropdown-item"));

      if (!keyword) {
        items.forEach(item => {
          item.style.removeProperty('display');
          item.style.removeProperty('order');
        });
        dropdown.querySelector(".ts-dropdown-empty")?.remove();
        return;
      }

      let matchCount = 0;
      items.forEach(item => {
        const score = ContentHelper.fuzzySearch(keyword, item.textContent);
        if (score > 0) {
          item.style.display = 'flex';
          item.style.order = -score;
          matchCount++;
        } else {
          item.style.display = 'none';
        }
      });

      let emptyMsg = dropdown.querySelector(".ts-dropdown-empty");
      if (matchCount === 0) {
        if (!emptyMsg) {
          emptyMsg = document.createElement("div");
          emptyMsg.className = "ts-dropdown-empty";
          emptyMsg.textContent = "Không tìm thấy Flow phù hợp";
          dropdown.appendChild(emptyMsg);
        }
      } else if (emptyMsg) {
        emptyMsg.remove();
      }
    };

    const showDropdown = () => {
      dropdown.classList.remove("hidden-dropdown");
      if (!searchBox.value.trim()) {
        dropdown.querySelectorAll(".scenario-dropdown-item").forEach(i => {
          i.style.removeProperty('display');
          i.style.removeProperty('order');
        });
        dropdown.querySelector(".ts-dropdown-empty")?.remove();
      }
    };

    searchBox.onfocus = showDropdown;
    searchBox.onclick = showDropdown;

    searchBox.onkeydown = (e) => {
      if (e.key === "Escape") {
        dropdown.classList.add("hidden-dropdown");
      }
    };

    // Đóng khi click ngoài
    if (this._onDocClick) {
      document.removeEventListener('click', this._onDocClick);
    }
    this._onDocClick = (event) => {
      const path = event.composedPath ? event.composedPath() : [];
      if (!path.includes(browserWrapper)) {
        dropdown.classList.add('hidden-dropdown');
      }
    };
    document.addEventListener('click', this._onDocClick);
  }

  _attachEvents() {
    const flowSelect = this.el.querySelector("#flow-select");
    if (flowSelect) {
      flowSelect.addEventListener("change", (e) => {
        this._selectFlow(e.target.value, e.target.value);
      });
    }

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
    
    // Lưu tạm các giá trị khi người dùng gõ & Cache
    this.el.querySelector("#flow-inputs").addEventListener("input", (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        const key = e.target.dataset.key;
        if (key) {
          this.userInputs[key] = e.target.value;
          if (this.currentFlowName) {
            this.cachedInputs = this.cachedInputs || {};
            this.cachedInputs[this.currentFlowName] = this.userInputs;
            chrome.storage.local.set({ flowRunnerCache: this.cachedInputs });
          }
        }
      }
    });
  }

  _onFlowSelected(flowName) {
    this.currentFlowName = flowName;
    this.userInputs = (this.cachedInputs && this.cachedInputs[flowName]) ? { ...this.cachedInputs[flowName] } : {};
    
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
        
        // Dùng giá trị đã cache nếu có, ngược lại dùng mặc định
        const finalValue = this.userInputs.hasOwnProperty(uniqueKey) ? this.userInputs[uniqueKey] : defaultValue;
        this.userInputs[uniqueKey] = finalValue;

        const wrapper = document.createElement("div");
        wrapper.className = "flex flex-col gap-1";
        
        const headerDiv = document.createElement("div");
        headerDiv.className = "flex justify-between items-center";

        const label = document.createElement("label");
        label.className = "text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1";
        label.textContent = `[Bước ${stepIdx + 1}] ${varName}`;
        headerDiv.appendChild(label);

        let inputEl;

        if (optionsStr) {
          inputEl = document.createElement("select");
          inputEl.className = "ts-select w-full";
          const options = optionsStr.split(',').map(v => v.trim()).filter(Boolean);
          options.forEach(opt => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt;
            if (opt === finalValue) option.selected = true;
            inputEl.appendChild(option);
          });
        } else {
          inputEl = document.createElement("textarea");
          inputEl.className = "ts-textarea w-full min-h-[40px]";
          inputEl.value = finalValue;
          inputEl.placeholder = "Nhập giá trị override...";
          
          const fileBtn = document.createElement('button');
          fileBtn.className = "ts-btn ts-btn--secondary text-[10px] py-0.5 px-2";
          fileBtn.textContent = "📂 Chọn file";
          fileBtn.onclick = () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = ".txt,.json,.srt,.csv,.md";
            fileInput.onchange = e => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (e) => {
                inputEl.value = e.target.result;
                inputEl.dispatchEvent(new Event("input", { bubbles: true }));
              };
              reader.readAsText(file);
            };
            fileInput.click();
          };
          headerDiv.appendChild(fileBtn);
        }

        inputEl.dataset.key = uniqueKey;
        
        wrapper.appendChild(headerDiv);
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
    const flowSearch = this.el.querySelector("#flow-search");
    if (flowSearch) flowSearch.disabled = true;
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
        statusEl.className = "text-xs font-black ts-text-accent";
        bar.className = "ts-progress__bar";
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
    const flowSearch = this.el.querySelector("#flow-search");
    if (flowSearch) flowSearch.disabled = false;
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
    if (this._onDocClick) {
      document.removeEventListener('click', this._onDocClick);
    }
    this.sequencer?.stop();
    super.destroy();
  }
};
