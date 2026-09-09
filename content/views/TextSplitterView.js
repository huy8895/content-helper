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
          <span class="ts-header__icon">✂</span>
          <div>
            <h3 class="ts-header__title">Text Splitter</h3>
            <div class="ts-header__subtitle">Split long text into manageable chunks</div>
          </div>
        </div>
      </div>

      <!-- Radio chọn nguồn dữ liệu -->
      <div class="ts-grid ts-grid-2 ts-gap-1 ts-card ts-p-1 ts-mb-3">
        <label class="ts-flex ts-items-center ts-justify-center ts-gap-1-5 ts-cursor-pointer ts-select-none ts-sublabel font-bold py-1">
          <input type="radio" name="ts-input-mode" value="file" checked class="hidden"> 
          <span>Load File</span>
        </label>
        <label class="ts-flex ts-items-center ts-justify-center ts-gap-1-5 ts-cursor-pointer ts-select-none ts-sublabel font-bold py-1">
          <input type="radio" name="ts-input-mode" value="text" class="hidden"> 
          <span>✎ Manual Text</span>
        </label>
      </div>

      <!-- File input -->
      <div id="ts-file-block" class="ts-mb-3">
        <div class="ts-flex ts-items-center ts-gap-2">
          <label class="ts-btn ts-btn--secondary ts-btn--sm ts-cursor-pointer">
            + Browse .txt
            <input type="file" id="ts-file-input" accept=".txt" class="hidden" />
          </label>
          <span id="ts-file-name" class="ts-truncate ts-flex-1 ts-hint">No file chosen</span>
        </div>
      </div>

      <!-- Textarea input -->
      <textarea id="ts-input" 
        class="ts-textarea ts-textarea--mono ts-mb-3 hidden" rows="4"
        placeholder="Paste or type your long text…"></textarea>

      <!-- Limit & Split controls -->
      <div class="ts-card ts-p-2 ts-mb-3 ts-flex ts-items-center ts-justify-between">
        <div class="ts-flex ts-items-center ts-gap-1-5">
          <span class="ts-label ts-mb-0">Limit:</span>
          <input id="ts-limit" type="number" value="1000" 
            class="ts-badge-input ts-badge-input--accent ts-tabular" />
          <span class="ts-hint">chars</span>
        </div>
        <button id="ts-split" class="ts-btn ts-btn--accent ts-btn--sm">
          ✂ Split Text
        </button>
      </div>

      <!-- Main Action Controls -->
      <div class="ts-grid ts-grid-4 ts-gap-1-5 ts-mb-3">
        <button id="ts-start" class="ts-btn ts-btn--primary ts-btn--sm" disabled>
          ▶ Send All
        </button>
        <button id="ts-pause" class="ts-btn ts-btn--secondary ts-btn--sm" disabled>
          ❚❚ Pause
        </button>
        <button id="ts-resume" class="ts-btn ts-btn--accent ts-btn--sm" disabled>
          ▶ Resume
        </button>
        <button id="ts-reset" class="ts-btn ts-btn--danger ts-btn--sm">
          ↺ Reset
        </button>
      </div>

      <!-- Kết quả Segments -->
      <div class="ts-flex-1 ts-overflow-hidden ts-flex ts-flex-col">
        <div class="ts-flex ts-justify-between ts-items-center ts-mb-1-5 ts-px-1">
          <label class="ts-label ts-mb-0">Segments</label>
          <span id="ts-progress-badge" class="ts-badge ts-badge--accent ts-tabular hidden">Progress: 0%</span>
        </div>
        <div id="ts-results" class="ts-results ts-flex-1 ts-overflow-y-auto custom-scrollbar ts-list-container"></div>
      </div>
    `;
  }
};
