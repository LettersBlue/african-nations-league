'use server';

import { createUser, getUser, updateUser } from '@/lib/firebase/firestore';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { User, Role } from '@/types';
import { usersCollection } from '@/lib/firebase/firestore';

/**
 * Create or update user document in Firestore
 * Called after Firebase Auth authentication succeeds
 */
export async function createUserDocument(
  uid: string,
  email: string,
  displayName: string,
  role: Role,
  country?: string
) {
  try {
    // Check if user already exists
    const existingUser = await getUser(uid);
    
    if (existingUser) {
      // Update existing user
      await updateUser(uid, {
        displayName,
        email,
        role,
        country,
        updatedAt: new Date(),
      });
      return { success: true, user: existingUser };
    }
    
    // Create new user
    const newUser: Omit<User, 'createdAt' | 'updatedAt'> = {
      uid,
      email,
      displayName,
      role,
      country,
    };
    
    await createUser(newUser);
    return { success: true };
  } catch (error: any) {
    console.error('Error creating user document:', error);
    
    // Provide helpful error message for common issues
    let errorMessage = error.message || 'Failed to create user document';
    
    if (error.code === 'permission-denied' || error.code === 'unavailable') {
      errorMessage = 'Firestore API is not enabled. Please enable Cloud Firestore API in Firebase Console: https://console.firebase.google.com/project/roadtoglory-eae7b/firestore';
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Get user data from Firestore
 * Note: This is for server-side use. For client-side, use getUser() from firestore.ts directly
 */
export async function getUserData(uid: string) {
  try {
    // Use client SDK function (will be called from server action, but may need auth token)
    // For now, this is a placeholder - client components should use getUser() directly
    const user = await getUser(uid);
    return { success: true, user };
  } catch (error: any) {
    console.error('Error getting user data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  uid: string,
  updates: { displayName?: string; country?: string }
) {
  try {
    await updateUser(uid, {
      ...updates,
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if a country is already taken by another representative
 * TODO: Enhance with Admin SDK for proper server-side querying
 */
export async function checkCountryAvailability(country: string): Promise<boolean> {
  try {
    // For now, we'll check this on the client side
    // Once Admin SDK is configured, we can enhance this to properly query Firestore
    // from the server side
    
    // Basic validation - country must be selected
    if (!country) {
      return false;
    }
    
    // For now, allow any country (validation happens on client side)
    // TODO: Implement proper Firestore query using Admin SDK
    // The check will be done in the RegisterForm component for now
    return true;
  } catch (error) {
    console.error('Error checking country availability:', error);
    return true; // Fail open
  }
}

/**
 * Get all users (admin only)
 * Filters out invalid pending invitations (where email exists in Firebase Auth but invitation is pending)
 */
export async function getAllUsers() {
  try {
    const usersSnapshot = await adminDb.collection('users').get();
    
    // Helper function to convert Firestore Timestamps to ISO strings
    const convertTimestamp = (timestamp: any): string | null => {
      if (!timestamp) return null;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
      }
      if (timestamp._seconds) {
        // Firestore Timestamp object with _seconds and _nanoseconds
        return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000).toISOString();
      }
      if (timestamp instanceof Date) {
        return timestamp.toISOString();
      }
      return timestamp;
    };
    
    const users = await Promise.all(
      usersSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        const user = {
          uid: doc.id,
          email: data.email || '',
          displayName: data.displayName || '',
          role: data.role || 'visitor',
          country: data.country || null,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
          invitationToken: data.invitationToken || null,
          invitationSentAt: convertTimestamp(data.invitationSentAt),
          acceptedAt: convertTimestamp(data.acceptedAt),
          pendingInvitation: data.pendingInvitation || false,
          createdBy: data.createdBy || null,
        };

        // Check if this is an invalid pending invitation (email exists in Firebase Auth but invitation is pending)
        if (user.pendingInvitation && user.email) {
          try {
            await adminAuth.getUserByEmail(user.email);
            // If we get here, the email exists in Firebase Auth
            // This is an invalid state - the user can't accept the invitation
            // Return null to filter it out
            return null;
          } catch (authError: any) {
            // Email doesn't exist in Firebase Auth, which is correct for pending invitations
            if (authError.code !== 'auth/user-not-found') {
              console.error(`Error checking email ${user.email} in Firebase Auth:`, authError);
            }
          }
        }

        return user;
      })
    );

    // Filter out null values (invalid pending invitations)
    const filteredUsers = users.filter((user): user is NonNullable<typeof user> => user !== null);
    
    return { success: true, users: filteredUsers };
  } catch (error: any) {
    console.error('Error getting all users:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(uid: string, newRole: Role) {
  try {
    await adminDb.collection('users').doc(uid).update({
      role: newRole,
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create Firestore user document for existing Auth user (admin only)
 */
export async function createFirestoreUserDocument(uid: string, email: string, displayName: string, role: Role) {
  try {
    const userDoc = {
      uid,
      email,
      displayName,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection('users').doc(uid).set(userDoc);
    return { success: true };
  } catch (error: any) {
    console.error('Error creating Firestore user document:', error);
    return { success: false, error: error.message };
  }
}
