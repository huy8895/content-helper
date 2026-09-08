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
      <span class="ts-header__icon">⚙️</span>
      <div>
        <h3 class="ts-header__title">Video Subtitles & Info</h3>
        <div class="ts-header__subtitle">Languages & Metadata Automation</div>
      </div>
    </div>
  </div>
  
  <!-- Profile Ngôn ngữ Card -->
  <div class="ts-card" style="padding: 10px 12px; margin-bottom: 12px; position: relative; z-index: 50;">
    <div class="ts-card__header">
      <label class="ts-card__title">Profile Ngôn ngữ</label>
      <div class="ts-flex ts-gap-2">
         <button id="ytsp-new-profile" class="ts-btn ts-btn--ghost ts-btn--xs" style="color: var(--ch-text-primary);">➕ Mới</button>
         <button id="ytsp-delete-profile" class="ts-btn ts-btn--ghost ts-btn--xs" style="color: var(--ch-danger);">🗑️ Xóa</button>
      </div>
    </div>
    <div class="ts-flex ts-gap-2" style="margin-bottom: 8px;">
      <div id="yt-profile-dropdown-container" class="custom-dropdown-container ts-flex-1">
        <button id="yt-profile-dropdown-trigger" class="custom-dropdown-trigger">
          <span id="yt-profile-selected-text">Tải Profile...</span>
          <svg style="width: 14px; height: 14px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div id="yt-profile-dropdown-menu" class="custom-dropdown-menu custom-scrollbar hidden-dropdown"></div>
      </div>
    </div>
    
    <div id="yt-new-profile-group" class="ts-flex ts-gap-2 hidden" style="margin-top: 6px;">
      <input type="text" id="yt-new-profile-name" class="ts-input ts-flex-1" placeholder="Tên profile mới...">
      <button id="yt-save-as-new-btn" class="ts-btn ts-btn--primary">Lưu</button>
    </div>
  </div>

  <!-- Switch Options -->
  <div class="ts-flex ts-flex-col ts-gap-2" style="margin-bottom: 12px;">
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
  <div class="ts-card ts-flex-1 ts-overflow-hidden ts-flex ts-flex-col" style="padding: 10px 12px; margin-bottom: 12px;">
    <label class="ts-label" style="margin-bottom: 6px;">🌍 Danh sách Ngôn ngữ</label>
    
    <div class="ts-relative" style="margin-bottom: 8px;">
      <input type="text" id="yt-language-search" 
        class="ts-input" style="padding-left: 28px;"
        placeholder="Tìm ngôn ngữ...">
      <span class="ts-absolute" style="left: 8px; top: 50%; transform: translateY(-50%); color: var(--ch-text-muted); font-size: 11px; pointer-events: none;">🔍</span>
    </div>

    <div class="ts-flex ts-items-center ts-justify-between" style="margin-bottom: 8px; padding: 0 2px;">
      <label class="ts-flex ts-items-center ts-gap-1-5 ts-cursor-pointer ts-select-none">
        <input type="checkbox" id="yt-filter-selected" class="ts-cursor-pointer">
        <span class="ts-label" style="margin-bottom: 0;">Đã chọn</span>
      </label>
      <button id="yt-copy-selected-btn" class="ts-btn ts-btn--ghost ts-btn--xs">
        📋 Copy List
      </button>
    </div>

    <div id="yt-language-checkbox-container" class="ts-overflow-y-auto custom-scrollbar" style="min-height: 120px; max-height: 160px; padding-right: 4px; display: flex; flex-direction: column; gap: 2px;"></div>
  </div>
  
  <!-- Dữ liệu dịch thuật JSON -->
  <div style="margin-bottom: 12px;">
    <div class="ts-card ts-card--white ts-flex ts-items-center ts-gap-3" style="padding: 8px 10px; margin-bottom: 0;">
      <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background-color: var(--ch-surface-alt); border-radius: 8px; font-size: 16px;">📄</div>
      <div class="ts-flex-1" style="min-width: 0;">
        <div class="ts-label" style="margin-bottom: 2px;">Dữ liệu Dịch thuật</div>
        <div id="yt-json-filename" class="ts-truncate" style="font-size: 11px; font-weight: 700; color: var(--ch-text-primary);">Chưa có file nào</div>
      </div>
      <label for="yt-json-upload" class="ts-btn ts-btn--primary ts-btn--sm ts-cursor-pointer">
        Tải lên
      </label>
      <input type="file" id="yt-json-upload" accept=".json,.txt" class="hidden">
    </div>
  </div>
  
  <button id="yt-save-languages-btn" class="ts-btn ts-btn--primary ts-w-full" style="height: 40px; font-size: 12px;">
    Cập nhật Profile
  </button>
    `;
  }
};
