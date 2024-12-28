import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCSyGcf6fvp-boGhOZbB0Iu0fbJtL5lPVo",
  authDomain: "mix-project-f3e1b.firebaseapp.com",
  databaseURL: "https://mix-project-f3e1b.firebaseio.com",
  projectId: "mix-project-f3e1b",
  storageBucket: "mix-project-f3e1b.appspot.com",
  messagingSenderId: "514293546521",
  appId: "1:514293546521:web:25c6fda152cf40fc4db488",
  measurementId: "G-RB78317G38"
};

const app = initializeApp(firebaseConfig);
console.log('Firebase initialized:', app.name);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

