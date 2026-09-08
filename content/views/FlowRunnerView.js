/**
 * FlowRunnerView.js
 * Quản lý cấu trúc HTML Markup cho Flow Runner Panel theo chuẩn Semantic Component CSS (Calm Tech & Scoped).
 */

window.FlowRunnerView = {
  render() {
    return /* html */`
  <!-- Header -->
  <div class="ts-header sr-header">
    <div class="ts-header__main">
      <span class="ts-header__icon">🔀</span>
      <div>
        <h3 class="ts-header__title">Flow Runner</h3>
        <div class="ts-header__subtitle">Thực thi kịch bản liên hoàn</div>
      </div>
    </div>
  </div>

  <!-- Chọn Flow -->
  <div id="flow-browser" class="ts-relative ts-mb-3 ts-layer-dropdown">
    <label class="ts-label" for="flow-search">CHỌN FLOW</label>
    <div class="ts-search-box">
      <input type="text" id="flow-search" 
        class="ts-search-box__input"
        placeholder="Tìm kiếm Flow..."
        autocomplete="off">
      <span class="ts-search-box__icon">⚲</span>
    </div>
    <div id="flow-dropdown" class="custom-dropdown-menu custom-scrollbar ts-scroll-h-xl hidden-dropdown"></div>
    <select id="flow-select" class="hidden">
      <option value="">-- Đang tải dữ liệu... --</option>
    </select>
  </div>

  <!-- Chọn bước bắt đầu -->
  <div class="ts-card ts-p-3 ts-mb-3">
    <label class="ts-label" for="flow-step-select">BẮT ĐẦU TỪ BƯỚC</label>
    <select id="flow-step-select" class="ts-select" disabled>
      <option value="0">Vui lòng chọn Flow...</option>
    </select>
  </div>

  <!-- Cấu hình biến đầu vào -->
  <div id="flow-inputs" class="ts-card ts-p-3 ts-mb-3 ts-overflow-y-auto ts-scroll-h-xl custom-scrollbar">
    <div class="ts-hint ts-text-center">Các biến cấu hình sẽ hiển thị ở đây.</div>
  </div>

  <!-- Thanh tiến trình -->
  <div id="flow-progress-box" class="ts-progress hidden">
    <div class="ts-progress__meta">
      <div class="ts-progress__step">
        Step <span id="flow-progress-step" class="ts-tabular ts-text-accent">0</span> / <span id="flow-progress-total" class="ts-tabular">0</span>
      </div>
      <div id="flow-progress-status" class="ts-progress__percent">Đang chạy...</div>
    </div>
    <div class="ts-progress__track">
      <div id="flow-progress-bar" class="ts-progress__bar" style="width: 0%;"></div>
    </div>
    <div id="flow-step-details" class="ts-truncate ts-hint ts-mt-1-5"></div>
    
    <!-- Controls khi gặp lỗi -->
    <div id="flow-error-controls" class="ts-grid ts-grid-2 ts-gap-2 ts-mt-2 hidden">
      <button id="flow-retry-btn" class="ts-btn ts-btn--warning ts-btn--sm">↺ Thử lại (Retry)</button>
      <button id="flow-skip-btn" class="ts-btn ts-btn--secondary ts-btn--sm">⇥ Bỏ qua (Skip)</button>
    </div>
  </div>

  <!-- Nút thực thi chính -->
  <div class="ts-mb-2-5">
    <button id="flow-start-btn" class="ts-btn ts-btn--primary ts-w-full">
      ▶ Bắt đầu Flow
    </button>
  </div>

  <!-- Nút Tạm dừng / Tiếp tục -->
  <div class="ts-grid ts-grid-2 ts-gap-2">
    <button id="flow-pause-btn" class="ts-btn ts-btn--secondary" disabled>❚❚ Tạm dừng</button>
    <button id="flow-resume-btn" class="ts-btn ts-btn--accent" disabled>▶ Tiếp tục</button>
  </div>
    `;
  }
};
