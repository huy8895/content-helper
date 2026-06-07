/**
 * ResponseWaiter.js
 * Module thông minh chờ AI phản hồi xong, thay thế setInterval polling.
 * 
 * Chiến lược kép:
 *   1. MutationObserver: Lắng nghe DOM thay đổi (không bị throttle khi tab ẩn)
 *   2. setTimeout đệ quy: Fallback kiểm tra isDone() với interval động
 *      - Tab active: 1.5 giây
 *      - Tab hidden: 3 giây
 * 
 * Tính năng bổ sung:
 *   - Auto-scroll: Tự cuộn trang chat xuống cuối khi AI đang sinh nội dung
 *   - Visibility-aware: Điều chỉnh tần suất poll theo trạng thái tab
 * 
 * Cách sử dụng:
 *   await ResponseWaiter.waitForDone({ autoScroll: true, timeout: 600000 });
 */
window.ResponseWaiter = (() => {

  // ── Cấu hình mặc định ──────────────────────────────────────────────
  const DEFAULT_CONFIG = {
    timeout: 600000,        // 10 phút
    activeInterval: 1500,   // 1.5 giây khi tab active
    hiddenInterval: 3000,   // 3 giây khi tab ẩn
    autoScroll: true,       // Tự cuộn xuống khi có nội dung mới
    debounceMs: 800,        // Debounce sau khi DOM ngừng thay đổi mới kiểm tra isDone
    lockoutMs: 2500,        // Trì hoãn khóa kiểm tra isDone ban đầu (ms) để tránh độ trễ UI/Server
  };

  /**
   * Chờ AI phản hồi xong.
   * @param {Object} options - Tùy chọn ghi đè DEFAULT_CONFIG
   * @returns {Promise<void>} Resolve khi AI xong, reject khi timeout
   */
  function waitForDone(options = {}) {
    const config = Object.assign({}, DEFAULT_CONFIG, options);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let observer = null;
      let fallbackTimer = null;
      let debounceTimer = null;
      let isSettled = false; // Đánh dấu Promise đã resolve/reject

      // ── Hàm dọn dẹp tài nguyên ──────────────────────────────────
      const cleanup = () => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
      };

      // ── Kiểm tra trạng thái isDone() ──────────────────────────────
      const checkDone = (source) => {
        if (isSettled) return;

        // Tránh kiểm tra quá sớm ngay sau khi gửi (tránh độ trễ UI/Server phản hồi ban đầu)
        if (Date.now() - startTime < config.lockoutMs) {
          return;
        }

        // Kiểm tra timeout trước
        if (Date.now() - startTime > config.timeout) {
          isSettled = true;
          cleanup();
          reject(new Error("Timeout khi chờ AI phản hồi"));
          return;
        }

        try {
          if (window.ChatAdapter && window.ChatAdapter.isDone()) {
            console.log(`✅ [ResponseWaiter] AI đã trả lời xong (phát hiện từ: ${source})`);
            isSettled = true;
            cleanup();
            resolve();
          }
        } catch (err) {
          console.error("[ResponseWaiter] Lỗi khi kiểm tra isDone():", err);
        }
      };

      // ── Auto-scroll xuống cuối trang chat ──────────────────────────
      const performAutoScroll = () => {
        if (!config.autoScroll) return;

        try {
          // Tìm container có scrollbar của trang chat
          // Ưu tiên container chứa các tin nhắn (thường là element có overflow-y: auto/scroll)
          const scrollContainers = [
            // Google AI Studio
            document.querySelector('.conversation-container'),
            document.querySelector('ms-autoscroll-container'),
            // ChatGPT
            document.querySelector('[class*="react-scroll-to-bottom"]'),
            document.querySelector('main .overflow-y-auto'),
            // DeepSeek
            document.querySelector('.dad65929'),
            // Qwen
            document.querySelector('.chat-message-list'),
            // Gemini
            document.querySelector('.conversation-container'),
            // Grok
            document.querySelector('main'),
          ].filter(Boolean);

          if (scrollContainers.length > 0) {
            const container = scrollContainers[0];
            container.scrollTop = container.scrollHeight;
          } else {
            // Fallback: cuộn window xuống cuối
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }
        } catch (e) {
          // Bỏ qua lỗi scroll - không ảnh hưởng chức năng chính
        }
      };

      // ── MutationObserver: Lắng nghe DOM thay đổi ──────────────────
      // Khi AI sinh nội dung, DOM liên tục thay đổi.
      // Khi AI dừng → DOM ngừng thay đổi → debounce hết → kiểm tra isDone()
      try {
        observer = new MutationObserver(() => {
          // AI đang sinh nội dung → auto-scroll
          performAutoScroll();

          // Debounce: Chỉ kiểm tra isDone() khi DOM ngừng thay đổi
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            checkDone("MutationObserver");
          }, config.debounceMs);
        });

        // Quan sát toàn bộ body để bắt mọi thay đổi từ AI response
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true, // Bắt cả thay đổi nội dung text
        });
      } catch (err) {
        console.warn("[ResponseWaiter] MutationObserver không khả dụng, dùng fallback:", err);
      }

      // ── setTimeout đệ quy: Fallback polling ──────────────────────
      // Bổ sung cho MutationObserver trong trường hợp:
      //   - isDone() dựa vào trạng thái nút (không phải DOM content)
      //   - MutationObserver bỏ lỡ sự kiện
      const pollFallback = () => {
        if (isSettled) return;

        checkDone("fallback-poll");

        if (!isSettled) {
          // Interval động: nhanh hơn khi tab active, chậm hơn khi tab hidden
          const interval = document.hidden ? config.hiddenInterval : config.activeInterval;
          fallbackTimer = setTimeout(pollFallback, interval);
        }
      };

      // Bắt đầu fallback polling sau 2 giây (cho MutationObserver cơ hội xử lý trước)
      fallbackTimer = setTimeout(pollFallback, 2000);
    });
  }

  // ── Public API ──────────────────────────────────────────────────────
  return {
    waitForDone,
  };

})();
