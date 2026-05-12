// =================================================================
// CONSTANTS FOR HTML
// =================================================================

const SPEECH_PANEL_HTML = `
  <div class="ts-title flex items-center mb-4 cursor-move select-none">
    <span class="text-xl mr-2">🎙️</span>
    <div>
      <h3 class="m-0 text-base font-bold text-gray-900 leading-tight">AI Studio Speech Settings</h3>
      <div class="text-[10px] text-gray-500 font-medium tracking-tight">Profile & Automation Config</div>
    </div>
  </div>
  
  <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
    <div class="flex items-center justify-between mb-2 pl-1">
      <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Profile Cài đặt</label>
      <div class="flex gap-2">
         <button id="gaisp-new-profile" class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">➕ Mới</button>
         <button id="gaisp-delete-profile" class="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition-colors">🗑️ Xóa</button>
      </div>
    </div>
    <div class="flex gap-2 mb-3">
      <div id="profile-dropdown-container" class="custom-dropdown-container flex-1">
        <button id="profile-dropdown-trigger" class="custom-dropdown-trigger">
          <span id="profile-selected-text">Tải Profile...</span>
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div id="profile-dropdown-menu" class="custom-dropdown-menu custom-scrollbar"></div>
      </div>
    </div>
    
    <div id="gaisp-new-profile-group" class="hidden flex gap-2 animate-in">
      <input type="text" id="new-profile-name" class="flex-1 h-8 px-2 text-sm border border-gray-200 rounded-md bg-white focus:border-indigo-500 outline-none transition-all" placeholder="Tên profile mới...">
      <button id="save-as-new-btn" class="h-8 px-3 bg-indigo-50 text-indigo-600 font-bold rounded-md text-[10px] hover:bg-indigo-100 transition-all active:scale-95">Lưu</button>
    </div>
  </div>

  <div id="profile-settings-form" class="space-y-3 mb-4">
    <div class="grid grid-cols-2 gap-3">
      <div class="form-group">
        <label for="input-value1" class="text-[10px] font-bold text-gray-400 uppercase mb-1 block pl-1">Speaker 1</label>
        <input id="input-value1" type="text" class="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm">
      </div>
      <div class="form-group">
        <label for="input-value2" class="text-[10px] font-bold text-gray-400 uppercase mb-1 block pl-1">Speaker 2</label>
        <input id="input-value2" type="text" class="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm">
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="form-group">
        <label for="voice1" class="text-[10px] font-bold text-gray-400 uppercase mb-1 block pl-1">Voice 1</label>
        <input id="voice1" type="text" class="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="Aoede">
      </div>
      <div class="form-group">
        <label for="voice2" class="text-[10px] font-bold text-gray-400 uppercase mb-1 block pl-1">Voice 2</label>
        <input id="voice2" type="text" class="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="Charon">
      </div>
    </div>

    <div class="form-group">
      <label for="style-instructions" class="text-[10px] font-bold text-gray-400 uppercase mb-1 block pl-1">Style instructions (Sample Context)</label>
      <textarea id="style-instructions" class="w-full h-20 p-2 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-y shadow-sm" placeholder="Nhập hướng dẫn phong cách..."></textarea>
    </div>

    <div class="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-white hover:border-emerald-100 transition-all group">
        <label class="flex items-center justify-between w-full cursor-pointer select-none">
          <span class="text-xs font-bold text-gray-700 group-hover:text-emerald-700 transition-colors">Tự động cấu hình (Auto Set)</span>
          <input type="checkbox" id="auto-set-value" class="ts-switch">
        </label>
    </div>
  </div>

  <button id="save-settings-btn" class="w-full h-[42px] flex-shrink-0 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-xl text-[13px] hover:bg-indigo-100 transition-all active:scale-95 flex items-center justify-center shadow-sm">
    Cập nhật Profile
  </button>
`;

// =================================================================
// THE REFACTORED CLASS FOR NEW SPEECH UI
// =================================================================

