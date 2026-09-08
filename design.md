# Design Guidelines: The Anti-Generic AI Craftsmanship

> **Dự án:** Content Helper - AI Workflow Assistant  
> **Trường phái:** Calm Technology & Tactile Digital Computing (Google Labs Inspired)  
> **Mục tiêu:** Thiết lập quy chuẩn thiết kế UI/UX độc bản, tinh tế, loại bỏ triệt để các lối mòn công nghiệp vô hồn ("AI Slop / SaaS Generic") để kiến tạo một công cụ chuyên nghiệp mang cảm giác cơ khí chính xác.

---

## 1. Core Philosophy & Tone of Voice

### 1.1. Triết lý Calm Technology (Công nghệ Êm dịu)
Content Helper không phải là một ứng dụng quảng cáo hay đồ chơi công nghệ hào nhoáng. Đây là một **Precision Instrument** (Nhạc cụ / Thiết bị đo lường chính xác) dành cho các Content Creators, Dịch giả và Nhà sản xuất nội dung đa ngôn ngữ, những người sử dụng công cụ này hàng giờ mỗi ngày trên ChatGPT, Gemini, AI Studio và YouTube Studio.

- **Vô hình khi không cần thiết:** Tiện ích nằm gọn ghẽ, kín đáo, hòa nhập vào môi trường làm việc của trang chủ mà không tranh giành sự chú ý của người dùng.
- **Hiện diện với sự đĩnh đạc:** Khi mở ra, panel phải mang lại cảm giác vững chãi, tin cậy của một bàn trộn âm thanh analog cao cấp hoặc một chiếc đồng hồ bấm giờ cơ khí.
- **Tôn trọng sự tập trung:** Không bao giờ tự ý bật popup giật gân, không dùng hiệu ứng rung lắc (shake) hay nhấp nháy liên tục làm đứt gãy mạch tư duy sáng tạo của người dùng.

### 1.2. Chống "AI Generic / AI Slop"
Tuyệt đối loại bỏ các dấu hiệu nhận biết của giao diện AI công nghiệp giá rẻ:
- ❌ **Không dùng icon lấp lánh `✨` (Sparkles):** Trí tuệ nhân tạo trong công cụ này là động cơ tính toán toán học, không phải "phép thuật thần bí". Thay thế bằng các ký hiệu cơ học hoặc hình học rõ ràng (`⚡`, `🔀`, `▶️`, `⌥`, `⌘`).
- ❌ **Không dùng dải màu Neon Gradient (Tím - Hồng - Cyan):** Loại bỏ hoàn toàn gradient tím mộng mơ kiểu Tailwind cliché (`from-indigo-500 via-purple-500 to-pink-500`).
- ❌ **Không dùng từ ngữ sáo rỗng:** Thay vì "AI đang sáng tạo điều kỳ diệu cho bạn...", hãy dùng ngôn ngữ kỹ thuật trung thực: "Đang gửi đợt 3/10 (Khối 450 từ)...", "Đang đợi phản hồi từ server...".

---

## 2. Visual Palette & Materiality

Thay vì màu xám Slate vô cảm và kính mờ giả tạo, giao diện mô phỏng các vật liệu vật lý tự nhiên: **Giấy mộc ép nhiệt (Raw Paper)**, **Kim loại phay xước mờ (Brushed Graphite)**, và **Mực in đậm (Deep Carbon Ink)**.

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

### 2.1. Bảng Màu Chi Tiết (Color Tokens)

| Token Semantic | Light Mode (Giấy Mộc & Gốm) | Dark Mode (Than Chì & Titan) | Mục Đích Sử Dụng |
| :--- | :--- | :--- | :--- |
| `--ch-canvas` | `#FBFBFA` (Trắng ấm ngà giấy) | `#141517` (Đen sâu than chì) | Nền khung ngoài của Panel |
| `--ch-surface` | `#FFFFFF` (Gốm trắng mờ) | `#1D1F22` (Mặt kim loại tối) | Nền ô input, thẻ nội dung, bubble |
| `--ch-surface-alt`| `#F3F2EE` (Giấy bồi thứ cấp) | `#26292E` (Mặt phay xước nhạt) | Header, dropdown item hover |
| `--ch-border` | `#E6E4DF` (Đường kẻ chì 1px) | `#2E3238` (Rãnh kim loại tiện) | Đường phân cách hairline, viền panel |
| `--ch-text-primary`| `#1A1918` (Mực đen ngả ấm) | `#EDEDEC` (Trắng xương tinh khiết) | Tiêu đề, nhãn quan trọng, prompt |
| `--ch-text-muted` | `#706E6A` (Chì xám trung tính) | `#8E929A` (Xám titan mờ) | Nhãn phụ, placeholder, counters |
| `--ch-accent` | `#C25E2E` (Đất nung Terracotta) | `#D97736` (Hổ phách Amber) | Trạng thái chạy, nút Primary, Focus |
| `--ch-success` | `#2D6A4F` (Xanh lục bảo đục) | `#40916C` (Lục trầm cơ học) | Hoàn thành prompt, task completed |
| `--ch-warning` | `#B45309` (Nâu hổ phách ấm) | `#D97706` (Vàng thau cổ) | Cảnh báo timeout, trạng thái tạm dừng |
| `--ch-danger` | `#A83232` (Đỏ son mờ) | `#C94A4A` (Đỏ gạch nung) | Nút dừng khẩn cấp, lỗi API, xóa |

