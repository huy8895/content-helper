/**
 * YoutubeProfileModule – Quản lý YouTube Language Profiles trên trang Options.
 * Kế thừa BaseModule, sử dụng chung storage key với YoutubeStudioPanel.
 */

// Danh sách ngôn ngữ (dùng chung với YoutubeStudioPanel.js)
const YOUTUBE_LANGUAGES = [
  'Abkhazian','Afar','Afrikaans','Akan','Akkadian','Albanian',
  'American Sign Language','Amharic','Arabic','Aramaic','Armenian',
  'Assamese','Aymara','Azerbaijani','Bambara','Bangla','Bangla (India)',
  'Bashkir','Basque','Belarusian','Bhojpuri','Bislama','Bodo',
  'Bosnian','Breton','Bulgarian','Burmese','Cantonese',
  'Cantonese (Hong Kong)','Catalan','Cherokee','Chinese','Chinese (China)',
  'Chinese (Hong Kong)','Chinese (Simplified)','Chinese (Singapore)',
  'Chinese (Taiwan)','Chinese (Traditional)','Choctaw','Coptic','Corsican',
  'Cree','Croatian','Czech','Danish','Dogri','Dutch','Dutch (Belgium)',
  'Dutch (Netherlands)','Dzongkha','English','English (Australia)',
  'English (Canada)','English (India)','English (Ireland)',
  'English (United Kingdom)','English (United States)','Esperanto',
  'Estonian','Ewe','Faroese','Fijian','Filipino','Finnish','French',
  'French (Belgium)','French (Canada)','French (France)',
  'French (Switzerland)','Fula','Galician','Ganda','Georgian','German',
  'German (Austria)','German (Germany)','German (Switzerland)','Greek',
  'Guarani','Gujarati','Gusii','Haitian Creole','Hakka Chinese',
  'Hakka Chinese (Taiwan)','Haryanvi','Hausa','Hawaiian','Hebrew','Hindi',
  'Hindi (Latin)','Hiri Motu','Hungarian','Icelandic','Igbo','Indonesian',
  'Interlingua','Interlingue','Inuktitut','Inupiaq','Irish','Italian',
  'Japanese','Javanese','Kalaallisut','Kalenjin','Kamba','Kannada',
  'Kashmiri','Kazakh','Khmer','Kikuyu','Kinyarwanda','Klingon','Konkani',
  'Korean','Kurdish','Kyrgyz','Ladino','Lao','Latin','Latvian','Lingala',
  'Lithuanian','Lower Sorbian','Luba-Katanga','Luo','Luxembourgish','Luyia',
  'Macedonian','Maithili','Malagasy','Malay','Malay (Singapore)',
  'Malayalam','Maltese','Manipuri','Māori','Marathi','Masai','Meru',
  'Min Nan Chinese','Min Nan Chinese (Taiwan)','Mixe','Mizo','Mongolian',
  'Mongolian (Mongolian)','Nauru','Navajo','Nepali','Nigerian Pidgin',
  'North Ndebele','Northern Sotho','Norwegian','Occitan','Odia','Oromo',
  'Papiamento','Pashto','Persian','Persian (Afghanistan)','Persian (Iran)',
  'Polish','Portuguese','Portuguese (Brazil)','Portuguese (Portugal)',
  'Punjabi','Quechua','Romanian','Romanian (Moldova)','Romansh','Rundi',
  'Russian','Russian (Latin)','Samoan','Sango','Sanskrit','Santali',
  'Sardinian','Scottish Gaelic','Serbian','Serbian (Cyrillic)',
  'Serbian (Latin)','Serbo-Croatian','Sherdukpen','Shona','Sicilian',
  'Sindhi','Sinhala','Slovak','Slovenian','Somali','South Ndebele',
  'Southern Sotho','Spanish','Spanish (Latin America)','Spanish (Mexico)',
  'Spanish (Spain)','Spanish (United States)','Sundanese','Swahili',
  'Swati','Swedish','Tagalog','Tajik','Tamil','Tatar','Telugu','Thai',
  'Tibetan','Tigrinya','Tok Pisin','Toki Pona','Tongan','Tsonga',
  'Tswana','Turkish','Turkmen','Twi','Ukrainian','Upper Sorbian',
  'Urdu','Uyghur','Uzbek','Venda','Vietnamese','Volapük','Võro',
  'Welsh','Western Frisian','Wolaytta','Wolof','Xhosa','Yiddish',
  'Yoruba','Zulu'
];

