/**
 * ============================================================================
 * CONTENT HELPER – LUCIDE TECHNICAL VECTOR SYSTEM (CHIcons)
 * Tuân thủ nghiêm ngặt design.md & AGENTS.md:
 * - Native-First: Trực tiếp trả về chuỗi thẻ SVG Lucide Icons siêu nhẹ.
 * - Zero Host Pollution: Hoàn toàn độc lập, tương thích Shadow DOM & CSP Manifest V3.
 * - stroke="currentColor": Tự động đổi màu theo trạng thái CSS, button, Dark/Light Mode.
 * ============================================================================
 */

(function () {
  'use strict';

  const CHIcons = {
    /**
     * Hàm bao bọc SVG cơ sở chuẩn Lucide
     * @param {string} innerPaths - Mã các thẻ SVG con (path, circle, line...)
     * @param {Object} [options]
     * @param {number} [options.size=14] - Kích thước chiều rộng & cao (px)
     * @param {string} [options.className=''] - Class CSS bổ sung (ts-icon...)
     * @param {number} [options.strokeWidth=2] - Độ dày nét vẽ vector
     * @returns {string} Chuỗi thẻ <svg> hoàn chỉnh
     */
    _wrap(innerPaths, { size = 14, className = '', strokeWidth = 2 } = {}) {
      const cls = className ? `ts-icon ${className}` : 'ts-icon';
      return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${innerPaths}</svg>`;
    },

    // ── BIỂU TƯỢNG HỆ THỐNG & ĐIỀU HƯỚNG ────────────────────────────────────

    // Phím Command (Dùng cho Master Floating Button & Brand)
    command(opts) {
      return this._wrap('<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>', opts);
    },

    // Nút đóng (X)
    x(opts) {
      return this._wrap('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', opts);
    },

    // Nút thu nhỏ panel (-)
    minus(opts) {
      return this._wrap('<path d="M5 12h14"/>', opts);
    },

    // Thêm mới (+)
    plus(opts) {
      return this._wrap('<path d="M5 12h14"/><path d="M12 5v14"/>', opts);
    },

    // Thêm vào hàng đợi / Thêm tròn (+ tròn)
    plusCircle(opts) {
      return this._wrap('<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>', opts);
    },

    // Mũi tên xổ xuống (Chevron Down)
    chevronDown(opts) {
      return this._wrap('<path d="m6 9 6 6 6-6"/>', opts);
    },

    // Cài đặt bánh răng
    settings(opts) {
      return this._wrap('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>', opts);
    },

    // Thông tin (Info)
    info(opts) {
      return this._wrap('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', opts);
    },

    // ── HÀNH ĐỘNG ĐIỀU KHIỂN & VẬN HÀNH (PLAYBACK / FLOW) ───────────────────

    // Nút Bắt đầu / Tiếp tục (Play)
    play(opts) {
      return this._wrap('<polygon points="6 3 20 12 6 21 6 3"/>', opts);
    },

    // Nút Tạm dừng (Pause)
    pause(opts) {
      return this._wrap('<rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/>', opts);
    },

    // Nút Dừng hẳn (Square)
    square(opts) {
      return this._wrap('<rect width="18" height="18" x="3" y="3" rx="2"/>', opts);
    },

    // Thử lại / Khôi phục / Làm lại (Rotate Counter-Clockwise)
    rotateCcw(opts) {
      return this._wrap('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>', opts);
    },

    // Bỏ qua bước (Step Forward)
    stepForward(opts) {
      return this._wrap('<line x1="19" x2="19" y1="5" y2="19"/><polygon points="5 19 15 12 5 5 5 19"/>', opts);
    },

    // Chạy song song (Shuffle / Fork)
    shuffle(opts) {
      return this._wrap('<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>', opts);
    },

    // Tách văn bản (Scissors)
    scissors(opts) {
      return this._wrap('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" x2="8.12" y1="4" x2="15.88"/><line x1="14.47" x2="20" y1="14.48" x2="20"/><line x1="8.12" x2="12" y1="8.12" x2="12"/>', opts);
    },

    // ── QUẢN LÝ DỮ LIỆU & TỆP TIN (FILE & DATA OPERATIONS) ───────────────────

    // Sao chép (Copy)
    copy(opts) {
      return this._wrap('<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>', opts);
    },

    // Tải xuống (Download)
    download(opts) {
      return this._wrap('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>', opts);
    },

    // Tải lên tệp (Upload / Folder)
    upload(opts) {
      return this._wrap('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>', opts);
    },

    // Mở thư mục (Folder Open)
    folderOpen(opts) {
      return this._wrap('<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>', opts);
    },

    // Nén và xuất file ZIP (Archive / Box)
    archive(opts) {
      return this._wrap('<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>', opts);
    },

    // Lưu trữ (Save / Floppy disk)
    save(opts) {
      return this._wrap('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>', opts);
    },

    // Xóa (Trash / Bin)
    trash(opts) {
      return this._wrap('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>', opts);
    },

    // Xóa form / Tẩy (Eraser)
    eraser(opts) {
      return this._wrap('<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>', opts);
    },

    // Tìm kiếm (Search)
    search(opts) {
      return this._wrap('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', opts);
    },

    // Tệp văn bản kịch bản (File Text)
    fileText(opts) {
      return this._wrap('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>', opts);
    },

    // Thêm tệp văn bản mới (File Plus)
    filePlus(opts) {
      return this._wrap('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 15h6"/><path d="M12 12v6"/>', opts);
    },

    // ── CHUYÊN BIỆT TỪNG MODULE (DOMAINS & WORKFLOWS) ───────────────────────

    // Micro / Âm thanh (Google AI Studio Speech)
    mic(opts) {
      return this._wrap('<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>', opts);
    },

    // Địa cầu / Ngôn ngữ (YouTube Studio)
    globe(opts) {
      return this._wrap('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>', opts);
    },

    // Phụ đề Video (Subtitles / CC)
    subtitles(opts) {
      return this._wrap('<path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M7 15h4M15 15h2M7 11h2M13 11h4"/>', opts);
    },

    // Luồng tự động hóa (Workflow)
    workflow(opts) {
      return this._wrap('<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>', opts);
    },

    // Cấu hình thanh gạt (Sliders / Buttons Config)
    sliders(opts) {
      return this._wrap('<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/>', opts);
    },

    // ── HUY HIỆU TRẠNG THÁI & PHẢN HỒI (STATUS & FEEDBACK) ──────────────────

    // Thành công (Check)
    check(opts) {
      return this._wrap('<polyline points="20 6 9 17 4 12"/>', opts);
    },

    // Tròn thành công (Check Circle)
    checkCircle(opts) {
      return this._wrap('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>', opts);
    },

    // Cảnh báo (Alert Triangle)
    alertTriangle(opts) {
      return this._wrap('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>', opts);
    },

    // Đồng hồ / Chờ xử lý (Clock)
    clock(opts) {
      return this._wrap('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', opts);
    }
  };

  // Đăng ký toàn cục
  window.CHIcons = CHIcons;
})();
