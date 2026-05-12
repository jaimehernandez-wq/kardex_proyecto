
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDlBZmdNSPn9HPid-STg188eyfi5OSR0Oo",
  authDomain: "inventariomedico.firebaseapp.com",
  projectId: "inventariomedico",
  storageBucket: "inventariomedico.firebasestorage.app",
  messagingSenderId: "1084863044698",
  appId: "1:1084863044698:web:96e4663ea4f4548463cc63",
  measurementId: "G-3JV92V062G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider =  new GoogleAuthProvider ();
export const db= getFirestore();



