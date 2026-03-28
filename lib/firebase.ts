// lib/firebase.ts
// ============================================
// Firebase Realtime Database — the backbone of real-time sync
// ============================================
// Config is loaded from environment variables — see .env.example

import { initializeApp } from "firebase/app";
import {
  getDatabase,
  off,
  onChildAdded,
  onChildChanged,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";

if (!process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) {
  console.warn("⚠️  Firebase neconfigurat — adaugă fișierul .env cu valorile EXPO_PUBLIC_FIREBASE_*");
}

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? "placeholder-key",
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "placeholder.firebaseapp.com",
  databaseURL:       process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL       ?? "https://placeholder-default-rtdb.firebaseio.com",
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? "placeholder",
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "placeholder.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "000000000000",
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             ?? "1:000000000000:web:000000000000",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
// Bucket-ul trebuie să existe în Firebase Console → Storage → Get Started
const bucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "placeholder.appspot.com";
export const storage = getStorage(app, `gs://${bucket}`);

export const auth = getAuth(app);

// Re-export everything components need
export { off, onChildAdded, onChildChanged, onValue, push, ref, remove, runTransaction, serverTimestamp, set, update };
export { storageRef, uploadBytes, getDownloadURL };
export { signInAnonymously, onAuthStateChanged };
