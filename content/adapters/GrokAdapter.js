// GrokAdapter.js – Adapter cho grok.com
// -----------------------------------------------------------------------------

class GrokAdapter extends BaseChatAdapter {
  static matches(host) {
    return /(?:^|\.)grok\.com$|(?:^|\.)grok\.x\.ai$|^x\.com$/i.test(host);
  }

  getTextarea() {
    return this._q('textarea[aria-label="Ask Grok anything"]');
  }

  getSendBtn() {
    return this._q('form button[type="submit"][aria-label="Submit"]');
  }

  getStopBtn() {
    return this._q('button[aria-label="Stop generating"]');
  }

  getForm() {
    return this.getTextarea()?.closest('form') ?? null;
  }

  isDone() {
    const stopBtn = this.getStopBtn();
    const sendBtn = this.getSendBtn();

    return !stopBtn && sendBtn && sendBtn.disabled;
  }

  getContentElements() {
    return Array.from(document.querySelectorAll(
      '.markdown-content-container, .markdown-prose'
    ));
  }
}

window.GrokAdapter = GrokAdapter;
