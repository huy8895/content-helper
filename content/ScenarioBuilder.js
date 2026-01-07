const ScenarioBuilderInnerHTML = `
  <h3 class="sb-title">🛠 Quản lý Kịch bản</h3>

  <div id="scenario-browser">
    <label>📄 Danh sách kịch bản:</label>
    <input type="text" id="scenario-search" placeholder="🔍 Tìm kịch bản...">
    <div id="scenario-dropdown" class="hidden-dropdown"></div>
  </div>

  <div id="scenario-editor">
    <label for="scenario-name">Tên kịch bản</label>
    <input type="text" id="scenario-name" placeholder="Tên kịch bản">
      <!-- 🆕  input nhóm -->
    <label for="scenario-group">Nhóm</label>
    <input type="text" id="scenario-group" placeholder="Ví dụ: podcast / video / blog">

    <div id="questions-container"></div>
    <button id="add-question" class="sb-btn">+ Thêm câu hỏi</button>
  </div>

  <div id="scenario-buttons">
    <button id="new-scenario-btn" class="sb-btn">➕ Thêm mới kịch bản</button>
    <button id="save-to-storage" class="sb-btn">💾 Lưu</button>
    <button id="delete-scenario" class="sb-btn">🗑️ Xoá kịch bản</button>
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
    this.el.classList.add("panel-box");
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
    container.className = "question-item";

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Câu hỏi...";
    textarea.className = "question-input";
    textarea.value = q.text || "";
    textarea.rows = 2;

    const actionWrap = document.createElement("div");
    actionWrap.className = "question-actions";

    const select = document.createElement("select");
    select.className = "question-type";
    // === THÊM 'list' VÀO MẢNG NÀY ===
    ["text", "variable", "loop", "list"].forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      if (q.type === t) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑";
    deleteBtn.className = "delete-question-btn";
    deleteBtn.onclick = () => {
      container.remove();
      this._saveToStorageImmediately();
    };

    const loopKeyInput = document.createElement("input");
    loopKeyInput.className = "question-loopkey";
    loopKeyInput.placeholder = "loopKey";
    // === CẬP NHẬT ĐIỀU KIỆN HIỂN THỊ ===
    loopKeyInput.style.display = (q.type === "loop" || q.type === "list") ? "inline-block" : "none";
    loopKeyInput.value = q.loopKey || "";

    /* Toggle ẩn/hiện khi đổi type */
    select.addEventListener("change", () => {
      // === CẬP NHẬT ĐIỀU KIỆN HIỂN THỊ ===
      loopKeyInput.style.display = (select.value === "loop" || select.value === "list") ? "inline-block" : "none";
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
        item.textContent = group ? `[${group}] ${name}` : name;
        item.className = "scenario-dropdown-item";
        item.dataset.group = group.toLowerCase();

        item.addEventListener("mousedown", (e) => { // Dùng mousedown để ổn định hơn
          e.preventDefault();
          this.el.querySelector("#scenario-name").value = name;
          this.el.querySelector("#scenario-group").value = group;
          const container = this.el.querySelector("#questions-container");
          container.innerHTML = "";
          qs.forEach((q) => this._addQuestion(q));

          dropdown.classList.add("hidden-dropdown");
          this.el.querySelector("#scenario-editor").style.display = "block"; // Đảm bảo editor hiện ra
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
