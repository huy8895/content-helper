/*
 * ChatGPT Content Helper – OOP refactor (Apr‑25‑2025)
 * --------------------------------------------------
 * Injected as a content‑script on https://chatgpt.com/*
 * Adds two utility buttons under the chat input:
 *   🛠  Scenario Builder – create / edit / save JSON templates of prompts
 *   📤  Scenario Runner  – pick a saved template and send prompts sequentially
 * --------------------------------------------------
 * Version with rich emoji‑logs for easier debugging.
 */

/*************************
 * ChatGPTHelper (root)  *
 *************************/
class ChatGPTHelper {
  constructor() {
    console.log("🚀 [ChatGPTHelper] Helper loaded");
    /** @type {ScenarioBuilder|null} */
    this.builder = null;
    /** @type {ScenarioRunner|null} */
    this.runner = null;

    this.splitter = null;      // 👈 thêm

    // Observe DOM mutations so we can inject buttons when chat UI appears
    this._observer = new MutationObserver(() => this._insertHelperButtons());
    this._observer.observe(document.body, { childList: true, subtree: true });
  }

  /* UI helpers */
  _insertHelperButtons() {
    const chatForm = document.querySelector("form textarea")?.closest("form");
    if (!chatForm || chatForm.querySelector("#chatgpt-helper-button")) return;

    console.log("✨ [ChatGPTHelper] Inserting helper buttons");
    const container = document.createElement("div");
    container.id = "chatgpt-helper-button-container";

    const btnBuilder = this._createButton({
      id: "chatgpt-helper-button",
      text: "🛠 Soạn kịch bản",
      className: "scenario-btn btn-setup",
      onClick: () => this._toggleBuilder(),
    });

    const btnRunner = this._createButton({
      id: "chatgpt-run-button",
      text: "📤 Chạy kịch bản",
      className: "scenario-btn btn-run",
      onClick: () => this._toggleRunner(),
    });

  const btnSplitter = this._createButton({
    id: "chatgpt-splitter-button",
    text: "✂️ Text Split",
    className: "scenario-btn btn-tool",
    onClick: () => this._toggleSplitter(),   // 👈 đổi hàm
  });

    container.append(btnBuilder, btnRunner, btnSplitter);
    chatForm.appendChild(container);
  }

