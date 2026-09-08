/**
 * TextSplitterView.js
 * Quản lý cấu trúc HTML Markup cho Text Splitter Panel theo chuẩn Semantic Component CSS (Calm Tech & Scoped).
 */

window.TextSplitterView = {
  render() {
    return /* html */`
      <!-- Header -->
      <div class="ts-header ts-title">
        <div class="ts-header__main">
          <span class="ts-header__icon">✂️</span>
          <div>
            <h3 class="ts-header__title">Text Splitter</h3>
            <div class="ts-header__subtitle">Split long text into manageable chunks</div>
          </div>
        </div>
      </div>

      <!-- Radio chọn nguồn dữ liệu -->
      <div class="ts-grid ts-grid-2 ts-gap-2 ts-card" style="padding: 4px; margin-bottom: 12px;">
        <label class="ts-flex ts-items-center ts-justify-center ts-gap-1-5 ts-cursor-pointer ts-select-none" style="padding: 6px 8px; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: var(--ch-text-secondary); transition: all 0.15s ease;">
          <input type="radio" name="ts-input-mode" value="file" checked class="hidden"> 
          <span>📂 Load File</span>
        </label>
        <label class="ts-flex ts-items-center ts-justify-center ts-gap-1-5 ts-cursor-pointer ts-select-none" style="padding: 6px 8px; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: var(--ch-text-secondary); transition: all 0.15s ease;">
          <input type="radio" name="ts-input-mode" value="text" class="hidden"> 
          <span>✍️ Manual Text</span>
        </label>
      </div>

      <!-- File input -->
      <div id="ts-file-block" style="margin-bottom: 12px;">
        <div class="ts-flex ts-items-center ts-gap-2">
          <label class="ts-btn ts-btn--secondary ts-btn--sm ts-cursor-pointer">
            <span>➕</span> Browse .txt
            <input type="file" id="ts-file-input" accept=".txt" class="hidden" />
          </label>
          <span id="ts-file-name" class="ts-truncate ts-flex-1" style="font-size: 10.5px; color: var(--ch-text-muted); font-style: italic;">No file chosen</span>
        </div>
      </div>

      <!-- Textarea input -->
      <textarea id="ts-input" 
        class="ts-textarea ts-textarea--mono hidden" style="height: 96px; margin-bottom: 12px;"
        placeholder="Paste or type your long text…"></textarea>

      <!-- Limit & Split controls -->
      <div class="ts-card ts-flex ts-items-center ts-justify-between" style="padding: 8px 12px; margin-bottom: 12px;">
        <div class="ts-flex ts-items-center ts-gap-1-5">
          <span class="ts-label" style="margin-bottom: 0;">Limit:</span>
          <input id="ts-limit" type="number" value="1000" 
            class="ts-input" style="width: 64px; height: 28px; text-align: center; font-weight: 700; color: var(--ch-accent);" />
          <span style="font-size: 9.5px; font-weight: 700; color: var(--ch-text-muted);">chars</span>
        </div>
        <button id="ts-split" class="ts-btn ts-btn--accent ts-btn--sm">
          ✂️ Split Text
        </button>
      </div>

      <!-- Main Action Controls -->
      <div class="ts-grid ts-gap-1-5" style="grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 12px;">
        <button id="ts-start" class="ts-btn ts-btn--primary ts-btn--sm" disabled>
          ▶️ Send All
        </button>
        <button id="ts-pause" class="ts-btn ts-btn--secondary ts-btn--sm" disabled>
          ⏸ Pause
        </button>
        <button id="ts-resume" class="ts-btn ts-btn--accent ts-btn--sm" disabled>
          ▶️ Resume
        </button>
        <button id="ts-reset" class="ts-btn ts-btn--danger ts-btn--sm">
          🔄 Reset
        </button>
      </div>

      <!-- Kết quả Segments -->
      <div class="ts-flex-1 ts-overflow-hidden ts-flex ts-flex-col">
        <div class="ts-flex ts-justify-between ts-items-center" style="margin-bottom: 6px; padding: 0 4px;">
          <label class="ts-label" style="margin-bottom: 0;">Segments</label>
          <span id="ts-progress-badge" class="ts-badge ts-badge--accent hidden">Progress: 0%</span>
        </div>
        <div id="ts-results" class="ts-results ts-flex-1 ts-overflow-y-auto custom-scrollbar" style="padding-right: 4px; display: flex; flex-direction: column; gap: 8px;"></div>
      </div>
    `;
  }
};
