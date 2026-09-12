// DeepSeekAdapter.js – Adapter cho deepseek.com
// -----------------------------------------------------------------------------

class DeepSeekAdapter extends BaseChatAdapter {
  static matches(host) { return /deepseek\.com$/i.test(host); }

  constructor() {
    super();
    this._lastContinueClickTime = 0;
  }

  getTextarea() {
    return this._q('textarea[placeholder*="DeepSeek"]') || 
           this._q('textarea#chat-input') || 
           this._q('textarea');
  }

  getSendBtn() {
    const root = this.getForm();
    if (!root) return null;

    const btns = [...root.querySelectorAll('[role="button"], button')];
    const btn = btns.at(-1) || null;

    if (btn && btn.disabled === undefined) {
      Object.defineProperty(btn, 'disabled', {
        get() {
          return btn.getAttribute('aria-disabled') === 'true' || 
                 btn.classList.contains('ds-button--disabled') || 
                 btn.hasAttribute('disabled');
        },
        configurable: true
      });
    }
    return btn;
  }

  getStopBtn() {
    const root = this.getForm();
    if (!root) {
      return null;
    }

    const btns = [...root.querySelectorAll('[role="button"], button')];
    for (const btn of btns) {
      const svg = btn.querySelector('svg');
      if (svg) {
        const html = svg.innerHTML.toLowerCase();
        const paths = [...svg.querySelectorAll('path')];
        const hasSquarePath = paths.some(p => {
          const d = p.getAttribute('d') || '';
          return d.includes('M2 4.88') || d.includes('H11.12') || d.includes('V11.12');
        });

        if (html.includes('rect') || html.includes('square') || html.includes('stop') || hasSquarePath) {
          return btn;
        }
      }
    }

    const icon = root.querySelector('div._480132b');
    const btn = icon ? icon.closest('[role="button"]') : null;

    if (btn && btn.disabled === undefined) {
      Object.defineProperty(btn, 'disabled', {
        get() {
          return btn.getAttribute('aria-disabled') === 'true';
        },
        configurable: true
      });
    }
    return btn;
  }

  getContinueBtn() {
    const elements = [...document.querySelectorAll('.ds-button, [role="button"], button')];
    for (const el of elements) {
      const text = el.textContent.trim();
      if (/^(continue|continue generating|tiếp tục)$/i.test(text)) {
        if (el.offsetWidth > 0 && el.offsetHeight > 0) {
          return el;
        }
      }
    }
    return null;
  }

  isDone() {
    const stopBtn = this.getStopBtn();
    if (stopBtn) return false;

    const continueBtn = this.getContinueBtn();
    if (continueBtn) {
      const now = Date.now();
      if (now - this._lastContinueClickTime > 3000) {
        this._lastContinueClickTime = now;
        console.log("🖱️ [DeepSeekAdapter] Phát hiện nút Continue. Tự động click để sinh tiếp...");
        continueBtn.click();
      }
      return false;
    }

    const sendBtn = this.getSendBtn();
    if (!sendBtn) return false;

    return true;
  }

  getForm() {
    const textarea = this.getTextarea();
    if (!textarea) return null;

    const form = textarea.closest('form');
    if (form) return form;

    let el = textarea.parentElement;
    for (let i = 0; i < 3 && el; i++) {
      if (el.tagName === 'DIV' && el.querySelector('[role="button"]')) {
        return el;
      }
      el = el.parentElement;
    }

    return textarea.parentElement?.parentElement ?? textarea.parentElement;
  }

  getContentElements() {
    return Array.from(document.querySelectorAll('.ds-markdown, .ds-markdown--block'));
  }

  async enableTemporaryChat() {
    console.log("🔒 [DeepSeekAdapter] Đang kiểm tra để bật model Expert mặc định...");
    try {
      const expertBtn = document.querySelector('[data-model-type="expert"]');
      if (!expertBtn) {
        console.warn("⚠️ [DeepSeekAdapter] Không tìm thấy nút chọn model Expert. Có thể giao diện đã thay đổi hoặc đang ở phiên bản di động.");
        return false;
      }

      const isChecked = expertBtn.getAttribute('aria-checked') === 'true';
      if (isChecked) {
        console.log("💎 [DeepSeekAdapter] Model Expert đã được chọn sẵn.");
        return true;
      }

      console.log("🖱️ [DeepSeekAdapter] Tiến hành click chọn model Expert...");
      expertBtn.click();

      await new Promise(r => setTimeout(r, 500));
      console.log("💎 [DeepSeekAdapter] Đã kích hoạt model Expert thành công!");
      return true;
    } catch (e) {
      console.error("❌ [DeepSeekAdapter] Lỗi khi chọn model Expert:", e);
      return false;
    }
  }
}

window.DeepSeekAdapter = DeepSeekAdapter;
