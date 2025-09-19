// ChatAdapters.js – one class per site, OOP‑style
// -----------------------------------------------------------------------------
// Put this single file in your `content/` folder and list it first inside the
// `js` array of each `content_scripts` block.  It attaches **window.ChatAdapter**
// (an *instance*, already initialised for the current host) or `null` if the
// site isn’t supported yet.
//
// ▶️  Usage in any other content‑script
// -----------------------------------------------------------------------------
//   const chat = window.ChatAdapter;
//   if (!chat) { /* optional fallback */ }
//   chat.getTextarea().value = "Hello";
//   chat.getSendBtn()?.click();
// ----------------------------------------------------------------------------

  // Các button chung (dùng cho mọi adapter)
  BUTTONS = {
    MANAGE_SCENARIO: {
      id: "chatgpt-helper-button",
      text: "🛠 Quản lý kịch bản",
      className: "scenario-btn btn-setup",
      onClick: () => window.__helperInjected?._toggleBuilder(),
    },
    RUN_SCENARIO: {
      id: "chatgpt-run-button",
      text: "📤 Chạy kịch bản",
      className: "scenario-btn btn-run",
      onClick: () => window.__helperInjected?._toggleRunner(),
    },
    COPY_CONTENT: {
      id: "chatgpt-copy-content-button",
      text: "📋 Copy Content",
      className: "scenario-btn btn-tool",
      onClick: () => window.__helperInjected?._toggleContentCopyPanel(),
    },
    SPLITTER: {
      id: "chatgpt-splitter-button",
      text: "✂️ Text Split",
      className: "scenario-btn btn-tool",
      onClick: () => window.__helperInjected?._toggleSplitter(),
    },
    AUDIO: {
      id: "chatgpt-audio-button",
      text: "🎵 Audio",
      className: "scenario-btn btn-tool",
      onClick: () => window.__helperInjected?._toggleAudioDownloader(),
    },
    AI_STUDIO_SETTINGS: {
      id: "chatgpt-aistudio-settings-button",
      text: "⚙️ AI Studio Settings",
      className: "scenario-btn btn-tool",
      onClick: () => window.__helperInjected?._toggleAIStudioSettings(),
    },
  };
/* ---------------------------  Base (Abstract)  --------------------------- */
class BaseChatAdapter {
  constructor() {
    console.log("👨 BaseChatAdapter constructed")
    if (new.target === BaseChatAdapter) {
      throw new TypeError("BaseChatAdapter is abstract – use a subclass");
    }
  }

  /** Convenience DOM query (shadow‑dom‑safe extension point) */
  _q(sel) {
    return document.querySelector(sel);
  }

  /* ---- Mandatory interface (override in subclass) ---- */
  getTextarea() { return null; }
  getContentElements(){ return null; }
  getSendBtn()  { return null; }
  isDone()  { return null; }

  /* ---- Optional interface (override if the site supports it) ---- */
  getForm()     { return this.getTextarea() }
  getStopBtn()  { return null; }
  getVoiceBtn() { return null; }

  /* ---- Convenience helpers (shared across all adapters) ---- */
  sendMessage(text) {
    const ta = this.getTextarea();
    if (!ta) return false;
    ta.value = text;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    this.getSendBtn()?.click();
    return true;
  }

  stopGeneration() { this.getStopBtn()?.click(); }

  /* ---- Static matcher – each subclass MUST implement ---- */
  static matches(/* hostname */) { return false; }



  // Hàm mặc định trả về danh sách button cần dùng (chỉ có 3 button chung)
  getButtonConfigs() {
    return [
      BUTTONS.MANAGE_SCENARIO,
      BUTTONS.RUN_SCENARIO,
      BUTTONS.COPY_CONTENT,
    ];
  }

  // Hàm chèn button (dùng chung cho mọi adapter)
  insertHelperButtons() {
    if (document.querySelector('#chatgpt-helper-button-container')) return; // Đã tồn tại
    const chatForm = this.getForm();
    if (!chatForm) {
      return;
    }

    const container = document.createElement("div");
    container.id = "chatgpt-helper-button-container";

    // Lấy danh sách button từ lớp con
    const buttons = this.getButtonConfigs();

    // Tạo button từ config
    buttons.forEach(config => {
      const btn = this._createButton(config);
      container.appendChild(btn);
    });

    chatForm.after(container);
  }