### 2.2. Chất Liệu Mô Phỏng (Tactile Materiality)
- **Hairline Borders:** Sử dụng đường viền siêu mảnh `1px solid var(--ch-border)` thay vì đổ bóng quá lớn.
- **Subtle Surface Depth:** Đổ bóng không dùng độ nhòe (blur) quá rộng kiểu neumorphism rẻ tiền. Sử dụng bóng đổ kép vật lý:
  ```css
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px -4px rgba(0, 0, 0, 0.08);
  ```
- **Không bóng gương (No Glossy Glassmorphism):** Tránh dùng `backdrop-filter: blur(20px)` kèm viền trắng đục lóa mắt. Panel phải cho cảm giác đầm đặc, chắc tay như cầm một khối nhôm anot hóa (anodized aluminum).

---

## 3. Typography & Layout Hierarchy

### 3.1. Cặp Font Chữ Có Chủ Đích (Intentional Type Pairing)
1. **Primary Interface Font (Nhãn, Tiêu đề, Nút bấm):**
   - Phông chữ: `Plus Jakarta Sans`, `Inter`, hoặc system font `-apple-system, BlinkMacSystemFont, "Segoe UI"`.
   - Đặc điểm: Hình học hiện đại (Neo-Grotesque), tỉ lệ cân đối, khoảng cách chữ mở giúp đọc rõ ở cỡ nhỏ `10px - 11px`.
2. **Technical & Data Font (Mã số, Prompt tokens, Timeline SRT, Session ID):**
   - Phông chữ: `JetBrains Mono`, `Geist Mono`, hoặc `"SF Mono", Consolas, monospace`.
   - Đặc điểm: Khoảng cách cố định (monospaced), hiển thị số có gạch chéo phân biệt 0 và O, giúp người dùng so sánh số dòng, thời lượng timeline chính xác tuyệt đối.

### 3.2. Bảng Cỡ Chữ & Trọng Số (Scale)
- **Panel Header:** `13px` / Font-weight: `700` / Letter-spacing: `-0.01em`
- **Section Label:** `9px` / Font-weight: `700` / Text-transform: `uppercase` / Letter-spacing: `0.06em`
- **Body / Prompts:** `11px` / Line-height: `1.45` / Font-weight: `400`
- **Mono Data (Index, Count, Times):** `10px` / Font-family: `Monospace` / Font-weight: `600`

### 3.3. Quy Chuẩn Căn Gióng & Mật Độ (Spatial Density)
- **Hệ lưới 4px Base Grid:** Mọi khoảng cách (padding, margin, gap) đều là bội số của 4 (`4px`, `8px`, `12px`, `16px`).
- **Mật độ thông tin cao (High Density):** Công cụ chuyên nghiệp đòi hỏi nhìn thấy nhiều thông tin cùng lúc mà không phải cuộn quá nhiều. Chiều cao nút bấm (Button height) chuẩn mực là `28px` hoặc `32px`.
- **Phân tách bằng Hairline Divider:** Dùng các đường hairline `1px` tinh tế thay vì tạo quá nhiều thẻ bo góc lồng nhau (card-in-card hell).

---

## 4. Interaction & Micro-Sensory Feedback

### 4.1. Nguyên Tắc Giảm Ma Sát Tối Đa (Zero-Friction Workflow)
- **Keyboard-First Design:**
  - Nhấn `ESC` để đóng panel mở trên cùng ngay lập tức.
  - Phím tắt gợi ý trong input: Nhấn `Enter` để kích hoạt gửi, `Shift + Enter` để xuống dòng.
- **One-Tap Actions:**
  - Copy nội dung chỉ bằng một cú click, tự động chuyển nhãn sang `Copied!` trong 1.5 giây mà không mở thêm dialog xác nhận phiền toái.
  - Xóa form / Reset state: Chỉ hiện confirm inline nhỏ gọn hoặc hỗ trợ `Undo` (Toast) thay vì popup modal giữa màn hình.

### 4.2. Phản Hồi Xúc Giác Vi Mô (Haptic Feedback via `navigator.vibrate`)
Khi sử dụng trên thiết bị có motor rung (máy tính bảng Surface, màn hình cảm ứng hỗ trợ Haptic):
- **Micro-tick (Click nút, chuyển tab, switch toggle):** Rung siêu nhẹ `8ms`.
- **State Transition (Gửi xong 1 prompt, hoàn thành 1 chunk):** Rung nhịp đôi nhẹ nhàng `[12ms, 40ms, 12ms]`.
- **Error / Lockout (Lỗi mạng, timeout, retry):** Rung cảnh báo dứt khoát `[30ms, 50ms, 30ms]`.

