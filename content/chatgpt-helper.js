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

    /** @type {TextSplitter|null} */
    this.splitter = null;

    /** @type {AudioDownloader|null} */
    this.audioDownloader = null;   // 🎵 new panel



    // Observe DOM mutations so we can inject buttons when chat UI appears
    this._observer = new MutationObserver(() => this._insertHelperButtons());
    this._observer.observe(document.body, { childList: true, subtree: true });

    if(!document.getElementById('chatgpt-helper-panel-bar')){
      const bar = document.createElement('div');
      bar.id = 'chatgpt-helper-panel-bar';
      document.body.appendChild(bar);
    }

    // ⌨️  ESC → đóng panel trên cùng
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') ChatGPTHelper.closeTopPanel();
    });
  }

  /* ngay trong class ChatGPTHelper (ngoài mọi hàm) */
  static zTop = 10000;   // bộ đếm z-index toàn cục

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

    const btnAudio = this._createButton({
      id       : "chatgpt-audio-button",
      text     : "🎵 Audio",
      className: "scenario-btn btn-tool",
      onClick  : () => this._toggleAudioDownloader(),
    });

    container.append(btnBuilder, btnRunner, btnSplitter, btnAudio);
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

  _toggleAudioDownloader() {
    if (this.audioDownloader) {
      this.audioDownloader.destroy();
      this.audioDownloader = null;
      return;
    }
    this.audioDownloader = new AudioDownloader(() => (this.audioDownloader = null));
  }


  /* ---------- helper kéo-thả dùng chung ---------- */
  static makeDraggable(el, handleSelector = null) {
    const handle = typeof handleSelector === "string"
        ? el.querySelector(handleSelector)
        : handleSelector || el;
    if (!handle) return;

    handle.style.cursor = "move";

    let shiftX = 0, shiftY = 0;

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();

      /* 👉 luôn đưa panel lên trên cùng */
      ChatGPTHelper.bringToFront(el);

      const rect = el.getBoundingClientRect();
      shiftX = e.clientX - rect.left;
      shiftY = e.clientY - rect.top;

      if (!el.dataset.free) {           // tách khỏi bar 1 lần duy nhất
        el.dataset.free = "1";

        /* ✨ tắt animation để không flash */
        el.style.animation = "none";

        el.style.position = "fixed";
        el.style.left  = rect.left  + "px";
        el.style.top   = rect.top   + "px";
        el.style.width = rect.width + "px";
        document.body.appendChild(el);
      }


      const onMouseMove = (ev) => {
        el.style.left = ev.clientX - shiftX + "px";
        el.style.top  = ev.clientY - shiftY + "px";
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup",   onMouseUp);
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

    // Ngăn *tuyệt đối* sự kiện lan toả
    const stopAll = (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();   // chặn hoàn toàn
    };

    // 1️⃣ Chặn mousedown/mouseup – không cho panel nhận bringToFront
    btn.addEventListener("mousedown", stopAll, true); // capture phase
    btn.addEventListener("mouseup",   stopAll, true);

    // 2️⃣ Khi click → đóng panel
    btn.addEventListener("click", (ev) => {
      stopAll(ev);        // chặn thêm một lần
      onClose();          // gọi hàm hủy
    });

    panelEl.appendChild(btn);
  }

  /**
   * Hàm tiện ích đưa panel vào bar
   * @param {T} el
   */
  /* ---------- mountPanel: đưa panel vào thanh bar ---------- */
  static mountPanel(el){
    el.classList.add('helper-panel');

    const bar = document.getElementById('chatgpt-helper-panel-bar');
    bar.appendChild(el);

    /* CHỈ khi bấm vào tiêu đề/đầu thanh mới đưa panel lên trên.
       – ScenarioBuilder:  .sb-title
       – ScenarioRunner :  .sr-header
       – TextSplitter   :  .ts-title                                  */
    const handle = el.querySelector('.sb-title, .sr-header, .ts-title');
    if(handle){
      handle.style.userSelect = 'none';          // tránh chọn chữ khi kéo
      handle.addEventListener('mousedown', () => ChatGPTHelper.bringToFront(el));
    }
  }

  /* ---------- bringToFront: luôn đưa panel lên trên cùng ---------- */
  static bringToFront(el){
    if (el.dataset.free){                        // panel đã “floating”
      el.style.zIndex = ++ChatGPTHelper.zTop;    // chỉ đổi z-index
    }else{                                       // panel còn trong thanh bar
      const bar = document.getElementById('chatgpt-helper-panel-bar');

      // Nếu đã là phần tử cuối rồi thì thôi – tránh re-append gây nháy
      if (bar.lastElementChild !== el){
        el.style.animation = 'none';             // tắt hiệu ứng fadeIn
        bar.appendChild(el);                     // đưa về cuối thanh
      }
    }
  }

  /** Đóng panel trên cùng (nếu có) */
  static closeTopPanel() {
    const barPanels  = Array.from(document.querySelectorAll(
        '#chatgpt-helper-panel-bar .helper-panel'));
    const floating   = Array.from(document.querySelectorAll(
        'body > .helper-panel:not(#chatgpt-helper-panel-bar *)'));

    // panel mở sau cùng = phần tử cuối của mảng floating, nếu không có thì lấy ở bar
    const last = floating.at(-1) || barPanels.at(-1);
    if (!last) return;

    last.querySelector('.panel-close')?.click();
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

    ChatGPTHelper.mountPanel(this.el);

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

    /** @type {PromptSequencer|null} */
    this.sequencer = null;
    this._render();
  }

  _render() {
    console.log("🎛 [ScenarioRunner] render UI");
    this.el = document.createElement("div");
    this.el.id = "scenario-runner";
    this.el.classList.add("panel-box");   // 👈 thêm
    this.el.innerHTML = `
  <div class="sr-header">
     <span class="sr-title">📤 Scenario Runner</span>
  </div>

  <label class="sr-label" for="scenario-select">Chọn kịch bản:</label>
  <select id="scenario-select"></select>

  <div class="sr-controls">
    <button id="sr-start">▶️ Bắt đầu</button>
    <button id="sr-pause"  disabled>⏸ Dừng</button>
    <button id="sr-resume" disabled>▶️ Tiếp</button>
  </div>`;

    ChatGPTHelper.mountPanel(this.el);

    chrome.storage.local.get("scenarioTemplates", (items) => {
      const select    = this.el.querySelector("#scenario-select");
      const templates = items.scenarioTemplates || {};
      Object.keys(templates).forEach((name) => select.add(new Option(name, name)));
    });

    const btnStart  = this.el.querySelector('#sr-start');
    const btnPause  = this.el.querySelector('#sr-pause');
    const btnResume = this.el.querySelector('#sr-resume');

    btnStart.onclick = () => this._start();
    btnPause.onclick = () => { this.sequencer?.pause();
      btnPause.disabled = true;  btnResume.disabled = false; };
    btnResume.onclick = () => { this.sequencer?.resume();
      btnResume.disabled = true; btnPause.disabled = false; };

    ChatGPTHelper.makeDraggable(this.el, ".sr-header");
    /* thêm nút đóng */
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());
  }

  async _start() {
    const name = this.el.querySelector("#scenario-select").value;
    if (!name) return alert("Vui lòng chọn kịch bản.");

    chrome.storage.local.get("scenarioTemplates", (items) => {
      const list = items.scenarioTemplates?.[name];
      if (!list) return alert("Không tìm thấy kịch bản.");

      /* tạo Sequencer */
      this.sequencer = new PromptSequencer(
          list,
          this._sendPrompt.bind(this),
          this._waitForResponse.bind(this),
          (idx, total) => console.log(`📤 ${idx}/${total} done`)
      );

      /* cập nhật UI */
      this.el.querySelector('#sr-start').disabled = true;
      this.el.querySelector('#sr-pause').disabled = false;
      this.el.querySelector('#sr-resume').disabled = true;

      this.sequencer.start();
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

  _waitForResponse(timeout = 60000 * 10) {
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
          console.log("⛔️⛔️⛔️ ⌛ [ScenarioRunner] timeout");
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
    this.sequencer?.stop();
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
    this.chunks  = [];
    this.status  = [];      // ← song song chunks: "pending" | "done" | "error"
    this.sequencer = null;

    /* ⬇️  Lấy state trước khi render */
    PanelState.load('TextSplitter', (saved) => {
        // ghép state cũ vào mẫu mặc định ➜ mọi field luôn tồn tại
        const def = {
            text: '', limit: 1000, chunks: [], status: [],
            running: false, paused: false, nextIdx: 0
        };
        this.savedState = Object.assign(def, saved || {});
        this.chunks = [...(this.savedState.chunks  || [])];
        this.status = [...(this.savedState.status  || [])];
      this._render();
      /* Nếu có dữ liệu cũ thì hiển thị ngay */
      if (this.savedState.text) {
        this._display();                       // vẽ list chunk
        this.el.querySelector('#ts-input').value  = this.savedState.text;
        this.el.querySelector('#ts-limit').value  = this.savedState.limit;
        this.el.querySelector('#ts-start').disabled = !this.chunks.length;


        // ► Khôi phục nút điều khiển
        const start  = this.el.querySelector('#ts-start');
        const pause  = this.el.querySelector('#ts-pause');
        const resume = this.el.querySelector('#ts-resume');

        if (saved.running) {
          if (saved.paused) {                  // panel đóng khi đang pause
            start.disabled  = true;
            pause.disabled  = true;
            resume.disabled = false;
          } else {                             // panel đóng trong khi đang chạy
            start.disabled  = true;
            pause.disabled  = false;
            resume.disabled = true;
            this._resumeSequencer(saved.nextIdx);   // ⬅ bước 4
          }
        } else {                                 // idle
          start.disabled  = !this.chunks.length;
          pause.disabled  = true;
          resume.disabled = true;
        }
      }
    });
  }


  /* ---------- UI ---------- */
  _render() {
    console.log("🎨 [TextSplitter] render UI");
    /** Panel container */
    this.el = document.createElement("div");
    this.el.id = "text-splitter";
    this.el.className = "ts-panel panel-box";

    /** Panel HTML */
    this.el.innerHTML = `
  <h3 class="ts-title">✂️ Text Splitter</h3>

  <!-- Radio chọn nguồn dữ liệu -->
  <div style="margin-bottom: 8px; font-size: 13px;">
    <label><input type="radio" name="ts-input-mode" value="file" checked> Load from file</label>
    <label style="margin-left: 12px;"><input type="radio" name="ts-input-mode" value="text"> Enter text manually</label>
  </div>

  <!-- File input -->
  <div id="ts-file-block" style="margin-bottom: 8px;">
  <label class="ts-file-wrapper">
    📂 Choose File
    <input type="file" id="ts-file-input" accept=".txt" />
  </label>
  <span id="ts-file-name" style="margin-left: 8px; font-size: 12px; color: #555;">No file chosen</span>
  </div>


  <!-- Textarea input -->
  <textarea id="ts-input" class="ts-textarea" style="display: none;"
            placeholder="Paste or type your long text…"></textarea>

  <div class="ts-toolbar">
    <input id="ts-limit" type="number" value="1000" class="ts-limit"> chars
    <button id="ts-split"   class="ts-btn">✂️ Split</button>
  </div>

  <!-- controls -->
  <div class="ts-controls">
    <button id="ts-start"  disabled>▶️ Send All</button>
    <button id="ts-pause"  disabled>⏸ Pause</button>
    <button id="ts-resume" disabled>▶️ Resume</button>
    <button id="ts-reset"  class="ts-btn ts-btn-danger">🔄 Reset</button>
  </div>

  <div id="ts-results" class="ts-results"></div>
`;

    // Sự kiện thay đổi giữa File / Text
    const radios = this.el.querySelectorAll('input[name="ts-input-mode"]');
    const fileBlock = this.el.querySelector('#ts-file-block');
    const textarea  = this.el.querySelector('#ts-input');

    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'file' && radio.checked) {
          fileBlock.style.display = 'block';
          textarea.style.display = 'none';
        } else if (radio.value === 'text' && radio.checked) {
          fileBlock.style.display = 'none';
          textarea.style.display = 'block';
        }
      });
    });

    ChatGPTHelper.mountPanel(this.el);

    /* events */
    this.el.querySelector("#ts-split").onclick = () => this._split();
    this.el.querySelector("#ts-file-input").addEventListener("change", (e) => this._loadFile(e)); // ⬅️ Thêm ở đây

    const btnStart  = this.el.querySelector('#ts-start');
    const btnPause  = this.el.querySelector('#ts-pause');
    const btnResume = this.el.querySelector('#ts-resume');
    const btnReset  = this.el.querySelector('#ts-reset');

    btnStart.onclick = () => this._startSend();
    btnPause.onclick = () => {
      this.sequencer?.pause();
      btnPause.disabled = true;
      btnResume.disabled = false;
      PanelState.save('TextSplitter', this._currentState(this.sequencer.idx, true, true));
    };
    btnResume.onclick = () => {
      /* Nếu panel được mở lại sau khi Pause thì sequencer chưa tồn tại */
      if (!this.sequencer) {
        const startAt = this.savedState?.nextIdx || 0;
        this._resumeSequencer(startAt);
      } else {
        this.sequencer.resume();
      }

      btnResume.disabled = true;
      btnPause.disabled = false;

      // ghi lại trạng thái mới – nhớ kiểm tra this.sequencer trước khi dùng
      const idxNow = this.sequencer ? this.sequencer.idx : (this.savedState?.nextIdx || 0);
      PanelState.save('TextSplitter', this._currentState(idxNow, false, true));
    };
    btnReset.onclick = () => this._reset();

    ChatGPTHelper.makeDraggable(this.el, ".ts-title");
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());

    /* Theo dõi thay đổi input + limit → update cache */
    const syncState = () => {
      PanelState.save('TextSplitter',
          this._currentState(
              this.sequencer?.idx    || 0,
              this.sequencer?.paused || false,
              !!this.sequencer
          )
      );
    };
    this.el.querySelector('#ts-input').addEventListener('input',  syncState);
    this.el.querySelector('#ts-limit').addEventListener('change', syncState);
  }

  _loadFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result.trim();
      this.el.querySelector("#ts-input").value = text;

      // ✅ Cập nhật tên file sau khi load
      this.el.querySelector("#ts-file-name").textContent = file.name;

      alert("File loaded successfully!");
    };
    reader.readAsText(file);
  }


  _reset(){
    if(!confirm('Reset all chunks and clear saved state?')) return;

    // 1️⃣ Ngưng sequencer nếu đang chạy
    if (this.sequencer){
      this.sequencer.stop();
      this.sequencer = null;
    }

    // 2️⃣ Xoá dữ liệu trong bộ nhớ
    this.chunks = [];
    this.status = [];

    // 3️⃣ Dọn sạch UI
    this.el.querySelector('#ts-input').value = '';
    this.el.querySelector('#ts-results').innerHTML = '';

    this.el.querySelector('#ts-start').disabled  = true;
    this.el.querySelector('#ts-pause').disabled  = true;
    this.el.querySelector('#ts-resume').disabled = true;

    // 4️⃣ Xoá cache đã lưu
    PanelState.clear('TextSplitter');

    console.log('🔄 [TextSplitter] reset hoàn tất');
  }

  /* ---------- Split logic ---------- */
  _split() {
    console.log("✂️ [TextSplitter] split text");
    const raw   = this.el.querySelector("#ts-input").value.trim();
    const limit = +this.el.querySelector("#ts-limit").value || 1000;

    console.log("✂️ [TextSplitter] split text", limit, "chars");
    if (!raw) {
      alert("Please paste some text first!");
      return;
    }

    this.chunks.length = 0;          // reset
    this.status.length = 0;
    let buf = "";

    // NLP sentence splitting using compromise.js
    console.log("🔍 [TextSplitter] NLP sentence splitting");
    const doc = nlp(raw);
    const sentences = doc.sentences().out('array');

    sentences.forEach(sentence => {
      if ((buf + " " + sentence).trim().length <= limit) {
        buf = (buf ? buf + " " : "") + sentence;
      } else {
        if (buf) this.chunks.push(buf);
        buf = sentence;
      }
    });
    if (buf) this.chunks.push(buf);
    this.status = this.chunks.map(()=> 'pending');

    this._display();
    const btnStart = this.el.querySelector('#ts-start');
    const btnPause  = this.el.querySelector('#ts-pause');
    const btnResume = this.el.querySelector('#ts-resume');
    btnStart.disabled  = this.chunks.length === 0;
    btnPause.disabled  = true;
    btnResume.disabled = true;
    // (sau this._display(); và set trạng thái nút)
    PanelState.save('TextSplitter', this._currentState(0, false, false)); // PATCH: đảm bảo lưu sau Split
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
      if (this.status[idx] === 'done'){
        btn.disabled = true;
        btn.textContent = '✅ Done';
      } else if (this.status[idx] === 'error'){
        btn.disabled = false;
        btn.textContent = '⚠️ Error';
      }
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
    btn.disabled   = true;
    btn.textContent = "Sending…";

    try {
      await this._sendPrompt(this.chunks[idx]);
      await this._waitForResponse();

      // --- THÀNH CÔNG ---
      btn.textContent   = "✅ Done";
      this.status[idx]  = "done";

    } catch (err) {
      // --- THẤT BẠI ---
      console.error("[TextSplitter] send error:", err);
      btn.disabled      = false;          // cho phép gửi lại
      btn.textContent   = "⚠️ Error";
      this.status[idx]  = "error";
    }

    /* Dù thành công hay lỗi đều lưu lại state */
    PanelState.save("TextSplitter",
        this._currentState(
            this.sequencer ? this.sequencer.idx    : 0,
            this.sequencer ? this.sequencer.paused : false,
            !!this.sequencer                        // PATCH: thêm tham số thứ 3 = running
        )
    );
  }

  /* ---------- Send ALL chunks sequentially ---------- */
  _sendAll(){ this._startSend(); }


  _startSend() {
    if (!this.chunks.length) return alert("No chunks – bấm Split trước đã!");

    const btnStart  = this.el.querySelector('#ts-start');
    const btnPause  = this.el.querySelector('#ts-pause');
    const btnResume = this.el.querySelector('#ts-resume');

    /* === lấy danh sách còn pending, giữ lại chỉ số gốc === */
    const todo = this.chunks
        .map((c, i) => ({ c, i }))
        .filter(o => this.status[o.i] === 'pending');

    if (!todo.length) return;   // chẳng còn gì để gửi

    this.sequencer = new PromptSequencer(
        todo.map(o => o.c),                // chỉ văn bản
        this._sendPrompt.bind(this),
        this._waitForResponse.bind(this),
        (idx) => {                         // idx bắt đầu từ 1
          const real   = todo[idx - 1].i;  // chỉ số gốc
          const rowBtn = this.el.querySelectorAll('.ts-send-btn')[real];
          if (rowBtn) { rowBtn.disabled = true; rowBtn.textContent = '✅ Done'; }
          this.status[real] = 'done';      // <– cập nhật trạng thái

          PanelState.save('TextSplitter', this._currentState(real + 1, false, true));

          if (idx === todo.length) {       // <– so với todo
            btnPause.disabled  = true;
            btnResume.disabled = true;
            btnStart.disabled  = false;
            this.sequencer = null;
            PanelState.save('TextSplitter', this._currentState(0, false, false));
          }
        }
    );

    // Lưu & cập nhật UI
    PanelState.save('TextSplitter', this._currentState(0, false, true));
    btnStart.disabled  = true;
    btnPause.disabled  = false;
    btnResume.disabled = true;

    this.sequencer.start();
  }


  _currentState(nextIdx = 0, paused = false, running = false){
    return {
      text : this.el.querySelector('#ts-input').value,
      limit: +this.el.querySelector('#ts-limit').value || 1000,
      chunks: this.chunks,
      status: this.status,
      nextIdx,
      paused,
      running
    };
  }

  _resumeSequencer(startIdx = 0) {
    // lấy những chunk còn PENDING kể từ startIdx
    const todo = this.chunks
        .map((c, i) => ({c, i}))
        .filter(o => o.i >= startIdx && this.status[o.i] === 'pending');

    if (!todo.length) return;        // không còn gì để làm

    const btnStart = this.el.querySelector('#ts-start');
    const btnPause = this.el.querySelector('#ts-pause');
    const btnResume = this.el.querySelector('#ts-resume');

    this.sequencer = new PromptSequencer(
        todo.map(o => o.c),
        async (text) => {
          await this._sendPrompt(text);
        },
        this._waitForResponse.bind(this),
        (idx) => {                               // idx bắt đầu từ 1
          const real = todo[idx - 1].i;
          const rowBtn = this.el.querySelectorAll('.ts-send-btn')[real];
          if (rowBtn) {
            rowBtn.disabled = true;
            rowBtn.textContent = '✅ Done';
          }
          this.status[real] = 'done';
          PanelState.save('TextSplitter',
              this._currentState(real + 1, false, true)   // PATCH: truyền running = true
          );

          if (idx === todo.length) {            // hoàn tất
            btnPause.disabled = true;
            btnResume.disabled = true;
            btnStart.disabled = false;
            this.sequencer = null;
            PanelState.save('TextSplitter',
                this._currentState(0, false, false)         // PATCH: hết vòng – running = false
            );          }
        }
    );
    btnStart.disabled = true;
    btnPause.disabled = false;
    btnResume.disabled = true;
    PanelState.save('TextSplitter', this._currentState(startIdx, false, true));
    this.sequencer.start();
  }
  /* ---------- Re-use ScenarioRunner helpers ---------- */
  _sendPrompt(text) {
    const prefixed = `Repeat this text for me, please. Your reply must only the text: ${text}`;
    return ScenarioRunner.prototype._sendPrompt.call(this, prefixed);
  }

  _waitForResponse = ScenarioRunner.prototype._waitForResponse;
  _waitForElement   = ScenarioRunner.prototype._waitForElement;   // 👈 thêm dòng này

  /* ---------- Clean up ---------- */
  destroy() {
    console.log("❌ [TextSplitter] destroy");
    PanelState.save('TextSplitter', this._currentState(
        this.sequencer?.idx || 0,
        this.sequencer?.paused || false,
        !!this.sequencer
    ));


    this.el?.remove();
    this.onClose?.();
    this.sequencer?.stop();
  }

}

