import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const origin = req.headers.get('origin') || '';
    
    // 1. Token Check (from Frontend or Default)
    const secretToken = process.env.API_SECRET_TOKEN || process.env.NEXT_PUBLIC_API_SECRET_TOKEN || 'podcast_secure_v1_987654321';
    const isValidToken = authHeader === `Bearer ${secretToken}`;
    
    // 2. Origin Check (Allow localhost, vercel, and firebase hosting)
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isVercel = origin.includes('.vercel.app') || origin.includes('skillizee');
    const isFirebase = origin.includes('.web.app') || origin.includes('.firebaseapp.com');
    const isValidOrigin = !origin || isLocal || isVercel || isFirebase;

    if (!isValidToken || !isValidOrigin) {
      console.warn(`[SECURITY REJECTED] Unauthorized upload-url request. Origin: ${origin}, Token matched: ${isValidToken}`);
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 403 });
    }

    const { filename, contentType } = await req.json();
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Filename and content type required' }, { status: 400 });
    }

    // Initialize Firebase Admin safely inside handler
    const admin = require('firebase-admin');
    const projectId = process.env.ADMIN_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'skillizee-products';
    const clientEmail = process.env.ADMIN_FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.ADMIN_FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
    const storageBucket = process.env.ADMIN_FIREBASE_STORAGE_BUCKET
      || process.env.FIREBASE_STORAGE_BUCKET
      || `${projectId}.firebasestorage.app`;

    if (!admin.apps.length) {
      if (projectId && clientEmail && rawPrivateKey) {
        let privateKey = rawPrivateKey;
        if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || 
            (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
          privateKey = privateKey.slice(1, -1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n');

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          storageBucket,
        });
      } else {
        admin.initializeApp({ storageBucket });
      }
    }

    const storage = admin.storage();
    const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const fileKey = `uploads/${uniqueFilename}`;
    const file = storage.bucket(storageBucket).file(fileKey);
    
    console.log(`[upload-url] Generating signed URL for bucket=${storageBucket}, file=${fileKey}`);
    
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'resumable',
      expires: Date.now() + 15 * 60 * 1000, // 15 mins
      contentType,
    });
    
    console.log("[upload-url] Signed URL generated successfully");
    return NextResponse.json({ url, key: fileKey });
  } catch (error: any) {
    console.error("[upload-url] Error:", error?.message, error?.stack);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
