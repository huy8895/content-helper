// BaseChatAdapter.js – Lớp cơ sở trừu tượng cho các Chat Adapters
// -----------------------------------------------------------------------------

// Helper đảm bảo instance ContentHelper luôn sẵn sàng để điều khiển các Panel
function ensureHelperInstance() {
  if (!window.__helperInjected && typeof ContentHelper !== 'undefined') {
    window.__helperInjected = new ContentHelper();
  }
  return window.__helperInjected;
}

// Các button chung (dùng cho mọi adapter)
const BUTTONS = {
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
    onClick: () => ensureHelperInstance()?._toggleAIStudioSpeechSettings(),
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
      if (window.ChatAdapter && typeof window.ChatAdapter.collapseAllCodeBlocks === 'function') {
        window.ChatAdapter.collapseAllCodeBlocks();
      }
    },
  },
  YT_STUDIO_SETTINGS: {
    id: "chatgpt-ytstudio-settings-button",
    text: "文A Phụ đề YouTube",
    className: "ts-menu-item",
    onClick: () => ensureHelperInstance()?._toggleYoutubePanel(),
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

window.BUTTONS = BUTTONS;

/* ---------------------------  Base (Abstract)  --------------------------- */
class BaseChatAdapter {
  constructor() {
    console.log("👨 BaseChatAdapter constructed");
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
  getForm() { return this.getTextarea(); }
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

window.BaseChatAdapter = BaseChatAdapter;
