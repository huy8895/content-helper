// content/YoutubeStudioPanel.js (Profile & Auto-fill Version)

const AVAILABLE_LANGUAGES = [
  'Abkhazian', 'Afar', 'Afrikaans', 'Akan', 'Akkadian', 'Albanian',
  'American Sign Language', 'Amharic', 'Arabic', 'Aramaic', 'Armenian',
  'Assamese', 'Aymara', 'Azerbaijani', 'Bambara', 'Bangla', 'Bangla (India)',
  'Bashkir', 'Basque', 'Belarusian', 'Bhojpuri', 'Bislama', 'Bodo',
  'Bosnian', 'Breton', 'Bulgarian', 'Burmese', 'Cantonese',
  'Cantonese (Hong Kong)', 'Catalan', 'Cherokee', 'Chinese', 'Chinese (China)',
  'Chinese (Hong Kong)', 'Chinese (Simplified)', 'Chinese (Singapore)',
  'Chinese (Taiwan)', 'Chinese (Traditional)', 'Choctaw', 'Coptic', 'Corsican',
  'Cree', 'Croatian', 'Czech', 'Danish', 'Dogri', 'Dutch', 'Dutch (Belgium)',
  'Dutch (Netherlands)', 'Dzongkha', 'English', 'English (Australia)',
  'English (Canada)', 'English (India)', 'English (Ireland)',
  'English (United Kingdom)', 'English (United States)', 'Esperanto',
  'Estonian', 'Ewe', 'Faroese', 'Fijian', 'Filipino', 'Finnish', 'French',
  'French (Belgium)', 'French (Canada)', 'French (France)',
  'French (Switzerland)', 'Fula', 'Galician', 'Ganda', 'Georgian', 'German',
  'German (Austria)', 'German (Germany)', 'German (Switzerland)', 'Greek',
  'Guarani', 'Gujarati', 'Gusii', 'Haitian Creole', 'Hakka Chinese',
  'Hakka Chinese (Taiwan)', 'Haryanvi', 'Hausa', 'Hawaiian', 'Hebrew', 'Hindi',
  'Hindi (Latin)', 'Hiri Motu', 'Hungarian', 'Icelandic', 'Igbo', 'Indonesian',
  'Interlingua', 'Interlingue', 'Inuktitut', 'Inupiaq', 'Irish', 'Italian',
  'Japanese', 'Javanese', 'Kalaallisut', 'Kalenjin', 'Kamba', 'Kannada',
  'Kashmiri', 'Kazakh', 'Khmer', 'Kikuyu', 'Kinyarwanda', 'Klingon', 'Konkani',
  'Korean', 'Kurdish', 'Kyrgyz', 'Ladino', 'Lao', 'Latin', 'Latvian', 'Lingala',
  'Lithuanian', 'Lower Sorbian', 'Luba-Katanga', 'Luo', 'Luxembourgish', 'Luyia',
  'Macedonian', 'Maithili', 'Malagasy', 'Malay', 'Malay (Singapore)',
  'Malayalam', 'Maltese', 'Manipuri', 'Māori', 'Marathi', 'Masai', 'Meru',
  'Min Nan Chinese', 'Min Nan Chinese (Taiwan)', 'Mixe', 'Mizo', 'Mongolian',
  'Mongolian (Mongolian)', 'Nauru', 'Navajo', 'Nepali', 'Nigerian Pidgin',
  'North Ndebele', 'Northern Sotho', 'Norwegian', 'Occitan', 'Odia', 'Oromo',
  'Papiamento', 'Pashto', 'Persian', 'Persian (Afghanistan)', 'Persian (Iran)',
  'Polish', 'Portuguese', 'Portuguese (Brazil)', 'Portuguese (Portugal)',
  'Punjabi', 'Quechua', 'Romanian', 'Romanian (Moldova)', 'Romansh', 'Rundi',
  'Russian', 'Russian (Latin)', 'Samoan', 'Sango', 'Sanskrit', 'Santali',
  'Sardinian', 'Scottish Gaelic', 'Serbian', 'Serbian (Cyrillic)',
  'Serbian (Latin)', 'Serbo-Croatian', 'Sherdukpen', 'Shona', 'Sicilian',
  'Sindhi', 'Sinhala', 'Slovak', 'Slovenian', 'Somali', 'South Ndebele',
  'Southern Sotho', 'Spanish', 'Spanish (Latin America)', 'Spanish (Mexico)',
  'Spanish (Spain)', 'Spanish (United States)', 'Sundanese', 'Swahili',
  'Swati', 'Swedish', 'Tagalog', 'Tajik', 'Tamil', 'Tatar', 'Telugu', 'Thai',
  'Tibetan', 'Tigrinya', 'Tok Pisin', 'Toki Pona', 'Tongan', 'Tsonga',
  'Tswana', 'Turkish', 'Turkmen', 'Twi', 'Ukrainian', 'Upper Sorbian',
  'Urdu', 'Uyghur', 'Uzbek', 'Venda', 'Vietnamese', 'Volapük', 'Võro',
  'Welsh', 'Western Frisian', 'Wolaytta', 'Wolof', 'Xhosa', 'Yiddish',
  'Yoruba', 'Zulu'
];

