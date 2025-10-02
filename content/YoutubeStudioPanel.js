// content/YoutubeStudioPanel.js (Profile Version)

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
  <div class="panel-header">
    <h4>⚙️ Configure Languages</h4>
    <button id="yt-close-panel-btn" class="btn-close" title="Close">×</button>
  </div>
  
  <!-- PROFILE MANAGEMENT UI -->
  <div class="yt-profile-manager">
    <select id="yt-profile-select" class="yt-form-control"></select>
    <button id="yt-delete-profile-btn" title="Delete selected profile">🗑️</button>
  </div>
  <div class="yt-profile-new">
    <input type="text" id="yt-new-profile-name" class="yt-form-control" placeholder="Tên profile mới...">
    <button id="yt-save-as-new-btn" class="yt-btn-secondary">➕ Lưu mới</button>
  </div>
  <hr class="yt-divider">
  <!-- END PROFILE UI -->

  <p>Select languages for the current profile.</p>
  <input type="text" id="yt-language-search" class="yt-form-control" placeholder="🔍 Tìm ngôn ngữ...">
  
  <div id="yt-language-checkbox-container"></div>
  <button id="yt-save-languages-btn" class="btn-save">💾 Cập nhật Profile</button>
`;

// =================================================================
// UPDATED CSS
// =================================================================
const YTB_PANEL_CSS = `
  #youtube-studio-helper-panel {
    position: fixed; top: 70px; right: 20px; width: 320px;
    max-height: calc(100vh - 90px); background: #282828; border: 1px solid #3f3f3f;
    border-radius: 12px; padding: 20px; z-index: 10001; box-shadow: 0 8px 16px rgba(0,0,0,0.3);
    font-family: 'Roboto', Arial, sans-serif; color: #fff; font-size: 14px;
    display: flex; flex-direction: column;
  }
  .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
  h4 { margin: 0; font-size: 16px; font-weight: 500; color: #f1f1f1; }
  .btn-close { background: none; border: none; color: #aaa; font-size: 24px; cursor: pointer; }
  .btn-close:hover { color: #fff; }
  p { font-size: 13px; color: #aaa; margin: 0 0 10px; }

  /* Profile & Search Styles */
  .yt-form-control { width: 100%; padding: 8px 12px; background: #3f3f3f; border: 1px solid #555; border-radius: 6px; color: #fff; box-sizing: border-box; margin-bottom: 10px; }
  .yt-profile-manager, .yt-profile-new { display: flex; gap: 8px; align-items: center; }
  #yt-profile-select { flex-grow: 1; }
  .yt-btn-secondary, #yt-delete-profile-btn { padding: 8px; background: #555; border: 1px solid #666; color: #fff; border-radius: 6px; cursor: pointer; }
  #yt-delete-profile-btn { background-color: #581c1c; border-color: #991b1b; }
  .yt-divider { border: none; border-top: 1px solid #3f3f3f; margin: 15px 0; }

  #yt-language-checkbox-container { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; overflow-y: auto; flex-grow: 1; }
  .yt-language-label { display: flex; align-items: center; cursor: pointer; padding: 5px; border-radius: 4px; transition: background-color 0.2s; }
  .yt-language-label:hover { background-color: #3f3f3f; }
  .yt-language-label input[type="checkbox"] { margin-right: 12px; width: 16px; height: 16px; }
  
  .btn-save { width: 100%; padding: 10px; background: #3ea6ff; color: #0d0d0d; border: none; border-radius: 6px; cursor: pointer; font-size: 15px; font-weight: 500; margin-top: auto; }
  .btn-save:hover { background: #65baff; }
`;


// =================================================================
// REWRITTEN PANEL CLASS
// =================================================================

window.YoutubeStudioPanel = class {
  constructor() {
    this.panelId = 'youtube-studio-helper-panel';
    this.styleId = `${this.panelId}-styles`;
    this.storageKey = 'youtube_language_profiles'; // New storage key for profiles
    this.profiles = {};
    this.activeProfileName = 'default';
  }

  init() {
    if (document.getElementById(this.panelId)) return;
    this.injectStyles();
    this.createPanel();
    this.attachEvents();
    this.loadProfiles(); // Load profiles instead of single setting
  }

  togglePanel() {
    const panel = document.getElementById(this.panelId);
    if (panel) panel.remove();
    else this.init();
  }

  injectStyles() {
    if (document.getElementById(this.styleId)) return;
    const styleElement = document.createElement('style');
    styleElement.id = this.styleId;
    styleElement.textContent = YTB_PANEL_CSS;
    document.head.appendChild(styleElement);
  }

  createPanel() {
    const panel = document.createElement('div');
    panel.id = this.panelId;
    panel.innerHTML = YTB_PANEL_HTML;
    document.body.appendChild(panel);

    const container = panel.querySelector('#yt-language-checkbox-container');
    AVAILABLE_LANGUAGES.forEach(lang => {
      const label = document.createElement('label');
      label.className = 'yt-language-label';
      label.innerHTML = `<input type="checkbox" value="${lang}"> ${lang}`;
      container.appendChild(label);
    });
  }

  attachEvents() {
    document.getElementById('yt-close-panel-btn').addEventListener('click', () => this.togglePanel());
    document.getElementById('yt-save-languages-btn').addEventListener('click', () => this.saveCurrentProfile());
    document.getElementById('yt-save-as-new-btn').addEventListener('click', () => this.saveAsNewProfile());
    document.getElementById('yt-delete-profile-btn').addEventListener('click', () => this.deleteSelectedProfile());
    document.getElementById('yt-profile-select').addEventListener('change', (e) => this.switchProfile(e.target.value));

    // Search event
    document.getElementById('yt-language-search').addEventListener('input', (e) => {
        const keyword = e.target.value.trim().toLowerCase();
        document.querySelectorAll('.yt-language-label').forEach(label => {
            const langName = label.textContent.trim().toLowerCase();
            label.style.display = langName.includes(keyword) ? 'flex' : 'none';
        });
    });
  }

  // --- PROFILE MANAGEMENT LOGIC ---

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

    this.profiles = localData.profiles || { 'default': [] }; // Default profile is an empty array
    this.activeProfileName = localData.activeProfileName || 'default';
    this.updateProfileDropdown();
    this.fillFormWithProfile(this.activeProfileName);
  }

  updateProfileDropdown() {
    const select = document.getElementById('yt-profile-select');
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
    document.querySelectorAll('.yt-language-label input[type="checkbox"]').forEach(cb => {
      cb.checked = savedLangs.includes(cb.value);
    });
  }

  switchProfile(profileName) {
    this.activeProfileName = profileName;
    this.fillFormWithProfile(profileName);
    this.saveAllDataToStorage();
  }

  collectDataFromForm() {
    return Array.from(document.querySelectorAll('.yt-language-label input:checked')).map(cb => cb.value);
  }

  saveAllDataToStorage(callback) {
    const dataToSave = {
      profiles: this.profiles,
      activeProfileName: this.activeProfileName,
    };
    chrome.storage.local.set({ [this.storageKey]: dataToSave }, callback);
    this._syncToFirestore(); // Sync on every change
  }

  saveCurrentProfile() {
    this.profiles[this.activeProfileName] = this.collectDataFromForm();
    this.saveAllDataToStorage(() => alert(`Profile "${this.activeProfileName}" updated!`));
  }

  saveAsNewProfile() {
    const newName = document.getElementById('yt-new-profile-name').value.trim();
    if (!newName || this.profiles[newName]) {
      return alert(newName ? "Profile name already exists." : "Please enter a new profile name.");
    }
    this.profiles[newName] = this.collectDataFromForm();
    this.activeProfileName = newName;
    this.saveAllDataToStorage(() => {
      alert(`Saved new profile: "${newName}"`);
      document.getElementById('yt-new-profile-name').value = '';
      this.updateProfileDropdown();
    });
  }

  deleteSelectedProfile() {
    const profileToDelete = document.getElementById('yt-profile-select').value;
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
    console.log("☁️ YT Panel: Syncing profiles to Firestore...");
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
      console.log("☁️ YT Panel: Profiles synced successfully.");
    } catch (err) {
      console.error("❌ YT Panel: Error syncing to Firestore:", err);
    }
  }
}