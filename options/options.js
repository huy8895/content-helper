/**
 * Options Page Controller – Điều phối navigation và khởi tạo các module.
 */
(function () {
  'use strict';

  // Registry các module (lazy-init)
  const modules = {
    speech: null,
    youtube: null,
    scenarios: null,
  };

  let currentSection = null;

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
   * @param {string} section - Tên section (speech, youtube, scenarios, about)
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

      case 'about':
        renderAboutSection(main);
        break;

      default:
        main.innerHTML = '<p>Section không hợp lệ.</p>';
    }
  }

  /**
   * Render section About.
   * @param {HTMLElement} container
   */
  async function renderAboutSection(container) {
    // Lấy thông tin user
    const userData = await new Promise(resolve => {
      chrome.storage.local.get(
        ['google_user_email', 'google_user_name', 'google_user_avatar'],
        resolve
      );
    });

    const isLoggedIn = !!userData.google_user_email;

    container.innerHTML = `
      <div class="module-section">
        <div class="page-header">
          <h2>ℹ️ Giới thiệu</h2>
          <p>Thông tin về Content Helper Extension.</p>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">📤 Content Helper</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
            <div>
              <div style="color:var(--color-text-muted);font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:4px">Version</div>
              <div style="font-weight:700">1.0.1</div>
            </div>
            <div>
              <div style="color:var(--color-text-muted);font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:4px">Manifest</div>
              <div style="font-weight:700">V3</div>
            </div>
            <div>
              <div style="color:var(--color-text-muted);font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:4px">Framework</div>
              <div style="font-weight:700">Vanilla JS (OOP)</div>
            </div>
            <div>
              <div style="color:var(--color-text-muted);font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:4px">Backend</div>
              <div style="font-weight:700">Firebase Firestore</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">👤 Tài khoản</span>
          </div>
          ${isLoggedIn ? `
            <div style="display:flex;align-items:center;gap:16px">
              <img src="${userData.google_user_avatar}" alt="Avatar"
                style="width:48px;height:48px;border-radius:50%;border:2px solid var(--color-border)">
              <div>
                <div style="font-weight:800;font-size:15px">${userData.google_user_name || 'User'}</div>
                <div style="font-size:12px;color:var(--color-text-muted)">${userData.google_user_email}</div>
              </div>
            </div>
          ` : `
            <div class="empty-state" style="padding:24px">
              <div class="empty-icon">🔒</div>
              <h4>Chưa đăng nhập</h4>
              <p>Mở popup extension để đăng nhập Google và đồng bộ dữ liệu.</p>
            </div>
          `}
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">🌐 Trang web hỗ trợ</span>
          </div>
          <div style="font-size:13px;line-height:2">
            <div>• <strong>ChatGPT</strong> – chatgpt.com</div>
            <div>• <strong>Google AI Studio</strong> – aistudio.google.com</div>
            <div>• <strong>YouTube Studio</strong> – studio.youtube.com</div>
            <div>• <strong>DeepSeek</strong> – chat.deepseek.com</div>
            <div>• <strong>Qwen</strong> – chat.qwen.ai</div>
            <div>• <strong>Grok</strong> – grok.com</div>
            <div>• <strong>Gemini</strong> – gemini.google.com</div>
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
      document.getElementById('sidebar-avatar').src = data.google_user_avatar || '';
      document.getElementById('sidebar-name').textContent = data.google_user_name || 'User';
      document.getElementById('sidebar-email').textContent = data.google_user_email;
      document.getElementById('sidebar-user').style.display = 'flex';
    }
  }

  /**
   * Khởi tạo trang Options.
   */
  function init() {
    console.log('🚀 [Options] Initializing...');
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
