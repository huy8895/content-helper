window.GoogleAIStudioPanel = class extends window.BasePanel {
  constructor(onClose) {
    super({
      id: "google-ai-studio-panel",
      title: "AI Studio Settings",
      icon: "⚙",
      onClose: onClose,
      view: window.GoogleAIStudioView
    });
    this.storageKey = 'google_ai_studio_profiles';
    this.profiles = {};
    this.activeProfileName = 'default';

    this.attachEvents();
    this.loadProfiles();
  }

  attachEvents() {
    this.el.querySelector('#save-settings-btn').addEventListener('click', () => this.saveCurrentProfile());
    this.el.querySelector('#save-as-new-btn').addEventListener('click', () => {
      this.saveAsNewProfile();
      this.el.querySelector('#gaisp-new-profile-group').classList.add('hidden');
    });
    this.el.querySelector('#gaisp-new-profile').addEventListener('click', () => {
      const group = this.el.querySelector('#gaisp-new-profile-group');
      group.classList.toggle('hidden');
      if (!group.classList.contains('hidden')) {
        const input = this.el.querySelector('#new-profile-name');
        input.value = '';
        input.focus();
      }
    });
    this.el.querySelector('#gaisp-delete-profile').addEventListener('click', () => this.deleteSelectedProfile());

    // Custom Dropdown Logic
    const trigger = this.el.querySelector('#profile-dropdown-trigger');
    const menu = this.el.querySelector('#profile-dropdown-menu');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      menu.classList.remove('show');
    });
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
    const trigger = this.el.querySelector('#profile-selected-text');
    const menu = this.el.querySelector('#profile-dropdown-menu');

    trigger.textContent = this.activeProfileName;
    menu.innerHTML = '';

    Object.keys(this.profiles).forEach(name => {
      const item = document.createElement('div');
      item.className = `custom-dropdown-item ${name === this.activeProfileName ? 'selected' : ''}`;
      item.innerHTML = `
        <span>${name}</span>
        ${name === this.activeProfileName ? '<span style="color: var(--ch-accent); font-weight: bold;">✓</span>' : ''}
      `;
      item.onclick = () => {
        this.switchProfile(name);
        menu.classList.remove('show');
      };
      menu.appendChild(item);
    });
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
    this.updateProfileDropdown();
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
      ContentHelper.showToast(`Profile "${this.activeProfileName}" đã được cập nhật!`, "success");
      this._syncToFirestore(); // <-- GỌI HÀM SYNC Ở ĐÂY
    });
  }

  // Lưu thành một profile mới
  // Thay thế hàm saveAsNewProfile()

  saveAsNewProfile() {
    const newName = this.el.querySelector('#new-profile-name').value.trim();
    if (!newName) {
      ContentHelper.showToast("Vui lòng nhập tên cho profile mới.", "warning");
      return;
    }
    if (this.profiles[newName]) {
      ContentHelper.showToast("Tên profile này đã tồn tại.", "warning");
      return;
    }
    this.profiles[newName] = currentData;
    this.activeProfileName = newName;
    this.saveAllDataToStorage(() => {
      ContentHelper.showToast(`Đã lưu profile mới: "${newName}"`, "success");
      this.el.querySelector('#new-profile-name').value = '';
      this.updateProfileDropdown();
      this._syncToFirestore(); // <-- GỌI HÀM SYNC Ở ĐÂY
    });
  }
  // Xóa profile đang được chọn
  // Thay thế hàm deleteSelectedProfile()

  deleteSelectedProfile() {
    const profileToDelete = this.activeProfileName;
    if (Object.keys(this.profiles).length <= 1) {
      ContentHelper.showToast("Không thể xóa profile cuối cùng.", "warning");
      return;
    }
    if (confirm(`Bạn có chắc muốn xóa profile "${profileToDelete}"?`)) {
      delete this.profiles[profileToDelete];
      this.activeProfileName = Object.keys(this.profiles)[0];
      this.saveAllDataToStorage(() => {
        ContentHelper.showToast(`Đã xóa profile: "${profileToDelete}"`, "success");
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

      let attempts = 0;
      const maxAttempts = 50; // 5 seconds

      const pollInterval = setInterval(() => {
        attempts++;

        // UPDATE: Tìm trực tiếp ms-voice-selector, đây là component chứa dropdown chọn giọng
        const allVoiceSelectors = document.querySelectorAll('ms-voice-selector');
        const targetSelector = allVoiceSelectors[speakerIndex - 1];

        if (targetSelector) {
          clearInterval(pollInterval);
          console.log(`✅ [Static] Đã tìm thấy ms-voice-selector cho Speaker ${speakerIndex}`);

          // Tìm mat-select bên trong
          const trigger = targetSelector.querySelector('mat-select');
          if (!trigger) {
            console.error(`Không tìm thấy mat-select bên trong ms-voice-selector của Speaker ${speakerIndex}`);
            return reject(new Error(`Không tìm thấy dropdown cho Speaker ${speakerIndex}`));
          }

          // Mở dropdown
          console.log("Dispatching mousedown and click...");
          trigger.dispatchEvent(new MouseEvent('mousedown'));
          trigger.click();

          // Đợi popup options xuất hiện
          let optionAttempts = 0;
          const checkOptionsPanel = setInterval(() => {
            optionAttempts++;
            // UPDATE: Tìm panel options dựa trên class cụ thể từ HTML user cung cấp
            // Class: mat-mdc-select-panel mdc-menu-surface--open
            const optionsPanel = document.querySelector('.mat-mdc-select-panel.mdc-menu-surface--open');

            if (optionsPanel) {
              clearInterval(checkOptionsPanel);
              console.log("✅ [Static] Đã tìm thấy options panel");

              const options = optionsPanel.querySelectorAll('mat-option');
              let foundAndClicked = false;

              for (let option of options) {
                // Tìm div.name hoặc class="name"
                const nameElement = option.querySelector('.name');

                // Fallback: Check text content
                const textToCheck = nameElement ? nameElement.textContent : option.textContent;
                // Clean text: remove newlines, extra spaces
                const cleanText = textToCheck.replace(/\s+/g, ' ').trim();

                if (cleanText.toLowerCase().includes(voiceName.toLowerCase())) {
                  console.log(`✅ [Static] Tìm thấy giọng "${voiceName}". Đang click...`);
                  option.click();
                  foundAndClicked = true;
                  break;
                }
              }

              if (foundAndClicked) {
                resolve();
              } else {
                console.error(`❌ [Static] Không tìm thấy giọng nói "${voiceName}" trong danh sách.`);
                // Đóng dropdown bằng cách click ra ngoài (body)
                document.body.click();
                reject(new Error(`Không tìm thấy giọng "${voiceName}"`));
              }
            } else if (optionAttempts > 30) {
              clearInterval(checkOptionsPanel);
              console.error("Timeout waiting for options panel");
              reject(new Error("Timeout waiting for options panel"));
            }
          }, 100);

        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          console.error(`❌ [Static] Timeout: Không tìm thấy ms-voice-selector cho Speaker ${speakerIndex} sau 5s`);
          console.log("Found selectors:", document.querySelectorAll('ms-voice-selector').length);
          reject(new Error(`Timeout finding Speaker ${speakerIndex}`));
        }
      }, 100);
    });
  }
  static setInputValueByAriaLabelAndIndex(labelText, valueToSet, index) {
    if (!valueToSet) return;
    setTimeout(() => {
      const selector = `input[aria-label="${labelText}"]`;
      const elements = document.querySelectorAll(selector);
      if (index < elements.length) {
        const el = elements[index];
        el.value = valueToSet;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
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
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 500);
  }
  static insertSpeechPageButton() {
    // Giữ nguyên hàm này không đổi
    if (document.getElementById('content-helper-aistudio-speech-settings')) return;
    const container = document.createElement("div");
    container.id = "content-helper-button-container";
    const btn = document.createElement('button');
    btn.id = 'content-helper-aistudio-speech-settings';
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
        console.error("❌ Firestore Sync Error:", err);
        ContentHelper.showToast("Lỗi khi đồng bộ profile lên Firestore.", "error");
      }
    });
  }
}
