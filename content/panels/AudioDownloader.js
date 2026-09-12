window.AudioDownloader = class extends window.BasePanel {
  constructor(onClose) {
    super({
      id: "audio-downloader",
      title: "Audio Downloader",
      icon: "🎙️",
      onClose: onClose,
      view: window.AudioDownloaderView
    });
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
      this._setupUI();
      this._loadMessages();
    });
  }

  /* ---------- UI ---------- */
  _setupUI() {
    // Set saved voice and format
    this.el.querySelector("#ad-voice").value = this.savedState.voice || 'shade';
    this.el.querySelector("#ad-format").value = this.savedState.format || 'mp3';
    this._updateProgressDisplay();

    // Event listeners
    this.el.querySelector("#ad-voice").onchange = () => this._syncState();
    this.el.querySelector("#ad-format").onchange = () => this._syncState();
    this.el.querySelector("#ad-dlall").onclick = () => {
      ContentHelper.playHapticFeedback?.(8);
      this._downloadAllZip();
    };
    this.el.querySelector("#ad-reset").onclick = () => {
      ContentHelper.playHapticFeedback?.(8);
      this._reset();
    };
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
      wrap.innerHTML = "<div class='text-center py-10' style='color: var(--ch-text-muted); font-size: 11.5px;'>No assistant messages detected.</div>";
      return;
    }

    rows.forEach((msg, idx) => {
      const row = document.createElement("div");
      row.className = "ts-item-row";
      row.dataset.mid = msg.id;

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "ts-item-row__check";
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

      const btnBaseClass = "ts-item-row__btn";
      if (alreadyDownloaded) {
        btn.className = `${btnBaseClass}`;
        btn.style.opacity = '0.6';
        btn.textContent = "✓ Saved";
      } else if (isDownloading) {
        btn.className = `${btnBaseClass} ts-animate-pulse`;
        btn.style.color = "var(--ch-accent)";
        btn.textContent = "Saving…";
      } else {
        btn.className = `${btnBaseClass}`;
        btn.textContent = `Get #${idx + 1}`;
      }

      btn.disabled = alreadyDownloaded || isDownloading;
      btn.onclick = () => {
        ContentHelper.playHapticFeedback?.(8);
        this._download(btn, idx + 1);
      };

      const span = document.createElement("span");
      span.className = "ts-item-row__text";
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
      ContentHelper.showToast('Chọn ít nhất 1 mục để zip', "warning");
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
        ContentHelper.showToast('Zip thất bại: ' + res.error, "error");
      }

      // 6) Phục hồi UI cho nút Download All
      dlAllBtn.textContent = 'Download Done ✓';
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
    location.reload();
  }

  _isBusy() {
    return this.inFlight > 0;
  }

  _getBubbleBadgeInfo() {
    return {
      text: this.inFlight > 0 ? `${this.inFlight}` : '−',
      status: this.inFlight > 0 ? 'running' : 'idle'
    };
  }

  destroy() {
    this._syncState();
    super.destroy();
  }
}