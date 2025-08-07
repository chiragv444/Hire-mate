import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { UserService, OnboardingService, type UserDocument } from '@/lib/firestore';
import { toast } from '@/hooks/use-toast';

// Update User type to match Firebase User
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  userDocument: UserDocument | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updateUserDocument: (data: Partial<UserDocument>) => Promise<void>;
  refreshUserDocument: () => Promise<void>;
  shouldRedirectToOnboarding: () => boolean;
  idToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDocument, setUserDocument] = useState<UserDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);

  // Function to convert Firebase User to our User type
  const convertFirebaseUser = (firebaseUser: FirebaseUser): User => ({
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
    createdAt: firebaseUser.metadata.creationTime
  });

  // Function to load user document from Firestore
  const loadUserDocument = async (uid: string) => {
    try {
      const doc = await UserService.getUser(uid);
      setUserDocument(doc);
    } catch (error) {
      console.error('Error loading user document:', error);
      setUserDocument(null);
    }
  };

  // Function to create user document in Firestore
  const createUserDocument = async (firebaseUser: FirebaseUser) => {
    try {
      const userData = convertFirebaseUser(firebaseUser);
      await UserService.createOrUpdateUser(userData);
      await loadUserDocument(firebaseUser.uid);
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = convertFirebaseUser(firebaseUser);
        setUser(userData);

        //Fetch ID Token
        const token = await firebaseUser.getIdToken();
        setIdToken(token);
        
        // Load or create user document
        const existingUser = await UserService.getUser(firebaseUser.uid);
        if (existingUser) {
          setUserDocument(existingUser);
          // Update last active
          await UserService.updateLastActive(firebaseUser.uid);
        } else {
          // Create new user document
          await createUserDocument(firebaseUser);
        }
      } else {
        setUser(null);
        setUserDocument(null);
        setIdToken(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userData = convertFirebaseUser(firebaseUser);
      setUser(userData);
      
      // Load user document
      await loadUserDocument(firebaseUser.uid);
      
      toast({
        title: "Welcome back!",
        description: "You've been successfully logged in.",
      });
    } catch (error: any) {
      let errorMessage = 'Login failed';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password sign-in is not enabled. Please contact support.';
      }
      
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update the user's display name
      await updateFirebaseProfile(firebaseUser, {
        displayName: fullName
      });
      
      const userData = convertFirebaseUser(firebaseUser);
      setUser(userData);
      
      // Create user document in Firestore
      await createUserDocument(firebaseUser);
      
      toast({
        title: "Account created!",
        description: "Welcome to Hire Mate. Let's get you set up.",
      });
    } catch (error: any) {
      let errorMessage = 'Registration failed';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password registration is not enabled. Please contact support.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      const userData = convertFirebaseUser(firebaseUser);
      setUser(userData);
      
      // Create or load user document
      await createUserDocument(firebaseUser);
      
      toast({
        title: "Welcome back!",
        description: "You've been successfully logged in with Google.",
      });
    } catch (error: any) {
      let errorMessage = 'Google login failed';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Login was cancelled';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups for this site';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for Google sign-in';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Google sign-in is not enabled. Please contact support.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with this email using a different sign-in method';
      }
      
      console.error('Google login error:', error);
      toast({
        title: "Google login failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserDocument(null);
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
    }
  };

  const updateUserDocument = async (data: Partial<UserDocument>) => {
    if (user) {
      try {
        await UserService.updateUserProfile(user.uid, data);
        await refreshUserDocument();
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        });
      } catch (error) {
        console.error('Error updating user document:', error);
        toast({
          title: "Update failed",
          description: "There was an error updating your profile.",
          variant: "destructive",
        });
      }
    }
  };

  const refreshUserDocument = async () => {
    if (user) {
      await loadUserDocument(user.uid);
    }
  };

  const shouldRedirectToOnboarding = () => {
    const shouldRedirect = userDocument && !userDocument.onboardingComplete;
    return shouldRedirect;
  };

  const value = {
    user,
    userDocument,
    isAuthenticated: !!user,
    isLoading,
    idToken,
    login,
    register,
    loginWithGoogle,
    logout,
    updateUser,
    updateUserDocument,
    refreshUserDocument,
    shouldRedirectToOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};