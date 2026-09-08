window.ScenarioBuilder = class extends window.BasePanel {
  constructor(onClose) {
    super({
      id: "scenario-builder",
      title: "Quản lý Kịch bản",
      icon: "≡",
      onClose: onClose,
      view: window.ScenarioBuilderView
    });
    console.log("📦 [ScenarioBuilder] init");
    this._setupUI();
    this._loadScenarioList();
  }

  _setupUI() {
    this.el.querySelector("#add-question").addEventListener("click", () => {
      ContentHelper.playHapticFeedback?.(8);
      this._addQuestion();
    });
    this.el.querySelector("#save-to-storage").addEventListener("click", () => {
      ContentHelper.playHapticFeedback?.(8);
      this._save();
    });
    this.el.querySelector("#delete-scenario").addEventListener("click", () => {
      ContentHelper.playHapticFeedback?.(8);
      this._deleteScenario();
    });
    this.el.querySelector("#new-scenario-btn").addEventListener("click", () => {
      ContentHelper.playHapticFeedback?.(8);
      this.el.querySelector("#scenario-name").value = "";
      this.el.querySelector("#questions-container").innerHTML = "";
      this.el.querySelector("#scenario-group").value = "";
    });

    this._setupSearchListeners();
  }

  _setupSearchListeners() {
    const searchBox = this.el.querySelector("#scenario-search");
    const dropdown = this.el.querySelector("#scenario-dropdown");
    const browserWrapper = this.el.querySelector("#scenario-browser");

    searchBox.addEventListener("input", () => {
      const k = searchBox.value.trim();
      dropdown.classList.remove("hidden-dropdown");
      dropdown.style.display = 'flex';

      const items = Array.from(dropdown.querySelectorAll(".scenario-dropdown-item"));

      const scoredItems = items.map(div => {
        const text = div.querySelector('.scenario-title')?.textContent || div.textContent;
        const score = ContentHelper.fuzzySearch(k, text);
        return { div, score };
      });

      scoredItems.forEach(item => {
        if (item.score > 0) {
          item.div.style.display = 'flex';
          item.div.style.order = -item.score;
        } else {
          item.div.style.display = 'none';
        }
      });
    });

    searchBox.addEventListener("focus", () => {
      dropdown.classList.remove("hidden-dropdown");
      dropdown.style.display = 'flex';
    });

    this._onDocClick = (event) => {
      if (!browserWrapper.contains(event.target)) {
        dropdown.classList.add('hidden-dropdown');
        dropdown.style.removeProperty('display');
      }
    };
    document.addEventListener('click', this._onDocClick);
  }

  _addQuestion(q = { text: "", type: "text" }) {
    const container = document.createElement("div");
    container.className = "ts-question-card mb-2";

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Câu hỏi... (VD: ${topic|AI,Tech} hoặc ${name})";
    textarea.className = "question-input ts-textarea ts-question-card__textarea";
    textarea.value = q.text || "";

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

    container.appendChild(textarea);
    container.appendChild(actionWrap);

    textarea.addEventListener("input", () => this._saveToStorageImmediately());
    select.addEventListener("change", () => this._saveToStorageImmediately());

    this.el.querySelector("#questions-container").appendChild(container);
    textarea.focus();
  }

  _collectDataFromDOM() {
    const name = this.el.querySelector("#scenario-name").value.trim();
    const group = this.el.querySelector("#scenario-group").value.trim();
    const items = this.el.querySelectorAll(".question-item");

    const questions = Array.from(items).map(div => ({
      text: div.querySelector(".question-input")?.value.trim() || "",
      type: div.querySelector(".question-type")?.value || "text",
      loopKey: div.querySelector(".question-loopkey")?.value.trim() || undefined
    })).filter(q => q.text);

    if (!name || !questions.length) return null;

    return { [name]: { group, questions } };
  }

  _save() {
    const json = this._collectDataFromDOM();
    if (!json) {
      ContentHelper.showToast("Vui lòng nhập tên kịch bản và ít nhất một câu hỏi.", "warning");
      return;
    }
    chrome.storage.local.get("scenarioTemplates", (items) => {
      const merged = { ...(items.scenarioTemplates || {}), ...json };
      chrome.storage.local.set({ scenarioTemplates: merged }, () => {
        ContentHelper.showToast("✅ Đã lưu kịch bản.", "success");
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
    const json = this._collectDataFromDOM();
    if (!json) return;
    chrome.storage.local.get("scenarioTemplates", (items) => {
      const merged = { ...(items.scenarioTemplates || {}), ...json };
      chrome.storage.local.set({ scenarioTemplates: merged });
    });
  }

  _deleteScenario() {
    const name = this.el.querySelector("#scenario-name").value.trim();
    if (!name) {
      ContentHelper.showToast("Vui lòng nhập tên kịch bản để xoá.", "warning");
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
        this.el.querySelector("#scenario-name").value = "";
        this.el.querySelector("#questions-container").innerHTML = "";
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
      dropdown.innerHTML = "";

      Object.keys(templates).forEach((name) => {
        const raw = templates[name];
        const group = Array.isArray(raw) ? "" : (raw.group || "");
        const qs = Array.isArray(raw) ? raw : raw.questions || [];

        const item = document.createElement("div");
        item.className = "scenario-dropdown-item custom-dropdown-item flex items-center justify-between";

        const titleSpan = document.createElement("span");
        titleSpan.className = "scenario-title text-[11px] font-medium";
        titleSpan.textContent = group ? `[${group}] ${name}` : name;

        item.appendChild(titleSpan);
        item.dataset.group = group.toLowerCase();

        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          this.el.querySelector("#scenario-name").value = name;
          this.el.querySelector("#scenario-group").value = group;
          const container = this.el.querySelector("#questions-container");
          container.innerHTML = "";
          qs.forEach((q) => this._addQuestion(q));
          dropdown.classList.add("hidden-dropdown");
          dropdown.style.removeProperty('display');
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
