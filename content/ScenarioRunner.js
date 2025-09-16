const ScenarioRunnerInnerHTML = `
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
    <button id="sr-addqueue">➕ Thêm vào hàng đợi <span id="sr-queue-count">0</span></button>
    <button id="sr-start">▶️ Bắt đầu</button>
    <button id="sr-pause" disabled>⏸ Dừng</button>
    <button id="sr-resume" disabled>▶️ Tiếp</button>
  </div>
  <!-- ngay dưới .sr-controls -->
  <div class="sr-queue-box">
    <strong>Hàng đợi:</strong>
    <ul id="sr-queue-list"></ul>
  </div>
`;
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
    this.queue = [];            // 🌟 hàng đợi các lần chạy
  }

  /* Đọc toàn bộ giá trị biến hiện trên panel */
  _readVariableValues() {
    const data = {};
    this.el.querySelectorAll("[data-key]").forEach(el => {
      const k = el.dataset.key;
      // Code MỚI (Khuyến khích)
      if (el.tagName === "TEXTAREA") {
        // Luôn giữ nguyên giá trị gốc của textarea, chỉ cần trim() toàn bộ là đủ
        data[k] = el.value.trim();
      } else {
        data[k] = el.value.trim();
      }
    });
    return data;
  }

  /* Cập nhật con số hàng đợi trên nút */
  _updateQueueIndicator() {
    this.el.querySelector("#sr-queue-count").textContent = String(
        this.queue.length);
  }
  _getLoopKey(q) {
    return q.loopKey || (q.text.match(/\$\{(\w+)\}/) || [])[1];
  }

  _render() {
    console.log("🎛 [ScenarioRunner] render UI");
    this.el = document.createElement("div");
    this.el.id = "scenario-runner";
    this.el.classList.add("panel-box");
    this.el.innerHTML = ScenarioRunnerInnerHTML;

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
          /* 🩹 chuyển template về mảng object bảo đảm .map() dùng được  */
        const raw  = this.templates[name] || {};
        const list = Array.isArray(raw)          // kịch bản “cũ”
                   ? raw
                   : (raw.questions || []);      // kịch bản có {group,questions}
        // const list = this.templates[name] || [];
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
    const btnAdd = this.el.querySelector("#sr-addqueue");
    btnAdd.onclick = () => {
      const name = this.el.querySelector("#scenario-select").value;
      if (!name) {
        return alert("Chọn kịch bản trước đã!");
      }

      const startAt = parseInt(
          this.el.querySelector("#step-select").value || "0", 10);
      const values = this._readVariableValues();   // dùng hàm mới
      this.queue.push({name, startAt, values});

      this._refreshQueueUI();                 // hiển thị số hàng đợi
      alert(`✅ Đã thêm bộ biến vào hàng đợi (#${this.queue.length}). Bạn có thể nhập bộ tiếp theo.`);
    };

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

  /* ----------------------------------------------
   * ScenarioRunner – rewritten _start() + helper
   * ----------------------------------------------*/
  /** --------------------------------------------------------------
 *  ScenarioRunner::_start – chạy toàn bộ prompt trong queue
 *  --------------------------------------------------------------
 *  • Tương thích 2 kiểu lưu template:
 *      1) legacy  :  "name": [ {text,type,…}, … ]
 *      2) mới     :  "name": { group:"podcast", questions:[…] }
 *  • Mọi thứ khác (queue, pause, resume…) giữ nguyên
 * ----------------------------------------------------------------*/
async _start() {
  /* 1️⃣  Nếu queue rỗng → lấy cấu hình trên UI hiện tại */
  if (this.queue.length === 0) {
    const name = this.el.querySelector("#scenario-select").value.trim();
    if (!name) return alert("Vui lòng chọn kịch bản.");

    const startAt = parseInt(
      this.el.querySelector("#step-select").value || "0",
      10
    );
    const values = this._readVariableValues();          // 🟢 hàm sẵn có
    this.queue.push({ name, startAt, values });
  }

  /* 2️⃣  Khoá các nút khi bắt đầu chạy */
  this.el.querySelector("#sr-start").disabled   = true;
  this.el.querySelector("#sr-addqueue").disabled = true;
  this.el.querySelector("#sr-pause").disabled    = false;
  this.el.querySelector("#sr-resume").disabled   = true;

  /* 3️⃣  Trải queue thành bigList (danh sách prompt thực tế) */
  const bigList = [];
  for (const job of this.queue) {
    /* --- lấy template, hỗ trợ cả 2 định dạng --- */
    const raw = this.templates[job.name];
    if (!raw) {
      console.warn("⚠️ Template not found:", job.name);
      continue;
    }
    const tplArr = Array.isArray(raw) ? raw           // legacy
                                       : (raw.questions || []); // kiểu mới

    const slice   = tplArr.slice(job.startAt);
    const prompts = this._expandScenario(slice, job.values);   // 🟢 hàm sẵn có
    bigList.push(...prompts);
  }

  /* 4️⃣  Dọn queue & UI */
  this.queue = [];
  this._refreshQueueUI();
  this._updateQueueIndicator();

  if (bigList.length === 0) {
    alert("Không có prompt nào để chạy.");
    this._resetControls();
    return;
  }

  /* 5️⃣  Khởi chạy một mạch với PromptSequencer */
  this.sequencer = new PromptSequencer(
    bigList,
    this._sendPrompt.bind(this),
    this._waitForResponse.bind(this),
    (idx, total) => console.log(`📤 ${idx}/${total} done`),
    "ScenarioRunner"
  );

  // Khi sequencer kết thúc → reset nút
  this.sequencer.start(() => this._resetControls());
}


  /* Helper: khôi phục trạng thái nút sau khi chạy xong hoặc có lỗi */
  _resetControls() {
    this.el.querySelector("#sr-start").disabled = false;
    this.el.querySelector("#sr-addqueue").disabled = false;
    this.el.querySelector("#sr-pause").disabled = true;
    this.el.querySelector("#sr-resume").disabled = true;
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

  /* Cập nhật số đếm & danh sách queue */
  _refreshQueueUI() {
    // Cập nhật số hiển thị trên nút
    this._updateQueueIndicator();

    // Render danh sách
    const listEl = this.el.querySelector("#sr-queue-list");
    listEl.innerHTML = this.queue.map((job, i) => {
      // gộp biến thành chuỗi “key=value”
      const vars = Object.entries(job.values)
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('|') : v}`)
      .join(', ');
      return `<li>#${i + 1} <em>${job.name}</em> (bắt đầu từ ${job.startAt
      + 1}) – <b>${vars}</b></li>`;
    }).join("");
  }

};
