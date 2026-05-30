console.log("Service worker đang chạy!");

// nạp JSZip vào Service Worker context
importScripts(chrome.runtime.getURL('libs/jszip.min.js'));
console.log('JSZip loaded, version:', JSZip.version);

chrome.runtime.onInstalled.addListener(() => {
  console.log('Background service worker installed.');

  // Tạo context menu "Tạo Voice" khi bôi đen văn bản
  chrome.contextMenus.create({
    id: 'createVoice',
    title: 'Tạo Voice',
    contexts: ['selection']
  });
  logInfo('Context menu "Tạo Voice" đã được tạo.');
});

// Xử lý khi click vào context menu "Tạo Voice"
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'createVoice' && info.selectionText) {
    const selectedText = info.selectionText;
    const targetUrl = 'https://my-ytb-tool.web.app/dashboard.html#processChineseText';

    logInfo('Đang mở trang tạo Voice với văn bản đã chọn:', selectedText.substring(0, 100) + '...');

    // Mở tab mới với URL đích
    chrome.tabs.create({ url: targetUrl }, (newTab) => {
      // Lắng nghe khi tab load xong để inject text
      const listener = (tabId, changeInfo) => {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          // Gỡ listener sau khi đã xử lý
          chrome.tabs.onUpdated.removeListener(listener);

          // Inject script để đợi textarea xuất hiện rồi dán text
          chrome.scripting.executeScript({
            target: { tabId: newTab.id },
            func: (text) => {
              const MAX_WAIT = 15000; // Đợi tối đa 15 giây
              const INTERVAL = 300;  // Kiểm tra mỗi 300ms
              let elapsed = 0;

              function tryPaste() {
                const textarea = document.getElementById('rawTextInput');
                if (textarea) {
                  textarea.value = text;
                  // Trigger sự kiện input để các listener/framework nhận biết thay đổi
                  textarea.dispatchEvent(new Event('input', { bubbles: true }));
                  textarea.dispatchEvent(new Event('change', { bubbles: true }));
                  // Focus vào textarea
                  textarea.focus();
                  console.log('✅ Đã dán văn bản vào rawTextInput thành công!');
                  return true;
                }
                return false;
              }

              // Thử ngay lập tức
              if (tryPaste()) return;

              // Nếu chưa có, dùng polling để đợi textarea xuất hiện
              console.log('⏳ Đang đợi textarea #rawTextInput xuất hiện...');
              const timer = setInterval(() => {
                elapsed += INTERVAL;
                if (tryPaste()) {
                  clearInterval(timer);
                } else if (elapsed >= MAX_WAIT) {
                  clearInterval(timer);
                  console.error('❌ Timeout: Không tìm thấy textarea #rawTextInput sau ' + MAX_WAIT + 'ms');
                }
              }, INTERVAL);
            },
            args: [selectedText]
          });
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  }
});

// ----- Logger Utility -----
function getTimestamp() {
  return new Date().toISOString();
}

function logInfo(message, ...args) {
  console.log(`[${getTimestamp()}] [INFO] ${message}`, ...args);
}

function logDebug(message, ...args) {
  console.debug(`[${getTimestamp()}] [DEBUG] ${message}`, ...args);
}

function logError(message, ...args) {
  console.error(`[${getTimestamp()}] [ERROR] ${message}`, ...args);
}

function logWarn(message, ...args) {
  console.warn(`[${getTimestamp()}] [WARN] ${message}`, ...args);
}

// Quản lý headers của yêu cầu gốc
const requestHeadersMap = new Map();
const processedRequests = new Set();

// Hàng đợi tải xuống và trạng thái
const downloadQueue = [];
let isDownloading = false;

// Hàm gửi yêu cầu fetch với timeout
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

// Lắng nghe và xử lý headers của yêu cầu gốc
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      if (
          details.url.includes("/backend-api/conversation/") &&
          details.method === "GET" &&
          details.initiator === "https://chatgpt.com" &&
          !details.requestHeaders.some(
              (header) => header.name.toLowerCase() === "x-extension-request"
          )
      ) {
        requestHeadersMap.set(details.requestId, details.requestHeaders);
        chrome.storage.local.set({ requestHeaders: details.requestHeaders });
        logDebug("Lưu headers cho yêu cầu gốc", details);
      }
    },
    { urls: ["https://chatgpt.com/*"] },
    ["requestHeaders"]
);