window.GoogleAIStudioSpeechPanel = class {
  constructor(onClose) {
    this.onClose = onClose;
    // Dùng chung storageKey với bản cũ để giữ nguyên data user
    this.storageKey = 'google_ai_studio_profiles';
    this.profiles = {};
    this.activeProfileName = 'default';

    this._render();
    this.loadProfiles();
  }

  _render() {
    this.el = document.createElement('div');
    this.el.id = "google-ai-studio-speech-panel";
    this.el.className = "ts-panel animate-in";
    this.el.innerHTML = SPEECH_PANEL_HTML;

    ContentHelper.mountPanel(this.el);
    ContentHelper.makeDraggable(this.el, ".ts-title");
    ContentHelper.addCloseButton(this.el, () => this.destroy());
    this.attachEvents();
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

  loadProfiles() {
    chrome.storage.local.get([this.storageKey, "google_user_email"], async (items) => {
      const userId = items.google_user_email;
      let localData = items[this.storageKey] || {};

      if (userId) {
        console.log("☁️ [SpeechPanel] Attempting to load profiles from Firestore...");
        const helper = new FirestoreHelper(firebaseConfig);
        helper.collection = 'speech_profiles';
        try {
          const firestoreData = await helper.loadUserConfig(userId);
          if (firestoreData && firestoreData.profiles) {
            console.log("☁️ Loaded profiles from Firestore.");
            localData = firestoreData;
            chrome.storage.local.set({ [this.storageKey]: firestoreData });
          }
        } catch (err) {
          console.error("❌ Error loading profiles from Firestore:", err);
        }
      }

      this.profiles = localData.profiles || { 'default': {} };
      this.activeProfileName = localData.activeProfileName || 'default';
      this.updateProfileDropdown();
      this.fillFormWithProfile(this.activeProfileName);
    });
  }

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
        ${name === this.activeProfileName ? '<span class="text-indigo-500">✓</span>' : ''}
      `;
      item.onclick = () => {
        this.switchProfile(name);
        menu.classList.remove('show');
      };
      menu.appendChild(item);
    });
  }

  fillFormWithProfile(profileName) {
    const profileData = this.profiles[profileName] || {};
    this.el.querySelector('#input-value1').value = profileData.InputValue1 || '';
    this.el.querySelector('#input-value2').value = profileData.InputValue2 || '';
    this.el.querySelector('#voice1').value = profileData.Voice1 || '';
    this.el.querySelector('#voice2').value = profileData.Voice2 || '';
    this.el.querySelector('#style-instructions').value = profileData.styleInstructions || '';
    this.el.querySelector('#auto-set-value').checked = profileData.autoSetValue || false;
  }

  switchProfile(profileName) {
    this.activeProfileName = profileName;
    this.fillFormWithProfile(profileName);
    this.updateProfileDropdown();
    this.saveAllDataToStorage();
  }

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

  saveAllDataToStorage(callback) {
    const dataToSave = {
      profiles: this.profiles,
      activeProfileName: this.activeProfileName,
    };
    chrome.storage.local.set({ [this.storageKey]: dataToSave }, callback);
  }

  saveCurrentProfile() {
    const currentData = this.collectDataFromForm();
    this.profiles[this.activeProfileName] = currentData;
    this.saveAllDataToStorage(() => {
      ContentHelper.showToast(`Profile "${this.activeProfileName}" đã được cập nhật!`, "success");
      this._syncToFirestore();
    });
  }

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
    this.profiles[newName] = this.collectDataFromForm();
    this.activeProfileName = newName;
    this.saveAllDataToStorage(() => {
      ContentHelper.showToast(`Đã lưu profile mới: "${newName}"`, "success");
      this.el.querySelector('#new-profile-name').value = '';
      this.updateProfileDropdown();
      this._syncToFirestore();
    });
  }

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
        this._syncToFirestore();
      });
    }
  }

  destroy() {
    this.el?.remove();
    this.onClose?.();
  }

  // =================================================================
  // STATIC HELPERS FOR NEW AI STUDIO UI
  // =================================================================

  static triggerAutoSet() {
    const storageKey = 'google_ai_studio_profiles';
    chrome.storage.local.get([storageKey], async (result) => {
      const data = result[storageKey] || {};
      const activeProfileName = data.activeProfileName || 'default';
      const activeProfile = (data.profiles || {})[activeProfileName];

      if (activeProfile && activeProfile.autoSetValue) {
        console.log(`✅ [SpeechPanel] Auto Set enabled for profile "${activeProfileName}". Running script...`);

        // Bước 1: Tìm và click thẻ "The Energetic Co-Host"
        const cardClicked = await GoogleAIStudioSpeechPanel.clickPodcastCard();
        if (cardClicked) {
          console.log("⏳ [SpeechPanel] Waiting for the new UI to load...");
          await new Promise(r => setTimeout(r, 2000));
        }

        GoogleAIStudioSpeechPanel.setValueScript(activeProfile);
      } else {
        console.log(`ℹ️ Auto Set is disabled for profile "${activeProfileName}".`);
      }
    });
  }

  static async clickPodcastCard() {
    const titleSpans = Array.from(document.querySelectorAll('.title-text'));
    for (const span of titleSpans) {
      if (span.textContent.trim() === 'The Energetic Co-Host') {
        const card = span.closest('mat-card-content') || span.closest('.display-media-container')?.parentElement;
        if (card) {
          console.log("✅ [SpeechPanel] Found 'The Energetic Co-Host' card. Clicking...");
          card.click();
          return true;
        }
      }
    }
    console.log("ℹ️ [SpeechPanel] 'The Energetic Co-Host' card not found. Proceeding to set values...");
    return false;
  }

  static async setValueScript(settings) {
    console.log("[Static] start setValueScript: ", settings);

    try {
      // Đợi cho việc chọn Voice 1 hoàn thành
      await GoogleAIStudioSpeechPanel.selectVoice(0, settings.Voice1);

      // Sau khi Voice 1 xong, mới bắt đầu chọn Voice 2
      await GoogleAIStudioSpeechPanel.selectVoice(1, settings.Voice2);

      // Cập nhật tên Speaker
      GoogleAIStudioSpeechPanel.setSpeakerName(0, settings.InputValue1);
      GoogleAIStudioSpeechPanel.setSpeakerName(1, settings.InputValue2);

      // Cập nhật Style Instructions (Sample Context)
      GoogleAIStudioSpeechPanel.setTextareaValueByAriaLabel('Sample Context', settings.styleInstructions);

      console.log("✅ [SpeechPanel] All auto-set actions completed.");

    } catch (error) {
      console.error("❌ [SpeechPanel] An error occurred during auto-set script:", error);
    }
  }

  /**
   * Chọn một giọng nói cho một Speaker cụ thể dựa trên giao diện mới.
   * @param {number} speakerIndex - Chỉ số của speaker (0 hoặc 1).
   * @param {string} voiceName - Tên của giọng nói cần chọn.
   */
  static selectVoice(speakerIndex, voiceName) {
    return new Promise((resolve, reject) => {
      if (!voiceName) {
        return resolve();
      }

      console.log(`[Static] Bắt đầu chọn giọng "${voiceName}" cho Speaker index ${speakerIndex}...`);

      let attempts = 0;
      const maxAttempts = 50; // 5 seconds

      const pollInterval = setInterval(() => {
        attempts++;

        const allVoiceSettings = document.querySelectorAll('ms-voice-settings');
        const targetSetting = allVoiceSettings[speakerIndex];

        if (targetSetting) {
          clearInterval(pollInterval);
          console.log(`✅ [Static] Đã tìm thấy ms-voice-settings cho Speaker index ${speakerIndex}`);

          // Tìm nút mở dropdown: active-voice-card-trigger
          const trigger = targetSetting.querySelector('.active-voice-card-trigger');
          if (!trigger) {
            console.error(`Không tìm thấy trigger bên trong ms-voice-settings của Speaker index ${speakerIndex}`);
            return reject(new Error(`Không tìm thấy trigger cho Speaker index ${speakerIndex}`));
          }

          // Mở dropdown panel
          console.log("Clicking voice trigger...");
          trigger.click();

          // Đợi panel options xuất hiện ở cột phải
          let optionAttempts = 0;
          const checkOptionsPanel = setInterval(() => {
            optionAttempts++;
            // Tìm tất cả các element có text giống voiceName trong toàn màn hình (vì panel right trượt ra)
            // Có thể là span, h2, div, class title, voice-name
            const possibleElements = Array.from(document.querySelectorAll('span, div, h2, button, mat-option'));

            let foundAndClicked = false;
            for (let el of possibleElements) {
              const cleanText = el.textContent.replace(/\s+/g, ' ').trim();
              if (cleanText.toLowerCase() === voiceName.toLowerCase() ||
                (cleanText.toLowerCase().includes(voiceName.toLowerCase()) && el.children.length === 0)) { // Ưu tiên node lá

                // Đi lên để tìm element có thể click được
                const clickable = el.closest('button') || el.closest('.model-selector-card') || el.closest('mat-option') || el;
                console.log(`✅ [Static] Tìm thấy giọng "${voiceName}". Đang click...`);
                clickable.click();
                foundAndClicked = true;
                break;
              }
            }

            if (foundAndClicked) {
              clearInterval(checkOptionsPanel);
              resolve();
            } else if (optionAttempts > 30) {
              clearInterval(checkOptionsPanel);
              console.error(`❌ [Static] Không tìm thấy giọng nói "${voiceName}" trong danh sách sau khi mở panel.`);
              // Đóng panel bằng cách click ra ngoài (body)
              document.body.click();
              reject(new Error(`Không tìm thấy giọng "${voiceName}"`));
            }
          }, 100);

        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          console.error(`❌ [Static] Timeout: Không tìm thấy ms-voice-settings cho Speaker index ${speakerIndex} sau 5s`);
          reject(new Error(`Timeout finding Speaker index ${speakerIndex}`));
        }
      }, 100);
    });
  }

  static setSpeakerName(index, valueToSet) {
    if (!valueToSet) return;
    setTimeout(() => {
      const allVoiceSettings = document.querySelectorAll('ms-voice-settings');
      if (index < allVoiceSettings.length) {
        const input = allVoiceSettings[index].querySelector('input[aria-label="Speaker name"]');
        if (input) {
          input.value = valueToSet;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
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
    console.log("🛠️ [SpeechPanel] insertSpeechPageButton called.");
    if (document.getElementById('content-helper-aistudio-speech-settings')) {
      return;
    }
    console.log("🛠️ [SpeechPanel] Creating Speech Settings button...");
    const container = document.createElement("div");
    container.id = "content-helper-button-container";
    const btn = document.createElement('button');
    btn.id = 'content-helper-aistudio-speech-settings';
    btn.textContent = '🎙️ Settings';
    btn.className = 'scenario-btn btn-tool';
    btn.addEventListener('click', (e) => {
      if (container.dataset.isDragging !== 'true') {
        window.__helperInjected?._toggleAIStudioSpeechSettings();
      }
    });
    Object.assign(container.style, { position: 'fixed', bottom: '20px', left: '20px', zIndex: '2147483647' });
    Object.assign(btn.style, { borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', overflow: 'hidden', transition: 'width 0.3s ease, padding 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'move' });
    const expandedText = "🎙️ Settings", collapsedText = "🎙️";
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
    console.log("✅ [SpeechPanel] Button injected to body.");
    setTimeout(() => { btn.innerHTML = expandedText; updateButtonState(false); }, 100);
  }

  _syncToFirestore() {
    console.log("☁️ [SpeechPanel] Syncing profiles to Firestore...");
    chrome.storage.local.get(["google_user_email"], async (items) => {
      const userId = items.google_user_email;

      if (!userId) {
        console.warn("⚠️ User not logged in with Google, cannot sync to Firestore.");
        return;
      }

      const helper = new FirestoreHelper(firebaseConfig);
      helper.collection = 'speech_profiles';

      try {
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
