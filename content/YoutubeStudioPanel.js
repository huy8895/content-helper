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
  <div class="ts-title ts-flex ts-items-center ts-mb-4 ts-cursor-move ts-select-none">
    <span class="ts-text-xl ts-mr-2">⚙️</span>
    <div>
      <h3 class="ts-m-0 ts-text-base ts-font-bold ts-text-gray-900 ts-leading-tight">Video Subtitles & Info</h3>
      <div class="ts-text-[10px] ts-text-gray-500 ts-font-medium ts-tracking-tight">Languages & Metadata Automation</div>
    </div>
  </div>
  
  <div class="ts-bg-gray-50 ts-p-3 ts-rounded-xl ts-border ts-border-gray-100 ts-mb-4">
    <div class="ts-flex ts-items-center ts-justify-between ts-mb-2 ts-pl-1">
      <label class="ts-text-[10px] ts-font-bold ts-text-gray-400 ts-uppercase ts-tracking-widest ts-leading-none">Profile Ngôn ngữ</label>
      <div class="ts-flex ts-gap-2">
         <button id="ytsp-new-profile" class="ts-text-[10px] ts-font-bold ts-text-indigo-600 ts-hover:text-indigo-800 ts-transition-colors">➕ Mới</button>
         <button id="ytsp-delete-profile" class="ts-text-[10px] ts-font-bold ts-text-rose-500 ts-hover:text-rose-700 ts-transition-colors">🗑️ Xóa</button>
      </div>
    </div>
    <div class="ts-flex ts-gap-2 ts-mb-3">
      <div id="yt-profile-dropdown-container" class="custom-dropdown-container ts-flex-1">
        <button id="yt-profile-dropdown-trigger" class="custom-dropdown-trigger">
          <span id="yt-profile-selected-text">Tải Profile...</span>
          <svg class="ts-w-4 ts-h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div id="yt-profile-dropdown-menu" class="custom-dropdown-menu custom-scrollbar"></div>
      </div>
    </div>
    
    <div id="yt-new-profile-group" class="ts-hidden ts-flex ts-gap-2 animate-in">
      <input type="text" id="yt-new-profile-name" class="ts-flex-1 ts-h-8 ts-px-2 ts-text-sm ts-border ts-border-gray-200 ts-rounded-md ts-bg-white ts-focus:border-indigo-500 ts-outline-none ts-transition-all" placeholder="Tên profile mới...">
      <button id="yt-save-as-new-btn" class="ts-h-8 ts-px-3 ts-bg-indigo-50 ts-text-indigo-600 ts-font-bold ts-rounded-md ts-text-[10px] ts-hover:bg-indigo-100 ts-transition-all ts-active:scale-95">Lưu</button>
    </div>
  </div>

  <div class="ts-space-y-2 ts-mb-4">
      <label class="ts-flex ts-items-center ts-justify-between ts-p-2 ts-rounded-xl ts-border ts-border-gray-100 ts-bg-white ts-hover:border-indigo-100 ts-cursor-pointer ts-transition-all group">
         <div class="ts-flex ts-flex-col">
            <span class="ts-text-xs ts-font-bold ts-text-gray-700 group-hover:text-emerald-700">Kênh lồng tiếng tự động (Aloud)</span>
            <span class="ts-text-[9px] ts-text-gray-400">Optimize for multi-language audio</span>
         </div>
          <input type="checkbox" id="yt-aloud-enabled" class="ts-switch">
      </label>
      
      <label class="ts-flex ts-items-center ts-justify-between ts-p-2 ts-rounded-xl ts-border ts-border-gray-100 ts-bg-white ts-hover:border-indigo-100 ts-cursor-pointer ts-transition-all group">
         <div class="ts-flex ts-flex-col">
            <span class="ts-text-xs ts-font-bold ts-text-gray-700 group-hover:text-emerald-700">Tự động điền & Lưu</span>
            <span class="ts-text-[9px] ts-text-gray-400">Auto-fill metadata from JSON</span>
         </div>
          <input type="checkbox" id="yt-autofill-enabled" class="ts-switch">
      </label>
  </div>
  
  <div class="ts-flex ts-flex-col ts-flex-1 ts-overflow-hidden ts-bg-gray-50 ts-rounded-xl ts-border ts-border-gray-100 ts-p-3 ts-mb-4">
    <label class="ts-text-[10px] ts-font-bold ts-text-gray-400 ts-uppercase ts-mb-2 ts-block ts-tracking-widest ts-pl-1">🌍 Danh sách Ngôn ngữ</label>
    
    <div class="ts-relative ts-mb-2">
      <input type="text" id="yt-language-search" 
        class="ts-w-full ts-h-8 ts-pl-8 ts-pr-3 ts-text-sm ts-border ts-border-gray-300 ts-rounded-lg ts-bg-gray-50 ts-focus:bg-white ts-focus:border-indigo-500 ts-outline-none ts-transition-all"
        placeholder="Tìm ngôn ngữ...">
      <span class="ts-absolute ts-left-2.5 ts-top-1/2 ts--translate-y-1/2 ts-text-gray-400 ts-text-[10px]">🔍</span>
    </div>

    <div class="ts-flex ts-items-center ts-justify-between ts-mb-2 ts-px-1">
      <label class="ts-flex ts-items-center ts-gap-1.5 ts-cursor-pointer group">
          <input type="checkbox" id="yt-filter-selected" class="ts-w-4 ts-h-4 ts-text-indigo-600 ts-border-gray-300 ts-rounded ts-focus:ring-indigo-500 ts-cursor-pointer ts-transition-all">
        <span class="ts-text-[10px] ts-font-bold ts-text-gray-400 group-hover:text-gray-600">Đã chọn</span>
      </label>
      <button id="yt-copy-selected-btn" class="ts-text-[9px] ts-font-bold ts-text-indigo-500 ts-hover:text-indigo-700 ts-flex ts-items-center ts-gap-1 ts-transition-all">
         📋 Copy List
      </button>
    </div>

    <div id="yt-language-checkbox-container" class="ts-min-h-[120px] ts-max-h-[160px] ts-overflow-y-auto ts-pr-1 ts-space-y-0.5 custom-scrollbar"></div>
  </div>
  
  <div class="ts-mb-4">
    <div class="ts-flex ts-items-center ts-gap-3 ts-bg-white ts-p-2.5 ts-rounded-xl ts-border ts-border-gray-100 ts-mb-1 ts-shadow-sm">
        <div class="ts-w-8 ts-h-8 ts-flex ts-items-center ts-justify-center ts-bg-indigo-50 ts-text-indigo-600 ts-rounded-lg ts-text-base">📄</div>
        <div class="ts-flex-1 ts-min-w-0">
             <div class="ts-text-[9px] ts-font-bold ts-text-gray-400 ts-uppercase ts-leading-none ts-mb-0.5">Dữ liệu Dịch thuật</div>
             <div id="yt-json-filename" class="ts-text-[11px] ts-text-gray-700 ts-font-bold ts-truncate">Chưa có file nào</div>
        </div>
        <label for="yt-json-upload" class="ts-h-7 ts-px-2.5 ts-bg-indigo-600 ts-hover:bg-indigo-700 ts-text-white ts-font-bold ts-rounded-lg ts-text-[9px] ts-flex ts-items-center ts-justify-center ts-cursor-pointer ts-transition-all ts-active:scale-90">
          Tải lên
        </label>
        <input type="file" id="yt-json-upload" accept=".json,.txt" class="ts-hidden">
    </div>
  </div>
  
  <button id="yt-save-languages-btn" class="ts-w-full ts-h-[42px] ts-flex-shrink-0 ts-bg-indigo-50 ts-border ts-border-indigo-100 ts-text-indigo-700 ts-font-bold ts-rounded-xl ts-text-[13px] ts-hover:bg-indigo-100 ts-transition-all ts-active:scale-95 ts-flex ts-items-center ts-justify-center ts-shadow-sm">
    Cập nhật Profile
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
    this.el.className = 'ts-panel animate-in';

    this.el.innerHTML = YTB_PANEL_HTML;

    ChatGPTHelper.mountPanel(this.el);
    ChatGPTHelper.makeDraggable(this.el, ".ts-title");
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());

    const container = this.el.querySelector('#yt-language-checkbox-container');
    AVAILABLE_LANGUAGES.forEach(lang => {
      const label = document.createElement('label');
      label.className = 'flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white transition-all cursor-pointer group yt-language-label';
      label.innerHTML = `
        <input type="checkbox" value="${lang}" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer transition-all"> 
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
        ChatGPTHelper.showToast("Chưa có ngôn ngữ nào được chọn.", "warning");
        return;
      }

      const copyText = selectedLangs.join(', ');
      navigator.clipboard.writeText(copyText).then(() => {
        ChatGPTHelper.showToast(`Đã sao chép ${selectedLangs.length} ngôn ngữ.`, "success");
      }).catch(err => {
        console.error('Copy failed:', err);
        ChatGPTHelper.showToast('Lỗi khi sao chép.', "error");
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
    chrome.storage.local.set({ [this.storageKeyProfiles]: dataToSave }, callback);
    this._syncToFirestore();
  }

  saveCurrentProfile() {
    this.profiles[this.activeProfileName] = this.collectDataFromForm();
    this.saveAllDataToStorage(() => ChatGPTHelper.showToast(`Profile "${this.activeProfileName}" updated!`, "success"));
  }

  saveAsNewProfile() {
    const newName = this.el.querySelector('#yt-new-profile-name').value.trim();
    if (this.profiles[newName] || !newName) {
      ChatGPTHelper.showToast(newName ? "Profile name already exists." : "Please enter a new profile name.", "warning");
      return;
    }
    this.profiles[newName] = this.collectDataFromForm();
    this.activeProfileName = newName;
    this.saveAllDataToStorage(() => {
      ChatGPTHelper.showToast(`Saved new profile: "${newName}"`, "success");
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
      ChatGPTHelper.showToast("Cannot delete the last profile.", "warning");
      return;
    }
    if (confirm(`Delete profile "${profileToDelete}"?`)) {
      delete this.profiles[profileToDelete];
      this.activeProfileName = Object.keys(this.profiles)[0];
      this.saveAllDataToStorage(() => {
        ChatGPTHelper.showToast(`Deleted profile: "${profileToDelete}"`, "success");
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
        ChatGPTHelper.showToast('Đã lưu dữ liệu dịch thuật thành công!', "success");
      } catch (err) {
        this.el.querySelector('#yt-json-filename').textContent = `❌ Lỗi đọc file`;
        ChatGPTHelper.showToast('Lỗi: File JSON không hợp lệ hoặc không đúng định dạng mảng.', "error");
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
        ChatGPTHelper.showToast(`Không tìm thấy dữ liệu cho ngôn ngữ '${uiLanguageName}' (key: '${jsonKey}').`, "warning");
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