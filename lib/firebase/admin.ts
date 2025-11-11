import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
let adminApp: App | undefined;

function initializeAdminApp(): App {
  // If already initialized, return existing app
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  const adminKey = process.env.FIREBASE_ADMIN_SDK_KEY;
  
  if (!adminKey || adminKey === '{}' || adminKey.trim() === '') {
    const error = new Error('FIREBASE_ADMIN_SDK_KEY is not set in environment variables. Please check your .env.local file and restart your dev server.');
    console.error('❌', error.message);
    throw error;
  }

  // Remove surrounding quotes if present
  const cleanKey = adminKey.trim().replace(/^['"]|['"]$/g, '');
  
  // Parse JSON
  let keyData;
  try {
    keyData = JSON.parse(cleanKey);
  } catch (parseError: any) {
    const error = new Error(`Failed to parse FIREBASE_ADMIN_SDK_KEY as JSON: ${parseError.message}. Make sure the key is a valid JSON string.`);
    console.error('❌', error.message);
    throw error;
  }
  
  // Validate required fields
  if (!keyData.type || !keyData.project_id || !keyData.private_key || !keyData.client_email) {
    const error = new Error('FIREBASE_ADMIN_SDK_KEY is missing required fields (type, project_id, private_key, client_email)');
    console.error('❌', error.message);
    throw error;
  }
  
  try {
    const app = initializeApp({
      credential: cert(keyData),
      projectId: keyData.project_id,
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
    return app;
  } catch (initError: any) {
    const error = new Error(`Failed to initialize Firebase Admin SDK with credentials: ${initError.message}`);
    console.error('❌', error.message);
    console.error('💡 Make sure FIREBASE_ADMIN_SDK_KEY is correctly formatted in .env.local and restart your dev server');
    throw error;
  }
}

// Initialize on module load
try {
  // Debug: Check if env var is accessible
  if (typeof process !== 'undefined' && process.env) {
    const hasKey = !!process.env.FIREBASE_ADMIN_SDK_KEY;
    console.log(`🔍 Environment check: FIREBASE_ADMIN_SDK_KEY ${hasKey ? 'is' : 'is NOT'} accessible`);
    if (hasKey) {
      console.log(`📏 Key length: ${process.env.FIREBASE_ADMIN_SDK_KEY?.length || 0} characters`);
    }
  }
  
  adminApp = initializeAdminApp();
} catch (error: any) {
  // Log error but don't throw - let it fail when actually used
  console.error('⚠️ Firebase Admin SDK initialization failed:', error.message || error);
  console.error('💡 This usually means:');
  console.error('   1. FIREBASE_ADMIN_SDK_KEY is not set in .env.local');
  console.error('   2. The dev server needs to be restarted after adding/modifying .env.local');
  console.error('   3. The JSON format in FIREBASE_ADMIN_SDK_KEY is invalid');
}

export const adminDb = adminApp ? getFirestore(adminApp) : (() => {
  // Lazy initialization - try again when actually used
  try {
    adminApp = initializeAdminApp();
    return getFirestore(adminApp);
  } catch (error) {
    throw new Error('Firebase Admin SDK not initialized. Check your FIREBASE_ADMIN_SDK_KEY in .env.local and restart the server.');
  }
})();

export const adminAuth = adminApp ? getAuth(adminApp) : (() => {
  try {
    adminApp = initializeAdminApp();
    return getAuth(adminApp);
  } catch (error) {
    throw new Error('Firebase Admin SDK not initialized. Check your FIREBASE_ADMIN_SDK_KEY in .env.local and restart the server.');
  }
})();

export default adminApp;

