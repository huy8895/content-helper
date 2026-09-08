/**
 * YoutubeStudioView.js
 * Quản lý cấu trúc HTML Markup cho Youtube Studio Panel theo chuẩn Semantic Component CSS (Calm Tech & Scoped).
 */

window.YoutubeStudioView = {
  render() {
    return /* html */`
  <!-- Header -->
  <div class="ts-header ts-title">
    <div class="ts-header__main">
      <span class="ts-header__icon">文A</span>
      <div>
        <h3 class="ts-header__title">Video Subtitles & Info</h3>
        <div class="ts-header__subtitle">Languages & Metadata Automation</div>
      </div>
    </div>
  </div>
  
  <!-- Profile Ngôn ngữ Card -->
  <div class="ts-card ts-p-3 ts-mb-3 ts-relative">
    <div class="ts-card__header">
      <label class="ts-card__title">Profile Ngôn ngữ</label>
      <div class="ts-flex ts-gap-2">
         <button id="ytsp-new-profile" class="ts-btn ts-btn--ghost ts-btn--xs">+ Mới</button>
         <button id="ytsp-delete-profile" class="ts-btn ts-btn--ghost ts-btn--xs ts-text-danger">✕ Xóa</button>
      </div>
    </div>
    <div class="ts-flex ts-gap-2 ts-mb-2">
      <div id="yt-profile-dropdown-container" class="custom-dropdown-container ts-flex-1">
        <button id="yt-profile-dropdown-trigger" class="custom-dropdown-trigger">
          <span id="yt-profile-selected-text">Tải Profile...</span>
          <svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div id="yt-profile-dropdown-menu" class="custom-dropdown-menu custom-scrollbar hidden-dropdown"></div>
      </div>
    </div>
    
    <div id="yt-new-profile-group" class="ts-flex ts-gap-2 ts-mt-1-5 hidden">
      <input type="text" id="yt-new-profile-name" class="ts-input ts-flex-1" placeholder="Tên profile mới...">
      <button id="yt-save-as-new-btn" class="ts-btn ts-btn--primary">Lưu</button>
    </div>
  </div>

  <!-- Switch Options -->
  <div class="ts-flex ts-flex-col ts-gap-2 ts-mb-3">
    <label class="ts-switch-row">
      <div class="ts-flex ts-flex-col">
        <span class="ts-switch-row__title">Kênh lồng tiếng tự động (Aloud)</span>
        <span class="ts-switch-row__desc">Optimize for multi-language audio</span>
      </div>
      <input type="checkbox" id="yt-aloud-enabled" class="ts-switch">
    </label>
    
    <label class="ts-switch-row">
      <div class="ts-flex ts-flex-col">
        <span class="ts-switch-row__title">Tự động điền & Lưu</span>
        <span class="ts-switch-row__desc">Auto-fill metadata from JSON</span>
      </div>
      <input type="checkbox" id="yt-autofill-enabled" class="ts-switch">
    </label>
  </div>
  
  <!-- Danh sách Ngôn ngữ -->
  <div class="ts-card ts-p-3 ts-mb-3 ts-flex-1 ts-overflow-hidden ts-flex ts-flex-col">
    <label class="ts-label ts-mb-1-5">Danh sách Ngôn ngữ</label>
    
    <div class="ts-search-box ts-mb-2">
      <input type="text" id="yt-language-search" 
        class="ts-search-box__input"
        placeholder="Tìm ngôn ngữ...">
      <span class="ts-search-box__icon">⚲</span>
    </div>

    <div class="ts-flex ts-items-center ts-justify-between ts-mb-2 ts-px-1">
      <label class="ts-flex ts-items-center ts-gap-1-5 ts-cursor-pointer ts-select-none">
        <input type="checkbox" id="yt-filter-selected" class="ts-cursor-pointer">
        <span class="ts-label ts-mb-0">Đã chọn</span>
      </label>
      <button id="yt-copy-selected-btn" class="ts-btn ts-btn--ghost ts-btn--xs">
        ⎘ Copy List
      </button>
    </div>

    <div id="yt-language-checkbox-container" class="ts-list-container custom-scrollbar ts-scroll-h-yt-lang"></div>
  </div>
  
  <!-- Dữ liệu dịch thuật JSON -->
  <div class="ts-mb-3">
    <div class="ts-card ts-card--white ts-flex ts-items-center ts-gap-3 ts-p-2 ts-mb-0">
      <div class="ts-badge ts-badge--secondary ts-badge--square ts-tabular font-bold">JSON</div>
      <div class="ts-flex-1 min-w-0">
        <div class="ts-label ts-mb-1">Dữ liệu Dịch thuật</div>
        <div id="yt-json-filename" class="ts-truncate font-bold text-[11px]">Chưa có file nào</div>
      </div>
      <label for="yt-json-upload" class="ts-btn ts-btn--primary ts-btn--sm ts-cursor-pointer">
        ↑ Tải lên
      </label>
      <input type="file" id="yt-json-upload" accept=".json,.txt" class="hidden">
    </div>
  </div>
  
  <div class="ts-sheet-footer">
    <button id="yt-save-languages-btn" class="ts-btn ts-btn--primary ts-w-full ts-py-2">
      Cập nhật Profile
    </button>
  </div>
    `;
  }
};
