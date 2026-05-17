import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  OAuthProvider, 
  signInWithPopup 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCYX0au5RoVe07nHQTR1903ynALJqVjICw",
  authDomain: "rustapi-34bbb.firebaseapp.com",
  projectId: "rustapi-34bbb",
  storageBucket: "rustapi-34bbb.firebasestorage.app",
  messagingSenderId: "179599618232",
  appId: "1:179599618232:web:9f3b95dd460e74a8c6044d",
  measurementId: "G-NDNCW2SZ31"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");

export { signInWithPopup };
