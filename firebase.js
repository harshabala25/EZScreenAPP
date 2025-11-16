// Firebase CDN imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your config
const firebaseConfig = {
  apiKey: "AIzaSyB4flUwD0M_tcoJyktuEMh2lKACmJu7eFQ",
  authDomain: "ezscreen-6c5f3.firebaseapp.com",
  projectId: "ezscreen-6c5f3",
  storageBucket: "ezscreen-6c5f3.firebasestorage.app",
  messagingSenderId: "420150818180",
  appId: "1:420150818180:web:736de23f08e1dafc5f99d1",
  measurementId: "G-TKJ6LXXHDW"
};

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export
export { auth, db };
