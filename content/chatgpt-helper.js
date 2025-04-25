/*
 * ChatGPT Content Helper – OOP refactor (Apr‑25‑2025)
 * --------------------------------------------------
 * This single file is injected as a content‑script on https://chatgpt.com/*
 * It adds two utility buttons under the chat input:
 *  🛠  Scenario Builder – create / edit / save JSON templates of prompts
 *  📤  Scenario Runner  – pick a saved template and send prompts sequentially
 * --------------------------------------------------
 * Author: (refactored by ChatGPT)
 */

class ChatGPTHelper {
  constructor() {
    console.log('[ChatGPTHelper] ChatGPT Helper loaded.');
    /** @type {ScenarioBuilder|null} */
    this.builder = null;
    /** @type {ScenarioRunner|null} */
    this.runner = null;

    // Observe DOM mutations so we can inject buttons as soon as chat UI loads
    this._observer = new MutationObserver(() => this._insertHelperButtons());
    this._observer.observe(document.body, { childList: true, subtree: true });
  }

  /** Injects the two control buttons once into the chat UI */
  _insertHelperButtons() {
    const chatForm = document.querySelector("form textarea")?.closest("form");
    if (!chatForm || chatForm.querySelector("#chatgpt-helper-button")) return;

    const container = document.createElement("div");
    container.id = "chatgpt-helper-button-container";

    const btnBuilder = this._createButton({
      id: "chatgpt-helper-button",
      text: "🛠 Soạn kịch bản",
      className: "scenario-btn btn-setup",
      onClick: () => this._toggleBuilder()
    });

    const btnRunner = this._createButton({
      id: "chatgpt-run-button",
      text: "📤 Chạy kịch bản",
      className: "scenario-btn btn-run",
      onClick: () => this._toggleRunner()
    });

    container.append(btnBuilder, btnRunner);
    chatForm.appendChild(container);
  }

  _createButton({ id, text, className, onClick }) {
    const btn = document.createElement("button");
    btn.id = id;
    btn.textContent = text;
    btn.className = className;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  /* -------------------------------------------------- */
  /* Scenario Builder                                   */
  /* -------------------------------------------------- */

  _toggleBuilder() {
    if (this.builder) {
      this.builder.destroy();
      this.builder = null;
      return;
    }
    // Destroy runner UI if open
    if (this.runner) {
      this.runner.destroy();
      this.runner = null;
    }
    this.builder = new ScenarioBuilder(() => (this.builder = null));
  }

  /* -------------------------------------------------- */
  /* Scenario Runner                                    */
  /* -------------------------------------------------- */

  _toggleRunner() {
    if (this.runner) {
      this.runner.destroy();
      this.runner = null;
      return;
    }
    // Destroy builder UI if open
    if (this.builder) {
      this.builder.destroy();
      this.builder = null;
    }
    this.runner = new ScenarioRunner(() => (this.runner = null));
  }
}

/* ===================================================================== */
/* ScenarioBuilder – small UI on bottom‑right for editing JSON templates  */
/* ===================================================================== */
class ScenarioBuilder {
  /**
   * @param {Function} onClose – callback when UI is closed
   */
  constructor(onClose) {
    this.onClose = onClose;
    this._render();
  }

  _render() {
    this.el = document.createElement("div");
    this.el.id = "scenario-builder";
    this.el.innerHTML = `
      <div class="helper-box">
        <h2>Tạo kịch bản mới 🎬</h2>
        <input type="text" id="scenario-name" placeholder="Tên kịch bản" />
        <div id="questions-container"></div>
        <button id="add-question">+ Thêm câu hỏi</button>
        <br><br>
        <button id="export-json">📦 Xuất JSON</button>
        <button id="save-to-storage">💾 Lưu vào trình duyệt</button>
        <button id="import-json">📂 Nhập JSON</button>
        <input type="file" id="json-file-input" accept=".json" style="display:none;" />
        <pre id="json-preview"></pre>
      </div>`;

    document.body.appendChild(this.el);

    // Event bindings
    this.el.querySelector("#add-question").addEventListener("click", () => this._addQuestion());
    this.el.querySelector("#export-json").addEventListener("click", () => this._export());
    this.el.querySelector("#save-to-storage").addEventListener("click", () => this._save());
    this.el.querySelector("#import-json").addEventListener("click", () => this.el.querySelector("#json-file-input").click());
    this.el.querySelector("#json-file-input").addEventListener("change", (e) => this._import(e));
  }

