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
 * ContentHelper (root)  *
 *************************/
class ContentHelper {
  constructor() {
    console.log("🚀 [ContentHelper] Helper loaded");
    /** @type {ScenarioBuilder|null} */
    this.builder = null;
    /** @type {ScenarioRunner|null} */
    this.runner = null;

    /** @type {FlowRunnerPanel|null} */
    this.flowRunner = null;

    /** @type {TextSplitter|null} */
    this.splitter = null;

    /** @type {AudioDownloader|null} */
    this.audioDownloader = null;   // 🎵 new panel

    /** @type {GoogleAIStudioPanel|null} */
    this.aiStudioSettings = null;

    /** @type {GoogleAIStudioSpeechPanel|null} */
    this.aiStudioSpeechSettings = null;

    /** @type {SRTAutomationPanel|null} */
    this.srtAutomation = null; // 👈 Thêm thuộc tính mới

    /** @type {YoutubeStudioPanel|null} */
    this.youtubePanel = null; // <-- Thêm dòng này

    // Observe DOM mutations so we can inject buttons when chat UI appears
    this._observer = new MutationObserver(() => {
      if (window.ChatAdapter) {
        window.ChatAdapter.insertHelperButtons();
      }
    }
    )
      ;
    this._observer.observe(document.body, { childList: true, subtree: true });

    // Khởi tạo Master Shadow Root duy nhất chứa toàn bộ hệ thống giao diện
    ContentHelper.getShadowRoot();

    // ⌨️  ESC → đóng panel trên cùng
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') ContentHelper.closeTopPanel();
    });
  }

  /* ngay trong class ContentHelper (ngoài mọi hàm) */
  static zTop = 2147483000;   // cao nhưng vẫn < 2^31-1 để còn ++

  /**
   * Phản hồi xúc giác vi mô (Haptic feedback)
   * @param {number|number[]} pattern Độ dài rung tính bằng ms
   */
  static playHapticFeedback(pattern = 8) {
    try {
      if (window.navigator?.vibrate) window.navigator.vibrate(pattern);
    } catch (e) {
      // Fail silently - không chặn luồng chính
    }
  }

  /**
   * Tương thích ngược: Rung nhẹ khi bấm nút (không phát âm thanh)
   */
  static playMechanicalClick() {
    this.playHapticFeedback(8);
  }

  /**
   * Tương thích ngược: Rung nhịp đôi khi hoàn tất tác vụ (không phát âm thanh)
   */
  static playDoneThump() {
    this.playHapticFeedback([12, 30, 12]);
  }

  /* UI helpers */
  _createButton({ id, text, className, onClick }) {
    const btn = document.createElement("button");
    btn.id = id;
    btn.textContent = text;
    btn.className = className;
    btn.addEventListener("click", (e) => {
      console.log(`🔘 [ContentHelper] Click ${text}`);
      ContentHelper.playMechanicalClick();
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  _toggleBuilder() {
    if (this.builder) {
      console.log("❌ [ContentHelper] Closing ScenarioBuilder");
      this.builder.destroy();
      this.builder = null;
      return;
    }
    console.log("📝 [ContentHelper] Opening ScenarioBuilder");
    this.builder = new ScenarioBuilder(() => (this.builder = null));
  }

  /* ---------- toggle splitter ---------- */
  _toggleSplitter() {
    if (this.splitter) {               // đang mở → đóng
      console.log("❌ [ContentHelper] Closing TextSplitter");
      this.splitter.destroy();
      this.splitter = null;
      return;
    }

    console.log("✂️  [ContentHelper] Opening TextSplitter");
    this.splitter = new TextSplitter(() => (this.splitter = null));
  }

  _toggleRunner() {
    if (this.runner) {
      if (this.runner._isBusy && this.runner._isBusy()) {
        if (!confirm("Kịch bản đang chạy. Bạn có chắc chắn muốn đóng và dừng kịch bản không?")) {
          return;
        }
      }
      console.log("❌ [ContentHelper] Closing ScenarioRunner");
      this.runner.destroy();
      this.runner = null;
      return;
    }
    console.log("🚀 [ContentHelper] Opening ScenarioRunner");
    this.runner = new ScenarioRunner(() => (this.runner = null));
  }

  _toggleFlowRunner() {
    if (this.flowRunner) {
      if (this.flowRunner._isBusy && this.flowRunner._isBusy()) {
        if (!confirm("Flow đang chạy. Bạn có chắc chắn muốn đóng và dừng flow không?")) {
          return;
        }
      }
      console.log("❌ [ContentHelper] Closing FlowRunnerPanel");
      this.flowRunner.destroy();
      this.flowRunner = null;
      return;
    }
    console.log("🔗 [ContentHelper] Opening FlowRunnerPanel");
    this.flowRunner = new FlowRunnerPanel(() => (this.flowRunner = null));
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
    this.contentCopyPanel = new ContentCopyPanel(
      () => (this.contentCopyPanel = null));
  }

  _toggleAIStudioSettings() {
    let panelExists = false;
    const shadow = ContentHelper.getShadowRoot();
    const existingEl = shadow.getElementById('google-ai-studio-panel');
    if (existingEl) {
      existingEl.remove();
      panelExists = true;
    }

    if (this.aiStudioSettings) {
      this.aiStudioSettings.destroy();
      this.aiStudioSettings = null;
      panelExists = true;
    }

    if (panelExists) return;

    this.aiStudioSettings = new GoogleAIStudioPanel(() => (this.aiStudioSettings = null));
  }

  _toggleAIStudioSpeechSettings() {
    let panelExists = false;
    const shadow = ContentHelper.getShadowRoot();
    const existingEl = shadow.getElementById('google-ai-studio-speech-panel');
    if (existingEl) {
      existingEl.remove();
      panelExists = true;
    }

    if (this.aiStudioSpeechSettings) {
      this.aiStudioSpeechSettings.destroy();
      this.aiStudioSpeechSettings = null;
      panelExists = true;
    }

    if (panelExists) return;

    this.aiStudioSpeechSettings = new GoogleAIStudioSpeechPanel(() => (this.aiStudioSpeechSettings = null));
  }

  _toggleSRTAutomation() {
    if (this.srtAutomation) {
      this.srtAutomation.destroy();
      this.srtAutomation = null;
      return;
    }
    this.srtAutomation = new SRTAutomationPanel(() => (this.srtAutomation = null));
  }

  _toggleYoutubePanel() {
    if (this.youtubePanel) {
      this.youtubePanel.destroy();
      this.youtubePanel = null;
      return;
    }
    if (window.YoutubeStudioPanel) {
      this.youtubePanel = new YoutubeStudioPanel(
        () => (this.youtubePanel = null));
    } else {
      ContentHelper.showToast("Lỗi: Không tìm thấy YoutubeStudioPanel.", "error");
    }
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
      ContentHelper.bringToFront(el);

      const rect = el.getBoundingClientRect();
      shiftX = e.clientX - rect.left;
      shiftY = e.clientY - rect.top;

      if (!el.dataset.free) {           // tách khỏi bar 1 lần duy nhất
        el.dataset.free = "1";

        /* Tắt animation để không flash */
        el.style.animation = "none";

        el.style.position = "fixed";
        el.style.left = rect.left + "px";
        el.style.top = rect.top + "px";
        el.style.bottom = "auto";
        el.style.right = "auto";
        el.style.width = rect.width + "px";
        ContentHelper.getShadowRoot().appendChild(el);
      }

      const onMouseMove = (ev) => {
        el.style.left = (ev.clientX - shiftX) + "px";
        el.style.top = (ev.clientY - shiftY) + "px";
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
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
    btn.addEventListener("mouseup", stopAll, true);

    // 2️⃣ Khi click → đóng panel
    btn.addEventListener("click", (ev) => {
      stopAll(ev);        // chặn thêm một lần

      // KIỂM TRA TRẠNG THÁI BẬN (chỉ áp dụng cho các panel có _isBusy)
      // Lấy đối tượng instance tương ứng (builder, runner, splitter...)
      const h = window.__helperInjected;
      if (h) {
        // Tìm xem panel nào đang được đóng
        let instance = null;
        if (h.builder && h.builder.el === panelEl) instance = h.builder;
        else if (h.runner && h.runner.el === panelEl) instance = h.runner;
        else if (h.flowRunner && h.flowRunner.el === panelEl) instance = h.flowRunner;
        else if (h.splitter && h.splitter.el === panelEl) instance = h.splitter;
        else if (h.audioDownloader && h.audioDownloader.el === panelEl) instance = h.audioDownloader;
        else if (h.contentCopyPanel && h.contentCopyPanel.el === panelEl) instance = h.contentCopyPanel;
        else if (h.aiStudioSettings && h.aiStudioSettings.el === panelEl) instance = h.aiStudioSettings;
        else if (h.srtAutomation && h.srtAutomation.el === panelEl) instance = h.srtAutomation;
        else if (h.youtubePanel && h.youtubePanel.el === panelEl) instance = h.youtubePanel;

        if (instance && instance._isBusy && instance._isBusy()) {
          if (!confirm("Bảng điều khiển đang hoạt động. Bạn có chắc chắn muốn đóng không?")) {
            return;
          }
        }
      }

      onClose();          // gọi hàm hủy
    });

    panelEl.appendChild(btn);
  }

  /**
   * Thêm nút thu nhỏ (minimize) vào panel.
   * Khi click, panel ẩn đi và xuất hiện bong bóng (bubble) kiểu Messenger.
   * Click vào bubble sẽ khôi phục (restore) panel.
   * 
   * @param {HTMLElement} panelEl - Panel cần thêm nút minimize
   * @param {Object} options - Tuỳ chọn hiển thị
   * @param {string} options.icon - Emoji/icon hiển thị trên bubble (mặc định: '📤')
   * @param {string} options.tooltip - Tooltip khi hover bubble
   * @param {Function} [options.onMinimize] - Callback khi minimize
   * @param {Function} [options.onRestore] - Callback khi restore
   * @param {Function} [options.getBadgeInfo] - Hàm trả về { text, status } cho badge
   * @returns {Object} Controller { minimize(), restore(), updateBadge(text, status), destroy() }
   */
  static addMinimizeButton(panelEl, options = {}) {
    const {
      icon = '▶',
      tooltip = 'Panel',
      onMinimize = null,
      onRestore = null,
      getBadgeInfo = null
    } = options;

    let bubbleEl = null;
    let badgeEl = null;
    let isMinimized = false;
    let badgeInterval = null;

    // === Tạo nút minimize ===
    const btn = document.createElement("button");
    btn.className = "panel-minimize";
    btn.textContent = "−"; // Ký tự minus
    btn.title = "Thu nhỏ";

    // Ngăn sự kiện lan toả (giống addCloseButton)
    const stopAll = (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    };
    btn.addEventListener("mousedown", stopAll, true);
    btn.addEventListener("mouseup", stopAll, true);

    btn.addEventListener("click", (ev) => {
      stopAll(ev);
      controller.minimize();
    });

    panelEl.appendChild(btn);

    // === Tạo floating bubble (bong bóng Messenger) ===
    function _createBubble() {
      bubbleEl = document.createElement("div");
      bubbleEl.className = "panel-bubble";
      bubbleEl.dataset.tooltip = tooltip;
      bubbleEl.textContent = icon;

      // Tự động offset vị trí bottom khi có nhiều bubble
      const existingBubbles = document.querySelectorAll('.panel-bubble');
      const offsetIndex = existingBubbles.length; // 0-based
      bubbleEl.style.bottom = (120 + offsetIndex * 70) + 'px';

      // Badge
      badgeEl = document.createElement("span");
      badgeEl.className = "panel-bubble-badge idle";
      badgeEl.textContent = "−";
      bubbleEl.appendChild(badgeEl);

      // Click bubble → restore panel
      bubbleEl.addEventListener("click", () => {
        controller.restore();
      });

      ContentHelper.getShadowRoot().appendChild(bubbleEl);

      // Bắt đầu cập nhật badge nếu có getBadgeInfo
      if (getBadgeInfo) {
        _updateBadgeFromCallback();
        badgeInterval = setInterval(_updateBadgeFromCallback, 1000);
      }
    }

    // Cập nhật badge từ callback
    function _updateBadgeFromCallback() {
      if (!getBadgeInfo || !badgeEl) return;
      const info = getBadgeInfo();
      if (info) {
        badgeEl.textContent = info.text || "−";
        // Cập nhật class trạng thái
        badgeEl.className = `panel-bubble-badge ${info.status || 'idle'}`;
        // Thêm/bỏ class ripple khi đang chạy
        if (info.status === 'running') {
          bubbleEl.classList.add('is-running');
        } else {
          bubbleEl.classList.remove('is-running');
        }
      }
    }

    // Xoá bubble khỏi DOM
    function _removeBubble() {
      if (badgeInterval) {
        clearInterval(badgeInterval);
        badgeInterval = null;
      }
      if (bubbleEl) {
        bubbleEl.style.animation = 'bubble-pop-out 0.25s ease-in forwards';
        setTimeout(() => {
          bubbleEl?.remove();
          bubbleEl = null;
          badgeEl = null;
        }, 250);
      }
    }

    // === Controller object ===
    const controller = {
      /** Thu nhỏ panel thành bubble */
      minimize() {
        if (isMinimized) return;
        isMinimized = true;
        panelEl.classList.add('panel-minimized');
        _createBubble();
        onMinimize?.();
      },

      /** Khôi phục panel từ bubble */
      restore() {
        if (!isMinimized) return;
        isMinimized = false;
        _removeBubble();
        panelEl.classList.remove('panel-minimized');
        onRestore?.();
      },

      /** Cập nhật badge thủ công */
      updateBadge(text, status = 'idle') {
        if (badgeEl) {
          badgeEl.textContent = text;
          badgeEl.className = `panel-bubble-badge ${status}`;
          if (status === 'running') {
            bubbleEl?.classList.add('is-running');
          } else {
            bubbleEl?.classList.remove('is-running');
          }
        }
      },

      /** Kiểm tra trạng thái minimized */
      get isMinimized() {
        return isMinimized;
      },

      /** Dọn dẹp hoàn toàn */
      destroy() {
        _removeBubble();
        btn.remove();
      }
    };

    return controller;
  }

  /**
   * Hàm tiện ích đưa panel vào bar
   * @param {T} el
   */
  /**
   * Trả về Single Master Shadow Root duy nhất của Content Helper.
   * Cách ly 100% CSS khỏi trang web chủ, chống xung đột giao diện.
   * @returns {ShadowRoot}
   */
  static getShadowRoot() {
    let host = document.getElementById('content-helper-root');
    if (host && host.shadowRoot) {
      return host.shadowRoot;
    }

    if (!host) {
      host = document.createElement('div');
      host.id = 'content-helper-root';
      // Inline styles cố định cho Host trên Light DOM
      host.style.position = 'fixed';
      host.style.inset = '0';
      host.style.width = '100vw';
      host.style.height = '100vh';
      host.style.pointerEvents = 'none'; // Xuyên thấu toàn bộ, chỉ con bên trong mới nhận click
      host.style.zIndex = '2147483640';

      const parent = document.body || document.documentElement;
      parent.appendChild(host);
    }

    let shadow = host.shadowRoot;
    if (!shadow) {
      shadow = host.attachShadow({ mode: 'open' });

      // Nạp 3 stylesheet vào Shadow DOM
      const cssFiles = [
        'content/css/tokens.css',
        'content/css/base.css',
        'content/css/components.css'
      ];

      cssFiles.forEach(path => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL(path);
        shadow.appendChild(link);
      });

      // Tạo sẵn dock bar cho Panels
      const bar = document.createElement('div');
      bar.id = 'content-helper-panel-bar';
      shadow.appendChild(bar);

      // Tạo sẵn container cho Toasts
      const toastBox = document.createElement('div');
      toastBox.id = 'ts-toast-container';
      shadow.appendChild(toastBox);
    }

    return shadow;
  }

  /* ---------- mountPanel: đưa panel vào thanh bar trong Shadow DOM ---------- */
  static mountPanel(el) {
    el.classList.add('helper-panel');

    const shadow = ContentHelper.getShadowRoot();
    let bar = shadow.getElementById('content-helper-panel-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'content-helper-panel-bar';
      shadow.appendChild(bar);
    }

    bar.appendChild(el);

    const handle = el.querySelector('.ts-header, .sb-title, .sr-header, .ts-title');
    if (handle) {
      handle.style.userSelect = 'none';
      handle.addEventListener('mousedown', () => ContentHelper.bringToFront(el));
    }
  }

  /* ---------- bringToFront: luôn đưa panel lên trên cùng ---------- */
  static bringToFront(el) {
    if (el.dataset.free) {                        // panel đã “floating”
      el.style.zIndex = ++ContentHelper.zTop;    // chỉ đổi z-index
    } else {                                       // panel còn trong thanh bar
      const shadow = ContentHelper.getShadowRoot();
      const bar = shadow.getElementById('content-helper-panel-bar');

      if (bar && bar.lastElementChild !== el) {
        el.style.animation = 'none';             // tắt hiệu ứng fadeIn
        bar.appendChild(el);                     // đưa về cuối thanh
      }
    }
  }

  static closeTopPanel() {
    const shadow = ContentHelper.getShadowRoot();
    const barPanels = Array.from(shadow.querySelectorAll(
      '#content-helper-panel-bar .helper-panel'));
    const floating = Array.from(shadow.querySelectorAll(
      '.helper-panel[data-free="1"]'));

    const lastEl = floating.at(-1) || barPanels.at(-1);
    if (!lastEl) return;
    lastEl.querySelector('.panel-close')?.click();
  }

  /* 👇  thêm vào cuối class */
  destroy() {
    console.log("❌ [ContentHelper] destroy");
    this._observer?.disconnect();
    const shadow = ContentHelper.getShadowRoot();
    shadow.getElementById('content-helper-button-container')?.remove();
  }

  /**
   * Tìm kiếm mờ (fuzzy search) có tính điểm số
   * @param {string} query Chuỗi tìm kiếm
   * @param {string} text Chuỗi đích
   * @returns {number} Điểm số (0 nếu không khớp, >0 nếu khớp)
   */
  static fuzzySearch(query, text) {
    if (!query) return 1;
    const q = query.toLowerCase().replace(/\s+/g, ''); // Xóa khoảng trắng để search linh hoạt
    const t = text.toLowerCase();

    let score = 0;
    let textIdx = -1;
    let lastMatchIdx = -1;

    for (let i = 0; i < q.length; i++) {
      const char = q[i];
      textIdx = t.indexOf(char, textIdx + 1);
      if (textIdx === -1) return 0; // Không tìm thấy ký tự → không khớp

      // --- TÍNH ĐIỂM ---
      // 1. Điểm cơ bản cho mỗi ký tự khớp
      score += 10;

      // 2. Bonus nếu ký tự khớp ở đầu chuỗi
      if (textIdx === 0 && i === 0) score += 50;

      // 3. Bonus nếu các ký tự khớp nằm sát nhau (không bị skip nhiều)
      if (lastMatchIdx !== -1 && textIdx === lastMatchIdx + 1) {
        score += 20;
      }

      // 4. Bonus nếu ký tự khớp là bắt đầu của một từ (sau dấu cách, [, ], -, _)
      if (textIdx > 0 && /[\s\[\]\-_]/.test(t[textIdx - 1])) {
        score += 30;
      }

      lastMatchIdx = textIdx;
    }

    return score;
  }

  /**
   * Hiển thị thông báo Toast siêu cấp
   * @param {string} message 
   * @param {'success'|'error'|'warning'|'info'} type 
   * @param {number} duration 
   */
  static showToast(message, type = 'info', duration = 3500) {
    const shadow = ContentHelper.getShadowRoot();
    let container = shadow.getElementById('ts-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ts-toast-container';
      shadow.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `ts-toast ${type}`;

    const icons = {
      success: '✓',
      error: '✕',
      warning: '!',
      info: 'i'
    };

    toast.innerHTML = `
      <span class="ts-toast-icon">${icons[type]}</span>
      <span class="ts-toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Tự động đóng sau duration
    const hideTimeout = setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    // Click để đóng ngay lập tức
    toast.onclick = () => {
      clearTimeout(hideTimeout);
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    };
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

// Thay thế hàm này trong file content-helper.js

// Thay thế hàm này trong file content-helper.js

async function _downloadFromFirestore() {
  console.log("☁️ [Firestore Sync] Starting download for all configs...");

  const { google_user_email: userId } = await chrome.storage.local.get("google_user_email");

  if (!userId) {
    console.warn("⚠️ User not logged in, cannot download from Firestore.");
    return;
  }

  const helper = new FirestoreHelper(firebaseConfig);

  // --- 1. Tải Scenario Templates ---
  try {
    helper.collection = 'configs';
    const scenarioData = await helper.loadUserConfig(userId);
    if (scenarioData) {
      await chrome.storage.local.set({ scenarioTemplates: scenarioData });
      console.log("✅ Scenario templates downloaded from Firestore.");
    }
  } catch (err) { console.error("❌ Error downloading scenario templates:", err); }

  // --- 2. Tải Speech Profiles ---
  try {
    helper.collection = 'speech_profiles';
    const speechProfileData = await helper.loadUserConfig(userId);
    if (speechProfileData) {
      await chrome.storage.local.set({ google_ai_studio_profiles: speechProfileData });
      console.log("✅ Speech profiles downloaded from Firestore.");
    }
  } catch (err) { console.error("❌ Error downloading speech profiles:", err); }

  // --- 3. Tải YouTube Language Profiles (MỚI) ---
  try {
    helper.collection = 'youtube_language_profiles';
    const ytProfileData = await helper.loadUserConfig(userId);
    if (ytProfileData) {
      await chrome.storage.local.set({ youtube_language_profiles: ytProfileData });
      console.log("✅ YouTube language profiles downloaded from Firestore.");
    }
  } catch (err) { console.error("❌ Error downloading YouTube profiles:", err); }

  // --- 4. Tải cấu hình hiển thị nút ---
  try {
    helper.collection = 'button_configs';
    const buttonConfigsData = await helper.loadUserConfig(userId);
    if (buttonConfigsData) {
      await chrome.storage.local.set({ button_configs: buttonConfigsData });
      window.__buttonConfigs = buttonConfigsData;
      console.log("✅ Button configs downloaded from Firestore.");
    }
  } catch (err) { console.error("❌ Error downloading button configs:", err); }
}
// ❶  auto‑check ngay khi trang / script được load
chrome.storage.local.get(['gg_access_token', 'button_configs'], data => {
  if (data.button_configs) {
    window.__buttonConfigs = data.button_configs;
  }
  // Luôn khởi tạo ContentHelper để người dùng có thể sử dụng các panel cục bộ ngay lập tức
  showButtons();
  if (data.gg_access_token) {
    _downloadFromFirestore();
  }
});

function showButtons() {
  if (window.__helperInjected) return;       // đã có → thoát
  window.__helperInjected = new ContentHelper();
}

function hideButtons() {
  if (!window.__helperInjected) return;      // chưa hiển thị

  // hủy panel con (nếu còn mở)
  const h = window.__helperInjected;
  h.builder?.destroy?.();
  h.runner?.destroy?.();
  h.flowRunner?.destroy?.();
  h.splitter?.destroy?.();
  h.audioDownloader?.destroy?.();
  h.srtAutomation?.destroy?.();
  h.aiStudioSettings?.destroy?.();
  h.aiStudioSpeechSettings?.destroy?.();

  // ngắt observer & xóa khung nút
  h.destroy();                               // ⬅️ gọi hàm mới

  window.__helperInjected = null;            // reset flag
}