  // Helper method để tạo button
  _createButton({ id, text, className, onClick }) {
    const btn = document.createElement("button");
    btn.id = id;
    btn.textContent = text;
    btn.className = className;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }
}

/* -----------------------------  ChatGPT.com  ----------------------------- */
class ChatGPTAdapter extends BaseChatAdapter {
  static matches(host) {
    return /(?:chat\.openai|chatgpt)\.com$/i.test(host);
  }

  getTextarea() {
    return this._q("#prompt-textarea")
  }
  getSendBtn()  { return this._q('button[aria-label="Send prompt"]'); }
  getStopBtn()  { return this._q('button[aria-label="Stop generating"]'); }
  getVoiceBtn() { return this._q('button[aria-label="Start voice mode"]'); }

  isDone() {
    const stopBtn = this.getStopBtn();
    const sendBtn = this.getSendBtn();
    const voiceBtn = this.getVoiceBtn();
    const done = (!stopBtn && sendBtn && sendBtn.disabled) || (!stopBtn
        && voiceBtn);
    return done;
  }
  getForm() {
    return this.getTextarea()?.closest("form") ?? null;
  }

  getContentElements(){
    return Array.from(document.getElementsByClassName(
        'markdown prose dark:prose-invert w-full break-words'));
  }


  // Trả về danh sách button cần dùng (3 chung + 2 đặc thù)
  getButtonConfigs() {
    return [
      ...super.getButtonConfigs(), // 3 button chung
      BUTTONS.SPLITTER,
      BUTTONS.AUDIO,
    ];
  }
}

/* ----------------------------  DeepSeek.com  ----------------------------- */
class DeepSeekAdapter extends BaseChatAdapter {
  countDivContent = 0;
  timesCheckDone = 0;
  static matches(host) { return /deepseek\.com$/i.test(host); }

  constructor() {
    super();
    const elementHTMLCollectionOf = document.getElementsByClassName('ds-markdown ds-markdown--block');
    this.countDivContent = elementHTMLCollectionOf.length;
  }
  getTextarea () {
    // phần tử nhập chat duy nhất của DeepSeek
    return this._q('textarea#chat-input');
  }
  getSendBtn () {
    const root = this.getForm();
    if (!root) return null;

    /* trong root có nhiều [role="button"]; send-btn luôn là PHẦN TỬ CUỐI
       có thuộc tính aria-disabled (true/false).  Chọn nút đó để click. */
    const btns = [...root.querySelectorAll('[role="button"][aria-disabled]')];
    const btn  = btns.at(-1) || null;     // nút cuối là Send

    // Bọc thuộc tính disabled để ScenarioRunner đọc được
    if (btn && btn.disabled === undefined) {
      Object.defineProperty(btn, 'disabled', {
        get() { return btn.getAttribute('aria-disabled') === 'true'; },
        configurable: true
      });
    }
    return btn;
  }

  getStopBtn() {
    const root = this.getForm();
    if (!root) {
      return null;
    }

    // tìm phần tử có icon _480132b rồi leo lên button
    const icon = root.querySelector('div._480132b');
    const btn = icon ? icon.closest('[role="button"]') : null;

    // bọc thuộc tính disabled (dựa trên aria-disabled) cho đồng nhất API
    if (btn && btn.disabled === undefined) {
      Object.defineProperty(btn, 'disabled', {
        get() {
          return btn.getAttribute('aria-disabled') === 'true';
        },
        configurable: true
      });
    }
    return btn;
  }  // DeepSeek places everything inside a <form>; inherit default getForm()

  isDone() {
      console.log('check isDone times: ', this.timesCheckDone);
      const elementHTMLCollectionOf = document.getElementsByClassName('ds-markdown ds-markdown--block');
      if(this.countDivContent + 1 === elementHTMLCollectionOf.length) {
        this.countDivContent ++;
        console.log('isDone return true', this.countDivContent);
        return true;
      }
    console.log('isDone return false')
    return false;
  }

  /** Trả về DIV cách textare 3 tầng – KHÔNG dùng class cố định */
  getForm() {
    let el = this.getTextarea();
    for (let i = 0; i < 3 && el; i++) {
      // nhảy tới DIV cha liền kề
      do { el = el.parentElement; } while (el && el.tagName !== 'DIV');
    }
    return el ?? null;                       // null nếu không tìm được
  }
}

