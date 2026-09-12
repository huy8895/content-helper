// YoutubeStudioAdapter.js – Adapter cho studio.youtube.com
// -----------------------------------------------------------------------------

class YoutubeStudioAdapter extends BaseChatAdapter {
  static matches(host) {
    return /studio\.youtube\.com$/i.test(host);
  }

  constructor() {
    super();
    this.ytPanel = null;
    this.insertHelperButtons();
  }

  getButtonConfigs() {
    return [
      BUTTONS.YT_STUDIO_SETTINGS,
      BUTTONS.YT_ADD_LANGUAGES,
      BUTTONS.RUN_SCENARIO,
      BUTTONS.MANAGE_SCENARIO,
      BUTTONS.SPLITTER,
    ];
  }

  getTextarea() { return null; }
  getSendBtn() { return null; }
  isDone() { return true; }

  _toggleYoutubePanel() {
    ensureHelperInstance()?._toggleYoutubePanel();
  }

  /**
   * Delegate gọi sang YoutubeStudioPanel để thực hiện tự động hóa
   */
  async addMyLanguages() {
    if (typeof YoutubeStudioPanel !== 'undefined' && typeof YoutubeStudioPanel.runAddLanguages === 'function') {
      return YoutubeStudioPanel.runAddLanguages();
    }
    console.error("❌ [YoutubeStudioAdapter] YoutubeStudioPanel không khả dụng!");
  }
}

window.YoutubeStudioAdapter = YoutubeStudioAdapter;
