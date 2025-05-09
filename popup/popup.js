const CLIENT_ID = '517231603315-unill9qgp7iq7f9evp7l9h2mk676kc4u.apps.googleusercontent.com';
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

const $login  = document.getElementById('google-login-btn');
const $logout = document.getElementById('google-logout-btn');

/* ------- khởi tạo UI tuỳ theo đã có token hay chưa ------- */
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('gg_access_token', data => {
    toggleUI(!!data.gg_access_token);
  });

  $login .addEventListener('click', startOAuth);
  $logout.addEventListener('click', doLogout);
});

function toggleUI(loggedIn) {
  $login .style.display = loggedIn ? 'none' : 'inline-block';
  $logout.style.display = loggedIn ? 'inline-block' : 'none';
}

/* -------------- Đăng nhập -------------- */
function startOAuth() {
  const redirect = chrome.identity.getRedirectURL();   // gốc /
  const url =
    'https://accounts.google.com/o/oauth2/v2/auth' +
    '?response_type=token' +
    `&client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&scope=${encodeURIComponent(SCOPES.join(' '))}`;

  chrome.identity.launchWebAuthFlow({ url, interactive:true }, returned => {
    if (chrome.runtime.lastError || !returned) {
      console.error('OAuth error:', chrome.runtime.lastError);
      return;
    }
    const params = new URLSearchParams(new URL(returned).hash.substring(1));
    const token  = params.get('access_token');
    if (!token) return console.error('No access_token');

    getGoogleUserInfo(token).then(userInfo => {
      chrome.storage.local.set({
        google_user_id: userInfo.sub,
        google_user_email: userInfo.email
      }, () => {
        console.log('✅ Saved Google user ID + email');
      });
    });

    chrome.storage.local.set({ gg_access_token: token }, () => {
      console.log('✅ Token saved');
      toggleUI(true);
      sendToActiveTab({ action: 'show_buttons' });
    });
  });
}

/* -------------- Đăng xuất -------------- */
function doLogout() {
  chrome.storage.local.remove('gg_access_token', () => {
    console.log('🔓 Token cleared');
    toggleUI(false);
    sendToActiveTab({ action: 'hide_buttons' });
  });
}

/* -------------- Helper gửi message tới tab ChatGPT -------------- */
function sendToActiveTab(msg) {
  chrome.tabs.query({ active:true, currentWindow:true }, tabs => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, msg);
  });
}

async function getGoogleUserInfo(accessToken) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) throw new Error('Failed to fetch user info');
    const userInfo = await res.json();
    console.log('✅ Google User Info:', userInfo);
    return userInfo;
  } catch (err) {
    console.error('❌ Failed to get Google user info:', err);
    throw err;
  }
}