class YoutubeProfileModule extends BaseModule {
  constructor() {
    super('main-content', 'youtube_language_profiles', 'youtube_language_profiles');
    this.profiles = {};
    this.activeProfileName = 'default';
    this.storageKeyTranslations = 'youtube_translation_data';
  }

  /**
   * Render giao diện module YouTube Profiles.
   */
  async render() {
    const data = await this.loadFromStorage();
    this.profiles = data.profiles || { 'default': { languages: [], isAloudChannel: false, isAutofillEnabled: false } };
    this.activeProfileName = data.activeProfileName || 'default';

    const html = `
      <div class="module-section">
        <div class="page-header">
          <h2>🌍 YouTube Language Profiles</h2>
          <p>Quản lý danh sách ngôn ngữ phụ đề và metadata cho YouTube Studio.</p>
        </div>

        ${this.buildProfileBarHTML(this.profiles, this.activeProfileName, 'yt')}

        <!-- Form tạo profile mới -->
        <div class="card hidden" id="yt-new-profile-card">
          <div style="display:flex;gap:8px;align-items:center">
            <input type="text" class="form-input" id="yt-new-profile-name"
              placeholder="Tên profile mới..." style="flex:1">
            <button class="btn btn-primary btn-sm" id="yt-save-new-profile">Lưu</button>
            <button class="btn btn-ghost btn-sm" id="yt-cancel-new-profile">Hủy</button>
          </div>
        </div>

        <!-- Toggles -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">⚙️ Tùy chọn: <strong id="yt-current-name">${this.activeProfileName}</strong></span>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
            <label class="toggle-wrapper">
              <div>
                <div class="toggle-label">Kênh lồng tiếng tự động (Aloud)</div>
                <div class="toggle-desc">Optimize for multi-language audio</div>
              </div>
              <input type="checkbox" class="toggle-switch" id="yt-aloud">
            </label>
            <label class="toggle-wrapper">
              <div>
                <div class="toggle-label">Tự động điền & Lưu</div>
                <div class="toggle-desc">Auto-fill metadata from JSON</div>
              </div>
              <input type="checkbox" class="toggle-switch" id="yt-autofill">
            </label>
          </div>

          <!-- JSON Upload -->
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:12px;background:var(--color-bg);border:1px solid var(--color-border);border-radius:8px;">
            <div style="font-size:24px;">📄</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:11px;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;margin-bottom:4px;">Dữ liệu Dịch thuật</div>
              <div id="yt-json-filename" style="font-size:13px;font-weight:600;color:var(--color-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Chưa có file nào</div>
            </div>
            <label for="yt-json-upload" class="btn btn-primary btn-sm" style="cursor:pointer;margin:0;">
              Tải lên
            </label>
            <input type="file" id="yt-json-upload" accept=".json,.txt" style="display:none;">
          </div>

          <!-- Language search + filter -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <div class="search-box" style="max-width:none;flex:1">
              <span class="search-icon">🔍</span>
              <input type="text" id="yt-lang-search" placeholder="Tìm ngôn ngữ...">
            </div>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--color-text-secondary);cursor:pointer;white-space:nowrap">
              <input type="checkbox" id="yt-filter-selected" style="accent-color:var(--color-primary)">
              Đã chọn
            </label>
            <span id="yt-selected-count" style="font-size:11px;font-weight:700;color:var(--color-primary);white-space:nowrap"></span>
          </div>

          <!-- Language grid -->
          <div class="lang-grid custom-scroll" id="yt-lang-grid"></div>

          <button class="btn btn-primary" id="yt-save-btn" style="width:100%;margin-top:20px">
            💾 Cập nhật Profile
          </button>
        </div>
      </div>
    `;

    this.containerEl.innerHTML = html;
    this._renderLanguageGrid();
    this._fillForm(this.activeProfileName);
    this._bindEvents();
  }

