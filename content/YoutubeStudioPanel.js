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
// UPDATED HTML
// =================================================================
// Thay thế hằng số YTB_PANEL_HTML


const YTB_PANEL_HTML = `
  <div class="ts-title flex items-center mb-4 cursor-move select-none">
    <span class="text-xl mr-2">⚙️</span>
    <div>
      <h3 class="m-0 text-base font-bold text-gray-900 leading-tight">Video Subtitles & Info</h3>
      <div class="text-[10px] text-gray-500 font-medium tracking-tight">Languages & Metadata Automation</div>
    </div>
  </div>
  
  <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
    <label class="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest pl-1">Chọn Profile Ngôn ngữ</label>
    <div class="flex gap-2 mb-3">
      <select id="yt-profile-select" class="flex-1 h-9 px-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer"></select>
      <button id="yt-delete-profile-btn" class="w-9 h-9 flex items-center justify-center bg-white border border-rose-100 text-rose-500 rounded-lg hover:bg-rose-50 transition-all active:scale-90 shadow-sm" title="Delete selected profile">🗑️</button>
    </div>
    
    <div class="flex gap-2">
      <input type="text" id="yt-new-profile-name" class="flex-1 h-8 px-2 text-sm border border-gray-200 rounded-md bg-white focus:border-indigo-500 outline-none transition-all" placeholder="Tên profile mới...">
      <button id="yt-save-as-new-btn" class="h-8 px-3 bg-indigo-50 text-indigo-600 font-bold rounded-md text-[10px] hover:bg-indigo-100 transition-all active:scale-95">➕ Lưu mới</button>
    </div>
  </div>

  <div class="space-y-2 mb-4">
      <label class="flex items-center justify-between p-2 rounded-xl border border-gray-100 bg-white hover:border-indigo-100 cursor-pointer transition-all group">
         <div class="flex flex-col">
            <span class="text-xs font-bold text-gray-700 group-hover:text-indigo-700">Kênh lồng tiếng tự động (Aloud)</span>
            <span class="text-[9px] text-gray-400">Optimize for multi-language audio</span>
         </div>
         <input type="checkbox" id="yt-aloud-enabled" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
      </label>
      
      <label class="flex items-center justify-between p-2 rounded-xl border border-gray-100 bg-white hover:border-indigo-100 cursor-pointer transition-all group">
         <div class="flex flex-col">
            <span class="text-xs font-bold text-gray-700 group-hover:text-indigo-700">Tự động điền & Lưu</span>
            <span class="text-[9px] text-gray-400">Auto-fill metadata from JSON</span>
         </div>
         <input type="checkbox" id="yt-autofill-enabled" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
      </label>
  </div>
  
  <div class="flex flex-col flex-1 overflow-hidden bg-gray-50 rounded-xl border border-gray-100 p-3 mb-4">
    <label class="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest pl-1">🌍 Danh sách Ngôn ngữ</label>
    
    <div class="relative mb-2">
      <input type="text" id="yt-language-search" 
        class="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded-lg bg-white focus:border-indigo-500 outline-none transition-all" 
        placeholder="Tìm ngôn ngữ...">
      <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">🔍</span>
    </div>

    <div class="flex items-center justify-between mb-2 px-1">
      <label class="flex items-center gap-1.5 cursor-pointer group">
        <input type="checkbox" id="yt-filter-selected" class="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
        <span class="text-[10px] font-bold text-gray-400 group-hover:text-gray-600">Đã chọn</span>
      </label>
      <button id="yt-copy-selected-btn" class="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-all">
         📋 Copy List
      </button>
    </div>

    <div id="yt-language-checkbox-container" class="flex-1 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar"></div>
  </div>
  
  <div class="mb-4">
    <div class="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-100 mb-1 shadow-sm">
        <div class="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg text-base">📄</div>
        <div class="flex-1 min-w-0">
             <div class="text-[9px] font-bold text-gray-400 uppercase leading-none mb-0.5">Dữ liệu Dịch thuật</div>
             <div id="yt-json-filename" class="text-[11px] text-gray-700 font-bold truncate">Chưa có file nào</div>
        </div>
        <label for="yt-json-upload" class="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[9px] flex items-center justify-center cursor-pointer transition-all active:scale-90">
          Tải lên
        </label>
        <input type="file" id="yt-json-upload" accept=".json,.txt" class="hidden">
    </div>
  </div>
  
  <button id="yt-save-languages-btn" class="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5">
    💾 Cập nhật Profile
  </button>
`;
// =================================================================
// REWRITTEN PANEL CLASS
// =================================================================

