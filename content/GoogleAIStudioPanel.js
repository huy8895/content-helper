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
    this.onClose = onClose; // 👈 Thêm onClose callback
    this.storageKey = 'google_ai_studio_settings';

    this._render(); // 👈 Render ngay khi khởi tạo

    // Tải cài đặt sau khi panel đã được render
    setTimeout(() => this.loadSettings(), 100);
  }

  _render() {
    this.el = document.createElement('div');
    this.el.id = "google-ai-studio-panel"; // Đặt ID nếu cần
    this.el.className = "panel-box ts-panel"; // 👈 SỬ DỤNG CLASS CHUNG
    this.el.innerHTML = PANEL_HTML;

    // 1. Dùng hệ thống panel chung
    ChatGPTHelper.mountPanel(this.el);

    // 2. Thêm chức năng kéo thả và nút đóng
    ChatGPTHelper.makeDraggable(this.el, ".ts-title");
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());

    // 3. Gắn sự kiện sau khi render
    this.attachEvents();
  }

  // Hàm destroy để tự dọn dẹp
  destroy() {
    console.log("❌ [GoogleAIStudioPanel] destroy");
    this.el?.remove();
    this.onClose?.(); // Gọi callback để báo cho ChatGPTHelper biết là đã đóng
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

  loadSettings() {
    console.log("start loadSettings..");
    chrome.storage.local.get([this.storageKey], (result) => {
      const settings = result[this.storageKey] || {};

      if (this.el) { // Kiểm tra panel có tồn tại không
        this.el.querySelector('#input-value1').value = settings.InputValue1 || '';
        this.el.querySelector('#input-value2').value = settings.InputValue2 || '';
        this.el.querySelector('#voice1').value = settings.Voice1 || '';
        this.el.querySelector('#voice2').value = settings.Voice2 || '';
        this.el.querySelector('#auto-set-value').checked = settings.autoSetValue || false;
      }

      console.log("done loadSettings.. settings: ", settings);
      if (settings.autoSetValue) {
        this.setValueScript(settings);
      }
    });
  }

  // --- Các hàm logic bên dưới giữ nguyên, không cần sửa ---

  setValueScript(settings) {
    console.log("start setValueScript: ", settings)
    this.selectVoice(2, settings.Voice1);
    this.selectVoice(3, settings.Voice2);
    this.setInputValueByAriaLabelAndIndex('Speaker name', settings.InputValue1, 0);
    this.setInputValueByAriaLabelAndIndex('Speaker name', settings.InputValue2, 1);
  }

  selectVoice(matSelectId, voiceName) {
    if (!voiceName) return;
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
            console.log(`✅ Đã chọn giọng: ${voiceName} cho Speaker có mat-select-id là ${matSelectId}`);
            break;
          }
        }
      }
    }, 200);
  }

  setInputValueByAriaLabelAndIndex(labelText, valueToSet, index) {
    const selector = `input[aria-label="${labelText}"]`;
    const allMatchingElements = document.querySelectorAll(selector);

    if (allMatchingElements.length === 0) {
      console.error(`Không tìm thấy phần tử input nào có aria-label là "${labelText}".`);
      return;
    }
    if (index >= allMatchingElements.length) {
      console.error(`Bạn muốn chọn phần tử thứ ${index + 1} (index=${index}), nhưng chỉ tìm thấy ${allMatchingElements.length} phần tử có aria-label là "${labelText}".`);
      return;
    }

    const inputElement = allMatchingElements[index];
    inputElement.value = valueToSet;
    inputElement.dispatchEvent(new Event('input', {bubbles: true}));
    inputElement.dispatchEvent(new Event('change', {bubbles: true}));
    console.log(`Đã điền thành công giá trị "${valueToSet}" vào phần tử THỨ ${index + 1} có aria-label là "${labelText}".`);
  }
}