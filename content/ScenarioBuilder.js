window.ScenarioBuilder = class {
  constructor(onClose) {
    console.log("📦 [ScenarioBuilder] init");
    this.onClose = onClose;
    this._render();
    this._loadScenarioList();
  }

  _render() {
    console.log("🎨 [ScenarioBuilder] render UI");
    this.el = document.createElement("div");
    this.el.id = "scenario-builder";
    this.el.className = "panel-box ts-panel w-[420px] p-4 rounded-xl shadow-2xl bg-white border border-gray-100 flex flex-col relative animate-in";
    this.el.style.maxHeight = "640px";
    this.el.innerHTML = window.ScenarioBuilderView?.render?.() || "";

    ContentHelper.mountPanel(this.el);
    ContentHelper.makeDraggable(this.el, ".sb-title");
    ContentHelper.addCloseButton(this.el, () => this.destroy());

    this.el.querySelector("#add-question").addEventListener("click", () => this._addQuestion());
    this.el.querySelector("#save-to-storage").addEventListener("click", () => this._save());
    this.el.querySelector("#delete-scenario").addEventListener("click", () => this._deleteScenario());
    this.el.querySelector("#new-scenario-btn").addEventListener("click", () => {
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
      dropdown.style.setProperty('display', 'flex', 'important');

      const items = Array.from(dropdown.querySelectorAll(".scenario-dropdown-item"));

      const scoredItems = items.map(div => {
        const text = div.querySelector('.scenario-title')?.textContent || div.textContent;
        const score = ContentHelper.fuzzySearch(k, text);
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

    searchBox.addEventListener("focus", () => {
      dropdown.classList.remove("hidden-dropdown");
      dropdown.style.display = 'flex'; // Ensure it's visible on focus
    });

    document.addEventListener('click', (event) => {
      if (!browserWrapper.contains(event.target)) {
        dropdown.classList.add('hidden-dropdown');
        dropdown.style.removeProperty('display');
      }
    });
  }

  _addQuestion(q = { text: "", type: "text" }) {
    const container = document.createElement("div");
    container.className = "question-item bg-white p-2 rounded-lg border border-gray-100 shadow-sm mb-2 group hover:border-indigo-200 transition-all";

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Câu hỏi... (VD: ${topic|AI,Tech} hoặc ${name})";
    textarea.className = "question-input w-full min-h-[50px] p-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all resize-y mb-2 font-sans leading-snug text-indigo-900 font-medium";
    textarea.value = q.text || "";

    const actionWrap = document.createElement("div");
    actionWrap.className = "flex items-center gap-2";

    const select = document.createElement("select");
    select.className = "question-type h-6 px-1.5 text-[10px] font-bold uppercase bg-white border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-indigo-600 cursor-pointer transition-all";

    ["text", "variable", "loop", "list"].forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t.toUpperCase();
      if (q.type === t) opt.selected = true;
      select.appendChild(opt);
    });

    const loopKeyInput = document.createElement("input");
    loopKeyInput.className = "question-loopkey h-6 px-2 flex-1 text-[10px] border border-gray-100 rounded-md bg-white outline-none focus:border-indigo-500 font-mono text-indigo-600";
    loopKeyInput.placeholder = "Loop key (e.g. users)";
    loopKeyInput.classList.toggle("hidden", !(q.type === "loop" || q.type === "list"));
    loopKeyInput.value = q.loopKey || "";

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.className = "w-6 h-6 flex items-center justify-center text-[10px] bg-rose-50 text-rose-500 rounded-md hover:bg-rose-100 transition-all opacity-0 group-hover:opacity-100";
    deleteBtn.onclick = () => {
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
        item.className = "scenario-dropdown-item px-3 py-2 hover:bg-gray-50 cursor-pointer transition-all border-b border-gray-50 last:border-0 flex items-center justify-between group";

        const titleSpan = document.createElement("span");
        titleSpan.className = "scenario-title text-[11px] text-gray-700 font-medium group-hover:text-indigo-600";
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

  destroy() {
    this.el?.remove();
    this.onClose?.();
  }
};
