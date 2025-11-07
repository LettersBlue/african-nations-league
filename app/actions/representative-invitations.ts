'use server';

import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { sendRepresentativeInvitation } from '@/lib/email/gmail';
import { AFRICAN_COUNTRIES } from '@/types';
import crypto from 'crypto';

/**
 * Generate secure random token for invitation
 */
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get user by email using Admin SDK
 */
async function getUserByEmailAdmin(email: string): Promise<any | null> {
  try {
    const snapshot = await adminDb
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        uid: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        invitationSentAt: data.invitationSentAt?.toDate ? data.invitationSentAt.toDate() : data.invitationSentAt,
        acceptedAt: data.acceptedAt?.toDate ? data.acceptedAt.toDate() : data.acceptedAt,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Get user by invitation token using Admin SDK
 */
async function getUserByInvitationTokenAdmin(token: string): Promise<any | null> {
  try {
    const snapshot = await adminDb
      .collection('users')
      .where('invitationToken', '==', token)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        uid: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        invitationSentAt: data.invitationSentAt?.toDate ? data.invitationSentAt.toDate() : data.invitationSentAt,
        acceptedAt: data.acceptedAt?.toDate ? data.acceptedAt.toDate() : data.acceptedAt,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user by invitation token:', error);
    return null;
  }
}

/**
 * Add verified representative email and send invitation
 */
export async function addVerifiedRepresentativeEmail(email: string, country: string, adminUid: string) {
  try {
    // Validate email format
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email address' };
    }

    // Validate country
    if (!country || !AFRICAN_COUNTRIES.includes(country)) {
      return { success: false, error: 'Invalid country selected' };
    }

    // Check if email already exists in Firebase Auth
    try {
      await adminAuth.getUserByEmail(email);
      // If we get here, the email exists in Firebase Auth
      return { success: false, error: 'This email is already registered' };
    } catch (authError: any) {
      // Email doesn't exist in Firebase Auth, which is what we want
      if (authError.code !== 'auth/user-not-found') {
        // Some other error occurred
        console.error('Error checking email in Firebase Auth:', authError);
        return { success: false, error: 'Failed to verify email address' };
      }
    }

    // Check if email exists in Firestore (for pending invitations)
    const existingUser = await getUserByEmailAdmin(email);
    if (existingUser && !existingUser.pendingInvitation) {
      return { success: false, error: 'This email is already registered' };
    }

    // Check if country is already taken by another representative
    const countryCheck = await adminDb
      .collection('users')
      .where('role', '==', 'representative')
      .where('country', '==', country)
      .where('pendingInvitation', '==', false)
      .limit(1)
      .get();
    
    if (!countryCheck.empty) {
      return { success: false, error: 'This country already has a representative' };
    }

    // Generate invitation token
    const invitationToken = generateInvitationToken();
    const invitationSentAt = new Date();

    // Create invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invitation?token=${invitationToken}`;

    // Create or update user document
    const userData: any = {
      email,
      role: 'representative',
      country,
      invitationToken,
      invitationSentAt,
      pendingInvitation: true,
      createdBy: adminUid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Use email hash as temporary document ID if no existing user
    if (existingUser) {
      // Update existing pending invitation
      await adminDb.collection('users').doc(existingUser.uid).update(userData);
    } else {
      // Create new document with email hash as ID
      const emailHash = crypto.createHash('sha256').update(email).digest('hex').substring(0, 28);
      userData.uid = emailHash; // Temporary ID
      await adminDb.collection('users').doc(emailHash).set(userData);
    }

    // Send invitation email
    const emailResult = await sendRepresentativeInvitation(email, country, invitationLink);
    if (!emailResult) {
      return { success: false, error: 'Failed to send invitation email' };
    }

    return { success: true, message: 'Invitation sent successfully' };
  } catch (error: any) {
    console.error('Error adding verified representative email:', error);
    return { success: false, error: error.message || 'Failed to add representative email' };
  }
}

/**
 * Resend invitation email
 */
export async function resendInvitationEmail(email: string) {
  try {
    // Check if email already exists in Firebase Auth
    try {
      await adminAuth.getUserByEmail(email);
      // If we get here, the email exists in Firebase Auth
      return { success: false, error: 'This email is already registered' };
    } catch (authError: any) {
      // Email doesn't exist in Firebase Auth, which is what we want
      if (authError.code !== 'auth/user-not-found') {
        // Some other error occurred
        console.error('Error checking email in Firebase Auth:', authError);
        return { success: false, error: 'Failed to verify email address' };
      }
    }

    const user = await getUserByEmailAdmin(email);
    
    if (!user || !user.pendingInvitation) {
      return { success: false, error: 'No pending invitation found for this email' };
    }

    if (!user.country) {
      return { success: false, error: 'Invalid invitation data' };
    }

    // Generate new token
    const invitationToken = generateInvitationToken();
    const invitationSentAt = new Date();
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invitation?token=${invitationToken}`;

    // Update user document
    await adminDb.collection('users').doc(user.uid).update({
      invitationToken,
      invitationSentAt,
      updatedAt: new Date(),
    });

    // Send email
    const emailResult = await sendRepresentativeInvitation(email, user.country, invitationLink);
    if (!emailResult) {
      return { success: false, error: 'Failed to send invitation email' };
    }

    return { success: true, message: 'Invitation resent successfully' };
  } catch (error: any) {
    console.error('Error resending invitation:', error);
    return { success: false, error: error.message || 'Failed to resend invitation' };
  }
}

/**
 * Get all verified representative emails
 */
export async function getVerifiedRepresentativeEmails() {
  try {
    const snapshot = await adminDb
      .collection('users')
      .where('role', '==', 'representative')
      .get();

    const representatives = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Helper function to convert Firestore Timestamps to ISO strings
      const convertTimestamp = (timestamp: any): string | null => {
        if (!timestamp) return null;
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
          return timestamp.toDate().toISOString();
        }
        if (timestamp._seconds) {
          // Firestore Timestamp object
          return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000).toISOString();
        }
        if (timestamp instanceof Date) {
          return timestamp.toISOString();
        }
        return timestamp;
      };
      
      return {
        uid: doc.id,
        email: data.email || '',
        country: data.country || '',
        displayName: data.displayName || '',
        pendingInvitation: data.pendingInvitation || false,
        invitationSentAt: convertTimestamp(data.invitationSentAt),
        acceptedAt: convertTimestamp(data.acceptedAt),
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        createdBy: data.createdBy || '',
      };
    });

    return { success: true, representatives };
  } catch (error: any) {
    console.error('Error getting verified representative emails:', error);
    return { success: false, error: error.message || 'Failed to get representative emails' };
  }
}

/**
 * Delete verified representative email (only if pending)
 */
export async function deleteVerifiedRepresentativeEmail(email: string) {
  try {
    const user = await getUserByEmailAdmin(email);
    
    if (!user) {
      return { success: false, error: 'Representative email not found' };
    }

    if (!user.pendingInvitation) {
      return { success: false, error: 'Cannot delete accepted invitation. Use user management to change role instead.' };
    }

    // Delete the document
    await adminDb.collection('users').doc(user.uid).delete();

    return { success: true, message: 'Representative email deleted successfully' };
  } catch (error: any) {
    console.error('Error deleting verified representative email:', error);
    return { success: false, error: error.message || 'Failed to delete representative email' };
  }
}

/**
 * Validate invitation token
 */
export async function validateInvitationToken(token: string) {
  try {
    const user = await getUserByInvitationTokenAdmin(token);
    
    if (!user) {
      return { success: false, error: 'Invalid invitation token' };
    }

    if (!user.pendingInvitation) {
      return { success: false, error: 'This invitation has already been accepted' };
    }

    // Check if token is expired (7 days)
    if (user.invitationSentAt) {
      const daysSinceSent = (Date.now() - user.invitationSentAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSent > 7) {
        return { success: false, error: 'This invitation has expired. Please request a new one.' };
      }
    }

    return {
      success: true,
      email: user.email,
      country: user.country || '',
    };
  } catch (error: any) {
    console.error('Error validating invitation token:', error);
    return { success: false, error: error.message || 'Failed to validate token' };
  }
}

/**
 * Accept invitation and create account
 */
export async function acceptInvitation(token: string, password: string, displayName: string) {
  try {
    // Validate token
    const validation = await validateInvitationToken(token);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const { email, country } = validation;

    // Get user document
    const user = await getUserByInvitationTokenAdmin(token);
    if (!user) {
      return { success: false, error: 'Invalid invitation token' };
    }

    // Validate password
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Validate display name
    if (!displayName || displayName.trim().length === 0) {
      return { success: false, error: 'Display name is required' };
    }

    // Create Firebase Auth account using Admin SDK
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.createUser({
        email,
        password,
        displayName,
        emailVerified: false,
      });
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-exists') {
        return { success: false, error: 'This email is already registered. Please log in instead.' };
      }
      throw authError;
    }

    // Create/update user document with real UID
    const userData: any = {
      uid: firebaseUser.uid,
      email,
      displayName: displayName.trim(),
      role: 'representative',
      country,
      acceptedAt: new Date(),
      updatedAt: new Date(),
    };

    // Remove invitation fields
    const updateData = {
      ...userData,
      invitationToken: null,
      pendingInvitation: false,
      invitationSentAt: null,
    };

    // If old document exists with email hash ID, delete it and create new one with uid
    if (user.uid !== firebaseUser.uid) {
      await adminDb.collection('users').doc(user.uid).delete();
      await adminDb.collection('users').doc(firebaseUser.uid).set(updateData);
    } else {
      await adminDb.collection('users').doc(firebaseUser.uid).update(updateData);
    }

    return { success: true, message: 'Account created successfully. You can now log in.' };
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return { success: false, error: error.message || 'Failed to accept invitation' };
  }
}

