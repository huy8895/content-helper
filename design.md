# DESIGN GUIDELINES: Anti-Generic AI & Physical Craftsmanship

> **Dự án:** Content Helper - AI Workflow Assistant (Chrome Extension Manifest V3)  
> **Trường phái:** Calm Technology & Tactile Digital Computing (Google Labs & Teenage Engineering Inspired)  
> **Kiến trúc bảo vệ:** Single Master Shadow DOM Encapsulation  
> **Mục tiêu:** Thiết lập quy chuẩn thiết kế UI/UX độc bản, loại bỏ triệt để các lối mòn công nghiệp vô hồn ("AI Slop / SaaS Cliché"), kiến tạo một công cụ chuyên nghiệp mang cảm giác của một nhạc cụ hoặc thiết bị đo lường cơ khí chính xác.

---

## 1. Core Philosophy: The Anti-Generic AI

Phần lớn các giao diện AI hiện nay mắc phải căn bệnh "đồng phục vô hồn": dải màu tím/hồng neon chói lóa, thẻ bo tròn đổ bóng mờ mịt, vòng tròn loading quay vô tận và icon lấp lánh `✨` giả tạo. 

Content Helper từ chối đi theo lối mòn đó. Phần mềm phải mang lại cảm giác của một **công cụ thủ công vật lý có chủ đích (Intentional, Physical & Crafted Tool)**:

- **Thiết bị đo lường chính xác (Precision Instrument):** Lấy cảm hứng từ máy tính bỏ túi Dieter Rams (Braun), thiết bị âm thanh Teenage Engineering (Pocket Operator) và sổ tay bỏ túi Field Notes. Giao diện đầm đặc, tin cậy, sắc nét và khiêm nhường.
- **Calm Technology (Công nghệ Êm dịu):** Vô hình khi người dùng cần tập trung viết nội dung; hiện diện đĩnh đạc, chắc chắn khi được kích hoạt. Không popup giật gân, không banner quảng cáo, không animation thừa thãi làm gián đoạn mạch tư duy.
- **Trung thực kỹ thuật (Technical Honesty):**
  - ❌ **CẤM icon lấp lánh `✨` và ngôn ngữ ma mị kiểu "AI Magic":** AI là động cơ tính toán và xử lý ngôn ngữ, không phải trò ảo thuật. Sử dụng ký hiệu chức năng rõ ràng: `⚡`, `🔀`, `▶️`, `⌥`, `⌘`.
  - ❌ **CẤM dải màu Neon Gradient (Tím - Hồng - Xanh dương đậm):** Không dùng gradient tím mộng mơ kiểu Tailwind rẻ tiền.
  - ❌ **CẤM Spinner Loading che kín màn hình:** Thay thế bằng **Inline Status Badges** (như `⏳ Đang gửi đợt 3/10`, `0/10 prompts`) hoặc chấm trạng thái tĩnh gọn gàng.

---

## 2. Aesthetic Direction & Tactile Materiality

