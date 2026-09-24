// QwenAdapter.js – Adapter cho qwen.ai
// -----------------------------------------------------------------------------

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

  isDone() {
    const stopBtn = this.getStopBtn();
    if (stopBtn) return false;

    const sendBtn = this.getSendBtn();
    if (!sendBtn) return false;

    const isDisabled = sendBtn.disabled || sendBtn.classList.contains('disabled');
    if (!isDisabled) return true;

    const textarea = this.getTextarea();
    const isEmpty = !textarea.value || textarea.value.trim() === '';

    if (isDisabled && isEmpty) {
      return true;
    }

    return false;
  }

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
    return Array.from(document.querySelectorAll(
      '.qwen-chat-message-assistant .response-message-content.t2t.phase-answer .qwen-markdown.qwen-markdown-loose, ' +
      '.response-message-body .markdown-content-container, ' +
      '.response-message-body .markdown-prose, ' +
      '.bot-message .markdown-body'
    ));
  }
}

window.QwenAdapter = QwenAdapter;
