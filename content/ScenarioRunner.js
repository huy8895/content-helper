window.ScenarioRunner = class {
  constructor(onClose) {
    console.log("▶️ [ScenarioRunner] init");
    this.onClose = onClose;
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

      <div id="scenario-inputs" style="margin-top: 10px;"></div>

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
      select.add(new Option("-- Chọn kịch bản --", ""));

      Object.keys(this.templates).forEach((name) => {
        select.add(new Option(name, name));
      });

      // ✅ Sau khi đã add toàn bộ option
      if (select.options.length > 0) {
        select.selectedIndex = 0;
        select.dispatchEvent(new Event("change"));
      }

      select.onchange = () => {
        const name = select.value;
        const list = this.templates[name] || [];
        console.log("📋 Đã chọn kịch bản:", name);
        const stepSelect = this.el.querySelector("#step-select");
        stepSelect.innerHTML = list.map((q, idx) => {
          const preview = q.text?.slice(0, 40) || "";
          return `<option value="${idx}" title="${preview}">#${idx + 1}: ${preview}...</option>`;
        }).join("");
        stepSelect.disabled = false;

        // Hiển thị input cho variable và loop
        const inputPanel = this.el.querySelector("#scenario-inputs");
        inputPanel.innerHTML = "";

        const shown = new Set();
        list.forEach(q => {
          if (q.type === "variable" || q.type === "loop") {
            const matches = [...q.text.matchAll(/\$\{(\w+)\}/g)];
            matches.forEach(match => {
              const varName = match[1];
              if (shown.has(varName)) return;
              shown.add(varName);

              const wrapper = document.createElement("div");
              wrapper.className = "sr-input-group";

              const label = document.createElement("label");
              label.textContent = `🧩[${q.type}] ${varName}:`;

              if (q.type === "variable") {
                const textarea = document.createElement("textarea");
                textarea.dataset.key = varName;
                textarea.placeholder = "Nhập mỗi giá trị một dòng...";
                textarea.rows = 3;
                wrapper.appendChild(label);
                wrapper.appendChild(textarea);
              } else {
                const input = document.createElement("input");
                input.type = "number";
                input.dataset.key = varName;
                wrapper.appendChild(label);
                wrapper.appendChild(input);
              }

              inputPanel.appendChild(wrapper);
            });
          }
        });
      };
    });

      // Khi chọn kịch bản → hiển thị dropdown bước và inputs
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
    console.log("▶️ Bắt đầu chạy:", name);

    const list = this.templates[name];
    if (!list) return alert("Không tìm thấy kịch bản.");

    // Thu thập giá trị biến
    const variableValues = {};
    this.el.querySelectorAll("#scenario-inputs [data-key]").forEach(el => {
      const key = el.dataset.key;
      variableValues[key] = el.tagName === "TEXTAREA"
        ? el.value.split("\n").map(v => v.trim()).filter(Boolean)
        : el.value.trim();
    });

    const startAt = parseInt(this.el.querySelector("#step-select").value || "0", 10);
    const slicedList = list.slice(startAt);
    const expandedList = this._expandScenario(slicedList, variableValues);

    this.sequencer = new PromptSequencer(
      expandedList,
      this._sendPrompt.bind(this),
      this._waitForResponse.bind(this),
      (idx, total) => console.log(`📤 ${startAt + idx}/${startAt + total} done`),
      "ScenarioRunner"
    );

    this.el.querySelector('#sr-start').disabled = true;
    this.el.querySelector('#sr-pause').disabled = false;
    this.el.querySelector('#sr-resume').disabled = true;

    this.sequencer.start();
  }

  _expandScenario(questions, values) {
    const result = [];
    for (const q of questions) {
      if (q.type === "text") {
        result.push(q.text);
      } else if (q.type === "variable") {
        const filled = q.text.replace(/\$\{(\w+)\}/g, (_, k) => values[k] || "");
        result.push(filled);
      } else if (q.type === "loop") {
        const loopKey = (q.text.match(/\$\{(\w+)\}/) || [])[1];
        const loopList = values[loopKey] || 0;
        for (let index = 0; index < loopList[0]; index++) {
          const prompt = q.text.replace(new RegExp(`\\$\\{${loopKey}\\}`, 'g'), index + 1);
          result.push(prompt);
        }
      }
    }
    return result;
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