Thay vì màu xám Slate lạnh lẽo và hiệu ứng kính mờ (glassmorphism) giả tạo, giao diện mô phỏng các vật liệu vật lý tự nhiên: **Giấy mộc ép nhiệt (Raw Paper)**, **Kim loại than chì phay xước (Brushed Graphite)**, và **Mực in carbon đậm (Deep Carbon Ink)**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LIGHT PALETTE (RAW PAPER)                       │
├─────────────┬─────────────┬─────────────┬──────────────┬───────────────┤
│  Canvas     │  Surface    │  Hairline   │  Carbon Ink  │  Warm Terracotta│
│  #FBFBFA    │  #FFFFFF    │  #E6E4DF    │  #1A1918     │  #C25E2E       │
└─────────────┴─────────────┴─────────────┴──────────────┴───────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                      DARK PALETTE (BRUSHED GRAPHITE)                   │
├─────────────┬─────────────┬─────────────┬──────────────┬───────────────┤
│  Canvas     │  Surface    │  Hairline   │  Bone White  │  Warm Amber   │
│  #141517    │  #1D1F22    │  #2E3238    │  #EDEDEC     │  #D97736       │
└─────────────┴─────────────┴─────────────┴──────────────┴───────────────┘
```

### 2.1. Bảng Màu Chi Tiết (Semantic Tokens)

| Token Semantic | Light Mode (Giấy Mộc & Gốm) | Dark Mode (Than Chì & Titan) | Mục Đích Sử Dụng |
| :--- | :--- | :--- | :--- |
| `--ch-canvas` | `#FBFBFA` (Trắng ấm ngà giấy) | `#141517` (Đen sâu than chì) | Nền khung ngoài của Panel |
| `--ch-surface` | `#FFFFFF` (Gốm trắng mờ) | `#1D1F22` (Mặt kim loại tối) | Nền ô input, thẻ nội dung, bubble |
| `--ch-surface-alt`| `#F3F2EE` (Giấy bồi thứ cấp) | `#26292E` (Mặt phay xước nhạt) | Header, dropdown item hover |
| `--ch-border` | `#E6E4DF` (Đường kẻ chì 1px) | `#2E3238` (Rãnh kim loại tiện) | Đường phân cách hairline, viền panel |
| `--ch-border-subtle`| `#ECEAE5` | `#25282D` | Viền thẻ phụ, viền input phụ |
| `--ch-text-primary`| `#1A1918` (Mực đen ngả ấm) | `#EDEDEC` (Trắng xương tinh khiết) | Tiêu đề, nhãn quan trọng, prompt |
| `--ch-text-muted` | `#706E6A` (Chì xám trung tính) | `#8E929A` (Xám titan mờ) | Nhãn phụ, placeholder, counters |
| `--ch-accent` | `#C25E2E` (Đất nung Terracotta) | `#D97736` (Hổ phách Amber) | Trạng thái chạy, nút Primary, Focus |
| `--ch-success` | `#2D6A4F` (Xanh lục bảo đục) | `#40916C` (Lục trầm cơ học) | Hoàn thành prompt, task completed |
| `--ch-warning` | `#B45309` (Nâu hổ phách ấm) | `#D97706` (Vàng thau cổ) | Cảnh báo timeout, trạng thái tạm dừng |
| `--ch-danger` | `#A83232` (Đỏ son mờ) | `#C94A4A` (Đỏ gạch nung) | Nút dừng khẩn cấp, lỗi API, xóa |

### 2.2. Chiều Sâu Xúc Giác (Tactile Depth)
- **Hairline Separation:** Ưu tiên đường viền siêu mảnh `1px solid var(--ch-border)` hoặc rãnh chia phân đoạn mờ thay vì đổ bóng quá dày đặc.
- **Natural Dual Shadow:** Đổ bóng hai tầng mô phỏng ánh sáng vật lý tự nhiên:
  ```css
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 8px 24px -4px rgba(0, 0, 0, 0.08);
  ```
- **Không bóng gương (No Glossy Blur):** Panel phải cho cảm giác đầm chắc như một phiến nhôm anot hóa (anodized aluminum) hoặc tấm bìa cứng ép nhiệt, không dùng kính mờ loang lổ.

---

## 3. Typography & Data Hierarchy

### 3.1. Cặp Font Chữ Có Chủ Đích (Editorial Type Pairing)
- **Primary UI Sans-serif:** `Plus Jakarta Sans`, `Inter`, hoặc system font `-apple-system, BlinkMacSystemFont, "Segoe UI"`. Dùng cho nhãn, tiêu đề, nút bấm với khoảng cách chữ mở, dễ đọc ở kích thước vi mô `9.5px - 13px`.
- **Technical & Data Monospace:** `JetBrains Mono`, `Geist Mono`, hoặc `"SF Mono", Consolas, monospace`. Bắt buộc dùng cho số thứ tự prompt, token counts, timeline SRT, session ID, mã kịch bản.

### 3.2. Tabular Numerics (`tabular-nums`)
Mọi trường hiển thị số liệu động (bộ đếm prompt `3/10`, đếm ký tự `450 / 1000`, thời lượng timeline SRT `00:01:23,450`) **bắt buộc áp dụng thuộc tính `font-variant-numeric: tabular-nums`**. Điều này giúp các con số có bề rộng bằng nhau, tránh hiện tượng co giật layout khi số nhảy liên tục trong quá trình chạy tự động.

### 3.3. Phân Cấp Thông Tin Bằng Kích Thước & Độ Mờ (Information Weight)
Thay vì lạm dụng quá nhiều màu sắc sặc sỡ, phân cấp thông tin qua tỷ lệ và độ tương phản:
- **Panel Title:** `13px` / Font-weight: `700` / Color: `var(--ch-text-primary)`
- **Section Label:** `9.5px` / Font-weight: `700` / Text-transform: `uppercase` / Letter-spacing: `0.05em` / Color: `var(--ch-text-muted)`
- **Body & Inputs:** `11.5px` / Line-height: `1.45` / Color: `var(--ch-text-primary)`
- **Metadata & Counters:** `10px` / Font-family: `Monospace` / `tabular-nums` / Color: `var(--ch-text-muted)`

---

## 4. Interaction & Micro-Sensory Feedback

