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

    /** @type {ContentCopyPanel|null} */
    this.contentCopyPanel = null;

    /** @type {BasePanel|null} */
    this.activePanel = null;

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

  /**
   * Đảm bảo chỉ có 1 panel được mở tại một thời điểm (Single Active Panel Policy).
   * Khi mở panel mới, panel cũ đang mở sẽ được tự động đóng lại an toàn.
   * @param {string} panelKey - Tên thuộc tính panel trong ContentHelper
   * @param {Function} createInstanceFn - Hàm khởi tạo instance
   */
  _toggleExclusivePanel(panelKey, createInstanceFn) {
    const currentInstance = this[panelKey];

    // 1. Nếu chính panel này đang tồn tại
    if (currentInstance) {
      // 1.1. Nếu đang bị thu nhỏ thành bubble -> Khôi phục lên làm active Bottom Sheet
      if (currentInstance._minimizeCtrl?.isMinimized) {
        if (!this._closeOtherOpenPanels(panelKey)) {
          return;
        }
        currentInstance._minimizeCtrl.restore();
        ContentHelper.bringToFront(currentInstance.el);
        this.activePanel = currentInstance;
        return;
      }

      // 1.2. Nếu đang mở hiển thị trên màn hình -> Kiểm tra bận trước khi đóng
      if (currentInstance._isBusy && currentInstance._isBusy()) {
        if (!confirm("Bảng điều khiển đang hoạt động. Bạn có chắc chắn muốn đóng và dừng tác vụ không?")) {
          return;
        }
      }
      console.log(`❌ [ContentHelper] Closing ${panelKey}`);
      currentInstance.destroy();
      this[panelKey] = null;
      if (this.activePanel === currentInstance) {
        this.activePanel = null;
      }
      return;
    }

    // 2. Nếu panel này chưa mở -> Cần mở mới
    // Đóng bất kỳ panel nào khác đang mở trên màn hình
    if (!this._closeOtherOpenPanels(panelKey)) {
      return;
    }

    console.log(`🚀 [ContentHelper] Opening ${panelKey}`);
    try {
      const instance = createInstanceFn();
      this[panelKey] = instance;
      this.activePanel = instance;
    } catch (err) {
      console.error(`❌ [ContentHelper] Lỗi khi tạo panel ${panelKey}:`, err);
      ContentHelper.showToast(`Lỗi khi mở panel: ${err.message}`, "error");
    }
  }

  /**
   * Đóng an toàn các panel khác đang hiển thị (không đóng bubble đang thu nhỏ chạy background)
   * @param {string} [exceptKey] - Bỏ qua key này
   * @returns {boolean} true nếu thành công đóng hoặc không có panel nào; false nếu người dùng chọn Hủy vì bận
   */
  _closeOtherOpenPanels(exceptKey = null) {
    const allPanelKeys = [
      'builder', 'runner', 'flowRunner', 'splitter',
      'audioDownloader', 'contentCopyPanel', 'aiStudioSettings',
      'aiStudioSpeechSettings', 'srtAutomation', 'youtubePanel'
    ];

    for (const key of allPanelKeys) {
      if (key === exceptKey) continue;
      const p = this[key];
      // Chỉ đóng các panel đang HIỂN THỊ (chưa bị minimize thành bubble)
      if (p && !p._minimizeCtrl?.isMinimized) {
        if (p._isBusy && p._isBusy()) {
          if (!confirm("Một bảng điều khiển khác đang hoạt động. Bạn có chắc chắn muốn đóng để mở công cụ này không?")) {
            return false;
          }
        }
        console.log(`🔄 [ContentHelper] Auto-closing previous panel: ${key}`);
        p.destroy();
        this[key] = null;
      }
    }
    return true;
  }

  _toggleBuilder() {
    this._toggleExclusivePanel('builder', () => new ScenarioBuilder(() => (this.builder = null)));
  }

  _toggleSplitter() {
    this._toggleExclusivePanel('splitter', () => new TextSplitter(() => (this.splitter = null)));
  }

  _toggleRunner() {
    this._toggleExclusivePanel('runner', () => new ScenarioRunner(() => (this.runner = null)));
  }

  _toggleFlowRunner() {
    this._toggleExclusivePanel('flowRunner', () => new FlowRunnerPanel(() => (this.flowRunner = null)));
  }

  _toggleAudioDownloader() {
    this._toggleExclusivePanel('audioDownloader', () => new AudioDownloader(() => (this.audioDownloader = null)));
  }

  _toggleContentCopyPanel() {
    this._toggleExclusivePanel('contentCopyPanel', () => new ContentCopyPanel(() => (this.contentCopyPanel = null)));
  }

  _toggleAIStudioSettings() {
    this._toggleExclusivePanel('aiStudioSettings', () => new GoogleAIStudioPanel(() => (this.aiStudioSettings = null)));
  }

  _toggleAIStudioSpeechSettings() {
    this._toggleExclusivePanel('aiStudioSpeechSettings', () => new GoogleAIStudioSpeechPanel(() => (this.aiStudioSpeechSettings = null)));
  }

  _toggleSRTAutomation() {
    this._toggleExclusivePanel('srtAutomation', () => new SRTAutomationPanel(() => (this.srtAutomation = null)));
  }

  _toggleYoutubePanel() {
    if (!window.YoutubeStudioPanel) {
      ContentHelper.showToast("Lỗi: Không tìm thấy YoutubeStudioPanel.", "error");
      return;
    }
    this._toggleExclusivePanel('youtubePanel', () => new YoutubeStudioPanel(() => (this.youtubePanel = null)));
  }

  /* ---------- Cử chỉ vuốt/kéo chuẩn Bottom Sheet (Dual-Action: Drag to Resize & Swipe-down to dismiss) ---------- */
  static attachBottomSheetSwipe(el, handleSelector = null) {
    let handles = [];
    if (typeof handleSelector === "string") {
      handles = Array.from(el.querySelectorAll(handleSelector));
    } else if (Array.isArray(handleSelector)) {
      handles = handleSelector.filter(Boolean);
    } else if (handleSelector) {
      handles = [handleSelector];
    } else {
      handles = [el.querySelector('.ts-sheet-handle') || el.querySelector('.ts-header') || el];
    }

    if (handles.length === 0) return;

    handles.forEach(handle => {
      let startY = 0;
      let startHeight = 0;
      let isDragging = false;
      let isResizing = false;
      let currentDy = 0;
      let initialHeightStyle = '';

      const onMouseDown = (e) => {
        // Chỉ nhận chuột trái, không chặn click nút close/minimize hoặc controls
        if (e.button !== 0 || e.target.closest('.panel-close, .panel-minimize, button, input, select, textarea, label')) return;
        e.preventDefault();

        ContentHelper.bringToFront(el);

        startY = e.clientY;
        startHeight = el.getBoundingClientRect().height;
        initialHeightStyle = el.style.height;
        isDragging = true;
        isResizing = false;
        currentDy = 0;

        el.style.transition = 'none';

        const onMouseMove = (ev) => {
          if (!isDragging) return;
          const dy = ev.clientY - startY;

          // Hướng 1: Kéo lên trên (dy < 0) => Tăng chiều cao của Panel (Resize Taller)
          if (dy < 0) {
            isResizing = true;
            currentDy = 0;
            el.style.transform = 'translateY(0)';

            // Cho phép panel mở rộng tới 92% màn hình hoặc 960px
            const maxAllowed = Math.min(window.innerHeight * 0.92, 960);
            const newHeight = Math.min(maxAllowed, startHeight - dy);

            el.style.maxHeight = '92vh';
            el.style.height = `${Math.round(newHeight)}px`;
          } 
          // Hướng 2: Kéo xuống dưới (dy > 0)
          else {
            // Nếu panel trước đó đã được kéo dãn cao hơn chiều cao cơ sở:
            // Cho phép kéo thu ngắn chiều cao lại trước
            if (isResizing || (initialHeightStyle && parseInt(initialHeightStyle, 10) > 300)) {
              const newHeight = startHeight - dy;
              if (newHeight >= 260) {
                el.style.height = `${Math.round(newHeight)}px`;
                el.style.transform = 'translateY(0)';
                currentDy = 0;
                return;
              }
            }

            // Nếu đang ở chiều cao cơ sở => Cử chỉ vuốt để đóng/thu nhỏ (Swipe to Dismiss)
            currentDy = dy;
            el.style.transform = `translateY(${currentDy}px)`;
          }
        };

        const onMouseUp = () => {
          if (!isDragging) return;
          isDragging = false;
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);

          // Nếu kéo xuống > 80px: Tự động thu nhỏ (minimize) hoặc đóng panel
          if (currentDy > 80) {
            el.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease';
            el.style.transform = 'translateY(100%)';
            el.style.opacity = '0';

            setTimeout(() => {
              const minBtn = el.querySelector('.panel-minimize');
              const closeBtn = el.querySelector('.panel-close');
              if (minBtn) {
                minBtn.click();
              } else if (closeBtn) {
                closeBtn.click();
              }
              // Reset transform cho lần mở tiếp theo
              el.style.transform = '';
              el.style.opacity = '';
              el.style.transition = '';
            }, 200);
          } else {
            // Nảy về vị trí ban đầu (Snap back) mượt mà
            el.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
            el.style.transform = 'translateY(0)';
            setTimeout(() => {
              el.style.transition = '';
            }, 220);
          }
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      };

      handle.addEventListener("mousedown", onMouseDown);

      // Double-click vào Handle bar: Khôi phục chiều cao tự nhiên (Fit-Content)
      if (handle.classList.contains('ts-sheet-handle') || handle.querySelector('.ts-sheet-handle__bar')) {
        handle.addEventListener("dblclick", (e) => {
          e.preventDefault();
          el.style.transition = 'height 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
          el.style.height = 'auto';
          el.style.maxHeight = '';
          setTimeout(() => {
            el.style.transition = '';
          }, 220);
        });
      }
    });
  }

  // Tương thích ngược: chuyển hướng kéo thả sang Bottom Sheet swipe
  static makeDraggable(el, handleSelector = null) {
    this.attachBottomSheetSwipe(el, handleSelector);
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
      bubbleEl.style.setProperty('pointer-events', 'auto', 'important');
      bubbleEl.style.cursor = 'pointer';
      bubbleEl.style.animation = 'bubble-pop-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards';

      // Tự động offset vị trí bottom khi có nhiều bubble trong Shadow Root
      const shadow = ContentHelper.getShadowRoot();
      const existingBubbles = shadow.querySelectorAll('.panel-bubble');
      const offsetIndex = existingBubbles.length; // 0-based
      bubbleEl.style.bottom = (120 + offsetIndex * 60) + 'px';

      // Badge
      badgeEl = document.createElement("span");
      badgeEl.className = "panel-bubble-badge idle";
      badgeEl.style.setProperty('pointer-events', 'none', 'important');
      badgeEl.textContent = "−";
      bubbleEl.appendChild(badgeEl);

      // Click bubble → restore panel
      const handleRestore = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        controller.restore();
      };
      bubbleEl.addEventListener("click", handleRestore);

      shadow.appendChild(bubbleEl);

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
          bubbleEl?.classList.add('is-running');
        } else {
          bubbleEl?.classList.remove('is-running');
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
        bubbleEl.style.setProperty('pointer-events', 'none', 'important');
        bubbleEl.style.animation = 'bubble-pop-out 0.25s ease-in forwards';
        const elToRemove = bubbleEl;
        setTimeout(() => {
          elToRemove?.remove();
        }, 250);
        bubbleEl = null;
        badgeEl = null;
      }
    }

    // === Controller object ===
    const controller = {
      /** Thu nhỏ panel thành bubble */
      minimize() {
        if (isMinimized) return;
        isMinimized = true;
        panelEl._origDisplay = panelEl.style.display || '';
        panelEl.classList.add('panel-minimized');
        panelEl.style.setProperty('display', 'none', 'important');
        _createBubble();
        onMinimize?.();
      },

      /** Khôi phục panel từ bubble */
      restore() {
        if (!isMinimized) return;
        // Đóng bất kỳ panel nào khác đang mở trên màn hình
        const h = window.__helperInjected;
        if (h && typeof h._closeOtherOpenPanels === 'function') {
          let myKey = null;
          const allKeys = [
            'builder', 'runner', 'flowRunner', 'splitter',
            'audioDownloader', 'contentCopyPanel', 'aiStudioSettings',
            'aiStudioSpeechSettings', 'srtAutomation', 'youtubePanel'
          ];
          for (const k of allKeys) {
            if (h[k] && h[k].el === panelEl) {
              myKey = k;
              break;
            }
          }
          if (!h._closeOtherOpenPanels(myKey)) {
            return;
          }
          if (myKey && h[myKey]) {
            h.activePanel = h[myKey];
          }
        }

        isMinimized = false;
        _removeBubble();
        panelEl.classList.remove('panel-minimized');
        panelEl.style.removeProperty('display');
        if (panelEl._origDisplay) {
          panelEl.style.display = panelEl._origDisplay;
        } else {
          panelEl.style.display = 'flex';
        }
        ContentHelper.bringToFront(panelEl);
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
    if (!ContentHelper.zTop || isNaN(ContentHelper.zTop)) {
      ContentHelper.zTop = 2147483640;
    }
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
    const activePanelEl = shadow.querySelector(
      '#content-helper-panel-bar .ts-panel:not(.panel-minimized), #content-helper-panel-bar .helper-panel:not(.panel-minimized)');
    if (activePanelEl) {
      activePanelEl.querySelector('.panel-close')?.click();
    }
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
   * Chuyển đổi prompt template thành HTML highlight cú pháp kiểu IDE Code Editor.
   * Nhận diện: ${varName}, ${varName|opt1,opt2}, markdown heading, markdown bold.
   * @param {string} text - Văn bản gốc
   * @returns {string} - Chuỗi HTML an toàn đã tô màu
   */
  static highlightPromptSyntax(text) {
    if (!text) return '<br>';

    // 1. Escape HTML an toàn tuyệt đối
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Highlight biến và danh sách: ${varName} hoặc ${varName|opt1,opt2}
    escaped = escaped.replace(/\$\{([^}|]+)(?:\|([^}]+))?\}/g, (match, varName, options) => {
      if (options !== undefined) {
        return `<span class="ts-hl-var-wrap"><span class="ts-hl-delim">\${</span><span class="ts-hl-var-name">${varName}</span><span class="ts-hl-pipe">|</span><span class="ts-hl-options">${options}</span><span class="ts-hl-delim">}</span></span>`;
      }
      return `<span class="ts-hl-var-wrap"><span class="ts-hl-delim">\${</span><span class="ts-hl-var-name">${varName}</span><span class="ts-hl-delim">}</span></span>`;
    });

    // 3. Highlight tiêu đề Markdown (### Title)
    escaped = escaped.replace(/^(#{1,6}\s+.*)$/gm, '<span class="ts-hl-heading">$1</span>');

    // 4. Highlight in đậm Markdown (**bold**)
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<span class="ts-hl-bold">**$1**</span>');

    // Đồng bộ chiều cao dòng cuối khi người dùng nhấn Enter
    if (escaped.endsWith('\n')) {
      escaped += '<br>';
    }

    return escaped;
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
  h.contentCopyPanel?.destroy?.();
  h.srtAutomation?.destroy?.();
  h.aiStudioSettings?.destroy?.();
  h.aiStudioSpeechSettings?.destroy?.();
  h.youtubePanel?.destroy?.();

  // ngắt observer & xóa khung nút
  h.destroy();                               // ⬅️ gọi hàm mới

  window.__helperInjected = null;            // reset flag
}