  /**
   * Render danh sách checkbox ngôn ngữ.
   */
  _renderLanguageGrid() {
    const grid = this.containerEl.querySelector('#yt-lang-grid');
    grid.innerHTML = YOUTUBE_LANGUAGES.map(lang => `
      <label class="lang-item" data-lang="${lang.toLowerCase()}">
        <input type="checkbox" value="${lang}">
        <span>${lang}</span>
      </label>
    `).join('');
  }

  /**
   * Điền dữ liệu profile vào form.
   * @param {string} profileName
   */
  _fillForm(profileName) {
    const p = this.profiles[profileName] || { languages: [], isAloudChannel: false, isAutofillEnabled: false };
    this.containerEl.querySelector('#yt-aloud').checked = p.isAloudChannel || false;
    this.containerEl.querySelector('#yt-autofill').checked = p.isAutofillEnabled || false;
    this.containerEl.querySelector('#yt-current-name').textContent = profileName;

    // Set checked state cho languages
    const langs = p.languages || [];
    this.containerEl.querySelectorAll('#yt-lang-grid input[type="checkbox"]').forEach(cb => {
      cb.checked = langs.includes(cb.value);
    });
    this._updateSelectedCount();
    this._filterLanguages();
  }

  /**
   * Thu thập dữ liệu từ form.
   * @returns {Object}
   */
  _collectForm() {
    return {
      languages: Array.from(this.containerEl.querySelectorAll('#yt-lang-grid input:checked')).map(cb => cb.value),
      isAloudChannel: this.containerEl.querySelector('#yt-aloud').checked,
      isAutofillEnabled: this.containerEl.querySelector('#yt-autofill').checked,
    };
  }

  /** Lưu + sync */
  async _saveAll() {
    const dataToSave = { profiles: this.profiles, activeProfileName: this.activeProfileName };
    await this.saveToStorage(dataToSave);
    await this.syncToFirestore(dataToSave);
  }

  /** Refresh dropdown */
  _refreshSelect() {
    const select = this.containerEl.querySelector('#yt-profile-select');
    select.innerHTML = Object.keys(this.profiles)
      .map(n => `<option value="${n}" ${n === this.activeProfileName ? 'selected' : ''}>${n}</option>`)
      .join('');
  }

  /** Cập nhật số ngôn ngữ đã chọn */
  _updateSelectedCount() {
    const count = this.containerEl.querySelectorAll('#yt-lang-grid input:checked').length;
    const el = this.containerEl.querySelector('#yt-selected-count');
    if (el) el.textContent = count > 0 ? `${count} ngôn ngữ` : '';
  }

  /** Lọc ngôn ngữ theo search + filter */
  _filterLanguages() {
    const keyword = (this.containerEl.querySelector('#yt-lang-search')?.value || '').toLowerCase();
    const showSelectedOnly = this.containerEl.querySelector('#yt-filter-selected')?.checked || false;

    this.containerEl.querySelectorAll('.lang-item').forEach(item => {
      const langName = item.dataset.lang;
      const isChecked = item.querySelector('input').checked;
      const matchSearch = langName.includes(keyword);
      const matchFilter = !showSelectedOnly || isChecked;
      item.style.display = (matchSearch && matchFilter) ? 'flex' : 'none';
    });
  }

