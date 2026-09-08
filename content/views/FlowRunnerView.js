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
      <span class="ts-header__icon">🔗</span>
      <div>
        <h3 class="ts-header__title">Flow Runner</h3>
        <div class="ts-header__subtitle">Thực thi kịch bản liên hoàn</div>
      </div>
    </div>
  </div>

  <!-- Chọn Flow -->
  <div id="flow-browser" class="ts-relative" style="margin-bottom: 12px;">
    <label class="ts-label" for="flow-select">CHỌN FLOW</label>
    <select id="flow-select" class="ts-select">
      <option value="">-- Đang tải dữ liệu... --</option>
    </select>
  </div>

  <!-- Chọn bước bắt đầu -->
  <div class="ts-card" style="padding: 10px 12px; margin-bottom: 12px;">
    <label class="ts-label" for="flow-step-select">BẮT ĐẦU TỪ BƯỚC</label>
    <select id="flow-step-select" class="ts-select" disabled>
      <option value="0">Vui lòng chọn Flow...</option>
    </select>
  </div>

  <!-- Cấu hình biến đầu vào -->
  <div id="flow-inputs" class="ts-card ts-overflow-y-auto custom-scrollbar" style="max-height: 192px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 10px;">
    <div style="font-size: 11.5px; color: var(--ch-text-muted); font-style: italic; text-align: center;">Các biến cấu hình sẽ hiển thị ở đây.</div>
  </div>

  <!-- Thanh tiến trình -->
  <div id="flow-progress-box" class="ts-progress hidden">
    <div class="ts-progress__meta">
      <div class="ts-progress__step">
        Step <span id="flow-progress-step" style="color: var(--ch-accent);">0</span> / <span id="flow-progress-total">0</span>
      </div>
      <div id="flow-progress-status" class="ts-progress__percent">Đang chạy...</div>
    </div>
    <div class="ts-progress__track">
      <div id="flow-progress-bar" class="ts-progress__bar" style="width: 0%;"></div>
    </div>
    <div id="flow-step-details" class="ts-truncate" style="margin-top: 6px; font-size: 10.5px; color: var(--ch-text-muted); font-style: italic;"></div>
    
    <!-- Controls khi gặp lỗi -->
    <div id="flow-error-controls" class="ts-grid ts-grid-2 ts-gap-2 hidden" style="margin-top: 8px;">
      <button id="flow-retry-btn" class="ts-btn ts-btn--warning ts-btn--sm">🔄 Thử lại (Retry)</button>
      <button id="flow-skip-btn" class="ts-btn ts-btn--secondary ts-btn--sm">⏭ Bỏ qua (Skip)</button>
    </div>
  </div>

  <!-- Nút thực thi chính -->
  <div style="margin-bottom: 10px;">
    <button id="flow-start-btn" class="ts-btn ts-btn--primary ts-w-full">
      ▶️ Bắt đầu Flow
    </button>
  </div>

  <!-- Nút Tạm dừng / Tiếp tục -->
  <div class="ts-grid ts-grid-2 ts-gap-2">
    <button id="flow-pause-btn" class="ts-btn ts-btn--secondary" disabled>⏸ Tạm dừng</button>
    <button id="flow-resume-btn" class="ts-btn ts-btn--accent" disabled>▶️ Tiếp tục</button>
  </div>
    `;
  }
};