### 4.1. Quy Tắc 3 Giây & Luồng Không Ma Sát (Zero-Friction Workflow)
- **Không chặn dòng tư duy:** Các thao tác thường xuyên (như nạp kịch bản, chạy prompt tiếp theo, copy nội dung) không bao giờ đòi hỏi quá 2 click chuột.
- **Không Modal-in-Modal:** Tuyệt đối không mở hộp thoại xác nhận xếp chồng nhiều tầng. Dùng cảnh báo inline hoặc nút Undo nhẹ nhàng.
- **Keyboard-First:**
  - `Escape`: Đóng ngay panel đang mở trên cùng hoặc đóng popup menu.
  - Phím điều hướng và phím tắt thao tác nhanh không xung đột với phím tắt của host page.

### 4.2. Phản Hồi Xúc Giác Vi Mô (Haptic Feedback)
Trên các thiết bị cảm ứng hoặc máy tính hỗ trợ rung:
- **Micro-tick (Bấm nút, gạt switch):** Rung siêu nhẹ `8ms`.
- **Hoàn thành đợt prompt:** Rung nhịp đôi nhẹ nhàng `[12ms, 30ms, 12ms]`.
- **Cảnh báo lỗi:** Rung dứt khoát `[30ms, 50ms, 30ms]`.

---

## 5. Unified Activation & Window Management

Toàn bộ hệ thống UI của Extension trên **100% các website** tuân thủ mô hình kích hoạt 4 bước thống nhất:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MÀN HÌNH BẤT KỲ                               │
│                                                                         │
│  [Trang chủ ChatGPT / Google AI Studio / YouTube Studio / Gemini...]   │
│                                                                         │
│                                       ┌──────────────────────────────┐  │
│                                       │ 📋 HELPER POPUP MENU         │  │
│                                       │ ──────────────────────────── │  │
│                                       │ 📤 Chạy kịch bản (Runner)    │  │
│                                       │ 🛠 Quản lý kịch bản (Builder)│  │
│                                       │ 🔗 Chạy Flow (Flow Runner)   │  │
│                                       │ ✂️ Text Splitter             │  │
│                                       │ 📋 Copy Content              │  │
│                                       │ 🎬 Video Subtitles (YouTube) │  │
│                                       │ ⚙️ AI Studio Settings        │  │
│                                       └──────────────┬───────────────┘  │
│                                                      │ click mở         │
│                                       ┌──────────────▼───────────────┐  │
│                                       │ 🛠️ Content Helper (Bubble)   │  │
│                                       └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Bước 1: 1 Master Floating Button Duy Nhất
- Hình viên thuốc (Pill shape), nền tối `#141517`, chữ trắng tương phản cao, bo tròn `9999px`.
- Kéo thả tự do (Draggable) trên toàn màn hình với Viewport Clamping (chống kéo văng mất khỏi màn hình).
- Tự động nhận diện độ cao: Nếu kéo nút lên nửa trên màn hình (`top < 260px`), popup menu sẽ tự động bung xuống dưới (`menu-down`).

### Bước 2: Popup List Menu Đổ Lên
- Bấm vào Master Button sẽ bung menu danh sách công cụ tương ứng với nền tảng hiện tại.
- Bo góc `14px`, bóng đổ tự nhiên, tự động đóng khi click 1 item, click ra ngoài (`click outside` qua `e.composedPath()`), hoặc nhấn `Escape`.

### Bước 3: Neo Panel ở Dock Bar Đáy Màn Hình
- Khi click chọn 1 công cụ, Panel xuất hiện ngay ngắn tại Dock Bar ở đáy màn hình (`#content-helper-panel-bar`), căn giữa và cho phép mở 2-3 panel cạnh nhau.
- Người dùng có thể bấm vào Header để kéo thả panel bay tự do (`data-free="1"`) tới bất kỳ vị trí nào trên màn hình.

### Bước 4: Nút Đóng (`✕`) & Nút Thu Nhỏ (`−`) Chuẩn Mực
- Mọi panel đều có nút đóng (`.panel-close`) góc trên bên phải (`top: 10px; right: 12px;`) kích thước `24px × 24px`, hover chuyển màu đỏ son nhẹ (`--ch-danger-subtle`).
- Hỗ trợ nút thu nhỏ (`.panel-minimize`) thành bong bóng tròn Messenger (`.panel-bubble`) mép phải màn hình, mang theo badge trạng thái tiến trình thực tế.

---

## 6. Shadow DOM Encapsulation & Pure CSS Integrity

Toàn bộ hệ thống giao diện của Content Helper được đóng gói bên trong **Single Master Shadow Root**:

