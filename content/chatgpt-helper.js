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

    this.chatSitAdapter = new ChatSiteAdapter();
    if (!this.chatSitAdapter) {
      console.warn("⚠️ No adapter for this site – helper disabled");
      return;
    }

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
    const chatForm = this.chatSitAdapter.getForm();
    if (!chatForm || chatForm.querySelector("#chatgpt-helper-button")) return;

    console.log("✨ [ChatGPTHelper] Inserting helper buttons");
    const container = document.createElement("div");
    container.id = "chatgpt-helper-button-container";

    const btnBuilder = this._createButton({
      id: "chatgpt-helper-button",
      text: "🛠 Quản lý kịch bản",
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

    const btnCopyContent = this._createButton({
      id: "chatgpt-copy-content-button",
      text: "📋 Copy Content",
      className: "scenario-btn btn-tool",
      onClick: () => this._toggleContentCopyPanel(),
    });

    //append vào container theo thứ tụ
    container.append(btnBuilder);
    container.append(btnRunner);
    container.append(btnCopyContent);
    container.append(btnSplitter);
    container.append(btnAudio);

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

  _toggleContentCopyPanel() {
  if (this.contentCopyPanel) {
    this.contentCopyPanel.destroy();
    this.contentCopyPanel = null;
    return;
  }
  this.contentCopyPanel = new ContentCopyPanel(() => (this.contentCopyPanel = null));
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

    let bar = document.getElementById('chatgpt-helper-panel-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'chatgpt-helper-panel-bar';
      document.body.appendChild(bar);
    }

    bar.appendChild(el);

    const handle = el.querySelector('.sb-title, .sr-header, .ts-title');
    if(handle){
      handle.style.userSelect = 'none';
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

    /* 👇  thêm vào cuối class */
  destroy() {
    console.log("❌ [ChatGPTHelper] destroy");
    // ngắt quan sát
    this._observer?.disconnect();
    // gỡ khung nút nếu còn
    document.getElementById('chatgpt-helper-button-container')?.remove();
  }
}

// content.js
chrome.runtime.onMessage.addListener((req) => {
  if (req.action === 'show_buttons') {
    showButtons();
    _downloadFromFirestore();
  }
  if (req.action === 'hide_buttons') {
    hideButtons();
    chrome.storage.local.remove('scenarioTemplates');
  }
});

function _downloadFromFirestore() {
    console.log("☁️ [ScenarioBuilder] download from Firestore");
    chrome.storage.local.get("google_user_email", async (items) => {
      const userId = items.google_user_email;

      if (!userId) {
        alert("⚠️ Bạn chưa đăng nhập Google, không thể tải từ Firestore.");
        return;
      }

      const helper = new FirestoreHelper(firebaseConfig);
      try {
        const data = await helper.loadUserConfig(userId);
        if (data) {
          chrome.storage.local.set({scenarioTemplates: data}, () => {
            console.log("✅ Tải thành công từ Firestore");
          });
        } else {
        }
      } catch (err) {
        console.error(err);
        alert("❌ Lỗi khi tải từ Firestore.");
      }
    });
  }


// ❶  auto‑check ngay khi trang / script được load
chrome.storage.local.get('gg_access_token', data => {
  if (data.gg_access_token) {
    showButtons();
    _downloadFromFirestore();
  }
});

function showButtons() {
  if (window.__helperInjected) return;       // đã có → thoát
  window.__helperInjected = new ChatGPTHelper();
}

function hideButtons() {
  if (!window.__helperInjected) return;      // chưa hiển thị

  // hủy panel con (nếu còn mở)
  const h = window.__helperInjected;
  h.builder        ?.destroy?.();
  h.runner         ?.destroy?.();
  h.splitter       ?.destroy?.();
  h.audioDownloader?.destroy?.();

  // ngắt observer & xóa khung nút
  h.destroy();                               // ⬅️ gọi hàm mới

  window.__helperInjected = null;            // reset flag
}

