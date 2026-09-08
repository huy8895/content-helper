/**
 * GoogleAIStudioSpeechView.js
 * Quản lý cấu trúc HTML Markup cho AI Studio Speech Settings Panel theo chuẩn Semantic Component CSS (Calm Tech & Scoped).
 */

window.GoogleAIStudioSpeechView = {
  render() {
    return /* html */`
  <!-- Header -->
  <div class="ts-header ts-title">
    <div class="ts-header__main">
      <span class="ts-header__icon">🎙️</span>
      <div>
        <h3 class="ts-header__title">AI Studio Speech Settings</h3>
        <div class="ts-header__subtitle">Profile & Automation Config</div>
      </div>
    </div>
  </div>
  
  <!-- Profile Selection Card -->
  <div class="ts-card ts-p-3 ts-mb-3 ts-relative">
    <div class="ts-card__header">
      <label class="ts-card__title">Profile Cài đặt</label>
      <div class="ts-flex ts-gap-2">
         <button id="gaisp-new-profile" class="ts-btn ts-btn--ghost ts-btn--xs">+ Mới</button>
         <button id="gaisp-delete-profile" class="ts-btn ts-btn--ghost ts-btn--xs ts-text-danger">✕ Xóa</button>
      </div>
    </div>
    <div class="ts-flex ts-gap-2 ts-mb-2">
      <div id="profile-dropdown-container" class="custom-dropdown-container ts-flex-1">
        <button id="profile-dropdown-trigger" class="custom-dropdown-trigger">
          <span id="profile-selected-text">Tải Profile...</span>
          <svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div id="profile-dropdown-menu" class="custom-dropdown-menu custom-scrollbar hidden-dropdown"></div>
      </div>
    </div>
    
    <div id="gaisp-new-profile-group" class="ts-flex ts-gap-2 ts-mt-1-5 hidden">
      <input type="text" id="new-profile-name" class="ts-input ts-flex-1" placeholder="Tên profile mới...">
      <button id="save-as-new-btn" class="ts-btn ts-btn--primary">Lưu</button>
    </div>
  </div>

  <!-- Form Cài Đặt -->
  <div id="profile-settings-form" class="ts-flex ts-flex-col ts-gap-2 ts-mb-3">
    <div class="ts-grid ts-grid-2 ts-gap-2">
      <div>
        <label for="input-value1" class="ts-label">Speaker 1</label>
        <input id="input-value1" type="text" class="ts-input">
      </div>
      <div>
        <label for="input-value2" class="ts-label">Speaker 2</label>
        <input id="input-value2" type="text" class="ts-input">
      </div>
    </div>

    <div class="ts-grid ts-grid-2 ts-gap-2">
      <div>
        <label for="voice1" class="ts-label">Voice 1</label>
        <input id="voice1" type="text" class="ts-input" placeholder="Aoede">
      </div>
      <div>
        <label for="voice2" class="ts-label">Voice 2</label>
        <input id="voice2" type="text" class="ts-input" placeholder="Charon">
      </div>
    </div>

    <div>
      <label for="scene-instructions" class="ts-label">Scene</label>
      <textarea id="scene-instructions" class="ts-textarea" rows="2" placeholder="Nhập bối cảnh (Scene)..."></textarea>
    </div>

    <div>
      <label for="style-instructions" class="ts-label">Style instructions (Sample Context)</label>
      <textarea id="style-instructions" class="ts-textarea" rows="3" placeholder="Nhập hướng dẫn phong cách..."></textarea>
    </div>

    <label class="ts-switch-row">
      <span class="ts-switch-row__title">Tự động cấu hình (Auto Set)</span>
      <input type="checkbox" id="auto-set-value" class="ts-switch">
    </label>

    <label class="ts-switch-row">
      <span class="ts-switch-row__title">Tự động dán Clipboard (Auto Paste)</span>
      <input type="checkbox" id="auto-paste-clipboard" class="ts-switch">
    </label>
  </div>

  <button id="save-settings-btn" class="ts-btn ts-btn--primary ts-w-full ts-py-2">
    Cập nhật Profile
  </button>
    `;
  }
};
