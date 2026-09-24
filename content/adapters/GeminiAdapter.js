// GeminiAdapter.js – Adapter cho gemini.google.com
// -----------------------------------------------------------------------------

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

  getTextarea() {
    return document.querySelector('.ql-editor.textarea') ||
      document.querySelector('div[contenteditable="true"][role="textbox"]');
  }

  getSendBtn() {
    return document.querySelector('.send-button button') ||
      document.querySelector('button[aria-label*="Gửi tin nhắn"]') ||
      document.querySelector('button[aria-label*="Send message"]') ||
      document.querySelector('button.send-button');
  }

  isCompactMode() { return true; }

  getStopBtn() {
    return document.querySelector('.send-button.stop button') ||
      document.querySelector('button[aria-label*="Ngừng tạo"]') ||
      document.querySelector('button[aria-label*="Stop generating"]') ||
      document.querySelector('button[aria-label*="Dừng"]');
  }

  getForm() {
    const textarea = this.getTextarea();
    if (!textarea) return null;
    const inputField = textarea.closest('.text-input-field');
    if (inputField) return inputField.parentElement;
    return textarea.parentElement?.parentElement?.parentElement?.parentElement;
  }

  isDone() {
    const stopBtn = this.getStopBtn();
    if (stopBtn) return false;

    const textarea = this.getTextarea();
    const isEmpty = !textarea || !textarea.textContent.trim();

    if (isEmpty) {
      return true;
    }

    const sendBtn = this.getSendBtn();
    if (!sendBtn) return false;

    const container = sendBtn.closest('.send-button-container');
    const isVisible = !sendBtn.classList.contains('hidden') &&
      (!container || container.classList.contains('visible') || !container.classList.contains('hidden'));

    return isVisible;
  }

  getContentElements() {
    return Array.from(document.querySelectorAll('message-content'));
  }

  async enableTemporaryChat() {
    console.log("🔒 [GeminiAdapter] Đang kiểm tra để bật cuộc trò chuyện tạm thời...");
    try {
      const icon = document.querySelector('mat-icon[data-mat-icon-name="gemini_chat_temp"]') || 
                   document.querySelector('mat-icon[fonticon="gemini_chat_temp"]') ||
                   document.querySelector('gem-icon[icon="gemini_chat_temp"]');
      
      if (!icon) {
        console.warn("⚠️ [GeminiAdapter] Không tìm thấy icon trò chuyện tạm thời. Có thể giao diện đã thay đổi hoặc đang ở trạng thái trò chuyện tạm thời sẵn.");
        return false;
      }

      const clickableBtn = icon.closest('button') || icon.closest('gem-icon-button') || icon;
      
      console.log("🖱️ [GeminiAdapter] Đã tìm thấy nút trò chuyện tạm thời. Tiến hành click...");
      clickableBtn.click();
      
      await new Promise(r => setTimeout(r, 1500));
      console.log("🔒 [GeminiAdapter] Đã kích hoạt trò chuyện tạm thời thành công!");
      return true;
    } catch (e) {
      console.error("❌ [GeminiAdapter] Lỗi khi bật trò chuyện tạm thời:", e);
      return false;
    }
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
      if (btn) {
        btn.click();
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

window.GeminiAdapter = GeminiAdapter;
