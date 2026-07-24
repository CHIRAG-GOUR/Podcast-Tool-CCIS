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
    
    // 1. Token Check (from Frontend)
    const isValidToken = authHeader === `Bearer ${process.env.API_SECRET_TOKEN}`;
    
    // 2. Origin Check
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isVercel = origin.includes('.vercel.app') || origin.includes('skillizee');
    const isValidOrigin = !origin || isLocal || isVercel;

    if (!isValidToken || !isValidOrigin) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 403 });
    }

    const { filename, contentType } = await req.json();
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Filename and content type required' }, { status: 400 });
    }

    const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const fileKey = `uploads/${uniqueFilename}`;
    const file = storage.bucket().file(fileKey);
    
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

