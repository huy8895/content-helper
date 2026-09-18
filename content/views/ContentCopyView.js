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
          <span class="ts-header__icon">${window.CHIcons ? window.CHIcons.copy({ size: 16 }) : '⎘'}</span>
          <div>
            <h3 class="ts-header__title">Copy Content</h3>
            <div class="ts-header__subtitle">Tìm thấy <span class="ts-tabular">${elementsCount}</span> khối tin nhắn</div>
          </div>
        </div>
      </div>

      <!-- Custom Filenames Input -->
      <div class="ts-mb-3">
        <label for="ccp-filenames" class="ts-label">
          Tên tệp tùy chỉnh (phân cách bằng dấu phẩy):
        </label>
        <input type="text" id="ccp-filenames" 
          class="ts-input"
          placeholder="vd: phan1, phan2, ketluan (để trống để tự đánh số)"
        />
      </div>

      <!-- Button Groups & Options -->
      <div class="ts-flex ts-flex-col ts-gap-2 ts-mb-3">
        <div class="ts-flex ts-items-center ts-gap-2">
          <button id="ccp-copy-all" class="ts-btn ts-btn--primary">
            ${window.CHIcons ? window.CHIcons.copy({ size: 13 }) : ''} Sao chép toàn bộ
          </button>
          
          <div class="ts-flex ts-items-center ts-gap-1">
            <input type="number" id="ccp-index" placeholder="Idx" min="1" 
              class="ts-badge-input ts-badge-input--accent ts-tabular" />
            <button id="ccp-copy-from" class="ts-btn ts-btn--secondary ts-btn--xs">
              ${window.CHIcons ? window.CHIcons.copy({ size: 11 }) : ''} Từ vị trí
            </button>
          </div>
          
          <!-- Download buttons group -->
          <div class="ts-flex ts-gap-1 ts-ml-auto">
            <button id="ccp-copy-txt" class="ts-btn ts-btn--secondary ts-btn--sm" title="Copy toàn bộ nội dung TXT (bao gồm phân tách và Part)">
              ${window.CHIcons ? window.CHIcons.copy({ size: 12 }) : ''} TXT
            </button>
            <button id="ccp-download-txt" class="ts-btn ts-btn--success ts-btn--sm" title="Tải file TXT">
              ${window.CHIcons ? window.CHIcons.download({ size: 12 }) : ''} Tệp TXT
            </button>
            <button id="ccp-download-zip" class="ts-btn ts-btn--purple ts-btn--sm" title="Tải file ZIP">
              ${window.CHIcons ? window.CHIcons.archive({ size: 12 }) : ''} ZIP
            </button>
          </div>
        </div>

        <label class="ts-flex ts-items-center ts-gap-2 ts-cursor-pointer ts-select-none ts-px-1">
          <input type="checkbox" id="ccp-prefix-part" class="ts-cursor-pointer" />
          <span class="ts-hint">Add "Part X" prefix when downloading/copying</span>
        </label>
      </div>

      <!-- Preview List Container -->
      <div class="ts-card ts-p-3 ts-flex-1 ts-overflow-hidden ts-flex ts-flex-col">
        <div class="ts-flex ts-items-center ts-justify-between ts-mb-2 ts-px-1">
          <label class="ts-flex ts-items-center ts-gap-1-5 ts-cursor-pointer ts-select-none">
            <input type="checkbox" id="ccp-select-all" class="ts-cursor-pointer" checked />
            <strong class="ts-label ts-mb-0">Content Preview</strong>
          </label>
          <span id="ccp-selected-count" class="ts-badge ts-badge--accent ts-tabular"></span>
        </div>
        <div id="ccp-list" class="ts-results ts-flex-1 ts-overflow-y-auto custom-scrollbar ts-list-container"></div>
      </div>
    `;
  }
};
