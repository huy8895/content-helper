/**
 * SpeechProfileModule – Quản lý AI Studio Speech Profiles trên trang Options.
 * Kế thừa BaseModule, sử dụng chung storage key với GoogleAIStudioPanel/SpeechPanel.
 */
class SpeechProfileModule extends BaseModule {
  constructor() {
    super('main-content', 'google_ai_studio_profiles', 'speech_profiles');
    this.profiles = {};
    this.activeProfileName = 'default';
  }

  /**
   * Render toàn bộ giao diện module Speech Profiles.
   */
  async render() {
    // Tải dữ liệu từ storage
    const data = await this.loadFromStorage();
    this.profiles = data.profiles || { 'default': {} };
    this.activeProfileName = data.activeProfileName || 'default';

    const micIcon = window.CHIcons ? CHIcons.mic({ size: 18 }) : '';
    const settingsIcon = window.CHIcons ? CHIcons.settings({ size: 15 }) : '';
    const saveIcon = window.CHIcons ? CHIcons.save({ size: 14 }) : '';
    const shuffleIcon = window.CHIcons ? CHIcons.shuffle({ size: 13 }) : '⇄';

    const html = `
      <div class="module-section">
        <div class="page-header">
          <h2>${micIcon} Speech Profiles</h2>
          <p>Quản lý cấu hình giọng nói và speaker cho Google AI Studio.</p>
        </div>

        ${this.buildProfileBarHTML(this.profiles, this.activeProfileName, 'sp')}

        <!-- Form tạo profile mới (ẩn mặc định) -->
        <div class="card hidden" id="sp-new-profile-card">
          <div style="display:flex;gap:8px;align-items:center">
            <input type="text" class="form-input" id="sp-new-profile-name"
              placeholder="Tên profile mới..." style="flex:1">
            <button class="btn btn-primary btn-sm" id="sp-save-new-profile">Lưu</button>
            <button class="btn btn-ghost btn-sm" id="sp-cancel-new-profile">Hủy</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
            <span class="card-title">${settingsIcon} Cấu hình Profile: <strong id="sp-current-name">${this.activeProfileName}</strong></span>
            <button class="btn btn-ghost btn-sm" id="sp-swap-speakers" type="button" title="Hoán đổi nhanh vị trí Speaker 1 ⇄ Speaker 2">
              ${shuffleIcon} Đổi vị trí 1 ⇄ 2
            </button>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Speaker 1</label>
              <input type="text" class="form-input" id="sp-speaker1" placeholder="VD: 春樹">
            </div>
            <div class="form-group">
              <label class="form-label">Speaker 2</label>
              <input type="text" class="form-input" id="sp-speaker2" placeholder="VD: 結衣">
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Voice 1</label>
              <input type="text" class="form-input" id="sp-voice1" placeholder="Enceladus">
            </div>
            <div class="form-group">
              <label class="form-label">Voice 2</label>
              <input type="text" class="form-input" id="sp-voice2" placeholder="Callirrhoe">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Scene</label>
            <textarea class="form-textarea" id="sp-scene" rows="2" placeholder="vd: A bustling street at night, two friends talking casually..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Sample Context</label>
            <textarea class="form-textarea" id="sp-sample-context" rows="3" placeholder="vd: Previous speaker just finished a long story..."></textarea>
          </div>

          <label class="toggle-wrapper" style="margin-bottom:20px">
            <div>
              <div class="toggle-label">Tự động dán Clipboard (Auto Paste)</div>
              <div class="toggle-desc">Tự động click nút Text và dán nội dung clipboard vào prompt</div>
            </div>
            <input type="checkbox" class="toggle-switch" id="sp-auto-paste">
          </label>

          <button class="btn btn-primary" id="sp-save-btn" style="width:100%">
            ${saveIcon} Cập nhật Profile
          </button>
        </div>
      </div>
    `;

    this.containerEl.innerHTML = html;
    this._fillForm(this.activeProfileName);
    this._bindEvents();
  }

  /**
   * Hoán đổi nhanh vị trí Speaker 1 ⇄ Speaker 2 (và Voice 1 ⇄ Voice 2)
   */
  _swapSpeakers() {
    const s1 = this.containerEl.querySelector('#sp-speaker1');
    const s2 = this.containerEl.querySelector('#sp-speaker2');
    const v1 = this.containerEl.querySelector('#sp-voice1');
    const v2 = this.containerEl.querySelector('#sp-voice2');

    if (!s1 || !s2 || !v1 || !v2) return;

    const tmpS = s1.value;
    s1.value = s2.value;
    s2.value = tmpS;

    const tmpV = v1.value;
    v1.value = v2.value;
    v2.value = tmpV;

    BaseModule.showToast('Đã hoán đổi vị trí Speaker 1 ⇄ Speaker 2!', 'info');
  }

