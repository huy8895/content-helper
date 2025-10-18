// =================================================================
// CONSTANTS FOR HTML
// =================================================================

const PANEL_HTML = `
  <h3 class="ts-title">📌 Google AI Studio Settings</h3>
  
  <!-- === PROFILE MANAGEMENT UI === -->
  <div class="profile-manager">
    <select id="profile-select" class="form-control"></select>
    <button id="delete-profile-btn" title="Delete selected profile">🗑️</button>
  </div>
  <div class="profile-new">
    <input type="text" id="new-profile-name" class="form-control" placeholder="Tên profile mới...">
    <button id="save-as-new-btn" class="ts-btn">➕ Lưu mới</button>
  </div>
  <hr class="divider">
  <!-- === END PROFILE MANAGEMENT UI === -->

  <div id="profile-settings-form">
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
    <div class="form-group">
      <label for="style-instructions">Style instructions:</label>
      <textarea id="style-instructions" class="form-control" rows="3"></textarea>
    </div>
    <div class="form-group form-check">
      <label class="auto-set-label">
        <input type="checkbox" id="auto-set-value">
        Auto Set Value (cho profile này)
      </label>
    </div>
  </div>

  <button id="save-settings-btn" class="ts-btn ts-btn-accent" style="width: 100%; margin-top: 10px;">💾 Cập nhật Profile</button>
`;

// =================================================================
// THE REFACTORED CLASS
// =================================================================

