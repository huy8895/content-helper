/**
 * GoogleAIStudioPanel.js
 * Chuyển tiếp hoàn toàn sang GoogleAIStudioSpeechPanel (chuẩn hóa Scene & Sample Context).
 */

window.GoogleAIStudioPanel = class extends window.BasePanel {
  constructor(onClose) {
    if (window.GoogleAIStudioSpeechPanel) {
      return new window.GoogleAIStudioSpeechPanel(onClose);
    }
    super({
      id: "google-ai-studio-panel",
      title: "AI Studio Settings",
      icon: window.CHIcons ? window.CHIcons.settings({ size: 20 }) : "⚙",
      onClose: onClose,
      view: window.GoogleAIStudioView
    });
  }

  static triggerAutoSet() {
    if (window.GoogleAIStudioSpeechPanel && typeof window.GoogleAIStudioSpeechPanel.triggerAutoSet === 'function') {
      return window.GoogleAIStudioSpeechPanel.triggerAutoSet();
    }
  }

  static setValueScript(settings) {
    if (window.GoogleAIStudioSpeechPanel && typeof window.GoogleAIStudioSpeechPanel.setValueScript === 'function') {
      return window.GoogleAIStudioSpeechPanel.setValueScript(settings);
    }
  }
};
