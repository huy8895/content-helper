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

/* -----------------------------  Google AI Studio  ----------------------------- */
class GoogleAIStudioAdapter extends BaseChatAdapter {
  static matches(host) {
    return /aistudio\.google\.com$/i.test(host);
  }

  constructor() {
    super();
    console.log("✅ GoogleAIStudioAdapter được khởi tạo");
  }

  insertHelperButtons() {
    if (document.querySelector('#chatgpt-helper-button-container')) {
      return; // Đã chèn rồi, không làm gì cả
    }
    const container = document.createElement("div");
    container.id = "chatgpt-helper-button-container";

    // === START: THÊM STYLE CHO CONTAINER (VỊ TRÍ DÍNH CỐ ĐỊNH) ===
    Object.assign(container.style, {
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      zIndex: '10000', // Đảm bảo nổi lên trên các phần tử khác
      transition: 'transform 0.2s ease-in-out'
    });
    // === END: THÊM STYLE CHO CONTAINER ===

    const config = BUTTONS.MANAGE_SCENARIO;
    const googleAIStudioPanel = new window.GoogleAIStudioPanel(this);
    const btn = this._createButton({
      ...config,
      text: "⚙️ Settings",
      className: '', // Bỏ class cũ để style thủ công
      onClick: () => {
        googleAIStudioPanel.toggleClosePanel();
      }
    });

    // === START: THÊM STYLE CHO BUTTON (DẠNG "BONG BÓNG") ===
    Object.assign(btn.style, {
      backgroundColor: '#f0f4f9',
      color: '#041e49',
      border: 'none',
      borderRadius: '24px', // Bo tròn
      padding: '12px 20px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)', // Đổ bóng
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      lineHeight: '1'
    });

    // Thêm hiệu ứng khi hover
    btn.onmouseover = () => {
        btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
        btn.style.transform = 'translateY(-2px)';
    };
    btn.onmouseout = () => {
        btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
        btn.style.transform = 'translateY(0px)';
    };
    // === END: THÊM STYLE CHO BUTTON ===

    container.appendChild(btn);
    document.body.appendChild(container);
  }
}

// ... (code của các class adapter khác) ...

/* ------------------------- YouTube Studio Adapter ------------------------- */
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

  // Các phương thức trừu tượng không cần thiết cho trang này
  getTextarea() { return null; }
  getSendBtn()  { return null; }
  isDone()      { return true; }

  /**
   * Chèn nút "Add My Languages" vào trang.
   */
  insertHelperButtons() {
    if (document.getElementById('helper-add-my-languages')) {
      return; // Nút đã được chèn
    }

    const addLanguageButton = this._q('#add-translations-button');
    if (!addLanguageButton) {
      console.warn("Không tìm thấy nút 'Add language'.");
      return;
    }

    const container = addLanguageButton.parentElement;
    if (!container) return;

    const myButton = this._createButton({
      id: 'helper-add-my-languages',
      text: '🌐 Add My Languages',
      className: 'style-scope ytcp-button', // Dùng class của YT cho giống
      onClick: () => this.addMyLanguages()
    });

    // Style cho nút để nổi bật hơn
    myButton.style.marginLeft = '10px';
    myButton.style.backgroundColor = '#c00'; // Màu đỏ của YouTube
    myButton.style.color = 'white';

    // Chèn nút của chúng ta vào sau nút "Add language"
    container.appendChild(myButton);
  }

  /**
   * Hàm sleep để chờ giữa các hành động.
   * @param {number} ms - Thời gian chờ (mili giây).
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logic chính để tự động thêm các ngôn ngữ.
   */
  async addMyLanguages() {
    // === CÓ THỂ TÙY CHỈNH DANH SÁCH NGÔN NGỮ TẠI ĐÂY ===
    const LANGUAGES_TO_ADD = [
      'English',
      'Vietnamese',
      'Spanish',
      'Hindi',
      'French'
    ];
    // ======================================================

    const addLanguageBtn = this._q('#add-translations-button');
    if (!addLanguageBtn) {
      alert("Không thể tìm thấy nút 'Add language'!");
      return;
    }

    console.log(`Bắt đầu thêm ${LANGUAGES_TO_ADD.length} ngôn ngữ...`);

    for (const langName of LANGUAGES_TO_ADD) {
      // Mỗi lần lặp, phải click lại nút "Add language" để mở menu
      addLanguageBtn.click();

      // Chờ cho menu ngôn ngữ xuất hiện
      await this.sleep(500);

      // Tìm đúng ngôn ngữ trong danh sách
      const allItems = document.querySelectorAll('tp-yt-paper-item .item-text');
      let foundItem = null;

      for (const item of allItems) {
        if (item.textContent.trim().toLowerCase() === langName.toLowerCase()) {
           // Lấy phần tử cha có thể click được
          const clickableParent = item.closest('tp-yt-paper-item');

          // Kiểm tra xem ngôn ngữ đã được thêm (bị disable) chưa
          if (clickableParent && !clickableParent.hasAttribute('disabled')) {
            foundItem = clickableParent;
            break;
          } else {
            console.log(`Ngôn ngữ "${langName}" đã tồn tại hoặc bị vô hiệu hóa.`);
            foundItem = 'DISABLED'; // Đánh dấu để bỏ qua
            // Cần đóng menu lại để tiếp tục
            const menu = item.closest('tp-yt-paper-listbox');
            if (menu) {
               // Một cách đơn giản để đóng menu là click ra ngoài
               document.body.click();
            }
            break;
          }
        }
      }

      if (foundItem && foundItem !== 'DISABLED') {
        console.log(`Đang thêm ngôn ngữ: ${langName}`);
        foundItem.click();
        // Chờ một chút để UI cập nhật sau khi thêm
        await this.sleep(1000);
      } else if (!foundItem) {
         console.warn(`Không tìm thấy ngôn ngữ "${langName}" trong danh sách.`);
         // Đóng menu nếu không tìm thấy
         document.body.click();
         await this.sleep(500);
      }
    }

    console.log("Hoàn tất quá trình thêm ngôn ngữ!");
    alert("Đã thêm xong các ngôn ngữ đã chọn!");
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

let active = null;

for (const Ctor of ADAPTER_CTORS) {
  if (Ctor.matches(window.location.hostname)) {
    active = new Ctor();
    break;
  }
}

// Expose – every other script simply grabs the instance.
window.ChatAdapter = active;

console.log("[Adapter factory] host =", window.location.hostname);
console.log("[Adapter factory] picked =", window.ChatAdapter?.constructor.name);