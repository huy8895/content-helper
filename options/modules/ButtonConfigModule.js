/**
 * ButtonConfigModule – Quản lý cấu hình hiển thị các Button trên từng nền tảng.
 * Kế thừa BaseModule.
 */
class ButtonConfigModule extends BaseModule {
  constructor() {
    super('main-content', 'button_configs', 'button_configs');
    this.configs = {};

    this.platforms = [
      { id: 'chatgpt', name: 'ChatGPT' },
      { id: 'deepseek', name: 'DeepSeek' },
      { id: 'qwen', name: 'Qwen' },
      { id: 'grok', name: 'Grok' },
      { id: 'aistudio', name: 'Google AI Studio' },
      { id: 'ytstudio', name: 'YouTube Studio' },
    ];

    this.availableButtons = [
      { id: 'MANAGE_SCENARIO', label: '🛠 Quản lý kịch bản' },
      { id: 'RUN_SCENARIO', label: '📤 Chạy kịch bản' },
      { id: 'RUN_FLOW', label: '🔗 Chạy Flow' },
      { id: 'COPY_CONTENT', label: '📋 Copy Content' },
      { id: 'SPLITTER', label: '✂️ Text Split' },
      { id: 'AUDIO', label: '🎵 Audio' },
      { id: 'AI_STUDIO_SETTINGS', label: '⚙️ AI Studio Settings' },
      { id: 'SRT_AUTOMATION', label: '🤖 SRT Automation' },
      { id: 'COLLAPSE_CODE', label: 'Collapse Code' },
      { id: 'YT_STUDIO_SETTINGS', label: '🎬 YT Studio' },
    ];
  }

  async render() {
    this.configs = await this.loadFromStorage() || {};

    let html = `
      <div class="module-section">
        <div class="page-header">
          <h2>🎛️ Cấu hình Nút (Buttons)</h2>
          <p>Tùy chỉnh danh sách các nút công cụ hiển thị trên từng trang web riêng biệt.</p>
        </div>

        <div class="card" style="padding: 0;">
          <div style="padding: 16px 20px; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; font-size: 15px;">Danh sách nền tảng</span>
            <button class="btn btn-primary btn-sm" id="btn-save-configs">💾 Lưu cấu hình</button>
          </div>
          <div class="platforms-list" style="padding: 20px; display: flex; flex-direction: column; gap: 24px;">
    `;

    this.platforms.forEach(platform => {
      let platformConfig = this.configs[platform.id];
      // Tương thích ngược với mảng string (phiên bản cũ)
      let activeButtons = [];
      let isCompactMode = false;
      let isEnabled = false;

      if (Array.isArray(platformConfig)) {
        activeButtons = platformConfig;
        isEnabled = true; // Legacy mặc định bật nếu có array
      } else if (platformConfig) {
        activeButtons = platformConfig.buttons || [];
        isCompactMode = !!platformConfig.compactMode;
        isEnabled = platformConfig.enabled !== false; // Mặc định bật nếu không set false rõ ràng
      }

      const disabledStyle = !isEnabled ? 'opacity: 0.4; pointer-events: none;' : '';

      html += `
        <div class="platform-item" style="border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; background: white;">
          <div style="background: var(--color-bg-alt, #f8fafc); padding: 14px 16px; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <input type="checkbox" class="toggle-switch cb-enable-platform" data-platform="${platform.id}" ${isEnabled ? 'checked' : ''} title="Bật/Tắt Extension trên trang này">
              <span style="font-weight: 700; font-size: 15px;">${platform.name}</span>
            </div>
            <label class="platform-compact-label" data-platform="${platform.id}" style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--color-text-secondary); transition: opacity 0.2s; ${disabledStyle}">
              <span>⚙️ Nút gộp (Content Helper)</span>
              <input type="checkbox" class="toggle-switch cb-compact-mode" data-platform="${platform.id}" ${isCompactMode ? 'checked' : ''}>
            </label>
          </div>
          <div class="platform-body" data-platform="${platform.id}" style="padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; transition: opacity 0.2s; ${disabledStyle}">
      `;

      this.availableButtons.forEach(btn => {
        const isChecked = activeButtons.includes(btn.id);

        html += `
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; color: var(--color-text);">
            <input type="checkbox" class="toggle-switch cb-btn-config" data-platform="${platform.id}" value="${btn.id}" ${isChecked ? 'checked' : ''}>
            <span style="font-weight: 500;">${btn.label}</span>
          </label>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;

    this.containerEl.innerHTML = html;
    this._bindEvents();
  }

  /**
   * Bật/Tắt vùng nội dung bên trong một platform dựa vào trạng thái enable.
   * @param {string} platformId - ID nền tảng
   * @param {boolean} enabled - Trạng thái bật/tắt
   */
  _togglePlatformBody(platformId, enabled) {
    const body = this.containerEl.querySelector(`.platform-body[data-platform="${platformId}"]`);
    const compactLabel = this.containerEl.querySelector(`.platform-compact-label[data-platform="${platformId}"]`);

    [body, compactLabel].forEach(el => {
      if (!el) return;
      el.style.opacity = enabled ? '1' : '0.4';
      el.style.pointerEvents = enabled ? 'auto' : 'none';
    });
  }

  _bindEvents() {
    // --- Event: Công tắc Enable bật/tắt nội dung bên trong ---
    this.containerEl.querySelectorAll('.cb-enable-platform').forEach(toggle => {
      toggle.addEventListener('change', () => {
        this._togglePlatformBody(toggle.dataset.platform, toggle.checked);
      });
    });

    // --- Event: Nút Lưu ---
    const saveBtn = this.containerEl.querySelector('#btn-save-configs');
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Đang lưu...';

      const newConfigs = {};
      this.platforms.forEach(p => {
        newConfigs[p.id] = { enabled: false, buttons: [], compactMode: false };
      });

      // Lưu trạng thái enable
      const enableCheckboxes = this.containerEl.querySelectorAll('.cb-enable-platform:checked');
      enableCheckboxes.forEach(cb => {
        const platformId = cb.dataset.platform;
        if (newConfigs[platformId]) {
          newConfigs[platformId].enabled = true;
        }
      });

      // Lưu trạng thái của compact mode
      const compactCheckboxes = this.containerEl.querySelectorAll('.cb-compact-mode:checked');
      compactCheckboxes.forEach(cb => {
        const platformId = cb.dataset.platform;
        if (newConfigs[platformId]) {
          newConfigs[platformId].compactMode = true;
        }
      });

      // Lưu trạng thái của các buttons
      const btnCheckboxes = this.containerEl.querySelectorAll('.cb-btn-config:checked');
      btnCheckboxes.forEach(cb => {
        const platformId = cb.dataset.platform;
        const btnId = cb.value;
        if (newConfigs[platformId]) {
          newConfigs[platformId].buttons.push(btnId);
        }
      });

      this.configs = newConfigs;

      try {
        await this.saveToStorage(this.configs);
        await this.syncToFirestore(this.configs);
        BaseModule.showToast('Đã lưu cấu hình nút thành công!', 'success');
      } catch (err) {
        console.error(err);
        BaseModule.showToast('Lỗi khi lưu cấu hình', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Lưu cấu hình';
      }
    };
  }
}
