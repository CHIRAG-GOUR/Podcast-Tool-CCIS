import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import util from 'util';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
// import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'; // Using system ffmpeg instead

dotenv.config();

const execPromise = util.promisify(exec);

// Initialize Firebase Admin (Only needed for signed URLs if frontend didn't pass them, 
// but our frontend passes 'fileKey'. We use application default credentials or explicitly init it)
let storage, db;
try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace \n with actual newline characters
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
    }
    storage = admin.storage();
    db = admin.firestore();
} catch (e) {
    console.error("Firebase Admin initialization failed. (Some endpoints might fail if fileKey is passed)", e);
}

const app = express();
app.use(cors()); // Allow all origins

// Setup multer for parsing multipart/form-data
const upload = multer({ dest: tmpdir() });

const ffmpegPath = "ffmpeg"; // System ffmpeg installed via Docker

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start of /analyze endpoint
app.post('/api/video/analyze', upload.single('video'), async (req, res) => {
    let tempFilePath = "";
    let compressedPath = "";
    let uploadedAnalyzeFile = "";
    let uploadedCaptionsFile = "";

    try {
        // SECURITY GUARD
        const authHeader = req.headers.authorization;
        const origin = req.headers.origin || '';
        
        // We can loosen security here since Cloud Run can be protected, 
        // but let's keep the basic token check
        const isValidToken = authHeader === `Bearer ${process.env.API_SECRET_TOKEN}`;
        
        if (!isValidToken && process.env.API_SECRET_TOKEN) {
            console.warn(`[SECURITY REJECTED] Unauthorized access attempt.`);
            return res.status(403).json({ error: 'Unauthorized access.' });
        }

        const file = req.file; // From multer
        const fileKey = req.body.fileKey;
        const context = req.body.context;

        if (!file && !fileKey) {
            return res.status(400).json({ error: 'No video file or fileKey provided' });
        }

        const analyzeApiKey = process.env.GEMINI_API_KEY_ANALYZE || process.env.GEMINI_API_KEY;
        const captionsApiKey = process.env.GEMINI_API_KEY_CAPTIONS || process.env.GEMINI_API_KEY;
        if (!analyzeApiKey || !captionsApiKey) {
            throw new Error("Gemini API keys are not defined");
        }

        tempFilePath = join(tmpdir(), `${uuidv4()}-${file ? file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_') : 'video.mp4'}`);
        compressedPath = join(tmpdir(), `${uuidv4()}-compressed.m4a`);

        let ffmpegInputPath = tempFilePath;
        if (fileKey) {
            console.log(`Generating Read Signed URL for Firebase Storage: ${fileKey}`);
            const [url] = await storage.bucket().file(fileKey).getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000, // 1 hour
            });
            
            console.log("Downloading video from Firebase to local temp file to speed up FFMPEG...");
            const fetchRes = await fetch(url);
            if (!fetchRes.ok) throw new Error("Failed to fetch video from Firebase");
            const buffer = Buffer.from(await fetchRes.arrayBuffer());
            await writeFile(tempFilePath, buffer);
            console.log("Download complete.");
            
            ffmpegInputPath = tempFilePath;
        } else if (file) {
            // Multer already saves the file, we just rename/move it
            await writeFile(tempFilePath, await readFile(file.path));
            await unlink(file.path).catch(()=>{});
            console.log(`Saved temp video to ${tempFilePath}`);
        }

        // Extract audio only
        let finalUploadPath = ffmpegInputPath;
        let finalMimeType = file ? file.mimetype : "video/mp4";
        console.log("Extracting audio before sending to Gemini...");
        try {
            await execPromise(`"${ffmpegPath}" -i "${ffmpegInputPath}" -vn -c:a aac -b:a 32k "${compressedPath}" -y`);
            finalUploadPath = compressedPath;
            finalMimeType = "audio/mp4";
            console.log("Audio extraction finished successfully.");
        } catch (err) {
            console.error("Audio extraction failed, using original file:", err);
        }

        // Upload to Gemini
        const analyzeFileManager = new GoogleAIFileManager(analyzeApiKey);
        const analyzeGenAI = new GoogleGenerativeAI(analyzeApiKey);

        console.log("Uploading file to Gemini...");
        const analyzeUpload = await analyzeFileManager.uploadFile(finalUploadPath, {
            mimeType: finalMimeType || 'video/mp4',
            displayName: (file ? file.originalname : fileKey || 'video') + "_analyze",
        });
        uploadedAnalyzeFile = analyzeUpload.file.name;
        console.log(`Uploaded to Gemini: ${analyzeUpload.file.name}`);

        const waitForFile = async (manager, name) => {
            let currentFile = await manager.getFile(name);
            while (currentFile.state === "PROCESSING") {
                await new Promise(r => setTimeout(r, 2000));
                currentFile = await manager.getFile(name);
            }
            if (currentFile.state === "FAILED") throw new Error("Video processing failed in Gemini");
            return currentFile;
        };

        console.log("Waiting for video processing...");
        await waitForFile(analyzeFileManager, analyzeUpload.file.name);

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

        let captionsFileManager = analyzeFileManager;
        let captionsGenAI = analyzeGenAI;
        const sameKey = (analyzeApiKey === captionsApiKey);
        if (!sameKey) {
            captionsFileManager = new GoogleAIFileManager(captionsApiKey);
            captionsGenAI = new GoogleGenerativeAI(captionsApiKey);
        }

        let captionsUpload = analyzeUpload;
        if (!sameKey) {
            console.log("Uploading file to Gemini (Captions)...");
            captionsUpload = await captionsFileManager.uploadFile(finalUploadPath, {
                mimeType: finalMimeType || 'video/mp4',
                displayName: (file ? file.originalname : fileKey || 'video') + "_captions",
            });
            uploadedCaptionsFile = captionsUpload.file.name;
            console.log(`Uploaded to Gemini (Captions): ${captionsUpload.file.name}`);
            await waitForFile(captionsFileManager, captionsUpload.file.name);
        }

        const captionsModel = captionsGenAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const captionsPrompt = `You are a highly accurate transcription assistant. Your task is to transcribe the speech in this media.
CRITICAL INSTRUCTION: Break the transcription into short phrases (3-5 words) suitable for fast-paced Captions.ai style videos.
Return ONLY a valid JSON array. Each object in the array must have:
- "text": The text of the short phrase
- "start": The start time in seconds (float, e.g., 1.5)
- "end": The end time in seconds (float, e.g., 2.3)
- "words": An array of objects for each word in the phrase, containing "word", "start", and "end".
Do NOT include markdown formatting or backticks. Just pure JSON.`;

        const captionsPromise = captionsModel.generateContent([
            {
                fileData: {
                    mimeType: captionsUpload.file.mimeType,
                    fileUri: captionsUpload.file.uri
                }
            },
            { text: captionsPrompt }
        ]);

        // Run auto_framer.py
        const cutsJsonPath = join(tmpdir(), `${uuidv4()}-cuts.json`);
        const pythonScript = join(process.cwd(), 'scripts', 'auto_framer.py');
        const framerPromise = execPromise(`python3 "${pythonScript}" "${tempFilePath}" "${cutsJsonPath}"`)
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
            return res.status(500).json({ error: "Failed to parse AI output." });
        }

        let parsedCaptions = [];
        try {
            const cleanedCaptions = rawCaptionsResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            let substringToParse = cleanedCaptions;
            const startCaptions = cleanedCaptions.indexOf('[');
            const endCaptions = cleanedCaptions.lastIndexOf(']');
            if (startCaptions !== -1 && endCaptions !== -1) {
                substringToParse = cleanedCaptions.substring(startCaptions, endCaptions + 1);
                parsedCaptions = JSON.parse(substringToParse);
            } else {
                parsedCaptions = JSON.parse(cleanedCaptions);
            }
        } catch (e) {
            console.error("Failed to parse Gemini output (captions):", e);
        }

        // Slice captions per clip
        parsedClips.forEach((clip) => {
            const clipStart = parseFloat(clip.start_time);
            const clipEnd = parseFloat(clip.end_time);
            clip.captions = [];
            
            parsedCaptions.forEach((phrase) => {
                if (phrase.start >= clipStart - 1.0 && phrase.end <= clipEnd + 1.0) {
                   let p = JSON.parse(JSON.stringify(phrase));
                   p.start = Math.max(0, p.start - clipStart);
                   p.end = Math.max(0, p.end - clipStart);
                   if (p.words) {
                       p.words = p.words.map((w) => ({
                           ...w,
                           start: Math.max(0, w.start - clipStart),
                           end: Math.max(0, w.end - clipStart)
                       }));
                   }
                   clip.captions.push(p);
                }
            });
        });

        res.json({ clips: parsedClips, captions: [], cuts: parsedCuts, fileKey: fileKey || "" });

    } catch (error) {
        console.error('Video Analysis API Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
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
});