/* ----------------------------  qwen.ai  ----------------------------- */
class QwenAdapter extends BaseChatAdapter {
  /** Khớp domain Qwen */
  static matches (host) { return /(?:qwen\.ai)$/i.test(host); }

  /** Ô nhập prompt */
  getTextarea () {
    return this._q('#chat-input');
  }

  /** Nút GỬI – luôn có id cố định */
  getSendBtn () {
    return this._q('#send-message-button');
  }

  /** Nút STOP khi đang sinh lời đáp */
  getStopBtn () {
    // Qwen không đặt id, nhưng icon bên trong có class "icon-StopIcon"
    const icon = this._q('button i.icon-StopIcon');
    return icon ? icon.closest('button') : null;
  }

  /**
   * Hoàn tất sinh nội dung khi:
   *   – KHÔNG còn nút stop, và
   *   – Nút send tồn tại & đang disabled
   */
  isDone () {
    const stopBtn = this.getStopBtn();
    const sendBtn = this.getSendBtn();
    return !stopBtn && sendBtn && sendBtn.disabled;
  }

  /** Form bao quanh textarea (dùng để submit) */
  getForm () {
    return this._q('.chat-message-input-container-inner');
  }

  /** Phần HTML chứa nội dung phản hồi của bot (markdown) */
  getContentElements () {
    /* 1️⃣ Mỗi message của Qwen bọc trong .response-message-body  */
    /* 2️⃣ Phần markdown luôn nằm trong .markdown-content-container / .markdown-prose */
    /* 3️⃣ Mỗi khối còn có id #response-content-container (lặp lại)                  */
    return Array.from(document.querySelectorAll(
      '.response-message-body .markdown-content-container,' +  // phần mới nhất
      '.response-message-body .markdown-prose,' +              // fallback
      '#response-content-container'                            // id (không unique)
    ));
  }
}

/* -----------------------------  Grok (x.ai)  ----------------------------- */
class GrokAdapter extends BaseChatAdapter {
  /** Khớp các domain Grok thường gặp trên web-app */
  static matches (host) {
    /*  grok.com  |  grok.x.ai  |  x.com (grok sub-page)  */
    return /(?:^|\.)grok\.com$|(?:^|\.)grok\.x\.ai$|^x\.com$/i.test(host);
  }

  /* ── Các selector chính ──────────────────────────────────────────────── */

  /** Ô nhập prompt – duy nhất có aria-label như sau */
  getTextarea () {
    return this._q('textarea[aria-label="Ask Grok anything"]');
  }

  /** Nút SEND (submit) nằm trong form, có aria-label="Submit" */
  getSendBtn () {
    const btn = this._q('form button[type="submit"][aria-label="Submit"]');
    return btn;
  }

  /** Nút STOP hiển thị khi Grok đang sinh đáp án (nếu có) */
  getStopBtn () {
    /* Grok hiện dùng cùng văn phạm với ChatGPT: aria-label="Stop generating" */
    return this._q('button[aria-label="Stop generating"]');
  }

  /** Form bao quanh textarea */
  getForm () {
    return this.getTextarea()?.closest('form') ?? null;
  }

  /** Xác định đã sinh xong trả lời hay chưa */
  isDone () {
    const stopBtn = this.getStopBtn();
    const sendBtn = this.getSendBtn();

    /* Khi đang generate: có stopBtn.
       Khi xong: stopBtn biến mất, sendBtn tồn tại & disabled (textarea rỗng). */
    return !stopBtn && sendBtn && sendBtn.disabled;
  }

  /** Trả về các khối markdown chứa phản hồi của bot */
  getContentElements () {
    /* Grok render markdown trong .markdown-content-container / .markdown-prose */
    return Array.from(document.querySelectorAll(
        '.markdown-content-container, .markdown-prose'
    ));
  }
}


/* -----------------------------  Google AI Studio (Hybrid Version with Auto-Set) ----------------------------- */
class GoogleAIStudioAdapter extends BaseChatAdapter {
  static matches(host) {
    return /aistudio.google.com$/i.test(host);
  }

