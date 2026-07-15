import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import util from 'util';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const execPromise = util.promisify(exec);

export const maxDuration = 300; // Allow long running tasks for video processing on Vercel

export async function POST(req: Request) {
  try {
    // --- SECURITY GUARD ---
    const authHeader = req.headers.get('authorization');
    const origin = req.headers.get('origin') || '';
    const clientIp = req.headers.get('x-forwarded-for') || 'Unknown IP';
    const userAgent = req.headers.get('user-agent') || 'Unknown User Agent';
    
    // 1. Token Check (from Frontend)
    const isValidToken = authHeader === `Bearer ${process.env.API_SECRET_TOKEN}`;
    
    // 2. Origin Check (Prevent CSRF / external bots)
    // Only allow if no origin (cURL with token) OR if it matches our expected domains
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isVercel = origin.includes('.vercel.app') || origin.includes('skillizee');
    const isValidOrigin = !origin || isLocal || isVercel;

    if (!isValidToken || !isValidOrigin) {
      console.warn(`[SECURITY REJECTED] Bot or unauthorized access attempt. IP: ${clientIp}, Origin: ${origin}, UA: ${userAgent}`);
      return NextResponse.json({ error: 'Unauthorized access. Bot traffic rejected.' }, { status: 403 });
    }
    // ----------------------

    const formData = await req.formData();
    const file = formData.get('video') as File;
    const context = formData.get('context') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    // Save file locally to temp dir
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempFilePath = join(tmpdir(), `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
    const compressedPath = join(tmpdir(), `${uuidv4()}-compressed.mp4`);
    
    await writeFile(tempFilePath, buffer);
    console.log(`Saved temp video to ${tempFilePath}`);

    // Compress video massively to speed up Gemini upload and processing
    let finalUploadPath = tempFilePath;
    console.log("Compressing video before sending to Gemini...");
    try {


        await execPromise(`"${ffmpegInstaller.path}" -i "${tempFilePath}" -vf scale=480:-2 -r 15 -c:v libx264 -preset ultrafast -crf 35 -c:a aac -b:a 64k "${compressedPath}" -y`);
        finalUploadPath = compressedPath;
        console.log("Compression finished successfully.");
    } catch (err) {
        console.error("Compression failed, using original file:", err);
    }

    // Upload to Gemini
    const fileManager = new GoogleAIFileManager(apiKey);
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const uploadResult = await fileManager.uploadFile(finalUploadPath, {
      mimeType: file.type,
      displayName: file.name,
    });
    
    console.log(`Uploaded file to Gemini: ${uploadResult.file.name}`);

    // Clean up temp file
    await unlink(tempFilePath).catch(() => {});
    if (finalUploadPath === compressedPath) {
        await unlink(compressedPath).catch(() => {});
    }

    // Wait for the video to be processed by Gemini
    let currentFile = await fileManager.getFile(uploadResult.file.name);
    while (currentFile.state === "PROCESSING") {
      console.log("Waiting for video processing...");
      await new Promise(r => setTimeout(r, 2000));
      currentFile = await fileManager.getFile(uploadResult.file.name);
    }
    
    if (currentFile.state === "FAILED") {
      throw new Error("Video processing failed in Gemini");
    }

    // Analyze video
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Analyze this video thoroughly. It is a podcast or talking head video.
${context ? `The user provided the following context about the video: "${context}"` : ''}
Your goal is to act as a world-class social media strategist and video editor. Extract between 1 and 10 of the most highly-engaging, viral, and retention-catching moments. 

CRITICAL SELECTION CRITERIA:
- The segment MUST have a powerful "Hook" in its first 3 seconds (a bold claim, an emotional reaction, a controversial statement, or a deep question) that makes viewers instantly stop scrolling.
- The segment MUST deliver immense value, intense emotion, or a mind-blowing fact. It must be a moment where people literally cannot look away.
- Each clip MUST be a complete, coherent thought with a satisfying payoff (do not cut people off mid-sentence).
- Each clip's duration MUST be strictly between 30 seconds and 60 seconds. Do not output any clips shorter than 30 seconds or longer than 60 seconds.

Return ONLY a valid JSON array. Each object in the array must have:
- "id": a unique number
- "title": A scroll-stopping, curiosity-inducing title (max 5 words)
- "start_time": The start time in seconds (integer)
- "end_time": The end time in seconds (integer)
- "time": A string representation like "00:42-01:18"
- "score": A viral potential score from 1 to 100 based on the strength of the hook and retention value.
- "reason": Exactly why this clip will go viral and catch retention (max 12 words)
- "category": e.g., "Story", "Controversial", "Educational", "Mind-Blowing"
- "reach": "High", "Medium", or "Low"
- "best_format": The best format for this clip. Choose exactly one of: "instagram", "tiktok", "youtube", "square". (Default to "instagram" for Reels/Shorts).
- "caption_style": The best caption style. Choose one of: "Hormozi", "Minimal", "Bold", "Default".
- "caption_color": A hex color string for the caption text, e.g., "#ffffff" or "#facc15".
- "caption_text": A short punchy caption text representing the main hook of this clip.
- "instagram_caption": A fully written, highly engaging caption suitable for an Instagram Reel or TikTok post, including spacing, context, and a call-to-action.
- "hashtags": A string containing 5-8 highly relatable, high-reach hashtags separated by spaces (e.g. "#viral #podcast #mindset").

Do NOT include markdown formatting or backticks. Just pure JSON.`;

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResult.file.mimeType,
          fileUri: uploadResult.file.uri
        }
      },
      { text: prompt }
    ]);

    const rawResponse = result.response.text();
    console.log("Raw Gemini Response:", rawResponse);
    
    // Clean up from Gemini
    await fileManager.deleteFile(uploadResult.file.name).catch(console.error);

    let parsedClips = [];
    try {


      const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedClips = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse Gemini output:", e);
      // Fallback
      return NextResponse.json({ error: "Failed to parse AI output." }, { status: 500 });
    }

    return NextResponse.json({ clips: parsedClips });
  } catch (error: any) {
    console.error('Video Analysis API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
