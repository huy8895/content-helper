/**
 * Options Page Controller – Điều phối navigation, theme mode và khởi tạo các module.
 * Tuân thủ Calm Tech Design System & Clean Code.
 */
(function () {
  'use strict';

  // Registry các module (lazy-init)
  const modules = {
    speech: null,
    youtube: null,
    scenarios: null,
    flows: null,
    buttons: null,
  };

  let currentSection = null;
  let currentThemeMode = 'auto';

  /**
   * Khởi tạo điều khiển Theme Switcher (Light / Dark / Auto)
   */
  async function initThemeSwitcher() {
    const data = await new Promise(resolve => {
      chrome.storage.local.get(['app_theme_mode'], resolve);
    });

    currentThemeMode = data.app_theme_mode || 'auto';
    applyTheme(currentThemeMode);
    updateThemeButtons(currentThemeMode);

    const themeButtons = document.querySelectorAll('.theme-btn[data-theme-mode]');
    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.themeMode;
        currentThemeMode = mode;
        applyTheme(mode);
        updateThemeButtons(mode);
        chrome.storage.local.set({ app_theme_mode: mode });
      });
    });

    // Lắng nghe thay đổi chế độ hệ điều hành khi ở chế độ 'auto'
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentThemeMode === 'auto') {
          applyTheme('auto');
        }
      });
    }
  }

  /**
   * Áp dụng theme lên documentElement
   * @param {'light'|'dark'|'auto'} mode
   */
  function applyTheme(mode) {
    const isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  /**
   * Cập nhật trạng thái active của các nút theme
   * @param {string} mode
   */
  function updateThemeButtons(mode) {
    const themeButtons = document.querySelectorAll('.theme-btn[data-theme-mode]');
    themeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeMode === mode);
    });
  }

  /**
   * Khởi tạo sidebar navigation.
   */
  function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        switchSection(section);

        // Cập nhật active state
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }

  /**
   * Chuyển đổi giữa các section.
   * @param {string} section - Tên section (speech, youtube, scenarios, flows, buttons, about)
   */
  function switchSection(section) {
    if (section === currentSection) return;
    currentSection = section;

    const main = document.getElementById('main-content');

    switch (section) {
      case 'speech':
        if (!modules.speech) modules.speech = new SpeechProfileModule();
        modules.speech.render();
        break;

      case 'youtube':
        if (!modules.youtube) modules.youtube = new YoutubeProfileModule();
        modules.youtube.render();
        break;

      case 'scenarios':
        if (!modules.scenarios) modules.scenarios = new ScenarioModule();
        modules.scenarios.render();
        break;

      case 'flows':
        if (!modules.flows) modules.flows = new FlowModule();
        modules.flows.render();
        break;

      case 'buttons':
        if (!modules.buttons) modules.buttons = new ButtonConfigModule();
        modules.buttons.render();
        break;

      case 'about':
        renderAboutSection(main);
        break;

      default:
        main.innerHTML = '<p class="empty-state">Mục cấu hình không tồn tại.</p>';
    }
  }

  /**
   * Render section About chuẩn Calm Tech.
   * @param {HTMLElement} container
   */
  async function renderAboutSection(container) {
    const userData = await new Promise(resolve => {
      chrome.storage.local.get(
        ['google_user_email', 'google_user_name', 'google_user_avatar'],
        resolve
      );
    });

    const isLoggedIn = !!userData.google_user_email;
    const infoIcon = window.CHIcons ? CHIcons.info({ size: 18 }) : '';
    const cmdIcon = window.CHIcons ? CHIcons.command({ size: 15 }) : '';
    const globeIcon = window.CHIcons ? CHIcons.globe({ size: 15 }) : '';

    container.innerHTML = `
      <div class="module-section">
        <div class="page-header">
          <h2>${infoIcon} Giới thiệu</h2>
          <p>Thông số kỹ thuật và trạng thái kết nối của Content Helper.</p>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">${cmdIcon} Thông số kỹ thuật (System Specs)</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:16px;font-size:12.5px">
            <div>
              <div class="form-label">Phiên bản (Version)</div>
              <div style="font-family:var(--ch-font-mono, monospace);font-weight:700;font-variant-numeric:tabular-nums">v1.0.1 (Production)</div>
            </div>
            <div>
              <div class="form-label">Manifest Specification</div>
              <div style="font-family:var(--ch-font-mono, monospace);font-weight:700">Manifest V3</div>
            </div>
            <div>
              <div class="form-label">Kiến trúc UI / Core</div>
              <div style="font-weight:700">Calm Tech / Vanilla JS (OOP)</div>
            </div>
            <div>
              <div class="form-label">Cơ sở dữ liệu & Đồng bộ</div>
              <div style="font-weight:700">Google Cloud Firestore</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">${infoIcon} Tài khoản đồng bộ Cloud</span>
          </div>
          ${isLoggedIn ? `
            <div style="display:flex;align-items:center;gap:16px">
              <img src="${userData.google_user_avatar}" alt="Avatar"
                style="width:48px;height:48px;border-radius:50%;border:1px solid var(--color-border);object-fit:cover;">
              <div>
                <div style="font-weight:700;font-size:14px;color:var(--color-text)">${userData.google_user_name || 'User'}</div>
                <div style="font-family:var(--ch-font-mono, monospace);font-size:11.5px;color:var(--color-text-muted);margin-top:2px">${userData.google_user_email}</div>
              </div>
            </div>
          ` : `
            <div class="empty-state" style="padding:24px 16px">
              <div class="empty-icon">${window.CHIcons ? CHIcons.alertTriangle({ size: 28 }) : '!'}</div>
              <h4>Chưa kết nối tài khoản Google</h4>
              <p>Mở popup Extension để đăng nhập Google và kích hoạt đồng bộ đám mây.</p>
            </div>
          `}
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">${globeIcon} Nền tảng AI hỗ trợ</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;font-size:12.5px;line-height:1.6">
            <div>• <strong>ChatGPT</strong> <span style="color:var(--color-text-muted);font-size:11px">(chatgpt.com)</span></div>
            <div>• <strong>Google AI Studio</strong> <span style="color:var(--color-text-muted);font-size:11px">(aistudio.google.com)</span></div>
            <div>• <strong>YouTube Studio</strong> <span style="color:var(--color-text-muted);font-size:11px">(studio.youtube.com)</span></div>
            <div>• <strong>DeepSeek</strong> <span style="color:var(--color-text-muted);font-size:11px">(chat.deepseek.com)</span></div>
            <div>• <strong>Qwen</strong> <span style="color:var(--color-text-muted);font-size:11px">(chat.qwen.ai)</span></div>
            <div>• <strong>Grok</strong> <span style="color:var(--color-text-muted);font-size:11px">(grok.com)</span></div>
            <div>• <strong>Gemini</strong> <span style="color:var(--color-text-muted);font-size:11px">(gemini.google.com)</span></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Hiển thị thông tin user trên sidebar.
   */
  async function loadSidebarUser() {
    const data = await new Promise(resolve => {
      chrome.storage.local.get(
        ['google_user_email', 'google_user_name', 'google_user_avatar'],
        resolve
      );
    });

    if (data.google_user_email) {
      const avatarEl = document.getElementById('sidebar-avatar');
      const nameEl = document.getElementById('sidebar-name');
      const emailEl = document.getElementById('sidebar-email');
      const userEl = document.getElementById('sidebar-user');

      if (avatarEl) avatarEl.src = data.google_user_avatar || '';
      if (nameEl) nameEl.textContent = data.google_user_name || 'User';
      if (emailEl) emailEl.textContent = data.google_user_email;
      if (userEl) userEl.style.display = 'flex';
    }
  }

  /**
   * Khởi tạo trang Options.
   */
  function init() {
    console.log('⚙️ [Options] Initializing Calm Tech Console...');
    initThemeSwitcher();
    initNavigation();
    loadSidebarUser();

    // Mở section mặc định
    switchSection('speech');
  }

  // Chạy khi DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