  constructor() {
    super();
    this.isSpeechPage = window.location.pathname.includes('/generate-speech');
    console.log(`✅ GoogleAIStudioAdapter khởi tạo. Đang ở trang Speech: ${this.isSpeechPage}`);

    // === ĐIỂM THAY ĐỔI QUAN TRỌNG ===
    // Nếu đang ở trang Speech, gọi hàm triggerAutoSet ngay lập tức
    if (this.isSpeechPage) {
      // Đợi một chút để đảm bảo trang đã tải xong hoàn toàn
      setTimeout(() => {
        window.GoogleAIStudioPanel.triggerAutoSet();
      }, 1500); // Đợi 1.5 giây
    }
  }

  // Các hàm còn lại (insertHelperButtons, getForm, getButtonConfigs, etc.)
  // GIỮ NGUYÊN NHƯ PHIÊN BẢN TRƯỚC.
  // Bạn có thể copy-paste lại toàn bộ phần bên dưới từ câu trả lời trước của tôi.

  // =================================================================
  // LOGIC CHUNG CHO CẢ HAI TRANG
  // =================================================================

  insertHelperButtons() {
    if (this.isSpeechPage) {
      this.insertSpeechPageButton();
    } else {
      super.insertHelperButtons();
    }
  }

  // =================================================================
  // LOGIC RIÊNG CHO TRANG SPEECH (/generate-speech)
  // =================================================================

  insertSpeechPageButton() {
    if (document.getElementById('chatgpt-helper-aistudio-speech-settings')) return;
    const container = document.createElement("div");
    container.id = "chatgpt-helper-button-container";
    Object.assign(container.style, {
      position: 'fixed', bottom: '20px', left: '20px', zIndex: '2147483647',
    });
    const btn = this._createButton({
      id: 'chatgpt-helper-aistudio-speech-settings', text: "⚙️ Settings",
      className: 'scenario-btn btn-tool',
      onClick: () => window.__helperInjected?._toggleAIStudioSettings(),
    });
    Object.assign(btn.style, {
      padding: '12px 20px', borderRadius: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    });
    container.appendChild(btn);
    document.body.appendChild(container);
  }

  // =================================================================
  // LOGIC RIÊNG CHO CÁC TRANG CHAT KHÁC
  // =================================================================

  getForm() {
    return this.isSpeechPage ? null : this._q('div.prompt-input-wrapper-container');
  }
  getTextarea() {
    return this.isSpeechPage ? null : this._q('textarea[aria-label="Start typing a prompt"]');
  }
  getSendBtn() {
    return this.isSpeechPage ? null : this._q('button[aria-label="Run"]');
  }
  getStopBtn() {
    return this.isSpeechPage ? null : (this._q('button[aria-label="Stop"]') || this._q('button[aria-label="Cancel"]'));
  }
  isDone() {
    return this.isSpeechPage ? true : !this.getStopBtn();
  }
  getContentElements() {
    return this.isSpeechPage ? [] : Array.from(document.querySelectorAll('div.output-chunk'));
  }
  getButtonConfigs() {
    if (this.isSpeechPage) return [];
    return [
      BUTTONS.AI_STUDIO_SETTINGS, BUTTONS.MANAGE_SCENARIO,
      BUTTONS.RUN_SCENARIO,
    ];
  }
}
// ... (code của các class adapter khác) ...

/* ------------------------- YouTube Studio Adapter (Original Logic + Dynamic Config) ------------------------- */
/* ------------------------- YouTube Studio Adapter (Final, Safe Integration) ------------------------- */
class YoutubeStudioAdapter extends BaseChatAdapter {
  static matches(host) {
    return /studio\.youtube\.com$/i.test(host);
  }

  constructor() {
    super();
    console.log("✅ YoutubeStudioAdapter được khởi tạo");
    // Chờ một chút để UI của Youtube Studio ổn định rồi mới chèn nút
    setTimeout(() => this.insertHelperButtons(), 2000);
  }

  // Các phương thức trừu tượng không cần thiết
  getTextarea() { return null; }
  getSendBtn()  { return null; }
  isDone()      { return true; }

