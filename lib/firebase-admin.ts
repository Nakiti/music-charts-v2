import { initializeApp, getApps, cert, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

// Use a global variable to cache the initialized app
let cachedApp: App | null = null;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  // Check if Firebase already has an app initialized globally
  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedApp = existingApps[0];
    return cachedApp;
  }

  const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  try {
    if (saVar) {
      const serviceAccount = JSON.parse(saVar);
      if (serviceAccount.private_key) {
        // Essential: Convert escaped newlines back to real newlines
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      cachedApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      // Automatic fallback for Google Cloud Run environments
      cachedApp = initializeApp();
    }
    return cachedApp;
  } catch (error) {
    console.error("FIREBASE_ADMIN_INIT_CRASH:", error);
    throw error;
  }
}

// These getters now guarantee the app is ready before returning the service
export const getAdminDb = (): Firestore => getFirestore(getAdminApp());
export const getAdminAuth = (): Auth => getAuth(getAdminApp());

export async function verifyIdToken(token: string) {
  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    return { uid: decodedToken.uid };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}