/**
 * ScenarioBuilderView.js
 * Quản lý cấu trúc HTML Markup cho Scenario Builder theo chuẩn Semantic Component CSS (Calm Tech & Scoped).
 * Phương án 1: Rạch ròi 2 chế độ Tạo mới (Create Mode) & Chỉnh sửa (Edit Mode) với Smart Footer.
 */

window.ScenarioBuilderView = {
  render() {
    return /* html */`
  <!-- Header -->
  <div class="ts-header sb-title">
    <div class="ts-header__main">
      <span class="ts-header__icon">${window.CHIcons ? window.CHIcons.fileText({ size: 16 }) : '📝'}</span>
      <div>
        <h3 class="ts-header__title">Quản lý Kịch bản</h3>
        <div class="ts-header__subtitle">Tạo và chỉnh sửa mẫu prompt</div>
      </div>
    </div>
  </div>

  <!-- Bộ chọn danh sách kịch bản & Nút Tạo mới -->
  <div id="scenario-browser" class="ts-relative ts-mb-3 ts-layer-dropdown">
    <div class="ts-flex ts-items-center ts-justify-between ts-mb-1">
      <label class="ts-label ts-mb-0" for="scenario-search">CHỌN KỊCH BẢN CÓ SẴN</label>
      <button id="btn-switch-create" class="ts-btn ts-btn--secondary ts-btn--sm" type="button" title="Chuyển sang tạo kịch bản mới hoàn toàn">
        ${window.CHIcons ? window.CHIcons.plus({ size: 12 }) : '+'} Tạo kịch bản mới
      </button>
    </div>
    <div class="ts-search-box">
      <input type="text" id="scenario-search" 
        class="ts-search-box__input"
        placeholder="Tìm kiếm hoặc chọn kịch bản để chỉnh sửa..."
        autocomplete="off">
      <span class="ts-search-box__icon">${window.CHIcons ? window.CHIcons.search({ size: 14 }) : '🔍'}</span>
    </div>
    <div id="scenario-dropdown" class="custom-dropdown-menu custom-scrollbar ts-scroll-h-xl hidden-dropdown"></div>
  </div>

  <!-- Trình soạn thảo kịch bản -->
  <div id="scenario-editor" class="ts-card ts-p-3 ts-mb-3 ts-flex-1 ts-flex ts-flex-col ts-overflow-hidden">
    <!-- Context Status Banner (Phản ánh trạng thái ngữ cảnh) -->
    <div class="ts-flex ts-items-center ts-justify-between ts-mb-2-5 ts-pb-2" style="border-bottom: 1px solid var(--ch-border-subtle);">
      <div id="scenario-mode-badge" class="ts-badge ts-badge--success">
        <span id="scenario-mode-icon" class="ts-flex ts-items-center">${window.CHIcons ? window.CHIcons.plusCircle({ size: 11 }) : '●'}</span>
        <span id="scenario-mode-text">Đang tạo kịch bản mới</span>
      </div>
      <button id="btn-cancel-edit" class="ts-btn ts-btn--ghost ts-btn--xs ts-hidden" type="button" title="Hủy chỉnh sửa và quay về tạo kịch bản mới">
        ${window.CHIcons ? window.CHIcons.x({ size: 11 }) : '✕'} Hủy sửa
      </button>
    </div>

    <div class="ts-grid ts-grid-2 ts-gap-2 ts-mb-2-5">
      <div>
        <label for="scenario-name" class="ts-label">Tên kịch bản</label>
        <input type="text" id="scenario-name" 
          class="ts-input font-bold" 
          placeholder="VD: Viết kịch bản Podcast">
      </div>
      <div>
        <label for="scenario-group" class="ts-label">Nhóm</label>
        <input type="text" id="scenario-group" 
          class="ts-input" 
          placeholder="podcast / video / blog">
      </div>
    </div>

    <div class="ts-flex-1 ts-overflow-y-auto custom-scrollbar ts-mb-2-5 ts-list-container" id="questions-container"></div>
    
    <button id="add-question" class="ts-btn ts-btn--dashed ts-w-full" type="button">
      ${window.CHIcons ? window.CHIcons.plus({ size: 13 }) : '+'} Thêm câu hỏi mới
    </button>
  </div>

  <!-- Các nút hành động chính (Smart Footer thay đổi theo trạng thái) -->
  <div id="scenario-buttons" class="ts-sheet-footer">
    <!-- Nhóm nút khi ở chế độ TẠO MỚI (Create Mode) -->
    <div id="footer-create-mode" class="ts-grid ts-grid-2 ts-gap-2 ts-w-full">
      <button id="btn-save-new" class="ts-btn ts-btn--accent" type="button" title="Lưu kịch bản mới này vào bộ nhớ">
        ${window.CHIcons ? window.CHIcons.save({ size: 13 }) : '💾'} Lưu kịch bản mới
      </button>
      <button id="btn-reset-form" class="ts-btn ts-btn--secondary" type="button" title="Xóa sạch dữ liệu vừa nhập trên form để bắt đầu lại">
        ${window.CHIcons ? window.CHIcons.eraser({ size: 13 }) : '🧹'} Xóa trắng form
      </button>
    </div>

    <!-- Nhóm nút khi ở chế độ CHỈNH SỬA (Edit Mode) -->
    <div id="footer-edit-mode" class="ts-grid ts-grid-3 ts-gap-2 ts-w-full ts-hidden">
      <button id="btn-save-update" class="ts-btn ts-btn--accent" type="button" title="Cập nhật các thay đổi vào kịch bản này">
        ${window.CHIcons ? window.CHIcons.save({ size: 13 }) : '💾'} Cập nhật
      </button>
      <button id="btn-save-copy" class="ts-btn ts-btn--secondary" type="button" title="Lưu thành một kịch bản mới (nhân bản) mà không sửa đè bản gốc">
        ${window.CHIcons ? window.CHIcons.copy({ size: 13 }) : '⎘'} Lưu bản sao
      </button>
      <button id="delete-scenario" class="ts-btn ts-btn--danger" type="button" title="Xóa vĩnh viễn kịch bản này">
        ${window.CHIcons ? window.CHIcons.trash({ size: 13 }) : '✕'} Xóa
      </button>
    </div>
  </div>
    `;
  }
};