/****************************************
 * PromptSequencer – run prompts in order
 * --------------------------------------
 *  new PromptSequencer(list, sendFn, waitFn, onStep?)
 *      .start()   .pause()   .resume()   .stop()
 ****************************************/
class PromptSequencer {
  constructor(prompts, send, wait, onStep = () => {}) {
    this.prompts = prompts;
    this.send    = send;
    this.wait    = wait;
    this.onStep  = onStep;     // callback (idx, total)

    this.idx     = 0;
    this.paused  = false;
    this.stopped = false;
  }
  async _run() {
    while (this.idx < this.prompts.length && !this.stopped) {
      if (this.paused) {
        await new Promise(r => (this._resume = r));   // treo tại đây
        continue;
      }
      await this.send(this.prompts[this.idx]);
      await this.wait();
      this.idx++;
      this.onStep(this.idx, this.prompts.length);
    }
  }
  start()  { this.stopped = false; this.paused = false; this._run(); }
  pause()  { this.paused  = true; }
  resume() { if (this.paused) { this.paused = false; this._resume?.(); } }
  stop()   { this.stopped = true; }
}

/* ========= PanelState (save / load) ========= */
class PanelState {
  /* key = tên panel, data = object tuỳ ý */
  static save(key, data) {
    chrome.storage.local.set({ ['panelState__' + key]: data });
  }
  static load(key, cb) {
    chrome.storage.local.get('panelState__' + key, (res) =>
        cb(res['panelState__' + key] || null)
    );
  }
  static clear(key) {
    chrome.storage.local.remove('panelState__' + key);
  }
}

