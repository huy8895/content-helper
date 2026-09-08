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

// Helper đảm bảo instance ContentHelper luôn sẵn sàng để điều khiển các Panel
function ensureHelperInstance() {
  if (!window.__helperInjected && typeof ContentHelper !== 'undefined') {
    window.__helperInjected = new ContentHelper();
  }
  return window.__helperInjected;
}

// Các button chung (dùng cho mọi adapter)
BUTTONS = {
  MANAGE_SCENARIO: {
    id: "content-helper-button",
    text: "≡ Quản lý kịch bản",
    className: "ts-menu-item",
    onClick: () => ensureHelperInstance()?._toggleBuilder(),
  },
  RUN_SCENARIO: {
    id: "chatgpt-run-button",
    text: "▶ Chạy kịch bản",
    className: "ts-menu-item",
    onClick: () => ensureHelperInstance()?._toggleRunner(),
  },
  RUN_FLOW: {
    id: "chatgpt-run-flow-button",
    text: "🔀 Chạy Flow",
    className: "ts-menu-item",
    onClick: () => ensureHelperInstance()?._toggleFlowRunner(),
  },
  COPY_CONTENT: {
    id: "chatgpt-copy-content-button",
    text: "⎘ Sao chép nội dung",
    className: "ts-menu-item",
    onClick: () => ensureHelperInstance()?._toggleContentCopyPanel(),
  },
  SPLITTER: {
    id: "chatgpt-splitter-button",
    text: "✂ Phân tách văn bản",
    className: "ts-menu-item",
    onClick: () => ensureHelperInstance()?._toggleSplitter(),
  },
  AUDIO: {
    id: "chatgpt-audio-button",
    text: "🎙️ Trích xuất giọng đọc (TTS)",
    className: "ts-menu-item",
    onClick: () => ensureHelperInstance()?._toggleAudioDownloader(),
  },
  AI_STUDIO_SETTINGS: {
    id: "chatgpt-aistudio-settings-button",
    text: "⚙ Thiết lập AI Studio",
    className: "ts-menu-item",
    onClick: () => ensureHelperInstance()?._toggleAIStudioSettings(),
  },
  SRT_AUTOMATION: {
    id: "chatgpt-srt-automation-button",
    text: "⏱️ SRT Timeline (Auto)",
    className: "ts-menu-item",
    onClick: () => ensureHelperInstance()?._toggleSRTAutomation(),
  },
  COLLAPSE_CODE: {
    id: "chatgpt-collapse-code-button",
    text: "⇥ Thu gọn khối code",
    className: "ts-menu-item",
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
    text: "文A Phụ đề YouTube",
    className: "ts-menu-item",
    onClick: () => {
      if (window.ChatAdapter && typeof window.ChatAdapter._toggleYoutubePanel === 'function') {
        window.ChatAdapter._toggleYoutubePanel();
      } else {
        ensureHelperInstance()?._toggleYoutubePanel();
      }
    },
  },
  YT_ADD_LANGUAGES: {
    id: "chatgpt-yt-add-languages-button",
    text: "🌐 Thêm ngôn ngữ (Auto)",
    className: "ts-menu-item",
    onClick: () => {
      if (window.ChatAdapter && typeof window.ChatAdapter.addMyLanguages === 'function') {
        window.ChatAdapter.addMyLanguages();
      }
    },
  },
  AI_STUDIO_SPEECH_SETTINGS: {
    id: "chatgpt-aistudio-speech-settings-button",
    text: "🎙️ Thiết lập giọng đọc",
    className: "ts-menu-item",
    onClick: () => ensureHelperInstance()?._toggleAIStudioSpeechSettings(),
  },
};
/* ---------------------------  Base (Abstract)  --------------------------- */
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
  enableTemporaryChat() { return Promise.resolve(false); }

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



  // Danh mục button mặc định cho các trang chat/AI
  getButtonConfigs() {
    return [
      BUTTONS.RUN_SCENARIO,
      BUTTONS.MANAGE_SCENARIO,
      BUTTONS.RUN_FLOW,
      BUTTONS.COPY_CONTENT,
      BUTTONS.SPLITTER,
      BUTTONS.AUDIO,
      BUTTONS.SRT_AUTOMATION,
    ];
  }

  // Chế độ Master Floating Button (mặc định luôn true trên 100% trang web)
  isCompactMode() { return true; }

  // Định danh nền tảng để map với cấu hình
  getPlatformId() {
    const name = this.constructor.name;
    if (name === 'ChatGPTAdapter') return 'chatgpt';
    if (name === 'DeepSeekAdapter') return 'deepseek';
    if (name === 'QwenAdapter') return 'qwen';
    if (name === 'GrokAdapter') return 'grok';
    if (name === 'GoogleAIStudioAdapter') return 'aistudio';
    if (name === 'YoutubeStudioAdapter') return 'ytstudio';
    if (name === 'GeminiAdapter') return 'gemini';
    return '';
  }

  // Hàm chèn button chuẩn hóa: 1 Master Floating Button -> Popup Menu -> Click mở Panel
  insertHelperButtons() {
    if (!document.body && !document.documentElement) return; // Chờ DOM sẵn sàng
    const shadow = ContentHelper.getShadowRoot();
    if (shadow.querySelector('#content-helper-button-container')) return; // Đã tồn tại

    let buttons = this.getButtonConfigs();
    let isEnabled = true;

    // --- Lọc nút theo cấu hình động nếu người dùng tùy chỉnh ---
    const platformId = this.getPlatformId();
    if (platformId && window.__buttonConfigs && window.__buttonConfigs[platformId]) {
      const platformConfig = window.__buttonConfigs[platformId];
      if (typeof platformConfig === 'object' && !Array.isArray(platformConfig)) {
        isEnabled = platformConfig.enabled !== false;
        if (platformConfig.buttons && platformConfig.buttons.length > 0) {
          buttons = platformConfig.buttons.map(key => BUTTONS[key]).filter(Boolean);
        }
      }
    }

    // Nếu người dùng chọn Tắt Extension cho trang này hoặc không có nút nào
    if (!isEnabled || buttons.length === 0) return;

    const container = document.createElement("div");
    container.id = "content-helper-button-container";
    container.dataset.free = "1";

    let isDragging = false;
    let hasMoved = false;
    let startX = 0, startY = 0;

    // 1. Nút Master Toggle Bubble (Pill shape Calm Tech)
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "helper-toggle-button";
    toggleBtn.innerHTML = `<span>⌘</span> <span>Helper</span>`;
    toggleBtn.title = "Content Helper - Click để mở Menu công cụ (Kéo thả để di chuyển)";

    toggleBtn.addEventListener("click", (e) => {
      if (isDragging) return; // Không mở menu nếu vừa kéo thả xong
      if (window.ContentHelper?.playMechanicalClick) {
        window.ContentHelper.playMechanicalClick();
      }
      const menu = shadow.getElementById('helper-buttons-menu');
      if (menu) {
        menu.classList.toggle('hidden');
      }
    });

    // Bổ sung logic Drag & Drop tự do cho bong bóng
    toggleBtn.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Chỉ nhận chuột trái
      e.preventDefault(); // Ngăn chọn văn bản hoặc native drag của trình duyệt

      isDragging = false;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      const rect = container.getBoundingClientRect();
      const shiftX = e.clientX - rect.left;
      const shiftY = e.clientY - rect.top;

      const onMouseMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (!hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          hasMoved = true;
          isDragging = true;
        }

        if (hasMoved) {
          // Tính toạ độ mới với viewport clamping an toàn
          const pad = 8;
          const maxLeft = window.innerWidth - rect.width - pad;
          const maxTop = window.innerHeight - rect.height - pad;

          let newLeft = Math.max(pad, Math.min(ev.clientX - shiftX, maxLeft));
          let newTop = Math.max(pad, Math.min(ev.clientY - shiftY, maxTop));

          container.style.left = newLeft + 'px';
          container.style.top = newTop + 'px';
          container.style.right = 'auto';
          container.style.bottom = 'auto';

          // Tự động điều chỉnh hướng bung menu: nếu ở nửa trên thì bung xuống dưới
          const menu = shadow.getElementById('helper-buttons-menu');
          if (menu) {
            if (newTop < 260) {
              menu.classList.add('menu-down');
            } else {
              menu.classList.remove('menu-down');
            }
          }
        }
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (hasMoved) {
          // Giữ cờ isDragging trong 120ms để sự kiện click không mở menu
          setTimeout(() => {
            isDragging = false;
          }, 120);
        } else {
          isDragging = false;
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // 2. Menu chứa danh sách công cụ (Popup List Menu)
    const menu = document.createElement("div");
    menu.id = "helper-buttons-menu";
    menu.className = "hidden";

    buttons.forEach(config => {
      const btn = document.createElement("button");
      btn.id = config.id;
      btn.innerHTML = config.text;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.ContentHelper?.playMechanicalClick) {
          window.ContentHelper.playMechanicalClick();
        }
        // Tự động đóng menu khi click vào item
        menu.classList.add('hidden');
        try {
          config.onClick();
        } catch (err) {
          console.error("❌ [Content Helper] Lỗi khi mở panel:", err);
          if (window.ContentHelper?.showToast) {
            window.ContentHelper.showToast(`Lỗi khi mở panel: ${err.message}`, "error");
          }
        }
      });
      menu.appendChild(btn);
    });

    // 3. Xử lý click outside và phím ESC để đóng menu (sử dụng composedPath xuyên Shadow DOM)
    document.addEventListener('click', (e) => {
      const path = e.composedPath ? e.composedPath() : [e.target];
      if (!path.includes(container) && !isDragging) {
        menu.classList.add('hidden');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
      }
    });

    container.appendChild(menu);
    container.appendChild(toggleBtn);
    shadow.appendChild(container);
  }

  // Helper method tạo button nếu cần
  _createButton({ id, text, className, onClick }) {
    const btn = document.createElement("button");
    btn.id = id;
    btn.innerHTML = text;
    btn.className = `ts-btn ${className || ''}`;
    btn.addEventListener("click", (e) => {
      if (window.ContentHelper?.playMechanicalClick) {
        window.ContentHelper.playMechanicalClick();
      }
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
  static matches(host) { return /deepseek\.com$/i.test(host); }

  constructor() {
    super();
    this._lastContinueClickTime = 0;
  }
  getTextarea() {
    // Thử tìm theo placeholder đặc trưng của DeepSeek, fallback về tag textarea hoặc id cũ
    return this._q('textarea[placeholder*="DeepSeek"]') || 
           this._q('textarea#chat-input') || 
           this._q('textarea');
  }
  getSendBtn() {
    const root = this.getForm();
    if (!root) return null;

    // Nút Send luôn là nút cuối cùng trong khu vực chat
    const btns = [...root.querySelectorAll('[role="button"], button')];
    const btn = btns.at(-1) || null;

    // Bọc thuộc tính disabled để ScenarioRunner đọc được
    if (btn && btn.disabled === undefined) {
      Object.defineProperty(btn, 'disabled', {
        get() {
          return btn.getAttribute('aria-disabled') === 'true' || 
                 btn.classList.contains('ds-button--disabled') || 
                 btn.hasAttribute('disabled');
        },
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

    const btns = [...root.querySelectorAll('[role="button"], button')];
    for (const btn of btns) {
      const svg = btn.querySelector('svg');
      if (svg) {
        const html = svg.innerHTML.toLowerCase();
        // Kiểm tra xem SVG có path vẽ hình vuông đặc trưng của DeepSeek Stop hay không
        const paths = [...svg.querySelectorAll('path')];
        const hasSquarePath = paths.some(p => {
          const d = p.getAttribute('d') || '';
          return d.includes('M2 4.88') || d.includes('H11.12') || d.includes('V11.12');
        });

        // Nút Stop chứa <rect> (hình vuông), stop/square hoặc path vẽ hình vuông
        if (html.includes('rect') || html.includes('square') || html.includes('stop') || hasSquarePath) {
          return btn;
        }
      }
    }

    // tìm phần tử có icon _480132b rồi leo lên button (fallback cũ)
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
  }

  getContinueBtn() {
    const elements = [...document.querySelectorAll('.ds-button, [role="button"], button')];
    for (const el of elements) {
      const text = el.textContent.trim();
      if (/^(continue|continue generating|tiếp tục)$/i.test(text)) {
        if (el.offsetWidth > 0 && el.offsetHeight > 0) {
          return el;
        }
      }
    }
    return null;
  }

  isDone() {
    // 1. Nếu tìm thấy nút Stop -> Chắc chắn đang chạy -> Chưa xong
    const stopBtn = this.getStopBtn();
    if (stopBtn) return false;

    // 2. Kiểm tra nút Continue
    const continueBtn = this.getContinueBtn();
    if (continueBtn) {
      const now = Date.now();
      if (now - this._lastContinueClickTime > 3000) {
        this._lastContinueClickTime = now;
        console.log("🖱️ [DeepSeekAdapter] Phát hiện nút Continue. Tự động click để sinh tiếp...");
        continueBtn.click();
      }
      return false; // Chưa xong
    }

    // 3. Kiểm tra nút Send
    const sendBtn = this.getSendBtn();
    if (!sendBtn) return false;

    // 4. Nếu không có nút Stop, không có Continue và có nút Send -> Đã xong
    return true;
  }

  getForm() {
    const textarea = this.getTextarea();
    if (!textarea) return null;

    // 1. Thử tìm form gần nhất
    const form = textarea.closest('form');
    if (form) return form;

    // 2. Đi lên tìm DIV cha gần nhất chứa các nút bấm hành động (role="button")
    let el = textarea.parentElement;
    for (let i = 0; i < 3 && el; i++) {
      if (el.tagName === 'DIV' && el.querySelector('[role="button"]')) {
        return el;
      }
      el = el.parentElement;
    }

    // 3. Fallback cuối cùng nếu không tìm thấy cấu trúc trên
    return textarea.parentElement?.parentElement ?? textarea.parentElement;
  }

  getContentElements() {
    // Lấy các thẻ chứa markdown câu trả lời của DeepSeek
    return Array.from(document.querySelectorAll('.ds-markdown, .ds-markdown--block'));
  }

  /**
   * Kích hoạt cuộc trò chuyện tạm thời hoặc cấu hình mặc định cho DeepSeek.
   * Do DeepSeek không có chế độ trò chuyện tạm thời, ta tận dụng hàm này để
   * tự động chuyển đổi mô hình mặc định thành 'expert'.
   */
  async enableTemporaryChat() {
    console.log("🔒 [DeepSeekAdapter] Đang kiểm tra để bật model Expert mặc định...");
    try {
      // Tìm nút chọn model Expert
      const expertBtn = document.querySelector('[data-model-type="expert"]');
      if (!expertBtn) {
        console.warn("⚠️ [DeepSeekAdapter] Không tìm thấy nút chọn model Expert. Có thể giao diện đã thay đổi hoặc đang ở phiên bản di động.");
        return false;
      }

      // Kiểm tra xem model Expert đã được chọn chưa
      const isChecked = expertBtn.getAttribute('aria-checked') === 'true';
      if (isChecked) {
        console.log("💎 [DeepSeekAdapter] Model Expert đã được chọn sẵn.");
        return true;
      }

      // Click chọn model Expert
      console.log("🖱️ [DeepSeekAdapter] Tiến hành click chọn model Expert...");
      expertBtn.click();

      // Đợi 500ms để UI cập nhật
      await new Promise(r => setTimeout(r, 500));
      console.log("💎 [DeepSeekAdapter] Đã kích hoạt model Expert thành công!");
      return true;
    } catch (e) {
      console.error("❌ [DeepSeekAdapter] Lỗi khi chọn model Expert:", e);
      return false;
    }
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
        window.GoogleAIStudioSpeechPanel.triggerAutoSet();
      }, 1500);
    }
  }

  insertHelperButtons() {
    super.insertHelperButtons();
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

    // Tìm các phần tử text chunk của Model trong giao diện chat mới (chứa nội dung phản hồi của AI)
    const newElements = Array.from(document.querySelectorAll('ms-chat-turn .model-prompt-container ms-text-chunk'));
    if (newElements.length > 0) {
      // Loại bỏ các text chunk nằm bên trong phần suy nghĩ (ms-thought-chunk) của AI
      return newElements.filter(el => !el.closest('ms-thought-chunk'));
    }

    // Phương án dự phòng (fallback) cho giao diện cũ sử dụng class output-chunk
    return Array.from(document.querySelectorAll('div.output-chunk'));
  }

  getButtonConfigs() {
    return [
      BUTTONS.AI_STUDIO_SETTINGS,
      BUTTONS.AI_STUDIO_SPEECH_SETTINGS,
      BUTTONS.RUN_SCENARIO,
      BUTTONS.MANAGE_SCENARIO,
      BUTTONS.RUN_FLOW,
      BUTTONS.SRT_AUTOMATION,
      BUTTONS.COPY_CONTENT,
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
      ContentHelper.showToast(`Đã thu gọn ${clickCount} khối code.`, "success");
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
    this.insertHelperButtons();
  }

  getButtonConfigs() {
    return [
      BUTTONS.YT_STUDIO_SETTINGS,
      BUTTONS.YT_ADD_LANGUAGES,
      BUTTONS.RUN_SCENARIO,
      BUTTONS.MANAGE_SCENARIO,
      BUTTONS.SPLITTER,
    ];
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
      ContentHelper.showToast(`No languages for profile "${activeProfileName}".`, "warning");
      return;
    }

    const addLanguageBtn = this._q('#add-translations-button') || this._q('#add-button button');
    if (!addLanguageBtn) {
      ContentHelper.showToast("Cannot find 'Add language' button!", "error");
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
    ContentHelper.showToast("Finished adding all configured languages!", "success");
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
    const translationData = YoutubeStudioPanel.getTranslation(translations, jsonKey);

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
    if (document.getElementById('content-helper-button-container')) return;
    const form = this.getForm();
    if (form) {
      console.log("✅ [GeminiAdapter] Đã tìm thấy khung chat -> Inject nút.");
      this.insertHelperButtons();
    }
  }

  /**
   * Lấy ô nhập liệu (textarea/editor) của Gemini
   */
  getTextarea() {
    return document.querySelector('.ql-editor.textarea') ||
      document.querySelector('div[contenteditable="true"][role="textbox"]');
  }

  /**
   * Lấy nút Send (Gửi tin nhắn)
   * Thay đổi: Tìm thẻ button nằm bên trong thẻ bao ngoài có class .send-button
   */
  getSendBtn() {
    return document.querySelector('.send-button button') ||
      document.querySelector('button[aria-label*="Gửi tin nhắn"]') ||
      document.querySelector('button[aria-label*="Send message"]') ||
      document.querySelector('button.send-button'); // Fallback cũ
  }

  isCompactMode() { return true; }

  /**
   * Lấy nút Stop (Ngừng tạo câu trả lời)
   * Tìm kiếm dựa trên class stop hoặc aria-label phù hợp
   */
  getStopBtn() {
    return document.querySelector('.send-button.stop button') ||
      document.querySelector('button[aria-label*="Ngừng tạo"]') ||
      document.querySelector('button[aria-label*="Stop generating"]') ||
      document.querySelector('button[aria-label*="Dừng"]');
  }

  /**
   * Lấy Form bao quanh khung chat
   */
  getForm() {
    const textarea = this.getTextarea();
    if (!textarea) return null;
    const inputField = textarea.closest('.text-input-field');
    if (inputField) return inputField.parentElement;
    return textarea.parentElement?.parentElement?.parentElement?.parentElement;
  }

  /**
   * Kiểm tra xem Gemini đã hoàn thành việc tạo câu trả lời chưa
   */
  isDone() {
    // Nếu tìm thấy nút Stop -> Chắc chắn đang chạy -> Trả về false
    const stopBtn = this.getStopBtn();
    if (stopBtn) return false;

    // Kiểm tra xem ô nhập liệu (textarea) của Gemini có trống không
    const textarea = this.getTextarea();
    const isEmpty = !textarea || !textarea.textContent.trim();

    // Nếu không có nút Stop và ô nhập liệu trống -> Đã trả lời xong hoàn toàn
    if (isEmpty) {
      return true;
    }

    // Nếu ô nhập liệu có chữ, ta cần nút Send xuất hiện và hiển thị
    const sendBtn = this.getSendBtn();
    if (!sendBtn) return false;

    const container = sendBtn.closest('.send-button-container');
    const isVisible = !sendBtn.classList.contains('hidden') &&
      (!container || container.classList.contains('visible') || !container.classList.contains('hidden'));

    return isVisible;
  }

  /**
   * Lấy tất cả các phần tử chứa câu trả lời của Gemini
   */
  getContentElements() {
    return Array.from(document.querySelectorAll('message-content'));
  }

  /**
   * Kích hoạt cuộc trò chuyện tạm thời (Temporary Chat) trên Gemini
   */
  async enableTemporaryChat() {
    console.log("🔒 [GeminiAdapter] Đang kiểm tra để bật cuộc trò chuyện tạm thời...");
    try {
      // 1. Tìm icon gemini_chat_temp dựa theo thông tin người dùng cung cấp
      const icon = document.querySelector('mat-icon[data-mat-icon-name="gemini_chat_temp"]') || 
                   document.querySelector('mat-icon[fonticon="gemini_chat_temp"]') ||
                   document.querySelector('gem-icon[icon="gemini_chat_temp"]');
      
      if (!icon) {
        console.warn("⚠️ [GeminiAdapter] Không tìm thấy icon trò chuyện tạm thời. Có thể giao diện đã thay đổi hoặc đang ở trạng thái trò chuyện tạm thời sẵn.");
        return false;
      }

      // 2. Trèo lên thẻ cha có thể click được (thường là button hoặc gem-icon-button)
      const clickableBtn = icon.closest('button') || icon.closest('gem-icon-button') || icon;
      
      console.log("🖱️ [GeminiAdapter] Đã tìm thấy nút trò chuyện tạm thời. Tiến hành click...");
      clickableBtn.click();
      
      // 3. Đợi 1.5 giây để Gemini chuyển trạng thái trò chuyện tạm thời
      await new Promise(r => setTimeout(r, 1500));
      console.log("🔒 [GeminiAdapter] Đã kích hoạt trò chuyện tạm thời thành công!");
      return true;
    } catch (e) {
      console.error("❌ [GeminiAdapter] Lỗi khi bật trò chuyện tạm thời:", e);
      return false;
    }
  }

  /**
   * Điền nội dung tin nhắn và click nút Gửi
   */
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
      if (btn) {
        // Kiểm tra xem nút bấm hoặc thẻ bao ngoài gem-icon-button có bị disabled/aria-disabled hay không
        const wrapper = btn.closest('gem-icon-button') || btn;
        const isDisabled = btn.disabled ||
          btn.getAttribute('aria-disabled') === 'true' ||
          wrapper.getAttribute('aria-disabled') === 'true';

        if (!isDisabled) {
          btn.click();
        } else {
          // Fallback click nếu state chưa cập nhật kịp
          btn.click();
        }
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
      BUTTONS.RUN_FLOW
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

  // Gọi trực tiếp insertHelperButtons() ngay sau khi adapter sẵn sàng
  if (window.ChatAdapter) {
    window.ChatAdapter.insertHelperButtons();
  }
}

// Đảm bảo chạy sau khi tất cả các script đã được tải và DOM sẵn sàng.
// Dùng setTimeout(0) để đẩy việc thực thi xuống cuối hàng đợi sự kiện.
if (document.readyState === 'complete') {
  setTimeout(initializeAdapter, 0);
} else {
  window.addEventListener('load', () => setTimeout(initializeAdapter, 0));
}