// --- STAGE: ScenarioRunner.js (CLEANED & COMPACT) ---

window.ScenarioRunner = class extends window.BasePanel {
  constructor(onClose) {
    if (!window.ChatAdapter) {
      ContentHelper.showToast("Không tìm thấy ChatAdapter phù hợp cho trang hiện tại. Scenario Runner sẽ bị vô hiệu.", "error");
      throw new Error("ChatAdapter not available");
    }

    super({
      id: "scenario-runner",
      title: "Trình chạy Kịch bản",
      icon: "▶",
      onClose: onClose,
      view: window.ScenarioRunnerView
    });

    console.log("▶️ [ScenarioRunner] init");
    this.sequencer = null;
    this.templates = {};
    this.queue = [];
    this.selectedScenarioName = null;
    this._onDocClick = null;

    // Tải kịch bản và thiết lập giao diện tìm kiếm mới
    this._setupScenarioSearch();

    // Gắn sự kiện cho các nút điều khiển
    this._attachControlEvents();

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
          ContentHelper.showToast('Đã bỏ qua và xóa phiên song song bị gián đoạn.', 'info');
        });
      };
    });
  }

  /**
   * Chọn kịch bản và cập nhật toàn bộ trạng thái giao diện
   * @param {string} name - Tên kịch bản trong template store
   * @param {string} [displayText] - Chuỗi hiển thị trên ô tìm kiếm
   */
  _selectScenario(name, displayText) {
    const searchBox = this.el.querySelector("#sr-scenario-search");
    const dropdown = this.el.querySelector("#sr-scenario-dropdown");
    this.selectedScenarioName = name;
    if (searchBox) {
      searchBox.value = displayText || name;
      searchBox.dataset.selectedName = name;
      searchBox.blur();
    }
    if (dropdown) {
      dropdown.classList.add("hidden-dropdown");
    }
    this._onScenarioSelected(name);
  }

  /**
   * Lấy thông tin kịch bản hiện tại đang được chọn (an toàn, không phụ thuộc textContent thô)
   * @returns {{ name: string, template: any } | null}
   */
  _getSelectedScenario() {
    const searchBox = this.el.querySelector("#sr-scenario-search");
    let name = this.selectedScenarioName || searchBox?.dataset?.selectedName;
    if (name && this.templates[name]) {
      return { name, template: this.templates[name] };
    }

    const text = (searchBox?.value || "").trim().toLowerCase();
    if (!text) return null;

    // Fallback: Tìm theo tên chính xác hoặc định dạng [Nhóm] Tên
    const foundKey = Object.keys(this.templates).find(k => {
      const raw = this.templates[k];
      const group = Array.isArray(raw) ? "" : (raw.group || "");
      const full = group ? `[${group}] ${k}` : k;
      return k.toLowerCase() === text || full.toLowerCase() === text;
    });

    if (foundKey) {
      this.selectedScenarioName = foundKey;
      if (searchBox) searchBox.dataset.selectedName = foundKey;
      return { name: foundKey, template: this.templates[foundKey] };
    }

    return null;
  }

  _setupScenarioSearch() {
    chrome.storage.local.get("scenarioTemplates", (items) => {
      this.templates = items.scenarioTemplates || {};
      const searchBox = this.el.querySelector("#sr-scenario-search");
      const dropdown = this.el.querySelector("#sr-scenario-dropdown");
      const browserWrapper = this.el.querySelector("#sr-scenario-browser");

      if (!searchBox || !dropdown || !browserWrapper) return;

      dropdown.innerHTML = "";

      // 1. Tạo các item trong danh sách thả xuống với class BEM đầy đủ
      Object.keys(this.templates).forEach((name) => {
        const raw = this.templates[name];
        const group = Array.isArray(raw) ? "" : (raw.group || "");

        const item = document.createElement("div");
        item.className = "scenario-dropdown-item custom-dropdown-item ts-item-row";

        if (group) {
          const groupTag = document.createElement("span");
          groupTag.className = "ts-group-tag";
          groupTag.textContent = group;
          item.appendChild(groupTag);
        }

        const titleSpan = document.createElement("span");
        titleSpan.className = "ts-item-row__text font-bold";
        titleSpan.textContent = name;
        item.appendChild(titleSpan);

        item.dataset.name = name;
        item.dataset.group = group.toLowerCase();

        // Sử dụng 'mousedown' để kích hoạt trước khi searchBox mất focus
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          const displayLabel = group ? `[${group}] ${name}` : name;
          this._selectScenario(name, displayLabel);
        });

        dropdown.appendChild(item);
      });

      // 2. Logic lọc danh sách khi người dùng gõ tìm kiếm (Fuzzy Search)
      searchBox.addEventListener("input", () => {
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
            emptyMsg.textContent = "Không tìm thấy kịch bản phù hợp";
            dropdown.appendChild(emptyMsg);
          }
        } else if (emptyMsg) {
          emptyMsg.remove();
        }
      });

      // Đảm bảo dropdown hiển thị dạng flex column để 'order' hoạt động mượt mà
      dropdown.style.display = "flex";
      dropdown.style.flexDirection = "column";

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

      searchBox.addEventListener("focus", showDropdown);
      searchBox.addEventListener("click", showDropdown);

      searchBox.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          dropdown.classList.add("hidden-dropdown");
        }
      });

      // Tự động đóng khi click ra ngoài (tương thích Shadow DOM với composedPath)
      this._onDocClick = (event) => {
        const path = event.composedPath ? event.composedPath() : [];
        if (!path.includes(browserWrapper)) {
          dropdown.classList.add('hidden-dropdown');
        }
      };
      document.addEventListener('click', this._onDocClick);
    });
  }

  _onScenarioSelected(name) {
    const raw = this.templates[name] || {};
    const list = Array.isArray(raw) ? raw : (raw.questions || []);
    console.log("📋 Đã chọn kịch bản:", name);

    const stepSelect = this.el.querySelector("#step-select");
    if (stepSelect) {
      stepSelect.innerHTML = list.map((q, idx) => {
        const preview = q.text?.slice(0, 40) || "";
        return `<option value="${idx}" title="${q.text}">#${idx + 1}: ${preview}...</option>`;
      }).join("");
      stepSelect.disabled = list.length === 0;
    }

    const inputPanel = this.el.querySelector("#scenario-inputs");
    if (!inputPanel) return;

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
        
        const headerDiv = document.createElement("div");
        headerDiv.className = "sr-input-group__header";

        const label = document.createElement("label");
        label.className = "sr-input-group__label";
        label.innerHTML = `<span class="sr-input-group__label-tag">$</span>{${varName}}`;
        headerDiv.appendChild(label);

        let inputEl;

        if (optionsStr) {
          inputEl = document.createElement("select");
          inputEl.className = "ts-select ts-w-full";
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
          inputEl.className = "ts-input ts-w-full font-bold";
          inputEl.placeholder = "Số lần lặp (vd: 3)";
        } else if (q.type === "list" && varName === loopKey) {
          inputEl = document.createElement("textarea");
          inputEl.className = "ts-textarea sr-textarea sr-textarea--mono ts-w-full";
          inputEl.placeholder = "Các giá trị cách nhau bằng dấu phẩy (vd: mục 1, mục 2, mục 3)...";
        } else {
          inputEl = document.createElement("textarea");
          inputEl.className = "ts-textarea sr-textarea ts-w-full";
          inputEl.placeholder = `Nhập nội dung cho \${${varName}}...`;
        }
        
        if (inputEl.tagName === 'TEXTAREA' || (inputEl.tagName === 'INPUT' && inputEl.type === 'text')) {
          const fileBtn = document.createElement('button');
          fileBtn.type = 'button';
          fileBtn.className = "ts-btn ts-btn--secondary sr-input-group__file-btn";
          fileBtn.innerHTML = "📄 Tải file";
          fileBtn.title = `Nạp dữ liệu từ file văn bản cho \${${varName}}`;
          fileBtn.onclick = () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = ".txt,.json,.srt,.csv,.md";
            fileInput.onchange = e => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (readEvent) => {
                inputEl.value = readEvent.target.result;
                inputEl.dispatchEvent(new Event("input", { bubbles: true }));
              };
              reader.readAsText(file);
            };
            fileInput.click();
          };
          headerDiv.appendChild(fileBtn);
        }

        inputEl.dataset.key = varName;
        inputEl.addEventListener("input", () => this._saveVariableValues(name));
        wrapper.appendChild(headerDiv);
        wrapper.appendChild(inputEl);
        inputPanel.appendChild(wrapper);
      });
    });

    // Nếu kịch bản không có biến nào, hiển thị thông báo hướng dẫn nhã nhặn
    if (shown.size === 0) {
      inputPanel.innerHTML = `
        <div class="sr-empty-state">
          <span class="sr-empty-state__icon">✓</span>
          <div class="sr-empty-state__text">Kịch bản này không yêu cầu biến đầu vào.<br/>Bấm <b>▶ Tuần tự</b> hoặc <b>⚡ Song song</b> để thực thi ngay.</div>
        </div>
      `;
    }

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
      btnClearInputs.onclick = () => {
        ContentHelper.playMechanicalClick();
        this._clearVariableInputs();
      };
    }

    btnStart.onclick = () => {
      ContentHelper.playMechanicalClick();
      this._start();
    };
    btnParallel.onclick = (e) => {
      // Không trigger khi click vào input số tab
      if (e.target.id === 'sr-parallel-tabs') return;
      ContentHelper.playMechanicalClick();
      this._startParallel();
    };
    if (btnParallelStop) {
      btnParallelStop.onclick = () => {
        ContentHelper.playMechanicalClick();
        this._stopParallelSession();
      };
    }
    btnSplitTabs.onclick = (e) => {
      if (e.target.id === 'sr-split-tabs-count') return;
      ContentHelper.playMechanicalClick();
      this._startSplitTabs();
    };
    if (btnSplitTabsStop) {
      btnSplitTabsStop.onclick = () => {
        ContentHelper.playMechanicalClick();
        this._stopSplitTabsSession();
      };
    }
    btnPause.onclick = () => {
      ContentHelper.playMechanicalClick();
      this.sequencer?.pause();
      btnPause.disabled = true;
      btnResume.disabled = false;
    };
    btnResume.onclick = () => {
      ContentHelper.playMechanicalClick();
      this.sequencer?.resume();
      btnResume.disabled = true;
      btnPause.disabled = false;
    };
    btnAdd.onclick = () => {
      ContentHelper.playMechanicalClick();
      const selected = this._getSelectedScenario();

      if (!selected) {
        ContentHelper.showToast("Vui lòng chọn một kịch bản hợp lệ từ danh sách!", "warning");
        return;
      }
      const name = selected.name;
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
      const selected = this._getSelectedScenario();
      if (!selected) {
        ContentHelper.showToast("Vui lòng chọn một kịch bản!", "warning");
        return;
      }

      const name = selected.name;
      const startAt = parseInt(this.el.querySelector("#step-select").value || "0", 10);
      const values = this._readVariableValues();
      this.queue.push({ name, startAt, values });
    }

    this.el.querySelector("#sr-start").disabled = true;
    this.el.querySelector("#sr-addqueue").disabled = true;
    this.el.querySelector("#sr-parallel").disabled = true;
    this.el.querySelector("#sr-pause").disabled = false;
    this.el.querySelector("#sr-resume").disabled = true;
    this.el.querySelector("#sr-pause-resume-bar")?.classList.remove("hidden");

    const bigList = [];
    for (const job of this.queue) {
      const raw = this.templates[job.name];
      if (!raw) continue;
      const tplArr = Array.isArray(raw) ? raw : (raw.questions || []);
      const slice = tplArr.slice(job.startAt);
      const prompts = this._expandScenario(slice, job.values);
      bigList.push(...prompts);
    }

    console.log(`🚀 [ScenarioRunner] Bắt đầu chạy kịch bản. Tổng số prompts: ${bigList.length}`, bigList);

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
    this.sequencer.start(() => {
      this._resetControls();
      ContentHelper.playDoneThump();
      ContentHelper.showToast("🎉 Đã hoàn thành toàn bộ kịch bản!", "success");
    });
    
    if (this._minimizeCtrl) {
      this._minimizeCtrl.minimize();
    }
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
    this.el.querySelector("#sr-pause-resume-bar")?.classList.add("hidden");
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
    span.className = "ts-badge ts-badge--accent ts-tabular";
    span.textContent = label;
    list.appendChild(span);
    list.scrollTop = list.scrollHeight;
  }

  _expandScenario(questions, values) {
    const result = [];
    for (const q of questions) {
      if (!q) continue;
      const text = typeof q === 'string' ? q : (q.text || '');
      const type = q.type || 'text';

      if (type === "loop") {
        const loopKey = this._getLoopKey(q);
        const count = parseInt(values[loopKey] || "0", 10);
        for (let i = 1; i <= count; i++) {
          const prompt = text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => {
            if (k === loopKey) return String(i);
            return values[k] || "";
          });
          result.push({ text: prompt, label: `Lần ${i}` });
        }
      } else if (type === "list") {
        const loopKey = this._getLoopKey(q);
        const listValues = (values[loopKey] || "").split(',').map(v => v.trim()).filter(Boolean);
        for (const itemValue of listValues) {
          const prompt = text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => {
            if (k === loopKey) return itemValue;
            return values[k] || "";
          });
          result.push({ text: prompt, label: itemValue });
        }
      } else {
        // Áp dụng cho "text", "variable" và bất kỳ type nào khác (fallback an toàn tránh drop câu hỏi)
        const filled = text.replace(/\$\{([^}|]+)(?:\|[^}]*)?\}/g, (_, k) => values[k] || "");
        result.push({ text: filled, label: null });
      }
    }
    return result;
  }

  async _sendPrompt(prompt) {
    // Khoảng đệm 600ms để trang AI (ChatGPT/Gemini/Google AI Studio) hoàn tất reset DOM sau câu trả lời trước
    await new Promise(r => setTimeout(r, 600));

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
    if (!sendBtn) {
      console.error("❌ [ScenarioRunner] Không tìm thấy nút gửi trên trang AI!");
      throw new Error("Không tìm thấy nút gửi (Send button)");
    }
    sendBtn.click();
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
    const queueBox = this.el.querySelector(".sr-queue-box");
    if (queueBox) {
      if (this.queue.length > 0) {
        queueBox.classList.remove("hidden");
      } else {
        queueBox.classList.add("hidden");
      }
    }
    const listEl = this.el.querySelector("#sr-queue-list");
    listEl.innerHTML = this.queue.map((job, i) => {
      const fullVars = Object.entries(job.values).map(([k, v]) => `${k}=${v}`).join(', ');
      const shortenedVars = this._shortenText(fullVars);
      return `
        <li class="ts-item-row">
          <div class="ts-flex-1 min-w-0 pr-2">
             <div class="ts-flex ts-items-center ts-gap-1 mb-0.5">
                <span class="ts-item-row__idx">#${i + 1}</span>
                <span class="ts-item-row__text font-bold">${job.name}</span>
             </div>
             <div class="ts-hint ts-truncate" title="${fullVars}">${shortenedVars}</div>
          </div>
          <button class="sr-queue-copy ts-item-row__btn" data-idx="${i}">
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
    const selected = this._getSelectedScenario();

    if (!selected) {
      ContentHelper.showToast("Vui lòng chọn một kịch bản!", "warning");
      return;
    }

    const name = selected.name;
    const raw = selected.template;
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
        ContentHelper.playDoneThump();

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

  // ═══════════════════════════════════════════════════════════════
  // Split Tabs – Chia đều items vào N tab
  // ═══════════════════════════════════════════════════════════════

  /**
   * Bắt đầu chia tab: phân chia list items đều vào N tab,
   * mỗi tab chạy nhiều items tuần tự.
   */
  _startSplitTabs() {
    // 1. Lấy scenario đang chọn
    const selected = this._getSelectedScenario();

    if (!selected) {
      ContentHelper.showToast("Vui lòng chọn một kịch bản!", "warning");
      return;
    }

    const name = selected.name;
    const raw = selected.template;
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
          ContentHelper.playDoneThump();

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

  _isBusy() {
    return (!!this.sequencer && !this.sequencer.stopped) || this._parallelRunning || this._splitTabsRunning;
  }

  destroy() {
    if (this._onDocClick) {
      document.removeEventListener('click', this._onDocClick);
      this._onDocClick = null;
    }
    this.sequencer?.stop();
    this._stopParallelPolling();
    this._stopSplitTabsPolling();

    if (this._parallelRunning) {
      this._stopParallelSession();
    } else if (this._parallelSessionId) {
      chrome.runtime.sendMessage({
        type: 'PARALLEL_CLEANUP_SESSION',
        sessionId: this._parallelSessionId
      });
    }

    if (this._splitTabsRunning) {
      this._stopSplitTabsSession();
    } else if (this._splitTabsSessionId) {
      chrome.runtime.sendMessage({
        type: 'SPLIT_TABS_CLEANUP_SESSION',
        sessionId: this._splitTabsSessionId
      });
    }

    super.destroy();
  }
};