### 4.3. Âm Thanh Cơ Học Tự Nhiên (Acoustic Feedback via Web Audio API)
Không sử dụng file âm thanh `.wav` hay `.mp3` bên ngoài (tránh tải nặng và delay mạng). Tất cả âm thanh được tổng hợp thời gian thực bằng bộ dao động sóng (Oscillator) của trình duyệt:

- **The Mechanical Click (Khi bấm nút Run, Chuyển Switch):**
  - Tần số: Xung sine tần số cao `2400Hz` suy giảm nhanh về `0Hz` trong vòng `12ms`.
  - Cảm giác: Như tiếng nhấp của một phím bấm cơ học cherry switch chất lượng cao.
- **The Resonance Thump (Khi toàn bộ phiên chạy song song hoàn thành):**
  - Tần số: Sóng hình sin `180Hz` cộng hưởng nhẹ giảm dần trong `180ms`.
  - Cảm giác: Âm trầm đầm ấm, êm tai, mang lại cảm giác thỏa mãn khi một khối lượng công việc lớn vừa hoàn tất.
- **Nguyên tắc "Câm lặng mặc định hoặc bật tắt có chủ đích":** Tự động bỏ qua nếu người dùng tắt âm hoặc trình duyệt chặn quyền tự động phát âm.

```javascript
// Thiết kế Web Audio Click chuẩn mực
function playMechanicalClick() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.012);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.012);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.015);
  } catch (e) {
    // Fail silently - Calm tech
  }
}
```

---

## 5. Responsive Duality: Mobile/Tablet vs Desktop

Mặc dù Content Helper là một Chrome Extension chạy trên máy tính, người dùng thường xuyên thao tác trên các màn hình cảm ứng gập (Surface Pro, iPad chạy Orion/Kiwi) hoặc chia đôi màn hình (Split Screen) 50/50 với các tài liệu khác.

### 5.1. Chế Độ Desktop & Wide Screen (The Artisan Workbench)
- **Vị trí hiển thị:** Các panel xuất hiện neo ở thanh dock dưới đáy màn hình (`bottom: 90px`), cho phép mở đồng thời 2-3 panels cạnh nhau mà không che lấp khung chat chính của AI.
- **Tự do di chuyển (Freedom of Placement):** Nhấn giữ thanh tiêu đề để kéo thả tự do ra bất kỳ góc nào trên màn hình. Hệ thống tự động ghi nhớ tọa độ và nâng `z-index` panel đang thao tác lên cao nhất.
- **Thu nhỏ thành Bong Bóng Messenger (`.panel-bubble`):**
  - Khi đang chạy chuỗi prompt dài, người dùng thu nhỏ panel thành bong bóng tròn 48px xếp gọn góc phải.
  - Badge trên bong bóng hiển thị tiến độ thời gian thực (ví dụ `3/10`) kèm hiệu ứng viền gợn sóng tĩnh (static pulse ring) thay vì xoay tít gây chóng mặt.

### 5.2. Chế Độ Màn Hình Hẹp / Cảm Ứng (The Mobile Bottom Sheet)
- **Ưu tiên vùng ngón cái (Thumb-Zone Optimization):** Khi chiều rộng cửa sổ `< 768px`, toàn bộ panel tự động chuyển đổi thành dạng **Bottom Sheet** trượt từ đáy màn hình lên.
- **Chiều cao động an toàn (Dynamic Viewport Height `dvh`):** Sử dụng `max-height: 85dvh` kết hợp `pb-safe` để không bao giờ bị thanh điều hướng trình duyệt hoặc bàn phím ảo che lấp nút bấm.
- **Kích thước vùng chạm tối thiểu (Touch Targets):** Mọi nút bấm và checkbox trên màn hình cảm ứng bắt buộc có kích thước tối thiểu `44px × 44px` (hoặc mở rộng padding vô hình thông qua `::after`).

---

## 6. Checklist Kiểm Duyệt Thiết Kế (Design Review Checklist)

Trước khi nghiệm thu bất kỳ giao diện Panel hay Component mới:
- [ ] Giao diện có sử dụng bất kỳ gradient tím/neon nào không? (Nếu có $\rightarrow$ Loại bỏ ngay).
- [ ] Có icon lấp lánh `✨` nào không? (Nếu có $\rightarrow$ Thay bằng icon cơ khí chuẩn xác).
- [ ] Màu sắc đã tuân thủ palette Giấy mộc & Than chì ở cả Light Mode và Dark Mode chưa?
- [ ] Font chữ hiển thị dữ liệu kỹ thuật, số đếm, token đã dùng Monospace chưa?
- [ ] Thao tác bấm nút có phản hồi xúc giác nhẹ hoặc âm thanh click cơ học tinh tế không?
- [ ] Nút bấm có gây đứt gãy mạch làm việc bằng các popup confirm không cần thiết không?
- [ ] Khi thu nhỏ thành Bubble, badge tiến trình có hiển thị rõ ràng không?
