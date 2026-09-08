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
      <span class="ts-header__icon">🛠</span>
      <div>
        <h3 class="ts-header__title">Quản lý Kịch bản</h3>
        <div class="ts-header__subtitle">Create and edit prompt templates</div>
      </div>
    </div>
  </div>

  <!-- Bộ chọn danh sách kịch bản -->
  <div id="scenario-browser" class="ts-relative" style="margin-bottom: 12px;">
    <label class="ts-label" for="scenario-search">📄 Danh sách kịch bản</label>
    <div class="ts-relative">
      <input type="text" id="scenario-search" 
        class="ts-input" style="padding-left: 28px;"
        placeholder="Tìm kịch bản nhanh...">
      <span class="ts-absolute" style="left: 8px; top: 50%; transform: translateY(-50%); color: var(--ch-text-muted); font-size: 11px; pointer-events: none;">🔍</span>
    </div>
    <div id="scenario-dropdown" class="custom-dropdown-menu custom-scrollbar hidden-dropdown" style="max-height: 192px;"></div>
  </div>

  <!-- Trình soạn thảo kịch bản -->
  <div id="scenario-editor" class="ts-card ts-flex-1 ts-flex ts-flex-col ts-overflow-hidden" style="padding: 10px 12px; margin-bottom: 12px;">
    <div class="ts-grid ts-grid-2 ts-gap-2" style="margin-bottom: 10px;">
      <div>
        <label for="scenario-name" class="ts-label">Tên kịch bản</label>
        <input type="text" id="scenario-name" 
          class="ts-input" style="font-weight: 700;" 
          placeholder="Tên kịch bản">
      </div>
      <div>
        <label for="scenario-group" class="ts-label">Nhóm</label>
        <input type="text" id="scenario-group" 
          class="ts-input" 
          placeholder="podcast / video / blog">
      </div>
    </div>

    <div class="ts-flex-1 ts-overflow-y-auto custom-scrollbar" id="questions-container" style="margin-bottom: 10px; padding-right: 4px; display: flex; flex-direction: column; gap: 8px;"></div>
    
    <button id="add-question" class="ts-btn ts-btn--ghost ts-w-full" style="border: 1px dashed var(--ch-border-strong); color: var(--ch-text-muted);">
      + Thêm câu hỏi mới
    </button>
  </div>

  <!-- Các nút hành động chính -->
  <div id="scenario-buttons" class="ts-grid ts-grid-3 ts-gap-2">
    <button id="new-scenario-btn" class="ts-btn ts-btn--secondary">
      ➕ Tạo mới
    </button>
    <button id="save-to-storage" class="ts-btn ts-btn--accent">
      💾 Lưu lại
    </button>
    <button id="delete-scenario" class="ts-btn ts-btn--danger">
      🗑️ Xoá
    </button>
  </div>
    `;
  }
};
