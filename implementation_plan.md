# Khắc phục Trình duyệt Treo / Dừng khi chạy Kịch bản dài

## Phân tích nguyên nhân gốc

Sau khi nghiên cứu codebase, tôi xác định được **3 nguyên nhân chính** gây treo trình duyệt:

### 1. 🔴 `setInterval` polling mỗi 1 giây → Bị throttle khi tab ẩn

Cả `_waitForResponse()` trong `ScenarioRunner.js`, `FlowRunnerPanel.js` đều dùng `setInterval` 1000ms để poll `ChatAdapter.isDone()`. **Trình duyệt Chrome throttle `setInterval` xuống 1 lần/phút khi tab bị ẩn** → vòng lặp polling gần như dừng → kịch bản bị "đứng".

```js
// Đoạn code hiện tại - bị throttle khi tab ẩn
_waitForResponse(timeout = 600000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {     // ❌ Bị throttle khi tab ẩn
      if (window.ChatAdapter.isDone()) {
        clearInterval(timer);
        resolve();
      }
    }, 1000);
  });
}
```

### 2. 🔴 DeepSeek `isDone()` log console mỗi lần poll

`DeepSeekAdapter.isDone()` gọi `console.log` mỗi lần → với polling 1 giây, chạy hàng trăm prompt → hàng nghìn dòng log → chiếm memory và ảnh hưởng performance:

```js
isDone() {
  console.log('check isDone times: ', this.timesCheckDone); // ❌ Log liên tục
  // ...
}
```

### 3. 🟡 Không tự cuộn xuống khi có nội dung mới

Khi AI đang sinh nội dung dài (ví dụ dịch SRT), người dùng phải tự scroll xuống để xem kết quả mới → trải nghiệm kém.

---

## Giải pháp đề xuất

### Giải pháp A: Thay `setInterval` bằng `MutationObserver` + `setTimeout` fallback

**Ý tưởng**: Thay vì polling liên tục, dùng `MutationObserver` để lắng nghe thay đổi DOM (phản hồi AI xuất hiện). `MutationObserver` **KHÔNG bị throttle** khi tab ẩn. Kết hợp với `setTimeout` đệ quy làm fallback.

> [!IMPORTANT]
> `MutationObserver` là giải pháp chuẩn của Chrome cho content scripts khi cần theo dõi DOM mà không bị throttle bởi tab background.

### Giải pháp B: Dùng `chrome.alarms` API (offscreen worker)

Dùng `chrome.alarms` từ service worker để gửi heartbeat mỗi vài giây. Tuy nhiên giải pháp này phức tạp hơn và cần thêm quyền.

**→ Chọn Giải pháp A** vì nó đơn giản, hiệu quả, và không cần thêm permission.

---

## Proposed Changes

### Component 1: ResponseWaiter – Module thông minh chờ AI trả lời

Tách logic chờ phản hồi thành một module riêng, tái sử dụng cho tất cả các panel.

#### [NEW] [ResponseWaiter.js](file:///d:/2.projects/fl/content-helper/content/ResponseWaiter.js)

Module mới chứa class `ResponseWaiter` với chiến lược kép:
- **Primary**: `MutationObserver` theo dõi DOM thay đổi → khi AI ngừng sinh nội dung, kiểm tra `isDone()`
- **Fallback**: `setTimeout` đệ quy (không dùng `setInterval`) với interval động:
  - Tab active: poll mỗi 1.5 giây
  - Tab hidden: poll mỗi 3 giây (vẫn hoạt động nhờ `setTimeout` ít bị throttle hơn `setInterval` trong short-lived executions)
- **Auto-scroll**: Tùy chọn tự cuộn trang chat xuống cuối khi phát hiện nội dung mới
- Hỗ trợ `document.visibilitychange` event để điều chỉnh interval

```js
// API sử dụng (ví dụ)
const waiter = new ResponseWaiter({ autoScroll: true, timeout: 600000 });
await waiter.waitForDone(); // Trả về Promise, tương thích ngược
```

---

### Component 2: Cập nhật các Panel/Sequencer dùng ResponseWaiter

#### [MODIFY] [ScenarioRunner.js](file:///d:/2.projects/fl/content-helper/content/ScenarioRunner.js)
- Thay `_waitForResponse()` bằng `ResponseWaiter.waitForDone()`
- Xóa `setInterval` cũ

#### [MODIFY] [FlowRunnerPanel.js](file:///d:/2.projects/fl/content-helper/content/FlowRunnerPanel.js)
- Thay `_waitForResponse()` bằng `ResponseWaiter.waitForDone()`
- Xóa `setInterval` cũ

#### [MODIFY] [TextSplitter.js](file:///d:/2.projects/fl/content-helper/content/TextSplitter.js)
- `_waitForResponse` hiện đang alias từ `ScenarioRunner.prototype._waitForResponse` → tự động hưởng lợi khi sửa ScenarioRunner, nhưng cần cập nhật tham chiếu

---

### Component 3: Dọn dẹp log thừa

#### [MODIFY] [ChatAdapter.js](file:///d:/2.projects/fl/content-helper/content/ChatAdapter.js)
- Xóa `console.log` liên tục trong `DeepSeekAdapter.isDone()`
- Chỉ giữ log khi trạng thái thay đổi (done → not done hoặc ngược lại)

---

### Component 4: Đăng ký script mới

#### [MODIFY] [manifest.json](file:///d:/2.projects/fl/content-helper/manifest.json)
- Thêm `content/ResponseWaiter.js` vào danh sách `js` (trước `PromptSequencer.js`)

---

## User Review Required

> [!IMPORTANT]
> **Auto-scroll**: Tôi sẽ thêm cơ chế tự cuộn trang chat xuống cuối mỗi khi phát hiện AI sinh nội dung mới. Điều này giúp bạn không cần phải scroll thủ công khi dịch file SRT dài. Tuy nhiên, nếu bạn đang đọc phần trên thì trang sẽ nhảy xuống. Bạn có muốn tôi thêm tính năng này không? Hay chỉ cuộn khi sequencer đang chạy tự động?

> [!NOTE]
> **Khả năng tương thích**: `MutationObserver` được hỗ trợ trên tất cả các trình duyệt hiện đại. Giải pháp này không cần thêm permission mới trong manifest.

## Open Questions

1. **Auto-scroll scope**: Bạn muốn auto-scroll chỉ khi ScenarioRunner/FlowRunner đang chạy tự động, hay cả khi gửi thủ công từng prompt?
2. **Có cần thông báo khi tab ẩn hoàn thành?**: Hiện tại đã có notification qua `chrome.runtime.sendMessage`. Có cần bổ sung gì thêm không?

## Verification Plan

### Kiểm tra thủ công
1. Chạy một kịch bản dịch SRT dài (>10 prompts) trên Google AI Studio
2. Chuyển sang tab khác trong lúc AI đang trả lời
3. Quay lại tab → xác nhận kịch bản vẫn tiếp tục chạy bình thường
4. Kiểm tra console log đã sạch hơn (không còn spam từ DeepSeek)
5. Kiểm tra auto-scroll hoạt động đúng khi AI sinh nội dung mới
