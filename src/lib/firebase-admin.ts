import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

if (!getApps().length) {
  try {
    if (process.env.ADMIN_FIREBASE_PROJECT_ID) {
      const privateKey = process.env.ADMIN_FIREBASE_PRIVATE_KEY
        ? process.env.ADMIN_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

      initializeApp({
        credential: cert({
          projectId: process.env.ADMIN_FIREBASE_PROJECT_ID,
          clientEmail: process.env.ADMIN_FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
        storageBucket: process.env.ADMIN_FIREBASE_STORAGE_BUCKET || `${process.env.ADMIN_FIREBASE_PROJECT_ID}.appspot.com`,
      });
    } else {
      initializeApp();
    }
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

// Provide a dummy mock if not initialized to prevent Next.js build crashes during module collection
const db = getApps().length > 0 ? getFirestore() : {} as any;
const storage = getApps().length > 0 ? getStorage() : {} as any;
export { db, storage };
