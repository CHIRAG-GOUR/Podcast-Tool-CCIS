// Test private key parsing as it would happen on Cloud Run
import { config } from 'dotenv';
import { cert } from 'firebase-admin/app';

config({ path: '.env' });

const key = process.env.ADMIN_FIREBASE_PRIVATE_KEY;
console.log('Raw key length:', key?.length);
console.log('Key starts with:', JSON.stringify(key?.slice(0, 35)));
console.log('Key ends with:', JSON.stringify(key?.slice(-35)));
console.log('Has literal backslash-n:', key?.includes('\\n'));
console.log('Starts with quote:', key?.startsWith('"'));

// Apply same logic as firebase-admin.ts
let privateKey = key;
if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
  privateKey = privateKey.slice(1, -1);
  console.log('Stripped quotes');
}
privateKey = privateKey.replace(/\\n/g, '\n');
console.log('After processing, starts with:', JSON.stringify(privateKey.slice(0, 35)));
console.log('After processing, has real newlines:', privateKey.includes('\n'));

// Test cert()
try {
  const cred = cert({
    projectId: 'skillizee-products',
    clientEmail: 'firebase-adminsdk-fbsvc@skillizee-products.iam.gserviceaccount.com',
    privateKey: privateKey,
  });
  console.log('✅ cert() SUCCESS');
} catch (e) {
  console.error('❌ cert() FAILED:', e.message);
}
