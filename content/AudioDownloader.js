/*********************************************
 * AudioDownloader – download TTS audio *
 *********************************************/
window.AudioDownloader = class {
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
    this.el.className = "panel-box ts-panel w-[460px] p-6 rounded-2xl shadow-2xl bg-white border border-gray-100 flex flex-col";
    this.el.style.maxHeight = "600px";

    this.el.innerHTML = `
      <div class="ts-title flex items-center mb-5 cursor-move select-none">
        <span class="text-2xl mr-3">🎵</span>
        <div>
          <h3 class="m-0 text-lg font-bold text-gray-900 leading-tight">Audio Downloader</h3>
          <div id="srt-status-text" class="text-xs text-gray-500 mt-0.5">TTS Audio Generator</div>
        </div>
      </div>

      <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-5">
        <div class="flex gap-3 mb-4">
          <div class="flex-1">
            <label class="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Voice Model</label>
            <select id="ad-voice" class="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all">
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
          </div>
          <div class="w-24">
            <label class="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Format</label>
            <select id="ad-format" class="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all">
              <option value="mp3">mp3</option>
              <option value="aac">aac</option>
            </select>
          </div>
        </div>

        <div class="flex gap-2">
          <button id="ad-dlall" class="flex-[2] h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition-all active:scale-95 shadow-sm">
            Download All
          </button>
          <button id="ad-reset" class="flex-1 h-10 bg-white border border-rose-200 text-rose-500 font-bold rounded-lg text-xs hover:bg-rose-50 transition-all active:scale-95">
            🔄 Reset
          </button>
        </div>
      </div>

      <div class="flex justify-between items-center mb-3">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" id="ad-select-all" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
          <span class="text-[13px] text-gray-600 font-semibold">Select all messages</span>
        </label>
        <div id="ad-progress" class="text-[11px] font-bold text-indigo-600 animate-pulse"></div>
      </div>

      <div id="ad-list" class="ts-results flex-1 overflow-y-auto pr-1 bg-white rounded-xl border border-gray-50 p-2 custom-scrollbar"></div>
    `;

    ChatGPTHelper.mountPanel(this.el);
    ChatGPTHelper.makeDraggable(this.el, ".ts-title");
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());

    // Set saved voice and format
    this.el.querySelector("#ad-voice").value = this.savedState.voice || 'shade';
    this.el.querySelector("#ad-format").value = this.savedState.format || 'mp3';
    this._updateProgressDisplay();

    // Event listeners
    this.el.querySelector("#ad-voice").onchange = () => this._syncState();
    this.el.querySelector("#ad-format").onchange = () => this._syncState();
    this.el.querySelector("#ad-dlall").onclick = () => this._downloadAllZip();
    this.el.querySelector("#ad-reset").onclick = () => this._reset();
    this.el.querySelector("#ad-select-all").onchange = (e) => this._toggleAll(e.target.checked);
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
          .sort((a, b) => a.message.create_time - b.message.create_time)
          .map(m => ({
            id: m.message.id,
            text: m.message.content.parts[0].slice(0, 80) + "…"
          }));

        this._renderRows(msgs);
      }
    );
  }

  /* Trả về button của messageId nếu panel đang mở, hoặc null */
  _getBtnById(id) {
    return this.el
      ? this.el.querySelector(`#ad-list button[data-mid="${id}"]`)
      : null;
  }


  _renderRows(rows) {
    const wrap = this.el.querySelector("#ad-list");
    wrap.innerHTML = "";

    if (!rows.length) {
      wrap.innerHTML = "<div class='text-center py-10 text-gray-400 text-sm'>No assistant messages detected.</div>";
      return;
    }

    rows.forEach((msg, idx) => {
      const row = document.createElement("div");
      row.className = "flex items-center gap-3 p-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors rounded-lg group";
      row.dataset.mid = msg.id;

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer";
      cb.checked = this.savedState.selected[msg.id] ?? true;
      cb.onchange = () => this._syncState();

      const btn = document.createElement("button");
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

      const btnBaseClass = "h-8 px-3 text-[11px] font-bold rounded-lg transition-all active:scale-95 shadow-sm flex-shrink-0 w-28";
      if (alreadyDownloaded) {
        btn.className = `${btnBaseClass} bg-gray-100 text-gray-500 cursor-default`;
        btn.textContent = "✅ Downloaded";
      } else if (isDownloading) {
        btn.className = `${btnBaseClass} bg-indigo-50 text-indigo-600 animate-pulse cursor-wait`;
        btn.textContent = "Downloading…";
      } else {
        btn.className = `${btnBaseClass} bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600`;
        btn.textContent = `Download #${idx + 1}`;
      }

      btn.disabled = alreadyDownloaded || isDownloading;
      btn.onclick = () => this._download(btn, idx + 1);

      const span = document.createElement("span");
      span.className = "text-[11px] text-gray-500 truncate group-hover:text-gray-900";
      span.textContent = msg.text;

      row.append(cb, btn, span);
      wrap.appendChild(row);
    });

    this._updateProgressDisplay();
  }

  _download(btn, ordinal) {
    console.log("start download: #", ordinal, btn)
    const row = btn.parentElement;
    const msgId = row.dataset.mid;
    const { conversationId, requestHeaders } = this.data;
    const voice = this.el.querySelector("#ad-voice").value;
    const format = this.el.querySelector("#ad-format").value;

    btn.disabled = true;
    btn.textContent = "Downloading…";
    this.savedState.downloading.push(msgId);
    this.inFlight = this.savedState.downloading.length;
    this._updateProgressDisplay();

    chrome.runtime.sendMessage({
      action: "downloadAudio",
      indexCell: ordinal,
      conversationId: conversationId,
      messageId: msgId,
      requestHeaders: requestHeaders,
      selectedVoice: voice,
      format: format
    }, (res) => {
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

  _updateProgressDisplay() {
    const box = this.el.querySelector("#ad-progress");
    box.textContent = this.inFlight
      ? `🔊 Downloading… (${this.inFlight})`
      : "";
  }

  _syncState() {
    console.log("[TextSplitter] sync state : ", this.el.querySelector("#ad-voice").value);
    const selected = {};
    this.el.querySelectorAll("#ad-list > div").forEach(row => {
      const mid = row.dataset.mid;
      const cb = row.querySelector("input[type=checkbox]");
      selected[mid] = cb.checked;
    });

    this.savedState.voice = this.el.querySelector("#ad-voice").value;
    this.savedState.format = this.el.querySelector("#ad-format").value;

    PanelState.save('AudioDownloader', {
      voice: this.savedState.voice,
      format: this.savedState.format,
      downloaded: this.savedState.downloaded || [],
      downloading: this.savedState.downloading || [],
      selected: selected
    });
  }

  _downloadAll() {
    const rows = Array.from(
      this.el.querySelectorAll("#ad-list > div")
    ).filter(r => r.querySelector("input").checked);

    rows.forEach((row, i) => {
      setTimeout(() => row.querySelector("button").click(), i * 400);
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
      action: 'downloadAudioZip',
      messageIds: ids,
      conversationId: this.data.conversationId,
      requestHeaders: this.data.requestHeaders,
      selectedVoice: this.savedState.voice,
      format: this.savedState.format
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
      dlAllBtn.className = dlAllBtn.className.replace('bg-indigo-600', 'bg-emerald-600');
    });
  }



  _toggleAll(state) {
    this.el.querySelectorAll("#ad-list input[type=checkbox]")
      .forEach(cb => cb.checked = state);
    this._syncState();
  }

  _reset() {
    this.savedState.downloaded = [];
    this.savedState.downloading = [];
    this.savedState.selected = {};
    this.inFlight = 0;

    PanelState.clear('AudioDownloader');
    this._renderRows([]);
    this._updateProgressDisplay();
    location.reload();  // 👈 Thêm dòng này để refresh trang
  }

  destroy() {
    this._syncState();
    this.el?.remove();
    this.onClose?.();
  }
}