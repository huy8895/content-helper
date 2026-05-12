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

    if (!document.getElementById('chatgpt-helper-panel-bar')) {
      const bar = document.createElement('div');
      bar.id = 'chatgpt-helper-panel-bar';
      // Tailwind: fixed at bottom, centered, gap between panels, high z-index
      bar.className = 'fixed bottom-[90px] left-5 right-5 flex items-end gap-5 pointer-events-none justify-center z-[2147483647]';
      document.body.appendChild(bar);
    }

    // ⌨️  ESC → đóng panel trên cùng
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') ChatGPTHelper.closeTopPanel();
    });
  }

  /* ngay trong class ChatGPTHelper (ngoài mọi hàm) */
  static zTop = 2147483000;   // cao nhưng vẫn < 2^31-1 để còn ++

  /* UI helpers */
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
      if (this.runner._isBusy && this.runner._isBusy()) {
        if (!confirm("Kịch bản đang chạy. Bạn có chắc chắn muốn đóng và dừng kịch bản không?")) {
          return;
        }
      }
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
    this.contentCopyPanel = new ContentCopyPanel(
      () => (this.contentCopyPanel = null));
  }

  _toggleAIStudioSettings() {
    if (this.aiStudioSettings) {
      this.aiStudioSettings.destroy();
      this.aiStudioSettings = null;
      return;
    }
    this.aiStudioSettings = new GoogleAIStudioPanel(() => (this.aiStudioSettings = null));
  }

  _toggleAIStudioSpeechSettings() {
    if (this.aiStudioSpeechSettings) {
      this.aiStudioSpeechSettings.destroy();
      this.aiStudioSpeechSettings = null;
      return;
    }
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
      ChatGPTHelper.showToast("Lỗi: Không tìm thấy YoutubeStudioPanel.", "error");
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
      ChatGPTHelper.bringToFront(el);

      const rect = el.getBoundingClientRect();
      shiftX = e.clientX - rect.left;
      shiftY = e.clientY - rect.top;

      if (!el.dataset.free) {           // tách khỏi bar 1 lần duy nhất
        el.dataset.free = "1";

        /* ✨ tắt animation để không flash */
        el.style.animation = "none";

        el.style.position = "fixed";
        el.style.left = rect.left + "px";
        el.style.top = rect.top + "px";
        el.style.width = rect.width + "px";
        document.body.appendChild(el);
      }


      const onMouseMove = (ev) => {
        el.style.left = ev.clientX - shiftX + "px";
        el.style.top = ev.clientY - shiftY + "px";
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
   * Hàm tiện ích đưa panel vào bar
   * @param {T} el
   */
  /* ---------- mountPanel: đưa panel vào thanh bar ---------- */
  static mountPanel(el) {
    el.classList.add('helper-panel');

    let bar = document.getElementById('chatgpt-helper-panel-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'chatgpt-helper-panel-bar';
      document.body.appendChild(bar);
    }

    bar.appendChild(el);

    const handle = el.querySelector('.sb-title, .sr-header, .ts-title');
    if (handle) {
      handle.style.userSelect = 'none';
      handle.addEventListener('mousedown', () => ChatGPTHelper.bringToFront(el));
    }
  }


  /* ---------- bringToFront: luôn đưa panel lên trên cùng ---------- */
  static bringToFront(el) {
    if (el.dataset.free) {                        // panel đã “floating”
      el.style.zIndex = ++ChatGPTHelper.zTop;    // chỉ đổi z-index
    } else {                                       // panel còn trong thanh bar
      const bar = document.getElementById('chatgpt-helper-panel-bar');

      // Nếu đã là phần tử cuối rồi thì thôi – tránh re-append gây nháy
      if (bar.lastElementChild !== el) {
        el.style.animation = 'none';             // tắt hiệu ứng fadeIn
        bar.appendChild(el);                     // đưa về cuối thanh
      }
    }
  }

  static closeTopPanel() {
    const barPanels = Array.from(document.querySelectorAll(
      '#chatgpt-helper-panel-bar .helper-panel'));
    const floating = Array.from(document.querySelectorAll(
      'body > .helper-panel:not(#chatgpt-helper-panel-bar *)'));

    // panel mở sau cùng = phần tử cuối của mảng floating, nếu không có thì lấy ở bar
    const lastEl = floating.at(-1) || barPanels.at(-1);
    if (!lastEl) return;

    // Thay vì gọi click() thẳng, ta sẽ kích hoạt logic trong close button
    // Cách an toàn nhất là sử dụng logic xác nhận trực tiếp ở đây hoặc kích hoạt click
    // Để tái sử dụng logic trong addCloseButton, ta sẽ giả lập click
    lastEl.querySelector('.panel-close')?.click();
  }

  /* 👇  thêm vào cuối class */
  destroy() {
    console.log("❌ [ChatGPTHelper] destroy");
    // ngắt quan sát
    this._observer?.disconnect();
    // gỡ khung nút nếu còn
    document.getElementById('chatgpt-helper-button-container')?.remove();
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
    let container = document.getElementById('ts-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ts-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `ts-toast ${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
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

// Thay thế hàm này trong file chatgpt-helper.js

// Thay thế hàm này trong file chatgpt-helper.js

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
  h.builder?.destroy?.();
  h.runner?.destroy?.();
  h.splitter?.destroy?.();
  h.audioDownloader?.destroy?.();
  h.srtAutomation?.destroy?.();
  h.aiStudioSettings?.destroy?.();
  h.aiStudioSpeechSettings?.destroy?.();

  // ngắt observer & xóa khung nút
  h.destroy();                               // ⬅️ gọi hàm mới

  window.__helperInjected = null;            // reset flag
}

