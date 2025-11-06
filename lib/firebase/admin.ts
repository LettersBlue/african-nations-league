import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
let adminApp;

try {
  const adminKey = process.env.FIREBASE_ADMIN_SDK_KEY;
  
  if (!adminKey || adminKey === '{}') {
    throw new Error('FIREBASE_ADMIN_SDK_KEY is not set');
  }

  // Remove surrounding quotes if present
  const cleanKey = adminKey.trim().replace(/^['"]|['"]$/g, '');
  
  // Parse JSON
  const keyData = JSON.parse(cleanKey);
  
  adminApp = getApps().length === 0 
    ? initializeApp({
        credential: cert(keyData),
      })
    : getApps()[0];
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  // Create a dummy app to prevent crashes, but operations will fail
  adminApp = getApps()[0] || initializeApp({
    projectId: 'roadtoglory-eae7b',
  });
}

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export default adminApp;

