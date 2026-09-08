# AI Agent Operating Protocol: Content Helper

> **Dự án:** Content Helper - AI Workflow Assistant (Chrome Extension Manifest V3)  
> **Nguyên tắc:** Vanilla JS, Shadow DOM Isolation, Clean Code & SOLID, Calm Tech Design, Zero Host Pollution.

---

## 1. Nguyên Tắc Kỹ Thuật Cốt Lõi (Core Principles)

- **Native-First (Vanilla JS):** Tuyệt đối không tự ý thêm npm bundler (Webpack/Vite) hoặc thư viện ngoài. Sử dụng Native DOM API, `MutationObserver`, `AbortController`, và `JSZip` có sẵn trong `libs/`.
- **Shadow DOM Isolation:** Toàn bộ Panels và Components giao diện phải gắn vào Shadow DOM `#content-helper-root` để triệt tiêu xung đột CSS với trang chủ (YouTube Studio, Google AI Studio, Gemini, ChatGPT).
- **CSS BEM Scoped:** Sử dụng hệ thống design token và utility class `ts-*` từ `tokens.css`, `base.css`, `components.css`. Tuyệt đối không để CSS lọt ra ngoài (Host CSS Bleed).
- **Single Source of Truth & Per-Task Storage:** 
  - Không nhân bản trạng thái (Derived Data tính từ mảng nguồn).
  - Khi tác vụ chạy đa tab/song song, **BẮT BUỘC** dùng Per-Task Storage Key (`split_task_{taskId}`). Cấm đọc/ghi đè toàn bộ session chung gây race condition.
- **Fail Silently & Graceful Degradation:** Mọi API phụ thuộc môi trường (`navigator.vibrate`, `chrome.storage`) phải bọc trong `try/catch`, không ném uncaught exception.

---

## 2. Hàng Rào Bảo Vệ (Strict Guardrails - CẤM TUYỆT ĐỐI)

| # | Hành vi bị CẤM | Quy định thay thế chuẩn |
|---|---|---|
| 1 | **CẤM icon lấp lánh `✨` & ngôn ngữ ma mị "AI Magic"** | Dùng Unicode kỹ thuật trung tính: `⚙`, `⏱️`, `⎘`, `▶`, `✂`, `🔀` |
| 2 | **CẤM màu Neon rực rỡ, gradient tím hồng** | Tuân thủ bảng màu Calm Tech: Slate, Zinc, Neutral, Amber, Emerald |
| 3 | **CẤM Web Audio API (`AudioContext`)** | Đã loại bỏ hoàn toàn âm thanh. Chỉ dùng haptic `navigator.vibrate(8)` nếu cần |
| 4 | **CẤM Modal chồng Modal & Full-screen Spinner** | Dùng Inline Status Badge (`⏳ Đang gửi...`) hoặc pulsing dot |
| 5 | **CẤM Inline Styles trong file View HTML** | 100% sử dụng class ngữ nghĩa BEM (`ts-*`) định nghĩa trong CSS |
| 6 | **CẤM bỏ quên hàm dọn dẹp `destroy()`** | Luôn xóa interval/timeout, ngắt `MutationObserver`, gỡ DOM khi đóng |
| 7 | **CẤM `alert()` / `prompt()` chặn luồng JavaScript** | Chỉ dùng `confirm()` khi người dùng bấm tắt panel đang có tác vụ chạy dở |

---

## 3. Kiến Trúc Chuẩn: BasePanel & Tách Biệt View

Mọi Panel mới **bắt buộc** chia làm 2 file tách biệt:
1. `content/views/{Feature}View.js`: Chứa hàm `render()` trả về template string HTML (dùng class `ts-*`, không có inline style).
2. `content/{Feature}Panel.js`: Kế thừa `BasePanel`, quản lý state, sự kiện và vòng đời.

### Mẫu Chuẩn (Reference Implementation):

```javascript
// content/views/MyFeatureView.js
window.MyFeatureView = {
  render() {
    return `
      <div class="ts-header cursor-move select-none">
        <div class="ts-header__title">
          <span class="ts-header__icon">⚙</span>
          <span>Bộ Công Cụ Mới</span>
        </div>
      </div>
      <div class="ts-body">
        <div class="ts-form-group">
          <label class="ts-label">Tham số đầu vào</label>
          <input id="input-param" class="ts-input" placeholder="Nhập dữ liệu..." />
        </div>
        <button id="btn-action" class="ts-btn ts-btn--primary w-full">
          ▶ Kích hoạt tác vụ
        </button>
      </div>
    `;
  }
};
```

```javascript
// content/MyFeaturePanel.js
window.MyFeaturePanel = class extends BasePanel {
  constructor(onClose) {
    super({
      id: 'my-feature-panel',
      title: 'Bộ Công Cụ Mới',
      icon: '⚙',
      onClose
    });
    this.isProcessing = false;
    this._init();
  }

  // Ghi đè phương thức render DOM
  _render() {
    this.el.innerHTML = MyFeatureView.render();
  }

  _init() {
    const btn = this.el.querySelector('#btn-action');
    btn.onclick = () => this._handleExecute();
  }

  // BasePanel dùng phương thức này để cảnh báo khi đóng hoặc hiển thị badge 'running'
  _isBusy() {
    return this.isProcessing;
  }

  async _handleExecute() {
    this.isProcessing = true;
    try {
      // Logic nghiệp vụ...
    } finally {
      this.isProcessing = false;
    }
  }

  destroy() {
    // Dọn dẹp riêng của subclass nếu có (timer, worker...)
    super.destroy();
  }
};
```

---

## 4. Quy Trình 4 Bước Khi Lập Trình (Implementation Protocol)

1. **Bước 1 - Khảo sát Host DOM:** Phân tích trang AI mục tiêu (input là `<textarea>` hay `contenteditable`, selector nút Send/Stop).
2. **Bước 2 - Xây dựng View & Kế thừa BasePanel:** Tách bạch template HTML sang View; Controller kế thừa `BasePanel` để tự động thừa hưởng dock bar, drag, close confirmation, và minimize bubble.
3. **Bước 3 - Quản lý Dữ liệu & Storage:** Sử dụng Per-Task storage key nếu chạy đa tab; đồng bộ Firestore nếu cần lưu liên thiết bị.
4. **Bước 4 - Kiểm tra Cú pháp & Dọn dẹp:** 
   - Kiểm tra cú pháp AST: `wsl bash -ic "node -c <file.js>"`.
   - Đảm bảo `destroy()` giải phóng 100% listener, observer và interval.
