# Content Helper – Mô tả Kỹ thuật & Quy tắc Phát triển

## 1. Tổng quan

**Content Helper** là Chrome Extension (Manifest V3) hỗ trợ workflow tạo nội dung trên nhiều nền tảng AI chat. Extension inject các công cụ tự động hóa trực tiếp vào giao diện của các trang web AI.

- **Manifest Version**: 3
- **Tên**: Content Helper - AI Workflow Assistant
- **Version**: 1.0.1
- **Ngôn ngữ**: JavaScript thuần (Vanilla JS), OOP-based
- **UI Framework**: TailwindCSS (inject runtime via `tailwind.min.js`)
- **Backend**: Firebase Firestore (sync config qua cloud)
- **Auth**: Google OAuth2 (via `chrome.identity`)

---

## 2. Kiến trúc Tổng thể

```
content-helper/
├── manifest.json              # Cấu hình extension
├── background/
│   └── background.js          # Service Worker – xử lý download audio, bắt headers, notifications
├── content/                   # Content Scripts – inject vào các trang AI
│   ├── ChatAdapter.js         # Adapter Pattern – abstract interface cho mỗi trang AI
│   ├── content-helper.js      # Root class (ContentHelper) – quản lý lifecycle toàn bộ panels
│   ├── firestore-helper.js    # Wrapper Firebase Firestore CRUD
│   ├── PanelState.js          # Utility lưu/restore trạng thái panel qua chrome.storage
│   ├── PromptSequencer.js     # Engine gửi prompt tuần tự (send → wait → next)
│   ├── FlowSequencer.js       # Engine thực thi flow liên hoàn (retry/skip logic)
│   ├── ScenarioBuilder.js     # UI tạo/sửa/xóa scenario templates (JSON)
│   ├── ScenarioRunner.js      # UI chạy scenario – hàng đợi, biến, vòng lặp
│   ├── FlowRunnerPanel.js     # UI thực thi flow trên trang chat AI
│   ├── TextSplitter.js        # Cắt văn bản dài thành chunks, gửi tuần tự
│   ├── AudioDownloader.js     # Download TTS audio từ ChatGPT API
│   ├── ContentCopyPanel.js    # Copy/download nội dung trả lời (TXT/ZIP)
│   ├── GoogleAIStudioPanel.js # Cấu hình tự động voice/speaker cho AI Studio Speech
│   ├── SRTAutomationPanel.js  # Quét và xuất file SRT phụ đề từ AI Studio
│   ├── YoutubeStudioPanel.js  # Tự động thêm ngôn ngữ + điền metadata trên YouTube Studio
│   └── content-helper.css     # Style toàn bộ panels (AI Gradient Border, scoped CSS)
├── popup/
│   ├── popup.html             # Giao diện popup – login/logout Google
│   └── popup.js               # Logic OAuth2, sync data khi login
├── options/                   # Trang Options – quản lý cấu hình
│   ├── options.html           # Layout chính của trang Options
│   ├── options.js             # Router điều khiển các module
│   └── modules/
│       ├── ScenarioModule.js  # Quản lý Scenario Templates
│       └── FlowModule.js      # Quản lý Flow (Kịch bản liên hoàn)
├── libs/                      # Thư viện bên thứ 3 (bundled)
│   ├── tailwind.min.js        # Tailwind CSS runtime
│   ├── jszip.min.js           # Nén file ZIP
│   ├── compromise.min.js      # NLP sentence splitting
│   ├── firebase-app-compat.js
│   └── firebase-firestore-compat.js
└── assets/
    └── icon.png               # Icon extension
```

---

## 3. Các Trang Web Được Hỗ Trợ

| Trang | Adapter Class | Tính năng đặc thù |
|-------|--------------|-------------------|
| `chatgpt.com` | `ChatGPTAdapter` | Scenario, Flow Runner, Text Split, Audio Download, Content Copy |
| `chat.deepseek.com` | `DeepSeekAdapter` | Scenario, Flow Runner, Content Copy |
| `chat.qwen.ai` | `QwenAdapter` | Scenario, Flow Runner, Content Copy |
| `grok.com` | `GrokAdapter` | Scenario, Flow Runner, Content Copy |
| `aistudio.google.com` | `GoogleAIStudioAdapter` | Scenario, Flow Runner, SRT Automation, AI Studio Settings, Collapse Code, YT Studio |
| `studio.youtube.com` | `YoutubeStudioAdapter` | Thêm ngôn ngữ tự động, điền metadata |
| `gemini.google.com` | `GeminiAdapter` | Scenario, Flow Runner, Content Copy, YT Studio |

