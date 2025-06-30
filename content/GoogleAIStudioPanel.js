window.GoogleAIStudioPanel = class {
  constructor(adapter) {
    console.log("📢 GoogleAIStudioPanel constructed!")
    this.adapter = adapter;
    this.panelId = 'chatgpt-helper-ai-studio-panel';
    this.storageKey = 'google_ai_studio_settings';
    this.init();
  }

  init() {
    this.createPanel();
    this.loadSettings();
    this.attachEvents();
  }

  createPanel() {
    // Nếu đã tồn tại thì không tạo lại
    if (document.getElementById(this.panelId)) {
      return;
    }

    const panel = document.createElement('div');
    panel.id = this.panelId;
    panel.style = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 300px;
      background: #1e1e2f;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 15px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-family: Arial, sans-serif;
      color: white;
    `;

    panel.innerHTML = `
      <h4 style="margin: 0 0 10px; font-size: 14px;">📌 Google AI Studio Settings</h4>
      
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px;">InputValue 1:</label>
        <input id="input-value1" type="text" style="width: 100%; padding: 5px; border-radius: 4px; border: none;">
      </div>

      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px;">InputValue 2:</label>
        <input id="input-value2" type="text" style="width: 100%; padding: 5px; border-radius: 4px; border: none;">
      </div>

      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px;">Voice 1:</label>
        <input id="voice1" type="text" style="width: 100%; padding: 5px; border-radius: 4px; border: none;">
      </div>

      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px;">Voice 2:</label>
        <input id="voice2" type="text" style="width: 100%; padding: 5px; border-radius: 4px; border: none;">
      </div>

      <div style="margin-bottom: 10px;">
        <label>
          <input type="checkbox" id="auto-set-value"> Auto Set Value
        </label>
      </div>

      <button id="save-settings-btn" style="
        width: 100%;
        padding: 8px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      ">Lưu</button>
    `;

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
            this.injectAutoSetValueScript(settings);
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

  injectAutoSetValueScript(settings) {
        this.selectVoice(2, settings.Voice1);
        this.selectVoice(3, settings.Voice2);
        this.setInputValue(0, settings.InputValue1);
        this.setInputValue(1, settings.InputValue2);
  }

  selectVoice(matSelectId, voiceName) {
    const trigger = document.querySelector(
        `#mat-select-${matSelectId} .mat-mdc-select-trigger`);
    if (!trigger) {
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