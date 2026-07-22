import { Storage } from '@google-cloud/storage';

async function setCors() {
  const storage = new Storage({
    projectId: process.env.FIREBASE_PROJECT_ID,
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
    }
  });

  const bucketName = 'skillizee-products.firebasestorage.app';
  const bucket = storage.bucket(bucketName);

  const corsConfiguration = [
    {
      origin: ['*'],
      method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      responseHeader: ['*'],
      maxAgeSeconds: 3600,
    },
  ];

  try {
    await bucket.setCorsConfiguration(corsConfiguration);
    console.log(`Successfully set CORS configuration on bucket ${bucketName}`);
  } catch (error) {
    console.error('Error setting CORS configuration:', error);
  }
}

setCors();