window.GoogleAIStudioPanel = class {
  constructor(onClose) {
    this.onClose = onClose;
    this.storageKey = 'google_ai_studio_profiles'; // Đổi key lưu trữ
    this.profiles = {};
    this.activeProfileName = 'default';

    this._render();
    this.loadProfiles();
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

  attachEvents() {
    this.el.querySelector('#save-settings-btn').addEventListener('click', () => this.saveCurrentProfile());
    this.el.querySelector('#save-as-new-btn').addEventListener('click', () => this.saveAsNewProfile());
    this.el.querySelector('#delete-profile-btn').addEventListener('click', () => this.deleteSelectedProfile());
    this.el.querySelector('#profile-select').addEventListener('change', (e) => this.switchProfile(e.target.value));
  }

    // Tải tất cả profile từ storage
    loadProfiles() {
        chrome.storage.local.get([this.storageKey, "google_user_email"], async (items) => {
            const userId = items.google_user_email;
            const localData = items[this.storageKey] || {};
            const localActiveProfile = localData.activeProfileName || 'default'; // Lưu lại active profile của máy này

            let dataToProcess = localData;

            if (userId) {
                console.log("☁️ [GoogleAIStudioPanel] Attempting to load profiles from Firestore...");
                const helper = new FirestoreHelper(firebaseConfig);
                helper.collection = 'speech_profiles';
                try {
                    const firestoreData = await helper.loadUserConfig(userId);
                    if (firestoreData && firestoreData.profiles) {
                        console.log("☁️ [GoogleAIStudioPanel] Loaded profiles from Firestore.");
                        // Ghi đè profiles từ firestore, nhưng giữ lại active name của local
                        dataToProcess = {
                            profiles: firestoreData.profiles,
                            activeProfileName: localActiveProfile
                        };
                        // Cập nhật lại local storage với bộ profiles mới nhất
                        this.profiles = dataToProcess.profiles;
                        this.activeProfileName = dataToProcess.activeProfileName;
                        this.saveAllDataToStorage();
                    }
                } catch (err) {
                    console.error("❌ [GoogleAIStudioPanel] Error loading from Firestore:", err);
                }
            }

            this.profiles = dataToProcess.profiles || {'default': {}};
            this.activeProfileName = dataToProcess.activeProfileName || 'default';
            this.updateProfileDropdown();
            this.fillFormWithProfile(this.activeProfileName);
        });
    }  // Cập nhật dropdown chọn profile
  updateProfileDropdown() {
    const select = this.el.querySelector('#profile-select');
    select.innerHTML = '';
    Object.keys(this.profiles).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
    select.value = this.activeProfileName;
  }

  // Điền dữ liệu từ một profile vào form
  fillFormWithProfile(profileName) {
    const profileData = this.profiles[profileName] || {};
    this.el.querySelector('#input-value1').value = profileData.InputValue1 || '';
    this.el.querySelector('#input-value2').value = profileData.InputValue2 || '';
    this.el.querySelector('#voice1').value = profileData.Voice1 || '';
    this.el.querySelector('#voice2').value = profileData.Voice2 || '';
    this.el.querySelector('#style-instructions').value = profileData.styleInstructions || '';
    this.el.querySelector('#auto-set-value').checked = profileData.autoSetValue || false;
  }

// Sửa hàm này trong GoogleAIStudioPanel.js
    switchProfile(profileName) {
        this.activeProfileName = profileName;
        this.fillFormWithProfile(profileName);
        // Chỉ cần lưu lại trạng thái active mới vào local, không cần sync to firestore
        this.saveAllDataToStorage();
    }

  // Thu thập dữ liệu từ form
  collectDataFromForm() {
    return {
      InputValue1: this.el.querySelector('#input-value1').value,
      InputValue2: this.el.querySelector('#input-value2').value,
      Voice1: this.el.querySelector('#voice1').value,
      Voice2: this.el.querySelector('#voice2').value,
      styleInstructions: this.el.querySelector('#style-instructions').value,
      autoSetValue: this.el.querySelector('#auto-set-value').checked,
    };
  }

  // Lưu toàn bộ cấu trúc profile vào storage
    saveAllDataToStorage(callback) {
        const dataToSave = {
            profiles: this.profiles,
            activeProfileName: this.activeProfileName,
        };
        // Chỉ lưu vào local storage
        chrome.storage.local.set({ [this.storageKey]: dataToSave }, callback);
    }

  // Cập nhật profile hiện tại
// Thay thế hàm saveCurrentProfile()
  saveCurrentProfile() {
    const currentData = this.collectDataFromForm();
    this.profiles[this.activeProfileName] = currentData;
    this.saveAllDataToStorage(() => {
      alert(`Profile "${this.activeProfileName}" đã được cập nhật!`);
      this._syncToFirestore(); // <-- GỌI HÀM SYNC Ở ĐÂY
    });
  }

  // Lưu thành một profile mới
// Thay thế hàm saveAsNewProfile()

  saveAsNewProfile() {
    const newName = this.el.querySelector('#new-profile-name').value.trim();
    if (!newName) {
      return alert("Vui lòng nhập tên cho profile mới.");
    }
    if (this.profiles[newName]) {
      return alert("Tên profile này đã tồn tại.");
    }
    const currentData = this.collectDataFromForm();
    this.profiles[newName] = currentData;
    this.activeProfileName = newName;
    this.saveAllDataToStorage(() => {
      alert(`Đã lưu profile mới: "${newName}"`);
      this.el.querySelector('#new-profile-name').value = '';
      this.updateProfileDropdown();
      this._syncToFirestore(); // <-- GỌI HÀM SYNC Ở ĐÂY
    });
  }
  // Xóa profile đang được chọn
// Thay thế hàm deleteSelectedProfile()

  deleteSelectedProfile() {
    const profileToDelete = this.el.querySelector('#profile-select').value;
    if (Object.keys(this.profiles).length <= 1) {
      return alert("Không thể xóa profile cuối cùng.");
    }
    if (confirm(`Bạn có chắc muốn xóa profile "${profileToDelete}"?`)) {
      delete this.profiles[profileToDelete];
      this.activeProfileName = Object.keys(this.profiles)[0];
      this.saveAllDataToStorage(() => {
        alert(`Đã xóa profile: "${profileToDelete}"`);
        this.updateProfileDropdown();
        this.fillFormWithProfile(this.activeProfileName);
        this._syncToFirestore(); // <-- GỌI HÀM SYNC Ở ĐÂY
      });
    }
  }
  destroy() {
    this.el?.remove();
    this.onClose?.();
  }

  // =================================================================
  // STATIC HELPERS - CẬP NHẬT ĐỂ ĐỌC TỪ PROFILE
  // =================================================================

  static triggerAutoSet() {
    const storageKey = 'google_ai_studio_profiles';
    chrome.storage.local.get([storageKey], (result) => {
      const data = result[storageKey] || {};
      const activeProfileName = data.activeProfileName || 'default';
      const activeProfile = (data.profiles || {})[activeProfileName];

      if (activeProfile && activeProfile.autoSetValue) {
        console.log(`✅ Auto Set enabled for profile "${activeProfileName}". Running script...`);
        GoogleAIStudioPanel.setValueScript(activeProfile);
      } else {
        console.log(`ℹ️ Auto Set is disabled for profile "${activeProfileName}".`);
      }
    });
  }


    static async setValueScript(settings) {
        console.log("[Static] start setValueScript: ", settings);

        try {
            // Đợi cho việc chọn Voice 1 hoàn thành
            await GoogleAIStudioPanel.selectVoice(1, settings.Voice1);

            // Sau khi Voice 1 xong, mới bắt đầu chọn Voice 2
            await GoogleAIStudioPanel.selectVoice(2, settings.Voice2);

            // Các hành động khác có thể chạy song song vì chúng không xung đột
            GoogleAIStudioPanel.setInputValueByAriaLabelAndIndex('Speaker name', settings.InputValue1, 0);
            GoogleAIStudioPanel.setInputValueByAriaLabelAndIndex('Speaker name', settings.InputValue2, 1);
            GoogleAIStudioPanel.setTextareaValueByAriaLabel('Style instructions', settings.styleInstructions);

            console.log("✅ All auto-set actions completed.");

        } catch (error) {
            console.error("❌ An error occurred during auto-set script:", error);
        }
    }
// Thay thế hàm này trong file GoogleAIStudioPanel.js
    /**
     * Chọn một giọng nói cho một Speaker cụ thể dựa trên giao diện mới.
     * @param {number} speakerIndex - Chỉ số của speaker (1 hoặc 2).
     * @param {string} voiceName - Tên của giọng nói cần chọn.
     */
    static selectVoice(speakerIndex, voiceName) {
        // Trả về một Promise để đảm bảo tính tuần tự
        return new Promise((resolve, reject) => {
            if (!voiceName) {
                return resolve();
            }

            console.log(`[Static] Bắt đầu chọn giọng "${voiceName}" cho Speaker ${speakerIndex}...`);

            setTimeout(() => {
                const allSpeakerPanels = document.querySelectorAll('mat-expansion-panel.speaker-settings-container');
                const targetPanel = allSpeakerPanels[speakerIndex - 1];
                if (!targetPanel) {
                    console.error(`Không tìm thấy khối cài đặt cho Speaker ${speakerIndex}`);
                    return reject(new Error(`Không tìm thấy Speaker ${speakerIndex}`));
                }

                const trigger = targetPanel.querySelector('mat-select');
                if (!trigger) {
                    console.error(`Không tìm thấy nút chọn giọng nói bên trong Speaker ${speakerIndex}`);
                    return reject(new Error(`Không tìm thấy dropdown cho Speaker ${speakerIndex}`));
                }

                // Mở dropdown
                trigger.click();

                // Đợi popup options xuất hiện
                const checkOptionsPanel = setInterval(() => {
                    const optionsPanel = document.querySelector('div.cdk-overlay-container div[role="listbox"]');
                    if (optionsPanel) {
                        clearInterval(checkOptionsPanel);

                        const options = optionsPanel.querySelectorAll('mat-option');
                        let foundAndClicked = false;

                        for (let option of options) {
                            // === THAY ĐỔI QUAN TRỌNG NHẤT LÀ Ở ĐÂY ===
                            // 1. Tìm chính xác div.name bên trong mỗi option
                            const nameElement = option.querySelector('div.name');

                            if (nameElement && nameElement.textContent.trim().toLowerCase() === voiceName.toLowerCase()) {
                                console.log(`✅ [Static] Tìm thấy div.name cho "${voiceName}". Đang click...`);

                                // 2. Click trực tiếp vào div.name đó
                                nameElement.click();

                                foundAndClicked = true;
                                break;
                            }
                        }

                        if (foundAndClicked) {
                            resolve(); // Báo hiệu đã xong
                        } else {
                            console.error(`❌ [Static] Không tìm thấy giọng nói "${voiceName}" trong danh sách.`);
                            // Thử đóng dropdown lại nếu không tìm thấy
                            document.body.click();
                            reject(new Error(`Không tìm thấy giọng "${voiceName}"`));
                        }
                    }
                }, 100);
            }, 400);
        });
    }
    static setInputValueByAriaLabelAndIndex(labelText, valueToSet, index) {
     if (!valueToSet) return;
     setTimeout(() => {
        const selector = `input[aria-label="${labelText}"]`;
        const elements = document.querySelectorAll(selector);
        if (index < elements.length) {
            elements[index].value = valueToSet;
            elements[index].dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, 500);
  }
  static setTextareaValueByAriaLabel(labelText, valueToSet) {
    if (!valueToSet) return;
    setTimeout(() => {
        const selector = `textarea[aria-label="${labelText}"]`;
        const element = document.querySelector(selector);
        if (element) {
            element.value = valueToSet;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, 500);
  }
  static insertSpeechPageButton() {
     // Giữ nguyên hàm này không đổi
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
     Object.assign(container.style, { position: 'fixed', bottom: '20px', left: '20px', zIndex: '2147483647' });
     Object.assign(btn.style, { borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', overflow: 'hidden', transition: 'width 0.3s ease, padding 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'move' });
     const expandedText = "⚙️ Settings", collapsedText = "⚙️";
     const updateButtonState = (isHovering) => {
         if (container.dataset.isDragging === 'true') return;
         if (isHovering) {
             btn.innerHTML = expandedText; btn.style.width = '130px'; btn.style.padding = '12px 20px';
         } else {
             btn.innerHTML = collapsedText; btn.style.width = '48px'; btn.style.padding = '12px';
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
                 if (btn.matches(':hover')) { updateButtonState(true); }
             }, 50);
         };
         document.addEventListener('mousemove', onMouseMove);
         document.addEventListener('mouseup', onMouseUp);
     });
     container.appendChild(btn);
     document.body.appendChild(container);
     setTimeout(() => { btn.innerHTML = expandedText; updateButtonState(false); }, 100);
   }

   // Thêm hàm mới này vào class GoogleAIStudioPanel

// Thay thế hàm này trong GoogleAIStudioPanel.js
    _syncToFirestore() {
        console.log("☁️ [GoogleAIStudioPanel] Syncing PROFILES ONLY to Firestore...");
        chrome.storage.local.get(["google_user_email"], async (items) => {
            const userId = items.google_user_email;
            if (!userId) return;

            const helper = new FirestoreHelper(firebaseConfig);
            helper.collection = 'speech_profiles';

            try {
                // Chỉ đồng bộ object profiles, không đồng bộ activeProfileName
                await helper.saveUserConfig(userId, {profiles: this.profiles});
                console.log("☁️ Profiles synced to Firestore successfully.");
            } catch (err) {
                console.error("❌ Error syncing profiles to Firestore:", err);
                alert("Lỗi khi đồng bộ profile lên Firestore.");
            }
        });
    }
}

