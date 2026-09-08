/**
 * ContentCopyView.js
 * Quản lý cấu trúc HTML Markup cho Content Copy Panel theo chuẩn Semantic Component CSS (Calm Tech & Scoped).
 */

window.ContentCopyView = {
  render(elementsCount = 0) {
    return /* html */`
      <!-- Header -->
      <div class="ts-header ts-title">
        <div class="ts-header__main">
          <span class="ts-header__icon">📋</span>
          <div>
            <h3 class="ts-header__title">Copy Content</h3>
            <div class="ts-header__subtitle">Found ${elementsCount} message blocks</div>
          </div>
        </div>
      </div>

      <!-- Custom Filenames Input -->
      <div style="margin-bottom: 12px;">
        <label for="ccp-filenames" class="ts-label">
          Custom Filenames (optional, comma separated):
        </label>
        <input type="text" id="ccp-filenames" 
          class="ts-input"
          placeholder="e.g. intro, chapter1, conclusion (leave empty for auto-numbering)"
        />
      </div>

      <!-- Button Groups & Options -->
      <div class="ts-flex ts-flex-col ts-gap-2" style="margin-bottom: 12px;">
        <div class="ts-flex ts-items-center ts-gap-2">
          <button id="ccp-copy-all" class="ts-btn ts-btn--primary">
            Copy All
          </button>
          
          <div class="ts-flex ts-items-center ts-gap-1" style="background-color: var(--ch-surface-alt); padding: 2px 6px; border-radius: 8px; border: 1px solid var(--ch-border-subtle);">
            <input type="number" id="ccp-index" placeholder="Idx" min="1" 
              class="ts-input" style="width: 48px; height: 26px; padding: 0 4px; text-align: center; font-weight: 700; color: var(--ch-accent); border: none; background: transparent;" />
            <button id="ccp-copy-from" class="ts-btn ts-btn--secondary ts-btn--xs">
              Copy From
            </button>
          </div>
          
          <!-- Download buttons group -->
          <div class="ts-flex ts-gap-1" style="margin-left: auto;">
            <button id="ccp-copy-txt" class="ts-btn ts-btn--secondary ts-btn--sm" title="Copy toàn bộ nội dung TXT (bao gồm phân tách và Part)">
              <span>📋</span> TXT
            </button>
            <button id="ccp-download-txt" class="ts-btn ts-btn--success ts-btn--sm" title="Tải file TXT">
              <span>📄</span> File
            </button>
            <button id="ccp-download-zip" class="ts-btn ts-btn--purple ts-btn--sm" title="Tải file ZIP">
              <span>📦</span> ZIP
            </button>
          </div>
        </div>

        <label class="ts-flex ts-items-center ts-gap-2 ts-cursor-pointer ts-select-none" style="padding: 0 4px;">
          <input type="checkbox" id="ccp-prefix-part" class="ts-cursor-pointer" />
          <span style="font-size: 11px; font-weight: 600; color: var(--ch-text-secondary);">Add "Part X" prefix when downloading/copying</span>
        </label>
      </div>

      <!-- Preview List Container -->
      <div class="ts-card ts-flex-1 ts-overflow-hidden ts-flex ts-flex-col" style="padding: 10px 12px;">
        <div class="ts-flex ts-items-center ts-justify-between" style="margin-bottom: 8px; padding-left: 2px;">
          <label class="ts-flex ts-items-center ts-gap-1-5 ts-cursor-pointer ts-select-none">
            <input type="checkbox" id="ccp-select-all" class="ts-cursor-pointer" checked />
            <strong class="ts-label" style="margin-bottom: 0;">Content Preview</strong>
          </label>
          <span id="ccp-selected-count" class="ts-badge ts-badge--accent"></span>
        </div>
        <div id="ccp-list" class="ts-results ts-flex-1 ts-overflow-y-auto custom-scrollbar" style="padding-right: 4px; display: flex; flex-direction: column; gap: 6px;"></div>
      </div>
    `;
  }
};
