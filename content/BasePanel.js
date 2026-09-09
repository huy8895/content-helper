/**
 * BasePanel.js
 * Lớp cơ sở chuẩn hóa toàn diện vòng đời (Lifecycle) và quản lý cửa sổ (Window Management)
 * Tuân thủ nghiêm ngặt chuẩn Calm Tech & Software Craftsmanship trong DESIGN.md và AGENTS.md.
 */

window.BasePanel = class {
  /**
   * @param {Object} options
   * @param {string} options.id - ID duy nhất của panel element
   * @param {string} options.title - Tiêu đề panel (dùng cho tooltip bong bóng thu nhỏ)
   * @param {string} options.icon - Ký hiệu cơ học hiển thị trên bong bóng thu nhỏ
   * @param {Function} [options.onClose] - Callback khi panel bị hủy
   * @param {Object} [options.view] - View module có phương thức .render()
   */
  constructor(options = {}) {
    this.id = options.id;
    this.title = options.title || 'Panel';
    this.icon = options.icon || '⌘';
    this.onClose = options.onClose;
    this.view = options.view;
    this._minimizeCtrl = null;

    this._initBase();
  }

  /**
   * Khởi tạo cấu trúc DOM chuẩn và đăng ký vòng đời theo mô hình Bottom Sheet
   */
  _initBase() {
    this.el = document.createElement("div");
    this.el.id = this.id;
    this.el.className = "ts-panel";

    // 1. Thêm thanh nắm kéo Bottom Sheet (Grabber handle pill)
    const handleWrapper = document.createElement("div");
    handleWrapper.className = "ts-sheet-handle";
    handleWrapper.innerHTML = `<div class="ts-sheet-handle__bar"></div>`;
    this.el.appendChild(handleWrapper);

    // 2. Nội dung view bọc trong scrollable body đồng nhất
    const bodyEl = document.createElement("div");
    bodyEl.className = "ts-sheet-body custom-scrollbar";
    if (this.view && typeof this.view.render === 'function') {
      bodyEl.innerHTML = this.view.render(this._getViewData ? this._getViewData() : undefined);
    }
    this.el.appendChild(bodyEl);

    // 3. Gắn vào Single Master Shadow Root
    ContentHelper.mountPanel(this.el);

    // 4. Cử chỉ vuốt/kéo xuống chuẩn Bottom Sheet để thu nhỏ/đóng
    const headerEl = bodyEl.querySelector('.ts-header, .sb-title, .sr-header, .ts-title');
    ContentHelper.attachBottomSheetSwipe(this.el, [handleWrapper, headerEl]);

    // 5. Nút đóng (✕) có kiểm tra trạng thái bận
    ContentHelper.addCloseButton(this.el, () => this.destroy());

    // 6. Nút thu nhỏ (−) thành bong bóng tròn Messenger
    this._minimizeCtrl = ContentHelper.addMinimizeButton(this.el, {
      icon: this.icon,
      tooltip: this.title,
      getBadgeInfo: () => this._getBubbleBadgeInfo()
    });
  }

  /**
   * Kiểm tra xem panel có đang bận thực thi tác vụ ngầm không.
   * Các subclass cần ghi đè (override) phương thức này nếu có tiến trình chạy.
   * @returns {boolean}
   */
  _isBusy() {
    return false;
  }

  /**
   * Trả về thông tin hiển thị badge trên bong bóng thu nhỏ.
   * Subclass có thể ghi đè để cập nhật số đếm hoặc trạng thái 'running'.
   * @returns {{ text: string, status: string }}
   */
  _getBubbleBadgeInfo() {
    const busy = this._isBusy();
    return {
      text: busy ? '⚡' : '−',
      status: busy ? 'running' : 'idle'
    };
  }

  /**
   * Dọn dẹp tài nguyên và gỡ bỏ hoàn toàn khỏi DOM
   */
  destroy() {
    if (this._minimizeCtrl) {
      this._minimizeCtrl.destroy();
      this._minimizeCtrl = null;
    }
    this.el?.remove();
    if (typeof this.onClose === "function") {
      this.onClose();
    }
  }
};
