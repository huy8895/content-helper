window.ScenarioRunner = class {
  constructor(onClose) {
    console.log("▶️ [ScenarioRunner] init");
    this.onClose = onClose;

    /** @type {PromptSequencer|null} */
    this.sequencer = null;
    this.templates = {};
    this._render();
  }

  _render() {
    console.log("🎛 [ScenarioRunner] render UI");
    this.el = document.createElement("div");
    this.el.id = "scenario-runner";
    this.el.classList.add("panel-box");
    this.el.innerHTML = `
      <div class="sr-header">
        <span class="sr-title">📤 Scenario Runner</span>
      </div>

      <label class="sr-label" for="scenario-select">Chọn kịch bản:</label>
      <select id="scenario-select"></select>

      <label class="sr-label" for="step-select">Bắt đầu từ câu số:</label>
      <select id="step-select" disabled>
        <option value="0">(Chọn kịch bản để hiện danh sách)</option>
      </select>

      <div class="sr-controls">
        <button id="sr-start">▶️ Bắt đầu</button>
        <button id="sr-pause" disabled>⏸ Dừng</button>
        <button id="sr-resume" disabled>▶️ Tiếp</button>
      </div>
    `;

    ChatGPTHelper.mountPanel(this.el);

    // Load tất cả kịch bản từ localStorage
    chrome.storage.local.get("scenarioTemplates", (items) => {
      const select = this.el.querySelector("#scenario-select");
      this.templates = items.scenarioTemplates || {};
      Object.keys(this.templates).forEach((name) => {
        select.add(new Option(name, name));
      });

      // Khi chọn kịch bản → hiển thị dropdown bước
      select.onchange = () => {
        const name = select.value;
        const list = this.templates[name] || [];
        const stepSelect = this.el.querySelector("#step-select");
        stepSelect.innerHTML = list.map((q, idx) => {
          const preview = q.text?.slice(0, 40) || "";  // lấy q.text
          return `<option value="${idx}" title="${preview}">#${idx + 1}: ${preview}...</option>`;
        }).join('');
        stepSelect.disabled = false;
      };
    });

    const btnStart = this.el.querySelector('#sr-start');
    const btnPause = this.el.querySelector('#sr-pause');
    const btnResume = this.el.querySelector('#sr-resume');

    btnStart.onclick = () => this._start();
    btnPause.onclick = () => {
      this.sequencer?.pause();
      btnPause.disabled = true;
      btnResume.disabled = false;
    };
    btnResume.onclick = () => {
      this.sequencer?.resume();
      btnResume.disabled = true;
      btnPause.disabled = false;
    };

    ChatGPTHelper.makeDraggable(this.el, ".sr-header");
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());
  }

  async _start() {
    const name = this.el.querySelector("#scenario-select").value;
    if (!name) return alert("Vui lòng chọn kịch bản.");

    const list = this.templates[name];
    if (!list) return alert("Không tìm thấy kịch bản.");

    const startAt = parseInt(this.el.querySelector("#step-select").value || "0", 10);
    const slicedList = list.slice(startAt).map(q => q.text); // 👈 lấy .text

    this.sequencer = new PromptSequencer(
      slicedList,
      this._sendPrompt.bind(this),
      this._waitForResponse.bind(this),
      (idx, total) => console.log(`📤 ${startAt + idx}/${startAt + total} done`),
      "ScenarioRunner"
    );

    // UI update
    this.el.querySelector('#sr-start').disabled = true;
    this.el.querySelector('#sr-pause').disabled = false;
    this.el.querySelector('#sr-resume').disabled = true;

    this.sequencer.start();
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

  _waitForResponse(timeout = 600000) {
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
};