  _createButton({ id, text, className, onClick }) {
    const btn = document.createElement("button");
    btn.id = id;
    btn.textContent = text;
    btn.className = className;
    btn.addEventListener("click", (e) => {
      console.log(`🔘 [ChatGPTHelper] Click ${text}`);
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  _toggleBuilder() {
    if (this.builder) {
      console.log("❌ [ChatGPTHelper] Closing ScenarioBuilder");
      this.builder.destroy();
      this.builder = null;
      return;
    }
    console.log("📝 [ChatGPTHelper] Opening ScenarioBuilder");
    this.builder = new ScenarioBuilder(() => (this.builder = null));
  }

  /* ---------- toggle splitter ---------- */
  _toggleSplitter() {
    if (this.splitter) {               // đang mở → đóng
      console.log("❌ [ChatGPTHelper] Closing TextSplitter");
      this.splitter.destroy();
      this.splitter = null;
      return;
    }
    // đóng panel khác nếu đang mở
    this.builder?.destroy();
    this.builder = null;
    this.runner?.destroy();
    this.runner = null;

    console.log("✂️  [ChatGPTHelper] Opening TextSplitter");
    this.splitter = new TextSplitter(() => (this.splitter = null));
  }

  _toggleRunner() {
    if (this.runner) {
      console.log("❌ [ChatGPTHelper] Closing ScenarioRunner");
      this.runner.destroy();
      this.runner = null;
      return;
    }
    console.log("🚀 [ChatGPTHelper] Opening ScenarioRunner");
    this.runner = new ScenarioRunner(() => (this.runner = null));
  }

  /* ---------- helper kéo-thả dùng chung ---------- */
  static makeDraggable(el, handleSelector = null) {
    console.log("🔄 [ChatGPTHelper] Waiting for ChatGPT UI");
    const handle =
      typeof handleSelector === "string"
        ? el.querySelector(handleSelector)
        : handleSelector || el;
    if (!handle) return;

    let offsetX = 0,
      offsetY = 0,
      dragging = false;

    handle.style.cursor = "move";

    handle.addEventListener("mousedown", (e) => {
      dragging = true;
      offsetX = e.clientX - el.offsetLeft;
      offsetY = e.clientY - el.offsetTop;

      const onMouseMove = (ev) => {
        if (!dragging) return;
        el.style.left = `${ev.clientX - offsetX}px`;
        el.style.top = `${ev.clientY - offsetY}px`;
        el.style.right = "auto";
        el.style.bottom = "auto";
      };

      const onMouseUp = () => {
        dragging = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  /* ---------- helper: add close (×) button ---------- */
  static addCloseButton(panelEl, onClose) {
    const btn = document.createElement("button");
    btn.className = "panel-close";
    btn.textContent = "×";
    btn.title = "Close";

    btn.onclick = (e) => {
      e.stopPropagation();
      onClose();
    };

    panelEl.appendChild(btn);
  }

}

/***********************************
 * ScenarioBuilder – template editor
 ***********************************/
class ScenarioBuilder {
  constructor(onClose) {
    console.log("📦 [ScenarioBuilder] init");
    this.onClose = onClose;
    this._render();
  }

  _render() {
    console.log("🎨 [ScenarioBuilder] render UI");
    this.el = document.createElement("div");
    this.el.id = "scenario-builder";
    this.el.classList.add("panel-box");   // 👈 thêm
    this.el.innerHTML = `
      <h3 class="sb-title">🛠 Tạo kịch bản mới</h3>
      <input type="text" id="scenario-name" placeholder="Tên kịch bản" />
      <div id="questions-container"></div>
      <button id="add-question" class="sb-btn">+ Thêm câu hỏi</button>
      <div style="margin-top:10px">
        <button id="export-json"  class="sb-btn">📦 Xuất JSON</button>
        <button id="save-to-storage" class="sb-btn">💾 Lưu vào trình duyệt</button>
        <button id="import-json" class="sb-btn">📂 Nhập JSON</button>
      </div>
      <input type="file" id="json-file-input" accept=".json" style="display:none;">
      <pre id="json-preview"></pre>
`;

    document.body.appendChild(this.el);

    this.el.querySelector("#add-question").addEventListener("click", () => this._addQuestion());
    this.el.querySelector("#export-json").addEventListener("click", () => this._export());
    this.el.querySelector("#save-to-storage").addEventListener("click", () => this._save());
    this.el.querySelector("#import-json").addEventListener("click", () => this.el.querySelector("#json-file-input").click());
    this.el.querySelector("#json-file-input").addEventListener("change", (e) => this._import(e));

    ChatGPTHelper.makeDraggable(this.el, ".sb-title");

    /* thêm nút đóng */
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());
  }

  _addQuestion(value = "") {
    console.log("➕ [ScenarioBuilder] add question");
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Câu hỏi...";
    input.className = "question-input";
    input.value = value;
    this.el.querySelector("#questions-container").appendChild(input);
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
        this.el.querySelector("#json-preview").textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        alert("Tệp JSON không hợp lệ.");
      }
    };
    reader.readAsText(file);
  }

  destroy() {
    console.log("❌ [ScenarioBuilder] destroy");
    this.el?.remove();
    this.onClose();
  }
}

/**********************************************
 * ScenarioRunner – run template sequentially  *
 **********************************************/
class ScenarioRunner {
  constructor(onClose) {
    console.log("▶️ [ScenarioRunner] init");
    this.onClose = onClose;
    this._render();
  }

  _render() {
    console.log("🎛 [ScenarioRunner] render UI");
    this.el = document.createElement("div");
    this.el.id = "scenario-runner";
    this.el.classList.add("panel-box");   // 👈 thêm
    this.el.innerHTML = `
      <label for="scenario-select">Chọn kịch bản:</label>
      <select id="scenario-select"></select>
      <button id="start-scenario">▶️ Bắt đầu</button>`;
    document.body.appendChild(this.el);

    chrome.storage.local.get("scenarioTemplates", (items) => {
      const select    = this.el.querySelector("#scenario-select");
      const templates = items.scenarioTemplates || {};
      Object.keys(templates).forEach((name) => select.add(new Option(name, name)));
    });

    this.el.querySelector("#start-scenario").addEventListener("click", () => this._start());
    ChatGPTHelper.makeDraggable(this.el, "label");
    /* thêm nút đóng */
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());
  }

  async _start() {
    console.log("🎬 [ScenarioRunner] start scenario");
    const name = this.el.querySelector("#scenario-select").value;
    if (!name) return alert("Vui lòng chọn kịch bản.");

    chrome.storage.local.get("scenarioTemplates", async (items) => {
      const template = items.scenarioTemplates?.[name];
      if (!template) return alert("Không tìm thấy kịch bản.");
      for (const prompt of template) {
        await this._sendPrompt(prompt);
        await this._waitForResponse();
      }
    });
  }

  async _sendPrompt(text) {
    console.log("💬 [ScenarioRunner] send prompt →", text.slice(0, 40));
    const textarea = document.getElementById("prompt-textarea");
    if (!textarea) throw new Error("❌ Không tìm thấy #prompt-textarea");

    textarea.innerHTML = "";
    textarea.appendChild(Object.assign(document.createElement("p"), { textContent: text }));
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    const sendBtn = await this._waitForElement('button[aria-label="Send prompt"]');
    sendBtn?.click();
  }

  _waitForResponse(timeout = 60000) {
    console.log("⏳ [ScenarioRunner] waiting for response");
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const timer = setInterval(() => {
        const stopBtn  = document.querySelector('button[aria-label="Stop generating"]');
        const sendBtn  = document.querySelector('button[aria-label="Send prompt"]');
        const voiceBtn = document.querySelector('button[aria-label="Start voice mode"]');
        const done = (!stopBtn && sendBtn && sendBtn.disabled) || (!stopBtn && voiceBtn);
        if (done) {
          console.log("✅ [ScenarioRunner] response received");
          clearInterval(timer);
          return resolve();
        }
        if (Date.now() - start > timeout) {
          console.error("⌛ [ScenarioRunner] timeout");
          clearInterval(timer);
          return reject(new Error("Timeout waiting for ChatGPT response"));
        }
      }, 1000);
    });
  }

  _waitForElement(selector, maxRetries = 25, interval = 300) {
    return new Promise((resolve) => {
      let tries = 0;
      const id = setInterval(() => {
        const el = document.querySelector(selector);
        if (el || tries >= maxRetries) {
          clearInterval(id);
          if (!el) console.warn("⚠️ [ScenarioRunner] element not found", selector);
          resolve(el);
        }
        tries += 1;
      }, interval);
    });
  }

  destroy() {
    console.log("❌ [ScenarioRunner] destroy");
    this.el?.remove();
    this.onClose();
  }
}

/********************************************
 * TextSplitter – split & send chunks inline *
 * ------------------------------------------
 * • Shows a floating panel on ChatGPT page
 * • Splits long text by sentence into ≤ charLimit pieces
 * • Lets user send any chunk (or all) sequentially
 * • Re-uses ScenarioRunner’s _sendPrompt / _waitForResponse
 ********************************************/
class TextSplitter {
  /** @param {Function} onClose – callback when panel is destroyed */
  constructor(onClose) {
    console.log("✂️ [TextSplitter] init");
    this.onClose = onClose;
    this.chunks  = [];        // array of string segments
    this._render();
  }

