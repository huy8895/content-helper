// GoogleAIStudioAdapter.js – Adapter cho aistudio.google.com
// -----------------------------------------------------------------------------

class GoogleAIStudioAdapter extends BaseChatAdapter {
  static matches(host) {
    return /aistudio\.google\.com$/i.test(host);
  }

  isCompactMode() { return true; }

  constructor() {
    super();
    this.isSpeechPage = window.location.pathname.includes('/generate-speech');
    console.log(`✅ GoogleAIStudioAdapter khởi tạo. Trang Speech: ${this.isSpeechPage}, Trang Chat: ${!this.isSpeechPage}`);

    if (this.isSpeechPage) {
      setTimeout(() => {
        if (window.GoogleAIStudioSpeechPanel?.triggerAutoSet) {
          window.GoogleAIStudioSpeechPanel.triggerAutoSet();
        }
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
    return this._q('ms-run-button button:not(.stoppable)');
  }

  getStopBtn() {
    if (this.isSpeechPage) return null;
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

    const newElements = Array.from(document.querySelectorAll('ms-chat-turn .model-prompt-container ms-text-chunk'));
    if (newElements.length > 0) {
      return newElements.filter(el => !el.closest('ms-thought-chunk'));
    }

    return Array.from(document.querySelectorAll('div.output-chunk'));
  }

  getButtonConfigs() {
    return [
      BUTTONS.AI_STUDIO_SETTINGS,
      BUTTONS.RUN_SCENARIO,
      BUTTONS.MANAGE_SCENARIO,
      BUTTONS.RUN_FLOW,
      BUTTONS.SRT_AUTOMATION,
      BUTTONS.COPY_CONTENT,
    ];
  }

  collapseAllCodeBlocks() {
    const collapseIcons = document.querySelectorAll('span.material-symbols-outlined');
    let clickCount = 0;

    collapseIcons.forEach(icon => {
      if (icon.textContent.trim() === 'expand_less') {
        const button = icon.closest('button');
        if (button) {
          button.click();
          clickCount++;
        }
      }
    });

    console.log(`Hoàn tất! Đã click vào ${clickCount} nút 'collapse'.`);
    if (clickCount > 0) {
      ContentHelper.showToast(`Đã thu gọn ${clickCount} khối code.`, "success");
    }
  }
}

window.GoogleAIStudioAdapter = GoogleAIStudioAdapter;
