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

  <!-- BỐ CỤC MỚI CHO STYLE INSTRUCTIONS -->
  <div class="form-group">
    <label for="style-instructions">Style instructions:</label>
    <textarea id="style-instructions" class="form-control" rows="3" 
              placeholder="e.g., Read this in a clear, friendly voice..."></textarea>
  </div>
  
  <!-- BỐ CỤC MỚI CHO AUTO SET VALUE -->
  <div class="form-group form-check">
    <label class="auto-set-label">
      <input type="checkbox" id="auto-set-value">
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
        this.loadAndFillPanel();
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
            // === LƯU GIÁ TRỊ MỚI ===
            styleInstructions: this.el.querySelector('#style-instructions').value,
            autoSetValue: this.el.querySelector('#auto-set-value').checked
        };

        chrome.storage.local.set({[this.storageKey]: settings}, () => {
            alert('Settings saved!');
        });
    }

    loadAndFillPanel() {
        chrome.storage.local.get([this.storageKey], (result) => {
            const settings = result[this.storageKey] || {};
            if (this.el) {
                this.el.querySelector('#input-value1').value = settings.InputValue1 || '';
                this.el.querySelector('#input-value2').value = settings.InputValue2 || '';
                this.el.querySelector('#voice1').value = settings.Voice1 || '';
                this.el.querySelector('#voice2').value = settings.Voice2 || '';
                // === ĐIỀN GIÁ TRỊ MỚI ===
                this.el.querySelector('#style-instructions').value = settings.styleInstructions || '';
                this.el.querySelector('#auto-set-value').checked = settings.autoSetValue || false;
            }
        });
    }

    // =================================================================
    // STATIC HELPERS - CÓ THỂ GỌI TỪ BÊN NGOÀI
    // =================================================================

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
        // === GỌI HÀM MỚI ĐỂ ĐIỀN STYLE ===
        GoogleAIStudioPanel.setTextareaValueByAriaLabel('Style instructions', settings.styleInstructions);
    }

    static selectVoice(matSelectId, voiceName) {
        if (!voiceName) return;
        setTimeout(() => {
            const trigger = document.querySelector(`#mat-select-${matSelectId}`);
            if (!trigger) return;
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
                            break;
                        }
                    }
                }
            }, 200);
        }, 500);
    }

    static setInputValueByAriaLabelAndIndex(labelText, valueToSet, index) {
        if (!valueToSet) return;
        setTimeout(() => {
            const selector = `input[aria-label="${labelText}"]`;
            const allMatchingElements = document.querySelectorAll(selector);
            if (index >= allMatchingElements.length) return;
            const inputElement = allMatchingElements[index];
            inputElement.value = valueToSet;
            inputElement.dispatchEvent(new Event('input', {bubbles: true}));
            inputElement.dispatchEvent(new Event('change', {bubbles: true}));
        }, 500);
    }

    // === HÀM HELPER STATIC MỚI CHO TEXTAREA ===
    static setTextareaValueByAriaLabel(labelText, valueToSet) {
        if (!valueToSet) return;
        setTimeout(() => {
            const selector = `textarea[aria-label="${labelText}"]`;
            const textareaElement = document.querySelector(selector);
            if (textareaElement) {
                textareaElement.value = valueToSet;
                // Kích hoạt các sự kiện để framework của trang web nhận diện thay đổi
                textareaElement.dispatchEvent(new Event('input', { bubbles: true }));
                textareaElement.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`✅ [Static] Đã điền thành công giá trị vào textarea[aria-label="${labelText}"].`);
            } else {
                console.error(`[Static] Không tìm thấy textarea có aria-label là "${labelText}".`);
            }
        }, 500);
    }
    // === KẾT THÚC HÀM MỚI ===

    // (Phần insertSpeechPageButton giữ nguyên không đổi)
    static insertSpeechPageButton() {
        if (document.getElementById('chatgpt-helper-aistudio-speech-settings')) return;
        const container = document.createElement("div");
        container.id = "chatgpt-helper-button-container";
        const btn = document.createElement('button');
        btn.id = 'chatgpt-helper-aistudio-speech-settings';
        btn.textContent = '⚙️ Settings';
        btn.className = 'scenario-btn btn-tool';
        btn.addEventListener('click', (e) => {
            if (container.dataset.isDragging !== 'true') {
                window.__helperInjected?._toggleAIStudioSettings();
            }
        });
        Object.assign(container.style, {
            position: 'fixed', bottom: '20px', left: '20px', zIndex: '2147483647',
        });
        Object.assign(btn.style, {
            borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap', overflow: 'hidden',
            transition: 'width 0.3s ease, padding 0.3s ease', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'move',
        });
        const expandedText = "⚙️ Settings", collapsedText = "⚙️";
        const updateButtonState = (isHovering) => {
            if (container.dataset.isDragging === 'true') return;
            if (isHovering) {
                btn.innerHTML = expandedText;
                btn.style.width = '130px';
                btn.style.padding = '12px 20px';
            } else {
                btn.innerHTML = collapsedText;
                btn.style.width = '48px';
                btn.style.padding = '12px';
            }
        };
        btn.addEventListener('mouseenter', () => updateButtonState(true));
        btn.addEventListener('mouseleave', () => updateButtonState(false));
        let shiftX = 0, shiftY = 0;
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            container.dataset.isDragging = 'false';
            const rect = container.getBoundingClientRect();
            shiftX = e.clientX - rect.left;
            shiftY = e.clientY - rect.top;
            const onMouseMove = (moveEvent) => {
                container.dataset.isDragging = 'true';
                container.style.left = `${moveEvent.clientX - shiftX}px`;
                container.style.top = `${moveEvent.clientY - shiftY}px`;
                container.style.bottom = 'auto';
                container.style.right = 'auto';
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                setTimeout(() => {
                    container.dataset.isDragging = 'false';
                    if (btn.matches(':hover')) {
                        updateButtonState(true);
                    }
                }, 50);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        container.appendChild(btn);
        document.body.appendChild(container);
        setTimeout(() => {
            btn.innerHTML = expandedText;
            updateButtonState(false);
        }, 100);
    }
}