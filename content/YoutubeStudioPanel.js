// content/YoutubeStudioPanel.js (Refactored to use ChatGPTHelper system)

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
const YTB_PANEL_HTML = `
  <h3 class="ts-title">⚙️ Configure Languages</h3>
  
  <!-- PROFILE MANAGEMENT UI -->
  <div class="profile-manager">
    <select id="yt-profile-select" class="form-control"></select>
    <button id="yt-delete-profile-btn" class="ts-btn ts-btn-danger" title="Delete selected profile">🗑️</button>
  </div>
  <div class="profile-new">
    <input type="text" id="yt-new-profile-name" class="form-control" placeholder="Tên profile mới...">
    <button id="yt-save-as-new-btn" class="ts-btn">➕ Lưu mới</button>
  </div>
  <hr class="divider">
  <!-- END PROFILE UI -->

  <p style="font-size: 13px; color: #555;">Select languages for the current profile.</p>
  <input type="text" id="yt-language-search" class="form-control" placeholder="🔍 Tìm ngôn ngữ...">
  
  <div id="yt-language-checkbox-container"></div>
  <button id="yt-save-languages-btn" class="ts-btn ts-btn-accent" style="width: 100%; margin-top: 10px;">💾 Cập nhật Profile</button>
`;

// =================================================================
// REWRITTEN PANEL CLASS
// =================================================================

window.YoutubeStudioPanel = class {
  constructor(onClose) { // Nhận onClose từ ChatGPTHelper
    this.onClose = onClose;
    this.storageKey = 'youtube_language_profiles';
    this.profiles = {};
    this.activeProfileName = 'default';

    this._render();
    this.loadProfiles();
  }

  _render() {
    this.el = document.createElement('div');
    this.el.id = 'youtube-studio-helper-panel';
    // SỬ DỤNG CLASS CHUNG
    this.el.className = 'panel-box ts-panel';
    this.el.innerHTML = YTB_PANEL_HTML;

    // TÍCH HỢP VÀO HỆ THỐNG PANEL CHUNG
    ChatGPTHelper.mountPanel(this.el);
    ChatGPTHelper.makeDraggable(this.el, ".ts-title");
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());

    // Tạo danh sách ngôn ngữ một lần
    const container = this.el.querySelector('#yt-language-checkbox-container');
    AVAILABLE_LANGUAGES.forEach(lang => {
      const label = document.createElement('label');
      label.className = 'yt-language-label'; // Giữ lại class này để style checkbox
      label.innerHTML = `<input type="checkbox" value="${lang}"> ${lang}`;
      container.appendChild(label);
    });

    this.attachEvents();
  }

  // Hàm destroy để dọn dẹp
  destroy() {
    this.el?.remove();
    this.onClose?.(); // Báo cho helper biết là đã đóng
  }

  attachEvents() {
    this.el.querySelector('#yt-save-languages-btn').addEventListener('click', () => this.saveCurrentProfile());
    this.el.querySelector('#yt-save-as-new-btn').addEventListener('click', () => this.saveAsNewProfile());
    this.el.querySelector('#yt-delete-profile-btn').addEventListener('click', () => this.deleteSelectedProfile());
    this.el.querySelector('#yt-profile-select').addEventListener('change', (e) => this.switchProfile(e.target.value));

    // Search event
    this.el.querySelector('#yt-language-search').addEventListener('input', (e) => {
        const keyword = e.target.value.trim().toLowerCase();
        this.el.querySelectorAll('.yt-language-label').forEach(label => {
            const langName = label.textContent.trim().toLowerCase();
            label.style.display = langName.includes(keyword) ? 'flex' : 'none';
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

    this.profiles = localData.profiles || { 'default': [] };
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
    const savedLangs = this.profiles[profileName] || [];
    this.el.querySelectorAll('.yt-language-label input[type="checkbox"]').forEach(cb => {
      cb.checked = savedLangs.includes(cb.value);
    });
  }

  switchProfile(profileName) {
    this.activeProfileName = profileName;
    this.fillFormWithProfile(profileName);
    this.saveAllDataToStorage();
  }

  collectDataFromForm() {
    return Array.from(this.el.querySelectorAll('.yt-language-label input:checked')).map(cb => cb.value);
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
}