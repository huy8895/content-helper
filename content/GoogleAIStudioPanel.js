// =================================================================
// CONSTANTS FOR HTML
// =================================================================

const PANEL_HTML = `
  <h3 class="ts-title">📌 Google AI Studio Settings</h3>
  
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
    <label style="display: flex; align-items: center; cursor: pointer;">
      <input type="checkbox" id="auto-set-value" style="margin-right: 8px;">
      Auto Set Value
    </label>
  </div>

  <button id="save-settings-btn" class="ts-btn ts-btn-accent" style="width: 100%; margin-top: 10px;">Lưu</button>
`;

// =================================================================
// THE REFACTORED CLASS
// =================================================================

window.GoogleAIStudioPanel = class {
  constructor(onClose) {
    console.log("📢 GoogleAIStudioPanel constructed!");
    this.onClose = onClose;
    this.storageKey = 'google_ai_studio_settings';

    this._render();
    this.loadAndFillPanel(); // Chỉ tải và điền cho panel, không auto-set
  }

  _render() {
    this.el = document.createElement('div');
    this.el.id = "google-ai-studio-panel";
    this.el.className = "panel-box ts-panel";
    this.el.innerHTML = PANEL_HTML;

    ChatGPTHelper.mountPanel(this.el);
    ChatGPTHelper.makeDraggable(this.el, ".ts-title");
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());
    this.attachEvents();
  }

  destroy() {
    console.log("❌ [GoogleAIStudioPanel] destroy");
    this.el?.remove();
    this.onClose?.();
  }

  attachEvents() {
    this.el.querySelector('#save-settings-btn').addEventListener('click', () => {
      this.saveSetting();
    });
  }

  saveSetting() {
    const settings = {
      InputValue1: this.el.querySelector('#input-value1').value,
      InputValue2: this.el.querySelector('#input-value2').value,
      Voice1: this.el.querySelector('#voice1').value,
      Voice2: this.el.querySelector('#voice2').value,
      autoSetValue: this.el.querySelector('#auto-set-value').checked
    };

    chrome.storage.local.set({[this.storageKey]: settings}, () => {
      console.log('✅ Đã lưu thiết lập vào storage');
      alert('Settings saved!');
    });
  }

  // Hàm này chỉ để điền giá trị vào các ô input của panel
  loadAndFillPanel() {
    chrome.storage.local.get([this.storageKey], (result) => {
      const settings = result[this.storageKey] || {};
      if (this.el) {
        this.el.querySelector('#input-value1').value = settings.InputValue1 || '';
        this.el.querySelector('#input-value2').value = settings.InputValue2 || '';
        this.el.querySelector('#voice1').value = settings.Voice1 || '';
        this.el.querySelector('#voice2').value = settings.Voice2 || '';
        this.el.querySelector('#auto-set-value').checked = settings.autoSetValue || false;
      }
    });
  }

  // =================================================================
  // STATIC HELPERS - CÓ THỂ GỌI TỪ BÊN NGOÀI
  // =================================================================

  /**
   * Tải cài đặt và tự động điền vào trang nếu cần.
   * Có thể được gọi từ bất cứ đâu.
   */
  static triggerAutoSet() {
    console.log("🚀 [Static] Triggering Auto Set for Speech Page...");
    const storageKey = 'google_ai_studio_settings';
    chrome.storage.local.get([storageKey], (result) => {
      const settings = result[storageKey] || {};
      if (settings.autoSetValue) {
        console.log("✅ Auto Set is enabled. Running script...");
        GoogleAIStudioPanel.setValueScript(settings);
      } else {
        console.log("ℹ️ Auto Set is disabled.");
      }
    });
  }

  static setValueScript(settings) {
    console.log("[Static] start setValueScript: ", settings);
    GoogleAIStudioPanel.selectVoice(2, settings.Voice1);
    GoogleAIStudioPanel.selectVoice(3, settings.Voice2);
    GoogleAIStudioPanel.setInputValueByAriaLabelAndIndex('Speaker name', settings.InputValue1, 0);
    GoogleAIStudioPanel.setInputValueByAriaLabelAndIndex('Speaker name', settings.InputValue2, 1);
  }

  static selectVoice(matSelectId, voiceName) {
    if (!voiceName) return;
    // Đợi một chút để UI sẵn sàng
    setTimeout(() => {
        const trigger = document.querySelector(`#mat-select-${matSelectId}`);
        if (!trigger) {
          console.warn(`Could not find voice trigger for mat-select-${matSelectId}`);
          return;
        }
        trigger.click();

        const checkPanel = setInterval(() => {
          const panel = document.getElementById(`mat-select-${matSelectId}-panel`);
          if (panel) {
            clearInterval(checkPanel);
            const options = panel.querySelectorAll('.mdc-list-item');
            for (let option of options) {
              const nameElement = option.querySelector('.description .name');
              if (nameElement && nameElement.textContent.trim().toLowerCase() === voiceName.toLowerCase()) {
                option.click();
                console.log(`✅ [Static] Đã chọn giọng: ${voiceName} cho Speaker có mat-select-id là ${matSelectId}`);
                break;
              }
            }
          }
        }, 200);
    }, 500); // Thêm độ trễ 500ms
  }

  static setInputValueByAriaLabelAndIndex(labelText, valueToSet, index) {
     if (!valueToSet) return;
     // Đợi một chút để UI sẵn sàng
     setTimeout(() => {
        const selector = `input[aria-label="${labelText}"]`;
        const allMatchingElements = document.querySelectorAll(selector);

        if (allMatchingElements.length === 0) {
          console.error(`[Static] Không tìm thấy phần tử input nào có aria-label là "${labelText}".`);
          return;
        }
        if (index >= allMatchingElements.length) {
          console.error(`[Static] Bạn muốn chọn phần tử thứ ${index + 1} (index=${index}), nhưng chỉ tìm thấy ${allMatchingElements.length} phần tử có aria-label là "${labelText}".`);
          return;
        }

        const inputElement = allMatchingElements[index];
        inputElement.value = valueToSet;
        inputElement.dispatchEvent(new Event('input', {bubbles: true}));
        inputElement.dispatchEvent(new Event('change', {bubbles: true}));
        console.log(`✅ [Static] Đã điền thành công giá trị "${valueToSet}" vào phần tử THỨ ${index + 1} có aria-label là "${labelText}".`);
    }, 500); // Thêm độ trễ 500ms
  }
}