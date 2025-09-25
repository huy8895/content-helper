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
      let localData = items[this.storageKey] || {};

      // Nếu người dùng đã đăng nhập, thử tải từ Firestore
      if (userId) {
        console.log("☁️ Attempting to load profiles from Firestore...");
        const helper = new FirestoreHelper(firebaseConfig);
        helper.collection = 'speech_profiles';
        try {
          const firestoreData = await helper.loadUserConfig(userId);
          // Nếu có dữ liệu trên Firestore, nó sẽ được ưu tiên
          if (firestoreData && firestoreData.profiles) {
            console.log("☁️ Loaded profiles from Firestore.");
            localData = firestoreData;
            // Cập nhật lại local storage với dữ liệu từ Firestore
            chrome.storage.local.set({ [this.storageKey]: firestoreData });
          } else {
             console.log("☁️ No profiles found on Firestore for this user.");
          }
        } catch (err) {
          console.error("❌ Error loading profiles from Firestore:", err);
        }
      }

      // Tiếp tục xử lý với dữ liệu đã có (từ Firestore hoặc local)
      this.profiles = localData.profiles || { 'default': {} };
      this.activeProfileName = localData.activeProfileName || 'default';
      this.updateProfileDropdown();
      this.fillFormWithProfile(this.activeProfileName);
    });
  }
  // Cập nhật dropdown chọn profile
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

  // Chuyển đổi profile
  switchProfile(profileName) {
    this.activeProfileName = profileName;
    this.fillFormWithProfile(profileName);
    this.saveAllDataToStorage(); // Lưu lại profile đang active
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

  // Các hàm static còn lại không cần thay đổi, chỉ cần đảm bảo chúng được gọi đúng
  static setValueScript(settings) {
    GoogleAIStudioPanel.selectVoice(2, settings.Voice1);
    GoogleAIStudioPanel.selectVoice(3, settings.Voice2);
    GoogleAIStudioPanel.setInputValueByAriaLabelAndIndex('Speaker name', settings.InputValue1, 0);
    GoogleAIStudioPanel.setInputValueByAriaLabelAndIndex('Speaker name', settings.InputValue2, 1);
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
                  const options = panel.querySelectorAll('.mdc-list-item .name');
                  for (let option of options) {
                      if (option.textContent.trim().toLowerCase() === voiceName.toLowerCase()) {
                          option.closest('.mdc-list-item').click();
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

  _syncToFirestore() {
    console.log("☁️ [GoogleAIStudioPanel] Syncing profiles to Firestore...");
    chrome.storage.local.get(["google_user_email"], async (items) => {
      const userId = items.google_user_email;

      if (!userId) {
        // Không hiện alert để tránh làm phiền, chỉ log ra console
        console.warn("⚠️ User not logged in with Google, cannot sync to Firestore.");
        return;
      }

      // Tạo một helper mới dành riêng cho việc lưu profile
      const helper = new FirestoreHelper(firebaseConfig);
      // Sử dụng một collection mới để tránh ghi đè dữ liệu kịch bản
      helper.collection = 'speech_profiles';

      try {
        // Lấy toàn bộ cấu trúc profile hiện tại để lưu
        const dataToSync = {
          profiles: this.profiles,
          activeProfileName: this.activeProfileName,
        };
        await helper.saveUserConfig(userId, dataToSync);
        console.log("☁️ Profiles synced to Firestore successfully.");
      } catch (err) {
        console.error("❌ Error syncing profiles to Firestore:", err);
        alert("Lỗi khi đồng bộ profile lên Firestore.");
      }
    });
  }
}

