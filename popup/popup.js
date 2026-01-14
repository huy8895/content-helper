const CLIENT_ID = '517231603315-unill9qgp7iq7f9evp7l9h2mk676kc4u.apps.googleusercontent.com';
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

const $loginSection = document.getElementById('login-section');
const $userSection = document.getElementById('user-section');
const $loading = document.getElementById('loading');
const $status = document.getElementById('status');
const $loginBtn = document.getElementById('google-login-btn');
const $logoutBtn = document.getElementById('google-logout-btn');

const $userName = document.getElementById('user-name');
const $userEmail = document.getElementById('user-email');
const $userAvatar = document.getElementById('user-avatar');

/* ------- khởi tạo UI ------- */
document.addEventListener('DOMContentLoaded', () => {
  setLoading(true);
  chrome.storage.local.get(['gg_access_token', 'google_user_name', 'google_user_email', 'google_user_avatar'], data => {
    if (data.gg_access_token) {
      updateUserUI(data);
      toggleUI(true);
    } else {
      toggleUI(false);
    }
    setLoading(false);
  });

  $loginBtn.addEventListener('click', startOAuth);
  $logoutBtn.addEventListener('click', doLogout);
});

function setLoading(isLoading) {
  if (isLoading) $loading.classList.remove('hidden');
  else $loading.classList.add('hidden');

  if (isLoading) {
    $loginSection.classList.add('hidden');
    $userSection.classList.add('hidden');
  }
}

function toggleUI(loggedIn) {
  if (loggedIn) {
    $loginSection.classList.add('hidden');
    $userSection.classList.remove('hidden');
    $userSection.classList.add('flex');
  } else {
    $loginSection.classList.remove('hidden');
    $userSection.classList.add('hidden');
    $userSection.classList.remove('flex');
  }
}

function updateUserUI(data) {
  $userName.textContent = data.google_user_name || 'User';
  $userEmail.textContent = data.google_user_email || '';
  $userAvatar.src = data.google_user_avatar || 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';
}

function setStatus(msg, isError = false) {
  $status.textContent = msg;
  $status.className = `mt-4 text-[10px] font-bold uppercase tracking-widest transition-opacity duration-300 ${isError ? 'text-rose-500' : 'text-indigo-600'}`;
  $status.style.opacity = '1';
  setTimeout(() => { $status.style.opacity = '0'; }, 3000);
}

/* -------------- Đăng nhập -------------- */
function startOAuth() {
  setLoading(true);
  setStatus('Đang kết nối với Google...');

  const redirect = chrome.identity.getRedirectURL();
  const url =
    'https://accounts.google.com/o/oauth2/v2/auth' +
    '?response_type=token' +
    `&client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&scope=${encodeURIComponent(SCOPES.join(' '))}`;

  chrome.identity.launchWebAuthFlow({ url, interactive: true }, returned => {
    if (chrome.runtime.lastError || !returned) {
      console.error('OAuth error:', chrome.runtime.lastError);
      setStatus('Lỗi đăng nhập. Vui lòng thử lại.', true);
      setLoading(false);
      toggleUI(false);
      return;
    }

    const params = new URLSearchParams(new URL(returned).hash.substring(1));
    const token = params.get('access_token');

    if (!token) {
      setStatus('Không lấy được token.', true);
      setLoading(false);
      toggleUI(false);
      return;
    }

    getGoogleUserInfo(token).then(userInfo => {
      const userData = {
        google_user_id: userInfo.sub,
        google_user_email: userInfo.email,
        google_user_name: userInfo.name,
        google_user_avatar: userInfo.picture,
        gg_access_token: token
      };

      chrome.storage.local.set(userData, () => {
        updateUserUI(userData);
        toggleUI(true);
        setLoading(false);
        setStatus('Đăng nhập thành công!');
        sendToActiveTab({ action: 'show_buttons' });
      });
    }).catch(err => {
      setStatus('Lỗi khi lấy thông tin người dùng.', true);
      setLoading(false);
      toggleUI(false);
    });
  });
}

/* -------------- Đăng xuất -------------- */
function doLogout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
    chrome.storage.local.clear(() => {
      toggleUI(false);
      setStatus('Đã đăng xuất.');
      sendToActiveTab({ action: 'hide_buttons' });
    });
  }
}

/* -------------- Helper gửi message -------------- */
function sendToActiveTab(msg) {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (tab.url && (tab.url.includes('chatgpt.com') || tab.url.includes('aistudio.google.com') || tab.url.includes('youtube.com'))) {
        chrome.tabs.sendMessage(tab.id, msg).catch(() => { });
      }
    });
  });
}

async function getGoogleUserInfo(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  return await res.json();
}
