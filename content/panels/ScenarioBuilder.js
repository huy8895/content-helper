window.ScenarioBuilder = class extends window.BasePanel {
  constructor(onClose) {
    super({
      id: "scenario-builder",
      title: "Quản lý Kịch bản",
      icon: window.CHIcons ? window.CHIcons.fileText({ size: 20 }) : "📝",
      onClose: onClose,
      view: window.ScenarioBuilderView
    });
    console.log("📦 [ScenarioBuilder] init");
    this.currentMode = "create";
    this.currentEditingName = null;
    this._setupUI();
    this._loadScenarioList();
  }

  _setupUI() {
    this.el.querySelector("#add-question").addEventListener("click", () => {
      ContentHelper.playHapticFeedback?.(8);
      this._addQuestion();
    });

    // Chuyển sang chế độ tạo mới từ thanh chọn trên cùng
    this.el.querySelector("#btn-switch-create").addEventListener("click", () => {
      ContentHelper.playHapticFeedback?.(8);
      this._switchToCreateMode();
    });

    // Hủy sửa và quay về tạo mới
    this.el.querySelector("#btn-cancel-edit").addEventListener("click", () => {
      ContentHelper.playHapticFeedback?.(8);
      this._switchToCreateMode();
    });

    // Nút lưu kịch bản mới (Create Mode)
    this.el.querySelector("#btn-save-new").addEventListener("click", () => {
      ContentHelper.playHapticFeedback?.(8);
      this._saveNew();
    });

    // Nút xóa trắng form (Create Mode)
    this.el.querySelector("#btn-reset-form").addEventListener("click", () => {
      ContentHelper.playHapticFeedback?.(8);
      this._resetForm();
    });

    // Nút cập nhật thay đổi (Edit Mode)
    this.el.querySelector("#btn-save-update").addEventListener("click", () => {
      ContentHelper.playHapticFeedback?.(8);
      this._saveUpdate();
    });

    // Nút lưu bản sao (Edit Mode)
    this.el.querySelector("#btn-save-copy").addEventListener("click", () => {
      ContentHelper.playHapticFeedback?.(8);
      this._saveCopy();
    });

    // Nút xóa kịch bản (Edit Mode)
    this.el.querySelector("#delete-scenario").addEventListener("click", () => {
      ContentHelper.playHapticFeedback?.(8);
      this._deleteScenario();
    });

    this._setupSearchListeners();
    this._setMode("create");
  }

  _setupSearchListeners() {
    const searchBox = this.el.querySelector("#scenario-search");
    const dropdown = this.el.querySelector("#scenario-dropdown");
    const browserWrapper = this.el.querySelector("#scenario-browser");

    if (!searchBox || !dropdown || !browserWrapper) return;

    dropdown.style.display = "flex";
    dropdown.style.flexDirection = "column";

    // 1. Tìm kiếm mờ (Fuzzy Search) khi người dùng gõ
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
        if (!dropdown.classList.contains("hidden-dropdown")) {
          dropdown.classList.add("hidden-dropdown");
          e.stopPropagation();
        }
      }
    });

    // 2. Click outside dùng composedPath tương thích hoàn toàn Shadow DOM
    this._onDocClick = (event) => {
      const path = event.composedPath ? event.composedPath() : [];
      if (!path.includes(browserWrapper)) {
        dropdown.classList.add('hidden-dropdown');
      }
    };
    document.addEventListener('click', this._onDocClick);
  }

  _addQuestion(q = { text: "", type: "text" }) {
    const container = document.createElement("div");
    container.className = "question-item ts-question-card mb-2";

    // 1. Khung Code Editor với Syntax Highlighting kiểu IDE
    const editorWrap = document.createElement("div");
    editorWrap.className = "ts-code-editor";

    const backdrop = document.createElement("div");
    backdrop.className = "ts-code-editor__backdrop";
    backdrop.setAttribute("aria-hidden", "true");

    const highlightEl = document.createElement("div");
    highlightEl.className = "ts-code-editor__highlight";
    backdrop.appendChild(highlightEl);

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Câu hỏi... (VD: ${topic|AI,Tech} hoặc ${name})";
    textarea.className = "question-input ts-code-editor__textarea custom-scrollbar";
    textarea.spellcheck = false;
    textarea.value = q.text || "";

    const updateHighlight = () => {
      highlightEl.innerHTML = ContentHelper.highlightPromptSyntax(textarea.value);
    };
    updateHighlight();

    textarea.addEventListener("input", () => {
      updateHighlight();
      backdrop.scrollTop = textarea.scrollTop;
      backdrop.scrollLeft = textarea.scrollLeft;
      this._saveToStorageImmediately();
    });

    textarea.addEventListener("scroll", () => {
      backdrop.scrollTop = textarea.scrollTop;
      backdrop.scrollLeft = textarea.scrollLeft;
    });

    editorWrap.appendChild(backdrop);
    editorWrap.appendChild(textarea);

    // 2. Action Controls (Type selector, Loop key, Delete)
    const actionWrap = document.createElement("div");
    actionWrap.className = "ts-question-card__top";

    const select = document.createElement("select");
    select.className = "question-type ts-select";
    select.style.height = "26px";
    select.style.fontSize = "10px";
    select.style.fontWeight = "700";
    select.style.width = "auto";
    select.style.minWidth = "80px";

    ["text", "variable", "loop", "list"].forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t.toUpperCase();
      if (q.type === t) opt.selected = true;
      select.appendChild(opt);
    });

    const loopKeyInput = document.createElement("input");
    loopKeyInput.className = "question-loopkey ts-input";
    loopKeyInput.style.height = "26px";
    loopKeyInput.style.fontSize = "10.5px";
    loopKeyInput.style.fontFamily = "var(--ch-font-mono)";
    loopKeyInput.style.color = "var(--ch-accent)";
    loopKeyInput.style.flex = "1";
    loopKeyInput.placeholder = "Loop key (e.g. users)";
    loopKeyInput.classList.toggle("hidden", !(q.type === "loop" || q.type === "list"));
    loopKeyInput.value = q.loopKey || "";

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "✕";
    deleteBtn.className = "ts-question-card__del";
    deleteBtn.title = "Xóa câu hỏi này";
    deleteBtn.onclick = () => {
      ContentHelper.playHapticFeedback?.(8);
      container.remove();
      this._saveToStorageImmediately();
    };

    select.addEventListener("change", () => {
      const isLoop = select.value === "loop" || select.value === "list";
      loopKeyInput.classList.toggle("hidden", !isLoop);
      this._saveToStorageImmediately();
    });

    actionWrap.appendChild(select);
    actionWrap.appendChild(loopKeyInput);
    actionWrap.appendChild(deleteBtn);

    container.appendChild(editorWrap);
    container.appendChild(actionWrap);

    this.el.querySelector("#questions-container").appendChild(container);
    textarea.focus();
  }

  _collectDataFromDOM() {
    const name = this.el.querySelector("#scenario-name").value.trim();
    const group = this.el.querySelector("#scenario-group").value.trim();
    const items = this.el.querySelectorAll(".question-item, .ts-question-card");

    const questions = Array.from(items).map(div => ({
      text: div.querySelector(".question-input")?.value.trim() || "",
      type: div.querySelector(".question-type")?.value || "text",
      loopKey: div.querySelector(".question-loopkey")?.value.trim() || undefined
    })).filter(q => q.text);

    if (!name || !questions.length) return null;

    return { [name]: { group, questions } };
  }

  _selectScenario(name, displayText) {
    const searchBox = this.el.querySelector("#scenario-search");
    const dropdown = this.el.querySelector("#scenario-dropdown");
    if (searchBox) {
      searchBox.value = displayText || name;
      searchBox.dataset.selectedName = name;
      searchBox.blur();
    }
    if (dropdown) {
      dropdown.classList.add("hidden-dropdown");
    }

    const raw = this.allScenarios?.[name];
    if (!raw) return;
    const group = Array.isArray(raw) ? "" : (raw.group || "");
    const qs = Array.isArray(raw) ? raw : (raw.questions || []);

    this.el.querySelector("#scenario-name").value = name;
    this.el.querySelector("#scenario-group").value = group;
    const container = this.el.querySelector("#questions-container");
    container.innerHTML = "";
    qs.forEach((q) => this._addQuestion(q));

    // Kích hoạt chế độ Chỉnh sửa kịch bản đã chọn
    this._setMode("edit", name);
    ContentHelper.playMechanicalClick?.();
  }

  /**
   * Chuyển đổi trạng thái giao diện giữa "Tạo mới" (create) và "Chỉnh sửa" (edit)
   * @param {'create'|'edit'} mode 
   * @param {string|null} name Tên kịch bản nếu đang ở chế độ chỉnh sửa
   */
  _setMode(mode, name = null) {
    this.currentMode = mode;
    this.currentEditingName = name;

    const badge = this.el.querySelector("#scenario-mode-badge");
    const modeIcon = this.el.querySelector("#scenario-mode-icon");
    const modeText = this.el.querySelector("#scenario-mode-text");
    const cancelBtn = this.el.querySelector("#btn-cancel-edit");
    const footerCreate = this.el.querySelector("#footer-create-mode");
    const footerEdit = this.el.querySelector("#footer-edit-mode");

    if (mode === "edit" && name) {
      if (badge) {
        badge.className = "ts-badge ts-badge--accent";
      }
      if (modeIcon) {
        modeIcon.innerHTML = window.CHIcons ? window.CHIcons.fileText({ size: 11 }) : "✎";
      }
      if (modeText) {
        modeText.textContent = `Đang sửa: "${name}"`;
      }
      cancelBtn?.classList.remove("ts-hidden");
      footerCreate?.classList.add("ts-hidden");
      footerEdit?.classList.remove("ts-hidden");
    } else {
      // Chế độ Tạo mới
      if (badge) {
        badge.className = "ts-badge ts-badge--success";
      }
      if (modeIcon) {
        modeIcon.innerHTML = window.CHIcons ? window.CHIcons.plusCircle({ size: 11 }) : "●";
      }
      if (modeText) {
        modeText.textContent = "Đang tạo kịch bản mới";
      }
      cancelBtn?.classList.add("ts-hidden");
      footerCreate?.classList.remove("ts-hidden");
      footerEdit?.classList.add("ts-hidden");
    }
  }

  /**
   * Chuyển sang chế độ Tạo mới, làm sạch form và focus vào ô tên kịch bản
   */
  _switchToCreateMode() {
    this._resetForm();
    this._setMode("create");
    const nameInput = this.el.querySelector("#scenario-name");
    nameInput?.focus();
  }

  /**
   * Làm sạch form nhập liệu
   */
  _resetForm() {
    this.el.querySelector("#scenario-name").value = "";
    this.el.querySelector("#scenario-group").value = "";
    this.el.querySelector("#questions-container").innerHTML = "";
    const searchBox = this.el.querySelector("#scenario-search");
    if (searchBox) {
      searchBox.value = "";
      delete searchBox.dataset.selectedName;
    }
  }

  /**
   * Lưu kịch bản mới (Create Mode)
   */
  _saveNew() {
    const json = this._collectDataFromDOM();
    if (!json) {
      ContentHelper.showToast("Vui lòng nhập tên kịch bản và ít nhất một câu hỏi.", "warning");
      return;
    }
    const name = Object.keys(json)[0];
    const group = json[name]?.group || "";

    // Cảnh báo nếu trùng tên kịch bản đã có
    if (this.allScenarios && this.allScenarios[name]) {
      if (!confirm(`Kịch bản "${name}" đã tồn tại. Bạn có muốn ghi đè lên kịch bản này không?`)) {
        return;
      }
    }

    chrome.storage.local.get("scenarioTemplates", (items) => {
      const merged = { ...(items.scenarioTemplates || {}), ...json };
      chrome.storage.local.set({ scenarioTemplates: merged }, () => {
        ContentHelper.showToast(`Đã tạo kịch bản "${name}" thành công!`, "success");
        const searchBox = this.el.querySelector("#scenario-search");
        if (searchBox) {
          searchBox.value = group ? `[${group}] ${name}` : name;
          searchBox.dataset.selectedName = name;
        }
        this._setMode("edit", name);
        this._loadScenarioList();
        this._syncToFirestore();
      });
    });
  }

  /**
   * Cập nhật thay đổi vào kịch bản đang chọn (Edit Mode)
   */
  _saveUpdate() {
    const json = this._collectDataFromDOM();
    if (!json) {
      ContentHelper.showToast("Vui lòng nhập tên kịch bản và ít nhất một câu hỏi.", "warning");
      return;
    }
    const newName = Object.keys(json)[0];
    const oldName = this.currentEditingName;
    const group = json[newName]?.group || "";

    chrome.storage.local.get("scenarioTemplates", (items) => {
      const templates = { ...(items.scenarioTemplates || {}) };

      // Nếu người dùng đổi tên kịch bản trong lúc sửa: xóa key cũ
      if (oldName && oldName !== newName && templates[oldName]) {
        delete templates[oldName];
      }

      templates[newName] = json[newName];

      chrome.storage.local.set({ scenarioTemplates: templates }, () => {
        ContentHelper.showToast(`Đã cập nhật kịch bản "${newName}"!`, "success");
        const searchBox = this.el.querySelector("#scenario-search");
        if (searchBox) {
          searchBox.value = group ? `[${group}] ${newName}` : newName;
          searchBox.dataset.selectedName = newName;
        }
        this._setMode("edit", newName);
        this._loadScenarioList();
        this._syncToFirestore();
      });
    });
  }

  /**
   * Lưu bản sao (Duplicate / Clone) của kịch bản hiện tại mà không sửa đè bản gốc
   */
  _saveCopy() {
    const json = this._collectDataFromDOM();
    if (!json) {
      ContentHelper.showToast("Vui lòng nhập tên kịch bản và ít nhất một câu hỏi.", "warning");
      return;
    }
    const originalName = Object.keys(json)[0];
    const data = json[originalName];

    // Tự động sinh tên bản sao mới không bị trùng
    let copyName = originalName.includes("(Bản sao") ? originalName : `${originalName} (Bản sao)`;
    let counter = 2;
    while (this.allScenarios && this.allScenarios[copyName]) {
      copyName = `${originalName} (Bản sao ${counter})`;
      counter++;
    }

    // Cập nhật giá trị hiển thị trên ô input tên
    this.el.querySelector("#scenario-name").value = copyName;

    const copyJson = {
      [copyName]: { ...data }
    };

    chrome.storage.local.get("scenarioTemplates", (items) => {
      const merged = { ...(items.scenarioTemplates || {}), ...copyJson };
      chrome.storage.local.set({ scenarioTemplates: merged }, () => {
        ContentHelper.showToast(`Đã lưu bản sao "${copyName}" thành công!`, "success");
        const searchBox = this.el.querySelector("#scenario-search");
        const group = data.group || "";
        if (searchBox) {
          searchBox.value = group ? `[${group}] ${copyName}` : copyName;
          searchBox.dataset.selectedName = copyName;
        }
        this._setMode("edit", copyName);
        this._loadScenarioList();
        this._syncToFirestore();
      });
    });
  }

  _syncToFirestore() {
    chrome.storage.local.get(["scenarioTemplates", "google_user_email"], async (items) => {
      const allScenarios = items.scenarioTemplates || {};
      const userId = items.google_user_email;
      if (!userId) return;

      const helper = new FirestoreHelper(firebaseConfig);
      try {
        await helper.saveUserConfig(userId, allScenarios);
      } catch (err) {
        console.error(err);
      }
    });
  }

  _saveToStorageImmediately() {
    // Chỉ tự động lưu nhanh khi đang ở chế độ chỉnh sửa một kịch bản đã tồn tại
    if (this.currentMode !== "edit" || !this.currentEditingName) return;
    const json = this._collectDataFromDOM();
    if (!json) return;
    const name = Object.keys(json)[0];
    if (name !== this.currentEditingName) return; // Không tự động ghi đè nếu đang gõ đổi tên dở dang

    chrome.storage.local.get("scenarioTemplates", (items) => {
      const merged = { ...(items.scenarioTemplates || {}), ...json };
      chrome.storage.local.set({ scenarioTemplates: merged });
    });
  }

  _deleteScenario() {
    const name = this.currentEditingName || this.el.querySelector("#scenario-name").value.trim();
    if (!name) {
      ContentHelper.showToast("Vui lòng chọn kịch bản để xoá.", "warning");
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xoá kịch bản "${name}"?`)) return;

    chrome.storage.local.get("scenarioTemplates", (items) => {
      const templates = items.scenarioTemplates || {};
      if (!templates[name]) {
        ContentHelper.showToast("Không tìm thấy kịch bản.", "error");
        return;
      }
      delete templates[name];

      chrome.storage.local.set({ scenarioTemplates: templates }, () => {
        ContentHelper.showToast(`Đã xóa kịch bản "${name}".`, "info");
        this._switchToCreateMode();
        this._loadScenarioList();
        this._syncToFirestore();
      });
    });
  }

  _loadScenarioList() {
    chrome.storage.local.get("scenarioTemplates", (items) => {
      const templates = items.scenarioTemplates || {};
      this.allScenarios = templates;

      const dropdown = this.el.querySelector("#scenario-dropdown");
      if (!dropdown) return;
      dropdown.innerHTML = "";

      Object.keys(templates).forEach((name) => {
        const raw = templates[name];
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

        // Sử dụng mousedown để kích hoạt trước khi input mất focus
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          const displayLabel = group ? `[${group}] ${name}` : name;
          this._selectScenario(name, displayLabel);
        });

        dropdown.appendChild(item);
      });
    });
  }

  _isBusy() {
    const name = this.el?.querySelector("#scenario-name")?.value.trim();
    const count = this.el?.querySelectorAll(".question-item, .ts-question-card")?.length || 0;
    return !!(name || count > 0);
  }

  _getBubbleBadgeInfo() {
    const count = this.el?.querySelectorAll(".ts-question-card")?.length || 0;
    return {
      text: count > 0 ? `${count}` : '−',
      status: count > 0 ? 'running' : 'idle'
    };
  }

  destroy() {
    if (this._onDocClick) {
      document.removeEventListener('click', this._onDocClick);
      this._onDocClick = null;
    }
    super.destroy();
  }
};
