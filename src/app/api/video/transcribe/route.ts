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

export const maxDuration = 300; 

export async function POST(req: Request) {
  let tempVideoPath = "";
  let finalUploadPath = "";
  let uploadedFileName = "";
  try {
    // --- SECURITY GUARD ---
    const authHeader = req.headers.get('authorization');
    const origin = req.headers.get('origin') || '';
    const clientIp = req.headers.get('x-forwarded-for') || 'Unknown IP';
    const userAgent = req.headers.get('user-agent') || 'Unknown User Agent';
    
    // 1. Token Check (from Frontend or Default)
    const secretToken = process.env.API_SECRET_TOKEN || process.env.NEXT_PUBLIC_API_SECRET_TOKEN || 'skz-podcast-secret-2024-xK9mP2vL';
    const isValidToken = authHeader === `Bearer ${secretToken}`;
    
    // 2. Origin Check (Prevent CSRF / external bots)
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isVercel = origin.includes('.vercel.app') || origin.includes('skillizee');
    const isFirebase = origin.includes('.web.app') || origin.includes('.firebaseapp.com');
    const isValidOrigin = !origin || isLocal || isVercel || isFirebase;

    if (!isValidToken || !isValidOrigin) {
      console.warn(`[SECURITY REJECTED] Bot or unauthorized access attempt. IP: ${clientIp}, Origin: ${origin}, UA: ${userAgent}`);
      return NextResponse.json({ error: 'Unauthorized access. Bot traffic rejected.' }, { status: 403 });
    }
    // ----------------------

    const formData = await req.formData();
    const file = formData.get('video') as File;
    const startTime = formData.get('start_time') as string;
    const endTime = formData.get('end_time') as string;
    
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
    tempVideoPath = join(tmpdir(), `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
    const tempAudioPath = tempVideoPath + '.mp3';
    
    await writeFile(tempVideoPath, buffer);
    console.log(`Saved temp video to ${tempVideoPath} for transcription`);

    // Use FFMPEG to extract just the required audio slice
    let uploadMime = file.type;
    finalUploadPath = tempVideoPath;
    
    if (startTime && endTime) {
      console.log(`Extracting audio slice from ${startTime}s to ${endTime}s...`);
      try {


        // -vn removes video. -c:a aac is universally supported by ffmpeg builds. We save as .mp4 container for audio to ensure compatibility if mp3 fails.
        // Wait, Gemini File API supports mp3, wav, aac, m4a. We will use aac in an m4a container.
        const safeAudioPath = tempVideoPath + '.m4a';
        await execPromise(`"${ffmpegInstaller.path}" -y -i "${tempVideoPath}" -ss ${startTime} -to ${endTime} -vn -c:a aac -b:a 128k "${safeAudioPath}"`);
        finalUploadPath = safeAudioPath;
        uploadMime = "audio/m4a";
        console.log(`Extracted audio successfully to ${safeAudioPath}`);
      } catch (err) {
        console.error("FFMPEG Audio Extraction failed, falling back to full video upload:", err);
      }
    }

    // Upload to Gemini
    const fileManager = new GoogleAIFileManager(apiKey);
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const uploadResult = await fileManager.uploadFile(finalUploadPath, {
      mimeType: uploadMime,
      displayName: "Transcription_" + file.name,
    });
    
    console.log(`Uploaded file to Gemini for transcription: ${uploadResult.file.name}`);
    uploadedFileName = uploadResult.file.name;

    if (uploadMime.startsWith('video/')) {
      let currentFile = await fileManager.getFile(uploadResult.file.name);
      while (currentFile.state === "PROCESSING") {
        await new Promise(r => setTimeout(r, 2000));
        currentFile = await fileManager.getFile(uploadResult.file.name);
      }
      if (currentFile.state === "FAILED") {
        throw new Error("Media processing failed in Gemini");
      }
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const duration = parseFloat(endTime) - parseFloat(startTime);
    const prompt = `You are a highly accurate transcription assistant. Your task is to transcribe the speech in this audio.
CRITICAL INSTRUCTION: Break the transcription into short phrases (3-5 words) suitable for fast-paced Captions.ai style videos.
DO NOT include any emojis or non-text symbols in the transcription. Return ONLY the spoken words.
For each phrase, you MUST also provide an array of the exact individual words spoken, with word-level timestamps.

Return a JSON array of phrase objects. Each object must have:
- "text": The full phrase spoken.
- "start": Phrase start time (float, seconds).
- "end": Phrase end time (float, seconds).
- "words": An array of objects, where each object has:
    - "word": The individual word.
    - "start": The exact start time of this word.
    - "end": The exact end time of this word.

Return ONLY valid JSON without markdown formatting.`;
    
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

    let parsedCaptions = [];
    try {


      const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
          parsedCaptions = JSON.parse(cleaned.substring(start, end + 1));
      } else {
          parsedCaptions = JSON.parse(cleaned);
      }
    } catch (e) {
      console.error("Failed to parse Gemini transcription output:", e);
      return NextResponse.json({ error: "Failed to parse AI output." }, { status: 500 });
    }

    return NextResponse.json({ captions: parsedCaptions });
  } catch (error: any) {
    const DUMMY_CACHE_BUSTER_VARIABLE_FOR_TURBOPACK = true;
    console.error('Video Transcription API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  } finally {
    if (tempVideoPath) await unlink(tempVideoPath).catch(() => {});
    if (finalUploadPath && finalUploadPath !== tempVideoPath) await unlink(finalUploadPath).catch(() => {});
    if (uploadedFileName && process.env.GEMINI_API_KEY) {
      try {
        const fm = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
        await fm.deleteFile(uploadedFileName).catch(() => {});
      } catch(e) {}
    }
  }
}