---

## 4. Design Patterns & Kiến trúc Code

### 4.1. Adapter Pattern (`ChatAdapter.js`)

**Mục đích**: Trừu tượng hóa sự khác biệt DOM giữa các trang AI chat.

```
BaseChatAdapter (abstract)
├── getTextarea()        # Trả về element nhập prompt
├── getSendBtn()         # Trả về nút gửi
├── getStopBtn()         # Trả về nút dừng generate
├── isDone()             # Kiểm tra AI đã trả lời xong chưa
├── getForm()            # Container chính của input area
├── getContentElements() # Danh sách elements chứa câu trả lời
├── sendMessage(text)    # Gửi tin nhắn
├── getButtonConfigs()   # Danh sách button cần hiển thị
├── isCompactMode()      # True = nút nằm trong dropdown menu
├── insertHelperButtons()# Chèn các nút vào giao diện
└── _createButton()      # Helper tạo button
```

**Adapter Factory** (cuối file):
- Mảng `ADAPTER_CTORS` chứa tất cả adapter constructors
- Tự động khởi tạo adapter phù hợp dựa trên `window.location.hostname`
- Gán vào `window.ChatAdapter`

**Quy tắc khi thêm adapter mới**:
1. Kế thừa `BaseChatAdapter`
2. Implement `static matches(host)` → regex match hostname
3. Implement các method bắt buộc: `getTextarea()`, `getSendBtn()`, `isDone()`
4. Override `getButtonConfigs()` nếu cần thêm/bớt nút
5. Override `isCompactMode()` → `true` nếu không gian hạn chế
6. Thêm class vào mảng `ADAPTER_CTORS`
7. Thêm URL pattern vào `manifest.json` → `host_permissions` + `content_scripts.matches`

### 4.2. Panel System (`ContentHelper` + các Panel class)

**Lifecycle Pattern**:
```
constructor(onClose) → _render() → [user interaction] → destroy()
```

**Mỗi panel class tuân thủ**:
- `constructor(onClose)`: nhận callback khi đóng
- `_render()`: tạo DOM element, gán vào `this.el`
- `destroy()`: xóa DOM, gọi `onClose()`
- Sử dụng `ContentHelper.mountPanel(el)` để đưa panel vào bar
- Sử dụng `ContentHelper.makeDraggable(el, handleSelector)` cho drag
- Sử dụng `ContentHelper.addCloseButton(el, onClose)` cho nút đóng
- `_isBusy()` (optional): trả về `true` khi đang xử lý → hiện confirm khi đóng

**Toggle Pattern** (trong `ContentHelper`):
```javascript
_toggleXxx() {
  if (this.xxx) {
    this.xxx.destroy();
    this.xxx = null;
    return;
  }
  this.xxx = new XxxPanel(() => (this.xxx = null));
}
```

### 4.3. PromptSequencer – Engine gửi prompt

```
new PromptSequencer(prompts, sendFn, waitFn, onStepCallback, scenarioName)
  .start(onDone)
  .pause()
  .resume()
  .stop()
```

- Được tái sử dụng bởi cả `ScenarioRunner` và `TextSplitter`

### 4.4. FlowSequencer – Engine thực thi flow liên hoàn

**Kế thừa tư duy từ PromptSequencer nhưng bổ sung cơ chế điều khiển nâng cao**:
- `start(onDone)`: Bắt đầu chạy từ bước được chỉ định
- `retry()`: Thực thi lại bước vừa lỗi
- `skip()`: Bỏ qua bước lỗi và tiếp tục
- `pause()/resume()`: Tạm dừng và tiếp tục
- `stopped`: Flag kiểm soát trạng thái dừng hoàn toàn

**Workflow**: 
1. `FlowRunnerPanel` phân rã Flow thành danh sách các prompt đơn lẻ (đã điền biến).
2. `FlowSequencer` quản lý việc gửi từng prompt qua `ChatAdapter`.
3. Nếu gặp lỗi hoặc timeout, sequencer dừng lại và chờ lệnh từ user (Retry/Skip).

### 4.4. State Persistence (`PanelState`)

