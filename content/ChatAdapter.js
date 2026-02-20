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
    className: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    onClick: () => window.__helperInjected?._toggleBuilder(),
  },
  RUN_SCENARIO: {
    id: "chatgpt-run-button",
    text: "📤 Chạy kịch bản",
    className: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    onClick: () => window.__helperInjected?._toggleRunner(),
  },
  COPY_CONTENT: {
    id: "chatgpt-copy-content-button",
    text: "📋 Copy Content",
    className: "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50",
    onClick: () => window.__helperInjected?._toggleContentCopyPanel(),
  },
  SPLITTER: {
    id: "chatgpt-splitter-button",
    text: "✂️ Text Split",
    className: "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50",
    onClick: () => window.__helperInjected?._toggleSplitter(),
  },
  AUDIO: {
    id: "chatgpt-audio-button",
    text: "🎵 Audio",
    className: "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50",
    onClick: () => window.__helperInjected?._toggleAudioDownloader(),
  },
  AI_STUDIO_SETTINGS: {
    id: "chatgpt-aistudio-settings-button",
    text: "⚙️ AI Studio Settings",
    className: "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50",
    onClick: () => window.__helperInjected?._toggleAIStudioSettings(),
  },
  SRT_AUTOMATION: {
    id: "chatgpt-srt-automation-button",
    text: "🤖 SRT Automation",
    className: "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50",
    onClick: () => window.__helperInjected?._toggleSRTAutomation(),
  },
  COLLAPSE_CODE: {
    id: "chatgpt-collapse-code-button",
    text: "Collapse Code",
    className: "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50",
    onClick: () => {
      // Gọi đến một hàm của adapter hiện tại
      if (window.ChatAdapter
        && typeof window.ChatAdapter.collapseAllCodeBlocks === 'function') {
        window.ChatAdapter.collapseAllCodeBlocks();
      }
    },
  },
  YT_STUDIO_SETTINGS: {
    id: "chatgpt-ytstudio-settings-button",
    text: "🎬 YT Studio",
    className: "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50",
    onClick: () => window.__helperInjected?._toggleYoutubePanel(),
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
  getContentElements() { return null; }
  getSendBtn() { return null; }
  isDone() { return null; }

  /* ---- Optional interface (override if the site supports it) ---- */
  getForm() { return this.getTextarea() }
  getStopBtn() { return null; }
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

  // Chế độ thu gọn (mặc định false). Nếu true, các button sẽ nằm trong menu dropdown.
  isCompactMode() { return false; }

  // Hàm chèn button (dùng chung cho mọi adapter)
  insertHelperButtons() {
    if (document.querySelector('#chatgpt-helper-button-container')) return; // Đã tồn tại
    const chatForm = this.getForm();
    if (!chatForm) {
      return;
    }

    const container = document.createElement("div");
    container.id = "chatgpt-helper-button-container";
    // Thêm class relative để menu absolute định vị theo container này
    container.className = "flex flex-row gap-1.5 mt-1.5 justify-center py-1.5 relative";

    // Lấy danh sách button từ lớp con
    const buttons = this.getButtonConfigs();

    if (this.isCompactMode()) {
      // --- CHẾ ĐỘ COMPACT: Hiển thị 1 nút Tools, bấm vào xổ ra menu ---

      // 1. Tạo nút Toggle
      const toggleBtn = this._createButton({
        id: 'helper-toggle-button',
        text: '🛠️ Tools',
        className: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
        onClick: () => {
          const menu = document.getElementById('helper-buttons-menu');
          if (menu) {
            // Toggle hiển thị
            if (menu.classList.contains('hidden')) {
              menu.classList.remove('hidden');
              menu.classList.add('flex');
            } else {
              menu.classList.add('hidden');
              menu.classList.remove('flex');
            }
          }
        },
      });

      // 2. Tạo Menu chứa các button con
      const menu = document.createElement("div");
      menu.id = "helper-buttons-menu";
      // Style: absolute, đẩy lên trên (bottom-full), căn giữa, nền trắng, đổ bóng
      menu.className = "hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex-col gap-1.5 p-2 bg-white shadow-xl rounded-lg border border-gray-200 z-50 min-w-[160px]";

      buttons.forEach(config => {
        const btn = this._createButton(config);
        // Trong menu thì cho button full width và canh trái text
        btn.classList.add('w-full', '!justify-start');
        menu.appendChild(btn);
      });

      // 3. Xử lý click outside để đóng menu
      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          menu.classList.add('hidden');
          menu.classList.remove('flex');
        }
      });

      container.appendChild(menu);
      container.appendChild(toggleBtn);

    } else {
      // --- CHẾ ĐỘ THƯỜNG: Render hàng ngang như cũ ---
      buttons.forEach(config => {
        const btn = this._createButton(config);
        container.appendChild(btn);
      });
    }

    chatForm.after(container);
  }

  // Helper method để tạo button
  _createButton({ id, text, className, onClick }) {
    const btn = document.createElement("button");
    btn.id = id;
    btn.textContent = text;
    // Base Tailwind styles for all buttons + specific classes from config
    btn.className = `px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all active:scale-95 shadow-sm border cursor-pointer flex items-center gap-1 ${className}`;
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
  getSendBtn() { return this._q('button[aria-label="Send prompt"]'); }
  getStopBtn() { return this._q('button[aria-label="Stop generating"]'); }
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

  getContentElements() {
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
  getTextarea() {
    // phần tử nhập chat duy nhất của DeepSeek
    return this._q('textarea#chat-input');
  }
  getSendBtn() {
    const root = this.getForm();
    if (!root) return null;

    /* trong root có nhiều [role="button"]; send-btn luôn là PHẦN TỬ CUỐI
       có thuộc tính aria-disabled (true/false).  Chọn nút đó để click. */
    const btns = [...root.querySelectorAll('[role="button"][aria-disabled]')];
    const btn = btns.at(-1) || null;     // nút cuối là Send

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
    if (this.countDivContent + 1 === elementHTMLCollectionOf.length) {
      this.countDivContent++;
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
  static matches(host) {
    return /(?:qwen\.ai|tongyi\.aliyun\.com)$/i.test(host);
  }

  getTextarea() {
    return this._q('textarea.message-input-textarea');
  }

  getSendBtn() {
    return this._q('.message-input-right-button-send button.send-button');
  }

  getStopBtn() {
    return this._q('.message-input-right-button-send button.stop-button');
  }

  getForm() {
    return this._q('.message-input-container');
  }

  /**
   * Logic kiểm tra trạng thái (Fix cho trường hợp nút Send disabled khi rỗng)
   */
  isDone() {
    // 1. Ưu tiên cao nhất: Nếu thấy nút STOP -> Chắc chắn đang chạy -> False
    const stopBtn = this.getStopBtn();
    if (stopBtn) return false;

    // 2. Kiểm tra nút SEND
    const sendBtn = this.getSendBtn();

    // Nếu không có cả nút Stop lẫn nút Send -> Chưa load xong hoặc lỗi -> False
    if (!sendBtn) return false;

    // 3. Kiểm tra trạng thái nút Send
    const isDisabled = sendBtn.disabled || sendBtn.classList.contains('disabled');

    // Nếu nút Send SÁNG (có thể click) -> Chắc chắn là Done (đang chờ gửi)
    if (!isDisabled) return true;

    // 4. Trường hợp nút Send bị MỜ (Disabled)
    // Có 2 khả năng: Đang xử lý ngầm HOẶC Đang rảnh nhưng chưa nhập gì.
    // Ta kiểm tra nội dung ô Textarea.
    const textarea = this.getTextarea();
    const isEmpty = !textarea.value || textarea.value.trim() === '';

    // Nếu Send Disabled VÀ Textarea Rỗng -> Chính là trạng thái IDLE (Đã xong)
    if (isDisabled && isEmpty) {
      return true;
    }

    // Các trường hợp khác -> False
    return false;
  }

  /**
   * Override hàm gửi tin nhắn (giữ nguyên logic đã fix ở bước trước)
   */
  sendMessage(text) {
    const el = this.getTextarea();
    if (!el) return false;

    el.focus();
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    setTimeout(() => {
      const btn = this.getSendBtn();
      if (btn && !btn.disabled) {
        btn.click();
      } else {
        setTimeout(() => this.getSendBtn()?.click(), 500);
      }
    }, 300);

    return true;
  }

  getContentElements() {
    // ✅ CHỈ chọn tin nhắn của AI (assistant)
    // ✅ CHỈ chọn tầng .qwen-markdown.qwen-markdown-loose (tránh duplicate với parent)
    // ✅ Fallback cho các phiên bản Qwen cũ
    return Array.from(document.querySelectorAll(
      '.qwen-chat-message-assistant .response-message-content.t2t.phase-answer .qwen-markdown.qwen-markdown-loose, ' +
      '.response-message-body .markdown-content-container, ' +
      '.response-message-body .markdown-prose, ' +
      '.bot-message .markdown-body'
    ));
  }
}

/* -----------------------------  Grok (x.ai)  ----------------------------- */
class GrokAdapter extends BaseChatAdapter {
  /** Khớp các domain Grok thường gặp trên web-app */
  static matches(host) {
    /*  grok.com  |  grok.x.ai  |  x.com (grok sub-page)  */
    return /(?:^|\.)grok\.com$|(?:^|\.)grok\.x\.ai$|^x\.com$/i.test(host);
  }

  /* ── Các selector chính ──────────────────────────────────────────────── */

  /** Ô nhập prompt – duy nhất có aria-label như sau */
  getTextarea() {
    return this._q('textarea[aria-label="Ask Grok anything"]');
  }

  /** Nút SEND (submit) nằm trong form, có aria-label="Submit" */
  getSendBtn() {
    const btn = this._q('form button[type="submit"][aria-label="Submit"]');
    return btn;
  }

  /** Nút STOP hiển thị khi Grok đang sinh đáp án (nếu có) */
  getStopBtn() {
    /* Grok hiện dùng cùng văn phạm với ChatGPT: aria-label="Stop generating" */
    return this._q('button[aria-label="Stop generating"]');
  }

  /** Form bao quanh textarea */
  getForm() {
    return this.getTextarea()?.closest('form') ?? null;
  }

  /** Xác định đã sinh xong trả lời hay chưa */
  isDone() {
    const stopBtn = this.getStopBtn();
    const sendBtn = this.getSendBtn();

    /* Khi đang generate: có stopBtn.
       Khi xong: stopBtn biến mất, sendBtn tồn tại & disabled (textarea rỗng). */
    return !stopBtn && sendBtn && sendBtn.disabled;
  }

  /** Trả về các khối markdown chứa phản hồi của bot */
  getContentElements() {
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

  // Bật chế độ compact cho Google AI Studio
  isCompactMode() { return true; }

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
    return this._q('div.buttons-row');
  }

  getTextarea() {
    if (this.isSpeechPage) return null;
    return this._q(
      'textarea[aria-label="Start typing a prompt"], textarea[aria-label="Type something or tab to choose an example prompt"], textarea[aria-label="Enter a prompt"]'
    );
  }

  getSendBtn() {
    if (this.isSpeechPage) return null;
    // Nút gửi là nút Run nhưng *không* có class stoppable
    return this._q('ms-run-button button:not(.stoppable)');
  }

  getStopBtn() {
    if (this.isSpeechPage) return null;
    // Nút Stop là nút Run có chứa text 'Stop'
    const btn = this._q('ms-run-button button');
    if (btn && btn.textContent.includes('Stop')) {
      return btn;
    }
    return null;
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
      BUTTONS.SRT_AUTOMATION, // 👈 Thêm nút mới
      BUTTONS.AI_STUDIO_SETTINGS,
      BUTTONS.COLLAPSE_CODE,
      BUTTONS.YT_STUDIO_SETTINGS,
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
      ChatGPTHelper.showToast(`Đã thu gọn ${clickCount} khối code.`, "success");
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
  getSendBtn() { return null; }
  isDone() { return true; }

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

    // Tìm container chứa các action
    const container = addLanguageBtn.parentElement;
    if (!container) return;

    // Đảm bảo container là flex row để không bị nhảy hàng
    container.style.setProperty('display', 'flex', 'important');
    container.style.setProperty('flex-direction', 'row', 'important');
    container.style.setProperty('align-items', 'center', 'important');
    container.style.setProperty('gap', '10px', 'important');
    container.style.setProperty('flex-wrap', 'nowrap', 'important');

    const configButton = this._createButton({
      id: 'helper-config-languages',
      text: '⚙️ Configure',
      className: 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 h-10 rounded-full px-4 shadow-sm',
      onClick: () => this._toggleYoutubePanel()
    });

    const runButton = this._createButton({
      id: 'helper-add-my-languages',
      text: '🌐 Add Languages',
      className: 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700 h-10 rounded-full px-5 shadow-lg',
      onClick: () => this.addMyLanguages()
    });

    // Ép kiểu lại text để tránh lỗi icon bị nổi lên (floating icon)
    [configButton, runButton].forEach(btn => {
      btn.style.lineHeight = '1';
      btn.style.fontSize = '12px';
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.whiteSpace = 'nowrap';
      btn.style.flexShrink = '0';
    });

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

    if (LANGUAGES_TO_ADD.length === 0) {
      ChatGPTHelper.showToast(`No languages for profile "${activeProfileName}".`, "warning");
      return;
    }

    const addLanguageBtn = this._q('#add-translations-button') || this._q('#add-button button');
    if (!addLanguageBtn) {
      ChatGPTHelper.showToast("Cannot find 'Add language' button!", "error");
      return;
    }

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
    ChatGPTHelper.showToast("Finished adding all configured languages!", "success");
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

/* -----------------------------  Gemini (Google)  ----------------------------- */
class GeminiAdapter extends BaseChatAdapter {
  static matches(host) {
    return /gemini\.google\.com$/i.test(host);
  }

  constructor() {
    super();
    console.log("🚀 [GeminiAdapter] Khởi tạo! Đang đợi khung chat...");
    this.checkTimer = setInterval(() => this.tryInject(), 1000);
  }

  tryInject() {
    if (document.getElementById('chatgpt-helper-button-container')) return;
    const form = this.getForm();
    if (form) {
      console.log("✅ [GeminiAdapter] Đã tìm thấy khung chat -> Inject nút.");
      this.insertHelperButtons();
    }
  }

  getTextarea() {
    return document.querySelector('.ql-editor.textarea') ||
      document.querySelector('div[contenteditable="true"][role="textbox"]');
  }

  getSendBtn() {
    // Nút gửi có class "send-button"
    return document.querySelector('button.send-button');
  }

  isCompactMode() { return true; }

  getStopBtn() {
    // Dựa trên HTML bạn gửi:
    // Khi đang chạy, button có thêm class "stop" và aria-label="Ngừng tạo câu trả lời"
    return document.querySelector('button.send-button.stop') ||
      document.querySelector('button[aria-label*="Ngừng tạo"]') ||
      document.querySelector('button[aria-label*="Stop generating"]');
  }

  getForm() {
    const textarea = this.getTextarea();
    if (!textarea) return null;
    const inputField = textarea.closest('.text-input-field');
    if (inputField) return inputField.parentElement;
    return textarea.parentElement?.parentElement?.parentElement?.parentElement;
  }

  isDone() {
    // Nếu tìm thấy nút Stop -> Tức là đang chạy -> Trả về false
    const stopBtn = this.getStopBtn();
    if (stopBtn) return false;

    // Nếu không có nút Stop, kiểm tra xem nút Gửi có tồn tại và sẵn sàng không
    // Lưu ý: Khi Gemini đang suy nghĩ (nhưng chưa in text), nút stop có thể chưa hiện ngay
    // nhưng nút send sẽ bị ẩn hoặc disabled.
    const sendBtn = this.getSendBtn();

    // Đã xong khi: Không có nút Stop VÀ Nút Send đang hiển thị (không bị hidden)
    return !stopBtn && sendBtn && !sendBtn.classList.contains('hidden');
  }

  getContentElements() {
    return Array.from(document.querySelectorAll('message-content'));
  }

  sendMessage(text) {
    console.log("📨 [GeminiAdapter] Gửi tin:", text);
    const el = this.getTextarea();
    if (!el) return false;

    el.focus();
    el.classList.remove('ql-blank');
    el.innerHTML = `<p>${text}</p>`;
    el.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      const btn = this.getSendBtn();
      if (btn && btn.getAttribute('aria-disabled') !== 'true') {
        btn.click();
      } else {
        // Fallback click mạnh hơn nếu state chưa cập nhật kịp
        btn?.click();
      }
    }, 500);

    return true;
  }

  getButtonConfigs() {
    return [
      BUTTONS.MANAGE_SCENARIO,
      BUTTONS.RUN_SCENARIO,
      BUTTONS.COPY_CONTENT,
      BUTTONS.YT_STUDIO_SETTINGS,
    ];
  }
}

/* -----------------------  Adapter Factory (runtime)  ---------------------- */
const ADAPTER_CTORS = [
  ChatGPTAdapter,
  DeepSeekAdapter,
  QwenAdapter,
  GrokAdapter,
  GoogleAIStudioAdapter,
  YoutubeStudioAdapter,
  GeminiAdapter
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