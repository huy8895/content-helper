const CLIENT_ID = '517231603315-unill9qgp7iq7f9evp7l9h2mk676kc4u.apps.googleusercontent.com';
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly'
];

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('google-signin-btn');
  if (!btn) return console.error('Button not found');
  btn.addEventListener('click', startOAuth);
});

function startOAuth() {
  /* ⬇️  DO NOT pass a path – Chrome‑App credential only allows root URI */
  const redirect = chrome.identity.getRedirectURL();      // e.g. https://<ID>.chromiumapp.org/

  const url =
    'https://accounts.google.com/o/oauth2/v2/auth' +
    '?response_type=token' +
    `&client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&scope=${encodeURIComponent(SCOPES.join(' '))}`;

  // chèn tạm vào popup.js trước khi gọi launchWebAuthFlow
  console.log('[DEBUG] redirect  =', redirect);
  console.log('[DEBUG] full url  =', url);
  chrome.identity.launchWebAuthFlow({ url, interactive: true }, returned => {
    if (chrome.runtime.lastError || !returned) {
      console.error('OAuth error:', chrome.runtime.lastError);
      return;
    }
    /* extract access_token from #fragment */
    const params = new URLSearchParams(new URL(returned).hash.substring(1));
    const token  = params.get('access_token');
    if (!token) return console.error('No access_token in redirect');

    chrome.storage.local.set({gg_access_token: token}, () => {
      console.log('✅ Access token saved');

      // tìm tab đang ở ChatGPT (hoặc tab đang active)
      chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'show_buttons'});
        } else {
          console.warn('No active tab to send message');
        }
      });
    });
  });
}