window.YoutubeStudioPanel = class {
  constructor(onClose) {
    console.log("✔ YoutubeStudioPanel constructor")
    this.onClose = onClose;
    this.storageKeyProfiles = 'youtube_language_profiles';
    this.storageKeyTranslations = 'youtube_translation_data'; // Key mới cho dữ liệu JSON
    this.profiles = {};
    this.activeProfileName = 'default';
    this.translationObserver = null; // Biến để giữ MutationObserver

    this._render();
    this.loadProfiles();

    if (window.location.hostname.includes('studio.youtube.com')) {
      this.startTranslationObserver();
    }
  }

  // Thay thế hàm _render()

  _render() {
    this.el = document.createElement('div');
    this.el.id = 'youtube-studio-helper-panel';
    this.el.className = 'panel-box ts-panel w-[420px] p-4 rounded-xl shadow-2xl bg-white border border-gray-100 flex flex-col relative animate-in';
    this.el.style.maxHeight = "780px";
    this.el.innerHTML = YTB_PANEL_HTML;

    ChatGPTHelper.mountPanel(this.el);
    ChatGPTHelper.makeDraggable(this.el, ".ts-title");
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());

    const container = this.el.querySelector('#yt-language-checkbox-container');
    AVAILABLE_LANGUAGES.forEach(lang => {
      const label = document.createElement('label');
      label.className = 'flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white transition-all cursor-pointer group yt-language-label';
      label.innerHTML = `
        <input type="checkbox" value="${lang}" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"> 
        <span class="text-xs text-gray-600 group-hover:text-indigo-600 font-medium transition-colors">${lang}</span>
      `;

      // === THÊM EVENT CHO TỪNG CHECKBOX ===
      // Khi tick/untick một ngôn ngữ, gọi lại hàm cập nhật hiển thị
      label.querySelector('input').addEventListener('change', () => {
        this._updateLanguageVisibility();
      });

      container.appendChild(label);
    });

    this.attachEvents();
  }
  destroy() {
    this.stopTranslationObserver();
    this.el?.remove();
    this.onClose?.();
  }

  // Thay thế hàm attachEvents()

  attachEvents() {
    // Events cũ
    this.el.querySelector('#yt-save-languages-btn').addEventListener('click', () => this.saveCurrentProfile());
    this.el.querySelector('#yt-save-as-new-btn').addEventListener('click', () => this.saveAsNewProfile());
    this.el.querySelector('#yt-delete-profile-btn').addEventListener('click', () => this.deleteSelectedProfile());
    this.el.querySelector('#yt-profile-select').addEventListener('change', (e) => this.switchProfile(e.target.value));
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
        alert("Chưa có ngôn ngữ nào được chọn.");
        return;
      }

      const copyText = selectedLangs.join(', ');
      navigator.clipboard.writeText(copyText).then(() => {
        alert(`Đã sao chép ${selectedLangs.length} ngôn ngữ:\n\n${copyText}`);
      }).catch(err => {
        console.error('Copy failed:', err);
        alert('Lỗi khi sao chép.');
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

  updateProfileDropdown() {
    const select = this.el.querySelector('#yt-profile-select');
    if (!select) return;
    select.innerHTML = '';
    Object.keys(this.profiles).forEach(name => {
      const option = document.createElement('option');
      option.value = name; option.textContent = name;
      select.appendChild(option);
    });
    select.value = this.activeProfileName;
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
    chrome.storage.local.set({ [this.storageKey]: dataToSave }, callback);
    this._syncToFirestore();
  }

  saveCurrentProfile() {
    this.profiles[this.activeProfileName] = this.collectDataFromForm();
    this.saveAllDataToStorage(() => alert(`Profile "${this.activeProfileName}" updated!`));
  }

  saveAsNewProfile() {
    const newName = this.el.querySelector('#yt-new-profile-name').value.trim();
    if (!newName || this.profiles[newName]) {
      return alert(newName ? "Profile name already exists." : "Please enter a new profile name.");
    }
    this.profiles[newName] = this.collectDataFromForm();
    this.activeProfileName = newName;
    this.saveAllDataToStorage(() => {
      alert(`Saved new profile: "${newName}"`);
      this.el.querySelector('#yt-new-profile-name').value = '';
      this.updateProfileDropdown();
    });
  }

  deleteSelectedProfile() {
    const profileToDelete = this.el.querySelector('#yt-profile-select').value;
    if (Object.keys(this.profiles).length <= 1) {
      return alert("Cannot delete the last profile.");
    }
    if (confirm(`Delete profile "${profileToDelete}"?`)) {
      delete this.profiles[profileToDelete];
      this.activeProfileName = Object.keys(this.profiles)[0];
      this.saveAllDataToStorage(() => {
        alert(`Deleted profile: "${profileToDelete}"`);
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
    reader.onload = (e) => {
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

        chrome.storage.local.set({ [this.storageKeyTranslations]: translationsObject }, () => {
          this.el.querySelector('#yt-json-filename').textContent = `✅ Đã tải lên: ${file.name}`;
          alert('Đã lưu dữ liệu dịch thuật thành công!');
        });
      } catch (err) {
        this.el.querySelector('#yt-json-filename').textContent = `❌ Lỗi đọc file`;
        alert('Lỗi: File JSON không hợp lệ hoặc không đúng định dạng mảng.');
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
      const translationData = translations ? translations[jsonKey] : null;

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
        alert(`Không tìm thấy dữ liệu cho ngôn ngữ '${uiLanguageName}' (key: '${jsonKey}').`);
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