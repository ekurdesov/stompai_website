import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAnalytics,
  isSupported as analyticsSupported,
  logEvent,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
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
let analytics = null;
const queuedEvents = [];

function normalizeValue(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") return value.slice(0, 100);
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value).slice(0, 100);
}

function logAnalyticsEvent(name, params = {}) {
  const normalizedParams = Object.fromEntries(
    Object.entries(params)
      .map(([key, value]) => [key, normalizeValue(value)])
      .filter(([, value]) => value !== undefined),
  );

  if (analytics) {
    logEvent(analytics, name, normalizedParams);
    return;
  }

  queuedEvents.push({ name, params: normalizedParams });
}

analyticsSupported().then((supported) => {
  if (!supported) return;

  analytics = getAnalytics(app);
  while (queuedEvents.length) {
    const event = queuedEvents.shift();
    logEvent(analytics, event.name, event.params);
  }
}).catch(() => {});

window.stompaiAnalytics = {
  logEvent: logAnalyticsEvent,
};

export { app, db, logAnalyticsEvent };
