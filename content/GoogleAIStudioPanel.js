// =================================================================
// CONSTANTS FOR HTML AND CSS
// Việc tách biệt này giúp code dễ đọc và quản lý hơn.
// =================================================================

/**
 * HTML structure for the settings panel.
 * All inline styles have been removed and are now handled by CSS.
 */
const PANEL_HTML = `
  <h4>📌 Google AI Studio Settings</h4>
  
  <div class="form-group">
    <label for="input-value1">InputValue 1:</label>
    <input id="input-value1" type="text" class="form-control">
  </div>

  <div class="form-group">
    <label for="input-value2">InputValue 2:</label>
    <input id="input-value2" type="text" class="form-control">
  </div>

  <div class="form-group">
    <label for="voice1">Voice 1:</label>
    <input id="voice1" type="text" class="form-control">
  </div>

  <div class="form-group">
    <label for="voice2">Voice 2:</label>
    <input id="voice2" type="text" class="form-control">
  </div>

  <div class="form-group form-check">
    <label>
      <input type="checkbox" id="auto-set-value">
      Auto Set Value
    </label>
  </div>

  <button id="save-settings-btn" class="btn-save">Lưu</button>
`;


/**
 * CSS styles for the panel (Light Theme).
 * This can be easily modified without touching the class logic.
 */
const PANEL_CSS = `
  #chatgpt-helper-ai-studio-panel {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    background: #ffffff;
    border: 1px solid #dcdcdc;
    border-radius: 10px;
    padding: 20px;
    z-index: 10000;
    box-shadow: 0 5px 15px rgba(0,0,0,0.15);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #333333;
    font-size: 14px;
    transition: all 0.3s ease-in-out;
  }
  
  #chatgpt-helper-ai-studio-panel h4 {
    margin: 0 0 15px;
    font-size: 16px;
    color: #111;
    font-weight: 600;
  }
  
  #chatgpt-helper-ai-studio-panel .form-group {
    margin-bottom: 12px;
  }
  
  #chatgpt-helper-ai-studio-panel .form-group.form-check {
    display: flex;
    align-items: center;
    margin-top: 15px;
  }
  
  #chatgpt-helper-ai-studio-panel label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #555;
  }
  
  #chatgpt-helper-ai-studio-panel .form-check label {
     margin-bottom: 0;
     cursor: pointer;
  }
  
  #chatgpt-helper-ai-studio-panel .form-control {
    width: 100%;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid #ccc;
    background-color: #f9f9f9;
    box-sizing: border-box; /* Important for consistent sizing */
    color: #333;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  #chatgpt-helper-ai-studio-panel .form-control:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  #chatgpt-helper-ai-studio-panel input[type="checkbox"] {
    margin-right: 8px;
    vertical-align: middle;
  }
  
  #chatgpt-helper-ai-studio-panel .btn-save {
    width: 100%;
    padding: 10px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  #chatgpt-helper-ai-studio-panel .btn-save:hover {
    background: #0056b3;
  }
`;

// =================================================================
// THE REFACTORED CLASS
// =================================================================

