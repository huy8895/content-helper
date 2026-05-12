/**
 * BaseModule – Base class chung cho các module trên trang Options.
 * Cung cấp logic dùng chung: toast, Firestore sync, profile CRUD utilities.
 *
 * Tuân thủ OOP, SOLID – mỗi module con kế thừa và override render().
 */

// Cấu hình Firebase được khai báo trong firestore-helper.js (load trước)
// Biến firebaseConfig đã có sẵn từ global scope.

class BaseModule {
  /**
   * @param {string} containerId - ID của element chính trên trang
   * @param {string} storageKey - Key trong chrome.storage.local
   * @param {string} firestoreCollection - Tên collection trên Firestore
   */
  constructor(containerId, storageKey, firestoreCollection) {
    this.containerId = containerId;
    this.storageKey = storageKey;
    this.firestoreCollection = firestoreCollection;
    this.containerEl = document.getElementById(containerId);
  }

  /**
   * Render nội dung module – override ở class con.
   */
  render() {
    throw new Error('Module phải override phương thức render()');
  }

  /**
   * Đọc dữ liệu từ chrome.storage.local.
   * @returns {Promise<Object>}
   */
  async loadFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.storageKey], (result) => {
        resolve(result[this.storageKey] || {});
      });
    });
  }

  /**
   * Ghi dữ liệu vào chrome.storage.local.
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async saveToStorage(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: data }, resolve);
    });
  }

  /**
   * Đồng bộ dữ liệu lên Firestore (nếu đã đăng nhập).
   * @param {Object} data
   */
  async syncToFirestore(data) {
    try {
      const { google_user_email: userId } = await this._getStorageItem('google_user_email');
      if (!userId) {
        console.warn('⚠️ Chưa đăng nhập, không thể sync Firestore.');
        return;
      }
      const helper = new FirestoreHelper(firebaseConfig);
      helper.collection = this.firestoreCollection;
      await helper.saveUserConfig(userId, data);
      console.log(`☁️ [${this.constructor.name}] Đã sync Firestore.`);
    } catch (err) {
      console.error(`❌ [${this.constructor.name}] Lỗi sync Firestore:`, err);
      BaseModule.showToast('Lỗi đồng bộ Firestore.', 'error');
    }
  }

  /**
   * Tiện ích đọc một key từ chrome.storage.local.
   * @param {string} key
   * @returns {Promise<Object>}
   */
  _getStorageItem(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], resolve);
    });
  }

  /**
   * Lấy thông tin user hiện tại.
   * @returns {Promise<{email:string, name:string, avatar:string}|null>}
   */
  async getCurrentUser() {
    const data = await new Promise((resolve) => {
      chrome.storage.local.get(['google_user_email', 'google_user_name', 'google_user_avatar'], resolve);
    });
    if (!data.google_user_email) return null;
    return {
      email: data.google_user_email,
      name: data.google_user_name || 'User',
      avatar: data.google_user_avatar || ''
    };
  }

  /**
   * Hiển thị toast notification.
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration
   */
  static showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);

    const hideTimeout = setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    toast.onclick = () => {
      clearTimeout(hideTimeout);
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    };
  }

  /**
   * Tạo HTML cho thanh chọn profile + nút Tạo mới / Xóa.
   * @param {Object} profiles - Danh sách profile
   * @param {string} activeProfileName - Tên profile đang active
   * @param {string} idPrefix - Prefix cho ID elements
   * @returns {string} HTML string
   */
  buildProfileBarHTML(profiles, activeProfileName, idPrefix) {
    const options = Object.keys(profiles)
      .map(name => `<option value="${name}" ${name === activeProfileName ? 'selected' : ''}>${name}</option>`)
      .join('');

    return `
      <div class="profile-bar">
        <select class="profile-select" id="${idPrefix}-profile-select">${options}</select>
        <button class="btn btn-secondary btn-sm" id="${idPrefix}-new-profile">➕ Mới</button>
        <button class="btn btn-danger btn-sm" id="${idPrefix}-delete-profile">🗑️ Xóa</button>
      </div>
    `;
  }

  /**
   * Cleanup khi chuyển section.
   */
  destroy() {
    if (this.containerEl) {
      this.containerEl.innerHTML = '';
    }
  }
}
