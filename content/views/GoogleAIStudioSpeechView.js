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
      <span class="ts-header__icon">${window.CHIcons ? window.CHIcons.mic({ size: 16 }) : '🎙️'}</span>
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
         <button id="gaisp-new-profile" class="ts-btn ts-btn--ghost ts-btn--xs">
           ${window.CHIcons ? window.CHIcons.plus({ size: 11 }) : '+'} Mới
         </button>
         <button id="gaisp-delete-profile" class="ts-btn ts-btn--ghost ts-btn--xs ts-text-danger">
           ${window.CHIcons ? window.CHIcons.trash({ size: 11 }) : '✕'} Xóa
         </button>
      </div>
    </div>
    <div class="ts-flex ts-gap-2 ts-mb-2">
      <div id="profile-dropdown-container" class="custom-dropdown-container ts-flex-1">
        <button id="profile-dropdown-trigger" class="custom-dropdown-trigger">
          <span id="profile-selected-text">Tải Profile...</span>
          ${window.CHIcons ? window.CHIcons.chevronDown({ size: 14 }) : ''}
        </button>
        <div id="profile-dropdown-menu" class="custom-dropdown-menu custom-scrollbar hidden-dropdown"></div>
      </div>
    </div>
    
    <div id="gaisp-new-profile-group" class="ts-flex ts-gap-2 ts-mt-1-5 hidden">
      <input type="text" id="new-profile-name" class="ts-input ts-flex-1" placeholder="Tên profile mới...">
      <button id="save-as-new-btn" class="ts-btn ts-btn--primary">
        ${window.CHIcons ? window.CHIcons.save({ size: 12 }) : ''} Lưu
      </button>
    </div>
  </div>

  <!-- Form Cài Đặt -->
  <div id="profile-settings-form" class="ts-flex ts-flex-col ts-gap-2 ts-mb-2">
    <div class="ts-flex ts-items-center ts-justify-between ts-px-1">
      <span class="ts-card__title">Speaker & Voice Mapping</span>
      <button id="btn-swap-speakers" class="ts-btn ts-btn--ghost ts-btn--xs" type="button" title="Hoán đổi nhanh vị trí Speaker 1 ⇄ Speaker 2">
        ${window.CHIcons ? window.CHIcons.shuffle({ size: 12 }) : '⇄'} Đổi vị trí 1 ⇄ 2
      </button>
    </div>

    <div class="ts-grid ts-grid-2 ts-gap-2 ts-flex-shrink-0">
      <div>
        <label for="input-value1" class="ts-label">Speaker 1</label>
        <input id="input-value1" type="text" class="ts-input" placeholder="VD: 春樹">
      </div>
      <div>
        <label for="input-value2" class="ts-label">Speaker 2</label>
        <input id="input-value2" type="text" class="ts-input" placeholder="VD: 結衣">
      </div>
    </div>

    <div class="ts-grid ts-grid-2 ts-gap-2 ts-flex-shrink-0">
      <div>
        <label for="voice1" class="ts-label">Voice 1</label>
        <input id="voice1" type="text" class="ts-input" placeholder="Enceladus">
      </div>
      <div>
        <label for="voice2" class="ts-label">Voice 2</label>
        <input id="voice2" type="text" class="ts-input" placeholder="Callirrhoe">
      </div>
    </div>

    <div class="ts-flex-shrink-0">
      <label for="scene-instructions" class="ts-label">Scene</label>
      <textarea id="scene-instructions" class="ts-textarea custom-scrollbar" rows="2" style="min-height: 52px; resize: vertical;" placeholder="vd: A bustling street at night, two friends talking casually..."></textarea>
    </div>

    <div class="ts-flex-shrink-0">
      <label for="sample-context-instructions" class="ts-label">Sample Context</label>
      <textarea id="sample-context-instructions" class="ts-textarea custom-scrollbar" rows="3" style="min-height: 68px; resize: vertical;" placeholder="vd: Previous speaker just finished a long story..."></textarea>
    </div>
  </div>

  <div class="ts-sheet-footer ts-flex ts-gap-2">
    <button id="apply-to-page-btn" class="ts-btn ts-btn--secondary ts-flex-1 ts-py-2">
      ${window.CHIcons ? window.CHIcons.checkCircle({ size: 13 }) : '▶'} Điền vào trang
    </button>
    <button id="save-settings-btn" class="ts-btn ts-btn--primary ts-flex-1 ts-py-2">
      ${window.CHIcons ? window.CHIcons.save({ size: 13 }) : ''} Lưu Profile
    </button>
  </div>
    `;
  }
};