// Xử lý yêu cầu hoàn tất
chrome.webRequest.onCompleted.addListener(
    async (details) => {
      const conversationEndpoint = "/backend-api/conversation/";
      if (
          details.url.startsWith("https://chatgpt.com" + conversationEndpoint) &&
          !details.url.includes("/textdocs") &&
          details.url.split(conversationEndpoint)[1].length === 36 &&
          details.method === "GET" &&
          details.initiator === "https://chatgpt.com"
      ) {
        if (processedRequests.has(details.requestId)) return;

        const headers = requestHeadersMap.get(details.requestId);
        if (headers) {
          const fetchHeaders = new Headers();
          headers.forEach((header) => fetchHeaders.append(header.name, header.value));
          fetchHeaders.append("X-Extension-Request", "true");

          // Tìm header Authorization và lưu vào storage
          const authorizationHeader = headers.find(header => header.name.toLowerCase() === 'Authorization'.toLowerCase());
          if (authorizationHeader) {
            chrome.storage.local.set({ authorization: authorizationHeader.value }, () => {
              logDebug("Đã lưu Authorization header vào storage.");
            });
          }

          try {
            const data = await fetchWithTimeout(details.url, {
              method: "GET",
              headers: fetchHeaders,
              credentials: "include",
            });

            chrome.storage.local.set({
              conversationId: details.url.split("/").pop(),
              responseData: data,
            });
            logInfo("API trả về dữ liệu", { conversationId: details.url.split("/").pop(), data });
          } catch (error) {
            logError("Lỗi khi gọi API", error);
          } finally {
            requestHeadersMap.delete(details.requestId);
            processedRequests.add(details.requestId);
          }
        }
      }
    },
    { urls: ["https://chatgpt.com/*"] },
    []
);

// Hàm xử lý hàng đợi tải xuống
function processQueue() {
  if (downloadQueue.length === 0 || isDownloading) return;

  isDownloading = true;
  const { request, callback } = downloadQueue.shift();
  logDebug("Bắt đầu xử lý download cho message ID:", request.messageId);
  downloadAudio(request, (result) => {
    callback(result);
    isDownloading = false;
    processQueue();
  });
}

