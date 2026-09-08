/**
 * ScenarioRunnerView.js
 * Quản lý cấu trúc HTML Markup cho Scenario Runner theo chuẩn Semantic Component CSS (Calm Tech & Scoped).
 */

window.ScenarioRunnerView = {
  render() {
    return /* html */`
  <!-- Header -->
  <div class="ts-header sr-header">
    <div class="ts-header__main">
      <span class="ts-header__icon">📤</span>
      <div>
        <h3 class="ts-header__title">Scenario Runner</h3>
        <div class="ts-header__subtitle">Execute automation sequences</div>
      </div>
    </div>
  </div>

  <!-- Banner khôi phục phiên song song bị gián đoạn -->
  <div id="sr-restore-banner" class="ts-card ts-card--amber ts-flex ts-flex-col ts-gap-1 hidden">
    <div class="ts-flex ts-items-center ts-justify-between">
      <div class="ts-badge ts-badge--warning">
        <span>⚡</span> Khôi phục phiên chạy song song
      </div>
      <span class="ts-badge ts-badge--warning ts-animate-pulse">⏳ Gián đoạn</span>
    </div>
    <div class="ts-card__desc" id="sr-restore-desc">
      Đang tải thông tin...
    </div>
    <div class="ts-flex ts-gap-2 ts-justify-end" style="margin-top: 4px;">
      <button id="sr-restore-cancel" class="ts-btn ts-btn--secondary ts-btn--sm">
        Bỏ qua & Xóa
      </button>
      <button id="sr-restore-confirm" class="ts-btn ts-btn--warning ts-btn--sm">
        Tiếp tục chạy
      </button>
    </div>
  </div>

  <!-- Hàng chọn kịch bản & bước bắt đầu -->
  <div class="ts-grid ts-grid-12 ts-gap-2 ts-relative" style="margin-bottom: 10px; z-index: 30;">
    <div id="sr-scenario-browser" class="ts-col-7 ts-relative" style="z-index: 40;">
      <label class="ts-label" for="sr-scenario-search">CHỌN KỊCH BẢN</label>
      <div class="ts-relative">
        <input type="text" id="sr-scenario-search" 
          class="ts-input" style="padding-left: 28px;"
          placeholder="Tìm kịch bản...">
        <span class="ts-absolute" style="left: 8px; top: 50%; transform: translateY(-50%); color: var(--ch-text-muted); font-size: 11px; pointer-events: none;">🔍</span>
      </div>
      <div id="sr-scenario-dropdown" class="custom-dropdown-menu custom-scrollbar hidden-dropdown" style="width: 320px; max-width: 380px; max-height: 224px;"></div>
    </div>

    <div class="ts-col-5 ts-relative">
      <label class="ts-label" for="step-select">BẮT ĐẦU TỪ</label>
      <select id="step-select" class="ts-select ts-truncate" disabled>
        <option value="0">Bước 1...</option>
      </select>
    </div>
  </div>

  <!-- Phần nhập thông tin đầu vào -->
  <div class="ts-flex ts-items-center ts-justify-between" style="margin-bottom: 4px; padding-left: 2px;">
    <label class="ts-label" style="margin-bottom: 0;">THÔNG TIN ĐẦU VÀO</label>
    <button id="sr-clear-inputs" class="ts-btn ts-btn--ghost ts-btn--xs" style="color: var(--ch-danger);" title="Xóa toàn bộ nội dung đã nhập">🧹 Xóa Form</button>
  </div>
  <div id="scenario-inputs" class="ts-card ts-overflow-y-auto custom-scrollbar ts-flex-1" style="max-height: 320px; min-height: 130px; display: flex; flex-direction: column; gap: 10px;"></div>

  <!-- Thanh tiến trình -->
  <div id="sr-progress-box" class="ts-progress hidden">
    <div class="ts-progress__meta">
      <div class="ts-progress__step">
        <span id="sr-progress-step" style="color: var(--ch-accent);">0</span> / <span id="sr-progress-total">0</span> Prompts
      </div>
      <div class="ts-flex ts-items-center ts-gap-1-5">
        <span id="sr-polling-dot" class="ts-animate-pulse hidden" style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--ch-success);"></span>
        <button id="sr-download-zip" class="ts-btn ts-btn--purple ts-btn--xs hidden" title="Tải kết quả đã xong dưới dạng ZIP">
          📦 <span id="sr-zip-count">0</span>/<span id="sr-zip-total">0</span>
        </button>
        <div id="sr-progress-percent" class="ts-progress__percent">0%</div>
      </div>
    </div>
    <div class="ts-progress__track">
      <div id="sr-progress-bar" class="ts-progress__bar"></div>
    </div>
    <div id="sr-done-list" class="ts-flex ts-flex-wrap ts-gap-1 ts-overflow-y-auto custom-scrollbar" style="margin-top: 6px; max-height: 64px;"></div>
    <div id="sr-split-detail" class="ts-flex-col ts-gap-1 ts-overflow-y-auto custom-scrollbar hidden" style="margin-top: 6px; max-height: 112px;"></div>
  </div>

  <!-- Nút điều khiển thực thi (Calm Tech Controls) -->
  <div class="ts-grid ts-grid-2 ts-gap-1-5" style="margin-bottom: 8px;">
    <button id="sr-start" class="ts-btn ts-btn--primary">
      ▶️ Tuần tự
    </button>
    
    <div class="ts-relative ts-flex">
      <button id="sr-parallel" class="ts-btn ts-btn--warning ts-w-full" title="Mỗi giá trị list chạy trên 1 tab riêng">
        ⚡ Song song
        <input type="number" id="sr-parallel-tabs" value="5" min="1" max="10"
          style="width: 28px; height: 20px; text-align: center; font-size: 10px; font-weight: 700; color: var(--ch-warning); background-color: #FEF3C7; border: 1px solid var(--ch-warning-border); border-radius: 4px; outline: none;"
          title="Số tab đồng thời" onclick="event.stopPropagation()" />
      </button>
      <button id="sr-parallel-stop" class="ts-btn ts-btn--danger ts-w-full hidden" title="Hủy bỏ toàn bộ phiên chạy song song">
        🛑 Dừng song song
      </button>
    </div>

    <div class="ts-relative ts-flex">
      <button id="sr-split-tabs" class="ts-btn ts-btn--secondary ts-w-full" title="Chia đều items vào N tab">
        🔀 Chia tab
        <input type="number" id="sr-split-tabs-count" value="3" min="1" max="10"
          style="width: 28px; height: 20px; text-align: center; font-size: 10px; font-weight: 700; color: var(--ch-text-primary); background-color: var(--ch-surface); border: 1px solid var(--ch-border); border-radius: 4px; outline: none;"
          title="Số tab sẽ mở" onclick="event.stopPropagation()" />
      </button>
      <button id="sr-split-tabs-stop" class="ts-btn ts-btn--danger ts-w-full hidden" title="Hủy bỏ toàn bộ phiên chia tab">
        🛑 Dừng chia tab
      </button>
    </div>

    <button id="sr-addqueue" class="ts-btn ts-btn--secondary">
      ➕ Hàng đợi <span id="sr-queue-count" class="ts-badge" style="background-color: var(--ch-border-subtle); color: var(--ch-text-secondary); border-radius: 9999px;">0</span>
    </button>
  </div>

  <!-- Nút Tạm dừng / Tiếp tục -->
  <div id="sr-pause-resume-bar" class="ts-grid ts-grid-2 ts-gap-1-5 hidden" style="margin-bottom: 8px;">
    <button id="sr-pause" class="ts-btn ts-btn--secondary" disabled>⏸ Tạm dừng</button>
    <button id="sr-resume" class="ts-btn ts-btn--accent" disabled>▶️ Tiếp tục</button>
  </div>

  <!-- Tùy chọn chuyển tab / chống ngủ đông -->
  <div class="ts-card" style="padding: 8px 10px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 4px;">
    <label class="ts-flex ts-items-center ts-gap-1-5 ts-cursor-pointer ts-select-none" style="font-size: 10.5px; color: var(--ch-text-secondary);">
      <input type="checkbox" id="sr-parallel-active" class="ts-cursor-pointer" checked>
      <span>Tự động chuyển sang tab mới mở</span>
    </label>
    <div class="ts-flex ts-items-center ts-gap-1-5 ts-select-none" style="font-size: 10.5px; color: var(--ch-text-secondary);">
      <label class="ts-flex ts-items-center ts-gap-1-5 ts-cursor-pointer">
        <input type="checkbox" id="sr-auto-switch-tabs" class="ts-cursor-pointer">
        <span>Tự động xoay vòng tab mỗi</span>
      </label>
      <input type="number" id="sr-auto-switch-interval" value="5" min="1" max="60"
        style="width: 32px; height: 20px; text-align: center; font-size: 9.5px; font-weight: 700; color: var(--ch-teal); background-color: var(--ch-surface); border: 1px solid var(--ch-teal-border); border-radius: 4px; outline: none;"
        title="Số giây mỗi lần xoay vòng" />
      <span>giây (Chống ngủ đông)</span>
    </div>
  </div>
  
  <!-- Hàng đợi dự kiến (chỉ hiện khi có item) -->
  <div class="sr-queue-box ts-flex-col hidden" style="margin-top: 4px;">
    <label class="ts-label">DỰ KIẾN HÀNG ĐỢI</label>
    <ul id="sr-queue-list" class="ts-overflow-y-auto custom-scrollbar" style="max-height: 112px; padding-right: 4px; margin: 0; list-style: none; display: flex; flex-direction: column; gap: 4px;"></ul>
  </div>
    `;
  }
};
