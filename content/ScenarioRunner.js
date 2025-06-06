window.ScenarioRunner = class {
  constructor(onClose) {
    console.log("▶️ [ScenarioRunner] init");
    if (!window.ChatAdapter) {
      alert("Không tìm thấy ChatAdapter phù hợp cho trang hiện tại. Scenario Runner sẽ bị vô hiệu.");
      throw new Error("ChatAdapter not available");
    }

    this.onClose = onClose;
    this.sequencer = null;
    this.templates = {};
    this._render();
  }

  _getLoopKey(q) {
    return q.loopKey || (q.text.match(/\$\{(\w+)\}/) || [])[1];
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

    chrome.storage.local.get("scenarioTemplates", (items) => {
      const select = this.el.querySelector("#scenario-select");
      this.templates = items.scenarioTemplates || {};
      select.add(new Option("-- Chọn kịch bản --", ""));

      Object.keys(this.templates).forEach((name) => {
        select.add(new Option(name, name));
      });

      // Tự động gọi onchange nếu cần
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

        const inputPanel = this.el.querySelector("#scenario-inputs");
        inputPanel.innerHTML = "";

        const shown = new Set();
        list.forEach(q => {
          const matches = [...q.text.matchAll(/\$\{(\w+)\}/g)];
          const loopKey = this._getLoopKey(q);   // 🌟 mới

          matches.forEach(match => {
            const varName = match[1];
            if (shown.has(varName)) {
              return;
            }
            shown.add(varName);

            const wrapper = document.createElement("div");
            wrapper.className = "sr-input-group";
            const label = document.createElement("label");
            label.textContent = `🧩 ${varName}:`;

            let inputEl;
            if (q.type === "loop" && varName === loopKey) {
              // chỉ loopKey => input number (số lần lặp)
              inputEl = document.createElement("input");
              inputEl.type = "number";
              inputEl.placeholder = "Số lần lặp (vd: 3)";
            } else {
              // các biến còn lại => textarea
              inputEl = document.createElement("textarea");
              inputEl.rows = 2;
              inputEl.placeholder = "Nhập nội dung...";
            }

            inputEl.dataset.key = varName;
            inputEl.addEventListener("input",
                () => this._saveVariableValues(name));
            wrapper.appendChild(label);
            wrapper.appendChild(inputEl);
            inputPanel.appendChild(wrapper);
          });

        });

        // ⏬ Load giá trị đã lưu
        chrome.storage.local.get("scenarioInputValues", (result) => {
          const saved = result.scenarioInputValues?.[name] || {};
          inputPanel.querySelectorAll("[data-key]").forEach(el => {
            const key = el.dataset.key;
            const val = saved[key];
            if (val !== undefined) {
              if (el.tagName === "TEXTAREA") {
                el.value = Array.isArray(val) ? val.join("\n") : val;
              } else {
                el.value = val;
              }
            }
          });
        });
      };
    });

    // Controls
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

  _saveVariableValues(templateName) {
    const inputPanel = this.el.querySelector("#scenario-inputs");
    const data = {};
    inputPanel.querySelectorAll("[data-key]").forEach(el => {
      const key = el.dataset.key;
      if (el.tagName === "TEXTAREA") {
        const lines = el.value.split("\n").map(v => v.trim()).filter(Boolean);
        data[key] = lines.length === 1 ? lines[0] : lines;
      } else {
        data[key] = el.value.trim();
      }
    });

    chrome.storage.local.get("scenarioInputValues", (items) => {
      const all = items.scenarioInputValues || {};
      all[templateName] = data;
      chrome.storage.local.set({ scenarioInputValues: all });
    });
  }

  async _start() {
    const name = this.el.querySelector("#scenario-select").value;
    if (!name) return alert("Vui lòng chọn kịch bản.");
    console.log("▶️ Bắt đầu chạy:", name);

    const list = this.templates[name];
    if (!list) return alert("Không tìm thấy kịch bản.");

    const values = await new Promise(resolve => {
      chrome.storage.local.get("scenarioInputValues", (result) => {
        resolve(result.scenarioInputValues?.[name] || {});
      });
    });

    const startAt = parseInt(this.el.querySelector("#step-select").value || "0", 10);
    const slicedList = list.slice(startAt);
    const expandedList = this._expandScenario(slicedList, values);

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

    this.sequencer.start(() => {
      this.el.querySelector('#sr-start').disabled = false;
      this.el.querySelector('#sr-pause').disabled = true;
      this.el.querySelector('#sr-resume').disabled = true;
    });
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
        const loopKey = this._getLoopKey(q);                 // 🌟 dùng hàm mới
        const count = parseInt(values[loopKey] || "0", 10); // số lần lặp

        for (let i = 1; i <= count; i++) {
          // Thay loopKey bằng i, đồng thời replace các biến thường
          const prompt = q.text.replace(/\$\{(\w+)\}/g, (_, k) => {
            if (k === loopKey) {
              return String(i);
            }     // biến loop
            return values[k] || "";                  // biến thường
          });
          result.push(prompt);
        }
      }

    }
    return result;
  }

async _sendPrompt(text) {
  console.log("💬 [ScenarioRunner] send prompt →", text.slice(0, 40));
  const chat = window.ChatAdapter;
  const textarea = chat.getTextarea();
  if (!textarea) throw new Error("❌ Không tìm thấy ô nhập");

  if (textarea.tagName === 'TEXTAREA') {
    /* DeepSeek & các site thuần textarea */
    textarea.value = text;
  } else {
    /* ChatGPT (div[contenteditable]) – giữ nguyên cách cũ */
    textarea.innerHTML = '';
    textarea.appendChild(Object.assign(document.createElement('p'), { textContent: text }));
  }

  /* Kích hoạt sự kiện input để React/Vue nhận thay đổi */
  textarea.dispatchEvent(new Event('input', { bubbles: true }));

  /* Đợi nút Send rồi click */
  const sendBtn = await this._waitForAdapterBtn(() => chat.getSendBtn());
  sendBtn?.click();
}

  _waitForResponse(timeout = 600000) {
    console.log("⏳ [ScenarioRunner] waiting for response");
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const timer = setInterval(() => {
        const done = window.ChatAdapter.isDone();
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
  _waitForAdapterBtn(fnGet, maxRetries = 25, interval = 300) {
    return new Promise((resolve) => {
      let tries = 0;
      const id = setInterval(() => {
        const el = fnGet();
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
