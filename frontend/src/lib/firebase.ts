import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZKrVUiMjd4RdnIuarhyZQqHXGGtaVYGo",
  authDomain: "hire-mate.firebaseapp.com",
  projectId: "hire-mate",
  storageBucket: "hire-mate.firebasestorage.app",
  messagingSenderId: "458967927494",
  appId: "1:458967927494:web:fbc3c215a4149fee51e5c7",
  measurementId: "G-7EER97MK0X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Add scopes for Google authentication
googleProvider.addScope('email');
googleProvider.addScope('profile');

export default app; 