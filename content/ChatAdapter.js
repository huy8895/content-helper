// ChatAdapters.js – one class per site, OOP‑style
// -----------------------------------------------------------------------------
// Put this single file in your `content/` folder and list it first inside the
// `js` array of each `content_scripts` block.  It attaches **window.ChatAdapter**
// (an *instance*, already initialised for the current host) or `null` if the
// site isn’t supported yet.
//
// ▶️  Usage in any other content‑script
// -----------------------------------------------------------------------------
//   const chat = window.ChatAdapter;
//   if (!chat) { /* optional fallback */ }
//   chat.getTextarea().value = "Hello";
//   chat.getSendBtn()?.click();
// ----------------------------------------------------------------------------

/* ---------------------------  Base (Abstract)  --------------------------- */
class BaseChatAdapter {
  constructor() {
    console.log("👨 BaseChatAdapter constructed")
    if (new.target === BaseChatAdapter) {
      throw new TypeError("BaseChatAdapter is abstract – use a subclass");
    }
  }

  /** Convenience DOM query (shadow‑dom‑safe extension point) */
  _q(sel) {
    return document.querySelector(sel);
  }

  /* ---- Mandatory interface (override in subclass) ---- */
  getTextarea() { throw new Error("getTextarea() not implemented"); }
  getContentElements() { throw new Error("getContentElements() not implemented"); }
  getSendBtn()  { throw new Error("getSendBtn() not implemented"); }
  isDone()  { throw new Error("isDone() not implemented"); }

  /* ---- Optional interface (override if the site supports it) ---- */
  getForm()     { return this.getTextarea() }
  getStopBtn()  { return null; }
  getVoiceBtn() { return null; }

  /* ---- Convenience helpers (shared across all adapters) ---- */
  sendMessage(text) {
    const ta = this.getTextarea();
    if (!ta) return false;
    ta.value = text;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    this.getSendBtn()?.click();
    return true;
  }

  stopGeneration() { this.getStopBtn()?.click(); }

  /* ---- Static matcher – each subclass MUST implement ---- */
  static matches(/* hostname */) { return false; }
}

/* -----------------------------  ChatGPT.com  ----------------------------- */
class ChatGPTAdapter extends BaseChatAdapter {
  static matches(host) {
    return /(?:chat\.openai|chatgpt)\.com$/i.test(host);
  }

  getTextarea() {
    return this._q("#prompt-textarea")
  }
  getSendBtn()  { return this._q('button[aria-label="Send prompt"]'); }
  getStopBtn()  { return this._q('button[aria-label="Stop generating"]'); }
  getVoiceBtn() { return this._q('button[aria-label="Start voice mode"]'); }

  isDone() {
    const stopBtn = this.getStopBtn();
    const sendBtn = this.getSendBtn();
    const voiceBtn = this.getVoiceBtn();
    const done = (!stopBtn && sendBtn && sendBtn.disabled) || (!stopBtn
        && voiceBtn);
    return done;
  }
  getForm() {
    return this.getTextarea()?.closest("form") ?? null;
  }

  getContentElements(){
    return Array.from(document.getElementsByClassName(
        'markdown prose dark:prose-invert w-full break-words'));
  }
}

/* ----------------------------  DeepSeek.com  ----------------------------- */
class DeepSeekAdapter extends BaseChatAdapter {
  static matches(host) { return /deepseek\.com$/i.test(host); }

  getTextarea () {
    // phần tử nhập chat duy nhất của DeepSeek
    return this._q('textarea#chat-input');
  }
  getSendBtn () {
    const root = this.getForm();
    if (!root) return null;

    /* trong root có nhiều [role="button"]; send-btn luôn là PHẦN TỬ CUỐI
       có thuộc tính aria-disabled (true/false).  Chọn nút đó để click. */
    const btns = [...root.querySelectorAll('[role="button"][aria-disabled]')];
    const btn  = btns.at(-1) || null;     // nút cuối là Send

    // Bọc thuộc tính disabled để ScenarioRunner đọc được
    if (btn && btn.disabled === undefined) {
      Object.defineProperty(btn, 'disabled', {
        get() { return btn.getAttribute('aria-disabled') === 'true'; },
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

    // tìm phần tử có icon _480132b rồi leo lên button
    const icon = root.querySelector('div._480132b');
    const btn = icon ? icon.closest('[role="button"]') : null;

    // bọc thuộc tính disabled (dựa trên aria-disabled) cho đồng nhất API
    if (btn && btn.disabled === undefined) {
      Object.defineProperty(btn, 'disabled', {
        get() {
          return btn.getAttribute('aria-disabled') === 'true';
        },
        configurable: true
      });
    }
    return btn;
  }  // DeepSeek places everything inside a <form>; inherit default getForm()

  isDone() {
    const sendBtn = this.getSendBtn();
    const stopBtn = this.getStopBtn();
    if(sendBtn ) {

    }
    return false;
  }

  /** Trả về DIV cách textare 3 tầng – KHÔNG dùng class cố định */
  getForm() {
    let el = this.getTextarea();
    for (let i = 0; i < 3 && el; i++) {
      // nhảy tới DIV cha liền kề
      do { el = el.parentElement; } while (el && el.tagName !== 'DIV');
    }
    return el ?? null;                       // null nếu không tìm được
  }
}

/* -----------------------  Adapter Factory (runtime)  ---------------------- */
const ADAPTER_CTORS = [ChatGPTAdapter, DeepSeekAdapter];
let active = null;

for (const Ctor of ADAPTER_CTORS) {
  console.log('get Ctor: ', Ctor)
  if (Ctor.matches(window.location.hostname)) {
    active = new Ctor();
    break;
  }
}

// Expose – every other script simply grabs the instance.
window.ChatAdapter = active;

// Optional: export class references for power users (tree‑shakable bundlers)
window.ChatAdapters = { BaseChatAdapter, ChatGPTAdapter, DeepSeekAdapter };

console.log("[Adapter factory] host =", window.location.hostname);
console.log("[Adapter factory] picked =", window.ChatAdapter?.constructor.name);
