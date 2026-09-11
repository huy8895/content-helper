window.GoogleAIStudioSpeechPanel = class extends window.BasePanel {
  constructor(onClose) {
    super({
      id: "google-ai-studio-speech-panel",
      title: "Speech Settings",
      icon: "🎙️",
      onClose: onClose,
      view: window.GoogleAIStudioSpeechView
    });
    // Dùng chung storageKey với bản cũ để giữ nguyên data user
    this.storageKey = 'google_ai_studio_profiles';
    this.profiles = {};
    this.activeProfileName = 'default';

    this.attachEvents();
    this.loadProfiles();
  }

  attachEvents() {
    this.el.querySelector('#save-settings-btn').addEventListener('click', () => this.saveCurrentProfile());
    this.el.querySelector('#apply-to-page-btn')?.addEventListener('click', async () => {
      const currentData = this.collectDataFromForm();
      ContentHelper.showToast("⏳ Đang điền cấu hình vào trang AI Studio...", "info");
      await GoogleAIStudioSpeechPanel.setValueScript(currentData);
      ContentHelper.showToast("✅ Đã điền cấu hình vào trang!", "success");
    });
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
    const container = this.el.querySelector('#profile-dropdown-container');

    if (trigger && menu) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden-dropdown');
      });

      this._onDocClick = (event) => {
        const path = event.composedPath ? event.composedPath() : [];
        if (!path.includes(container)) {
          menu.classList.add('hidden-dropdown');
        }
      };
      document.addEventListener('click', this._onDocClick);
    }
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

    if (!trigger || !menu) return;

    trigger.textContent = this.activeProfileName;
    menu.innerHTML = '';

    Object.keys(this.profiles).forEach(name => {
      const item = document.createElement('div');
      item.className = `custom-dropdown-item scenario-dropdown-item ts-item-row ${name === this.activeProfileName ? 'selected' : ''}`;
      item.innerHTML = `
        <span class="ts-group-tag">PROFILE</span>
        <span class="ts-item-row__text font-bold">${name}</span>
        ${name === this.activeProfileName ? '<span class="ts-selected-check font-bold">✓</span>' : ''}
      `;
      item.onclick = () => {
        this.switchProfile(name);
        menu.classList.add('hidden-dropdown');
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

    // Tương thích ngược: ưu tiên key mới (scene, sampleContext), fallback sang key cũ
    const sceneVal = profileData.scene !== undefined ? profileData.scene : (profileData.sceneInstructions || '');
    const sampleContextVal = profileData.sampleContext !== undefined ? profileData.sampleContext : (profileData.styleInstructions || '');

    const sceneEl = this.el.querySelector('#scene-instructions');
    if (sceneEl) sceneEl.value = sceneVal;

    const sampleContextEl = this.el.querySelector('#sample-context-instructions') || this.el.querySelector('#style-instructions');
    if (sampleContextEl) sampleContextEl.value = sampleContextVal;

    this.el.querySelector('#auto-set-value').checked = profileData.autoSetValue || false;
    this.el.querySelector('#auto-paste-clipboard').checked = profileData.autoPasteClipboard || false;
  }

  switchProfile(profileName) {
    this.activeProfileName = profileName;
    this.fillFormWithProfile(profileName);
    this.updateProfileDropdown();
    this.saveAllDataToStorage();
  }

  collectDataFromForm() {
    const sceneEl = this.el.querySelector('#scene-instructions');
    const sampleContextEl = this.el.querySelector('#sample-context-instructions') || this.el.querySelector('#style-instructions');
    const sceneVal = sceneEl ? sceneEl.value : '';
    const sampleContextVal = sampleContextEl ? sampleContextEl.value : '';

    return {
      InputValue1: this.el.querySelector('#input-value1').value,
      InputValue2: this.el.querySelector('#input-value2').value,
      Voice1: this.el.querySelector('#voice1').value,
      Voice2: this.el.querySelector('#voice2').value,
      scene: sceneVal,
      sampleContext: sampleContextVal,
      // Lưu song song key cũ để tương thích với dữ liệu và Firestore đã có
      sceneInstructions: sceneVal,
      styleInstructions: sampleContextVal,
      autoSetValue: this.el.querySelector('#auto-set-value').checked,
      autoPasteClipboard: this.el.querySelector('#auto-paste-clipboard').checked,
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
    this.saveAllDataToStorage(async () => {
      ContentHelper.showToast(`Profile "${this.activeProfileName}" đã được lưu!`, "success");
      this._syncToFirestore();

      // Tự động điền ngay vào trang web AI Studio nếu đang ở trang speech
      if (window.location.pathname.includes('/generate-speech')) {
        console.log("🚀 [SpeechPanel] Tự động áp dụng giá trị profile vào trang ngay sau khi lưu...");
        await GoogleAIStudioSpeechPanel.setValueScript(currentData);
      }
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

        await GoogleAIStudioSpeechPanel.setValueScript(activeProfile);

        // Bước cuối: Tự động dán clipboard nếu option được bật
        if (activeProfile.autoPasteClipboard) {
          console.log(`📋 [SpeechPanel] Auto Paste Clipboard enabled. Running paste script...`);
          await GoogleAIStudioSpeechPanel.autoPasteClipboardToPrompt();
        } else {
          console.log(`ℹ️ Auto Paste Clipboard is disabled for profile "${activeProfileName}".`);
        }
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
    console.log("🚀 [SpeechPanel] start setValueScript: ", settings);

    // BƯỚC 1: Ưu tiên số 1 - Cập nhật Scene & Sample Context trước tiên (không phụ thuộc vào việc chọn giọng)
    const sceneText = settings.scene !== undefined ? settings.scene : (settings.sceneInstructions || '');
    if (sceneText) {
      try {
        console.log("📝 [SpeechPanel] Đang điền Scene...");
        await GoogleAIStudioSpeechPanel.setTextareaValueByLabel('Scene', sceneText);
      } catch (e) {
        console.warn("⚠️ [SpeechPanel] Lỗi điền Scene:", e);
      }
    }

    const sampleContextText = settings.sampleContext !== undefined ? settings.sampleContext : (settings.styleInstructions || '');
    if (sampleContextText) {
      try {
        console.log("📝 [SpeechPanel] Đang điền Sample Context...");
        await GoogleAIStudioSpeechPanel.setTextareaValueByLabel('Sample Context', sampleContextText);
      } catch (e) {
        console.warn("⚠️ [SpeechPanel] Lỗi điền Sample Context:", e);
      }
    }

    // BƯỚC 2: Cập nhật tên Speaker
    try {
      if (settings.InputValue1) {
        await GoogleAIStudioSpeechPanel.setSpeakerName(0, settings.InputValue1);
      }
      if (settings.InputValue2) {
        await GoogleAIStudioSpeechPanel.setSpeakerName(1, settings.InputValue2);
      }
    } catch (e) {
      console.warn("⚠️ [SpeechPanel] Lỗi set Speaker Name:", e);
    }

    // BƯỚC 3: Chọn Voice 1 và Voice 2 (bọc độc lập để nếu lỗi cũng không ảnh hưởng bước khác)
    try {
      if (settings.Voice1) {
        await GoogleAIStudioSpeechPanel.selectVoice(0, settings.Voice1);
      }
    } catch (e) {
      console.warn(`⚠️ [SpeechPanel] Không thể chọn Voice 1 (${settings.Voice1}):`, e);
    }

    try {
      if (settings.Voice2) {
        await GoogleAIStudioSpeechPanel.selectVoice(1, settings.Voice2);
      }
    } catch (e) {
      console.warn(`⚠️ [SpeechPanel] Không thể chọn Voice 2 (${settings.Voice2}):`, e);
    }

    console.log("✅ [SpeechPanel] Hoàn tất setValueScript.");
  }

  /**
   * Chọn giọng nói cho một Speaker cụ thể dựa trên Dialog Speaker settings của AI Studio.
   * @param {number} speakerIndex - Chỉ số của speaker (0 hoặc 1).
   * @param {string} voiceName - Tên của giọng nói cần chọn.
   * @param {number} timeoutMs - Thời gian timeout (mặc định 8000ms).
   */
  static selectVoice(speakerIndex, voiceName, timeoutMs = 8000) {
    return new Promise(async (resolve) => {
      if (!voiceName || !voiceName.trim()) {
        return resolve(false);
      }

      const cleanVoiceName = voiceName.trim();
      console.log(`🎙️ [SpeechPanel] Bắt đầu chọn giọng "${cleanVoiceName}" cho Speaker index ${speakerIndex}...`);

      const startTime = Date.now();
      const findSettingInterval = setInterval(async () => {
        const allVoiceSettings = document.querySelectorAll('ms-voice-settings');
        const targetSetting = allVoiceSettings[speakerIndex];

        if (targetSetting) {
          clearInterval(findSettingInterval);

          // 1. Kiểm tra nếu giọng hiện tại đã đúng rồi thì bỏ qua
          const currentVoiceEl = targetSetting.querySelector('.voice-display-name');
          if (currentVoiceEl && currentVoiceEl.textContent.trim().toLowerCase() === cleanVoiceName.toLowerCase()) {
            console.log(`✅ [SpeechPanel] Speaker [${speakerIndex}] đã chọn sẵn giọng "${cleanVoiceName}". Bỏ qua.`);
            return resolve(true);
          }

          // 2. Tìm trigger mở Dialog: .active-voice-card-trigger hoặc button[aria-label="Open voice settings"]
          const trigger = targetSetting.querySelector('.active-voice-card-trigger, button[aria-label="Open voice settings"]');
          if (!trigger) {
            console.warn(`⚠️ [SpeechPanel] Không tìm thấy trigger cho Speaker index ${speakerIndex}`);
            return resolve(false);
          }

          console.log(`🔘 [SpeechPanel] Click mở dialog chọn giọng cho Speaker [${speakerIndex}]...`);
          trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

          // 3. Đợi Dialog mat-dialog-container xuất hiện
          let dialogAttempts = 0;
          const checkDialogInterval = setInterval(async () => {
            dialogAttempts++;
            const dialog = document.querySelector('mat-dialog-container, ms-speaker-settings-panel');

            if (dialog) {
              clearInterval(checkDialogInterval);
              console.log("✅ [SpeechPanel] Dialog Speaker settings đã mở. Đang tìm giọng...");

              // Tìm thẻ voice-card có data-voice-name khớp
              let voiceCard = Array.from(dialog.querySelectorAll('.voice-card')).find(card => {
                const name = (card.getAttribute('data-voice-name') || '').trim().toLowerCase();
                const cardNameEl = card.querySelector('.voice-name');
                const textName = cardNameEl ? cardNameEl.textContent.trim().toLowerCase() : '';
                return name === cleanVoiceName.toLowerCase() || textName === cleanVoiceName.toLowerCase();
              });

              // Nếu chưa thấy trong danh sách mặc định, sử dụng ô Search voices
              if (!voiceCard) {
                const searchInput = dialog.querySelector('input[aria-label="Search voices"], .voice-search-input input');
                if (searchInput) {
                  console.log(`🔍 [SpeechPanel] Đang tìm kiếm giọng "${cleanVoiceName}" qua ô Search...`);
                  searchInput.focus();
                  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                  if (setter) {
                    setter.call(searchInput, cleanVoiceName);
                  } else {
                    searchInput.value = cleanVoiceName;
                  }
                  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                  searchInput.dispatchEvent(new Event('change', { bubbles: true }));

                  // Chờ 600ms cho kết quả tìm kiếm load
                  await new Promise(r => setTimeout(r, 600));

                  voiceCard = Array.from(dialog.querySelectorAll('.voice-card')).find(card => {
                    const name = (card.getAttribute('data-voice-name') || '').trim().toLowerCase();
                    const cardNameEl = card.querySelector('.voice-name');
                    const textName = cardNameEl ? cardNameEl.textContent.trim().toLowerCase() : '';
                    return name.includes(cleanVoiceName.toLowerCase()) || textName.includes(cleanVoiceName.toLowerCase());
                  });
                }
              }

              // Click vào voice card được tìm thấy
              if (voiceCard) {
                const clickTarget = voiceCard.querySelector('button.voice-card-content') || voiceCard;
                console.log(`✅ [SpeechPanel] Tìm thấy giọng "${cleanVoiceName}". Đang click chọn...`);
                clickTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                await new Promise(r => setTimeout(r, 400));
              } else {
                console.warn(`⚠️ [SpeechPanel] Không tìm thấy thẻ giọng nói "${cleanVoiceName}" trong dialog.`);
              }

              // 4. BẮT BUỘC: Đóng Dialog để không che khuất màn hình và giải phóng cho speaker tiếp theo
              const closeBtn = dialog.querySelector('button[aria-label="Close panel"], button[data-test-close-button], button[mat-dialog-close], .panel-header button');
              if (closeBtn) {
                console.log("🔒 [SpeechPanel] Đóng dialog speaker settings...");
                closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              } else {
                const backdrop = document.querySelector('.cdk-overlay-backdrop');
                if (backdrop) backdrop.click();
              }

              // Chờ 400ms cho dialog đóng hoàn tất
              await new Promise(r => setTimeout(r, 400));
              resolve(true);

            } else if (dialogAttempts > 40) {
              clearInterval(checkDialogInterval);
              console.warn(`⚠️ [SpeechPanel] Timeout: Không tìm thấy dialog sau 4s.`);
              resolve(false);
            }
          }, 100);

        } else if (Date.now() - startTime >= timeoutMs) {
          clearInterval(findSettingInterval);
          console.warn(`⚠️ [SpeechPanel] Timeout: Không tìm thấy ms-voice-settings cho Speaker index ${speakerIndex} sau ${timeoutMs}ms.`);
          resolve(false);
        }
      }, 100);
    });
  }

  static setSpeakerName(index, valueToSet, timeoutMs = 3000) {
    if (!valueToSet) return Promise.resolve(false);
    return new Promise((resolve) => {
      const startTime = Date.now();
      const pollInterval = setInterval(() => {
        const allVoiceSettings = document.querySelectorAll('ms-voice-settings');
        if (index < allVoiceSettings.length) {
          const input = allVoiceSettings[index].querySelector('input[aria-label="Speaker name"], input.speaker-alias-input');
          if (input) {
            clearInterval(pollInterval);
            input.focus();
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            if (setter) {
              setter.call(input, valueToSet);
            } else {
              input.value = valueToSet;
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
            try {
              input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: valueToSet }));
            } catch (_) {}
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.blur();
            console.log(`✅ [SpeechPanel] Đã set Speaker name [${index}] = "${valueToSet}"`);
            return resolve(true);
          }
        }

        if (Date.now() - startTime >= timeoutMs) {
          clearInterval(pollInterval);
          console.warn(`⚠️ [SpeechPanel] Timeout: Không tìm thấy input Speaker name cho index ${index}`);
          resolve(false);
        }
      }, 100);
    });
  }

  /**
   * Tự động điền dữ liệu vào textarea của Scene hoặc Sample Context với cơ chế Polling, 4 tầng selector & Angular Native Setter
   * @param {string} labelText - 'Scene' hoặc 'Sample Context'
   * @param {string} valueToSet - Nội dung cần điền
   * @param {number} timeoutMs - Thời gian timeout tối đa (mặc định 6000ms)
   */
  static setTextareaValueByLabel(labelText, valueToSet, timeoutMs = 6000) {
    if (valueToSet === undefined || valueToSet === null || valueToSet === '') {
      console.log(`ℹ️ [SpeechPanel] Giá trị cho "${labelText}" rỗng, bỏ qua.`);
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      console.log(`⏳ [SpeechPanel] Đang tìm ô "${labelText}" để điền: "${valueToSet.slice(0, 30)}..."`);

      const pollInterval = setInterval(() => {
        let targetTextarea = null;
        let parentMsAutosize = null;

        // Tầng 1: Tìm qua thẻ <textarea> có aria-label khớp (case-insensitive)
        const allTextareas = Array.from(document.querySelectorAll('textarea'));
        for (const ta of allTextareas) {
          const ariaLabel = (ta.getAttribute('aria-label') || '').trim().toLowerCase();
          if (ariaLabel === labelText.toLowerCase()) {
            targetTextarea = ta;
            parentMsAutosize = ta.closest('ms-autosize-textarea');
            break;
          }
        }

        // Tầng 2: Tìm qua component cha <ms-autosize-textarea> có arialabel hoặc aria-label
        if (!targetTextarea) {
          const allMs = Array.from(document.querySelectorAll('ms-autosize-textarea'));
          for (const ms of allMs) {
            const al = (ms.getAttribute('arialabel') || ms.getAttribute('aria-label') || '').trim().toLowerCase();
            if (al === labelText.toLowerCase()) {
              parentMsAutosize = ms;
              targetTextarea = ms.shadowRoot ? ms.shadowRoot.querySelector('textarea') : ms.querySelector('textarea');
              if (targetTextarea) break;
            }
          }
        }

        // Tầng 3: Tìm qua tiêu đề h4, h3 hoặc .section-title trong context-container-item
        if (!targetTextarea) {
          const allTitles = Array.from(document.querySelectorAll('h4, h3, .section-title'));
          for (const title of allTitles) {
            if (title.textContent.trim().toLowerCase() === labelText.toLowerCase()) {
              const item = title.closest('.context-container-item') || title.parentElement;
              if (item) {
                targetTextarea = item.querySelector('textarea');
                parentMsAutosize = item.querySelector('ms-autosize-textarea');
                if (targetTextarea) break;
              }
            }
          }
        }

        // Tầng 4: Tìm qua placeholder đặc trưng trên AI Studio
        if (!targetTextarea) {
          for (const ta of allTextareas) {
            const ph = (ta.getAttribute('placeholder') || '').toLowerCase();
            if (labelText.toLowerCase() === 'scene' && ph.includes('bustling street')) {
              targetTextarea = ta;
              parentMsAutosize = ta.closest('ms-autosize-textarea');
              break;
            } else if (labelText.toLowerCase().includes('sample') && ph.includes('previous speaker')) {
              targetTextarea = ta;
              parentMsAutosize = ta.closest('ms-autosize-textarea');
              break;
            }
          }
        }

        if (targetTextarea) {
          clearInterval(pollInterval);
          console.log(`🎯 [SpeechPanel] Đã tìm thấy textarea cho "${labelText}"! Tiến hành gán giá trị...`);

          try {
            // 1. Focus vào phần tử
            targetTextarea.focus();

            // 2. Gán giá trị thông qua Prototype Setter của HTMLTextAreaElement
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
            if (nativeSetter) {
              nativeSetter.call(targetTextarea, valueToSet);
            } else {
              targetTextarea.value = valueToSet;
            }

            // 3. Dispatch chuỗi sự kiện đầy đủ cho Angular
            targetTextarea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            try {
              targetTextarea.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: valueToSet
              }));
            } catch (_) {}
            targetTextarea.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

            // 4. Đồng bộ thuộc tính data-value trên component cha <ms-autosize-textarea>
            if (parentMsAutosize) {
              parentMsAutosize.setAttribute('data-value', valueToSet);
              parentMsAutosize.dispatchEvent(new Event('input', { bubbles: true }));
              parentMsAutosize.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // 5. Blur nhẹ để Angular trigger touch & form validation
            targetTextarea.blur();

            console.log(`✅ [SpeechPanel] Đã điền thành công "${labelText}" (${valueToSet.length} ký tự).`);
          } catch (err) {
            console.error(`❌ [SpeechPanel] Lỗi khi gán giá trị cho "${labelText}":`, err);
          }

          setTimeout(() => resolve(true), 250);
        } else if (Date.now() - startTime >= timeoutMs) {
          clearInterval(pollInterval);
          console.warn(`⚠️ [SpeechPanel] Timeout: Không tìm thấy textarea cho "${labelText}" sau ${timeoutMs}ms.`);
          resolve(false);
        }
      }, 100);
    });
  }

  // Giữ alias tương thích ngược nếu có chỗ khác gọi hàm cũ
  static setTextareaValueByAriaLabel(labelText, valueToSet) {
    return GoogleAIStudioSpeechPanel.setTextareaValueByLabel(labelText, valueToSet);
  }

  // =================================================================
  // AUTO PASTE CLIPBOARD LOGIC
  // =================================================================

  /**
   * Tự động click nút "Text" và dán nội dung clipboard vào textarea prompt.
   * Luồng: Click nút Text (data-value="TEXT") -> Đợi textarea xuất hiện -> Đọc clipboard -> Điền vào textarea.
   */
  static async autoPasteClipboardToPrompt() {
    try {
      // Bước 0: Đóng panel cài đặt (nếu đang mở) trước khi thao tác
      await GoogleAIStudioSpeechPanel.clickClosePanel();

      // Bước 1: Click nút "Text" để chuyển sang chế độ nhập text
      await GoogleAIStudioSpeechPanel.clickTextModeButton();

      // Bước 2: Đợi textarea xuất hiện và dán nội dung clipboard vào
      await GoogleAIStudioSpeechPanel.pasteClipboardToPromptTextarea();

      // Bước 3: Click nút "Run" để bắt đầu generate speech
      await GoogleAIStudioSpeechPanel.clickRunButton();

      // Bước 4: Đợi quá trình generate voice hoàn tất
      await GoogleAIStudioSpeechPanel.waitForGenerationComplete();

      // Bước 5: Pause audio (nếu đang tự play) và click Download
      await GoogleAIStudioSpeechPanel.pauseAndDownloadAudio();

      console.log("✅ [SpeechPanel] Auto Paste Clipboard + Run + Download completed.");
    } catch (error) {
      console.error("❌ [SpeechPanel] Auto Paste Clipboard failed:", error);
    }
  }

  /**
   * Tìm và click nút "Run" (type="submit", class="ctrl-enter-submits") trên giao diện AI Studio.
   * Sử dụng polling để đợi nút xuất hiện và sẵn sàng trên DOM.
   */
  static clickRunButton() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // Tối đa 5 giây (50 x 100ms)

      const pollInterval = setInterval(() => {
        attempts++;

        // Tìm nút Run bằng nhiều selector
        const runBtn =
          document.querySelector('button[type="submit"].ctrl-enter-submits') ||
          document.querySelector('button.ms-button-primary[type="submit"]');

        if (runBtn && runBtn.getAttribute('aria-disabled') !== 'true') {
          clearInterval(pollInterval);
          console.log('✅ [SpeechPanel] Found "Run" button. Clicking...');
          runBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          setTimeout(() => resolve(), 500);
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          console.warn('⚠️ [SpeechPanel] "Run" button not found or disabled after 5s.');
          resolve(); // Không chặn luồng
        }
      }, 100);
    });
  }

  // =================================================================
  // WAIT FOR GENERATION & AUTO DOWNLOAD LOGIC
  // =================================================================

  /**
   * Đợi quá trình generate speech hoàn tất trên Google AI Studio.
   * Phát hiện hoàn tất bằng 2 dấu hiệu:
   * 1. Nút Run chuyển từ type="button" (Stop) về type="submit" (Run).
   * 2. Audio src đổi từ URL tĩnh sang data:audio/wav;base64,...
   * Timeout tối đa: 5 phút (300 giây).
   */
  static waitForGenerationComplete() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 3000; // 5 phút (3000 x 100ms)
      const POLL_INTERVAL_MS = 100;

      console.log('⏳ [SpeechPanel] Waiting for voice generation to complete...');

      const pollInterval = setInterval(() => {
        attempts++;

        // Dấu hiệu 1: Nút Run trở về trạng thái submit (không còn "Stop")
        const runBtn = document.querySelector('ms-run-button button');
        const isStillProcessing = runBtn && runBtn.getAttribute('type') === 'button';

        // Dấu hiệu 2: Audio src đã đổi sang base64 (voice đã được generate)
        const audioEl = document.querySelector('ms-music-player audio');
        const hasGeneratedAudio = audioEl && audioEl.src && audioEl.src.startsWith('data:audio/');

        if (!isStillProcessing && hasGeneratedAudio) {
          clearInterval(pollInterval);
          console.log(`✅ [SpeechPanel] Voice generation completed after ${(attempts * POLL_INTERVAL_MS / 1000).toFixed(1)}s.`);
          // Đợi thêm 1 giây cho UI ổn định hoàn toàn
          setTimeout(() => resolve(), 1000);
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          console.warn('⚠️ [SpeechPanel] Voice generation timeout after 5 minutes. Proceeding anyway...');
          resolve();
        }

        // Log tiến trình mỗi 10 giây
        if (attempts % 100 === 0) {
          console.log(`⏳ [SpeechPanel] Still waiting... (${(attempts * POLL_INTERVAL_MS / 1000).toFixed(0)}s elapsed)`);
        }
      }, POLL_INTERVAL_MS);
    });
  }

  /**
   * Pause audio đang phát (nếu có) và click nút Download.
   * Sau khi generate xong, AI Studio tự động play audio.
   * Method này sẽ: Pause → Đợi một chút → Click Download.
   */
  static pauseAndDownloadAudio() {
    return new Promise((resolve) => {
      // Bước 1: Pause audio nếu đang play
      // Tìm nút pause bằng nhiều selector để tăng độ tin cậy
      const playPauseBtn =
        document.querySelector('button[aria-label="Pause"]') ||
        document.querySelector('.play-pause-button') ||
        document.querySelector('ms-music-player button.play-pause-button');

      console.log('🔍 [SpeechPanel] Play/Pause button found:', !!playPauseBtn);

      if (playPauseBtn) {
        const ariaLabel = playPauseBtn.getAttribute('aria-label');
        console.log(`🔍 [SpeechPanel] Button aria-label: "${ariaLabel}"`);

        if (ariaLabel === 'Pause') {
          // Đang play → click để pause
          console.log('⏸️ [SpeechPanel] Audio is playing. Clicking pause...');
          playPauseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        } else {
          console.log('ℹ️ [SpeechPanel] Audio is already paused or not playing.');
        }
      } else {
        console.warn('⚠️ [SpeechPanel] Play/Pause button not found.');
      }

      // Bước 2: Đợi UI cập nhật rồi click Download
      setTimeout(() => {
        const downloadBtn =
          document.querySelector('button[aria-label="Download"]') ||
          document.querySelector('.download-button') ||
          document.querySelector('ms-music-player .download-button');

        if (downloadBtn && downloadBtn.getAttribute('aria-disabled') !== 'true') {
          console.log('⬇️ [SpeechPanel] Clicking download button...');
          downloadBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          console.log('✅ [SpeechPanel] Download triggered successfully.');
        } else {
          console.warn('⚠️ [SpeechPanel] Download button not found or disabled.');
        }
        resolve();
      }, 500);
    });
  }

  /**
   * Tìm và click nút đóng panel (aria-label="Close panel") trên giao diện AI Studio.
   * Dùng để đóng panel cài đặt trước khi chuyển sang chế độ nhập text.
   */
  static clickClosePanel() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 30; // Tối đa 3 giây (30 x 100ms)

      const pollInterval = setInterval(() => {
        attempts++;

        // Tìm nút Close panel bằng nhiều selector để tăng độ tin cậy
        const closeBtn =
          document.querySelector('button[data-test-close-button]') ||
          document.querySelector('button[aria-label="Close panel"]') ||
          document.querySelector('button[mat-dialog-close]');

        if (closeBtn) {
          clearInterval(pollInterval);
          console.log('✅ [SpeechPanel] Found "Close panel" button. Clicking...');
          // Dispatch MouseEvent đầy đủ để Angular Material Dialog nhận diện
          closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          // Đợi UI cập nhật sau khi đóng panel
          setTimeout(() => resolve(), 800);
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          console.warn('⚠️ [SpeechPanel] "Close panel" button not found. Proceeding anyway...');
          resolve(); // Không chặn luồng, panel có thể đã đóng sẵn
        }
      }, 100);
    });
  }

  /**
   * Tìm và click vào nút "Text" (role="radio", data-value="TEXT") trên giao diện AI Studio.
   * Sử dụng polling để đợi nút xuất hiện trên DOM.
   */
  static clickTextModeButton() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // Tối đa 5 giây (50 x 100ms)

      const pollInterval = setInterval(() => {
        attempts++;

        // Tìm nút Text bằng thuộc tính data-value="TEXT"
        const textButton = document.querySelector('button[data-value="TEXT"]');
        if (textButton) {
          clearInterval(pollInterval);
          console.log('✅ [SpeechPanel] Found "Text" button. Clicking...');
          textButton.click();
          // Đợi UI cập nhật sau khi click
          setTimeout(() => resolve(), 500);
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          console.warn('⚠️ [SpeechPanel] "Text" button not found after 5s. Proceeding anyway...');
          resolve(); // Không reject để không chặn luồng, có thể textarea đã hiện sẵn
        }
      }, 100);
    });
  }

  /**
   * Đọc nội dung clipboard và dán vào textarea có aria-label="Enter a prompt".
   * Sử dụng Clipboard API để đọc text từ clipboard.
   */
  static pasteClipboardToPromptTextarea() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // Tối đa 5 giây

      const pollInterval = setInterval(async () => {
        attempts++;

        // Tìm textarea với aria-label="Enter a prompt"
        const textarea = document.querySelector('textarea[aria-label="Enter a prompt"]');
        if (textarea) {
          clearInterval(pollInterval);
          try {
            // Kiểm tra document focus để tránh lỗi "Document is not focused"
            if (!document.hasFocus()) {
              console.warn('⚠️ [SpeechPanel] Document is not focused. Waiting for user to click the page...');
              if (typeof ContentHelper !== 'undefined') {
                ContentHelper.showToast('Vui lòng click vào trang AI Studio để tiếp tục tự động dán Clipboard!', 'warning');
              }
              await new Promise(resolveFocus => {
                const onFocus = () => {
                  window.removeEventListener('focus', onFocus);
                  resolveFocus();
                };
                window.addEventListener('focus', onFocus);
              });
            }

            // Đọc nội dung từ clipboard
            const clipboardText = await navigator.clipboard.readText();
            if (!clipboardText || clipboardText.trim() === '') {
              console.warn('⚠️ [SpeechPanel] Clipboard is empty. Skipping paste.');
              return resolve();
            }

            // Điền nội dung clipboard vào textarea
            textarea.value = clipboardText;
            // Dispatch events để Angular nhận diện thay đổi
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            textarea.focus();

            console.log(`✅ [SpeechPanel] Pasted ${clipboardText.length} characters from clipboard.`);
            resolve();
          } catch (clipError) {
            console.error('❌ [SpeechPanel] Cannot read clipboard:', clipError);
            reject(clipError);
          }
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          console.error('❌ [SpeechPanel] Prompt textarea not found after 5s.');
          reject(new Error('Prompt textarea not found'));
        }
      }, 100);
    });
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
    btn.className = 'bg-[#141517] text-[#fbfbfa] border border-[#2e3035] font-bold text-xs shadow-lg hover:shadow-xl transition-all active:scale-95';
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

  destroy() {
    if (this._onDocClick) {
      document.removeEventListener('click', this._onDocClick);
      this._onDocClick = null;
    }
    super.destroy();
  }
}