window.GoogleAIStudioPanel = class {
  constructor(adapter) {
    console.log("📢 GoogleAIStudioPanel constructed!");
    this.panelId = 'chatgpt-helper-ai-studio-panel';
    this.styleId = `${this.panelId}-styles`;
    this.storageKey = 'google_ai_studio_settings';
    this.adapter = adapter;
    this.init();
  }

  init() {
    this.injectStyles(); // Chèn CSS vào trang
    this.createPanel();  // Tạo panel HTML
    this.loadSettings();
    this.attachEvents();
  }

  toggleClosePanel() {
    console.log("💢 toggleClosePanel()  called")
    const panel = document.getElementById(this.panelId);
    if (panel) {
      panel.remove();
      return true;
    }
    this.init();
    return false;
  }

  /**
   * Injects the panel's CSS into the document's head.
   * Avoids duplicate injection by checking for an existing style element.
   */
  injectStyles() {
    if (document.getElementById(this.styleId)) {
      return; // CSS đã được chèn, không cần làm lại
    }
    const styleElement = document.createElement('style');
    styleElement.id = this.styleId;
    styleElement.textContent = PANEL_CSS;
    document.head.appendChild(styleElement);
  }

  createPanel() {
    // Nếu đã tồn tại thì không tạo lại
    if (document.getElementById(this.panelId)) {
      return;
    }

    const panel = document.createElement('div');
    panel.id = this.panelId;
    // HTML được lấy từ hằng số
    panel.innerHTML = PANEL_HTML;

    document.body.appendChild(panel);
  }

  attachEvents() {
    document.getElementById('save-settings-btn').addEventListener('click',
        () => {
          const settings = {
            InputValue1: document.getElementById('input-value1').value,
            InputValue2: document.getElementById('input-value2').value,
            Voice1: document.getElementById('voice1').value,
            Voice2: document.getElementById('voice2').value,
            autoSetValue: document.getElementById('auto-set-value').checked
          };

          chrome.storage.local.set({[this.storageKey]: settings}, () => {
            console.log('✅ Đã lưu thiết lập vào storage');
          });

          if (settings.autoSetValue) {
            this.setValueScript(settings);
          }
        });
  }

  loadSettings() {
    chrome.storage.local.get([this.storageKey], (result) => {
      const settings = result[this.storageKey] || {};
      document.getElementById('input-value1').value = settings.InputValue1
          || '';
      document.getElementById('input-value2').value = settings.InputValue2
          || '';
      document.getElementById('voice1').value = settings.Voice1 || '';
      document.getElementById('voice2').value = settings.Voice2 || '';
      document.getElementById('auto-set-value').checked = settings.autoSetValue
          || false;
    });
  }

  setValueScript(settings) {
    this.selectVoice(2, settings.Voice1);
    this.selectVoice(3, settings.Voice2);
    this.setInputValue(0, settings.InputValue1);
    this.setInputValue(1, settings.InputValue2);
  }

  selectVoice(matSelectId, voiceName) {
    if (!voiceName) return; // Không làm gì nếu tên giọng nói rỗng
    const trigger = document.querySelector(
        `#mat-select-${matSelectId} .mat-mdc-select-trigger`);
    if (!trigger) {
      console.warn(`Could not find voice trigger for mat-select-${matSelectId}`);
      return;
    }

    trigger.click();

    const checkPanel = setInterval(() => {
      const panel = document.getElementById(`mat-select-${matSelectId}-panel`);
      if (panel) {
        clearInterval(checkPanel);
        const options = panel.querySelectorAll('.gmat-body-medium');
        for (let option of options) {
          if (option.textContent.trim().toLowerCase()
              === voiceName.toLowerCase()) {
            option.closest('.mat-mdc-option').click();
            console.log(
                `✅ Đã chọn giọng: ${voiceName} cho Speaker ${matSelectId}`);
            break;
          }
        }
      }
    }, 200);
  }

  setInputValue(inputId, value) {
    const maxAttempts = 200;
    const attemptInterval = 10;
    let attemptCount = 0;

    const observer = new MutationObserver((mutations, obs) => {
      const input = document.getElementById(`mat-input-${inputId}`);
      if (input) {
        input.value = value;
        ['input', 'change', 'blur'].forEach(eventType => {
          const event = new Event(eventType, {bubbles: true});
          input.dispatchEvent(event);
        });
        console.log(`✅ Đã điền giá trị "${value}" vào #mat-input-${inputId}`);
        obs.disconnect();
      } else if (attemptCount >= maxAttempts) {
        console.error(
            `❌ Không tìm thấy input #mat-input-${inputId} sau ${maxAttempts} lần thử`);
        obs.disconnect();
      }
    });

    observer.observe(document.body, {childList: true, subtree: true});
  }
}