  /* ---------- UI ---------- */
  _render() {
    console.log("🎨 [TextSplitter] render UI");
    /** Panel container */
    this.el = document.createElement("div");
    this.el.id = "text-splitter";
    this.el.className = "ts-panel";

    /** Panel HTML */
    this.el.innerHTML = `
      <h3 class="ts-title">✂️ Text Splitter</h3>

      <textarea id="ts-input"  class="ts-textarea"
                placeholder="Paste or type your long text…"></textarea>

      <div class="ts-toolbar">
        <input id="ts-limit" type="number" value="1000" class="ts-limit"> chars
        <button id="ts-split"   class="ts-btn">Split</button>
        <button id="ts-sendall" class="ts-btn ts-btn-accent">Send All</button>
        <button id="ts-close"   class="ts-btn" title="Close">×</button>
      </div>

      <div id="ts-results" class="ts-results"></div>
    `;
    document.body.appendChild(this.el);

    /* events */
    this.el.querySelector("#ts-split").onclick = () => this._split();
    this.el.querySelector("#ts-sendall").onclick = () => this._sendAll();
    this.el.querySelector("#ts-close").onclick = () => this.destroy();


    ChatGPTHelper.makeDraggable(this.el, ".ts-title"); // ⇦ thêm dòng này
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());
  }

