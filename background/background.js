console.log("Service worker đang chạy!");

// nạp JSZip vào Service Worker context
importScripts(chrome.runtime.getURL('libs/jszip.min.js'));
console.log('JSZip loaded, version:', JSZip.version);

chrome.runtime.onInstalled.addListener(() => {
  console.log('Background service worker installed.');

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


logInfo("Service worker đang chạy!");