```javascript
PanelState.save(key, data)  // Lưu vào chrome.storage.local
PanelState.load(key, cb)    // Đọc từ chrome.storage.local
PanelState.clear(key)       // Xóa
```

- Key format: `panelState__<PanelName>`
- Dùng cho: TextSplitter (khôi phục chunks/progress), AudioDownloader (voice, downloaded list)

---

## 5. Hệ thống Lưu trữ (chrome.storage.local)

| Key | Mô tả | Nguồn ghi |
|-----|--------|-----------|
| `gg_access_token` | Google OAuth token | popup.js |
| `google_user_email` | Email user (cũng là userId cho Firestore) | popup.js |
| `google_user_name`, `google_user_avatar` | Thông tin user | popup.js |
| `scenarioTemplates` | Object chứa tất cả scenario templates | ScenarioBuilder / ScenarioModule |
| `scenarioInputValues` | Giá trị biến đã nhập cho mỗi scenario | ScenarioRunner |
| `flowConfigs` | Danh sách Flow và cấu hình các bước | FlowModule |
| `google_ai_studio_profiles` | Profiles cấu hình AI Studio Speech | GoogleAIStudioPanel |
| `youtube_language_profiles` | Profiles ngôn ngữ YouTube | YoutubeStudioPanel |
| `youtube_translation_data` | Dữ liệu dịch (title/desc) từ JSON upload | YoutubeStudioPanel |
| `responseData` | Dữ liệu conversation ChatGPT (mapping messages) | background.js |
| `conversationId` | ID conversation hiện tại trên ChatGPT | background.js |
| `requestHeaders` | Headers của request gốc (dùng cho audio API) | background.js |
| `authorization` | Authorization header ChatGPT | background.js |
| `panelState__TextSplitter` | State panel TextSplitter | PanelState |
| `panelState__AudioDownloader` | State panel AudioDownloader | PanelState |
| `panelState__FlowRunner` | State panel FlowRunner | PanelState |

---

## 6. Firebase Firestore

### Collections

| Collection | Mô tả | Document ID |
|-----------|--------|-------------|
| `configs` | Scenario templates | `google_user_email` |
| `speech_profiles` | AI Studio voice profiles | `google_user_email` |
| `youtube_language_profiles` | YouTube language profiles | `google_user_email` |
| `flow_configs` | Chứa danh sách Flow liên hoàn | `google_user_email` |

### Sync Flow
```
User thay đổi → Lưu chrome.storage.local → Sync lên Firestore
Login → Download từ Firestore → Cập nhật chrome.storage.local
```

### FirestoreHelper API
```javascript
const helper = new FirestoreHelper(firebaseConfig);
helper.collection = 'configs';  // Đổi collection trước khi gọi
await helper.saveUserConfig(userId, data);
const data = await helper.loadUserConfig(userId);
```

---

## 7. Background Service Worker

### Chức năng chính:

1. **Bắt Headers** (`webRequest.onBeforeSendHeaders`): Lưu request headers của ChatGPT conversation API → dùng cho audio download.

2. **Fetch Conversation Data** (`webRequest.onCompleted`): Khi user mở conversation trên ChatGPT, tự động fetch lại data và lưu vào storage.

3. **Download Audio** (message listener `downloadAudio`): Fetch TTS audio từ ChatGPT synthesize API, retry tối đa 10 lần với exponential backoff. Sử dụng download queue xử lý tuần tự.

4. **Download Audio ZIP** (message listener `downloadAudioZip`): Fetch nhiều audio → đóng gói JSZip → download file zip.

5. **Show Notification** (message listener `SHOW_NOTIFICATION`): Hiển thị Chrome notification (dùng khi scenario hoàn thành).

---

## 8. Scenario System

### Template Format
```json
{
  "Tên scenario": {
    "group": "podcast",
    "questions": [
      { "text": "Prompt text ${variable|option1,option2}", "type": "text" },
      { "text": "Generate ${count} items", "type": "loop", "loopKey": "count" },
      { "text": "Translate to ${lang}", "type": "list", "loopKey": "lang" },
      { "text": "Summarize ${content}", "type": "variable" }
    ]
  }
}
```

### Question Types
| Type | Mô tả |
|------|--------|
| `text` | Gửi nguyên văn, không thay thế biến |
| `variable` | Thay thế `${key}` bằng giá trị user nhập |
| `loop` | Lặp N lần, `${loopKey}` = 1, 2, 3... |
| `list` | Lặp qua danh sách giá trị phân cách bằng dấu phẩy |

