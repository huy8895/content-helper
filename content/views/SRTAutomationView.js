/**
 * SRTAutomationView.js
 * Quản lý cấu trúc HTML Markup cho SRT Automation Panel theo chuẩn Semantic Component CSS (Calm Tech & Scoped).
 */

window.SRTAutomationView = {
  render() {
    return /* html */`
      <!-- Header -->
      <div class="ts-header ts-title">
        <div class="ts-header__main">
          <span class="ts-header__icon">${window.CHIcons ? window.CHIcons.subtitles({ size: 16 }) : '⏱️'}</span>
          <div>
            <h3 class="ts-header__title">SRT Automation</h3>
            <div id="srt-status-text" class="ts-header__subtitle">Trạng thái: Sẵn sàng quét</div>
          </div>
        </div>
      </div>
      
      <!-- Label Input Area -->
      <div class="ts-mb-3">
        <label for="srt-labels-input" class="ts-label">Nhãn ngôn ngữ thủ công (phân cách bằng dấu phẩy):</label>
        <textarea id="srt-labels-input" 
          class="ts-textarea" rows="2"
          placeholder="vd: Arabic, Chinese, English, French"></textarea>
      </div>

      <!-- Action Button -->
      <div class="ts-mb-3">
        <button id="srt-scan-existing" class="ts-btn ts-btn--primary ts-w-full">
          ${window.CHIcons ? window.CHIcons.search({ size: 13 }) : '⚲'} Quét nội dung Subtitle
        </button>
      </div>

      <!-- Result List Area -->
      <div class="ts-card ts-p-3 ts-mb-3">
        <div class="ts-flex ts-justify-between ts-items-center ts-mb-2 ts-px-1">
           <strong class="ts-label ts-mb-0">Danh sách SRT thu thập</strong>
           <span id="srt-count-badge" class="ts-badge ts-badge--secondary ts-tabular">0 tệp</span>
        </div>
        <div class="ts-overflow-y-auto custom-scrollbar ts-scroll-h-lg">
          <ul id="srt-list" class="ts-list-container"></ul>
        </div>
      </div>

      <!-- Bottom Controls -->
      <div class="ts-flex ts-gap-2">
        <button id="srt-download-zip" class="ts-btn ts-btn--success ts-flex-1">
          ${window.CHIcons ? window.CHIcons.archive({ size: 13 }) : '↓'} Tải tệp ZIP
        </button>
        <button id="srt-clear" class="ts-btn ts-btn--danger">
          ${window.CHIcons ? window.CHIcons.trash({ size: 13 }) : '✕'} Xóa hết
        </button>
      </div>
    `;
  }
};
