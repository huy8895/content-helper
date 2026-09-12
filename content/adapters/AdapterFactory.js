// AdapterFactory.js – Quản lý việc đăng ký và kích hoạt Adapter phù hợp với hostname
// -----------------------------------------------------------------------------

const ADAPTER_CTORS = [
  ChatGPTAdapter,
  DeepSeekAdapter,
  QwenAdapter,
  GrokAdapter,
  GoogleAIStudioAdapter,
  YoutubeStudioAdapter,
  GeminiAdapter
];

function initializeAdapter() {
  console.log("[Adapter Factory] DOM is ready. Initializing adapter...");
  let active = null;
  for (const Ctor of ADAPTER_CTORS) {
    if (typeof Ctor !== 'undefined' && Ctor.matches(window.location.hostname)) {
      try {
        active = new Ctor();
      } catch (e) {
        console.error(`[Adapter Factory] Error constructing ${Ctor.name}:`, e);
      }
      break;
    }
  }

  window.ChatAdapter = active;

  console.log("[Adapter Factory] Host =", window.location.hostname);
  console.log("[Adapter Factory] Picked =", window.ChatAdapter?.constructor.name || 'None');

  // Gọi trực tiếp insertHelperButtons() ngay sau khi adapter sẵn sàng
  if (window.ChatAdapter) {
    window.ChatAdapter.insertHelperButtons();
  }
}

// Đảm bảo chạy sau khi tất cả các script đã được tải và DOM sẵn sàng.
// Dùng setTimeout(0) để đẩy việc thực thi xuống cuối hàng đợi sự kiện.
if (document.readyState === 'complete') {
  setTimeout(initializeAdapter, 0);
} else {
  window.addEventListener('load', () => setTimeout(initializeAdapter, 0));
}
