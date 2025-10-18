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
    COLLAPSE_CODE: {
      id: "chatgpt-collapse-code-button",
      text: "Collapse Code",
      className: "scenario-btn btn-tool",
      onClick: () => {
        // Gọi đến một hàm của adapter hiện tại
        if (window.ChatAdapter && typeof window.ChatAdapter.collapseAllCodeBlocks === 'function') {
          window.ChatAdapter.collapseAllCodeBlocks();
        }
      },
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
    console.log(`✅ GoogleAIStudioAdapter khởi tạo. Trang Speech: ${this.isSpeechPage}, Trang Chat: ${!this.isSpeechPage}`);

    if (this.isSpeechPage) {
      setTimeout(() => {
        window.GoogleAIStudioPanel.triggerAutoSet();
      }, 1500);
    }
  }

  insertHelperButtons() {
    if (this.isSpeechPage) {
      window.GoogleAIStudioPanel.insertSpeechPageButton();
    } else {
      super.insertHelperButtons();
    }
  }

  getForm() {
    if (this.isSpeechPage) return null;
    return this._q('div.prompt-input-wrapper-container');
  }

  getTextarea() {
    if (this.isSpeechPage) return null;
    return this._q(
        'textarea[aria-label="Start typing a prompt"], textarea[aria-label="Type something or tab to choose an example prompt"]'
    );
  }

  getSendBtn() {
    if (this.isSpeechPage) return null;
    // Nút gửi là nút Run nhưng *không* có class stoppable
    return this._q('ms-run-button button:not(.stoppable)');
  }

  getStopBtn() {
    if (this.isSpeechPage) return null;
    // === ĐÂY LÀ THAY ĐỔI QUAN TRỌNG ===
    // Nút Stop là nút Run *có* class 'stoppable'.
    return this._q('ms-run-button button.stoppable');
  }

  isDone() {
    return this.isSpeechPage ? true : !this.getStopBtn();
  }

  getContentElements() {
    if (this.isSpeechPage) return [];
    return Array.from(document.querySelectorAll('div.output-chunk'));
  }

  getButtonConfigs() {
    if (this.isSpeechPage) return [];
    return [
      BUTTONS.MANAGE_SCENARIO,
      BUTTONS.RUN_SCENARIO,
      BUTTONS.AI_STUDIO_SETTINGS,
      BUTTONS.COLLAPSE_CODE
    ];
  }

  // === HÀM LOGIC CHO VIỆC THU GỌN CODE ===
  collapseAllCodeBlocks() {
    // 1. Tìm tất cả các icon có class 'material-symbols-outlined'
    const collapseIcons = document.querySelectorAll('span.material-symbols-outlined');
    let clickCount = 0;

    // 2. Lặp qua từng icon
    collapseIcons.forEach(icon => {
      // 3. Chỉ xử lý những icon đang ở trạng thái "mở" ('expand_less')
      if (icon.textContent.trim() === 'expand_less') {
        // 4. Tìm đến button cha gần nhất và click
        const button = icon.closest('button');
        if (button) {
          button.click();
          clickCount++;
        }
      }
    });

    // 5. Thông báo kết quả
    console.log(`Hoàn tất! Đã click vào ${clickCount} nút 'collapse'.`);
    // Có thể thêm alert nếu muốn
    if (clickCount > 0) {
      alert(`Đã thu gọn ${clickCount} khối code.`);
    }
  }
}
/* ------------------------- YouTube Studio Adapter ------------------------- */
// Thay thế toàn bộ class này trong file ChatAdapter.js

// Thay thế toàn bộ class này trong file ChatAdapter.js

class YoutubeStudioAdapter extends BaseChatAdapter {
  static matches(host) {
    return /studio\.youtube\.com$/i.test(host);
  }