// Tải xuống audio với cơ chế retry
function downloadAudio(request, callback, retryCount = 0) {
  const {
    indexCell,
    conversationId,
    messageId,
    requestHeaders,
    selectedVoice = "alloy",
    format = "mp3",
  } = request;

  const url = `https://chatgpt.com/backend-api/synthesize?message_id=${messageId}&conversation_id=${conversationId}&voice=${selectedVoice}&format=${format}`;
  const headers = requestHeaders.reduce((acc, header) => {
    acc[header.name] = header.value;
    return acc;
  }, {});

  logDebug("Đang fetch audio với URL:", url, "với headers:", headers);

  // Tăng timeout xuống 30 giây (30000 ms)
  const controller = new AbortController();
  const timeoutDuration = 60000; // Timeout 60 giây
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

  // Workaround giữ cho service worker hoạt động
  const keepAlive = setInterval(() => chrome.runtime.getPlatformInfo(() => {}), 25000);

  fetch(url, { headers, credentials: "include", signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId); // Hủy timeout khi nhận được phản hồi
        clearInterval(keepAlive); // Dừng keep-alive khi hoàn thành
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        const reader = new FileReader();
        logInfo("Blob audio đã nhận được, bắt đầu tải xuống cho message ID:", messageId);
        reader.onload = function () {
          const blobUrl = reader.result;
          chrome.downloads.download(
              {
                url: blobUrl,
                filename: `${indexCell}_${messageId}_${selectedVoice}.${format}`,
                conflictAction: "uniquify",
              },
              (downloadId) => {
                if (chrome.runtime.lastError) {
                  logError(`Download thất bại cho message ID: ${messageId}`, chrome.runtime.lastError);
                  callback({ status: "failed", error: chrome.runtime.lastError });
                } else {
                  logInfo(`Download thành công, downloadId: ${downloadId} cho message ID: ${messageId}`);
                  callback({ status: "completed", downloadId });
                }
              }
          );

        };
        reader.readAsDataURL(blob);
      })
      .catch((error) => {
        clearTimeout(timeoutId); // Hủy timeout khi gặp lỗi
        clearInterval(keepAlive); // Dừng keep-alive khi lỗi xảy ra

        const status = error?.response?.status || error?.status;

        // Lỗi không nên retry
        const doNotRetryStatuses = [401, 403, 404];

        if (error.name === "AbortError") {
          logWarn(`Request bị hủy do timeout sau ${timeoutDuration}ms cho message ID: ${messageId}`, error);
        } else if (doNotRetryStatuses.includes(status)) {
          logError(`Lỗi không thể phục hồi (${status}), không retry cho message ID: ${messageId}`, error);
          callback({ status: "failed", error });
          return;
        } else {
          logWarn(`Lỗi, thử lại (${retryCount + 1}/10) cho message ID: ${messageId}`, error);
        }

        if (retryCount < 10) {
          setTimeout(() => {
            downloadAudio(request, callback, retryCount + 1);
          }, Math.pow(2, retryCount) * 100);
        } else {
          logError(`Thất bại sau 10 lần thử cho message ID: ${messageId}`, error);
          callback({ status: "failed", error });
        }
      });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'downloadAudioZip') return;
  console.log("Nhận yêu cầu tải xuống zip:", request);
  const {
    messageIds,
    conversationId,
    requestHeaders,
    selectedVoice,
    format
  } = request;

  // 1) fetch all blobs
  Promise.all(messageIds.map(id =>
      fetch(
          `https://chatgpt.com/backend-api/synthesize?` +
          `message_id=${id}&conversation_id=${conversationId}` +
          `&voice=${selectedVoice}&format=${format}`,
          {
            headers: Object.fromEntries(requestHeaders.map(h=>[h.name,h.value])),
            credentials:'include'
          }
      )
          .then(r => {
            if (!r.ok) throw new Error(r.statusText);
            return r.blob().then(blob => ({ id, blob }));
          })
  ))
      // 2) zip them
      .then(files => {
        const zip = new JSZip();
        files.forEach(({id, blob}, i) => {
          zip.file(`${i+1}_${id}_${selectedVoice}.${format}`, blob);
        });
        return zip.generateAsync({ type:'blob' });
      })
      // 3) convert to data URL & download
      .then(zipBlob => zipBlob.arrayBuffer())
      .then(buffer => {
        const b64 = btoa(new Uint8Array(buffer).reduce((s,c)=>s+String.fromCharCode(c), ''));
        const dataUrl = 'data:application/zip;base64,' + b64;
        chrome.downloads.download({
          url: dataUrl,
          filename:'audio.zip',
          conflictAction:'overwrite'
        }, () => sendResponse({ status:'completed' }));
      })
      .catch(err => {
        console.error('zip error', err);
        sendResponse({ status:'failed', error:err.message });
      });

  return true; // keep channel open for sendResponse
});

// Lắng nghe yêu cầu tải xuống từ giao diện
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadAudio") {
    logInfo("Thêm yêu cầu download vào queue cho message ID:", request.messageId);

    downloadQueue.push({
      request,
      callback: (result) => {
        try {
          sendResponse(result); // phản hồi về popup
        } catch (e) {
          logError("Không thể sendResponse (port có thể đã đóng)", e);
        }
      },
    });

    processQueue();

    return true; // 🔥 GIỮ CONNECTION SỐNG cho đến khi callback chạy
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SHOW_NOTIFICATION") {
    logInfo("Nhận thông báo từ popup:", message);
    chrome.notifications.create({
      type: "basic",
      // iconUrl: "https://www.google.com/favicon.ico",
      iconUrl: chrome.runtime.getURL("assets/icon.png"),
      title: message.title,
      message: message.message
    }, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error("❌ Notification error:", chrome.runtime.lastError.message);
      } else {
        console.log("🔔 Notification created with ID:", notificationId);
      }
    });
  }
});


logInfo("Service worker đang chạy!");

// ═══════════════════════════════════════════════════════════════════
// TabOrchestrator – Điều phối chạy song song cho ScenarioRunner
// ═══════════════════════════════════════════════════════════════════

/**
 * Lưu trữ trạng thái của mỗi phiên parallel execution.
 * Key: sessionId (timestamp), Value: session object
 */
const parallelSessions = new Map();

