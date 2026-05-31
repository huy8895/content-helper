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

  // Khởi tạo session (chỉ giữ thông tin điều phối trong RAM)
  const session = {
    sessionId,
    baseUrl,
    maxConcurrent,
    tasks: [...tasks],     // Tất cả tasks
    pending: [...tasks],   // Tasks chưa được gán cho tab
    running: new Map(),    // taskId → tabId (đang chạy)
    completed: [],         // Tasks đã xong
    failed: [],            // Tasks bị lỗi
  };

  parallelSessions.set(sessionId, session);

  // Ghi trạng thái ban đầu vào chrome.storage.local
  const storageKey = `parallel_session_${sessionId}`;
  const storageData = { sessionId, total: tasks.length, baseUrl, maxConcurrent, tasks: {} };
  tasks.forEach(t => {
    storageData.tasks[t.taskId] = {
      taskId: t.taskId, 
      label: t.label || t.taskId,
      scenarioName: t.scenarioName, 
      values: t.values, 
      startAt: t.startAt,
      status: 'pending', 
      content: '', 
      error: '', 
      updatedAt: Date.now()
    };
  });
  chrome.storage.local.set({ [storageKey]: storageData }, () => {
    logInfo(`💾 [TabOrchestrator] Đã ghi session vào storage: ${storageKey}`);
  });

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

  tasksToLaunch.forEach((task, idx) => {
    // Thêm Stagger Delay: cách nhau 2 giây mỗi tab để tránh bị nhận diện robot
    const delay = idx * 2000;
    setTimeout(() => {
      // Đảm bảo session vẫn hoạt động (phòng trường hợp user đóng panel đột ngột)
      if (parallelSessions.has(session.sessionId)) {
        _createTabAndSendTask(session, task);
      }
    }, delay);
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
        // Cập nhật storage: task → running
        const sKey = `parallel_session_${session.sessionId}`;
        chrome.storage.local.get(sKey, (r) => {
          const sd = r[sKey];
           if (sd && sd.tasks[task.taskId]) {
            sd.tasks[task.taskId].status = 'running';
            sd.tasks[task.taskId].tabId = newTab.id;
            sd.tasks[task.taskId].updatedAt = Date.now();
            chrome.storage.local.set({ [sKey]: sd });
          }
        });

        chrome.tabs.sendMessage(newTab.id, {
          type: 'PARALLEL_EXEC_TASK',
          sessionId: session.sessionId,
          taskId: task.taskId,
          scenarioName: task.scenarioName,
          values: task.values,
          startAt: task.startAt
        }, (response) => {
          if (chrome.runtime.lastError) {
            logError(`❌ [TabOrchestrator] Không gửi được task cho tab #${newTab.id}:`, chrome.runtime.lastError.message);
            // Cập nhật storage: task → failed
            const sk = `parallel_session_${session.sessionId}`;
            chrome.storage.local.get(sk, (r2) => {
              const sd2 = r2[sk];
              if (sd2 && sd2.tasks[task.taskId]) {
                sd2.tasks[task.taskId].status = 'failed';
                sd2.tasks[task.taskId].error = chrome.runtime.lastError.message;
                sd2.tasks[task.taskId].updatedAt = Date.now();
                chrome.storage.local.set({ [sk]: sd2 });
              }
            });
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
 * Lắng nghe thay đổi trong chrome.storage.local.
 * Khi ParallelWorker ghi kết quả vào storage → phát hiện task hoàn thành/lỗi → điều phối batch tiếp.
 */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  for (const [key, { newValue, oldValue }] of Object.entries(changes)) {
    if (!key.startsWith('parallel_session_')) continue;

    const sessionId = newValue?.sessionId;
    if (!sessionId) continue;

    let session = parallelSessions.get(sessionId);
    
    // Nếu service worker bị ngủ, biến RAM session sẽ mất. Ta cần khôi phục từ storage:
    if (!session) {
      logInfo(`🔄 [TabOrchestrator] Khôi phục session từ storage do service worker khởi động lại: ${sessionId}`);
      session = {
        sessionId,
        baseUrl: newValue.baseUrl,
        maxConcurrent: newValue.maxConcurrent || 5,
        tasks: [],
        pending: [],
        running: new Map(),
        completed: [],
        failed: []
      };
      
      for (const [tId, tData] of Object.entries(newValue.tasks)) {
         session.tasks.push(tData);
         if (tData.status === 'pending') {
            session.pending.push(tData);
         } else if (tData.status === 'running') {
            session.running.set(tId, tData.tabId);
         } else if (tData.status === 'completed') {
            session.completed.push({ taskId: tId, label: tData.label });
         } else if (tData.status === 'failed') {
            session.failed.push({ taskId: tId, label: tData.label, error: tData.error });
         }
      }
      parallelSessions.set(sessionId, session);
    }

    for (const [taskId, taskData] of Object.entries(newValue.tasks || {})) {
      const oldStatus = oldValue?.tasks?.[taskId]?.status;
      const newStatus = taskData.status;
      if (oldStatus === newStatus) continue;

      if (newStatus === 'completed' && oldStatus !== 'completed') {
        logInfo(`✅ [Storage] Task "${taskId}" (${taskData.label}) hoàn thành!`);
        const tabId = taskData.tabId;
        session.running.delete(taskId);
        if (!session.completed.find(c => c.taskId === taskId)) {
          session.completed.push({ taskId, label: taskData.label });
        }
        // Tự động đóng tab phụ sau 2s (kết quả đã lưu an toàn trong storage)
        if (tabId) {
          setTimeout(() => {
            chrome.tabs.remove(tabId, () => {
              if (chrome.runtime.lastError) {
                logWarn(`[TabOrchestrator] Không đóng được tab #${tabId}: ${chrome.runtime.lastError.message}`);
              } else {
                logInfo(`🗑️ [TabOrchestrator] Đã đóng tab #${tabId} (${taskData.label})`);
              }
            });
          }, 2000);
        }
        if (session.pending.length > 0) _launchNextBatch(session);
        _checkAllDone(session);
      }

      if (newStatus === 'failed' && oldStatus !== 'failed') {
        logError(`❌ [Storage] Task "${taskId}" (${taskData.label}) lỗi: ${taskData.error}`);
        const tabId = taskData.tabId;
        session.running.delete(taskId);
        if (!session.failed.find(f => f.taskId === taskId)) {
          session.failed.push({ taskId, label: taskData.label, error: taskData.error });
        }
        // Tự động đóng tab lỗi sau 2s
        if (tabId) {
          setTimeout(() => {
            chrome.tabs.remove(tabId, () => {
              if (chrome.runtime.lastError) {
                logWarn(`[TabOrchestrator] Không đóng được tab #${tabId}`);
              } else {
                logInfo(`🗑️ [TabOrchestrator] Đã đóng tab lỗi #${tabId} (${taskData.label})`);
              }
            });
          }, 2000);
        }
        if (session.pending.length > 0) _launchNextBatch(session);
        _checkAllDone(session);
      }
    }
  }
});

/**
 * Kiểm tra xem tất cả tasks đã hoàn thành chưa.
 */
function _checkAllDone(session) {
  const total = session.tasks.length;
  const done = session.completed.length + session.failed.length;
  if (done < total) return;

  logInfo(`🎉 [TabOrchestrator] Phiên "${session.sessionId}" hoàn thành! ` +
    `${session.completed.length} thành công, ${session.failed.length} lỗi`);

  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icon.png'),
    title: '🎉 Parallel Execution hoàn thành!',
    message: `Tất cả ${total} tasks đã xong! (${session.completed.length} OK, ${session.failed.length} lỗi)`
  });

  logInfo(`📦 [TabOrchestrator] Giữ session "${session.sessionId}" cho download ZIP`);
}

// ═══════════════════════════════════════════════════════════════════
// PARALLEL_DOWNLOAD_ZIP – Đọc kết quả từ storage → tạo ZIP → tải xuống
// ═══════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'PARALLEL_DOWNLOAD_ZIP') return;

  const storageKey = `parallel_session_${message.sessionId}`;

  chrome.storage.local.get(storageKey, (result) => {
    const sessionData = result[storageKey];
    if (!sessionData) {
      sendResponse({ status: 'error', message: 'Không tìm thấy session trong storage' });
      return;
    }

    const completedTasks = Object.values(sessionData.tasks)
      .filter(t => t.status === 'completed' && t.content);

    if (completedTasks.length === 0) {
      sendResponse({ status: 'error', message: 'Không có kết quả nào để tải' });
      return;
    }

    logInfo(`📦 [TabOrchestrator] Tạo ZIP từ ${completedTasks.length} kết quả...`);
    const zip = new JSZip();
    completedTasks.forEach((task, idx) => {
      let filename = task.label ? `${task.label}.txt` : `${idx + 1}.txt`;
      filename = filename.replace(/[<>:"/\\|?*]/g, '_');
      zip.file(filename, task.content || '');
    });

    zip.generateAsync({ type: 'blob' })
      .then(blob => blob.arrayBuffer())
      .then(buffer => {
        const b64 = btoa(new Uint8Array(buffer).reduce((s, c) => s + String.fromCharCode(c), ''));
        chrome.downloads.download({
          url: 'data:application/zip;base64,' + b64,
          filename: `parallel_results_${completedTasks.length}of${sessionData.total}_${Date.now()}.zip`,
          conflictAction: 'uniquify'
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
          } else {
            sendResponse({ status: 'completed', downloadId, count: completedTasks.length });
          }
        });
      })
      .catch(err => sendResponse({ status: 'error', message: err.message }));
  });

  return true;
});

// ═══════════════════════════════════════════════════════════════════
// PARALLEL_CLEANUP_SESSION – Dọn dẹp session + storage
// ═══════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'PARALLEL_CLEANUP_SESSION') return;
  const { sessionId } = message;
  if (sessionId) {
    parallelSessions.delete(sessionId);
    chrome.storage.local.remove(`parallel_session_${sessionId}`);
    logInfo(`🧹 [TabOrchestrator] Đã dọn session + storage "${sessionId}"`);
  } else {
    const keys = [];
    for (const [id] of parallelSessions) keys.push(`parallel_session_${id}`);
    parallelSessions.clear();
    if (keys.length > 0) chrome.storage.local.remove(keys);
    logInfo(`🧹 [TabOrchestrator] Đã dọn tất cả sessions`);
  }
});
