import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
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

    const baseUrl = process.env.NEXT_PUBLIC_CLOUD_RUN_URL || "https://skillizee-video-backend-1011375873388.us-central1.run.app";
    
    const backendRes = await fetch(`${baseUrl}/api/video/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename, contentType })
    });
    
    if (!backendRes.ok) {
        throw new Error(await backendRes.text());
    }
    
    const data = await backendRes.json();
    return NextResponse.json({ url: data.uploadUrl, key: data.fileKey });
  } catch (error: any) {
    console.error("Signed URL error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
