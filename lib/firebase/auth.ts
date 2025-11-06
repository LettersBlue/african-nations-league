import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './config';
import { User, Role } from '@/types';

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Auth helper functions
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Update user profile (display name)
export const updateUserProfile = async (user: FirebaseUser, displayName: string) => {
  try {
    await updateProfile(user, { displayName });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Convert Firebase User to our User type
export const convertFirebaseUser = (firebaseUser: FirebaseUser, userData?: Partial<User>): User => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    role: userData?.role || 'visitor',
    country: userData?.country,
    createdAt: userData?.createdAt || new Date(),
    updatedAt: new Date(),
  };
};