  _addQuestion(value = "") {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Câu hỏi...";
    input.className = "question-input";
    input.value = value;
    this.el.querySelector("#questions-container").appendChild(input);
  }

  _collectData() {
    const name = this.el.querySelector("#scenario-name").value.trim();
    const questions = Array.from(this.el.querySelectorAll(".question-input"))
      .map((i) => i.value.trim())
      .filter(Boolean);
    if (!name || questions.length === 0) {
      alert("Vui lòng nhập tên kịch bản và ít nhất một câu hỏi.");
      return null;
    }
    return { [name]: questions };
  }

  _export() {
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
    const json = this._collectData();
    if (!json) return;
    chrome.storage.local.get("scenarioTemplates", (items) => {
      const merged = { ...(items.scenarioTemplates || {}), ...json };
      chrome.storage.local.set({ scenarioTemplates: merged }, () => alert("Đã lưu kịch bản vào trình duyệt."));
    });
  }

  _import(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const name = Object.keys(data)[0];
        const questions = data[name];
        // Populate UI
        this.el.querySelector("#scenario-name").value = name;
        const container = this.el.querySelector("#questions-container");
        container.innerHTML = "";
        questions.forEach((q) => this._addQuestion(q));
        this.el.querySelector("#json-preview").textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        alert("Tệp JSON không hợp lệ.");
      }
    };
    reader.readAsText(file);
  }

  destroy() {
    this.el?.remove();
    this.onClose();
  }
}

/* ===================================================================== */
/* ScenarioRunner – choose template & auto‑send prompts                   */
/* ===================================================================== */
class ScenarioRunner {
  constructor(onClose) {
    this.onClose = onClose;
    this._render();
  }

  _render() {
    this.el = document.createElement("div");
    this.el.id = "scenario-runner";
    this.el.innerHTML = `
      <label for="scenario-select">Chọn kịch bản:</label>
      <select id="scenario-select"></select>
      <button id="start-scenario">▶️ Bắt đầu</button>`;

    document.body.appendChild(this.el);

    // Populate select options
    chrome.storage.local.get("scenarioTemplates", (items) => {
      const templates = items.scenarioTemplates || {};
      const select = this.el.querySelector("#scenario-select");
      Object.keys(templates).forEach((name) => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      });
    });

    this.el.querySelector("#start-scenario").addEventListener("click", () => this._start());
  }

  async _start() {
    const name = this.el.querySelector("#scenario-select").value;
    if (!name) return alert("Vui lòng chọn kịch bản.");

    chrome.storage.local.get("scenarioTemplates", async (items) => {
      const template = items.scenarioTemplates?.[name];
      if (!template) return alert("Không tìm thấy kịch bản.");
      for (const question of template) {
        await this._sendPrompt(question);
        await this._waitForResponse();
      }
    });
  }

  async _sendPrompt(text) {
    const textarea = document.getElementById("prompt-textarea");
    if (!textarea) throw new Error("❌ Không tìm thấy #prompt-textarea");

    textarea.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = text;
    textarea.appendChild(p);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    const sendBtn = await this._waitForElement('button[aria-label="Send prompt"]');
    sendBtn?.click();
  }

  _waitForResponse(timeout = 60000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const stopBtn = document.querySelector('button[aria-label="Stop generating"]');
        const sendBtn = document.querySelector('button[aria-label="Send prompt"]');
        const done = !stopBtn && sendBtn && sendBtn.disabled;
        if (done) {
          clearInterval(interval);
          resolve();
        }
        if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error("Timeout waiting for ChatGPT response"));
        }
      }, 1000);
    });
  }

  _waitForElement(selector, maxRetries = 20, interval = 300) {
    return new Promise((resolve) => {
      let retries = 0;
      const timer = setInterval(() => {
        const el = document.querySelector(selector);
        if (el || retries >= maxRetries) {
          clearInterval(timer);
          resolve(el);
        }
        retries += 1;
      }, interval);
    });
  }

  destroy() {
    this.el?.remove();
    this.onClose();
  }
}

// Kick‑start the helper
new ChatGPTHelper();
