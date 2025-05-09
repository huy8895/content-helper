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
    console.log("📦 Initializing FirestoreHelper...");
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    this.db = firebase.firestore();
    this.collection = '_chatgptContentHelper';
    this.document = 'chatgpt-scenarios';
    console.log("✅ FirestoreHelper initialized");
  }

  async saveScenarios(data) {
    console.log("📝 Saving scenarios to Firestore:", data);
    if (!data) {
      console.error('❌ No data to save');
      return;
    }
    try {
      await this.db.collection(this.collection).doc(this.document).set(data);
      console.log('✅ Saved scenarios to Firestore');
    } catch (err) {
      console.error('❌ Firestore save error:', err);
      throw err;
    }
  }

  async loadScenarios() {
    console.log("📥 Loading scenarios from Firestore...");
    try {
      const doc = await this.db.collection(this.collection).doc(this.document).get();
      if (doc.exists) {
        console.log('✅ Loaded scenarios from Firestore:', doc.data());
        return doc.data();
      } else {
        console.warn('⚠️ No scenarios found in Firestore');
        return null;
      }
    } catch (err) {
      console.error('❌ Firestore load error:', err);
      throw err;
    }
  }
};