// Helper function to wrap long sentences into multiple lines for FFMPEG
function wrapText(text, maxChars) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';
    for (const word of words) {
        if ((currentLine + word).length > maxChars) {
            if (currentLine.trim() !== '') lines.push(currentLine.trim());
            currentLine = word + ' ';
        } else {
            currentLine += word + ' ';
        }
    }
    if (currentLine.trim() !== '') lines.push(currentLine.trim());
    return lines.join('\n');
}

function formatAssTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const cs = Math.floor((seconds % 1) * 100);
    return `${h}:${m.toString().padStart(2, '0')}:${Math.floor(s).toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

function generateAssFile(captions, videoWidth, videoHeight, preset = 'hormozi', userFontSize = 48, backgroundBox = 'none', bouncyText = false) {
    const scaleFactor = videoWidth / 380;
    const fontSize = Math.round((userFontSize || 48) * scaleFactor);
    
    let fontName = 'Inter';
    let baseFontSize = fontSize;
    let colors = '&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000';
    let styleProps = '-1,0,1,0,8,0';
    
    let activeColor = '&H00FFFF&';
    let inactiveColor = '&HFFFFFF&';
    let activeScale = false;
    let activeColorList = null;
    let activeExtraTags = '';
    let inactiveExtraTags = '';

    if (preset === 'hormozi' || preset === 'opus') {
        fontName = 'Montserrat';
        baseFontSize = fontSize;
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H80000000';
        styleProps = '-1,0,1,3,10,0'; 
        activeColor = '&H00FFFF&'; 
        inactiveColor = '&HFFFFFF&';
        activeScale = true;
    } else if (preset === 'modern-clean') {
        fontName = 'Inter';
        baseFontSize = Math.round(fontSize * 0.8);
        colors = '&H00000000,&H000000FF,&H00FFFFFF,&H00000000'; 
        styleProps = '0,0,3,4,0,0'; 
        activeColor = '&HF6823B&'; 
        inactiveColor = '&H000000&'; 
    } else if (preset === 'paper-cut') {
        fontName = 'Segoe Print';
        baseFontSize = fontSize;
        colors = '&H00111111,&H000000FF,&H00DDF0F6,&H00000000'; 
        styleProps = '-1,0,3,6,2,0'; 
        activeColor = '&H0000FF&'; 
        inactiveColor = '&H111111&';
        activeScale = true;
    } else if (preset === 'beast') {
        fontName = 'Impact';
        baseFontSize = Math.round(fontSize * 1.2);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H80000000';
        styleProps = '-1,-1,1,6,4,0'; 
        activeColor = '&HFFFF00&'; 
        activeScale = true;
    } else if (preset === 'youtube') {
        fontName = 'Arial';
        baseFontSize = Math.round(fontSize * 0.6);
        colors = '&H00FFFFFF,&H000000FF,&H80000000,&H00000000'; 
        styleProps = '-1,0,3,4,0,0'; 
        activeColor = '&HFFFFFF&';
        inactiveColor = '&HFFFFFF&';
    } else if (preset === 'tiktok') {
        fontName = 'Montserrat';
        baseFontSize = Math.round(fontSize * 1.0);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H80000000'; 
        styleProps = '-1,0,1,5,1,0'; 
        activeColor = '&H00FFFF&'; 
        activeColorList = ['&HFFFF00&', '&H00FFFF&', '&H00FF00&', '&H0000FF&']; 
        inactiveColor = '&HFFFFFF&'; 
        activeScale = true; 
    } else if (preset === 'netflix') {
        fontName = 'Arial';
        baseFontSize = Math.round(fontSize * 0.8);
        colors = '&H0000FFFF,&H000000FF,&H00000000,&H00000000';
        styleProps = '-1,0,1,0,2,0'; 
        activeColor = '&H00FFFF&';
        inactiveColor = '&H00FFFF&';
    } else if (preset === 'ali') {
        fontName = 'Inter';
        baseFontSize = Math.round(fontSize * 0.9);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H00000000';
        styleProps = '-1,0,1,0,5,0'; 
        activeColor = '&H00A5FF&'; 
        activeScale = true;
    } else if (preset === 'neon') {
        fontName = 'Inter';
        baseFontSize = fontSize;
        colors = '&H00FFFFFF,&H000000FF,&H00FF00FF,&H00000000';
        styleProps = '-1,-1,1,5,0,0'; 
        activeColor = '&HFFFF00&'; 
    } else if (preset === 'minimalist') {
        fontName = 'Inter';
        baseFontSize = fontSize;
        colors = '&H00D3D3D3,&H000000FF,&H00000000,&H00000000';
        styleProps = '0,0,1,0,0,0'; 
        inactiveColor = '&HD3D3D3&'; 
        activeColor = '&H000000&'; 
    } else if (preset === 'cinematic-bold' || preset === 'cinematic') {
        fontName = 'Montserrat';
        baseFontSize = Math.round(fontSize * 1.2);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H80000000'; 
        styleProps = '-1,0,1,1,3,2'; 
        inactiveColor = '&HFEE8E8&'; 
        activeColor = '&HFFFFFF&'; 
    } else if (preset === 'cinematic-elegant') {
        fontName = 'Playfair Display';
        baseFontSize = Math.round(fontSize * 1.1);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H90000000'; 
        styleProps = '0,0,1,0,3,4'; 
        inactiveColor = '&HCCCCCC&';
        activeColor = '&HFFFFFF&';
    } else if (preset === 'cinematic-condensed') {
        fontName = 'Bebas Neue';
        baseFontSize = Math.round(fontSize * 1.4);
        colors = '&H00008CFF,&H000000FF,&H00000000,&H90000000'; 
        styleProps = '0,0,1,0,4,1'; 
        inactiveColor = '&H0045FF&'; 
        activeColor = '&H008CFF&'; 
    } else if (preset === 'skillizee') {
        fontName = 'Inter';
        baseFontSize = fontSize;
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H00000000'; 
        styleProps = '-1,0,1,3,0,0'; 
        inactiveColor = '&HFFFFFF&'; 
        activeColor = '&HEB6325&'; 
        activeExtraTags = '\\u1'; 
        inactiveExtraTags = '\\u0'; 
    }
    
    if (backgroundBox && backgroundBox !== 'none') {
        const styleParts = styleProps.split(',');
        styleParts[2] = '3'; 
        styleParts[3] = '6'; 
        styleProps = styleParts.join(',');
        
        const colorParts = colors.split(',');
        if (backgroundBox === 'white') {
            colorParts[2] = '&H00FFFFFF&'; 
        } else if (backgroundBox === 'black') {
            colorParts[2] = '&H00000000&'; 
        } else if (backgroundBox === 'blur') {
            colorParts[2] = '&H80808080&'; 
        } else if (backgroundBox === 'dark-blur') {
            colorParts[2] = '&H80000000&'; 
        } else if (backgroundBox === 'white-blur') {
            colorParts[2] = '&H90FFFFFF&'; 
        }
        colors = colorParts.join(',');
    }

    let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Spacing, Angle, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Captions,${fontName},${baseFontSize},${colors},${styleProps},0,2,${Math.round(videoWidth * 0.08)},${Math.round(videoWidth * 0.08)},${Math.round(videoHeight * 0.1)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    captions.forEach(chunk => {
        let words = chunk.words || [];
        
        if (words.length === 0 && chunk.text) {
            const textWords = chunk.text.trim().split(/\s+/);
            const chunkDuration = chunk.end - chunk.start;
            const timePerWord = chunkDuration / Math.max(1, textWords.length);
            words = textWords.map((w, idx) => ({
                word: w,
                start: chunk.start + (idx * timePerWord),
                end: chunk.start + ((idx + 1) * timePerWord)
            }));
        }

        if (words.length === 0) {
            const start = formatAssTime(chunk.start);
            const end = formatAssTime(chunk.end);
            ass += `Dialogue: 0,${start},${end},Captions,,0,0,0,,${chunk.text}\n`;
            return;
        }

        for (let i = 0; i < words.length; i++) {
            const w = words[i];
            const start = formatAssTime(w.start);
            const end = formatAssTime(w.end);
            
            if (preset === 'skillizee') {
                let sentenceL0 = "{\\4a&HFF&}"; 
                for (let j = 0; j < words.length; j++) {
                    const cw = words[j];
                    if (j === i) {
                        sentenceL0 += `{\\1a&H00&\\3a&H00&\\c&H00FFFF&\\u1}${cw.word}{\\u0} `;
                    } else {
                        sentenceL0 += `{\\1a&HFF&\\3a&HFF&}${cw.word} `; 
                    }
                }
                ass += `Dialogue: 0,${start},${end},Captions,,0,0,0,,${sentenceL0.trim()}\n`;

                let sentenceL1 = "";
                for (let j = 0; j < words.length; j++) {
                    const cw = words[j];
                    if (j === i) {
                        sentenceL1 += `{\\c&HEB6325&\\u0}${cw.word}{\\c${inactiveColor}} `;
                    } else {
                        sentenceL1 += `${cw.word} `;
                    }
                }
                ass += `Dialogue: 1,${start},${end},Captions,,0,0,0,,${sentenceL1.trim()}\n`;

            } else {
                let sentence = "";
                for (let j = 0; j < words.length; j++) {
                    const cw = words[j];
                    if (j === i) {
                        let currentColor = activeColor;
                        if (activeColorList && activeColorList.length > 0) {
                            currentColor = activeColorList[i % activeColorList.length];
                        }
                        let prefix = `\\c${currentColor}${activeExtraTags}`;
                        let suffix = `\\c${inactiveColor}${inactiveExtraTags}`;
                        
                        if (activeScale) {
                            if (bouncyText) {
                                sentence += `{\\t(0,50,\\fscx125\\fscy125)\\t(50,200,\\fscx100\\fscy100)${prefix}}${cw.word}{\\fscx100\\fscy100${suffix}} `;
                            } else {
                                sentence += `{\\fscx115\\fscy115${prefix}}${cw.word}{\\fscx100\\fscy100${suffix}} `;
                            }
                        } else {
                            sentence += `{${prefix}}${cw.word}{${suffix}} `;
                        }
                    } else {
                        sentence += `${cw.word} `;
                    }
                }
                ass += `Dialogue: 0,${start},${end},Captions,,0,0,0,,${sentence.trim()}\n`;
            }
        }
    });

    return ass;
}

app.post('/api/video/export', upload.single('video'), async (req, res) => {
    let tempVideoPath = '';
    let tempFilterPath = '';
    let tempOutputPath = '';
    const downloadedImages = [];
    try {
        const file = req.file;
        const startTime = req.body.start_time;
        const endTime = req.body.end_time;
        const aspectRatio = req.body.aspect_ratio || '9:16';
        const captionsRaw = req.body.captions;
        
        const exportFormat = req.body.export_format || 'mp4';
        const exportRes = req.body.export_res || '1080p';
        const exportFps = req.body.export_fps || '30';
        const exportCodec = req.body.export_codec || 'h264';
        
        const viralRemoveSilence = req.body.viral_remove_silence === 'true';
        const viralSoundDesign = req.body.viral_sound_design === 'true';
        const viralBouncyText = req.body.viral_bouncy_text === 'true';
        
        const fileKey = req.body.fileKey;
        
        if (!file && !fileKey) {
            return res.status(400).json({ error: 'No video file or fileKey provided' });
        }

        let captions = [];
        let style = {};
        if (captionsRaw) {
            try {
                const parsed = JSON.parse(captionsRaw);
                captions = parsed.chunks || [];
                style = { ...(parsed.style || {}), transform: parsed.transform || {} };
            } catch(e) {}
        }
        
        const cameraCutsRaw = req.body.cameraCuts;
        let cameraCuts = [];
        if (cameraCutsRaw) {
            try {
                cameraCuts = JSON.parse(cameraCutsRaw);
            } catch(e) {}
        }
        
        const projectClipsRaw = req.body.projectClips;
        let projectClips = [];
        if (projectClipsRaw) {
            try {
                projectClips = JSON.parse(projectClipsRaw);
            } catch(e) {}
        }

        let baseRes = 1080;
        if (exportRes === '2160p') baseRes = 2160;
        else if (exportRes === '1440p') baseRes = 1440;
        else if (exportRes === '720p') baseRes = 720;
        else if (exportRes === '480p') baseRes = 480;

        let targetWidth = 1080;
        let targetHeight = 1920;
        
        if (aspectRatio === '16:9') {
            targetHeight = baseRes;
            targetWidth = Math.round(baseRes * (16/9));
        } else if (aspectRatio === '9:16') {
            targetWidth = baseRes;
            targetHeight = Math.round(baseRes * (16/9));
        } else if (aspectRatio === '1:1') {
            targetWidth = baseRes;
            targetHeight = baseRes;
        } else if (aspectRatio === '4:5') {
            targetWidth = baseRes;
            targetHeight = Math.round(baseRes * (5/4));
        }

        // Ensure even dimensions for FFMPEG
        targetWidth = targetWidth + (targetWidth % 2);
        targetHeight = targetHeight + (targetHeight % 2);

        const isAudioOnly = ['mp3', 'wav', 'aac'].includes(exportFormat);
        let ext = exportFormat;
        if (exportFormat === 'png_seq') ext = 'mp4'; 
        
        const uniqueId = uuidv4();
        
        if (fileKey) {
            console.log(`Generating Read Signed URL for FFMPEG input from Firebase Storage: ${fileKey}`);
            const [url] = await storage.bucket().file(fileKey).getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 2 * 60 * 60 * 1000, 
            });
            tempVideoPath = url;
        } else {
            tempVideoPath = join(tmpdir(), `${uniqueId}-input.mp4`);
            await writeFile(tempVideoPath, await readFile(file.path));
            await unlink(file.path).catch(()=>{});
            console.log(`Saved temp video to ${tempVideoPath} for export with ratio ${targetWidth}x${targetHeight}`);
        }

        tempFilterPath = join(tmpdir(), `${uniqueId}-filter.ass`);
        tempOutputPath = join(tmpdir(), `${uniqueId}-output.${ext}`);

        const startNum = parseFloat(startTime) || 0;
        const endNum = parseFloat(endTime) || 0;
        const duration = endNum > 0 ? (endNum - startNum) : 999999;

        const shiftedCameraCuts = cameraCuts || [];
        const shiftedCaptions = captions || [];

        let cropXExpr = '(iw-ow)/2'; 
        if (aspectRatio === '9:16' && shiftedCameraCuts.length > 0) {
            let expr = `max(0,min(iw-ow,(iw*${shiftedCameraCuts[shiftedCameraCuts.length - 1].cx_percent || 0.5})-(ow/2)))`;
            for (let i = shiftedCameraCuts.length - 1; i >= 0; i--) {
                const c = shiftedCameraCuts[i];
                const cutExpr = `max(0,min(iw-ow,(iw*${c.cx_percent || 0.5})-(ow/2)))`;
                expr = `if(between(t,${c.start},${c.start + c.duration}),${cutExpr},${expr})`;
            }
            cropXExpr = `'${expr}'`;
        } else {
            cropXExpr = `'${cropXExpr}'`;
        }

        let vfStr = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}:${cropXExpr}:0`;

        if (shiftedCaptions.length > 0 && !isAudioOnly) {
            const isPortrait = aspectRatio === '9:16' || aspectRatio === '4:5';
            const refWidth = isPortrait ? 1080 : 1920;
            const scaleFactor = targetWidth / refWidth;
            const scaledFontSize = Math.round((style.fontSize || 48) * scaleFactor);

            const assContent = generateAssFile(shiftedCaptions, targetWidth, targetHeight, style.preset, scaledFontSize, style.backgroundBox, viralBouncyText);
            await writeFile(tempFilterPath, assContent, 'utf-8');
            // Fix path so ffmpeg doesn't crash on windows locally
            const safeAssPath = tempFilterPath.replace(/\\/g, '/').replace(/:/g, '\\\\:');
            vfStr += `,subtitles='${safeAssPath}'`;
        }

        let afStr = '';
        if (viralRemoveSilence && shiftedCaptions.length > 0) {
            let segments = [];
            shiftedCaptions.forEach((chunk) => {
                if (chunk.words) {
                    chunk.words.forEach((w) => {
                        segments.push({ start: w.start, end: w.end });
                    });
                }
            });
            
            let mergedSegments = [];
            if (segments.length > 0) {
                let current = { start: Math.max(0, segments[0].start - 0.1), end: segments[0].end + 0.1 };
                for (let i = 1; i < segments.length; i++) {
                    let nextStart = segments[i].start - 0.1;
                    let nextEnd = segments[i].end + 0.1;
                    
                    if (nextStart - current.end < 0.4) {
                        current.end = Math.max(current.end, nextEnd);
                    } else {
                        mergedSegments.push(current);
                        current = { start: nextStart, end: nextEnd };
                    }
                }
                mergedSegments.push(current);
            }
            
            if (mergedSegments.length > 0) {
                const keepExprs = mergedSegments.map(seg => `between(t,${seg.start.toFixed(2)},${seg.end.toFixed(2)})`).join('+');
                if (keepExprs.length > 0) {
                    vfStr += `,select='${keepExprs}',setpts=N/FRAME_RATE/TB`;
                    afStr = `aselect='${keepExprs}',asetpts=N/SR/TB`;
                }
            }
        }

        let vCodec = 'libx264';
        let aCodec = 'aac';
        let extraArgs = '-preset fast -crf 23';
        
        if (exportFormat === 'webm') {
            vCodec = 'libvpx-vp9';
            aCodec = 'libopus';
            extraArgs = '-crf 30 -b:v 0';
        } else if (exportFormat === 'gif') {
            vCodec = 'gif';
            aCodec = '';
            extraArgs = '';
        } else {
            if (exportCodec === 'h265') {
                vCodec = 'libx265';
            } else if (exportCodec === 'av1') {
                vCodec = 'libaom-av1';
                extraArgs = '-crf 30 -b:v 0 -strict experimental';
            }
        }

        if (isAudioOnly) {
           vCodec = '';
           extraArgs = '';
           if (exportFormat === 'mp3') { aCodec = 'libmp3lame'; ext = 'mp3'; }
           else if (exportFormat === 'wav') { aCodec = 'pcm_s16le'; ext = 'wav'; }
           else if (exportFormat === 'aac') { aCodec = 'aac'; ext = 'aac'; }
        }

        let audioInputs = '';
        if (viralSoundDesign) {
            audioInputs = ` -f lavfi -i "anoisesrc=color=brown:amplitude=1.0"`;
            let volEq = '0.02';
            volEq += ` + 0.8*exp(-((t-0.1)^2)/0.02)`;
            if (shiftedCameraCuts && shiftedCameraCuts.length > 0) {
                shiftedCameraCuts.forEach((c) => {
                    if (c.start > 0.5) volEq += ` + 0.5*exp(-((t-${c.start.toFixed(2)})^2)/0.01)`;
                });
            }
            
            const overlays = projectClips?.filter((c) => c.trackId === 'v4' && c.type === 'image') || [];
            overlays.forEach((o) => {
                if (o.start > 0.5) volEq += ` + 0.6*exp(-((t-${o.start.toFixed(2)})^2)/0.015)`;
            });

            const sfxChain = `lowpass=f=800,volume='${volEq}':eval=frame[sfx]`;
            
            if (afStr) {
                afStr = `[0:a]${afStr}[a0];[1:a]${sfxChain};[a0][sfx]amix=inputs=2:duration=first:dropout_transition=2:weights=1 0.8`;
            } else {
                afStr = `[0:a]volume=1.0[a0];[1:a]${sfxChain};[a0][sfx]amix=inputs=2:duration=first:dropout_transition=2:weights=1 0.8`;
            }
        }

        const allOverlays = projectClips?.filter((c) => c.trackId === 'v4' && c.type === 'image') || [];
        let brollInputs = '';
        const overlays = [];
        if (allOverlays.length > 0) {
            for (let i = 0; i < allOverlays.length; i++) {
                const overlay = allOverlays[i];
                const imgPath = join(tmpdir(), `${uniqueId}-broll-${downloadedImages.length}.jpg`);
                try {
                    const imgResponse = await fetch(overlay.mediaUrl);
                    const imgBuffer = await imgResponse.arrayBuffer();
                    await writeFile(imgPath, Buffer.from(imgBuffer));
                    downloadedImages.push(imgPath);
                    overlays.push(overlay);
                    brollInputs += ` -i "${imgPath.replace(/\\/g, '/').replace(/:/g, '\\\\:')}"`;
                } catch (err) {
                    console.error("Failed to download B-roll", err);
                }
            }
        }
        
        if (viralSoundDesign && overlays.length > 0) {
            const newAudioIdx = 1 + overlays.length;
            afStr = afStr.replace('[1:a]', `[${newAudioIdx}:a]`);
        }

        let ffmpegCmd = `ffmpeg -y -ss ${startNum} -t ${duration} -i "${tempVideoPath}"${brollInputs}${audioInputs}`;
        
        if (!isAudioOnly) {
            if (viralSoundDesign || (afStr && afStr.includes('[a0]')) || overlays.length > 0) {
                let complexFilter = `[0:v]${vfStr}[vbase];`;
                let currentV = 'vbase';
                
                for (let i = 0; i < downloadedImages.length; i++) {
                    const overlay = overlays[i];
                    const inputIdx = i + 1; 
                    const nextV = `v${i}`;
                    const start = overlay.start; 
                    const end = start + (overlay.duration || 3);
                    const brollFiltered = `b${i}`;
                    
                    complexFilter += `[${inputIdx}:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},fade=t=in:st=${start}:d=0.3:alpha=1,fade=t=out:st=${end-0.3}:d=0.3:alpha=1[${brollFiltered}];`;
                    complexFilter += `[${currentV}][${brollFiltered}]overlay=0:0:enable='between(t,${start},${end})'[${nextV}];`;
                    currentV = nextV;
                }
                
                if (afStr) {
                    complexFilter += `${afStr}[a]`;
                }
                
                ffmpegCmd += ` -filter_complex "${complexFilter}" -map "[${currentV}]" ${afStr ? '-map "[a]"' : '-map 0:a'} -r ${exportFps} -c:v ${vCodec} ${extraArgs}`;
                if (aCodec) {
                    ffmpegCmd += ` -c:a ${aCodec} -b:a 128k`;
                }
            } else {
                ffmpegCmd += ` -vf "${vfStr}" -r ${exportFps} -c:v ${vCodec} ${extraArgs}`;
                if (aCodec) {
                    if (afStr) {
                        ffmpegCmd += ` -af "${afStr}" -c:a ${aCodec} -b:a 128k`;
                    } else {
                        ffmpegCmd += ` -c:a ${aCodec} -b:a 128k`;
                    }
                }
            }
        } else {
            if (afStr) {
                ffmpegCmd += ` -vn -af "${afStr}" -c:a ${aCodec} -b:a 192k`;
            } else {
                ffmpegCmd += ` -vn -c:a ${aCodec} -b:a 192k`;
            }
        }
        
        ffmpegCmd += ` "${tempOutputPath}"`;
        
        console.log("Running FFMPEG:", ffmpegCmd);
        
        try {
            await execPromise(ffmpegCmd, { cwd: tmpdir() });
            console.log("FFMPEG export complete");
            
            const outputBuffer = await readFile(tempOutputPath);
            
            let contentType = 'video/mp4';
            if (ext === 'mov') contentType = 'video/quicktime';
            if (ext === 'webm') contentType = 'video/webm';
            if (ext === 'gif') contentType = 'image/gif';
            if (ext === 'mp3') contentType = 'audio/mpeg';
            if (ext === 'wav') contentType = 'audio/wav';
            if (ext === 'aac') contentType = 'audio/aac';
            
            if (storage && db) {
                try {
                    console.log("Uploading to Firebase Storage...");
                    const bucket = storage.bucket();
                    const firebaseFileName = `exports/Skillizee_Export_${uniqueId.substring(0,8)}.${ext}`;
                    const fileUpload = bucket.file(firebaseFileName);
                    
                    await fileUpload.save(outputBuffer, {
                        metadata: {
                            contentType: contentType
                        }
                    });
                    
                    try {
                        await fileUpload.makePublic();
                        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${firebaseFileName}`;
                        console.log(`Successfully uploaded to Firebase: ${publicUrl}`);
                        
                        await db.collection('exported_videos').add({
                            fileName: firebaseFileName,
                            publicUrl: publicUrl,
                            createdAt: new Date(),
                            format: ext,
                            contentType: contentType
                        });
                    } catch (makePublicErr) {
                        console.log("Uploaded, but couldn't make public:", makePublicErr);
                    }
                } catch (fbErr) {
                    console.error("Failed to upload to Firebase:", fbErr);
                }
            }
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="Skillizee_Export_${uniqueId.substring(0,8)}.${ext}"`);
            return res.send(outputBuffer);

        } catch (error) {
            console.error("Export error:", error);
            let errorMessage = error.stderr || error.message;
            if (typeof errorMessage === 'string' && errorMessage.includes('\n')) {
                errorMessage = errorMessage.split('\n').slice(-20).join('\n');
            }
            return res.status(500).json({ error: `Export failed:\n${errorMessage}` });
        }

    } catch (error) {
        console.error('Video Export API Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    } finally {
        if (tempVideoPath && !tempVideoPath.startsWith('http')) {
            await unlink(tempVideoPath).catch(() => {});
        }
        if (tempFilterPath) await unlink(tempFilterPath).catch(() => {});
        if (tempOutputPath) await unlink(tempOutputPath).catch(() => {});
        for (const imgPath of downloadedImages) {
            await unlink(imgPath).catch(() => {});
        }
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Cloud Run Backend listening on port ${PORT}`);
});
