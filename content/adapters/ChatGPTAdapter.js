// ChatGPTAdapter.js – Adapter cho chatgpt.com
// -----------------------------------------------------------------------------

class ChatGPTAdapter extends BaseChatAdapter {
  static matches(host) {
    return /(?:chat\.openai|chatgpt)\.com$/i.test(host);
  }

  getTextarea() {
    return this._q("#prompt-textarea") || this._q('div[contenteditable="true"][id="prompt-textarea"]');
  }

  getSendBtn() {
    return this._q('button[data-testid="send-button"]') ||
      this._q('button[aria-label="Send prompt"]') ||
      this._q('button[aria-label*="Send" i]') ||
      this._q('button[aria-label*="Gửi" i]') ||
      this._q('form button[type="submit"]');
  }

  getStopBtn() {
    return this._q('button[data-testid="stop-button"]') ||
      this._q('button[aria-label="Stop generating"]') ||
      this._q('button[aria-label*="Stop" i]') ||
      this._q('button[aria-label*="Dừng" i]');
  }

  getVoiceBtn() {
    return this._q('button[data-testid="composer-speech-button"]') ||
      this._q('button[aria-label="Start voice mode"]') ||
      this._q('button[aria-label*="voice" i]') ||
      this._q('button[aria-label*="thoại" i]');
  }

  isDone() {
    const stopBtn = this.getStopBtn();
    // 1. Nếu nút Stop đang tồn tại và hiển thị -> Đang sinh câu trả lời -> Chưa xong
    if (stopBtn && (stopBtn.offsetWidth > 0 || stopBtn.offsetHeight > 0 || stopBtn.getClientRects().length > 0)) {
      return false;
    }

    const voiceBtn = this.getVoiceBtn();
    // 2. TH1: Nút Voice hiển thị (ChatGPT chuyển sang nút mic khi textarea trống và đã sinh xong)
    if (voiceBtn && (voiceBtn.offsetWidth > 0 || voiceBtn.offsetHeight > 0 || voiceBtn.getClientRects().length > 0)) {
      return true;
    }

    const sendBtn = this.getSendBtn();
    // 3. TH2: Nút Send tồn tại nhưng đang ở trạng thái disabled / aria-disabled
    if (sendBtn) {
      const isDisabled = sendBtn.disabled || sendBtn.getAttribute('aria-disabled') === 'true';
      if (isDisabled) {
        return true;
      }
    }

    // 4. TH3: Ô textarea đã trống (ChatGPT dọn sau khi gửi) và không có nút Stop
    const textarea = this.getTextarea();
    if (textarea) {
      const text = textarea.value ?? textarea.textContent ?? '';
      if (!text.trim()) {
        return true;
      }
    }

    // 5. TH4: Xuất hiện nút action bar ở câu trả lời cuối (nút copy/regenerate khi hoàn thành)
    const turnActions = document.querySelectorAll('button[data-testid*="copy"], button[aria-label*="Copy" i], button[data-testid*="good-response"]');
    if (turnActions.length > 0 && !stopBtn) {
      return true;
    }

    // Fallback: Khi không có nút Stop nào đang hiển thị
    return !stopBtn;
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

window.ChatGPTAdapter = ChatGPTAdapter;
