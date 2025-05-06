// popup.js
function handleAuthClick(event) {
  console.log('handleAuthClick.');
  gapi.auth2.getAuthInstance().signIn().then(function() {
    // Khi người dùng đăng nhập thành công, bạn có thể cấp quyền Drive
    console.log('Đăng nhập thành công!');
    const user = gapi.auth2.getAuthInstance().currentUser.get();
    const accessToken = user.getAuthResponse().access_token;
    // Lưu trữ token vào storage để sử dụng trong phần content
    chrome.storage.local.set({ 'access_token': accessToken }, function() {
      console.log('Access Token saved.');
      // Sau khi đăng nhập thành công, bạn có thể thông báo cho phần content để hiển thị button
      chrome.runtime.sendMessage({ action: 'show_buttons' });
    });
  });
}

function start() {
  console.log('Popup script start.');
  gapi.load('auth2', function() {
    gapi.auth2.init({
      client_id: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly'
    }).then(function() {
      document.getElementById('google-signin-btn').addEventListener('click', handleAuthClick);
    });
  });
}

start();