/**
 * Xử lý message PARALLEL_START từ tab gốc (ScenarioRunner).
 * 
 * Payload:
 *   - sessionId: ID phiên chạy (dùng để track)
 *   - tasks: [{taskId, scenarioName, values, startAt}]
 *   - baseUrl: URL mở tab mới (vd: https://gemini.google.com/app)
 *   - maxConcurrent: Số tab chạy đồng thời tối đa
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'PARALLEL_START') return;

  const { sessionId, tasks, baseUrl, maxConcurrent = 5 } = message;
  const sourceTabId = sender.tab?.id;

  logInfo(`🚀 [TabOrchestrator] Bắt đầu phiên "${sessionId}": ${tasks.length} tasks, max ${maxConcurrent} tabs`);

  // Khởi tạo session
  const session = {
    sessionId,
    sourceTabId,           // Tab gốc để gửi progress về
    baseUrl,
    maxConcurrent,
    tasks: [...tasks],     // Tất cả tasks
    pending: [...tasks],   // Tasks chưa được gán cho tab
    running: new Map(),    // taskId → tabId (đang chạy)
    completed: [],         // Tasks đã xong
    failed: [],            // Tasks bị lỗi
    results: [],           // Kết quả content từ mỗi tab {label, content, taskId}
  };

  parallelSessions.set(sessionId, session);

  // Bắt đầu mở tabs cho batch đầu tiên
  _launchNextBatch(session);

  sendResponse({ received: true, sessionId });
  return true;
});

/**
 * Mở tabs cho batch tiếp theo (giới hạn bởi maxConcurrent).
 * @param {object} session - Session object
 */
function _launchNextBatch(session) {
  const slotsAvailable = session.maxConcurrent - session.running.size;
  const tasksToLaunch = session.pending.splice(0, slotsAvailable);

  logInfo(`📦 [TabOrchestrator] Mở ${tasksToLaunch.length} tab mới (${session.running.size} đang chạy, ${session.pending.length} chờ)`);

  tasksToLaunch.forEach(task => {
    _createTabAndSendTask(session, task);
  });
}

/**
 * Tạo 1 tab mới và gửi task cho nó khi load xong.
 * @param {object} session - Session object
 * @param {object} task - Task data {taskId, scenarioName, values, startAt}
 */
