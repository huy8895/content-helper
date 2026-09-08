/**
 * ScenarioBuilderView.js
 * Quản lý cấu trúc HTML Markup cho Scenario Builder theo chuẩn Semantic Component CSS (Calm Tech & Scoped).
 */

window.ScenarioBuilderView = {
  render() {
    return /* html */`
  <!-- Header -->
  <div class="ts-header sb-title">
    <div class="ts-header__main">
      <span class="ts-header__icon">≡</span>
      <div>
        <h3 class="ts-header__title">Quản lý Kịch bản</h3>
        <div class="ts-header__subtitle">Create and edit prompt templates</div>
      </div>
    </div>
  </div>

  <!-- Bộ chọn danh sách kịch bản -->
  <div id="scenario-browser" class="ts-relative ts-mb-3">
    <label class="ts-label" for="scenario-search">Danh sách kịch bản</label>
    <div class="ts-search-box">
      <input type="text" id="scenario-search" 
        class="ts-search-box__input"
        placeholder="Tìm kịch bản nhanh...">
      <span class="ts-search-box__icon">⚲</span>
    </div>
    <div id="scenario-dropdown" class="custom-dropdown-menu custom-scrollbar ts-scroll-h-xl hidden-dropdown"></div>
  </div>

  <!-- Trình soạn thảo kịch bản -->
  <div id="scenario-editor" class="ts-card ts-p-3 ts-mb-3 ts-flex-1 ts-flex ts-flex-col ts-overflow-hidden">
    <div class="ts-grid ts-grid-2 ts-gap-2 ts-mb-2-5">
      <div>
        <label for="scenario-name" class="ts-label">Tên kịch bản</label>
        <input type="text" id="scenario-name" 
          class="ts-input font-bold" 
          placeholder="Tên kịch bản">
      </div>
      <div>
        <label for="scenario-group" class="ts-label">Nhóm</label>
        <input type="text" id="scenario-group" 
          class="ts-input" 
          placeholder="podcast / video / blog">
      </div>
    </div>

    <div class="ts-flex-1 ts-overflow-y-auto custom-scrollbar ts-mb-2-5 ts-list-container" id="questions-container"></div>
    
    <button id="add-question" class="ts-btn ts-btn--dashed ts-w-full">
      + Thêm câu hỏi mới
    </button>
  </div>

  <!-- Các nút hành động chính -->
  <div id="scenario-buttons" class="ts-grid ts-grid-3 ts-gap-2">
    <button id="new-scenario-btn" class="ts-btn ts-btn--secondary">
      + Tạo mới
    </button>
    <button id="save-to-storage" class="ts-btn ts-btn--accent">
      ↓ Lưu kịch bản
    </button>
    <button id="delete-scenario" class="ts-btn ts-btn--danger">
      ✕ Xoá
    </button>
  </div>
    `;
  }
};