- `${topic|AI,Tech,Science}` → dropdown chọn giá trị

### 8.5. Flow System (Kịch bản liên hoàn)

Flow là tập hợp các Scenario chạy nối tiếp nhau, cho phép ghi đè (override) các giá trị mặc định của từng bước.

**Cấu trúc dữ liệu Flow**:
```json
{
  "Tên Flow": {
    "steps": [
      { 
        "scenarioName": "Scenario 1",
        "defaultValues": { "var1": "value1", "var2": "value2" }
      },
      { 
        "scenarioName": "Scenario 2",
        "defaultValues": { "topic": "Tech" }
      }
    ]
  }
}
```

**Tính năng đặc thù**:
- Reordering: Kéo thả thay đổi thứ tự bước (Drag & Drop API).
- Override: Cho phép chỉnh sửa biến của mọi bước trước khi chạy Flow.
- Resume from Step N: Chọn bước bắt đầu thực thi.

---

## 9. Styling System

### Chiến lược CSS:

1. **Tailwind Runtime** (`tailwind.min.js`): Inject vào content scripts, dùng cho ChatGPT/DeepSeek/Qwen/Grok.

2. **Scoped CSS utilities** (`ts-*` prefix): Cho các trang có CSS xung đột (YouTube Studio). Được define trong `content-helper.css`. Ví dụ: `ts-flex`, `ts-bg-gray-50`, `ts-text-indigo-600`.

3. **`.ts-panel`**: Base class cho mọi panel. Cưỡng chế `position: fixed`, `z-index: 2147483647`, `width: 420px`, reset font/color.

4. **`.helper-panel`**: Class dùng để quản lý panel trong bar. `pointer-events: auto` để nhận click.

5. **`.panel-close`**: Nút đóng đỏ (×) góc trên phải, có hiệu ứng xoay khi hover.

6. **Custom scrollbar**: `.custom-scrollbar` – scrollbar mỏng 5px, trong suốt.

7. **Custom dropdown**: `.custom-dropdown-*` – dropdown tự build thay cho native select.

8. **Toggle switch**: `.ts-switch` – iOS-style toggle checkbox.

9. **AI Gradient Border**: `.ai-gradient-border` – Hiệu ứng viền xoay đa sắc bằng `conic-gradient` và pseudo-elements (`::before`/`::after`). Hỗ trợ auto-dark/light mode.

10. **Floating Bubble**: Chế độ Compact Mode biến Tools panel thành một bong bóng nổi có thể kéo thả tự do trên màn hình.

### Quy tắc khi viết CSS cho panel:
- **LUÔN** dùng `!important` cho mọi property (vì inject vào trang khác, CSS host có thể override)
- Trên YouTube Studio, **KHÔNG** dùng Tailwind class trực tiếp → dùng `ts-*` prefix
- Trên ChatGPT/DeepSeek/Qwen/Grok → dùng Tailwind class bình thường

---

## 10. Quy tắc Phát triển

### 10.1. Coding Standards

- **Ngôn ngữ**: JavaScript thuần (ES6+), không dùng TypeScript/build tool
- **Style**: OOP Class-based, mỗi class là 1 file
- **Naming**: PascalCase cho class, camelCase cho method/variable
- **Global namespace**: Mỗi class gán vào `window.ClassName` (vì không có module bundler)
- **Comment**: Tiếng Việt cho logic business, tiếng Anh cho technical terms
- **Logging**: Dùng emoji prefix (`🚀`, `✅`, `❌`, `⚠️`, `📦`, `✂️`, `🎵`)

### 10.2. Thêm Panel mới

1. Tạo file `content/NewPanel.js`
2. Class phải có: `constructor(onClose)`, `_render()`, `destroy()`
3. Trong `_render()`:
   - Tạo `this.el` = div container
   - Gọi `ContentHelper.mountPanel(this.el)`
   - Gọi `ContentHelper.makeDraggable(this.el, ".ts-title")`
   - Gọi `ContentHelper.addCloseButton(this.el, () => this.destroy())`
