/**
 * AudioDownloaderView.js
 * Quản lý cấu trúc HTML Markup cho Audio Downloader Panel theo chuẩn Semantic Component CSS (Calm Tech & Scoped).
 */

window.AudioDownloaderView = {
  render() {
    return /* html */`
      <!-- Header -->
      <div class="ts-header ts-title">
        <div class="ts-header__main">
          <span class="ts-header__icon">🎙️</span>
          <div>
            <h3 class="ts-header__title">Audio Downloader</h3>
            <div id="srt-status-text" class="ts-header__subtitle">TTS Audio Generator</div>
          </div>
        </div>
      </div>

      <!-- Controls Cấu hình Voice & Format -->
      <div class="ts-card ts-p-3 ts-mb-3">
        <div class="ts-grid ts-grid-2 ts-gap-2 ts-mb-2-5">
          <div>
            <label class="ts-label" for="ad-voice">Giọng đọc</label>
            <select id="ad-voice" class="ts-select">
              <option value="shade">Monday</option>
              <option value="glimmer">Sol</option>
              <option value="vale">Vale</option>
              <option value="cove">Cove</option>
              <option value="fathom">Arbor</option>
              <option value="juniper">Juniper</option>
            </select>
          </div>
          <div>
            <label class="ts-label" for="ad-format">Định dạng</label>
            <select id="ad-format" class="ts-select">
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
            </select>
          </div>
        </div>

        <div class="ts-flex ts-gap-2">
          <button id="ad-dlall" class="ts-btn ts-btn--primary ts-flex-1">
            ↓ Download All
          </button>
          <button id="ad-reset" class="ts-btn ts-btn--danger">
            ↺ Reset
          </button>
        </div>
      </div>

      <!-- Header danh sách tin nhắn -->
      <div class="ts-flex ts-justify-between ts-items-center ts-mb-2 ts-px-1">
        <label class="ts-flex ts-items-center ts-gap-1-5 ts-cursor-pointer ts-select-none">
          <input type="checkbox" id="ad-select-all" class="ts-cursor-pointer" />
          <span class="ts-label ts-mb-0">Select all messages</span>
        </label>
        <div id="ad-progress" class="ts-badge ts-badge--accent ts-tabular ts-animate-pulse"></div>
      </div>

      <!-- Danh sách audio items -->
      <div id="ad-list" class="ts-results ts-card ts-card--white ts-flex-1 ts-overflow-y-auto ts-list-container custom-scrollbar ts-p-1-5"></div>
    `;
  }
};
