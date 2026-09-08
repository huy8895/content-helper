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
          <span class="ts-header__icon">🤖</span>
          <div>
            <h3 class="ts-header__title">SRT Automation</h3>
            <div id="srt-status-text" class="ts-header__subtitle">Status: Standby (Scan ready)</div>
          </div>
        </div>
      </div>
      
      <!-- Label Input Area -->
      <div style="margin-bottom: 12px;">
        <label for="srt-labels-input" class="ts-label">Manual Labels (comma separated):</label>
        <textarea id="srt-labels-input" 
          class="ts-textarea" style="height: 64px;"
          placeholder="e.g. Arabic, Chinese, English, French"></textarea>
      </div>

      <!-- Action Button -->
      <div style="margin-bottom: 12px;">
        <button id="srt-scan-existing" class="ts-btn ts-btn--primary ts-w-full">
          <span>🔍</span> Scan Chat Content
        </button>
      </div>

      <!-- Result List Area -->
      <div class="ts-card" style="padding: 10px 12px; margin-bottom: 12px;">
        <div class="ts-flex ts-justify-between ts-items-center" style="margin-bottom: 8px; padding: 0 4px;">
           <strong class="ts-label" style="margin-bottom: 0;">Collected SRTs</strong>
           <span id="srt-count-badge" class="ts-badge ts-badge--secondary" style="background-color: var(--ch-border-subtle); color: var(--ch-text-secondary);">0 files</span>
        </div>
        <div class="ts-overflow-y-auto custom-scrollbar" style="max-height: 128px; padding-right: 4px;">
          <ul id="srt-list" style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 2px;"></ul>
        </div>
      </div>

      <!-- Bottom Controls -->
      <div class="ts-flex ts-gap-2">
        <button id="srt-download-zip" class="ts-btn ts-btn--success ts-flex-1">
          📥 Download ZIP
        </button>
        <button id="srt-clear" class="ts-btn ts-btn--danger">
          Clear
        </button>
      </div>
    `;
  }
};