// =================================================================
// YoutubeStudioPanel Controller
// =================================================================
window.YoutubeStudioPanel = class extends window.BasePanel {
  constructor(onClose) {
    super({
      id: 'youtube-studio-helper-panel',
      title: 'Phụ đề YouTube',
      icon: '文A',
      onClose: onClose,
      view: window.YoutubeStudioView
    });

    this.storageKey = 'youtube_studio_profiles';
    this.profiles = {};
    this.activeProfileName = 'default';

    this._initLanguagesUI();
    this.attachEvents();
    this.loadProfiles();
  }

  _initLanguagesUI() {
    const container = this.el.querySelector('#yt-language-checkbox-container');
    if (!container) return;

    AVAILABLE_LANGUAGES.forEach(lang => {
      const label = document.createElement('label');
      label.className = 'ts-item-row yt-language-label';
      label.innerHTML = `
        <input type="checkbox" value="${lang}" class="ts-checkbox"> 
        <span class="ts-item-row__text">${lang}</span>
      `;

      // Khi tick/untick một ngôn ngữ, gọi lại hàm cập nhật hiển thị
      label.querySelector('input').addEventListener('change', () => {
        this._updateLanguageVisibility();
      });

      container.appendChild(label);
    });
  }

  destroy() {
    this.stopTranslationObserver();
    super.destroy();
  }

  // Thay thế hàm attachEvents()

  attachEvents() {
    this.el.querySelector('#yt-save-languages-btn').addEventListener('click', () => this.saveCurrentProfile());
    this.el.querySelector('#yt-save-as-new-btn').addEventListener('click', () => {
      this.saveAsNewProfile();
      this.el.querySelector('#yt-new-profile-group').classList.add('hidden');
    });
    this.el.querySelector('#ytsp-new-profile').addEventListener('click', () => {
      const group = this.el.querySelector('#yt-new-profile-group');
      group.classList.toggle('hidden');
      if (!group.classList.contains('hidden')) {
        const input = this.el.querySelector('#yt-new-profile-name');
        input.value = '';
        input.focus();
      }
    });
    this.el.querySelector('#ytsp-delete-profile').addEventListener('click', () => this.deleteSelectedProfile());

    // Custom Dropdown Logic
    const trigger = this.el.querySelector('#yt-profile-dropdown-trigger');
    const menu = this.el.querySelector('#yt-profile-dropdown-menu');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      menu.classList.remove('show');
    });

    this.el.querySelector('#yt-json-upload').addEventListener('change', (e) => this.handleJsonUpload(e));

    // Sửa lại event search để gọi hàm mới
    this.el.querySelector('#yt-language-search').addEventListener('input', () => {
      this._updateLanguageVisibility();
    });

    // === NEW EVENTS ===
    // Event cho checkbox "Show selected only"
    this.el.querySelector('#yt-filter-selected').addEventListener('change', () => {
      this._updateLanguageVisibility();
    });

    // Event cho nút "Copy Selected"
    this.el.querySelector('#yt-copy-selected-btn').addEventListener('click', () => {
      const selectedLangs = Array.from(this.el.querySelectorAll('.yt-language-label input:checked'))
        .map(cb => cb.value);

      if (selectedLangs.length === 0) {
        ContentHelper.showToast("Chưa có ngôn ngữ nào được chọn.", "warning");
        return;
      }

      const copyText = selectedLangs.join(', ');
      navigator.clipboard.writeText(copyText).then(() => {
        ContentHelper.showToast(`Đã sao chép ${selectedLangs.length} ngôn ngữ.`, "success");
      }).catch(err => {
        console.error('Copy failed:', err);
        ContentHelper.showToast('Lỗi khi sao chép.', "error");
      });
    });
  }
  // --- PROFILE MANAGEMENT LOGIC (Tái sử dụng từ GoogleAIStudioPanel) ---

  async loadProfiles() {
    const { google_user_email: userId } = await chrome.storage.local.get("google_user_email");
    let localData = (await chrome.storage.local.get(this.storageKey))[this.storageKey] || {};

    if (userId) {
      console.log("☁️ YT Panel: Attempting to load profiles from Firestore...");
      const helper = new FirestoreHelper(firebaseConfig);
      helper.collection = 'youtube_language_profiles';
      try {
        const firestoreData = await helper.loadUserConfig(userId);
        if (firestoreData && firestoreData.profiles) {
          console.log("☁️ YT Panel: Loaded profiles from Firestore.");
          localData = firestoreData;
          await chrome.storage.local.set({ [this.storageKey]: firestoreData });
        }
      } catch (err) { console.error("❌ YT Panel: Error loading from Firestore:", err); }
    }

    this.profiles = localData.profiles || { 'default': { languages: [], isAloudChannel: false, isAutofillEnabled: false } };
    this.activeProfileName = localData.activeProfileName || 'default';
    this.updateProfileDropdown();
    this.fillFormWithProfile(this.activeProfileName);
  }
  // Cập nhật dropdown chọn profile
  updateProfileDropdown() {
    const trigger = this.el.querySelector('#yt-profile-selected-text');
    const menu = this.el.querySelector('#yt-profile-dropdown-menu');

    if (!trigger || !menu) return;

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

  fillFormWithProfile(profileName) {
    const profileData = this.profiles[profileName] || { languages: [], isAloudChannel: false, isAutofillEnabled: false };
    this.el.querySelectorAll('.yt-language-label input[type="checkbox"]').forEach(cb => {
      cb.checked = (profileData.languages || []).includes(cb.value);
    });
    this.el.querySelector('#yt-aloud-enabled').checked = profileData.isAloudChannel || false;
    this.el.querySelector('#yt-autofill-enabled').checked = profileData.isAutofillEnabled || false;
    this._updateLanguageVisibility();
  }

  switchProfile(profileName) {
    this.activeProfileName = profileName;
    this.fillFormWithProfile(profileName);
    this.updateProfileDropdown();
    this.saveAllDataToStorage();
  }

  collectDataFromForm() {
    return {
      languages: Array.from(this.el.querySelectorAll('.yt-language-label input:checked')).map(cb => cb.value),
      isAloudChannel: this.el.querySelector('#yt-aloud-enabled').checked,
      isAutofillEnabled: this.el.querySelector('#yt-autofill-enabled').checked,
    };
  }
  saveAllDataToStorage(callback) {
    const dataToSave = {
      profiles: this.profiles,
      activeProfileName: this.activeProfileName,
    };
    chrome.storage.local.set({ [this.storageKeyProfiles]: dataToSave }, callback);
    this._syncToFirestore();
  }

  saveCurrentProfile() {
    this.profiles[this.activeProfileName] = this.collectDataFromForm();
    this.saveAllDataToStorage(() => ContentHelper.showToast(`Profile "${this.activeProfileName}" updated!`, "success"));
  }

  saveAsNewProfile() {
    const newName = this.el.querySelector('#yt-new-profile-name').value.trim();
    if (this.profiles[newName] || !newName) {
      ContentHelper.showToast(newName ? "Profile name already exists." : "Please enter a new profile name.", "warning");
      return;
    }
    this.profiles[newName] = this.collectDataFromForm();
    this.activeProfileName = newName;
    this.saveAllDataToStorage(() => {
      ContentHelper.showToast(`Saved new profile: "${newName}"`, "success");
      const input = this.el.querySelector('#yt-new-profile-name');
      if (input) input.value = '';
      this.updateProfileDropdown();
      this.switchProfile(newName);
    });
  }

  // Xóa profile đang được chọn
  deleteSelectedProfile() {
    const profileToDelete = this.activeProfileName;
    if (Object.keys(this.profiles).length <= 1) {
      ContentHelper.showToast("Cannot delete the last profile.", "warning");
      return;
    }
    if (confirm(`Delete profile "${profileToDelete}"?`)) {
      delete this.profiles[profileToDelete];
      this.activeProfileName = Object.keys(this.profiles)[0];
      this.saveAllDataToStorage(() => {
        ContentHelper.showToast(`Deleted profile: "${profileToDelete}"`, "success");
        this.updateProfileDropdown();
        this.fillFormWithProfile(this.activeProfileName);
      });
    }
  }

  async _syncToFirestore() {
    const { google_user_email: userId } = await chrome.storage.local.get("google_user_email");
    if (!userId) return;

    const helper = new FirestoreHelper(firebaseConfig);
    helper.collection = 'youtube_language_profiles';
    try {
      const dataToSync = {
        profiles: this.profiles,
        activeProfileName: this.activeProfileName,
      };
      await helper.saveUserConfig(userId, dataToSync);
    } catch (err) {
      console.error("❌ YT Panel: Error syncing to Firestore:", err);
    }
  }

  // === NEW: JSON UPLOAD LOGIC ===
  // Thay thế hàm này trong file YoutubeStudioPanel.js


  handleJsonUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonDataArray = JSON.parse(e.target.result);
        if (!Array.isArray(jsonDataArray)) {
          throw new Error("JSON data is not an array.");
        }

        const translationsObject = {};
        for (const item of jsonDataArray) {
          if (item && item.language) {
            // === SỬ DỤNG HÀM CHUẨN HÓA ===
            const langKey = this._normalizeLangKey(item.language);
            translationsObject[langKey] = {
              title: item.title || '',
              description: item.description || ''
            };
          }
        }

        await chrome.storage.local.set({ [this.storageKeyTranslations]: translationsObject });
        this.el.querySelector('#yt-json-filename').textContent = `✅ Đã tải lên: ${file.name}`;
        ContentHelper.showToast('Đã lưu dữ liệu dịch thuật thành công!', "success");
      } catch (err) {
        this.el.querySelector('#yt-json-filename').textContent = `❌ Lỗi đọc file`;
        ContentHelper.showToast('Lỗi: File JSON không hợp lệ hoặc không đúng định dạng mảng.', "error");
        console.error("JSON Process Error:", err);
      }
    };
    reader.readAsText(file);
  }

  // === NEW: TRANSLATION OBSERVER LOGIC ===

  startTranslationObserver() {
    if (this.translationObserver) return;
    const handleDialog = (dialog) => {
      const isAloud = dialog.matches('#dialog.ytcp-dialog');
      setTimeout(() => this.injectAutoFillButton(dialog, isAloud), 500);
    };
    this.translationObserver = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'opened') {
          const dialog = mutation.target;
          if (dialog.id === 'metadata-editor' && dialog.hasAttribute('opened')) handleDialog(dialog);
        }
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              const dialog = node.matches('#metadata-editor[opened], #dialog.ytcp-dialog') ? node : node.querySelector('#metadata-editor[opened], #dialog.ytcp-dialog');
              if (dialog && (dialog.querySelector('.metadata-editor-translated') || dialog.querySelector('.ytgn-language-dialog-content'))) {
                handleDialog(dialog);
              }
            }
          }
        }
      }
    });
    this.translationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['opened'] });
  }

  stopTranslationObserver() {
    if (this.translationObserver) {
      this.translationObserver.disconnect();
      this.translationObserver = null;
    }
  }
  // Thay thế hàm này trong file YoutubeStudioPanel.js

  // Dán toàn bộ các hàm này vào class YoutubeStudioPanel,
  // thay thế các phiên bản cũ của chúng.

  // === HÀM NÀY CHỈ CÓ MỘT NHIỆM VỤ: CHÈN NÚT VÀ GẮN SỰ KIỆN CLICK THỦ CÔNG ===
  async injectAutoFillButton(dialog, isAloudPopup = false) {
    const buttonId = 'auto-fill-button-from-json';
    if (dialog.querySelector(`#${buttonId}`)) return;

    // Xác định selectors
    const headerSelector = isAloudPopup ? 'h1.ytgn-language-dialog-title' : '.metadata-editor-translated .language-header';
    const titleSelector = isAloudPopup ? '#metadata-title #textbox' : '#translated-title textarea';
    const descSelector = isAloudPopup ? '#metadata-description #textbox' : '#translated-description textarea';
    const publishBtnSelector = isAloudPopup ? '.ytgn-language-dialog-update' : '#publish-button';

    const targetHeader = dialog.querySelector(headerSelector);
    if (!targetHeader) return;

    const button = document.createElement('button');
    button.id = buttonId;
    button.textContent = '🚀 Chèn từ JSON';
    button.className = 'scenario-btn btn-tool';
    button.style.marginLeft = '10px';
    const buttonContainer = dialog.querySelector('section[slot="secondary-header"]') || targetHeader.parentElement;
    buttonContainer.appendChild(button);

    // Lấy thông tin profile hiện tại để kiểm tra cài đặt auto-fill
    const { [this.storageKeyProfiles]: profileData } = await chrome.storage.local.get(this.storageKeyProfiles);
    const activeProfileName = profileData?.activeProfileName || 'default';
    const activeProfile = profileData?.profiles?.[activeProfileName] || {};
    const isAutofillEnabledForProfile = activeProfile.isAutofillEnabled || false;

    // Sự kiện click của nút
    button.addEventListener('click', async () => {
      const uiLanguageName = targetHeader.textContent.trim();
      const jsonKey = YoutubeStudioPanel._normalizeLangKey(uiLanguageName);
      const { [this.storageKeyTranslations]: translations } = await chrome.storage.local.get(this.storageKeyTranslations);
      const translationData = YoutubeStudioPanel.getTranslation(translations, jsonKey);

      if (translationData) {
        const titleInput = dialog.querySelector(titleSelector);
        const descInput = dialog.querySelector(descSelector);
        YoutubeStudioPanel._fillAndFireEvents(titleInput, translationData.title);
        YoutubeStudioPanel._fillAndFireEvents(descInput, translationData.description);

        button.textContent = '✅ Đã chèn!';
        setTimeout(() => button.textContent = '🚀 Chèn từ JSON', 200);

        // === LOGIC TỰ ĐỘNG LƯU MỚI ===
        // Áp dụng cho MỌI TRƯỜNG HỢP nếu isAutofillEnabledForProfile là true
        if (isAutofillEnabledForProfile) {
          console.log('[Auto-publish] Auto-fill enabled. Waiting to click Publish...');

          // Đợi 1 giây để YouTube nhận diện thay đổi
          await new Promise(r => setTimeout(r, 100));

          const publishBtn = dialog.querySelector(`${publishBtnSelector}:not([disabled])`);
          if (publishBtn) {
            console.log('[Auto-publish] Found enabled Publish/Update button. Clicking...');
            publishBtn.click();
          } else {
            console.warn('[Auto-publish] Could not find enabled Publish/Update button after waiting.');
          }
        }
        // === KẾT THÚC LOGIC MỚI ===

      } else {
        ContentHelper.showToast(`Không tìm thấy dữ liệu cho ngôn ngữ '${uiLanguageName}' (key: '${jsonKey}').`, "warning");
      }
    });

    // Bỏ logic auto-click cũ. Hàm addMyLanguages sẽ xử lý việc đó cho kênh Aloud.
    // Logic auto-publish giờ đã nằm trong event listener của nút.
  }  // Chuyển thành hàm static
  static _fillAndFireEvents(element, value) {
    if (!element) return;
    const formattedValue = String(value || '').replace(/\\n/g, '\n');
    element.focus();
    if (element.tagName === 'TEXTAREA') {
      element.value = formattedValue;
    } else {
      element.textContent = formattedValue;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
  }

  // Chuyển thành hàm static
  static _normalizeLangKey(langName) {
    if (typeof langName !== 'string') return '';
    return langName.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  static getTranslation(translations, langKey) {
    if (!translations) return null;
    if (translations[langKey]) return translations[langKey];

    // Fallback: Tìm key trong translations là tiền tố của langKey
    // Ví dụ: translations có "chinese", langKey là "chinesesimplified" -> khớp "chinese"
    let fallbackKey = null;
    for (const key of Object.keys(translations)) {
      if (langKey.startsWith(key) && key.length > 0) {
        if (!fallbackKey || key.length > fallbackKey.length) {
          fallbackKey = key;
        }
      }
    }
    if (fallbackKey) {
      console.log(`[YoutubeStudioPanel] Fallback: Lấy dữ liệu từ key "${fallbackKey}" cho "${langKey}"`);
      return translations[fallbackKey];
    }
    return null;
  }

  // Thêm hàm mới này vào class YoutubeStudioPanel
  _updateLanguageVisibility() {
    const keyword = this.el.querySelector(
      '#yt-language-search').value.trim().toLowerCase();
    const showSelectedOnly = this.el.querySelector(
      '#yt-filter-selected').checked;

    this.el.querySelectorAll('.yt-language-label').forEach(label => {
      const langName = label.textContent.trim().toLowerCase();
      const isChecked = label.querySelector('input').checked;

      const searchMatch = langName.includes(keyword);
      const filterMatch = !showSelectedOnly || (showSelectedOnly && isChecked);

      // Một ngôn ngữ được hiển thị KHI VÀ CHỈ KHI nó khớp với tìm kiếm VÀ khớp với bộ lọc
      if (searchMatch && filterMatch) {
        label.style.display = 'flex';
      } else {
        label.style.display = 'none';
      }
    });
  }


  /**
   * Chuẩn hóa tên ngôn ngữ để làm key an toàn.
   * Chuyển thành chữ thường, xóa khoảng trắng và các ký tự đặc biệt.
   * Ví dụ: "Bangla (India)" => "banglaindia"
   * @param {string} langName
   * @returns {string}
   */
  _normalizeLangKey(langName) {
    if (typeof langName !== 'string') return '';
    return langName.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
};