function _createTabAndSendTask(session, task) {
  chrome.tabs.create({ url: session.baseUrl, active: false }, (newTab) => {
    if (chrome.runtime.lastError) {
      logError(`❌ [TabOrchestrator] Không thể tạo tab cho task "${task.taskId}":`, chrome.runtime.lastError);
      _handleTaskFailure(session, task.taskId, 'Không thể tạo tab', task.taskId);
      return;
    }

    logInfo(`📂 [TabOrchestrator] Đã tạo tab #${newTab.id} cho task "${task.taskId}"`);
    session.running.set(task.taskId, newTab.id);

    // Lắng nghe khi tab load xong
    const listener = (tabId, changeInfo) => {
      if (tabId !== newTab.id || changeInfo.status !== 'complete') return;

      // Gỡ listener sau khi xử lý
      chrome.tabs.onUpdated.removeListener(listener);

      logInfo(`✅ [TabOrchestrator] Tab #${newTab.id} đã load xong. Chờ 3s rồi gửi task...`);

      // Delay 3s để content scripts inject xong (ChatAdapter, PromptSequencer, ParallelWorker)
      setTimeout(() => {
        chrome.tabs.sendMessage(newTab.id, {
          type: 'PARALLEL_EXEC_TASK',
          taskId: task.taskId,
          scenarioName: task.scenarioName,
          values: task.values,
          startAt: task.startAt
        }, (response) => {
          if (chrome.runtime.lastError) {
            logError(`❌ [TabOrchestrator] Không gửi được task cho tab #${newTab.id}:`, chrome.runtime.lastError.message);
            _handleTaskFailure(session, task.taskId, chrome.runtime.lastError.message, task.taskId);
          } else {
            logInfo(`📨 [TabOrchestrator] Task "${task.taskId}" đã gửi thành công cho tab #${newTab.id}`);
          }
        });
      }, 3000);
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Xử lý message PARALLEL_TASK_DONE từ tab con (ParallelWorker).
 * 
 * Payload:
 *   - taskId: ID của task đã hoàn thành
 *   - status: 'completed' hoặc 'failed'
 *   - label: Nhãn hiển thị (vd: tên ngôn ngữ)
 *   - error: Thông báo lỗi (nếu failed)
 */
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== 'PARALLEL_TASK_DONE') return;

  const { taskId, status, label, error, content } = message;

  // Tìm session chứa task này
  let targetSession = null;
  for (const [, session] of parallelSessions) {
    if (session.running.has(taskId)) {
      targetSession = session;
      break;
    }
  }

  if (!targetSession) {
    logWarn(`⚠️ [TabOrchestrator] Nhận PARALLEL_TASK_DONE cho task "${taskId}" nhưng không tìm thấy session`);
    return;
  }

  if (status === 'completed') {
    _handleTaskComplete(targetSession, taskId, label, content);
  } else {
    _handleTaskFailure(targetSession, taskId, error, label);
  }
});

/**
 * Xử lý khi 1 task hoàn thành thành công.
 * @param {object} session - Session object
 * @param {string} taskId - ID task
 * @param {string} label - Nhãn hiển thị (vd: giá trị list)
 * @param {string} content - Nội dung AI response đã thu thập từ tab con
 */
function _handleTaskComplete(session, taskId, label, content) {
  logInfo(`✅ [TabOrchestrator] Task "${taskId}" (${label}) hoàn thành! Content: ${(content || '').length} ký tự`);

  // Chuyển từ running → completed
  session.running.delete(taskId);
  session.completed.push({ taskId, label });

  // Lưu content vào results để tạo ZIP sau
  if (content) {
    session.results.push({ taskId, label, content });
    logInfo(`📦 [TabOrchestrator] Đã lưu kết quả cho "${label}". Tổng: ${session.results.length} files`);
  }

  // Gửi notification cho task này
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icon.png'),
    title: '⚡ Parallel Task hoàn thành',
    message: `Task "${label}" đã xong! (${session.completed.length + session.failed.length}/${session.tasks.length})`
  });

  // Gửi progress về tab gốc
  _sendProgressToSource(session);

  // Kiểm tra nếu còn pending → mở tab mới
  if (session.pending.length > 0) {
    _launchNextBatch(session);
  }

  // Kiểm tra nếu tất cả đã xong
  _checkAllDone(session);
}

/**
 * Xử lý khi 1 task bị lỗi.
 */
function _handleTaskFailure(session, taskId, errorMsg, label) {
  logError(`❌ [TabOrchestrator] Task "${taskId}" (${label}) lỗi: ${errorMsg}`);

  // Chuyển từ running → failed
  session.running.delete(taskId);
  session.failed.push({ taskId, label, error: errorMsg });

  // Gửi progress về tab gốc
  _sendProgressToSource(session);

  // Kiểm tra nếu còn pending → mở tab mới
  if (session.pending.length > 0) {
    _launchNextBatch(session);
  }

  // Kiểm tra nếu tất cả đã xong
  _checkAllDone(session);
}

/**
 * Gửi progress cập nhật về tab gốc.
 */
function _sendProgressToSource(session) {
  const total = session.tasks.length;
  const done = session.completed.length + session.failed.length;

  if (session.sourceTabId) {
    chrome.tabs.sendMessage(session.sourceTabId, {
      type: 'PARALLEL_PROGRESS',
      sessionId: session.sessionId,
      completed: session.completed.length,
      failed: session.failed.length,
      total: total,
      lastLabel: session.completed.at(-1)?.label || session.failed.at(-1)?.label || ''
    }, () => {
      // Bỏ qua lỗi nếu tab gốc đã đóng
      if (chrome.runtime.lastError) {
        logWarn('[TabOrchestrator] Không gửi được progress về tab gốc:', chrome.runtime.lastError.message);
      }
    });
  }
}

/**
 * Kiểm tra xem tất cả tasks đã hoàn thành chưa.
 */
