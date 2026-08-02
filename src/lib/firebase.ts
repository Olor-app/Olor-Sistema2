import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyD-RVCU6XYSGRMT8r7PLidlZT-grDRVjQ0",
  authDomain: "sig-olorluz.firebaseapp.com",
  projectId: "sig-olorluz",
  storageBucket: "sig-olorluz.firebasestorage.app",
  messagingSenderId: "823252112299",
  appId: "1:823252112299:web:47a63fce711e936db6b8ee"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
