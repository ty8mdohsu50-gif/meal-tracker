import { initializeApp, type FirebaseApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBBW9VPSas3XiLz8vCfPL4Iq8dTzvMVDtQ',
  authDomain: 'meal-tracker-19aaf.firebaseapp.com',
  projectId: 'meal-tracker-19aaf',
  storageBucket: 'meal-tracker-19aaf.firebasestorage.app',
  messagingSenderId: '546198282021',
  appId: '1:546198282021:web:6b5ded1cec31c7144684cc',
  measurementId: 'G-T7NTR3BNLL',
} as const;

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth: Auth = getAuth(firebaseApp);
export const firestore: Firestore = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
