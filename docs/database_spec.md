# Content Helper – Đặc Tả Cơ Sở Dữ Liệu & Lưu Trữ (Database & Storage Specification)

> **Dự án:** Content Helper - AI Workflow Assistant  
> **Phiên bản:** 1.0.1  
> **Cập nhật lần cuối:** 2026-09-08  
> **Tài liệu liên quan:** [technical_spec.md](file:///d:/2.projects/fl/content-helper/docs/technical_spec.md)

---

## MỤC LỤC
1. [Tổng Quan Kiến Trúc Lưu Trữ](#1-tổng-quan-kiến-trúc-lưu-trữ)
2. [Cơ Chế Phân Tầng Lưu Trữ (Storage Architecture Layers)](#2-cơ-chế-phân-tầng-lưu-trữ-storage-architecture-layers)
3. [Đặc Tả Schema Cục Bộ (chrome.storage.local)](#3-đặc-tả-schema-cục-bộ-chromestoragelocal)
   - [3.1. Nhóm Xác Thực & Người Dùng (Authentication & Profile)](#31-nhóm-xác-thực--người-dùng-authentication--profile)
   - [3.2. Nhóm Kịch Bản & Luồng Liên Hoàn (Scenarios & Flows)](#32-nhóm-kịch-bản--luồng-liên-hoàn-scenarios--flows)
   - [3.3. Nhóm Cấu Hình Studio (AI Studio Speech & YouTube Studio)](#33-nhóm-cấu-hình-studio-ai-studio-speech--youtube-studio)
   - [3.4. Nhóm Cấu Hình Giao Diện Nền Tảng (Button Configs)](#34-nhóm-cấu-hình-giao-diện-nền-tảng-button-configs)
   - [3.5. Nhóm Điều Phối Đa Tab (Parallel Sessions & Split Tabs)](#35-nhóm-điều-phối-đa-tab-parallel-sessions--split-tabs)
   - [3.6. Nhóm Trạng Thái Panel (Panel Persistence States)](#36-nhóm-trạng-thái-panel-panel-persistence-states)
   - [3.7. Nhóm Dữ Liệu WebRequest (ChatGPT Interceptor Data)](#37-nhóm-dữ-liệu-webrequest-chatgpt-interceptor-data)
4. [Đặc Tả Cloud Schema (Firebase Firestore Collections)](#4-đặc-tả-cloud-schema-firebase-firestore-collections)
   - [4.1. Collection `configs` (Scenario Templates)](#41-collection-configs-scenario-templates)
   - [4.2. Collection `flow_configs` (Chained Flows)](#42-collection-flow_configs-chained-flows)
   - [4.3. Collection `speech_profiles` (AI Studio Speech)](#43-collection-speech_profiles-ai-studio-speech)
   - [4.4. Collection `youtube_language_profiles` (YouTube Subtitles)](#44-collection-youtube_language_profiles-youtube-subtitles)
   - [4.5. Collection `button_configs` (Platform Buttons)](#45-collection-button_configs-platform-buttons)
5. [Cơ Chế Đồng Bộ & Xử Lý Xung Đột (Sync & Conflict Resolution)](#5-cơ-chế-đồng-bộ--xử-lý-xung-đột-sync--conflict-resolution)

---

## 1. Tổng Quan Kiến Trúc Lưu Trữ

Hệ thống **Content Helper** kết hợp mô hình lưu trữ lai (**Hybrid Storage Architecture**):
- **Cục bộ (Local Persistence):** Sử dụng `chrome.storage.local` làm tầng lưu trữ thời gian thực (Primary Run-time Storage), cung cấp tốc độ đọc/ghi tức thì, không bị giới hạn quota nghiêm ngặt như `sync` storage và hỗ trợ dung lượng lớn (không giới hạn với permission `storage`).
- **Đám mây (Cloud Sync):** Sử dụng **Google Firebase Firestore** để đồng bộ cấu hình người dùng qua nhiều thiết bị dựa trên định danh tài khoản Google (`google_user_email`).

---

## 2. Cơ Chế Phân Tầng Lưu Trữ (Storage Architecture Layers)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION RUNTIME                           │
│     (Popup, Options SPA, Content Scripts Panels, Parallel Workers)      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Read / Write (I/O)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     TẦNG 1: LOCAL RUNTIME STORAGE                       │
│                        (chrome.storage.local)                           │
├─────────────────────────┬────────────────────────┬──────────────────────┤
│  Session & Workers      │  Configs & Templates   │  Panel UI States     │
│  - parallel_session_*   │  - scenarioTemplates   │  - panelState__*     │
│  - split_task_*         │  - flowConfigs         │  - requestHeaders    │
│  - split_tabs_meta_*    │  - speech_profiles     │  - responseData      │
└─────────────────────────┴───────────┬────────────┴──────────────────────┘
                                      │
                         Auto-Sync Bi-directional
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     TẦNG 2: CLOUD PERSISTENCE                           │
│                       (Firebase Firestore)                              │
│       Mỗi Document ID tương ứng với email tài khoản Google duy nhất     │
├───────────────────┬───────────────────┬─────────────────────────────────┤
│ configs           │ flow_configs      │ speech_profiles                 │
├───────────────────┴───────────────────┴─────────────────────────────────┤
│ youtube_language_profiles             │ button_configs                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Đặc Tả Schema Cục Bộ (chrome.storage.local)

### 3.1. Nhóm Xác Thực & Người Dùng (Authentication & Profile)

Lưu trữ thông tin phiên đăng nhập Google OAuth2 được quản lý bởi `popup.js`.

| Key | Kiểu Dữ Liệu | Mô Tả | Nguồn Tạo |
| :--- | :--- | :--- | :--- |
| `gg_access_token` | `string` | Google OAuth2 Access Token lấy từ `chrome.identity.launchWebAuthFlow`. | `popup.js` |
| `google_user_email` | `string` | Email tài khoản Google (khóa chính Document ID trên Firestore). | `popup.js` |
| `google_user_name` | `string` | Họ tên hiển thị của người dùng (từ Google UserInfo API). | `popup.js` |
| `google_user_avatar` | `string` | URL ảnh đại diện Google (Avatar URL). | `popup.js` |

```json
{
  "gg_access_token": "ya29.a0Ac...",
  "google_user_email": "user@example.com",
  "google_user_name": "Nguyen Van A",
  "google_user_avatar": "https://lh3.googleusercontent.com/a/..."
}
```

---

### 3.2. Nhóm Kịch Bản & Luồng Liên Hoàn (Scenarios & Flows)

#### Key: `scenarioTemplates`
Chứa tất cả các kịch bản mẫu tự động hóa prompt.
- **Kiểu:** `Object.<string, ScenarioObject>` (Key là tên kịch bản).
- **Cấu trúc ScenarioObject:**
  - `group` (`string`): Tên nhóm danh mục (ví dụ: `podcast`, `video`, `blog`, `code`).
  - `questions` (`Array<QuestionObject>`): Danh sách các câu hỏi trong kịch bản.
    - `text` (`string`): Nội dung prompt. Có thể chứa biến `${varName}` hoặc `${varName|opt1,opt2}`.
    - `type` (`string`): Loại câu hỏi (`text` \| `variable` \| `loop` \| `list`).
    - `loopKey` (`string`, tùy chọn): Tên biến lặp (dùng cho `loop` và `list`).

```json
{
  "scenarioTemplates": {
    "Dịch Phụ Đề Sang Nhiều Thứ Tiếng": {
      "group": "subtitles",
      "questions": [
        {
          "text": "Hãy dịch file SRT sau sang ${target_lang}:\n\n${srt_content}",
          "type": "list",
          "loopKey": "target_lang"
        }
      ]
    },
    "Viết Kịch Bản Podcast": {
      "group": "podcast",
      "questions": [
        {
          "text": "Bạn là chuyên gia podcast về ${topic|Công nghệ,Tài chính,Khoa học}. Hãy gợi ý 5 chủ đề hấp dẫn.",
          "type": "variable"
        },
        {
          "text": "Viết chi tiết tập ${ep_num} với thời lượng ${duration} phút.",
          "type": "loop",
          "loopKey": "ep_num"
        }
      ]
    }
  }
}
```

#### Key: `flowConfigs`
Chứa danh sách các chuỗi kịch bản liên hoàn (Flow).
- **Kiểu:** `Object.<string, FlowObject>` (Key là tên Flow).
- **Cấu trúc FlowObject:**
  - `steps` (`Array<StepObject>`): Chuỗi các bước được thực thi tuần tự.
    - `scenarioName` (`string`): Tên kịch bản tham chiếu từ `scenarioTemplates`.
    - `defaultValues` (`Object.<string, string>`): Giá trị biến mặc định cho bước này.

```json
{
  "flowConfigs": {
    "Sản Xuất Video Hoàn Chỉnh": {
      "steps": [
        {
          "scenarioName": "Nghiên Cứu Từ Khóa",
          "defaultValues": {
            "niche": "AI Automation"
          }
        },
        {
          "scenarioName": "Soạn Thảo Kịch Bản",
          "defaultValues": {
            "tone": "Chuyên nghiệp",
            "length": "8 phút"
          }
        },
        {
          "scenarioName": "Dịch Phụ Đề Sang Nhiều Thứ Tiếng",
          "defaultValues": {
            "target_lang": "English, Japanese, French"
          }
        }
      ]
    }
  }
}
```

---

### 3.3. Nhóm Cấu Hình Studio (AI Studio Speech & YouTube Studio)

#### Key: `google_ai_studio_profiles`
Quản lý các profile cấu hình giọng nói và tham số cho Google AI Studio Speech.
- `activeProfileName` (`string`): Tên profile đang được kích hoạt mặc định.
- `profiles` (`Object.<string, SpeechProfile>`):
  - `speaker1` (`string`): Tên nhân vật 1 (ví dụ: `Host`).
  - `speaker2` (`string`): Tên nhân vật 2 (ví dụ: `Guest`).
  - `voice1` (`string`): Tên giọng 1 (ví dụ: `Aoede`, `Puck`, `Fenrir`).
  - `voice2` (`string`): Tên giọng 2 (ví dụ: `Charon`, `Kore`).
  - `scene` (`string`): Mô tả bối cảnh đàm thoại (Scene instructions).
  - `style` (`string`): Phong cách và hướng dẫn âm điệu (Style instructions).
  - `autoSet` (`boolean`): Tự động click áp dụng cấu hình khi tải trang.
  - `autoPaste` (`boolean`): Tự động lấy văn bản từ clipboard dán vào khung đọc.

```json
{
  "google_ai_studio_profiles": {
    "activeProfileName": "Podcast_Chuan",
    "profiles": {
      "Podcast_Chuan": {
        "speaker1": "Nam Dẫn Chuyện",
        "speaker2": "Nữ Khách Mời",
        "voice1": "Charon",
        "voice2": "Aoede",
        "scene": "Studio phòng thu hiện đại, ấm áp, trò chuyện tự nhiên",
        "style": "Giọng đọc truyền cảm, tốc độ vừa phải, ngắt nghỉ đúng câu",
        "autoSet": true,
        "autoPaste": false
      }
    }
  }
}
```

#### Key: `youtube_language_profiles`
Quản lý cấu hình ngôn ngữ dịch video trên YouTube Studio.
- `activeProfileName` (`string`): Tên profile được chọn.
- `profiles` (`Object.<string, YoutubeProfile>`):
  - `languages` (`Array<string>`): Danh sách tên ngôn ngữ chuẩn của YouTube.
  - `isAloudChannel` (`boolean`): Kích hoạt quy trình tối ưu cho kênh Aloud.
  - `isAutofillEnabled` (`boolean`): Tự động điền metadata tiêu đề/mô tả từ JSON.

#### Key: `youtube_translation_data`
Lưu trữ đối tượng JSON dịch thuật nạp từ file bên ngoài để tự động điền metadata YouTube:
```json
{
  "youtube_translation_data": {
    "english": { "title": "Video Title EN", "description": "Video Description EN..." },
    "japanese": { "title": "Video Title JA", "description": "Video Description JA..." }
  }
}
```

---

### 3.4. Nhóm Cấu Hình Giao Diện Nền Tảng (Button Configs)

#### Key: `button_configs`
Lưu trữ trạng thái bật/tắt và danh sách nút công cụ hiển thị cho từng nền tảng:
- Format: `Object.<platformId, PlatformConfig>`
  - `platformId`: `chatgpt` \| `deepseek` \| `qwen` \| `grok` \| `aistudio` \| `ytstudio` \| `gemini`.
  - `enabled` (`boolean`): Bật hoặc tắt hoàn toàn Extension trên website này.
  - `compactMode` (`boolean`): Hiển thị dạng bong bóng nổi (`true`) hay thanh ngang (`false`).
  - `buttons` (`Array<string>`): Danh sách mã nút được phép hiển thị (`MANAGE_SCENARIO`, `RUN_SCENARIO`, `RUN_FLOW`, `COPY_CONTENT`, `SPLITTER`, `AUDIO`, `AI_STUDIO_SETTINGS`, `SRT_AUTOMATION`, `COLLAPSE_CODE`, `YT_STUDIO_SETTINGS`).

```json
{
  "button_configs": {
    "chatgpt": {
      "enabled": true,
      "compactMode": false,
      "buttons": ["MANAGE_SCENARIO", "RUN_SCENARIO", "RUN_FLOW", "COPY_CONTENT", "SPLITTER", "AUDIO"]
    },
    "gemini": {
      "enabled": true,
      "compactMode": true,
      "buttons": ["MANAGE_SCENARIO", "RUN_SCENARIO", "RUN_FLOW", "COPY_CONTENT", "YT_STUDIO_SETTINGS"]
    }
  }
}
```

---

### 3.5. Nhóm Điều Phối Đa Tab (Parallel Sessions & Split Tabs)

#### Key: `parallel_session_{sessionId}`
Quản lý trạng thái của một phiên chạy song song theo từng task (mỗi task = 1 tab con).
- `sessionId` (`string`): Timestamp định danh duy nhất của phiên chạy.
- `total` (`number`): Tổng số tasks.
- `baseUrl` (`string`): URL đích mở tab con (ví dụ: `https://gemini.google.com/app`).
- `maxConcurrent` (`number`): Số tab chạy song song tối đa (mặc định 5).
- `activeTab` (`boolean`): Có tự động focus tab mới mở hay không.
- `tasks` (`Object.<taskId, ParallelTaskData>`):
  - `taskId` (`string`): Mã định danh task (ví dụ: `task_0`).
  - `label` (`string`): Nhãn hiển thị (ví dụ tên ngôn ngữ hoặc index).
  - `scenarioName` (`string`): Tên kịch bản chạy.
  - `values` (`Object`): Giá trị các biến đã gán.
  - `status` (`'pending'` \| `'running'` \| `'completed'` \| `'failed'`).
  - `tabId` (`number`): ID của tab Chrome đang thực thi task này.
  - `content` (`string`): Nội dung AI trả lời đã được làm sạch và thu thập.
  - `error` (`string`): Thông điệp lỗi nếu thất bại.
  - `shouldCloseTab` (`boolean`): Người dùng xác nhận đóng hay giữ lại tab con.
  - `updatedAt` (`number`): Timestamp cập nhật gần nhất.

```json
{
  "parallel_session_1741400000000": {
    "sessionId": "1741400000000",
    "total": 2,
    "baseUrl": "https://gemini.google.com/app",
    "maxConcurrent": 5,
    "activeTab": true,
    "tasks": {
      "task_0": {
        "taskId": "task_0",
        "label": "Tiếng Anh",
        "scenarioName": "Dịch Phụ Đề",
        "values": { "lang": "Tiếng Anh", "srt": "1\n00:00:01 --> ..." },
        "status": "completed",
        "tabId": 10523,
        "content": "1\n00:00:01 --> 00:00:03\nHello world...",
        "error": "",
        "shouldCloseTab": true,
        "updatedAt": 1741400035000
      },
      "task_1": {
        "taskId": "task_1",
        "label": "Tiếng Nhật",
        "scenarioName": "Dịch Phụ Đề",
        "values": { "lang": "Tiếng Nhật", "srt": "1\n00:00:01 --> ..." },
        "status": "running",
        "tabId": 10524,
        "content": "",
        "error": "",
        "shouldCloseTab": false,
        "updatedAt": 1741400040000
      }
    }
  }
}
```

#### Key: `split_tabs_meta_{sessionId}` (Chia Tab v2)
Lưu trữ siêu dữ liệu phiên chia đều danh sách items cho N tabs.
- `sessionId` (`string`): ID phiên chia tab.
- `total` (`number`): Tổng số tab con được tạo.
- `taskIds` (`Array<string>`): Danh sách mã task tương ứng với các tabs.
- `baseUrl` (`string`): URL mở tab con.
- `activeTab` (`boolean`): Trạng thái active ban đầu.
- `createdAt` (`number`): Thời điểm tạo phiên.

```json
{
  "split_tabs_meta_1741400100000": {
    "sessionId": "1741400100000",
    "total": 2,
    "taskIds": ["split_task_tab_0", "split_task_tab_1"],
    "baseUrl": "https://gemini.google.com/app",
    "activeTab": false,
    "createdAt": 1741400100000
  }
}
```

#### Key: `split_task_{taskId}` (Per-Task Isolated Storage)
> [!IMPORTANT]
> **Thiết kế chống xung đột (Zero Race Condition):** Mỗi tab con sở hữu 1 key lưu trữ độc lập, ngăn chặn việc nhiều tab ghi đồng thời vào một session làm mất dữ liệu.

- `taskId` (`string`): Mã định danh task.
- `sessionId` (`string`): Tham chiếu ID phiên cha.
- `label` (`string`): Nhãn hiển thị (ví dụ: `Tab 1 (5 items)`).
- `scenarioName` (`string`): Tên kịch bản.
- `items` (`Array<string>`): Danh sách các item phân bổ cho tab này.
- `loopKey` (`string`): Tên biến lặp được gán trong scenario.
- `status` (`'pending'` \| `'running'` \| `'completed'` \| `'failed'`).
- `currentItem` (`string`): Item đang được gửi prompt hiện tại.
- `currentIndex` (`number`): Vị trí index item hiện tại.
- `completedItems` (`Array<string>`): Danh sách các item đã hoàn thành.
- `tabId` (`number`): ID tab Chrome thực thi.
- `error` (`string`): Thông tin lỗi nếu có.
- `updatedAt` (`number`): Timestamp cập nhật.

```json
{
  "split_task_split_task_tab_0": {
    "taskId": "split_task_tab_0",
    "sessionId": "1741400100000",
    "label": "Tab 1 (2 items)",
    "scenarioName": "Dịch Phụ Đề",
    "items": ["Tiếng Anh", "Tiếng Pháp"],
    "loopKey": "target_lang",
    "status": "running",
    "currentItem": "Tiếng Pháp",
    "currentIndex": 1,
    "completedItems": ["Tiếng Anh"],
    "tabId": 10550,
    "error": "",
    "updatedAt": 1741400145000
  }
}
```

---

### 3.6. Nhóm Trạng Thái Panel (Panel Persistence States)

Sử dụng tiện ích `PanelState.js` với tiền tố `panelState__*` để ghi nhớ phiên làm việc khi người dùng vô tình reload trang hoặc đóng/mở lại panel.

| Key | Dữ Liệu Lưu Trữ |
| :--- | :--- |
| `panelState__TextSplitter` | `{ text, limit, chunks: [], status: [], running, paused, nextIdx }` |
| `panelState__AudioDownloader` | `{ voice, format, downloaded: [], downloading: [], selected: {} }` |
| `panelState__FlowRunner` | `{ selectedFlow, currentStepIndex, isRunning, isPaused }` |

---

### 3.7. Nhóm Dữ Liệu WebRequest (ChatGPT Interceptor Data)

Được bắt và cập nhật tự động bởi `background.js` qua `chrome.webRequest`:

| Key | Mô Tả | Mục Đích Sử Dụng |
| :--- | :--- | :--- |
| `requestHeaders` | Danh sách headers của request conversation gốc. | Dùng để tái tạo header xác thực khi gọi API synthesize tải TTS Audio. |
| `authorization` | Giá trị header `Authorization: Bearer ...` của ChatGPT. | Xác thực request API tải âm thanh nền. |
| `conversationId` | UUID của cuộc hội thoại ChatGPT đang mở. | Dùng làm tham số bắt buộc cho TTS audio synthesizer API. |
| `responseData` | Toàn bộ payload JSON trả về của cuộc trò chuyện ChatGPT. | Bóc tách ID của từng message để đưa vào danh sách tải TTS Audio. |

---

## 4. Đặc Tả Cloud Schema (Firebase Firestore Collections)

Mỗi tài khoản Google khi đăng nhập sẽ sở hữu các document tương ứng trên Firestore. Quy tắc đặt tên Document ID: **Bắt buộc dùng chính địa chỉ email** (`google_user_email`).

### 4.1. Collection `configs` (Scenario Templates)
- **Path:** `/configs/{user_email}`
- **Dữ liệu:** Toàn bộ object `scenarioTemplates` của người dùng.

### 4.2. Collection `flow_configs` (Chained Flows)
- **Path:** `/flow_configs/{user_email}`
- **Dữ liệu:** Toàn bộ object `flowConfigs` của người dùng.

### 4.3. Collection `speech_profiles` (AI Studio Speech)
- **Path:** `/speech_profiles/{user_email}`
- **Dữ liệu:** Object `{ activeProfileName, profiles: { ... } }`.

### 4.4. Collection `youtube_language_profiles` (YouTube Subtitles)
- **Path:** `/youtube_language_profiles/{user_email}`
- **Dữ liệu:** Object `{ activeProfileName, profiles: { ... } }`.

### 4.5. Collection `button_configs` (Platform Buttons)
- **Path:** `/button_configs/{user_email}`
- **Dữ liệu:** Object cấu hình danh sách button hiển thị trên 7 nền tảng.

---

## 5. Cơ Chế Đồng Bộ & Xử Lý Xung Đột (Sync & Conflict Resolution)

### 5.1. Luồng Đồng Bộ Hai Chiều (Bi-directional Synchronization)

```
                       [Người Dùng Đăng Nhập Google]
                                     │
                                     ▼
                    Fetch cả 5 Collections từ Firestore
                                     │
                                     ▼
                   Ghi đè vào chrome.storage.local
                                     │
                                     ▼
                        [Sử Dụng & Chỉnh Sửa]
                                     │
               ┌─────────────────────┴─────────────────────┐
               ▼                                           ▼
  Sửa Scenario / Profile trên Panel          Sửa Flow / Buttons trên Options
               │                                           │
               ▼                                           ▼
   Ghi chrome.storage.local                    Ghi chrome.storage.local
               │                                           │
               └─────────────────────┬─────────────────────┘
                                     ▼
                   Gọi syncToFirestore(collection, data)
                                     │
                                     ▼
               Cập nhật Document tương ứng trên Firestore
```

### 5.2. Chiến Lược Xử Lý Xung Đột (Conflict Resolution)
1. **Quy tắc Last-Write-Wins trên Cloud:** Thao tác chỉnh sửa mới nhất từ bất kỳ thiết bị nào sẽ ghi đè lên Document tương ứng trên Firestore.
2. **Cô Lập Phiên Chạy Cục Bộ:** Các phiên thực thi song song (`parallel_session_*`, `split_task_*`) là dữ liệu Runtime cục bộ, **không đồng bộ lên Firestore** để tránh tắc nghẽn băng thông và đảm bảo tính riêng tư của phiên chạy.
3. **Per-Task Isolation:** Khi chia tab, mỗi worker tab chỉ cập nhật key của chính nó (`split_task_{taskId}`), giúp quá trình chạy song song đạt tốc độ tối đa mà không gây ra hiện tượng ghi đè tranh chấp (race condition).
