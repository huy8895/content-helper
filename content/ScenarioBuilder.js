const ScenarioBuilderInnerHTML = `
  <div class="ts-title flex items-center mb-6 cursor-move select-none">
    <span class="text-2xl mr-3">🛠</span>
    <div>
      <h3 class="m-0 text-lg font-bold text-gray-900 leading-tight">Quản lý Kịch bản</h3>
      <div class="text-xs text-gray-500 mt-0.5 font-medium">Create and edit prompt templates</div>
    </div>
  </div>

  <div id="scenario-browser" class="mb-6 relative">
    <label class="text-[11px] font-bold text-gray-500 uppercase mb-2 block tracking-wider">📄 Danh sách kịch bản</label>
    <div class="relative">
      <input type="text" id="scenario-search" 
        class="w-full h-11 pl-10 pr-4 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
        placeholder="🔍 Tìm kịch bản nhanh...">
      <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
    </div>
    <div id="scenario-dropdown" class="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto hidden-dropdown custom-scrollbar p-1"></div>
  </div>

  <div id="scenario-editor" class="flex-1 overflow-hidden flex flex-col bg-gray-50 rounded-2xl border border-gray-100 p-4 mb-6">
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label for="scenario-name" class="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Tên kịch bản</label>
        <input type="text" id="scenario-name" 
          class="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:border-indigo-500 outline-none transition-all font-bold" 
          placeholder="Tên kịch bản">
      </div>
      <div>
        <label for="scenario-group" class="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Nhóm</label>
        <input type="text" id="scenario-group" 
          class="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:border-indigo-500 outline-none transition-all" 
          placeholder="podcast / video / blog">
      </div>
    </div>

    <div class="flex-1 overflow-y-auto mb-4 pr-1 custom-scrollbar" id="questions-container"></div>
    
    <button id="add-question" class="w-full h-10 border-2 border-dashed border-indigo-200 text-indigo-500 font-bold rounded-xl text-xs hover:bg-indigo-50 hover:border-indigo-300 transition-all active:scale-[0.98]">
      + Thêm câu hỏi mới
    </button>
  </div>

  <div id="scenario-buttons" class="grid grid-cols-3 gap-3">
    <button id="new-scenario-btn" class="h-11 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
      ➕ Tạo mới
    </button>
    <button id="save-to-storage" class="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-md shadow-indigo-100">
      💾 Lưu lại
    </button>
    <button id="delete-scenario" class="h-11 bg-white border border-rose-100 text-rose-500 font-bold rounded-xl text-xs hover:bg-rose-50 transition-all active:scale-95">
      🗑️ Xoá
    </button>
  </div>
`;
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
    this.el.className = "panel-box ts-panel w-[520px] p-6 rounded-2xl shadow-2xl bg-white border border-gray-100 flex flex-col";
    this.el.style.maxHeight = "750px";
    this.el.innerHTML = ScenarioBuilderInnerHTML;

    ChatGPTHelper.mountPanel(this.el);
    ChatGPTHelper.makeDraggable(this.el, ".sb-title");
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());

    this.el.querySelector("#add-question").addEventListener("click",
      () => this._addQuestion());
    this.el.querySelector("#save-to-storage").addEventListener("click",
      () => this._save());
    this.el.querySelector("#delete-scenario").addEventListener("click",
      () => this._deleteScenario());
    this.el.querySelector("#new-scenario-btn").addEventListener("click", () => {
      this.el.querySelector("#scenario-editor").style.display = "block";
      this.el.querySelector("#scenario-name").value = "";
      this.el.querySelector("#questions-container").innerHTML = "";
      this.el.querySelector("#scenario-group").value = "";
    });
  }

  // Thay thế hàm này trong file ScenarioBuilder.js

  _addQuestion(q = { text: "", type: "text" }) {
    const container = document.createElement("div");
    container.className = "question-item bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-3 group hover:border-indigo-200 transition-all";

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Câu hỏi... (VD: \${topic|AI,Tech} hoặc \${name})";
    textarea.className = "w-full min-h-[60px] p-3 text-sm bg-gray-50 border-none rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all resize-none mb-3 font-sans leading-relaxed";
    textarea.value = q.text || "";

    const actionWrap = document.createElement("div");
    actionWrap.className = "flex items-center gap-2";

    const select = document.createElement("select");
    select.className = "h-8 px-2 text-[11px] font-bold uppercase bg-gray-50 border border-gray-100 rounded-md outline-none focus:border-indigo-500 text-gray-600 cursor-pointer";
    // === THÊM 'list' VÀO MẢNG NÀY ===
    ["text", "variable", "loop", "list"].forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t.toUpperCase();
      if (q.type === t) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    const loopKeyInput = document.createElement("input");
    loopKeyInput.className = "h-8 px-2 flex-1 text-xs border border-gray-100 rounded-md bg-white outline-none focus:border-indigo-500 font-mono text-indigo-600";
    loopKeyInput.placeholder = "Loop key (e.g. users)";
    // === CẬP NHẬT ĐIỀU KIỆN HIỂN THỊ ===
    loopKeyInput.classList.toggle("hidden", !(q.type === "loop" || q.type === "list"));
    loopKeyInput.value = q.loopKey || "";

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.className = "w-8 h-8 flex items-center justify-center text-xs bg-rose-50 text-rose-500 rounded-md hover:bg-rose-100 transition-all opacity-0 group-hover:opacity-100";
    deleteBtn.onclick = () => {
      container.remove();
      this._saveToStorageImmediately();
    };

    /* Toggle ẩn/hiện khi đổi type */
    select.addEventListener("change", () => {
      // === CẬP NHẬT ĐIỀU KIỆN HIỂN THỊ ===
      const isLoop = select.value === "loop" || select.value === "list";
      loopKeyInput.classList.toggle("hidden", !isLoop);
      this._saveToStorageImmediately();
    });

    // gắn vào DOM
    actionWrap.appendChild(select);
    actionWrap.appendChild(loopKeyInput);
    actionWrap.appendChild(deleteBtn);

    container.appendChild(textarea);
    container.appendChild(actionWrap);

    // auto save khi sửa
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
      text: div.querySelector(".question-input").value.trim(),
      type: div.querySelector(".question-type").value,
      loopKey: div.querySelector(".question-loopkey")?.value.trim() || undefined
    })).filter(q => q.text);

    if (!name || !questions.length) {
      alert("Vui lòng nhập tên kịch bản và ít nhất một câu hỏi.");
      return null;
    }

    /* 🔑  cấu trúc mới – vẫn tương thích ngược */
    return {
      [name]: { group, questions }
    };
  }

  async _collectDataFromStorage() {
    return new Promise(resolve => {
      chrome.storage.local.get("scenarioTemplates", (items) => {
        resolve(items.scenarioTemplates || {});
      });
    });
  }

  _save() {
    const json = this._collectDataFromDOM();
    if (!json) {
      return;
    }
    chrome.storage.local.get("scenarioTemplates", (items) => {
      const merged = { ...(items.scenarioTemplates || {}), ...json };
      chrome.storage.local.set({ scenarioTemplates: merged }, () => {
        alert("✅ Đã lưu kịch bản.");
        this._loadScenarioList();
        this._syncToFirestore(); // ✅ Gọi lại ở đây

      });
    });
  }

  _syncToFirestore() {
    console.log("☁️ [ScenarioBuilder] sync to Firestore");
    chrome.storage.local.get(["scenarioTemplates", "google_user_email"],
      async (items) => {
        const allScenarios = items.scenarioTemplates || {};
        const userId = items.google_user_email;

        if (!userId) {
          alert("⚠️ Bạn chưa đăng nhập Google, không thể sync Firestore.");
          return;
        }

        const helper = new FirestoreHelper(firebaseConfig);
        try {
          await helper.saveUserConfig(userId, allScenarios);
          console.log("☁️ Đã đồng bộ lên Firestore:");
        } catch (err) {
          console.error(err);
          alert("❌ Lỗi khi đồng bộ lên Firestore.");
        }
      });
  }

  _saveToStorageImmediately() {
    const json = this._collectDataFromDOM();
    if (!json) {
      return;
    }
    chrome.storage.local.get("scenarioTemplates", (items) => {
      const merged = { ...(items.scenarioTemplates || {}), ...json };
      chrome.storage.local.set({ scenarioTemplates: merged });
    });
  }

  _deleteScenario() {
    const name = this.el.querySelector("#scenario-name").value.trim();
    if (!name) return alert("Vui lòng nhập tên kịch bản để xoá.");
    if (!confirm(`Bạn có chắc chắn muốn xoá kịch bản "${name}"?`)) return;

    chrome.storage.local.get("scenarioTemplates", (items) => {
      const templates = items.scenarioTemplates || {};
      if (!templates[name]) return alert("Không tìm thấy kịch bản.");
      delete templates[name];

      chrome.storage.local.set({ scenarioTemplates: templates }, () => {
        console.log("🗑️ Đã xoá kịch bản:", name);
        this.el.querySelector("#scenario-name").value = "";
        this.el.querySelector("#questions-container").innerHTML = "";
        this._loadScenarioList();
        this._syncToFirestore(); // ✅ Bắt buộc phải có dòng này
      });
    });
  }

  // Thay thế toàn bộ hàm _loadScenarioList() trong file ScenarioBuilder.js

  _loadScenarioList() {
    chrome.storage.local.get("scenarioTemplates", (items) => {
      const templates = items.scenarioTemplates || {};
      this.allScenarios = templates;

      const dropdown = this.el.querySelector("#scenario-dropdown");
      const browserWrapper = this.el.querySelector("#scenario-browser"); // Thêm wrapper để xử lý click ngoài
      dropdown.innerHTML = "";

      Object.keys(templates).forEach((name) => {
        const raw = templates[name];
        const group = Array.isArray(raw) ? "" : (raw.group || "");
        const qs = Array.isArray(raw) ? raw : raw.questions || [];

        const item = document.createElement("div");
        item.className = "px-4 py-3 hover:bg-gray-50 cursor-pointer transition-all border-b border-gray-50 last:border-0 flex items-center justify-between group";

        const titleSpan = document.createElement("span");
        titleSpan.className = "text-sm text-gray-700 font-medium group-hover:text-indigo-600";
        titleSpan.textContent = group ? `[${group}] ${name}` : name;

        item.appendChild(titleSpan);
        item.dataset.group = group.toLowerCase();

        item.addEventListener("mousedown", (e) => { // Dùng mousedown để ổn định hơn
          e.preventDefault();
          this.el.querySelector("#scenario-name").value = name;
          this.el.querySelector("#scenario-group").value = group;
          const container = this.el.querySelector("#questions-container");
          container.innerHTML = "";
          qs.forEach((q) => this._addQuestion(q));

          dropdown.classList.add("hidden-dropdown");
          // Đảm bảo editor hiện ra (mặc dù bây giờ nó luôn hiển thị trong bố cục mới)
        });

        dropdown.appendChild(item);
      });

      const searchBox = this.el.querySelector("#scenario-search");

      // Lọc kết quả khi người dùng gõ
      searchBox.addEventListener("input", () => {
        const k = searchBox.value.trim();
        const items = Array.from(dropdown.querySelectorAll(".scenario-dropdown-item"));

        const scoredItems = items.map(div => {
          const score = ChatGPTHelper.fuzzySearch(k, div.textContent);
          return { div, score };
        });

        scoredItems.forEach(item => {
          if (item.score > 0) {
            item.div.style.display = "block";
            item.div.style.order = -item.score;
          } else {
            item.div.style.display = "none";
          }
        });
      });

      // Đảm bảo dropdown là flex để order hoạt động
      dropdown.style.display = "flex";
      dropdown.style.flexDirection = "column";

      // Hiện dropdown khi focus
      searchBox.addEventListener("focus", () => {
        dropdown.classList.remove("hidden-dropdown");
        // KHÔNG CÒN ẨN EDITOR NỮA
      });

      // Ẩn dropdown khi click ra ngoài
      document.addEventListener('click', (event) => {
        if (!browserWrapper.contains(event.target)) {
          dropdown.classList.add('hidden-dropdown');
        }
      });
    });
  }


  destroy() {
    console.log("❌ [ScenarioBuilder] destroy");
    this.el?.remove();
    this.onClose();
  }
}