  /**
   * Chèn các nút vào trang.
   */
  insertHelperButtons() {
    if (document.getElementById('helper-config-languages')) return;

    const addLanguageButton = this._q('#add-translations-button');
    if (!addLanguageButton) {
      console.warn("Không tìm thấy nút 'Add language'. Thử lại...");
      setTimeout(() => this.insertHelperButtons(), 1000);
      return;
    }

    const container = addLanguageButton.parentElement;
    if (!container) return;

        const youtubeStudioPanel = new window.YoutubeStudioPanel(this);

    // Nút Cấu hình
    const configButton = this._createButton({
      id: 'helper-config-languages',
      text: '⚙️ Configure',
      className: 'style-scope ytcp-button',
      onClick: () => {
        console.log("click ⚙️ Configure")
        // Điều này đảm bảo window.YoutubeStudioPanel đã tồn tại.
        console.log("togglePanel")
        youtubeStudioPanel.togglePanel();
      }
    });
    configButton.style.marginLeft = '10px';

    // Nút Chạy
    const runButton = this._createButton({
      id: 'helper-add-my-languages',
      text: '🌐 Add Languages',
      className: 'style-scope ytcp-button',
      onClick: () => this.addMyLanguages()
    });
    runButton.style.marginLeft = '10px';
    runButton.style.backgroundColor = '#c00';
    runButton.style.color = 'white';

    // Chèn cả hai nút
    container.appendChild(configButton);
    container.appendChild(runButton);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logic chính để tự động thêm các ngôn ngữ.
   */
  async addMyLanguages() {
    const addLanguageBtn = this._q('#add-translations-button');
    if (!addLanguageBtn) {
      alert("Không thể tìm thấy nút 'Add language'!");
      return;
    }

    // Key để đọc từ storage
    const storageKey = 'youtube_subtitle_languages';

    chrome.storage.local.get([storageKey], async (result) => {
        const LANGUAGES_TO_ADD = result[storageKey] || [];

        if (LANGUAGES_TO_ADD.length === 0) {
            alert('No languages configured. Click "⚙️ Configure" to select languages.');
            return;
        }

        console.log(`Bắt đầu thêm ${LANGUAGES_TO_ADD.length} ngôn ngữ...`);

      const AWAIT_MS = 100;
      for (const langName of LANGUAGES_TO_ADD) {
          addLanguageBtn.click();
          await this.sleep(AWAIT_MS);

          const allItems = document.querySelectorAll('tp-yt-paper-item .item-text');
          let foundItem = null;

          for (const item of allItems) {
            if (item.textContent.trim().toLowerCase() === langName.toLowerCase()) {
              const clickableParent = item.closest('tp-yt-paper-item');
              if (clickableParent && !clickableParent.hasAttribute('disabled')) {
                foundItem = clickableParent;
                break;
              } else {
                foundItem = 'DISABLED';
                document.body.click();
                break;
              }
            }
          }

          if (foundItem && foundItem !== 'DISABLED') {
            foundItem.click();
            await this.sleep(AWAIT_MS);
          } else if (!foundItem) {
            document.body.click();
            await this.sleep(AWAIT_MS);
          }
        }
        alert("Đã thêm xong các ngôn ngữ đã cấu hình!");
    });
  }
}

/* -----------------------  Adapter Factory (runtime)  ---------------------- */
const ADAPTER_CTORS = [
  ChatGPTAdapter,
  DeepSeekAdapter,
  QwenAdapter,
  GrokAdapter,
  GoogleAIStudioAdapter,
  YoutubeStudioAdapter // <-- THÊM ADAPTER MỚI VÀO ĐÂY
];

// --- DÁN ĐOẠN NÀY VÀO THAY THẾ ---
function initializeAdapter() {
  console.log("[Adapter Factory] DOM is ready. Initializing adapter...");
  let active = null;
  for (const Ctor of ADAPTER_CTORS) {
    if (Ctor.matches(window.location.hostname)) {
      try {
        active = new Ctor();
      } catch (e) {
        console.error(`[Adapter Factory] Error constructing ${Ctor.name}:`, e);
      }
      break;
    }
  }

  window.ChatAdapter = active;

  console.log("[Adapter Factory] Host =", window.location.hostname);
  console.log("[Adapter Factory] Picked =", window.ChatAdapter?.constructor.name || 'None');
}

// Đảm bảo chạy sau khi tất cả các script đã được tải và DOM sẵn sàng.
// Dùng setTimeout(0) để đẩy việc thực thi xuống cuối hàng đợi sự kiện.
if (document.readyState === 'complete') {
    setTimeout(initializeAdapter, 0);
} else {
    window.addEventListener('load', () => setTimeout(initializeAdapter, 0));
}