// Firebase Configuration for Jasmine Scholarship Hub
// Project: jasmine-scholarship-hub
// Created: August 29, 2026

const firebaseConfig = {
  apiKey: "AIzaSyBqjjRm_dyVtCIIOxab40Epc6lDISJ26gc",
  authDomain: "jasmine-scholarship-hub.firebaseapp.com",
  projectId: "jasmine-scholarship-hub",
  storageBucket: "jasmine-scholarship-hub.firebasestorage.app",
  messagingSenderId: "213973806574",
  appId: "1:213973806574:web:814015726ce88f5c1d72ff",
  measurementId: "G-78H9EPW3ZQ"
};

// Export for use in app
if (typeof window !== 'undefined') {
  window.FIREBASE_CONFIG = firebaseConfig;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
}
