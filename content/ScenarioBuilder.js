/***********************************
 * ScenarioBuilder – template editor
 ***********************************/
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
    this.el.classList.add("panel-box");   // 👈 thêm
    this.el.innerHTML = `
<h3 class="sb-title">🛠 Quản lý Kịch bản</h3>

<div id="scenario-searchbox">
  <label>📄 Danh sách kịch bản:</label>
  <input type="text" id="scenario-search" placeholder="🔍 Tìm kịch bản..." />
</div>
<div id="scenario-dropdown"></div>

<div id="scenario-editor" style="display: none; margin-top: 8px;">
  <label for="scenario-name">Tên kịch bản</label>
  <input type="text" id="scenario-name" placeholder="Tên kịch bản" />
  <div id="questions-container"></div>
  <button id="add-question" class="sb-btn">+ Thêm câu hỏi</button>
</div>


<div id="scenario-buttons" style="margin-top: auto; padding-top: 8px;">
  <button id="new-scenario-btn" class="sb-btn">➕ Thêm mới kịch bản</button>
  <button id="save-to-storage" class="sb-btn">💾 Lưu</button>
  <button id="delete-scenario" class="sb-btn">🗑️ Xoá kịch bản</button>
</div>
<input type="file" id="json-file-input" accept=".json" style="display:none;">

`;

    ChatGPTHelper.mountPanel(this.el);

    this.el.querySelector("#add-question").addEventListener("click", () => this._addQuestion());
    this.el.querySelector("#save-to-storage").addEventListener("click", () => this._save());
    this.el.querySelector("#delete-scenario").addEventListener("click", () => this._deleteScenario());
    this.el.querySelector("#new-scenario-btn").addEventListener("click", () => {
      const editor = this.el.querySelector("#scenario-editor");
      editor.style.display = "block";

      this.el.querySelector("#scenario-name").value = "";
      this.el.querySelector("#questions-container").innerHTML = "";
    });

    //firestore
    // this.el.querySelector("#sync-to-firestore").addEventListener("click", () => this._syncToFirestore());

    ChatGPTHelper.makeDraggable(this.el, ".sb-title");

    /* thêm nút đóng */
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());
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
        this._syncToFirestore();
      });
    });
  }

  _downloadFromDrive() {
    chrome.storage.local.get(["gg_access_token", "gg_drive_file_id"], async (items) => {
      const token = items.gg_access_token;
      let fileId = items.gg_drive_file_id;

      if (!token) {
        alert("Vui lòng đăng nhập Google trước khi tải.");
        return;
      }

      const helper = new GoogleDriveHelper(token);

      try {
        // Nếu chưa có fileId, tự động tìm kiếm trong folder
        if (!fileId) {
          const folderId = await helper.getOrCreateFolder('_chatgptContentHelper');
          const query = encodeURIComponent(`name='chatgpt-scenarios.json' and '${folderId}' in parents and trashed=false`);
          const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
          const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          const data = await res.json();
          if (res.ok && data.files && data.files.length > 0) {
            fileId = data.files[0].id;
            console.log("🔍 Tìm thấy file:", data.files[0]);
            // Lưu lại fileId để lần sau dùng nhanh
            chrome.storage.local.set({ gg_drive_file_id: fileId });
          } else {
            alert("Không tìm thấy file 'chatgpt-scenarios.json' trong thư mục _chatgptContentHelper.");
            return;
          }
        }

        // Download JSON từ fileId đã có/tìm được
        const data = await helper.downloadJson(fileId);
        chrome.storage.local.set({ scenarioTemplates: data }, () => {
          alert("✅ Đã tải và cập nhật kịch bản từ Google Drive!");
          this._loadScenarioList();
        });
        console.log("⬇️ Đã lấy dữ liệu từ Google Drive:", data);

      } catch (err) {
        console.error("❌ Lỗi khi tải từ Drive:", err);
        alert("Đã xảy ra lỗi khi tải dữ liệu từ Google Drive.");
      }
    });
  }

  _loadScenarioList() {
    chrome.storage.local.get("scenarioTemplates", (items) => {
      const templates = items.scenarioTemplates || {};
      this.allScenarios = templates;

      const dropdown = this.el.querySelector("#scenario-dropdown");
      dropdown.innerHTML = ""; // clear old

      Object.keys(templates).forEach((name) => {
        const item = document.createElement("div");
        item.textContent = name;
        item.style.padding = "6px 10px";
        item.style.cursor = "pointer";
        item.style.borderBottom = "1px solid #eee";

        item.addEventListener("click", () => {
          this.el.querySelector("#scenario-name").value = name;
          const container = this.el.querySelector("#questions-container");
          container.innerHTML = "";
          templates[name].forEach((q) => this._addQuestion(q));

          // Ẩn chỉ danh sách dropdown
          this.el.querySelector("#scenario-dropdown").style.display = "none";

          // Hiện phần editor
          this.el.querySelector("#scenario-editor").style.display = "block";
        });


        dropdown.appendChild(item);
      });

      // thêm sự kiện filter khi nhập vào ô tìm kiếm
      const searchBox = this.el.querySelector("#scenario-search");
      searchBox.addEventListener("input", () => {
        const keyword = searchBox.value.trim().toLowerCase();
        dropdown.querySelectorAll("div").forEach(div => {
          div.style.display = div.textContent.toLowerCase().includes(keyword)
              ? "block" : "none";
        });
      });


      searchBox.addEventListener("focus", () => {
        const dropdown = this.el.querySelector("#scenario-dropdown");
        const editor = this.el.querySelector("#scenario-editor");

        dropdown.style.display = "block";
        editor.style.display = "none";
      });

    });
  }


  _addQuestion(value = "") {
    console.log("➕ [ScenarioBuilder] add question");
    const textarea = document.createElement("textarea");
    textarea.placeholder = "Câu hỏi...";
    textarea.className = "question-input";
    textarea.value = value;
    textarea.rows = 2; // 👈 hiện 2 dòng, tự mở rộng
    this.el.querySelector("#questions-container").appendChild(textarea);
  }


  _collectData() {
    console.log("📑 [ScenarioBuilder] collect data");
    const name = this.el.querySelector("#scenario-name").value.trim();
    const questions = [...this.el.querySelectorAll(".question-input")]
      .map((i) => i.value.trim())
      .filter(Boolean);
    if (!name || questions.length === 0) {
      alert("Vui lòng nhập tên kịch bản và ít nhất một câu hỏi.");
      return null;
    }
    return { [name]: questions };
  }

  _export() {
    console.log("📤 [ScenarioBuilder] export JSON");
    const json = this._collectData();
    if (!json) return;
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${Object.keys(json)[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  _save() {
    console.log("💾 [ScenarioBuilder] save to Chrome storage");
    const json = this._collectData();
    if (!json) return;
    chrome.storage.local.get("scenarioTemplates", (items) => {
      const merged = { ...(items.scenarioTemplates || {}), ...json };
      chrome.storage.local.set({ scenarioTemplates: merged }, () => alert("Đã lưu kịch bản vào trình duyệt."));
      this._loadScenarioList();
      this._syncToFirestore();
    });
  }

  _import(event) {
    console.log("📂 [ScenarioBuilder] import JSON");
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const name = Object.keys(data)[0];
        const questions = data[name];
        this.el.querySelector("#scenario-name").value = name;
        const container = this.el.querySelector("#questions-container");
        container.innerHTML = "";
        questions.forEach((q) => this._addQuestion(q));
      } catch (err) {
        alert("Tệp JSON không hợp lệ.");
      }
    };
    reader.readAsText(file);
  }

  _syncToDrive() {
    const json = this._collectData();
    if (!json) return;

    chrome.storage.local.get(["gg_access_token", "gg_drive_file_id", "scenarioTemplates"], async (items) => {
      const token = items.gg_access_token;
      const fileId = items.gg_drive_file_id || null;
      const allScenarios = items.scenarioTemplates || {};

      if (!token) {
        alert("Vui lòng đăng nhập Google trước khi đồng bộ.");
        return;
      }

      try {
        const helper = new GoogleDriveHelper(token);
        const folderId = await helper.getOrCreateFolder('_chatgptContentHelper');
        helper.folderId = folderId;

        const result = await helper.uploadJson(allScenarios, fileId);
        chrome.storage.local.set({ gg_drive_file_id: result.id });
        alert("✅ Đã đồng bộ kịch bản lên Google Drive!");
        console.log("📁 Google Drive file:", result);
      } catch (err) {
        console.error("❌ Lỗi khi đồng bộ Drive:", err);
        alert("Đã xảy ra lỗi khi đồng bộ Google Drive.");
      }
    });
  }


  destroy() {
    console.log("❌ [ScenarioBuilder] destroy");
    this.el?.remove();
    this.onClose();
  }
}