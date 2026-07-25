import 'server-only';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as _getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage as _getStorage, Storage } from 'firebase-admin/storage';

// Accept both ADMIN_FIREBASE_* and FIREBASE_* naming conventions
const projectId = process.env.ADMIN_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.ADMIN_FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.ADMIN_FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
const storageBucket = process.env.ADMIN_FIREBASE_STORAGE_BUCKET
  || process.env.FIREBASE_STORAGE_BUCKET
  || (projectId ? `${projectId}.firebasestorage.app` : 'skillizee-products.firebasestorage.app');

function initAdmin() {
  if (getApps().length === 0) {
    try {
      if (projectId && clientEmail && rawPrivateKey) {
        let privateKey = rawPrivateKey;
        if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || 
            (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
          privateKey = privateKey.slice(1, -1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n');

        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          storageBucket,
        });
        console.log(`Firebase Admin initialized with cert (project: ${projectId}, bucket: ${storageBucket})`);
      } else {
        console.warn('Firebase Admin: Missing cert env vars, initializing default app.');
        initializeApp({ storageBucket });
      }
    } catch (error) {
      console.error('Firebase admin initialization error:', error);
    }
  }
}

// Safely obtain Firestore instance
export function getAdminDb(): Firestore | null {
  initAdmin();
  try {
    return getApps().length > 0 ? _getFirestore() : null;
  } catch (e) {
    console.error("Failed to get Firestore:", e);
    return null;
  }
}

// Safely obtain Storage instance
export function getAdminStorage(): Storage | null {
  initAdmin();
  try {
    return getApps().length > 0 ? _getStorage() : null;
  } catch (e) {
    console.error("Failed to get Storage:", e);
    return null;
  }
}

// Typed Proxies for backwards compatibility with legacy exports
export const db = new Proxy({}, {
  get(_, prop) {
    const instance = getAdminDb();
    if (!instance) throw new Error("Firebase Admin DB not initialized");
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  }
}) as Firestore;

export const storage = new Proxy({}, {
  get(_, prop) {
    const instance = getAdminStorage();
    if (!instance) throw new Error("Firebase Admin Storage not initialized");
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  }
}) as Storage;