  constructor() {
    super();
    this.ytPanel = null;
    const observer = new MutationObserver(() => {
      if (this._q('#add-translations-button') || this._q('#add-button button')) {
        this.insertHelperButtons();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  getTextarea() { return null; }
  getSendBtn()  { return null; }
  isDone()      { return true; }

  _toggleYoutubePanel() {
    if (this.ytPanel) {
      this.ytPanel.destroy();
      this.ytPanel = null; // Quan trọng: reset lại sau khi destroy
    } else {
      this.ytPanel = new YoutubeStudioPanel(() => (this.ytPanel = null));
    }
  }

  insertHelperButtons() {
    if (document.getElementById('helper-config-languages')) return;
    const addLanguageBtn = this._q('#add-translations-button') || this._q('#add-button button');
    if (!addLanguageBtn) return;
    const container = addLanguageBtn.closest('div, .style-scope.ytcp-primary-action-bar');
    if (!container) return;

    const configButton = this._createButton({
      id: 'helper-config-languages',
      text: '⚙️ Configure',
      className: 'style-scope ytcp-button',
      onClick: () => this._toggleYoutubePanel()
    });
    const runButton = this._createButton({
      id: 'helper-add-my-languages', text: '🌐 Add Languages',
      className: 'scenario-btn btn-run', onClick: () => this.addMyLanguages()
    });
    configButton.style.marginLeft = '10px';
    runButton.style.marginLeft = '10px';

    addLanguageBtn.after(runButton);
    addLanguageBtn.after(configButton);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  waitForElement(selector, context = document, timeout = 1000) {
    return new Promise(resolve => {
      const interval = setInterval(() => {
        const el = context.querySelector(selector);
        if (el) {
          clearInterval(interval);
          resolve(el);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        resolve(null);
      }, timeout);
    });
  }

  async addMyLanguages() {
    const storageKey = 'youtube_language_profiles';
    const result = await chrome.storage.local.get([storageKey, 'youtube_translation_data']);

    const profileData = result[storageKey] || {};
    const translations = result.youtube_translation_data;

    const activeProfileName = profileData.activeProfileName || 'default';
    const activeProfile = (profileData.profiles || {})[activeProfileName] || {};

    const LANGUAGES_TO_ADD = activeProfile.languages || [];
    const isAloudChannel = activeProfile.isAloudChannel || false;
    const isAutofillEnabled = activeProfile.isAutofillEnabled || false;

    if (LANGUAGES_TO_ADD.length === 0) return alert(`No languages for profile "${activeProfileName}".`);

    const addLanguageBtn = this._q('#add-translations-button') || this._q('#add-button button');
    if (!addLanguageBtn) return alert("Cannot find 'Add language' button!");

    const itemSelector = isAloudChannel ? 'yt-formatted-string.item-text' : 'tp-yt-paper-item .item-text';

    for (const langName of LANGUAGES_TO_ADD) {
      addLanguageBtn.click();
      await this.sleep(250);

      const allItems = document.querySelectorAll(itemSelector);
      let foundItem = null;

      for (const item of allItems) {
        if (item.textContent.trim().toLowerCase() === langName.toLowerCase()) {
          const clickableParent = item.closest('tp-yt-paper-item');
          if (clickableParent && !clickableParent.hasAttribute('disabled')) {
            foundItem = clickableParent;
            break;
          }
        }
      }

      if (foundItem) {
        foundItem.click();
        console.log(`✅ Added language: ${langName}`);

        // TÁCH BIỆT LOGIC: Chỉ tự động hóa hoàn toàn cho kênh Aloud + Autofill
        if (isAloudChannel && isAutofillEnabled) {
          await this.handleAloudAutofill(langName, translations);
        } else {
          // Đối với các trường hợp khác, chỉ cần một khoảng nghỉ nhỏ
          await this.sleep(300);
        }

      } else {
        console.log(`⚠️ Not found or already exists: ${langName}`);
        document.body.click(); // Đóng menu lại
        await this.sleep(100);
      }
    }
    alert("Finished adding all configured languages!");
  }

  /**
   * Hàm mới chuyên xử lý logic tự động hóa cho kênh Aloud
   */
  async handleAloudAutofill(langName, translations) {
    console.log(`[Aloud Autofill] Waiting for dialog for ${langName}...`);

    // Đợi popup xuất hiện
    const dialog = await this.waitForElement('#dialog.ytcp-dialog[aria-label*="details"]');
    if (!dialog) {
      console.error(`[Aloud Autofill] Dialog for ${langName} did not appear. Skipping.`);
      return;
    }

    console.log('[Aloud Autofill] Dialog found. Filling data...');

    const jsonKey = YoutubeStudioPanel._normalizeLangKey(langName);
    const translationData = translations ? translations[jsonKey] : null;

    if (translationData) {
      const titleInput = dialog.querySelector('#metadata-title #textbox');
      const descInput = dialog.querySelector('#metadata-description #textbox');

      YoutubeStudioPanel._fillAndFireEvents(titleInput, translationData.title);
      YoutubeStudioPanel._fillAndFireEvents(descInput, translationData.description);

      await this.sleep(100); // Đợi nút publish được enable

      const publishBtn = dialog.querySelector('.ytgn-language-dialog-update:not([disabled])');
      if (publishBtn) {
        publishBtn.click();
        console.log(`[Aloud Autofill] Published for ${langName}`);
        await this.waitForElementToDisappear(`#dialog.ytcp-dialog[aria-label*="${langName}"]`);
      } else {
        console.warn(`[Aloud Autofill] Publish button not enabled. Closing.`);
        dialog.querySelector('.ytgn-language-dialog-cancel')?.click();
        await this.sleep(500);
      }
    } else {
      console.warn(`[Aloud Autofill] No data for ${langName}. Closing.`);
      dialog.querySelector('.ytgn-language-dialog-cancel')?.click();
      await this.sleep(500);
    }
  }

  // Thêm hàm helper mới
  waitForElementToDisappear(selector, timeout = 500) {
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (!document.querySelector(selector)) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        resolve(); // Vẫn resolve dù hết giờ
      }, timeout);
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