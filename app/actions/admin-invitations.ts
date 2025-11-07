'use server';

import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { sendAdminInvitation } from '@/lib/email/gmail';
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
 * Add verified admin email and send invitation
 */
export async function addVerifiedAdminEmail(email: string, adminUid: string) {
  try {
    // Validate email format
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email address' };
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

    // Generate invitation token
    const invitationToken = generateInvitationToken();
    const invitationSentAt = new Date();

    // Create invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invitation?token=${invitationToken}`;

    // Create or update user document
    const userData: any = {
      email,
      role: 'admin',
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
    const emailResult = await sendAdminInvitation(email, invitationLink);
    if (!emailResult) {
      return { success: false, error: 'Failed to send invitation email' };
    }

    return { success: true, message: 'Invitation sent successfully' };
  } catch (error: any) {
    console.error('Error adding verified admin email:', error);
    return { success: false, error: error.message || 'Failed to add admin email' };
  }
}

/**
 * Resend invitation email
 */
export async function resendAdminInvitationEmail(email: string) {
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

    if (user.role !== 'admin') {
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
    const emailResult = await sendAdminInvitation(email, invitationLink);
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
 * Get all verified admin emails (excluding the current admin and invalid pending invitations)
 */
export async function getVerifiedAdminEmails(currentAdminUid?: string) {
  try {
    const snapshot = await adminDb
      .collection('users')
      .where('role', '==', 'admin')
      .get();

    const admins = await Promise.all(
      snapshot.docs.map(async (doc) => {
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
        
        const admin = {
          uid: doc.id,
          email: data.email || '',
          displayName: data.displayName || '',
          pendingInvitation: data.pendingInvitation || false,
          invitationSentAt: convertTimestamp(data.invitationSentAt),
          acceptedAt: convertTimestamp(data.acceptedAt),
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
          createdBy: data.createdBy || '',
        };

        // Check if this is an invalid pending invitation (email exists in Firebase Auth but invitation is pending)
        if (admin.pendingInvitation && admin.email) {
          try {
            await adminAuth.getUserByEmail(admin.email);
            // If we get here, the email exists in Firebase Auth
            // This is an invalid state - the user can't accept the invitation
            // Return null to filter it out
            return null;
          } catch (authError: any) {
            // Email doesn't exist in Firebase Auth, which is correct for pending invitations
            if (authError.code !== 'auth/user-not-found') {
              console.error(`Error checking email ${admin.email} in Firebase Auth:`, authError);
            }
          }
        }

        return admin;
      })
    );

    // Filter out null values (invalid pending invitations) and current admin
    const filteredAdmins = admins
      .filter((admin): admin is NonNullable<typeof admin> => {
        if (!admin) return false; // Filter out null (invalid pending invitations)
        if (currentAdminUid && admin.uid === currentAdminUid) {
          return false; // Filter out current admin
        }
        return true;
      });

    return { success: true, admins: filteredAdmins };
  } catch (error: any) {
    console.error('Error getting verified admin emails:', error);
    return { success: false, error: error.message || 'Failed to get admin emails' };
  }
}

/**
 * Delete verified admin email (only if pending)
 * Also handles invalid pending invitations (where email exists in Firebase Auth)
 * Can also delete invalid admin invitations even if user is actually a representative
 */
export async function deleteVerifiedAdminEmail(email: string) {
  try {
    const user = await getUserByEmailAdmin(email);
    
    if (!user) {
      return { success: false, error: 'Admin email not found' };
    }

    // Allow deletion of pending invitations even if role doesn't match (for cleanup of invalid states)
    if (!user.pendingInvitation) {
      return { success: false, error: 'Cannot delete accepted invitation. Use user management to change role instead.' };
    }

    // Check if this is an invalid pending invitation (email exists in Firebase Auth)
    // We still allow deletion of these invalid invitations
    let isInvalidInvitation = false;
    try {
      await adminAuth.getUserByEmail(email);
      // Email exists in Firebase Auth - this is an invalid pending invitation
      isInvalidInvitation = true;
      console.log(`Deleting invalid pending invitation for ${email} (email exists in Firebase Auth)`);
    } catch (authError: any) {
      // Email doesn't exist in Firebase Auth - normal pending invitation
      if (authError.code !== 'auth/user-not-found') {
        console.error(`Error checking email ${email} in Firebase Auth:`, authError);
      }
    }

    // If user is actually a representative (not admin), still allow deletion for cleanup
    if (user.role !== 'admin' && isInvalidInvitation) {
      console.log(`Deleting invalid admin invitation for ${email} (user is actually ${user.role})`);
    }

    // Delete the document
    await adminDb.collection('users').doc(user.uid).delete();

    return { success: true, message: 'Admin email deleted successfully' };
  } catch (error: any) {
    console.error('Error deleting verified admin email:', error);
    return { success: false, error: error.message || 'Failed to delete admin email' };
  }
}

/**
 * Cleanup invalid pending admin invitation for a specific email
 * Use this to remove invalid admin invitations (e.g., when user is actually a representative)
 */
export async function cleanupInvalidAdminInvitation(email: string) {
  try {
    const user = await getUserByEmailAdmin(email);
    
    if (!user) {
      return { success: false, error: 'User not found in Firestore' };
    }

    // Check if email exists in Firebase Auth
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUserByEmail(email);
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        return { success: false, error: 'Email does not exist in Firebase Auth' };
      }
      throw authError;
    }

    // Check if this is an invalid admin invitation
    if (user.role === 'admin' && user.pendingInvitation) {
      // Delete the invalid pending admin invitation
      await adminDb.collection('users').doc(user.uid).delete();
      return { success: true, message: `Invalid pending admin invitation for ${email} has been removed` };
    }

    return { success: false, error: 'No invalid admin invitation found for this email' };
  } catch (error: any) {
    console.error('Error cleaning up invalid admin invitation:', error);
    return { success: false, error: error.message || 'Failed to cleanup invalid admin invitation' };
  }
}

/**
 * Validate admin invitation token
 */
export async function validateAdminInvitationToken(token: string) {
  try {
    const user = await getUserByInvitationTokenAdmin(token);
    
    if (!user) {
      return { success: false, error: 'Invalid invitation token' };
    }

    if (user.role !== 'admin') {
      return { success: false, error: 'Invalid invitation type' };
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
    };
  } catch (error: any) {
    console.error('Error validating invitation token:', error);
    return { success: false, error: error.message || 'Failed to validate token' };
  }
}

/**
 * Accept admin invitation and create account
 */
export async function acceptAdminInvitation(token: string, password: string, displayName: string) {
  try {
    // Validate token
    const validation = await validateAdminInvitationToken(token);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const { email } = validation;

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
      role: 'admin',
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