```html
<div id="content-helper-root" style="position: fixed; inset: 0; pointer-events: none; z-index: 2147483640;">
  #shadow-root (open)
    <link rel="stylesheet" href=".../tokens.css">
    <link rel="stylesheet" href=".../base.css">
    <link rel="stylesheet" href=".../components.css">
    
    <div id="content-helper-panel-bar">...</div>
    <div id="content-helper-button-container">...</div>
    <div id="ts-toast-container">...</div>
    <div class="panel-bubble">...</div>
</div>
```

### Nguyên Tắc Bất Di Bất Dịch:
1. **Tuyệt đối không có Host CSS Bleed:** CSS của trang chủ (YouTube, ChatGPT, Gemini) không thể xâm nhập vào bên trong Shadow DOM, và CSS của extension không bao giờ rò rỉ ra trang web chủ.
2. **Loại bỏ 100% `!important` dư thừa:** Nhờ có ranh giới Shadow DOM cô lập hoàn toàn, toàn bộ CSS của chúng ta tuân thủ cơ chế Cascading tự nhiên của W3C. Không dùng `!important` cho thuộc tính trang trí thông thường. Chỉ cho phép duy nhất `display: none !important;` cho các class ẩn (`.hidden`).
3. **Pure Inline Style Dragging:** Thao tác kéo thả gán trực tiếp tọa độ `style.left`, `style.top`, `style.bottom = 'auto'`, `style.right = 'auto'` mượt mà, không cần dùng các kỹ thuật cưỡng chế kiểu `setProperty(..., ..., 'important')`.

---

## 7. Component Design Specifications

### 7.1. Cards & Sections (`.ts-card`)
- Sử dụng màu nền phụ `--ch-surface-alt` kết hợp viền hairline `--ch-border-subtle` và bo góc `--ch-radius-card: 10px`.
- Không tạo quá 2 cấp card lồng nhau (tránh hiệu ứng hộp trong hộp ngột ngạt).

### 7.2. Status Badges & Tags (`.ts-badge`)
- Áp dụng kỹ thuật **Tone-on-Tone Tinting**: Nền nhạt pha trộn màu sắc với viền cùng tông màu mờ và chữ đậm nét:
  - **Running / Active:** `bg-emerald-50 text-emerald-800 border border-emerald-200` (Dark mode: `bg-emerald-950/40 text-emerald-300 border-emerald-800/60`).
  - **Paused / Pending:** `bg-amber-50 text-amber-800 border border-amber-200`.
  - **Error / Stopped:** `bg-rose-50 text-rose-800 border border-rose-200`.
  - **Idle / Neutral:** `bg-stone-100 text-stone-700 border border-stone-200`.

### 7.3. Buttons (`.ts-btn`)
- Chiều cao chuẩn: `28px` (Compact) hoặc `32px` (Standard).
- Bo góc: `7px`. Font-weight: `600`.
- Hiệu ứng cơ học khi bấm: `active:scale-[0.98]` êm ái.
- Màu nhấn Primary là Đất nung Terracotta (`#C25E2E`) hoặc Than chì đen (`#141517`), tuyệt đối không dùng màu xanh dương công nghiệp generic.

### 7.4. Empty States
- Sử dụng câu chữ con người, ấm áp, ngắn gọn và có tính hướng dẫn hành động (ví dụ: *"Chưa có kịch bản nào được lưu. Bấm 'Tạo kịch bản mới' để bắt đầu tự động hóa."*).
- Không nhồi nhét hình minh họa vector 3D to bản chiếm diện tích.

---

## 8. Checklist Kiểm Duyệt Thiết Kế (Design Review Checklist)

Trước khi phát hành hoặc thêm bất kỳ Panel / Component mới:
- [ ] Giao diện có được gắn bên trong `ContentHelper.getShadowRoot()` không?
- [ ] CSS có chứa bất kỳ `!important` dư thừa nào không? (Ngoại trừ duy nhất `display: none !important;`).
- [ ] Mọi số liệu đếm (counters, tokens, time) đã áp dụng `tabular-nums` và font monospace chưa?
- [ ] Màu sắc đã tuân thủ palette Giấy mộc & Than chì ở cả Light Mode và Dark Mode chưa?
- [ ] Có tồn tại bất kỳ icon lấp lánh `✨` hay màu gradient tím neon nào không? (Nếu có $\rightarrow$ Loại bỏ ngay).
- [ ] Các nút bấm quan trọng có phản hồi rung xúc giác nhẹ nhàng không?
- [ ] Panel có đầy đủ nút Đóng (`✕`) và Thu nhỏ (`−`) thành Messenger Bubble không?
- [ ] Khi kéo thả, panel và nút nổi có bị kẹt hay văng khỏi màn hình không?
