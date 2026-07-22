import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import util from 'util';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { storage } from '@/lib/firebase-admin';

const execPromise = util.promisify(exec);

export const maxDuration = 300; // Allow long running tasks for video processing on Vercel

export async function POST(req: Request) {
  let tempFilePath = "";
  let compressedPath = "";
  let uploadedAnalyzeFile = "";
  let uploadedCaptionsFile = "";
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
    let file = formData.get('video') as File | null;
    const fileKey = formData.get('fileKey') as string | null;
    const context = formData.get('context') as string;

    if (!file && !fileKey) {
      return NextResponse.json({ error: 'No video file or fileKey provided' }, { status: 400 });
    }

    const analyzeApiKey = process.env.GEMINI_API_KEY_ANALYZE || process.env.GEMINI_API_KEY;
    const captionsApiKey = process.env.GEMINI_API_KEY_CAPTIONS || process.env.GEMINI_API_KEY;
    if (!analyzeApiKey || !captionsApiKey) {
      throw new Error("Gemini API keys are not defined (GEMINI_API_KEY_ANALYZE / GEMINI_API_KEY_CAPTIONS)");
    }

    tempFilePath = join(tmpdir(), `${uuidv4()}-${file ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'video.mp4'}`);
    compressedPath = join(tmpdir(), `${uuidv4()}-compressed.m4a`);

    let ffmpegInputPath = tempFilePath;
    if (fileKey) {
      console.log(`Generating Read Signed URL for Firebase Storage: ${fileKey}`);
      const [url] = await storage.bucket().file(fileKey).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });
      ffmpegInputPath = url;
    } else if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(tempFilePath, buffer);
      console.log(`Saved temp video to ${tempFilePath}`);
    }

    // Extract audio only to drastically speed up Gemini upload and processing
    let finalUploadPath = ffmpegInputPath;
    let finalMimeType = file ? file.type : "video/mp4";
    console.log("Extracting audio before sending to Gemini...");
    try {
      await execPromise(`"${ffmpegInstaller.path}" -i "${ffmpegInputPath}" -vn -c:a aac -b:a 32k "${compressedPath}" -y`);
      finalUploadPath = compressedPath;
      finalMimeType = "audio/mp4";
      console.log("Audio extraction finished successfully.");
    } catch (err) {
      console.error("Audio extraction failed, using original file (this may fail if file is huge and not local):", err);
    }

    // Upload to Gemini
    const analyzeFileManager = new GoogleAIFileManager(analyzeApiKey);
    const analyzeGenAI = new GoogleGenerativeAI(analyzeApiKey);

    const captionsFileManager = new GoogleAIFileManager(captionsApiKey);
    const captionsGenAI = new GoogleGenerativeAI(captionsApiKey);

    const [analyzeUpload, captionsUpload] = await Promise.all([
      analyzeFileManager.uploadFile(finalUploadPath, {
        mimeType: finalMimeType || 'video/mp4',
        displayName: (file ? file.name : fileKey || 'video') + "_analyze",
      }),
      captionsFileManager.uploadFile(finalUploadPath, {
        mimeType: finalMimeType || 'video/mp4',
        displayName: (file ? file.name : fileKey || 'video') + "_captions",
      })
    ]);

    console.log(`Uploaded files to Gemini: ${analyzeUpload.file.name}, ${captionsUpload.file.name}`);
    uploadedAnalyzeFile = analyzeUpload.file.name;
    uploadedCaptionsFile = captionsUpload.file.name;

    // Wait for the video to be processed by Gemini
    const waitForFile = async (manager: GoogleAIFileManager, name: string) => {
      let currentFile = await manager.getFile(name);
      while (currentFile.state === "PROCESSING") {
        await new Promise(r => setTimeout(r, 2000));
        currentFile = await manager.getFile(name);
      }
      if (currentFile.state === "FAILED") throw new Error("Video processing failed in Gemini");
      return currentFile;
    };

    console.log("Waiting for video processing on both pipelines...");
    await Promise.all([
      waitForFile(analyzeFileManager, analyzeUpload.file.name),
      waitForFile(captionsFileManager, captionsUpload.file.name)
    ]);

    // Analyze video
    const analyzeModel = analyzeGenAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });

    const captionsModel = captionsGenAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });

    const prompt = `Analyze this media thoroughly. It is a podcast or talking head session.
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
- "broll": An array of exactly 2 objects containing "start_time", "duration", and "keyword". These should be the two most visually descriptive moments in the clip where B-roll would increase retention. The "keyword" MUST be a highly descriptive prompt for an AI image generator (e.g., "cinematic dark shot of hacker typing on laptop, neon, 4k").

Do NOT include markdown formatting or backticks. Just pure JSON.`;

    const resultPromise = analyzeModel.generateContent([
      {
        fileData: {
          mimeType: analyzeUpload.file.mimeType,
          fileUri: analyzeUpload.file.uri
        }
      },
      { text: prompt }
    ]);

    const captionsPrompt = `You are a highly accurate transcription assistant. Your task is to transcribe the speech in this media.
CRITICAL INSTRUCTION: Break the transcription into short phrases (3-5 words) suitable for fast-paced Captions.ai style videos.
DO NOT include any emojis or non-text symbols in the transcription. Return ONLY the spoken words.

Return a JSON array of phrase objects. Each object must have:
- "text": The full phrase spoken.
- "start": Phrase start time (float, seconds).
- "end": Phrase end time (float, seconds).

Return ONLY valid JSON without markdown formatting.`;

    const captionsPromise = captionsModel.generateContent([
      {
        fileData: {
          mimeType: captionsUpload.file.mimeType,
          fileUri: captionsUpload.file.uri
        }
      },
      { text: captionsPrompt }
    ]);

    // Run auto_framer.py to get facial recognition camera cuts
    const cutsJsonPath = join(tmpdir(), `${uuidv4()}-cuts.json`);
    const pythonScript = join(process.cwd(), 'scripts', 'auto_framer.py');
    const framerPromise = execPromise(`python "${pythonScript}" "${tempFilePath}" "${cutsJsonPath}"`)
      .then(async () => {
        const cutsData = await readFile(cutsJsonPath, 'utf8');
        await unlink(cutsJsonPath).catch(() => { });
        return JSON.parse(cutsData).cuts || [];
      })
      .catch((err) => {
        console.error("Auto framer failed:", err);
        return [];
      });

    const [result, captionsResult, parsedCuts] = await Promise.all([resultPromise, captionsPromise, framerPromise]);

    const rawResponse = result.response.text();
    const rawCaptionsResponse = captionsResult.response.text();

    console.log("Raw Gemini Response (Clips):", rawResponse.substring(0, 200) + '...');
    console.log("Raw Gemini Response (Captions):", rawCaptionsResponse.substring(0, 200) + '...');

    let parsedClips = [];
    try {
      const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        parsedClips = JSON.parse(cleaned.substring(start, end + 1));
      } else {
        parsedClips = JSON.parse(cleaned);
      }
    } catch (e) {
      console.error("Failed to parse Gemini output (clips):", e);
      return NextResponse.json({ error: "Failed to parse AI output." }, { status: 500 });
    }

    let parsedCaptions = [];
    try {
      const cleanedCaptions = rawCaptionsResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      let substringToParse = cleanedCaptions;
      const startCaptions = cleanedCaptions.indexOf('[');
      const endCaptions = cleanedCaptions.lastIndexOf(']');
      if (startCaptions !== -1 && endCaptions !== -1) {
        substringToParse = cleanedCaptions.substring(startCaptions, endCaptions + 1);
      }
      try {
        parsedCaptions = JSON.parse(substringToParse);
      } catch (parseError) {
        // If truncated, attempt to fix
        const lastBrace = substringToParse.lastIndexOf('}');
        if (lastBrace !== -1) {
          parsedCaptions = JSON.parse(substringToParse.substring(0, lastBrace + 1) + ']');
        }
      }
    } catch (e) {
      console.error("Failed to parse Gemini output (captions):", e);
    }

    return NextResponse.json({ clips: parsedClips, captions: parsedCaptions, cuts: parsedCuts, fileKey: fileKey || "" });
  } catch (error: any) {
    console.error('Video Analysis API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  } finally {
    if (tempFilePath) await unlink(tempFilePath).catch(() => { });
    if (compressedPath) await unlink(compressedPath).catch(() => { });

    const analyzeApiKey = process.env.GEMINI_API_KEY_ANALYZE || process.env.GEMINI_API_KEY;
    const captionsApiKey = process.env.GEMINI_API_KEY_CAPTIONS || process.env.GEMINI_API_KEY;

    if (uploadedAnalyzeFile && analyzeApiKey) {
      try {
        const fm = new GoogleAIFileManager(analyzeApiKey);
        await fm.deleteFile(uploadedAnalyzeFile).catch(() => { });
      } catch (e) { }
    }

    if (uploadedCaptionsFile && captionsApiKey) {
      try {
        const fm = new GoogleAIFileManager(captionsApiKey);
        await fm.deleteFile(uploadedCaptionsFile).catch(() => { });
      } catch (e) { }
    }
  }
}