  /** Gắn event listeners */
  _bindEvents() {
    // Chuyển profile
    this.containerEl.querySelector('#yt-profile-select').onchange = (e) => {
      this.activeProfileName = e.target.value;
      this._fillForm(this.activeProfileName);
      this._saveAll();
    };

    // Lưu profile
    this.containerEl.querySelector('#yt-save-btn').onclick = () => {
      this.profiles[this.activeProfileName] = this._collectForm();
      this._saveAll();
      BaseModule.showToast(`Profile "${this.activeProfileName}" đã cập nhật!`, 'success');
    };

    // Tạo mới
    this.containerEl.querySelector('#yt-new-profile').onclick = () => {
      this.containerEl.querySelector('#yt-new-profile-card').classList.remove('hidden');
      this.containerEl.querySelector('#yt-new-profile-name').value = '';
      this.containerEl.querySelector('#yt-new-profile-name').focus();
    };
    this.containerEl.querySelector('#yt-cancel-new-profile').onclick = () => {
      this.containerEl.querySelector('#yt-new-profile-card').classList.add('hidden');
    };
    this.containerEl.querySelector('#yt-save-new-profile').onclick = () => {
      const name = this.containerEl.querySelector('#yt-new-profile-name').value.trim();
      if (!name) { BaseModule.showToast('Vui lòng nhập tên.', 'warning'); return; }
      if (this.profiles[name]) { BaseModule.showToast('Tên đã tồn tại.', 'warning'); return; }
      this.profiles[name] = this._collectForm();
      this.activeProfileName = name;
      this._saveAll();
      this._refreshSelect();
      this._fillForm(name);
      this.containerEl.querySelector('#yt-new-profile-card').classList.add('hidden');
      BaseModule.showToast(`Đã tạo profile "${name}"`, 'success');
    };

    // Xóa
    this.containerEl.querySelector('#yt-delete-profile').onclick = () => {
      if (Object.keys(this.profiles).length <= 1) { BaseModule.showToast('Không thể xóa profile cuối.', 'warning'); return; }
      if (confirm(`Xóa profile "${this.activeProfileName}"?`)) {
        const del = this.activeProfileName;
        delete this.profiles[this.activeProfileName];
        this.activeProfileName = Object.keys(this.profiles)[0];
        this._saveAll();
        this._refreshSelect();
        this._fillForm(this.activeProfileName);
        BaseModule.showToast(`Đã xóa "${del}"`, 'success');
      }
    };

    // Search + Filter
    this.containerEl.querySelector('#yt-lang-search').oninput = () => this._filterLanguages();
    this.containerEl.querySelector('#yt-filter-selected').onchange = () => this._filterLanguages();

    // Cập nhật count khi tick/untick
    this.containerEl.querySelector('#yt-lang-grid').addEventListener('change', () => {
      this._updateSelectedCount();
      this._filterLanguages();
    });

    // Upload JSON
    const jsonUploadEl = this.containerEl.querySelector('#yt-json-upload');
    if (jsonUploadEl) {
      jsonUploadEl.addEventListener('change', (e) => this._handleJsonUpload(e));
    }
  }

  async _handleJsonUpload(event) {
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
            const langKey = this._normalizeLangKey(item.language);
            translationsObject[langKey] = {
              title: item.title || '',
              description: item.description || ''
            };
          }
        }

        await chrome.storage.local.set({ [this.storageKeyTranslations]: translationsObject });
        this.containerEl.querySelector('#yt-json-filename').textContent = `✅ Đã tải lên: ${file.name}`;
        BaseModule.showToast('Đã lưu dữ liệu dịch thuật thành công!', "success");
      } catch (err) {
        this.containerEl.querySelector('#yt-json-filename').textContent = `❌ Lỗi đọc file`;
        BaseModule.showToast('Lỗi: File JSON không hợp lệ hoặc không đúng định dạng mảng.', "error");
        console.error("JSON Process Error:", err);
      }
    };
    reader.readAsText(file);
  }

  _normalizeLangKey(langName) {
    if (typeof langName !== 'string') return '';
    return langName.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}