4. Thêm `_toggleNewPanel()` vào class `ContentHelper`
5. Thêm button config vào `BUTTONS` trong `ChatAdapter.js`
6. Thêm button vào `getButtonConfigs()` của adapter tương ứng
7. Thêm file vào `manifest.json` → `content_scripts.js` (đúng thứ tự dependency)
8. Nếu panel có trạng thái bận: implement `_isBusy()` trả về boolean

### 10.3. Thêm Adapter mới

1. Tạo class kế thừa `BaseChatAdapter` trong `ChatAdapter.js`
2. Implement `static matches(host)` → regex hostname
3. Implement ít nhất: `getTextarea()`, `getSendBtn()`, `isDone()`, `getForm()`
4. Thêm vào `ADAPTER_CTORS`
5. Cập nhật `manifest.json`:
   - `host_permissions` += URL pattern
   - `content_scripts[0].matches` += URL pattern

### 10.4. Quản lý Dependencies

- **KHÔNG** dùng npm/package manager – thư viện bundle thủ công vào `/libs`
- File load order trong manifest quan trọng:
  ```
  libs → [Panel files] → content-helper.js → ChatAdapter.js
  ```
  - `ChatAdapter.js` phải load **SAU CÙNG** trong danh sách content scripts (vì nó khởi tạo adapter và gọi `insertHelperButtons` cần các class khác đã ready)
  - `content-helper.js` cần load sau tất cả Panel class (vì nó `new` các panel)
  - `firestore-helper.js` cần load trước các panel dùng Firestore

### 10.5. Giao tiếp giữa các thành phần

| Từ | Đến | Cơ chế |
|----|-----|--------|
| Popup → Content Script | `chrome.tabs.sendMessage()` | Message: `show_buttons`, `hide_buttons` |
| Content Script → Background | `chrome.runtime.sendMessage()` | Message: `downloadAudio`, `downloadAudioZip`, `SHOW_NOTIFICATION` |
| Background → Storage | `chrome.storage.local.set()` | Lưu headers, conversation data |
| Content Script → Storage | `chrome.storage.local.get/set()` | Đọc/ghi config, state |
| Panel → Panel | `window.__helperInjected._toggleXxx()` | Qua global reference |

### 10.6. Lưu ý Kỹ thuật Quan trọng

- **Service Worker keep-alive**: Background dùng `setInterval(chrome.runtime.getPlatformInfo, 25000)` để giữ worker sống khi download audio dài.
- **DOM selector fragile**: Các adapter phụ thuộc vào DOM selector của trang host → có thể break khi trang update UI. Cần test thường xuyên.
- **Tailwind runtime conflict**: Trên YouTube Studio, Tailwind runtime xung đột với CSS gốc → phải dùng `ts-*` scoped CSS thay thế.
- **Multiple `onMessage` listeners**: Background có nhiều `chrome.runtime.onMessage.addListener` riêng biệt cho từng action → cần `return true` để giữ channel cho async response.
- **z-index war**: Extension dùng `z-index: 2147483647` (max int32) cho panel, vẫn có thể bị trang host override → đã xử lý bằng `!important`.

---

## 11. Permissions

| Permission | Mục đích |
|-----------|----------|
| `identity` | Google OAuth login |
| `storage` | Lưu config, state, user data |
| `activeTab` | Truy cập tab hiện tại |
| `scripting` | Inject scripts |
| `webRequest` | Bắt headers ChatGPT API |
| `downloads` | Download audio files |
| `notifications` | Thông báo khi scenario hoàn thành |

---

## 12. Popup System

- **popup.html**: UI login/logout đơn giản, dùng Tailwind
- **popup.js**: 
  - Login: `chrome.identity.launchWebAuthFlow()` → lấy access token → fetch user info → lưu storage → gửi `show_buttons` đến tất cả tabs matching
  - Logout: clear storage → gửi `hide_buttons`
  - Auto-check: khi popup mở, check token trong storage để hiển thị đúng UI

---

## 13. Tóm tắt Flow Hoạt động

```
1. User cài extension → mở popup → login Google
2. Popup lưu token → gửi "show_buttons" đến content scripts
3. Content script (content-helper.js) → tạo ContentHelper instance
4. ChatAdapter factory chọn đúng adapter cho trang hiện tại
5. MutationObserver detect chat UI → insertHelperButtons()
6. _downloadFromFirestore() → sync scenarios, speech profiles, YT profiles
7. User click nút → toggle panel tương ứng
8. Panel render UI → user tương tác → lưu data → sync Firestore
```
