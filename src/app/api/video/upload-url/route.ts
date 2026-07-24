import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/firebase-admin";
import { getApps } from "firebase-admin/app";

export async function POST(req: NextRequest) {
  try {
    // Guard: ensure Firebase Admin is initialized before attempting storage ops
    if (!getApps().length) {
      console.error("Firebase Admin not initialized — missing ADMIN_FIREBASE_* env vars on Vercel?");
      return NextResponse.json(
        { error: "Server configuration error: Firebase Storage is not initialized. Check environment variables." },
        { status: 503 }
      );
    }

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

    const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const fileKey = `uploads/${uniqueFilename}`;
    const bucketName = process.env.ADMIN_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || 'skillizee-products.firebasestorage.app';
    const file = storage.bucket(bucketName).file(fileKey);
    
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 mins
      contentType,
    });
    
    return NextResponse.json({ url, key: fileKey });
  } catch (error: any) {
    console.error("Signed URL error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

