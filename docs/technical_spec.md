# Content Helper – Tài Liệu Đặc Tả Kỹ Thuật (Technical Specification)

> **Dự án:** Content Helper - AI Workflow Assistant  
> **Phiên bản:** 1.0.1  
> **Nền tảng:** Google Chrome Extension (Manifest V3)  
> **Ngôn ngữ:** JavaScript thuần (Vanilla JS - ES6+ OOP), HTML5, CSS3  
> **Cập nhật lần cuối:** 2026-09-08  

---

## MỤC LỤC
1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Kiến Trúc Tổng Thể & Cấu Trúc Thư Mục](#2-kiến-trúc-tổng-thể--cấu-trúc-thư-mục)
3. [Design Patterns & Kiến Trúc Phần Mềm](#3-design-patterns--kiến-trúc-phần-mềm)
4. [Các Nền Tảng AI & Cơ Chế ChatAdapter](#4-các-nền-tảng-ai--cơ-chế-chatadapter)
5. [Hệ Thống Content Script & Các Panels Công Cụ](#5-hệ-thống-content-script--các-panels-công-cụ)
6. [Hệ Thống Thực Thi Kịch Bản (Scenario & Flow Engine)](#6-hệ-thống-thực-thi-kịch-bản-scenario--flow-engine)
7. [Cơ Chế Xử Lý Đa Nhiệm Đa Tab (Parallel Worker & Tab Orchestrator)](#7-cơ-chế-xử-lý-đa-nhiệm-đa-tab-parallel-worker--tab-orchestrator)
8. [Background Service Worker & Các Tác Vụ Nền](#8-background-service-worker--các-tác-vụ-nền)
9. [Hệ Thống Quản Trị Cấu Hình (Options SPA)](#9-hệ-thống-quản-trị-cấu-hình-options-spa)
10. [Xác Thực & Đồng Bộ Đám Mây (Google OAuth2 & Firebase Firestore)](#10-xác-thực--đồng-bộ-đám-mây-google-oauth2--firebase-firestore)
11. [Giao Thức Truyền Tin (Message Passing Protocol)](#11-giao-thức-truyền-tin-message-passing-protocol)
12. [Đặc Tả Lưu Trữ Dữ Liệu (Storage Schema)](#12-đặc-tả-lưu-trữ-dữ-liệu-storage-schema)
13. [Hệ Thống Giao Diện & Quy Chuẩn Styling (CSS Architecture)](#13-hệ-thống-giao-diện--quy-chuẩn-styling-css-architecture)
14. [Quy Tắc Phát Triển & Mở Rộng Hệ Thống (Development Guide)](#14-quy-tắc-phát-triển--mở-rộng-hệ-thống-development-guide)

---

## 1. Tổng Quan Dự Án

### 1.1. Giới thiệu
**Content Helper - AI Workflow Assistant** là tiện ích mở rộng cho trình duyệt Google Chrome (tuân thủ **Manifest V3**), đóng vai trò như một bộ công cụ tự động hóa toàn diện (Automation Suite) trực tiếp trên giao diện người dùng của các nền tảng trí tuệ nhân tạo hàng đầu hiện nay (ChatGPT, Google AI Studio, Google Gemini, DeepSeek, Qwen, Grok) và nền tảng quản lý video YouTube Studio.

### 1.2. Mục tiêu & Vấn đề giải quyết
- **Tự động hóa prompt liên hoàn (Automation Scenarios):** Thay vì sao chép và gửi từng câu lệnh thủ công, extension cho phép định nghĩa các mẫu kịch bản với các biến số, vòng lặp và danh sách giá trị, tự động bơm prompt vào ô chat và đợi câu trả lời từ AI theo tuần tự hoặc song song.
- **Tăng tốc xử lý hàng loạt bằng cơ chế đa tab (Multi-tab Parallel & Split Tabs):** Giải quyết bài toán xử lý danh sách lớn (như dịch 1 file phụ đề SRT 500 dòng ra 10–20 ngôn ngữ) bằng cách chia nhỏ hoặc mở nhiều tab chạy song song, giảm thời gian chờ đợi tới 80%.
- **Trích xuất & xuất bản nội dung tự động:** Tự động thu thập các phản hồi từ AI, làm sạch thẻ HTML thừa, định dạng thành văn bản, trích xuất phụ đề SRT hoặc đóng gói hàng loạt thành file ZIP / TXT.
- **Tự động hóa Studio:** Hỗ trợ thiết lập thông số giọng đọc (Speaker, Voice, Scene, Style) trên Google AI Studio Speech, tự động thêm hàng chục ngôn ngữ phụ đề và điền tiêu đề/mô tả video trên YouTube Studio cho các kênh lồng tiếng đa ngôn ngữ (Aloud).
- **Đồng bộ hóa dữ liệu trên đám mây:** Toàn bộ mẫu kịch bản, luồng liên hoàn (flows), cấu hình giọng nói và danh sách ngôn ngữ được đồng bộ tự động giữa các máy tính thông qua tài khoản Google và Firebase Firestore.

---

## 2. Kiến Trúc Tổng Thể & Cấu Trúc Thư Mục

### 2.1. Sơ đồ phân tầng kiến trúc (High-Level Architecture)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER / CHROME BROWSER                          │
└──────┬──────────────────────┬──────────────────────┬──────────────┬─────┘
       │                      │                      │              │
       ▼                      ▼                      ▼              ▼
┌──────────────┐     ┌──────────────────┐    ┌──────────────┐ ┌───────────┐
│ Popup (Auth) │     │ Options Page SPA │    │ Context Menu │ │ Web Pages │
│  - Google    │     │  - Scenarios     │    │ ("Tạo Voice")│ │ (AI Hosts)│
│    OAuth2    │     │  - Flows         │    └──────┬───────┘ └─────┬─────┘
│  - User Info │     │  - Profiles      │           │               │
└──────┬───────┘     │  - Button Config │           │               │
       │             └────────┬─────────┘           │               │
       │                      │                     │               │
       ▼                      ▼                     ▼               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 BACKGROUND SERVICE WORKER (background.js)               │
│  - WebRequest Interceptor (bắt headers ChatGPT, conversation API)       │
│  - TTS Audio Downloader Queue (Fetch + Exponential Backoff Retry + ZIP) │
│  - TabOrchestrator (Điều phối phiên chạy song song qua các Chrome Tabs) │
│  - SplitTabs Orchestrator (Chia items đều cho N tabs + Auto-switch)     │
│  - Chrome Notifications Dispatcher                                      │
└──────┬────────────────────────────────────────────────────────────┬─────┘
       │                                                            │
       ▼                                                            ▼
┌──────────────────────────────────────┐   ┌──────────────────────────────┐
│        STORAGE & CLOUD SYNC          │   │     CONTENT SCRIPTS LAYER    │
│  - chrome.storage.local              │   │  - ChatAdapter (7 Nền tảng)  │
│  - Firebase Firestore (Cloud Sync)   │   │  - ContentHelper (Bar & UI)  │
│    Collections: configs, flows,      │   │  - ScenarioRunner / Builder  │
│    speech_profiles, yt_profiles,     │   │  - FlowRunnerPanel           │
│    button_configs                    │   │  - ParallelWorker            │
└──────────────────────────────────────┘   │  - ResponseWaiter            │
                                           │  - TextSplitter / AudioDL    │
                                           │  - ContentCopy / SRT / YTB   │
                                           └──────────────────────────────┘
```

### 2.2. Chi tiết cấu trúc thư mục dự án

```
d:/2.projects/fl/content-helper/
├── manifest.json                  # Cấu hình Chrome Extension (Manifest V3)
├── background/
│   └── background.js              # Service Worker (WebRequest, Audio DL, TabOrchestrator)
├── content/                       # Content Scripts inject trực tiếp vào trang web AI
│   ├── ChatAdapter.js             # Lớp trừu tượng Adapter và các implementation cho 7 web AI
│   ├── content-helper.js          # Root Controller quản lý toàn bộ vòng đời của các Panels
│   ├── content-helper.css         # Scoped CSS, CSS Utilities (ts-*), Gradient viền & Animations
│   ├── ResponseWaiter.js          # Module thông minh lắng nghe DOM nhận diện AI trả lời xong
│   ├── PromptSequencer.js         # Động cơ bơm prompt và chạy tuần tự cơ bản
│   ├── FlowSequencer.js           # Động cơ thực thi chuỗi kịch bản có retry, skip, pause
│   ├── ParallelWorker.js          # Script thực thi trên tab con của các phiên chạy song song
│   ├── ScenarioBuilder.js         # Giao diện tạo, sửa, xóa các kịch bản mẫu (Templates)
│   ├── ScenarioRunner.js          # Giao diện thực thi kịch bản (Tuần tự, Song song, Chia tab)
│   ├── FlowRunnerPanel.js         # Giao diện thực thi chuỗi Flow liên hoàn trên trang chat
│   ├── TextSplitter.js            # Cắt văn bản dài theo câu thành các chunks gửi tuần tự
│   ├── AudioDownloader.js         # Giao diện tải TTS Audio từ cuộc hội thoại ChatGPT
│   ├── ContentCopyPanel.js        # Giao diện sao chép và xuất nội dung câu trả lời ra TXT/ZIP
│   ├── GoogleAIStudioPanel.js     # Cấu hình tự động hóa giao diện chat của AI Studio
│   ├── GoogleAIStudioSpeechPanel.js # Cấu hình tự động hóa giao diện AI Studio Speech
│   ├── SRTAutomationPanel.js      # Tự động quét và đóng gói file phụ đề .SRT
│   ├── YoutubeStudioPanel.js      # Tự động thêm ngôn ngữ và điền dịch thuật trên YouTube Studio
│   ├── PanelState.js              # Tiện ích lưu và khôi phục trạng thái panel qua storage
│   └── firestore-helper.js        # Lớp bọc SDK Firestore CRUD cấu hình người dùng
├── options/                       # Trang cài đặt tổng quan (Options Page SPA)
│   ├── options.html               # Cấu trúc HTML giao diện cài đặt dạng Single Page App
│   ├── options.css                # Style trang cài đặt theo phong cách Dashboard hiện đại
│   ├── options.js                 # Router điều khiển điều hướng giữa các module
│   ├── shared/
│   │   └── BaseModule.js          # Lớp cơ sở (Base Class) cho tất cả các trang con Options
│   └── modules/
│       ├── ScenarioModule.js      # Quản lý danh sách Scenario, tìm kiếm, Import/Export JSON
│       ├── FlowModule.js          # Quản lý Flows, kéo thả sắp xếp thứ tự bước, gán biến mặc định
│       ├── SpeechProfileModule.js # Quản lý các cấu hình giọng nói AI Studio Speech
│       ├── YoutubeProfileModule.js# Quản lý danh mục ngôn ngữ và profile dịch trên YouTube
│       └── ButtonConfigModule.js  # Bật/tắt và chọn chế độ hiển thị nút trên từng nền tảng
├── popup/                         # Giao diện Popup Extension khi click icon trên trình duyệt
│   ├── popup.html                 # UI đăng nhập/đăng xuất tài khoản Google
│   └── popup.js                   # Xử lý Google OAuth2, nhận diện trạng thái và kích hoạt sync
├── libs/                          # Thư viện ngoài đóng gói cục bộ (No npm bundler)
│   ├── tailwind.min.js            # Tailwind CSS runtime inject vào content scripts
│   ├── jszip.min.js               # Nén và giải nén file ZIP trong trình duyệt và Service Worker
│   ├── compromise.min.js          # Xử lý ngôn ngữ tự nhiên (NLP) phân tách câu chính xác
│   ├── firebase-app-compat.js     # Firebase Core SDK (Compatibility build)
│   └── firebase-firestore-compat.js # Firebase Firestore SDK (Compatibility build)
├── assets/
│   └── icon.png                   # Icon ứng dụng (kích thước 16x16, 48x48, 128x128)
└── docs/                          # Thư mục tài liệu kỹ thuật
    └── technical_spec.md          # Toàn bộ đặc tả kỹ thuật chi tiết của dự án
```

---

## 3. Design Patterns & Kiến Trúc Phần Mềm

Dự án áp dụng kiến trúc hướng đối tượng (OOP) thuần trong môi trường trình duyệt không có bundler (như Webpack hay Vite). Mỗi file chứa một lớp độc lập được gắn vào không gian tên toàn cục `window.*`.

```
                  ┌──────────────────────┐
                  │    BaseChatAdapter   │
                  └──────────┬───────────┘
                             │
     ┌──────────────┬────────┼──────────────┬──────────────┐
     │              │        │              │              │
     ▼              ▼        ▼              ▼              ▼
ChatGPTAdapter DeepSeek  QwenAdapter    GrokAdapter   GeminiAdapter
               Adapter                                (AI Studio, YT)
```

### 3.1. Adapter Pattern (`ChatAdapter.js`)
- **Mục đích:** Che giấu sự khác biệt về cấu trúc DOM, sự kiện và hành vi giữa 7 nền tảng web khác nhau.
- **Interface cơ sở (`BaseChatAdapter`):**
  - `getTextarea()`: Trả về element nhập văn bản (thẻ `<textarea>` hoặc thẻ `contenteditable="true"`).
  - `getSendBtn()`: Trả về nút Gửi câu lệnh.
  - `getStopBtn()`: Trả về nút Ngừng tạo (Stop generating).
  - `isDone()`: Logic boolean kiểm tra xem AI đã sinh xong toàn bộ nội dung hay chưa.
  - `getContentElements()`: Trả về mảng các element chứa khối trả lời của AI.
  - `sendMessage(text)`: Phương thức tự động điền prompt, kích hoạt sự kiện `input`/`change` và nhấn nút gửi.
  - `enableTemporaryChat()`: (Tùy chọn) Kích hoạt chế độ trò chuyện tạm thời để không lưu rác vào lịch sử chat.
  - `isCompactMode()`: Xác định hiển thị nút dạng thanh ngang hay nút tròn nổi (Floating Bubble).

### 3.2. Factory Pattern (`ChatAdapter.js` - `initializeAdapter`)
- Mảng `ADAPTER_CTORS` lưu danh sách tất cả các constructor adapter.
- Hàm `initializeAdapter()` duyệt qua từng lớp, gọi hàm static `matches(window.location.hostname)`. Lớp nào trả về `true` sẽ được khởi tạo singleton và gán vào `window.ChatAdapter`.

### 3.3. Dual-Strategy Observer Pattern (`ResponseWaiter.js`)
- Để khắc phục nhược điểm của polling cố định (tốn tài nguyên và bị trình duyệt đóng băng khi tab ở chế độ nền), `ResponseWaiter` sử dụng chiến lược kép:
  1. **MutationObserver chính:** Theo dõi mọi thay đổi trong `document.body` (thêm node, thay đổi text). Kết hợp với bộ đệm thời gian (debounce 800ms) để xác nhận AI đã thực sự dừng sinh nội dung.
  2. **Timer dự phòng linh hoạt (Visibility-Aware Fallback):** Kiểm tra `ChatAdapter.isDone()`. Khi tab đang xem (active), tần suất kiểm tra là 1.5 giây; khi tab bị ẩn (background), giãn tần suất thành 3 giây.
  3. **Lockout Guard (Khóa an toàn 2.5s ban đầu):** Bỏ qua kiểm tra trong 2.5 giây đầu tiên sau khi bấm gửi để tránh trường hợp server chưa kịp phản hồi khiến hệ thống tưởng nhầm đã hoàn thành.
  4. **Auto-Scroll Engine:** Tự động phát hiện container chat có thanh cuộn và cuộn xuống đáy khi AI đang sinh chữ.

### 3.4. Orchestrator & Worker Pattern (Tab Đa Nhiệm)
- **TabOrchestrator (`background.js`):** Đóng vai trò tổng chỉ huy (Master), duy trì hàng đợi tác vụ, giới hạn số tab đồng thời (`maxConcurrent`), lắng nghe trạng thái qua `chrome.storage.onChanged` và điều phối mở tab kế tiếp.
- **ParallelWorker (`ParallelWorker.js`):** Đóng vai trò công nhân (Worker), chạy trên tab con độc lập, nhận dữ liệu qua message hoặc storage, tự động thao tác trên DOM mà không cần hiển thị giao diện chính của ScenarioRunner, sau đó báo cáo kết quả về Background.

### 3.5. Component Lifecycle Pattern (`ContentHelper` & Các Panel)
Tất cả các panel công cụ (`ScenarioRunner`, `ScenarioBuilder`, `FlowRunnerPanel`, `TextSplitter`, `AudioDownloader`, v.v.) đều tuân thủ vòng đời chuẩn:
```
constructor(onClose) ──► _render() ──► mountPanel() ──► makeDraggable() ──► addMinimizeButton() ──► destroy()
```
- `ContentHelper.mountPanel(el)`: Đưa panel vào thanh neo cố định dưới đáy màn hình (`#content-helper-panel-bar`).
- `ContentHelper.makeDraggable(el, handleSelector)`: Khi người dùng kéo thanh tiêu đề, panel tự động tách khỏi thanh bar và chuyển sang trạng thái tự do (`position: fixed`).
- `ContentHelper.bringToFront(el)`: Tự động tăng `z-index` lên trên cùng khi người dùng click vào panel.
- `ContentHelper.addMinimizeButton(el, options)`: Cho phép thu nhỏ panel thành bong bóng tròn phong cách Facebook Messenger, có badge hiển thị tiến độ thời gian thực (`idle`, `running`, `paused`).

---

## 4. Các Nền Tảng AI & Cơ Chế ChatAdapter

Bảng dưới đây tổng hợp chi tiết thông số kỹ thuật của từng Adapter được triển khai trong hệ thống:

| Nền Tảng | Domain Khớp | Textarea Selector | Nút Gửi (Send) | Nút Dừng (Stop) | Đặc Thù & Cơ Chế Riêng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT** | `chatgpt.com`<br>`chat.openai.com` | `#prompt-textarea` | `button[aria-label="Send prompt"]` | `button[aria-label="Stop generating"]` | Hỗ trợ bắt API headers tải TTS Audio, Text Splitter. |
| **DeepSeek** | `chat.deepseek.com` | `textarea[placeholder*="DeepSeek"]`<br>`textarea#chat-input` | Nút cuối cùng trong form, bọc `aria-disabled` | Icon chứa SVG path hình vuông (`M2 4.88...`) hoặc `rect` | **Tự động click Continue** khi gặp giới hạn độ dài token; tự động chọn Model Expert. |
| **Qwen** | `chat.qwen.ai`<br>`tongyi.aliyun.com` | `textarea.message-input-textarea` | `button.send-button` | `button.stop-button` | Xử lý trạng thái nút Send bị mờ khi ô nhập rỗng để tránh nhận diện sai trạng thái bận. |
| **Grok** | `grok.com`<br>`grok.x.ai` | `textarea[aria-label="Ask Grok anything"]` | `button[type="submit"][aria-label="Submit"]` | `button[aria-label="Stop generating"]` | Markdown nằm trong `.markdown-content-container`. |
| **Google AI Studio** | `aistudio.google.com` | `textarea[aria-label*="prompt"]` | `ms-run-button button:not(.stoppable)` | `ms-run-button button` chứa chữ "Stop" | Hỗ trợ 2 chế độ: Chat thông thường và Trang Speech (`/generate-speech`). Nút Collapse All Code Blocks. |
| **Google Gemini** | `gemini.google.com` | `div[contenteditable="true"]`<br>`.ql-editor.textarea` | `.send-button button` | `.send-button.stop button` | Nhập văn bản qua HTML `<p>Text</p>`; **Hỗ trợ tự động kích hoạt cuộc trò chuyện tạm thời** (`gemini_chat_temp`). |
| **YouTube Studio** | `studio.youtube.com` | Không (Trang video) | Nút `Publish` trong dialog ngôn ngữ | N/A | Tự động mở dialog thêm ngôn ngữ, điền title/desc từ JSON, tự động lưu và đóng popup (Kênh Aloud). |

---

## 5. Hệ Thống Content Script & Các Panels Công Cụ

### 5.1. `content-helper.js` (Root Controller)
- Khởi tạo instance `ContentHelper` duy nhất trên mỗi tab thông qua cờ `window.__helperInjected`.
- Sử dụng `MutationObserver` liên tục theo dõi sự xuất hiện của form chat để gọi `ChatAdapter.insertHelperButtons()`.
- Lắng nghe phím tắt `Escape` để tự động đóng panel mở gần nhất (`closeTopPanel`).
- Cung cấp hệ thống hiển thị thông báo Toast đẹp mắt (`ContentHelper.showToast(message, type, duration)`).
- Tích hợp thuật toán tìm kiếm mờ (Fuzzy Search - `ContentHelper.fuzzySearch(query, text)`) chấm điểm độ khớp của từ khóa để tìm kiếm nhanh kịch bản.

### 5.2. `ScenarioBuilder.js` (Quản Lý Kịch Bản)
- Cho phép tạo, sửa, xóa các kịch bản mẫu trực tiếp trên trang chat AI.
- Hỗ trợ phân loại kịch bản theo `group` (ví dụ: podcast, video, blog, code, seo).
- Tạo các loại câu hỏi:
  - `text`: Câu hỏi tĩnh nguyên bản.
  - `variable`: Câu hỏi chứa biến `${key}` hoặc menu dropdown `${topic|AI,Tech,Science}`.
  - `loop`: Vòng lặp số lần `${count}` (biến sẽ tự động nhận giá trị 1, 2, 3...).
  - `list`: Vòng lặp qua danh sách phần tử phân tách bằng dấu phẩy (ví dụ: `Tiếng Anh, Tiếng Pháp, Tiếng Đức`).

### 5.3. `ScenarioRunner.js` (Trung Tâm Thực Thi Kịch Bản)
- Cho phép chọn kịch bản qua ô tìm kiếm mờ và chọn bước bắt đầu (Step Offset).
- Sinh form động tương ứng với tất cả các biến xuất hiện trong kịch bản.
- **4 Chế độ chạy linh hoạt:**
  1. **Tuần tự (Sequential):** Gửi từng câu hỏi trên tab hiện tại qua `PromptSequencer`.
  2. **Song song (Multi-tab Parallel):** Mở mỗi tab cho một giá trị list (dùng Gemini), điều phối bởi Background.
  3. **Chia tab (Split Tabs v2):** Chia đều danh sách items thành N tab, mỗi tab xử lý một nhóm tuần tự.
  4. **Hàng đợi (Queue Execution):** Thêm nhiều bộ tham số vào danh sách chờ và tự động thực thi lần lượt.
- Tích hợp thanh tiến trình %, thống kê số prompt hoàn thành, nút dừng khẩn cấp và nút tải toàn bộ kết quả dạng file ZIP.

### 5.4. `FlowRunnerPanel.js` (Thực Thi Chuỗi Kịch Bản Liên Hoàn)
- Thực thi một Flow gồm nhiều Scenarios nối tiếp nhau.
- Cho phép ghi đè (override) giá trị biến mặc định của từng bước ngay trước khi khởi chạy.
- Hỗ trợ chọn bước bắt đầu, tạm dừng, tiếp tục.
- Cơ chế xử lý lỗi nâng cao: Khi một bước bị timeout hoặc lỗi mạng, hệ thống tạm dừng và cung cấp hai nút **🔄 Thử lại (Retry)** hoặc **⏭ Bỏ qua (Skip)**.

### 5.5. `TextSplitter.js` (Cắt & Bơm Văn Bản Dài)
- Hỗ trợ nạp văn bản từ file `.txt` hoặc dán trực tiếp.
- Sử dụng thư viện NLP `compromise.min.js` để cắt văn bản thành các đoạn có độ dài $\le$ `charLimit` nhưng không làm đứt gãy câu giữa chừng.
- Cho phép thiết lập mẫu prompt bọc ngoài chunk (Prefix/Suffix Template).
- Lưu trạng thái vào `PanelState` để có thể tiếp tục sau khi tải lại trang.

### 5.6. `AudioDownloader.js` (Tải TTS Audio ChatGPT)
- Bắt các tin nhắn trong cuộc hội thoại từ storage (lấy qua WebRequest).
- Cho phép chọn Voice Model (Monday/shade, Sol/glimmer, Vale, Cove, Arbor/fathom, Juniper, Breeze, Ember, Orbit).
- Lựa chọn định dạng audio (`mp3` hoặc `wav`).
- Tải từng file lẻ hoặc bấm "Download All" để đóng gói toàn bộ vào file `.zip`.

### 5.7. `ContentCopyPanel.js` (Trích Xuất Nội Dung AI)
- Quét và trích xuất nội dung của tất cả các khối trả lời từ AI trên trang.
- Làm sạch DOM, chuyển đổi ngắt dòng, loại bỏ các nút bấm hoặc mã điều hướng thừa.
- Tùy chọn đặt tên file tùy chỉnh theo thứ tự (Custom Filenames) hoặc tự động đánh số.
- Các tùy chọn sao chép: Copy tất cả, Copy từ vị trí N, Copy kèm nhãn phân đoạn "Part X", Tải file gộp `.txt`, Tải file nén `.zip`.

### 5.8. `GoogleAIStudioSpeechPanel.js` & `GoogleAIStudioPanel.js`
- Quản lý cấu hình giọng nói AI Studio Speech Profiles:
  - Cấu hình Speaker 1, Speaker 2.
  - Chỉ định tên Voice (ví dụ: Aoede, Charon, Fenrir, Puck, Kore).
  - Soạn sẵn Scene Instructions và Style Instructions.
- **Auto Set:** Tự động tìm và click các selector của Google AI Studio để điền thông số giọng và câu mẫu.
- **Auto Paste:** Tự động lấy văn bản từ clipboard và dán vào khung kịch bản phát âm.

### 5.9. `SRTAutomationPanel.js` (Tự Động Xuất Phụ Đề)
- Quét toàn bộ nội dung chat trên AI Studio (hoặc các trang khác) tìm kiếm định dạng phụ đề SRT (`00:00:00,000 --> 00:00:00,000`).
- Gán nhãn ngôn ngữ thủ công hoặc tự động bóc tách từ tiêu đề câu hỏi.
- Kiểm tra tính hợp lệ của timeline phụ đề và tải xuống file `.srt` lẻ hoặc đóng gói toàn bộ vào file `.zip`.

### 5.10. `YoutubeStudioPanel.js` (Tự Động Hóa Dịch Thuật YouTube)
- Chứa danh mục hơn 100 ngôn ngữ chuẩn của YouTube Studio.
- Quản lý các Profile ngôn ngữ cần dịch (ví dụ: Profile Đông Nam Á, Profile Châu Âu...).
- **Chế độ Kênh Aloud:** Tự động click nút "Add language", chọn ngôn ngữ, mở popup Metadata Title & Description, điền dữ liệu dịch từ file JSON đã nạp và bấm nút Publish hoàn tất.
- Toàn bộ giao diện sử dụng tiền tố CSS `ts-*` với `!important` để tránh bị style của YouTube ghi đè.

---

## 6. Hệ Thống Thực Thi Kịch Bản (Scenario & Flow Engine)

### 6.1. Cấu trúc dữ liệu Scenario Template
Kịch bản được lưu trữ trong `chrome.storage.local` dưới key `scenarioTemplates`:
```json
{
  "Dịch Phụ Đề Đa Ngôn Ngữ": {
    "group": "subtitles",
    "questions": [
      {
        "text": "Bạn là chuyên gia dịch thuật phụ đề. Hãy dịch file SRT sau sang tiếng ${target_lang}: \n\n${srt_content}",
        "type": "list",
        "loopKey": "target_lang"
      }
    ]
  },
  "Viết Kịch Bản Podcast 5 Tập": {
    "group": "podcast",
    "questions": [
      {
        "text": "Hãy lên dàn ý cho tập ${episode_num} của chủ đề ${topic|Công nghệ,Khoa học,Tài chính}",
        "type": "loop",
        "loopKey": "episode_num"
      }
    ]
  }
}
```

### 6.2. Cấu trúc dữ liệu Flow (Chuỗi Kịch Bản Liên Hoàn)
Lưu trữ dưới key `flowConfigs`:
```json
{
  "Quy Trình Tạo Video Youtube": {
    "steps": [
      {
        "scenarioName": "Nghiên Cứu Từ Khóa",
        "defaultValues": { "niche": "AI Tools" }
      },
      {
        "scenarioName": "Viết Kịch Bản Chi Tiết",
        "defaultValues": { "tone": "Hào hứng", "length": "10 phút" }
      },
      {
        "scenarioName": "Dịch Phụ Đề Đa Ngôn Ngữ",
        "defaultValues": { "target_lang": "Tiếng Anh, Tiếng Nhật" }
      }
    ]
  }
}
```

### 6.3. Quy trình thực thi tuần tự (PromptSequencer Workflow)

```
[Bắt đầu] ──► Lấy prompt tại index 
                │
                ▼
          Gửi prompt qua ChatAdapter.sendMessage()
                │
                ▼
          Chờ ResponseWaiter.waitForDone()
                │
                ├──► Chưa xong: MutationObserver tiếp tục chờ (Timeout: 10 phút)
                └──► Đã xong: Cập nhật index++ ──► Kiểm tra hết câu hỏi chưa?
                                                      │
                                                      ├──► Chưa: Lặp lại bước tiếp theo
                                                      └──► Hết: Gửi thông báo hoàn thành
```

---

## 7. Cơ Chế Xử Lý Đa Nhiệm Đa Tab (Parallel Worker & Tab Orchestrator)

Để giải quyết tình trạng nghẽn cổ chai khi chạy các kịch bản có danh sách lớn (như dịch 10–20 ngôn ngữ trên cùng 1 tab mất hàng giờ), extension cung cấp hai giải pháp đa tab chuyên sâu:

### 7.1. Chế độ Chạy Song Song (Multi-Tab Parallel)
Áp dụng khi câu hỏi có `type: "list"` (ví dụ: danh sách ngôn ngữ).
- **Nguyên lý hoạt động:**
  1. `ScenarioRunner` tách danh sách giá trị (ví dụ: 10 ngôn ngữ) thành 10 tasks riêng biệt, mỗi task gán 1 giá trị đơn.
  2. Gửi message `PARALLEL_START` sang Background cùng thông số `maxConcurrent` (mặc định 5 tabs).
  3. `TabOrchestrator` trong Background lưu trạng thái vào `parallel_session_{sessionId}` và mở dần các tab mới theo URL đích (ví dụ: `https://gemini.google.com/app`).
  4. **Cơ chế gối đầu tab (First Prompt Sent Trigger):** Khi Tab 1 vừa gửi câu lệnh đầu tiên thành công, `ParallelWorker` gửi message `PARALLEL_TASK_FIRST_PROMPT_SENT` về background. Background lập tức mở ngay Tab 2 mà không cần chờ Tab 1 trả lời xong, giúp tiết kiệm tối đa thời gian khởi động tab.
  5. Mỗi tab con chạy độc lập dưới sự điều khiển của `ParallelWorker.js`:
     - Tự động bật tính năng trò chuyện tạm thời (`enableTemporaryChat`) để không làm rác lịch sử chat của người dùng.
     - Bơm prompt, chờ AI phản hồi qua `ResponseWaiter`.
     - Kích hoạt tab hiển thị lên màn hình (`PARALLEL_ACTIVE_TAB`) trước khi thu thập dữ liệu để ép trình duyệt render đầy đủ DOM.
     - Trích xuất nội dung có cơ chế kiểm tra trống (`_collectContentWithRetry`).
     - Hiển thị hộp thoại xác nhận cho người dùng lựa chọn Đóng tab hoặc Giữ lại tab để kiểm tra.
     - Báo cáo kết quả vào `parallel_session_{sessionId}`.
  6. **Khôi phục phiên bị gián đoạn (Resume Capability):** Nếu người dùng vô tình đóng trình duyệt hoặc reload, ScenarioRunner sẽ hiển thị thanh banner màu vàng cho phép bấm "Tiếp tục chạy" (`PARALLEL_RESUME`), background sẽ chỉ chạy các task chưa hoàn thành.
  7. **Tải ZIP kết quả:** Khi tất cả hoặc một phần tasks hoàn thành, người dùng có thể bấm icon 📦 để background tự động đọc nội dung từ storage, nén thành file zip và kích hoạt download.

### 7.2. Chế độ Chia Tab v2 (Split Tabs)
Áp dụng khi người dùng muốn chia đều một danh sách lớn vào N tab cố định (ví dụ: 15 mục chia đều cho 3 tabs, mỗi tab chạy 5 mục tuần tự).
- **Cơ chế tránh xung đột bộ nhớ (Zero Race Condition):**
  - Khác với cơ chế cũ ghi vào 1 object session chung, Split Tabs v2 ghi siêu dữ liệu vào key `split_tabs_meta_{sessionId}` và **mỗi task sở hữu một key storage riêng biệt:** `split_task_{taskId}`.
  - Các worker tab ghi dữ liệu song song không bao giờ bị ghi đè dữ liệu lẫn nhau.
- **Cơ chế chống đóng băng tab ẩn (Anti-Throttling & Auto-Switch):**
  - Trình duyệt Chrome thường giảm tần suất xử lý (throttle CPU/Timer) của các tab không active.
  - Split Tabs tích hợp tính năng **Tự động xoay vòng tab (Auto-Switch):** Cứ mỗi N giây (mặc định 5s), background tự động kích hoạt lần lượt các tab đang chạy lên foreground, đảm bảo JavaScript luôn được thực thi ở hiệu năng tối đa.
  - Mỗi khi worker chuẩn bị gửi prompt mới, nó tự động gửi lệnh `SPLIT_TABS_ACTIVATE_TAB` để đánh thức tab trước 300ms.
- **Mini Dashboard trên tab Worker:** Trên mỗi tab con xuất hiện một bảng điều khiển mini góc phải dưới (`#split-worker-panel`) hiển thị danh sách các item kèm icon trạng thái (⏳ chờ, 🔄 đang chạy, ✅ xong, ❌ lỗi), thanh tiến trình prompt, nút copy danh sách và nút đồng bộ tiêu đề chat Gemini.

---

## 8. Background Service Worker & Các Tác Vụ Nền

File `background/background.js` đóng vai trò là xương sống kết nối toàn bộ hệ thống:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        background/background.js                        │
├────────────────────────────┬───────────────────────────────────────────┤
│ 1. WebRequest Listeners    │ • onBeforeSendHeaders: Bắt ChatGPT Auth   │
│                            │ • onCompleted: Bắt dữ liệu Conversation   │
├────────────────────────────┼───────────────────────────────────────────┤
│ 2. Audio Downloader        │ • Download Queue với Max Concurrency = 1  │
│                            │ • Exponential Backoff Retry (Tối đa 10 lần│
│                            │ • Nén JSZip trực tiếp trong Worker        │
├────────────────────────────┼───────────────────────────────────────────┤
│ 3. Tab Orchestrators       │ • TabOrchestrator: Phiên chạy Song song   │
│                            │ • SplitTabsOrchestrator: Phiên Chia tab   │
│                            │ • Tự động xoay vòng kích hoạt Tab (Switch)│
├────────────────────────────┼───────────────────────────────────────────┤
│ 4. Service Worker Watchdog │ • Keep-alive Interval: 25 giây chống ngủ  │
│ 5. Context Menu Controller │ • Mục "Tạo Voice" tích hợp web tool ngoài │
└────────────────────────────┴───────────────────────────────────────────┘
```

### 8.1. Đánh thức Service Worker (Keep-Alive)
Do Service Worker của Manifest V3 tự động bị đình chỉ sau 30 giây không hoạt động, extension sử dụng cơ chế gọi định kỳ:
```javascript
const keepAlive = setInterval(() => chrome.runtime.getPlatformInfo(() => {}), 25000);
```

### 8.2. Hệ thống tải Audio TTS với Exponential Backoff
- Khi nhận yêu cầu `downloadAudio`, background đưa request vào hàng đợi tuần tự `downloadQueue`.
- Thực hiện fetch URL `https://chatgpt.com/backend-api/synthesize`.
- Nếu gặp lỗi mạng hoặc server quá tải (ngoại trừ các mã lỗi cố định 401, 403, 404), hệ thống tự động thử lại tối đa 10 lần theo công thức thời gian chờ lũy thừa:
  $$\text{Delay} = 2^{\text{retryCount}} \times 100 \text{ ms}$$
- Khi nhận yêu cầu `downloadAudioZip`, background tải đồng loạt các file audio thành dạng blob, đưa vào instance `JSZip`, chuyển đổi thành base64 data URL và gọi `chrome.downloads.download()`.

---

## 9. Hệ Thống Quản Trị Cấu Hình (Options SPA)

Trang cài đặt (`options/options.html`) được thiết kế theo mô hình Single Page Application (SPA) với thanh điều hướng Sidebar và khu vực nội dung động.

### 9.1. Lớp Cơ Sở `BaseModule.js`
Mọi module trang con đều kế thừa `BaseModule`, thừa hưởng sẵn các phương thức:
- `loadFromStorage()` / `saveToStorage(data)`: Giao tiếp với `chrome.storage.local`.
- `syncToFirestore(data)`: Tự động tải dữ liệu lên collection Firestore tương ứng.
- `getCurrentUser()`: Lấy thông tin tài khoản Google đang đăng nhập.
- `showToast(msg, type)`: Hiển thị thông báo trạng thái.

### 9.2. Các Module Chức Năng
1. **ScenarioModule (`ScenarioModule.js`):**
   - Xem bảng danh sách kịch bản kèm phân trang (8 kịch bản/trang).
   - Lọc theo từ khóa tìm kiếm và lọc theo Nhóm (Group).
   - Trình soạn thảo modal: Thêm/sửa câu hỏi, đổi type, cấu hình biến, gán group.
   - Xuất dữ liệu ra file `scenarios_export.json` hoặc nhập kịch bản từ file JSON.
2. **FlowModule (`FlowModule.js`):**
   - Quản lý các luồng kịch bản liên hoàn.
   - **Kéo thả sắp xếp bước (HTML5 Drag & Drop API):** Người dùng có thể kéo thả để hoán đổi vị trí các bước trong Flow một cách mượt mà.
   - Cấu hình giá trị biến mặc định cho từng bước.
3. **SpeechProfileModule (`SpeechProfileModule.js`):**
   - Quản lý danh sách các profile phát âm cho AI Studio.
   - Chọn profile hoạt động (`activeProfileName`).
   - Cấu hình Speaker, Voice model, Scene và Style.
4. **YoutubeProfileModule (`YoutubeProfileModule.js`):**
   - Quản lý profile danh sách ngôn ngữ dịch video YouTube.
   - Checkbox kích hoạt từng ngôn ngữ trong danh mục hơn 100 thứ tiếng.
   - Bật/tắt chế độ kênh Aloud và chế độ tự động điền (Autofill).
5. **ButtonConfigModule (`ButtonConfigModule.js`):**
   - Quản lý danh sách nút hiển thị cho từng nền tảng AI riêng biệt.
   - Cho phép Bật/Tắt hoàn toàn Content Helper trên từng trang web.
   - Tùy chọn chế độ hiển thị: Thanh ngang thông thường hoặc Nút gộp tròn nổi (Compact Floating Bubble).

---

## 10. Xác Thực & Đồng Bộ Đám Mây (Google OAuth2 & Firebase Firestore)

### 10.1. Luồng Xác Thực Google OAuth2 (`popup.js`)
Extension sử dụng API `chrome.identity.launchWebAuthFlow` với Google Client ID cấu hình trong `manifest.json`:
1. Người dùng mở popup và bấm "Đăng nhập với Google".
2. Extension mở luồng xác thực OAuth2 xin quyền lấy email và profile:
   - Scope: `https://www.googleapis.com/auth/userinfo.email`
   - Scope: `https://www.googleapis.com/auth/userinfo.profile`
3. Lấy về `access_token`, gọi Google UserInfo API để lấy email, họ tên và ảnh đại diện.
4. Lưu thông tin vào `chrome.storage.local` (`google_user_email`, `google_user_name`, `google_user_avatar`, `gg_access_token`).
5. Gửi message broadcast `show_buttons` đến tất cả các tab đang mở.

### 10.2. Cấu Trúc Firestore Collections
Dữ liệu của mỗi người dùng được cô lập hoàn toàn dựa trên Document ID là chính `google_user_email`:

| Collection Name | Document ID | Cấu Trúc Dữ Liệu Lưu Trữ |
| :--- | :--- | :--- |
| `configs` | `{user_email}` | Object chứa toàn bộ `scenarioTemplates` |
| `flow_configs` | `{user_email}` | Object chứa danh sách `flowConfigs` |
| `speech_profiles`| `{user_email}` | Object chứa `{ activeProfileName, profiles: { ... } }` |
| `youtube_language_profiles` | `{user_email}` | Object chứa `{ activeProfileName, profiles: { ... } }` |
| `button_configs` | `{user_email}` | Object chứa cấu hình nút hiển thị trên 7 nền tảng |

### 10.3. Cơ Chế Đồng Bộ Hai Chiều (Bi-directional Sync)
- **Tải về khi khởi động (`_downloadFromFirestore`):** Khi người dùng mở bất kỳ trang web chat AI nào hoặc vừa đăng nhập thành công, content script tự động tải dữ liệu mới nhất từ cả 5 collections trên Firestore và ghi đè vào `chrome.storage.local`.
- **Đẩy lên khi chỉnh sửa (`syncToFirestore`):** Bất kỳ thao tác lưu hoặc xóa kịch bản/profile trên giao diện panel hoặc trang Options đều đồng thời cập nhật vào storage cục bộ và ghi đè lên Document tương ứng trên Firestore.

---

## 11. Giao Thức Truyền Tin (Message Passing Protocol)

Bảng tổng hợp tất cả các thông điệp giao tiếp nội bộ giữa các thành phần của Extension:

| Message Type / Action | Nguồn Gửi | Đích Nhận | Mục Đích & Nội Dung Payload |
| :--- | :--- | :--- | :--- |
| `show_buttons` | Popup | Content Scripts | Yêu cầu các tab AI hiển thị thanh công cụ sau khi đăng nhập. |
| `hide_buttons` | Popup | Content Scripts | Yêu cầu ẩn thanh công cụ và đóng mọi panel khi đăng xuất. |
| `SHOW_NOTIFICATION` | Content Scripts | Background | Yêu cầu hiển thị Chrome notification cơ bản (`title`, `message`). |
| `downloadAudio` | AudioDownloader | Background | Đưa yêu cầu fetch và tải file TTS audio vào queue. |
| `downloadAudioZip` | AudioDownloader | Background | Yêu cầu nén danh sách message audio thành file ZIP. |
| `PARALLEL_START` | ScenarioRunner | Background | Khởi tạo phiên chạy song song (`sessionId`, `tasks`, `baseUrl`, `maxConcurrent`). |
| `PARALLEL_EXEC_TASK` | Background | ParallelWorker | Gửi tác vụ cụ thể cho một tab con mới mở thực thi. |
| `PARALLEL_TASK_FIRST_PROMPT_SENT` | ParallelWorker | Background | Báo tab con đã gửi xong prompt đầu tiên để background mở tab kế tiếp. |
| `PARALLEL_ACTIVE_TAB` | ParallelWorker | Background | Yêu cầu background tạm thời đưa tab con lên active để ép trình duyệt render DOM. |
| `PARALLEL_DOWNLOAD_ZIP` | ScenarioRunner | Background | Đọc các task hoàn thành trong session và tải file ZIP gộp kết quả. |
| `PARALLEL_RESUME` | ScenarioRunner | Background | Yêu cầu khôi phục và chạy tiếp các task bị gián đoạn của session cũ. |
| `PARALLEL_CLEANUP_SESSION` | ScenarioRunner | Background | Xóa dữ liệu session trong RAM và chrome storage. |
| `SPLIT_TABS_START` | ScenarioRunner | Background | Khởi tạo phiên chia đều items cho N tabs (`sessionId`, `tasks`, `autoSwitchTabs`). |
| `SPLIT_TABS_EXEC_TASK` | Background | ParallelWorker | Gửi danh sách items cho tab worker xử lý tuần tự kèm mini panel. |
| `SPLIT_TABS_ACTIVATE_TAB` | ParallelWorker | Background | Đánh thức tab worker active trước khi gửi prompt để tránh throttling. |
| `SPLIT_TABS_TOGGLE_AUTO_SWITCH` | ScenarioRunner | Background | Bật hoặc tắt tính năng xoay vòng tab chống ngủ đông khi đang chạy. |
| `SPLIT_TABS_STOP` | ScenarioRunner | Background | Hủy bỏ phiên chia tab và đóng toàn bộ các tab con đang chạy. |
| `SPLIT_TABS_CLEANUP_SESSION` | ScenarioRunner | Background | Xóa sạch metadata và toàn bộ per-task keys của phiên chia tab. |

---

## 12. Đặc Tả Lưu Trữ Dữ Liệu (Storage Schema)

> 📖 **Xem tài liệu đặc tả chi tiết toàn bộ cơ sở dữ liệu tại:**  
> 👉 [database_spec.md](file:///d:/2.projects/fl/content-helper/docs/database_spec.md)

Hệ thống kết hợp mô hình lưu trữ lai giữa **Local Runtime Storage** (`chrome.storage.local`) và **Cloud Persistence** (Firebase Firestore).

### Tóm tắt các nhóm dữ liệu chính:
1. **Xác thực & Người dùng:** `gg_access_token`, `google_user_email`, `google_user_name`, `google_user_avatar`.
2. **Kịch bản & Luồng liên hoàn:** `scenarioTemplates`, `flowConfigs`.
3. **Cấu hình Studio:** `google_ai_studio_profiles`, `youtube_language_profiles`, `youtube_translation_data`.
4. **Cấu hình hiển thị nút:** `button_configs` (phân chia theo từng trang chat AI).
5. **Phiên thực thi đa tab:**
   - Phiên song song: `parallel_session_{sessionId}`.
   - Phiên chia tab v2 (Per-Task Isolated Keys): `split_tabs_meta_{sessionId}` và `split_task_{taskId}`.
6. **Bộ nhớ trạng thái Panel UI:** `panelState__TextSplitter`, `panelState__AudioDownloader`, `panelState__FlowRunner`.
7. **Dữ liệu hội thoại & WebRequest:** `requestHeaders`, `authorization`, `conversationId`, `responseData`.
8. **Cloud Collections (Firestore):** `configs`, `flow_configs`, `speech_profiles`, `youtube_language_profiles`, `button_configs` (được lập chỉ mục theo Document ID là email người dùng).

Chi tiết cấu trúc schema JSON, giải thích các trường dữ liệu và cơ chế xử lý tranh chấp (Zero Race Condition) được mô tả đầy đủ trong [database_spec.md](file:///d:/2.projects/fl/content-helper/docs/database_spec.md).

---

## 13. Hệ Thống Giao Diện & Quy Chuẩn Styling (CSS Architecture)

### 13.1. Chiến Lược Hai Tầng CSS (Dual-Tier Styling Strategy)
1. **Tầng Tailwind Runtime (`tailwind.min.js`):** Được nạp trực tiếp vào content script. Áp dụng cho các trang web AI hiện đại (ChatGPT, DeepSeek, Qwen, Grok, Gemini, AI Studio) để xây dựng giao diện nhanh chóng, thẩm mỹ cao.
2. **Tầng Scoped Utilities (`ts-*` namespace trong `content-helper.css`):**
   - Trên YouTube Studio (`studio.youtube.com`), do kiến trúc Polymer/Web Components và CSS gốc của YouTube xung đột mạnh với Tailwind CSS, toàn bộ giao diện YouTube Studio Panel được viết bằng các class có tiền tố `ts-` (ví dụ: `ts-flex`, `ts-bg-gray-50`, `ts-text-indigo-600`, `ts-panel`).
   - Mọi thuộc tính trong `content-helper.css` đều được khai báo kèm `!important` để đảm bảo không bị CSS của trang chủ đè bẹp.

### 13.2. Thành Phần Giao Diện Đặc Trưng (Special UI Components)
- **Base Panel Container (`.ts-panel`):**
  - Cưỡng chế `position: fixed !important; z-index: 2147483647 !important;` (giá trị Int32 tối đa để luôn nổi lên trên cùng trang web).
  - Khung bo tròn viền xám mờ hiện đại, đổ bóng đa tầng (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)`).
- **AI Gradient Rotating Border (`.ai-gradient-border`):**
  - Sử dụng pseudo-element `::before` kết hợp hàm `conic-gradient` xoay tròn 360 độ liên tục, tạo hiệu ứng viền phát sáng đa sắc đặc trưng của trí tuệ nhân tạo hiện đại.
- **Floating Messenger Bubbles (`.panel-bubble`):**
  - Khi thu nhỏ panel, panel biến thành một bong bóng tròn nổi ở góc dưới bên phải màn hình (kích thước 48x48px).
  - Tự động xếp chồng lên nhau theo trục dọc (`bottom: calc(120px + index * 70px)`).
  - Tích hợp Badge thông báo trạng thái với hiệu ứng gợn sóng (Ripple pulse) khi đang thực thi tác vụ.
- **Custom Scrollbar (`.custom-scrollbar`):**
  - Chiều rộng siêu mảnh 5px, nền trong suốt, thumb màu xám nhạt bo tròn, không chiếm diện tích hiển thị nội dung.
- **Toggle Switch iOS Style (`.ts-switch`):**
  - Thiết kế công tắc trượt bo tròn chuẩn iOS, hiệu ứng chuyển màu xanh ngọc khi bật.

---

## 14. Quy Tắc Phát Triển & Mở Rộng Hệ Thống (Development Guide)

### 14.1. Coding Standards & Nguyên Tắc Bắt Buộc
- **Ngôn ngữ:** JavaScript thuần (ES6+), không sử dụng TypeScript, không sử dụng công cụ biên dịch (Babel/Webpack/Vite).
- **Mô hình lập trình:** Lập trình hướng đối tượng (OOP Class-based). Mỗi lớp được định nghĩa trong một file riêng và gán vào `window.ClassName`.
- **Nguyên tắc SOLID:**
  - *Single Responsibility:* Mỗi panel chỉ chịu trách nhiệm cho một tác vụ duy nhất.
  - *Open/Closed:* Khi bổ sung trang AI mới, chỉ cần tạo thêm class kế thừa `BaseChatAdapter` mà không sửa đổi logic lõi của các Panel hay Runner.
- **Thứ tự tải file trong `manifest.json`:**
  Thứ tự khai báo trong mảng `content_scripts.js` mang tính sống còn vì JavaScript chạy trực tiếp trên global scope:
  ```
  1. libs (tailwind, jszip, compromise, firebase)
  2. Các Panel độc lập (SRTAutomation, GoogleAIStudio, YoutubeStudio)
  3. content-helper.js (Khai báo class ContentHelper và các method dùng chung)
  4. Lớp hỗ trợ dữ liệu (firestore-helper, PanelState, ResponseWaiter, Sequencers)
  5. ParallelWorker.js
  6. Các Panel nghiệp vụ (ScenarioBuilder, ScenarioRunner, FlowRunner, TextSplitter, AudioDownloader, ContentCopy)
  7. ChatAdapter.js (PHẢI NẰM CUỐI CÙNG vì khi khởi tạo adapter nó sẽ gọi nút bấm của các Panel phía trước)
  ```

### 14.2. Hướng Dẫn Thêm Một Nền Tảng AI Mới (New Adapter Checklist)
Để tích hợp thêm một website AI bất kỳ (ví dụ: `claude.ai` hoặc `mistral.ai`), thực hiện đúng 6 bước:
1. Mở file `content/ChatAdapter.js`.
2. Tạo lớp mới kế thừa `BaseChatAdapter`:
   ```javascript
   class ClaudeAdapter extends BaseChatAdapter {
     static matches(host) { return /claude\.ai$/i.test(host); }
     getTextarea() { return this._q('div[contenteditable="true"]'); }
     getSendBtn() { return this._q('button[aria-label="Send message"]'); }
     getStopBtn() { return this._q('button[aria-label="Stop response"]'); }
     isDone() { return !this.getStopBtn() && !!this.getSendBtn(); }
     getContentElements() { return Array.from(document.querySelectorAll('.font-claude-message')); }
     getButtonConfigs() {
       return [
         BUTTONS.MANAGE_SCENARIO,
         BUTTONS.RUN_SCENARIO,
         BUTTONS.RUN_FLOW,
         BUTTONS.COPY_CONTENT
       ];
     }
   }
   ```
3. Thêm lớp vừa tạo vào mảng `ADAPTER_CTORS`:
   ```javascript
   const ADAPTER_CTORS = [
     ChatGPTAdapter,
     DeepSeekAdapter,
     ...,
     ClaudeAdapter
   ];
   ```
4. Đăng ký nền tảng mới trong `options/modules/ButtonConfigModule.js`:
   ```javascript
   this.platforms.push({ id: 'claude', name: 'Claude AI' });
   ```
5. Cập nhật `manifest.json`: Thêm domain vào `host_permissions` và `content_scripts[0].matches` (ví dụ: `"https://claude.ai/*"`).
6. Tải lại extension trên Chrome (`chrome://extensions`) và kiểm tra hoạt động.

### 14.3. Hướng Dẫn Thêm Một Panel Tiện Ích Mới (New Panel Checklist)
1. Tạo file mới `content/MyNewPanel.js`.
2. Định nghĩa class có hàm dựng và các phương thức chuẩn:
   ```javascript
   window.MyNewPanel = class {
     constructor(onClose) {
       this.onClose = onClose;
       this._render();
     }
     _render() {
       this.el = document.createElement("div");
       this.el.id = "my-new-panel";
       this.el.className = "panel-box ts-panel w-[400px] p-4 rounded-xl shadow-2xl bg-white border border-gray-100 flex flex-col relative animate-in";
       this.el.innerHTML = `...`;
       ContentHelper.mountPanel(this.el);
       ContentHelper.makeDraggable(this.el, ".ts-title");
       ContentHelper.addCloseButton(this.el, () => this.destroy());
     }
     destroy() {
       this.el.remove();
       if (this.onClose) this.onClose();
     }
   };
   ```
3. Trong `content/content-helper.js`: Thêm thuộc tính `this.myNewPanel = null` và hàm `_toggleMyNewPanel()`.
4. Trong `content/ChatAdapter.js`: Đăng ký nút bấm trong object `BUTTONS` và thêm vào `getButtonConfigs()` của adapter mong muốn.
5. Thêm file `content/MyNewPanel.js` vào `manifest.json` trước `content-helper.js`.

---

## 15. Kết Luận

Bản đặc tả kỹ thuật này phản ánh toàn diện và chính xác 100% cấu trúc mã nguồn hiện tại của dự án **Content Helper**. Với kiến trúc module hóa hướng đối tượng, cơ chế điều phối đa tab không gây nghẽn và hệ thống lưu trữ đồng bộ mây mạnh mẽ, dự án có độ tin cậy cao, dễ bảo trì và sẵn sàng mở rộng thêm nhiều nền tảng AI mới trong tương lai.
