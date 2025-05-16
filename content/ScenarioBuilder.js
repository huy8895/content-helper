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
    this.el.innerHTML = `
      <h3 class="sb-title">🛠 Quản lý Kịch bản</h3>

      <div id="scenario-browser">
        <label>📄 Danh sách kịch bản:</label>
        <input type="text" id="scenario-search" placeholder="🔍 Tìm kịch bản...">
        <div id="scenario-dropdown" class="hidden-dropdown"></div>
      </div>

      <div id="scenario-editor">
        <label for="scenario-name">Tên kịch bản</label>
        <input type="text" id="scenario-name" placeholder="Tên kịch bản">
        <div id="questions-container"></div>
        <button id="add-question" class="sb-btn">+ Thêm câu hỏi</button>
      </div>

      <div id="scenario-buttons">
        <button id="new-scenario-btn" class="sb-btn">➕ Thêm mới kịch bản</button>
        <button id="save-to-storage" class="sb-btn">💾 Lưu</button>
        <button id="delete-scenario" class="sb-btn">🗑️ Xoá kịch bản</button>
      </div>
    `;

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
    });
  }

  _addQuestion(q = {text: "", type: "text"}) {
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
    ["text", "variable", "loop"].forEach(t => {
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

    /* === THÊM NGAY SAU const select = ... === */
    const loopKeyInput = document.createElement("input");
    loopKeyInput.className   = "question-loopkey";
    loopKeyInput.placeholder = "loopKey";
    loopKeyInput.style.display = q.type === "loop" ? "inline-block" : "none";
    loopKeyInput.value = q.loopKey || "";

    /* Toggle ẩn/hiện khi đổi type */
    select.addEventListener("change", () => {
      loopKeyInput.style.display = select.value === "loop" ? "inline-block" : "none";
      this._saveToStorageImmediately();
    });
    /* === HẾT KHỐI THÊM MỚI === */


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
    textarea.focus(); // 👈 Focus vào textarea mới thêm
  }

  _collectDataFromDOM() {
    const name = this.el.querySelector("#scenario-name").value.trim();
    const items = this.el.querySelectorAll(".question-item");
    const questions = Array.from(items).map(div => {
      return {
        text: div.querySelector(".question-input").value.trim(),
        type: div.querySelector(".question-type").value,
        loopKey: div.querySelector(".question-loopkey")?.value.trim() || undefined
      };
    }).filter(q => q.text);

    if (!name || questions.length === 0) {
      alert("Vui lòng nhập tên kịch bản và ít nhất một câu hỏi.");
      return null;
    }
    return {[name]: questions};
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
      const merged = {...(items.scenarioTemplates || {}), ...json};
      chrome.storage.local.set({scenarioTemplates: merged}, () => {
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
      const merged = {...(items.scenarioTemplates || {}), ...json};
      chrome.storage.local.set({scenarioTemplates: merged});
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


  _loadScenarioList() {
    chrome.storage.local.get("scenarioTemplates", (items) => {
      const templates = items.scenarioTemplates || {};
      this.allScenarios = templates;

      const dropdown = this.el.querySelector("#scenario-dropdown");
      dropdown.innerHTML = "";

      Object.keys(templates).forEach((name) => {
        const item = document.createElement("div");
        item.textContent = name;
        item.className = "scenario-dropdown-item";


        item.addEventListener("click", () => {
          this.el.querySelector("#scenario-name").value = name;
          const container = this.el.querySelector("#questions-container");
          container.innerHTML = "";
          (templates[name] || []).forEach((q) => this._addQuestion(q));

          this.el.querySelector("#scenario-dropdown").classList.add(
              "hidden-dropdown");
          this.el.querySelector("#scenario-editor").style.display = "block";
        });

        dropdown.appendChild(item);
      });

      const searchBox = this.el.querySelector("#scenario-search");
      searchBox.addEventListener("input", () => {
        const keyword = searchBox.value.trim().toLowerCase();
        dropdown.querySelectorAll("div").forEach(div => {
          div.style.display = div.textContent.toLowerCase().includes(keyword)
              ? "block" : "none";
        });
      });

      searchBox.addEventListener("focus", () => {
        dropdown.classList.remove("hidden-dropdown");
        this.el.querySelector("#scenario-editor").style.display = "none";
      });
    });
  }

  destroy() {
    console.log("❌ [ScenarioBuilder] destroy");
    this.el?.remove();
    this.onClose();
  }
}