  /**
   * Điền dữ liệu profile vào form.
   * @param {string} profileName
   */
  _fillForm(profileName) {
    const p = this.profiles[profileName] || {};
    this.containerEl.querySelector('#sp-speaker1').value = p.InputValue1 || '';
    this.containerEl.querySelector('#sp-speaker2').value = p.InputValue2 || '';
    this.containerEl.querySelector('#sp-voice1').value = p.Voice1 || '';
    this.containerEl.querySelector('#sp-voice2').value = p.Voice2 || '';

    const sceneVal = p.scene !== undefined ? p.scene : (p.sceneInstructions || '');
    const sampleContextVal = p.sampleContext !== undefined ? p.sampleContext : (p.styleInstructions || '');

    const sceneEl = this.containerEl.querySelector('#sp-scene');
    if (sceneEl) sceneEl.value = sceneVal;

    const sampleContextEl = this.containerEl.querySelector('#sp-sample-context');
    if (sampleContextEl) sampleContextEl.value = sampleContextVal;

    const autoPasteEl = this.containerEl.querySelector('#sp-auto-paste');
    if (autoPasteEl) autoPasteEl.checked = p.autoPasteClipboard || false;
    this.containerEl.querySelector('#sp-current-name').textContent = profileName;
  }

  /**
   * Thu thập dữ liệu từ form.
   * @returns {Object}
   */
  _collectForm() {
    const sceneVal = this.containerEl.querySelector('#sp-scene')?.value || '';
    const sampleContextVal = this.containerEl.querySelector('#sp-sample-context')?.value || '';
    return {
      InputValue1: this.containerEl.querySelector('#sp-speaker1')?.value || '',
      InputValue2: this.containerEl.querySelector('#sp-speaker2')?.value || '',
      Voice1: this.containerEl.querySelector('#sp-voice1')?.value || '',
      Voice2: this.containerEl.querySelector('#sp-voice2')?.value || '',
      scene: sceneVal,
      sampleContext: sampleContextVal,
      sceneInstructions: sceneVal,
      styleInstructions: sampleContextVal,
      autoDetectSpeakerOrder: true,
      autoSetValue: true,
      autoPasteClipboard: this.containerEl.querySelector('#sp-auto-paste')?.checked || false,
    };
  }

  /**
   * Lưu toàn bộ dữ liệu và đồng bộ.
   */
  async _saveAll() {
    const dataToSave = {
      profiles: this.profiles,
      activeProfileName: this.activeProfileName,
    };
    await this.saveToStorage(dataToSave);
    await this.syncToFirestore(dataToSave);
  }

  /**
   * Cập nhật lại dropdown profile.
   */
  _refreshSelect() {
    const select = this.containerEl.querySelector('#sp-profile-select');
    select.innerHTML = Object.keys(this.profiles)
      .map(n => `<option value="${n}" ${n === this.activeProfileName ? 'selected' : ''}>${n}</option>`)
      .join('');
  }

  /**
   * Gắn tất cả event listeners.
   */
  _bindEvents() {
    // Đổi nhanh Speaker 1 ⇄ 2
    this.containerEl.querySelector('#sp-swap-speakers').onclick = () => {
      this._swapSpeakers();
    };

    // Chuyển profile
    this.containerEl.querySelector('#sp-profile-select').onchange = (e) => {
      this.activeProfileName = e.target.value;
      this._fillForm(this.activeProfileName);
      this._saveAll();
    };

    // Lưu profile hiện tại
    this.containerEl.querySelector('#sp-save-btn').onclick = () => {
      this.profiles[this.activeProfileName] = this._collectForm();
      this._saveAll();
      BaseModule.showToast(`Profile "${this.activeProfileName}" đã cập nhật!`, 'success');
    };

    // Hiện form tạo mới
    this.containerEl.querySelector('#sp-new-profile').onclick = () => {
      this.containerEl.querySelector('#sp-new-profile-card').classList.remove('hidden');
      this.containerEl.querySelector('#sp-new-profile-name').value = '';
      this.containerEl.querySelector('#sp-new-profile-name').focus();
    };

    // Hủy tạo mới
    this.containerEl.querySelector('#sp-cancel-new-profile').onclick = () => {
      this.containerEl.querySelector('#sp-new-profile-card').classList.add('hidden');
    };

    // Lưu profile mới
    this.containerEl.querySelector('#sp-save-new-profile').onclick = () => {
      const name = this.containerEl.querySelector('#sp-new-profile-name').value.trim();
      if (!name) {
        BaseModule.showToast('Vui lòng nhập tên profile.', 'warning');
        return;
      }
      if (this.profiles[name]) {
        BaseModule.showToast('Tên profile đã tồn tại.', 'warning');
        return;
      }
      this.profiles[name] = this._collectForm();
      this.activeProfileName = name;
      this._saveAll();
      this._refreshSelect();
      this._fillForm(name);
      this.containerEl.querySelector('#sp-new-profile-card').classList.add('hidden');
      BaseModule.showToast(`Đã tạo profile "${name}"`, 'success');
    };

    // Xóa profile
    this.containerEl.querySelector('#sp-delete-profile').onclick = () => {
      if (Object.keys(this.profiles).length <= 1) {
        BaseModule.showToast('Không thể xóa profile cuối cùng.', 'warning');
        return;
      }
      if (confirm(`Xóa profile "${this.activeProfileName}"?`)) {
        const deleted = this.activeProfileName;
        delete this.profiles[this.activeProfileName];
        this.activeProfileName = Object.keys(this.profiles)[0];
        this._saveAll();
        this._refreshSelect();
        this._fillForm(this.activeProfileName);
        BaseModule.showToast(`Đã xóa profile "${deleted}"`, 'success');
      }
    };
  }
}
