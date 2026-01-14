/********************************************
 * TextSplitter – split & send chunks inline *
 * ------------------------------------------
 * • Shows a floating panel on ChatGPT page
 * • Splits long text by sentence into ≤ charLimit pieces
 * • Lets user send any chunk (or all) sequentially
 * • Re-uses ScenarioRunner’s _sendPrompt / _waitForResponse
 ********************************************/
window.TextSplitter = class {
  /** @param {Function} onClose – callback when panel is destroyed */
  constructor(onClose) {
    console.log("✂️ [TextSplitter] init");
    this.onClose = onClose;
    this.chunks = [];
    this.status = [];      // ← song song chunks: "pending" | "done" | "error"
    this.sequencer = null;

    /* ⬇️  Lấy state trước khi render */
    PanelState.load('TextSplitter', (saved) => {
      // ghép state cũ vào mẫu mặc định ➜ mọi field luôn tồn tại
      const def = {
        text: '', limit: 1000, chunks: [], status: [],
        running: false, paused: false, nextIdx: 0
      };
      this.savedState = Object.assign(def, saved || {});
      this.chunks = [...(this.savedState.chunks || [])];
      this.status = [...(this.savedState.status || [])];
      this._render();
      /* Nếu có dữ liệu cũ thì hiển thị ngay */
      if (this.savedState.text) {
        this._display();                       // vẽ list chunk
        this.el.querySelector('#ts-input').value = this.savedState.text;
        this.el.querySelector('#ts-limit').value = this.savedState.limit;
        this.el.querySelector('#ts-start').disabled = !this.chunks.length;


        // ► Khôi phục nút điều khiển
        const start = this.el.querySelector('#ts-start');
        const pause = this.el.querySelector('#ts-pause');
        const resume = this.el.querySelector('#ts-resume');

        if (saved.running) {
          if (saved.paused) {                  // panel đóng khi đang pause
            start.disabled = true;
            pause.disabled = true;
            resume.disabled = false;
          } else {                             // panel đóng trong khi đang chạy
            start.disabled = true;
            pause.disabled = false;
            resume.disabled = true;
            this._resumeSequencer(saved.nextIdx);   // ⬅ bước 4
          }
        } else {                                 // idle
          start.disabled = !this.chunks.length;
          pause.disabled = true;
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
    this.el.className = "ts-panel panel-box w-[420px] p-4 rounded-xl shadow-2xl bg-white border border-gray-100 flex flex-col relative";
    this.el.style.maxHeight = "640px";

    /** Panel HTML */
    this.el.innerHTML = `
      <div class="ts-title flex items-center mb-4 cursor-move select-none">
        <span class="text-xl mr-2">✂️</span>
        <div>
          <h3 class="m-0 text-base font-bold text-gray-900 leading-tight">Text Splitter</h3>
          <div class="text-[10px] text-gray-500 font-medium tracking-tight">Split long text into manageable chunks</div>
        </div>
      </div>

      <!-- Radio chọn nguồn dữ liệu -->
      <div class="flex gap-2 mb-3 bg-gray-50 p-1 rounded-lg border border-gray-100">
        <label class="flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-all hover:bg-white hover:shadow-sm has-[:checked]:bg-white has-[:checked]:shadow-sm has-[:checked]:text-indigo-600 font-bold text-[10px] text-gray-400">
          <input type="radio" name="ts-input-mode" value="file" checked class="hidden"> 
          <span>📂 Load File</span>
        </label>
        <label class="flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-all hover:bg-white hover:shadow-sm has-[:checked]:bg-white has-[:checked]:shadow-sm has-[:checked]:text-indigo-600 font-bold text-[10px] text-gray-400">
          <input type="radio" name="ts-input-mode" value="text" class="hidden"> 
          <span>✍️ Manual Text</span>
        </label>
      </div>

      <!-- File input -->
      <div id="ts-file-block" class="mb-4">
        <div class="flex items-center gap-2">
          <label class="ts-file-wrapper h-8 px-3 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-all shadow-sm">
            <span>➕</span> Browse .txt
            <input type="file" id="ts-file-input" accept=".txt" class="hidden" />
          </label>
          <span id="ts-file-name" class="text-[10px] text-gray-400 italic truncate flex-1">No file chosen</span>
        </div>
      </div>

      <!-- Textarea input -->
      <textarea id="ts-input" 
        class="ts-textarea w-full h-24 p-2 text-xs border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none resize-y mb-4 hidden"
        placeholder="Paste or type your long text…"></textarea>

      <div class="flex items-center justify-between mb-4 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
        <div class="flex items-center gap-1.5">
          <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Limit:</span>
          <input id="ts-limit" type="number" value="1000" class="w-16 h-7 px-2 text-center text-xs font-bold bg-white border border-gray-300 rounded-lg text-indigo-600 outline-none focus:ring-1 focus:ring-indigo-500/20">
          <span class="text-[9px] font-bold text-gray-300">chars</span>
        </div>
        <button id="ts-split" class="h-7 px-4 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg text-[10px] hover:bg-indigo-100 transition-all active:scale-95 shadow-sm">
          ✂️ Split Text
        </button>
      </div>

      <!-- controls -->
      <div class="grid grid-cols-4 gap-1.5 mb-4">
        <button id="ts-start" class="h-8 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg text-[10px] hover:bg-indigo-100 transition-all active:scale-95 shadow-sm disabled:opacity-30 disabled:pointer-events-none" disabled>
          ▶️ Send All
        </button>
        <button id="ts-pause" class="h-8 bg-white border border-gray-100 text-gray-400 font-bold rounded-lg text-[10px] hover:bg-gray-50 hover:text-gray-600 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none" disabled>
          ⏸ Pause
        </button>
        <button id="ts-resume" class="h-8 bg-white border border-indigo-100 text-indigo-400 font-bold rounded-lg text-[10px] hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none" disabled>
          ▶️ Resume
        </button>
        <button id="ts-reset" class="h-8 bg-white border border-rose-100 text-rose-400 font-bold rounded-lg text-[10px] hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-95">
          🔄 Reset
        </button>
      </div>

      <div class="flex-1 overflow-hidden flex flex-col">
          <div class="flex justify-between items-center mb-2 px-1">
             <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Segments</label>
             <span id="ts-progress-badge" class="hidden text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">Progress: 0%</span>
          </div>
          <div id="ts-results" class="ts-results flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar"></div>
      </div>
    `;

    // Sự kiện thay đổi giữa File / Text
    const radios = this.el.querySelectorAll('input[name="ts-input-mode"]');
    const fileBlock = this.el.querySelector('#ts-file-block');
    const textarea = this.el.querySelector('#ts-input');

    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'file' && radio.checked) {
          fileBlock.classList.remove('hidden');
          textarea.classList.add('hidden');
        } else if (radio.value === 'text' && radio.checked) {
          fileBlock.classList.add('hidden');
          textarea.classList.remove('hidden');
        }
      });
    });

    ChatGPTHelper.mountPanel(this.el);

    /* events */
    this.el.querySelector("#ts-split").onclick = () => this._split();
    this.el.querySelector("#ts-file-input").addEventListener("change", (e) => this._loadFile(e)); // ⬅️ Thêm ở đây

    const btnStart = this.el.querySelector('#ts-start');
    const btnPause = this.el.querySelector('#ts-pause');
    const btnResume = this.el.querySelector('#ts-resume');
    const btnReset = this.el.querySelector('#ts-reset');

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
          this.sequencer?.idx || 0,
          this.sequencer?.paused || false,
          !!this.sequencer
        )
      );
    };
    this.el.querySelector('#ts-input').addEventListener('input', syncState);
    this.el.querySelector('#ts-limit').addEventListener('change', syncState);
  }

  _loadFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    console.log("_loadFile : ", file)

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result.trim();
      this.el.querySelector("#ts-input").value = text;

      // ✅ Cập nhật tên file sau khi load
      this.el.querySelector("#ts-file-name").textContent = file.name;

    };
    reader.readAsText(file);
  }


  _reset() {
    // 1️⃣ Ngưng sequencer nếu đang chạy
    if (this.sequencer) {
      this.sequencer.stop();
      this.sequencer = null;
    }

    // 2️⃣ Xoá dữ liệu trong bộ nhớ
    this.chunks = [];
    this.status = [];

    // 3️⃣ Dọn sạch UI
    this.el.querySelector('#ts-input').value = '';
    this.el.querySelector('#ts-results').innerHTML = '';

    this.el.querySelector('#ts-start').disabled = true;
    this.el.querySelector('#ts-pause').disabled = true;
    this.el.querySelector('#ts-resume').disabled = true;

    // 4️⃣ Xoá cache đã lưu
    PanelState.clear('TextSplitter');

    console.log('🔄 [TextSplitter] reset hoàn tất');
  }

  /* ---------- Split logic ---------- */
  _split() {
    console.log("✂️ [TextSplitter] split text");
    const raw = this.el.querySelector("#ts-input").value.trim();
    const limit = +this.el.querySelector("#ts-limit").value || 1000;

    console.log("✂️ [TextSplitter] split text", limit, "chars");
    if (!raw) {
      ChatGPTHelper.showToast("Please paste some text first!", "warning");
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
    this.status = this.chunks.map(() => 'pending');

    this._display();
    const btnStart = this.el.querySelector('#ts-start');
    const btnPause = this.el.querySelector('#ts-pause');
    const btnResume = this.el.querySelector('#ts-resume');
    btnStart.disabled = this.chunks.length === 0;
    btnPause.disabled = true;
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
      const row = document.createElement("div");
      row.className = "bg-gray-50 border border-gray-100 rounded-lg p-2.5 hover:bg-white hover:shadow-sm transition-all group";

      const btn = document.createElement("button");
      btn.className = "ts-send-btn h-6 px-2.5 text-[10px] font-bold rounded-lg transition-all active:scale-95 shadow-sm border-none cursor-pointer flex items-center gap-1.5 mb-2";

      const isDone = this.status[idx] === 'done';
      const isError = this.status[idx] === 'error';

      if (isDone) {
        btn.className += " bg-emerald-50 text-emerald-600";
        btn.disabled = true;
        btn.textContent = `✅ Done #${idx + 1}`;
      } else if (isError) {
        btn.className += " bg-rose-50 text-rose-600";
        btn.disabled = false;
        btn.textContent = `⚠️ Error #${idx + 1}`;
      } else {
        btn.className += " bg-white border border-gray-200 text-gray-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600";
        btn.textContent = `Send #${idx + 1}`;
      }

      btn.onclick = () => this._copySegment(idx, btn);

      // preview paragraph
      const preview = document.createElement("p");
      preview.className = "text-[11px] text-gray-400 leading-snug group-hover:text-gray-700 font-medium";
      preview.textContent =
        chunk.length > 120
          ? `${chunk.slice(0, 80)} … ${chunk.slice(-40)}`
          : chunk;

      row.append(btn, preview);
      wrap.appendChild(row);
    });

    // Cập nhật badge tiến độ
    const badge = this.el.querySelector("#ts-progress-badge");
    if (badge && this.chunks.length) {
      const doneCount = this.status.filter(s => s === 'done').length;
      const percent = Math.round((doneCount / this.chunks.length) * 100);
      badge.textContent = `Progress: ${percent}%`;
      badge.classList.remove('hidden');
    }
  }

  /* ---------- Send a single chunk ---------- */
  async _copySegment(idx, btn) {
    console.log("🔄 [TextSplitter] copy segment", idx);
    btn.disabled = true;
    btn.textContent = "Sending…";

    try {
      await this._sendPrompt(this.chunks[idx]);
      await this._waitForResponse();

      // --- THÀNH CÔNG ---
      btn.textContent = `✅ Done #${idx + 1}`;
      this.status[idx] = "done";

    } catch (err) {
      // --- THẤT BẠI ---
      console.error("[TextSplitter] send error:", err);
      btn.disabled = false;          // cho phép gửi lại
      btn.textContent = "⚠️ Error";
      this.status[idx] = "error";
    }

    /* Dù thành công hay lỗi đều lưu lại state */
    PanelState.save("TextSplitter",
      this._currentState(
        this.sequencer ? this.sequencer.idx : 0,
        this.sequencer ? this.sequencer.paused : false,
        !!this.sequencer                        // PATCH: thêm tham số thứ 3 = running
      )
    );
  }

  /* ---------- Send ALL chunks sequentially ---------- */
  _sendAll() { this._startSend(); }


  _startSend() {
    if (!this.chunks.length) {
      ChatGPTHelper.showToast("No chunks – bấm Split trước đã!", "warning");
      return;
    }

    const btnStart = this.el.querySelector('#ts-start');
    const btnPause = this.el.querySelector('#ts-pause');
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
        const real = todo[idx - 1].i;  // chỉ số gốc
        const rowBtn = this.el.querySelectorAll('.ts-send-btn')[real];
        if (rowBtn) { rowBtn.disabled = true; rowBtn.textContent = `✅ Done #${idx + 1}`; }
        this.status[real] = 'done';      // <– cập nhật trạng thái

        PanelState.save('TextSplitter', this._currentState(real + 1, false, true));

        if (idx === todo.length) {       // <– so với todo
          btnPause.disabled = true;
          btnResume.disabled = true;
          btnStart.disabled = false;
          this.sequencer = null;
          PanelState.save('TextSplitter', this._currentState(0, false, false));
        }
      },
      "TextSplitter"
    );

    // Lưu & cập nhật UI
    PanelState.save('TextSplitter', this._currentState(0, false, true));
    btnStart.disabled = true;
    btnPause.disabled = false;
    btnResume.disabled = true;

    this.sequencer.start();
  }


  _currentState(nextIdx = 0, paused = false, running = false) {
    return {
      text: this.el.querySelector('#ts-input').value,
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
      .map((c, i) => ({ c, i }))
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
          rowBtn.textContent = `✅ Done #${idx + 1}`;
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
          );
        }
      },
      "_resumeSequencer"
    );
    btnStart.disabled = true;
    btnPause.disabled = false;
    btnResume.disabled = true;
    PanelState.save('TextSplitter', this._currentState(startIdx, false, true));
    this.sequencer.start();
  }
  /* ---------- Re-use ScenarioRunner helpers ---------- */
  _sendPrompt(text) {
    const prefixed = `Repeat this text, this is important for me, please. Your reply must only the text: [${text}]`;
    return ScenarioRunner.prototype._sendPrompt.call(this, prefixed);
  }

  // 🎯 Alias hàm đợi nút để ScenarioRunner._sendPrompt dùng được
  _waitForResponse = ScenarioRunner.prototype._waitForResponse;
  _waitForAdapterBtn = ScenarioRunner.prototype._waitForAdapterBtn;
  _waitForElement = ScenarioRunner.prototype._waitForAdapterBtn;  // alias phụ (tuỳ dùng)

  _isBusy() {
    return !!this.sequencer && !this.sequencer.stopped;
  }

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