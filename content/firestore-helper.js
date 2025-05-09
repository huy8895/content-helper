// firestore-helper.js

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAZNjjad2WRqm5yzgcQBn9KzCUKp1LchZ8",
  authDomain: "chatgpt-content-helper-ex.firebaseapp.com",
  projectId: "chatgpt-content-helper-ex",
  storageBucket: "chatgpt-content-helper-ex.firebasestorage.app",
  messagingSenderId: "764377928550",
  appId: "1:764377928550:web:138ec85e42e27a32456ea7",
  measurementId: "G-ELT4FJRLPE"
};

window.FirestoreHelper = class {
  constructor(firebaseConfig) {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    this.db = firebase.firestore();
    this.collection = 'configs';
  }

  async saveUserConfig(userId, data) {
    try {
      await this.db.collection(this.collection).doc(userId).set(data);
      console.log('✅ Saved user config to Firestore');
    } catch (err) {
      console.error('❌ Firestore save error:', err);
      throw err;
    }
  }

  async loadUserConfig(userId) {
    try {
      const doc = await this.db.collection(this.collection).doc(userId).get();
      if (doc.exists) {
        console.log('✅ Loaded user config:', doc.data());
        return doc.data();
      } else {
        console.warn('⚠️ No config found for user');
        return null;
      }
    } catch (err) {
      console.error('❌ Firestore load error:', err);
      throw err;
    }
  }
};