  /* ---------- Split logic ---------- */
  _split() {
    console.log("✂️ [TextSplitter] split text");
    const raw   = this.el.querySelector("#ts-input").value.trim();
    const limit = +this.el.querySelector("#ts-limit").value || 1000;

    if (!raw) {
      alert("Please paste some text first!");
      return;
    }

    this.chunks.length = 0;          // reset
    let buf = "";

    // naive sentence splitter; can swap for NLP later
    raw.split(/(?<=[.!?])\s+/).forEach(sentence => {
      if ((buf + " " + sentence).trim().length <= limit) {
        buf = (buf ? buf + " " : "") + sentence;
      } else {
        if (buf) this.chunks.push(buf);
        buf = sentence;
      }
    });
    if (buf) this.chunks.push(buf);

    this._display();
  }

  /* ---------- Display buttons for each chunk ---------- */
  _display() {
    console.log("✂️ [TextSplitter] display results");

    const wrap = this.el.querySelector("#ts-results");
    wrap.innerHTML = "";                        // clear

    this.chunks.forEach((chunk, idx) => {
      const btn = document.createElement("button");
      btn.className = "ts-send-btn";
      btn.textContent = `Copy #${idx + 1}`;
      btn.onclick = () => this._copySegment(idx, btn);

      // preview paragraph (optional)
      const preview = document.createElement("p");
      preview.style.margin = "4px 0";
      preview.style.fontSize = "11px";
      preview.style.color = "#555";
      preview.textContent =
        chunk.length > 100
          ? `${chunk.slice(0, 40)} … ${chunk.slice(-25)}`
          : chunk;

      // wrapper element
      const row = document.createElement("div");
      row.style.marginBottom = "6px";
      row.append(btn, preview);
      wrap.appendChild(row);
    });
  }

  /* ---------- Send a single chunk ---------- */
  async _copySegment(idx, btn) {
    console.log("🔄 [TextSplitter] copy segment", idx);
    btn.disabled = true;
    btn.textContent = "Sending…";
    try {
      await this._sendPrompt(this.chunks[idx]);
      await this._waitForResponse();
      btn.textContent = "✅ Done";
    } catch (err) {
      console.error('_copySegment err', err);
      btn.textContent = "⚠️ Error";
    }
  }

  /* ---------- Send ALL chunks sequentially ---------- */
  async _sendAll() {
    console.log("🔄 [TextSplitter] send all chunks");
    const rows = Array.from(this.el.querySelectorAll(".ts-send-btn"));
    for (let i = 0; i < this.chunks.length; i++) {
      const btn = rows[i];
      if (!btn.disabled || btn.textContent.startsWith("⚠️")) {
        await this._copySegment(i, btn);
      }
    }
  }

  /* ---------- Re-use ScenarioRunner helpers ---------- */
  _sendPrompt      = ScenarioRunner.prototype._sendPrompt;
  _waitForResponse = ScenarioRunner.prototype._waitForResponse;
  _waitForElement   = ScenarioRunner.prototype._waitForElement;   // 👈 thêm dòng này

  /* ---------- Clean up ---------- */
  destroy() {
    console.log("❌ [TextSplitter] destroy");
    this.el?.remove();
    this.onClose?.();
  }

}



// Kick‑start helper
new ChatGPTHelper();