/*********************************************
 * AudioDownloader – download TTS audio *
 *********************************************/
class AudioDownloader {
  constructor(onClose) {
    this.onClose = onClose;
    this.inFlight = 0;
    this.savedState = {};

    PanelState.load('AudioDownloader', (saved) => {
      const def = {
        voice: 'shade',
        format: 'mp3',
        downloaded: [],
        downloading: [],
        selected: {}
      };
      this.savedState = Object.assign(def, saved || {});
      // Tính lại inFlight chính xác từ danh sách downloading
      this.inFlight = this.savedState.downloading.length;
      this._render();
      this._loadMessages();
    });
  }

  /* ---------- UI ---------- */
  _render() {
    this.el = document.createElement("div");
    this.el.id = "audio-downloader";
    this.el.className = "panel-box ts-panel";

    this.el.innerHTML = `
      <h3 class="ts-title">🎵 Audio Downloader</h3>

      <div style="display:flex; gap:8px; margin-bottom:8px;">
        <select id="ad-voice"  class="ts-limit">
          <option value="shade">Monday</option>
          <option value="glimmer">Sol</option>
          <option value="vale">Vale</option>
          <option value="cove">Cove</option>
          <option value="fathom">Arbor</option>
          <option value="juniper">Juniper</option>
          <option value="maple">Maple</option>
          <option value="breeze">Breeze</option>
          <option value="ember">Ember</option>
          <option value="orbit">Spruce</option>
        </select>

        <select id="ad-format" class="ts-limit">
          <option value="mp3">mp3</option>
          <option value="aac">aac</option>
        </select>

        <button id="ad-dlall" class="ts-btn ts-btn-accent" style="flex:1">
          Download&nbsp;All
        </button>
        <button id="ad-reset" class="ts-btn ts-btn-danger">
          🔄 Reset
        </button>
      </div>

      <label style="font-size:12px;display:block;margin-bottom:4px;">
        <input type="checkbox" id="ad-select-all" /> Select all
      </label>

      <div id="ad-progress"
           style="font-size:12px; margin:4px 0 8px; color:#0369a1;"></div>

      <div id="ad-list" class="ts-results"></div>
    `;

    ChatGPTHelper.mountPanel(this.el);
    ChatGPTHelper.makeDraggable(this.el, ".ts-title");
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());

