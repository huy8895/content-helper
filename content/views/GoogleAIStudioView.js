/**
 * GoogleAIStudioView.js
 * Chuyển tiếp hoàn toàn sang GoogleAIStudioSpeechView (chuẩn hóa Scene & Sample Context).
 */

window.GoogleAIStudioView = {
  render() {
    if (window.GoogleAIStudioSpeechView && typeof window.GoogleAIStudioSpeechView.render === 'function') {
      return window.GoogleAIStudioSpeechView.render();
    }
    return '';
  }
};
