import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsSupported } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAkOHCKEeG6L99VX3XOpjGPYoLm-A9T1zk",
  authDomain: "stompai-cc3f1.firebaseapp.com",
  projectId: "stompai-cc3f1",
  storageBucket: "stompai-cc3f1.firebasestorage.app",
  messagingSenderId: "1093040684214",
  appId: "1:1093040684214:web:d7ec20e10f47d59bcb7a17",
  measurementId: "G-EVCQ95P017",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

analyticsSupported().then((supported) => {
  if (supported) getAnalytics(app);
}).catch(() => {});

export { app, db };