function _checkAllDone(session) {
  const total = session.tasks.length;
  const done = session.completed.length + session.failed.length;

  if (done < total) return; // Chưa xong hết

  logInfo(`🎉 [TabOrchestrator] Phiên "${session.sessionId}" hoàn thành! ` +
    `${session.completed.length} thành công, ${session.failed.length} lỗi`);

  // Gửi PARALLEL_ALL_DONE về tab gốc
  if (session.sourceTabId) {
    chrome.tabs.sendMessage(session.sourceTabId, {
      type: 'PARALLEL_ALL_DONE',
      sessionId: session.sessionId,
      completed: session.completed,
      failed: session.failed,
      total: total
    }, () => {
      if (chrome.runtime.lastError) {
        logWarn('[TabOrchestrator] Không gửi được ALL_DONE về tab gốc');
      }
    });
  }

  // Gửi notification tổng kết
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icon.png'),
    title: '🎉 Parallel Execution hoàn thành!',
    message: `Tất cả ${total} tasks đã xong! (${session.completed.length} OK, ${session.failed.length} lỗi)`
  });

  // GIỮ session để user có thể download ZIP sau
  // Session sẽ bị xóa khi user bấm PARALLEL_CLEANUP_SESSION hoặc bắt đầu phiên mới
  logInfo(`📦 [TabOrchestrator] Giữ session "${session.sessionId}" với ${session.results.length} kết quả cho download ZIP`);
}

// ═══════════════════════════════════════════════════════════════════
// PARALLEL_DOWNLOAD_ZIP – Tạo ZIP từ kết quả đã thu thập và tải xuống
// ═══════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'PARALLEL_DOWNLOAD_ZIP') return;

  const { sessionId } = message;

  // Tìm session (ưu tiên sessionId cụ thể, nếu không thì lấy session gần nhất)
  let session = null;
  if (sessionId) {
    session = parallelSessions.get(sessionId);
  } else {
    // Lấy session mới nhất (cuối cùng trong Map)
    for (const [, s] of parallelSessions) {
      session = s;
    }
  }

  if (!session || session.results.length === 0) {
    logWarn('[TabOrchestrator] Không có kết quả nào để tạo ZIP');
    sendResponse({ status: 'error', message: 'Không có kết quả nào để tải' });
    return true;
  }

  logInfo(`📦 [TabOrchestrator] Tạo ZIP từ ${session.results.length} kết quả...`);

  try {
    const zip = new JSZip();

    session.results.forEach((result, idx) => {
      // Dùng label làm tên file, fallback sang index
      let filename = result.label ? `${result.label}.txt` : `${idx + 1}.txt`;
      // Loại bỏ ký tự không hợp lệ trong tên file
      filename = filename.replace(/[<>:"/\\|?*]/g, '_');
      zip.file(filename, result.content || '');
    });

    const count = session.results.length;
    const total = session.tasks.length;

    zip.generateAsync({ type: 'blob' })
      .then(blob => blob.arrayBuffer())
      .then(buffer => {
        const b64 = btoa(new Uint8Array(buffer).reduce((s, c) => s + String.fromCharCode(c), ''));
        const dataUrl = 'data:application/zip;base64,' + b64;
        chrome.downloads.download({
          url: dataUrl,
          filename: `parallel_results_${count}of${total}_${Date.now()}.zip`,
          conflictAction: 'uniquify'
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            logError('[TabOrchestrator] Download ZIP lỗi:', chrome.runtime.lastError);
            sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
          } else {
            logInfo(`✅ [TabOrchestrator] ZIP đã tải xuống! downloadId: ${downloadId}`);
            sendResponse({ status: 'completed', downloadId, count });
          }
        });
      })
      .catch(err => {
        logError('[TabOrchestrator] Lỗi tạo ZIP:', err);
        sendResponse({ status: 'error', message: err.message });
      });

  } catch (err) {
    logError('[TabOrchestrator] Lỗi tạo ZIP:', err);
    sendResponse({ status: 'error', message: err.message });
  }

  return true; // Giữ channel cho sendResponse async
});

// ═══════════════════════════════════════════════════════════════════
// PARALLEL_CLEANUP_SESSION – Dọn dẹp session khi ScenarioRunner đóng
// ═══════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'PARALLEL_CLEANUP_SESSION') return;

  const { sessionId } = message;

  if (sessionId && parallelSessions.has(sessionId)) {
    parallelSessions.delete(sessionId);
    logInfo(`🧹 [TabOrchestrator] Đã dọn session "${sessionId}"`);
  } else {
    // Dọn tất cả sessions
    const count = parallelSessions.size;
    parallelSessions.clear();
    logInfo(`🧹 [TabOrchestrator] Đã dọn tất cả ${count} sessions`);
  }
});