    // Set saved voice and format
    this.el.querySelector("#ad-voice").value  = this.savedState.voice || 'shade';
    this.el.querySelector("#ad-format").value = this.savedState.format || 'mp3';
    this._updateProgressDisplay();

    // Event listeners
    this.el.querySelector("#ad-voice").onchange  = () => this._syncState();
    this.el.querySelector("#ad-format").onchange = () => this._syncState();
    this.el.querySelector("#ad-dlall").onclick   = () => this._downloadAllZip();
    this.el.querySelector("#ad-reset").onclick   = () => this._reset();
    this.el.querySelector("#ad-select-all").onchange = (e)=> this._toggleAll(e.target.checked);
  }

  _loadMessages() {
    chrome.storage.local.get(
        ["responseData", "conversationId", "requestHeaders"],
        (data) => {
          this.data = data;
          const mapping = data.responseData?.mapping || {};
          const msgs = Object.values(mapping)
              .filter(m => m.message?.author?.role === "assistant"
                  && m.message?.content?.content_type === "text")
              .sort((a,b)=>a.message.create_time - b.message.create_time)
              .map(m => ({
                id   : m.message.id,
                text : m.message.content.parts[0].slice(0,80) + "…"
              }));

          this._renderRows(msgs);
        }
    );
  }

  /* Trả về button của messageId nếu panel đang mở, hoặc null */
  _getBtnById(id){
    return this.el
        ? this.el.querySelector(`#ad-list button[data-mid="${id}"]`)
        : null;
  }


  _renderRows(rows) {
    const wrap = this.el.querySelector("#ad-list");
    wrap.innerHTML = "";

    if (!rows.length){
      wrap.textContent = "No assistant messages detected.";
      return;
    }

    rows.forEach((msg, idx)=>{
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.marginBottom = "6px";
      row.dataset.mid = msg.id;

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = this.savedState.selected[msg.id] ?? true;
      cb.style.marginRight = "6px";
      cb.onchange = () => this._syncState();

      const btn = document.createElement("button");
      btn.className = "ts-btn";
      btn.style.flex = "0 0 120px";

      /* ➜ thêm dòng này để gắn message-id vào chính button */
      btn.dataset.mid = msg.id;

      const alreadyDownloaded = this.savedState.downloaded.includes(msg.id);
      const isDownloading = this.savedState.downloading.includes(msg.id);

      // Nếu đã download nhưng vẫn còn trong downloading → xoá khỏi downloading
      if (alreadyDownloaded && isDownloading) {
        const idx = this.savedState.downloading.indexOf(msg.id);
        if (idx !== -1) {
          this.savedState.downloading.splice(idx, 1);
          this.inFlight = this.savedState.downloading.length;
        }
      }

      btn.textContent = alreadyDownloaded
          ? "✅ Downloaded"
          : isDownloading
              ? "Downloading…"
              : `Download #${idx+1}`;
      btn.disabled = alreadyDownloaded || isDownloading;

      btn.onclick = ()=> this._download(btn, idx+1);

      const span = document.createElement("span");
      span.style.fontSize = "11px";
      span.style.marginLeft = "8px";
      span.style.color = "#555";
      span.textContent = msg.text;

      row.append(cb, btn, span);
      wrap.appendChild(row);
    });

    this._updateProgressDisplay();
  }

  _download(btn, ordinal){
    console.log("start download: #", ordinal, btn)
    const row   = btn.parentElement;
    const msgId = row.dataset.mid;
    const {conversationId, requestHeaders} = this.data;
    const voice  = this.el.querySelector("#ad-voice").value;
    const format = this.el.querySelector("#ad-format").value;

    btn.disabled = true;
    btn.textContent = "Downloading…";
    this.savedState.downloading.push(msgId);
    this.inFlight = this.savedState.downloading.length;
    this._updateProgressDisplay();

    chrome.runtime.sendMessage({
      action        :"downloadAudio",
      indexCell     : ordinal,
      conversationId: conversationId,
      messageId     : msgId,
      requestHeaders: requestHeaders,
      selectedVoice : voice,
      format        : format
    }, (res)=>{
      console.log("✅ Downloaded done ", msgId)
      const idx = this.savedState.downloading.indexOf(msgId);
      if (idx !== -1) this.savedState.downloading.splice(idx, 1);
      this.inFlight = this.savedState.downloading.length;

      const liveBtn = this._getBtnById(msgId);   // ➋ dùng nút hiện có
      if (liveBtn) {
        if (res?.status === 'completed') {
          liveBtn.textContent = '✅ Downloaded';
          liveBtn.disabled = true;
          this.savedState.downloaded.push(msgId);
        } else {
          liveBtn.textContent = '⚠️ Failed';
          liveBtn.disabled = false;
        }
      }
      this._updateProgressDisplay();
      this._syncState();
    });
  }

  _updateProgressDisplay(){
    const box = this.el.querySelector("#ad-progress");
    box.textContent = this.inFlight
        ? `🔊 Downloading… (${this.inFlight})`
        : "";
  }

  _syncState(){
    const selected = {};
    this.el.querySelectorAll("#ad-list > div").forEach(row => {
      const mid = row.dataset.mid;
      const cb  = row.querySelector("input[type=checkbox]");
      selected[mid] = cb.checked;
    });

    PanelState.save('AudioDownloader', {
      voice: this.el.querySelector("#ad-voice").value,
      format: this.el.querySelector("#ad-format").value,
      downloaded: this.savedState.downloaded || [],
      downloading: this.savedState.downloading || [],
      selected: selected
    });
  }

  _downloadAll(){
    const rows = Array.from(
        this.el.querySelectorAll("#ad-list > div")
    ).filter(r => r.querySelector("input").checked);

    rows.forEach( (row,i) =>{
      setTimeout(()=> row.querySelector("button").click(), i*400);
    });
  }

  _downloadAllZip() {
    console.log("🔊 [AudioDownloader] download all audio files audio.zip");

    // 1) Lấy reference đến nút Download All
    const dlAllBtn = this.el.querySelector('#ad-dlall');

    // 2) Chuyển UI sang trạng thái downloading
    dlAllBtn.textContent = 'Downloading…';
    dlAllBtn.disabled = true;

    // 3) Thu thập các messageId được chọn
    const ids = Array.from(
        this.el.querySelectorAll('#ad-list > div')
    )
        .filter(r => r.querySelector('input').checked)
        .map(r => r.dataset.mid);

    if (!ids.length) {
      alert('Chọn ít nhất 1 mục để zip');
      // Phục hồi UI nếu không có mục nào
      dlAllBtn.textContent = 'Download All';
      dlAllBtn.disabled = false;
      return;
    }

    // 4) Gửi yêu cầu downloadAudioZip vào background
    chrome.runtime.sendMessage({
      action        : 'downloadAudioZip',
      messageIds    : ids,
      conversationId: this.data.conversationId,
      requestHeaders: this.data.requestHeaders,
      selectedVoice : this.savedState.voice,
      format        : this.savedState.format
    }, (res) => {
      // 5) Khi kết thúc (thành công hoặc lỗi), phục hồi lại nút
      if (res.status === 'completed') {
        // đánh dấu đã xong
        ids.forEach(id => {
          if (!this.savedState.downloaded.includes(id))
            this.savedState.downloaded.push(id);
        });
        this._syncState();
        // this._renderRows(this._lastMessages); // hoặc reload list
      } else {
        alert('Zip thất bại: ' + res.error);
      }

      // 6) Phục hồi UI cho nút Download All
      dlAllBtn.textContent = 'Download Done ✅';
    });
  }



  _toggleAll(state){
    this.el.querySelectorAll("#ad-list input[type=checkbox]")
        .forEach(cb => cb.checked = state);
    this._syncState();
  }

  _reset(){
    this.savedState.downloaded = [];
    this.savedState.downloading = [];
    this.savedState.selected = {};
    this.inFlight = 0;

    PanelState.clear('AudioDownloader');
    this._renderRows([]);
    this._updateProgressDisplay();
  }

  destroy(){
    this._syncState();
    this.el?.remove();
    this.onClose?.();
  }
}









// Kick‑start helper
new ChatGPTHelper();

