import { NextResponse } from 'next/server';
import { storage, db } from '@/lib/firebase-admin';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import util from 'util';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const execPromise = util.promisify(exec);

export const maxDuration = 300; 

// Helper function to wrap long sentences into multiple lines for FFMPEG
function wrapText(text: string, maxChars: number) {
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

function formatAssTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const cs = Math.floor((seconds % 1) * 100);
    return `${h}:${m.toString().padStart(2, '0')}:${Math.floor(s).toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

function generateAssFile(captions: any[], videoWidth: number, videoHeight: number, preset: string = 'hormozi', userFontSize: number = 48, backgroundBox: string = 'none', bouncyText: boolean = false) {
    const fontSize = userFontSize || 48;
    
    let fontName = 'Inter';
    let baseFontSize = fontSize;
    // Format: Primary, Secondary, Outline, Back
    let colors = '&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000';
    // Format: Bold, Italic, BorderStyle, Outline, Shadow, Spacing
    let styleProps = '-1,0,1,0,8,0';
    
    let activeColor = '&H00FFFF&'; // Yellow BGR
    let inactiveColor = '&HFFFFFF&'; // White BGR
    let activeScale = false;
    let activeColorList: string[] | null = null;
    let activeExtraTags = '';
    let inactiveExtraTags = '';

    if (preset === 'hormozi' || preset === 'opus') {
        fontName = 'Montserrat';
        baseFontSize = fontSize;
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H80000000';
        styleProps = '-1,0,1,3,10,0'; // Outline=3, Shadow=10
        activeColor = '&H00FFFF&'; // Bright Yellow
        inactiveColor = '&HFFFFFF&';
        activeScale = true;
    } else if (preset === 'modern-clean') {
        fontName = 'Inter';
        baseFontSize = Math.round(fontSize * 0.8);
        colors = '&H00000000,&H000000FF,&H00FFFFFF,&H00000000'; // Black text, White background box
        styleProps = '0,0,3,4,0,0'; // BorderStyle=3 (Opaque box), Outline=4 for padding
        activeColor = '&HF6823B&'; // Blue highlight
        inactiveColor = '&H000000&'; // Black
    } else if (preset === 'paper-cut') {
        fontName = 'Segoe Print';
        baseFontSize = fontSize;
        colors = '&H00111111,&H000000FF,&H00DDF0F6,&H00000000'; // Black text, Beige paper background box
        styleProps = '-1,0,3,6,2,0'; // BorderStyle=3, Outline=6
        activeColor = '&H0000FF&'; // Pure Red
        inactiveColor = '&H111111&';
        activeScale = true;
    } else if (preset === 'beast') {
        fontName = 'Impact';
        baseFontSize = Math.round(fontSize * 1.2);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H80000000';
        styleProps = '-1,-1,1,6,4,0'; // Outline=6, Shadow=4, Italic=-1
        activeColor = '&HFFFF00&'; // Cyan
        activeScale = true;
    } else if (preset === 'youtube') {
        fontName = 'Arial';
        baseFontSize = Math.round(fontSize * 0.6);
        colors = '&H00FFFFFF,&H000000FF,&H80000000,&H00000000'; // White text, transparent black box
        styleProps = '-1,0,3,4,0,0'; 
        activeColor = '&HFFFFFF&';
        inactiveColor = '&HFFFFFF&';
    } else if (preset === 'tiktok') {
        fontName = 'Montserrat';
        baseFontSize = Math.round(fontSize * 1.0);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H80000000'; // White text, black outline
        styleProps = '-1,0,1,5,1,0'; // Bold, Outline=5, Shadow=1
        activeColor = '&H00FFFF&'; // Fallback
        activeColorList = ['&HFFFF00&', '&H00FFFF&', '&H00FF00&', '&H0000FF&']; // Cyan, Yellow, Green, Red
        inactiveColor = '&HFFFFFF&'; // White
        activeScale = true; // TikTok captions bounce
    } else if (preset === 'netflix') {
        fontName = 'Arial';
        baseFontSize = Math.round(fontSize * 0.8);
        colors = '&H0000FFFF,&H000000FF,&H00000000,&H00000000';
        styleProps = '-1,0,1,0,2,0'; // Shadow=2
        activeColor = '&H00FFFF&';
        inactiveColor = '&H00FFFF&';
    } else if (preset === 'ali') {
        fontName = 'Inter';
        baseFontSize = Math.round(fontSize * 0.9);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H00000000';
        styleProps = '-1,0,1,0,5,0'; // Shadow=5
        activeColor = '&H00A5FF&'; // Orange
        activeScale = true;
    } else if (preset === 'neon') {
        fontName = 'Inter';
        baseFontSize = fontSize;
        colors = '&H00FFFFFF,&H000000FF,&H00FF00FF,&H00000000';
        styleProps = '-1,-1,1,5,0,0'; // Magenta Outline
        activeColor = '&HFFFF00&'; // Cyan
    } else if (preset === 'minimalist') {
        fontName = 'Inter';
        baseFontSize = fontSize;
        colors = '&H00D3D3D3,&H000000FF,&H00000000,&H00000000';
        styleProps = '0,0,1,0,0,0'; // No bold, No shadow
        inactiveColor = '&HD3D3D3&'; // LightGray
        activeColor = '&H000000&'; // Black
    } else if (preset === 'cinematic-bold' || preset === 'cinematic') {
        fontName = 'Montserrat';
        baseFontSize = Math.round(fontSize * 1.2);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H80000000'; // Pure white text, black outline, shadow
        styleProps = '-1,0,1,1,3,2'; // Bold, Not italic, BorderStyle=1, Outline=1, Shadow=3, Spacing=2
        inactiveColor = '&HFEE8E8&'; // Light blue hint (BGR)
        activeColor = '&HFFFFFF&'; 
    } else if (preset === 'cinematic-elegant') {
        fontName = 'Playfair Display';
        baseFontSize = Math.round(fontSize * 1.1);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H90000000'; 
        styleProps = '0,0,1,0,3,4'; // Outline=0, Shadow=3, Spacing=4
        inactiveColor = '&HCCCCCC&';
        activeColor = '&HFFFFFF&';
    } else if (preset === 'cinematic-condensed') {
        fontName = 'Bebas Neue';
        baseFontSize = Math.round(fontSize * 1.4);
        colors = '&H00008CFF,&H000000FF,&H00000000,&H90000000'; // DarkOrange BGR
        styleProps = '0,0,1,0,4,1'; // Shadow=4, Spacing=1
        inactiveColor = '&H0045FF&'; // OrangeRed BGR
        activeColor = '&H008CFF&'; // DarkOrange BGR
    } else if (preset === 'skillizee') {
        fontName = 'Inter';
        baseFontSize = fontSize;
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H00000000'; // White text, black outline
        styleProps = '-1,0,1,3,0,0'; // Bold, Outline=3
        inactiveColor = '&HFFFFFF&'; // White
        activeColor = '&HEB6325&'; // Skillizee Blue (#2563EB -> BGR: EB6325)
        activeExtraTags = '\\u1'; // Yellow underline
        inactiveExtraTags = '\\u0'; // No underline
    }
    
    if (backgroundBox && backgroundBox !== 'none') {
        const styleParts = styleProps.split(',');
        styleParts[2] = '3'; // BorderStyle = 3 (Opaque box)
        styleParts[3] = '6'; // Outline = 6 (Padding)
        styleProps = styleParts.join(',');
        
        const colorParts = colors.split(',');
        if (backgroundBox === 'white') {
            colorParts[2] = '&H00FFFFFF&'; // White box
        } else if (backgroundBox === 'black') {
            colorParts[2] = '&H00000000&'; // Black box
        } else if (backgroundBox === 'blur') {
            colorParts[2] = '&H80808080&'; // Semi-transparent Gray
        } else if (backgroundBox === 'dark-blur') {
            colorParts[2] = '&H80000000&'; // Semi-transparent Black
        } else if (backgroundBox === 'white-blur') {
            colorParts[2] = '&H90FFFFFF&'; // Semi-transparent White
        }
        colors = colorParts.join(',');
    }

    // IMPORTANT: Alignment is 2 (Bottom-Center). MarginV pushes it up from the bottom.
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
            words = textWords.map((w: string, idx: number) => ({
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
                // Layer 0: Yellow Text with Underline (will be covered by Layer 1, leaving only underline visible)
                let sentenceL0 = "{\\4a&HFF&}"; // Make Layer 0's background box completely transparent
                for (let j = 0; j < words.length; j++) {
                    const cw = words[j];
                    if (j === i) {
                        sentenceL0 += `{\\1a&H00&\\3a&H00&\\c&H00FFFF&\\u1}${cw.word}{\\u0} `;
                    } else {
                        sentenceL0 += `{\\1a&HFF&\\3a&HFF&}${cw.word} `; // Invisible placeholder for inactive words
                    }
                }
                ass += `Dialogue: 0,${start},${end},Captions,,0,0,0,,${sentenceL0.trim()}\n`;

                // Layer 1: Blue Text WITHOUT Underline
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

export async function POST(req: Request) {
  let tempVideoPath = '';
  let tempFilterPath = '';
  let tempOutputPath = '';
  const downloadedImages: string[] = [];
  try {
    const formData = await req.formData();
    const file = formData.get('video') as File;
    const startTime = formData.get('start_time') as string;
    const endTime = formData.get('end_time') as string;
    const aspectRatio = formData.get('aspect_ratio') as string || '9:16';
    const captionsRaw = formData.get('captions') as string;
    
    const exportFormat = formData.get('export_format') as string || 'mp4';
    const exportRes = formData.get('export_res') as string || '1080p';
    const exportFps = formData.get('export_fps') as string || '30';
    const exportCodec = formData.get('export_codec') as string || 'h264';
    
    const viralRemoveSilence = formData.get('viral_remove_silence') === 'true';
    const viralSoundDesign = formData.get('viral_sound_design') === 'true';
    const viralBouncyText = formData.get('viral_bouncy_text') === 'true';
    
    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
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
    
    const cameraCutsRaw = formData.get('cameraCuts') as string;
    let cameraCuts: any[] = [];
    if (cameraCutsRaw) {
        try {
            cameraCuts = JSON.parse(cameraCutsRaw);
        } catch(e) {}
    }
    
    const projectClipsRaw = formData.get('projectClips') as string;
    let projectClips: any[] = [];
    if (projectClipsRaw) {
        try {
            projectClips = JSON.parse(projectClipsRaw);
        } catch(e) {}
    }
    
    const canvasW = parseFloat(formData.get('canvas_width') as string) || 0;
    const canvasH = parseFloat(formData.get('canvas_height') as string) || 0;

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const isAudioOnly = ['mp3', 'wav', 'aac'].includes(exportFormat);
    let ext = exportFormat;
    if (exportFormat === 'png_seq') ext = 'mp4'; // Fallback for unsupported complex sequence output
    
    const uniqueId = uuidv4();
    tempVideoPath = join(tmpdir(), `${uniqueId}-input.mp4`);
    tempFilterPath = join(tmpdir(), `${uniqueId}-filter.txt`);
    tempOutputPath = join(tmpdir(), `${uniqueId}-output.${ext}`);
    
    await writeFile(tempVideoPath, buffer);
    console.log(`Saved temp video to ${tempVideoPath} for export with ratio ${targetWidth}x${targetHeight}`);

    const startNum = parseFloat(startTime) || 0;
    const endNum = parseFloat(endTime) || 0;
    const duration = endNum > 0 ? (endNum - startNum) : 999999;

    // Camera cuts and captions are already shifted relative to timeline offset by the frontend
    const shiftedCameraCuts = cameraCuts || [];
    const shiftedCaptions = captions || [];

    // Dynamic Cropping for 9:16
    let cropXExpr = '(iw-ow)/2'; // Center crop by default
    if (aspectRatio === '9:16' && shiftedCameraCuts.length > 0) {
        // Build nested if expressions for crop_x: if(between(t, start, end), crop_x, else)
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
        const assContent = generateAssFile(shiftedCaptions, targetWidth, targetHeight, (style as any).preset, (style as any).fontSize, (style as any).backgroundBox, viralBouncyText);
        await writeFile(tempFilterPath, assContent, 'utf-8');
        const fontsDir = join(process.cwd(), 'public', 'fonts').replace(/\\/g, '/').replace(/:/g, '\\:');
        const safeAssPath = tempFilterPath.replace(/\\/g, '/').replace(/:/g, '\\:');
        vfStr += `,subtitles='${safeAssPath}':fontsdir='${fontsDir}'`;
    }

    let afStr = '';
    if (viralRemoveSilence && shiftedCaptions.length > 0) {
        let segments: any[] = [];
        shiftedCaptions.forEach((chunk: any) => {
            if (chunk.words) {
                chunk.words.forEach((w: any) => {
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
                
                // If gap is less than 0.4s, merge them to avoid choppy audio
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

    // FFMPEG Codec Selection
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
        // Generate a subtle cinematic bass rumble (brown noise) with volume spikes on camera cuts/b-roll
        audioInputs = ` -f lavfi -i "anoisesrc=color=brown:amplitude=1.0"`;
        
        // Build volume equation: base rumble (0.02) + spikes
        let volEq = '0.02';
        
        // Impact at the very beginning
        volEq += ` + 0.8*exp(-((t-0.1)^2)/0.02)`;
        
        if (shiftedCameraCuts && shiftedCameraCuts.length > 0) {
            shiftedCameraCuts.forEach((c: any) => {
                if (c.start > 0.5) volEq += ` + 0.5*exp(-((t-${c.start.toFixed(2)})^2)/0.01)`;
            });
        }
        
        // B-Roll overlays
        const overlays = projectClips?.filter((c: any) => c.trackId === 'v4' && c.type === 'image') || [];
        overlays.forEach((o: any) => {
            if (o.start > 0.5) volEq += ` + 0.6*exp(-((t-${o.start.toFixed(2)})^2)/0.015)`;
        });

        // Filter: lowpass for cinematic muffled feel, then dynamic volume
        const sfxChain = `lowpass=f=800,volume='${volEq}':eval=frame[sfx]`;
        
        if (afStr) {
            afStr = `[0:a]${afStr}[a0];[1:a]${sfxChain};[a0][sfx]amix=inputs=2:duration=first:dropout_transition=2:weights=1 0.8`;
        } else {
            afStr = `[0:a]volume=1.0[a0];[1:a]${sfxChain};[a0][sfx]amix=inputs=2:duration=first:dropout_transition=2:weights=1 0.8`;
        }
    }

    // Download B-roll overlays
    const allOverlays = projectClips?.filter((c: any) => c.trackId === 'v4' && c.type === 'image') || [];
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
                brollInputs += ` -i "${imgPath.replace(/\\/g, '/').replace(/:/g, '\\:')}"`;
            } catch (err) {
                console.error("Failed to download B-roll", err);
            }
        }
    }
    
    // Adjust audio input index if viralSoundDesign is present
    if (viralSoundDesign && overlays.length > 0) {
        const newAudioIdx = 1 + overlays.length;
        afStr = afStr.replace('[1:a]', `[${newAudioIdx}:a]`);
    }

    // Build FFMPEG command
    let ffmpegCmd = `"${ffmpegInstaller.path}" -y -ss ${startNum} -t ${duration} -i "${tempVideoPath}"${brollInputs}${audioInputs}`;
    
    if (!isAudioOnly) {
        if (viralSoundDesign || (afStr && afStr.includes('[a0]')) || overlays.length > 0) {
            // Complex filtergraph required
            let complexFilter = `[0:v]${vfStr}[vbase];`;
            let currentV = 'vbase';
            
            // Apply b-roll overlays
            for (let i = 0; i < downloadedImages.length; i++) {
                const overlay = overlays[i];
                const inputIdx = i + 1; // 1-indexed for broll inputs
                const nextV = `v${i}`;
                const start = overlay.start - startNum;
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
            // Simple filters
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
        
        // Read the output file
        const outputBuffer = await readFile(tempOutputPath);
        
        let contentType = 'video/mp4';
        if (ext === 'mov') contentType = 'video/quicktime';
        if (ext === 'webm') contentType = 'video/webm';
        if (ext === 'gif') contentType = 'image/gif';
        if (ext === 'mp3') contentType = 'audio/mpeg';
        if (ext === 'wav') contentType = 'audio/wav';
        if (ext === 'aac') contentType = 'audio/aac';
        
        // Save to Firebase Storage
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
                
                // Optionally save a record to Firestore
                await db.collection('exported_videos').add({
                    fileName: firebaseFileName,
                    publicUrl: publicUrl,
                    createdAt: new Date(),
                    format: ext,
                    contentType: contentType
                });
            } catch (makePublicErr) {
                console.log("Uploaded, but couldn't make public (or saving metadata failed):", makePublicErr);
            }
        } catch (fbErr) {
            console.error("Failed to upload to Firebase:", fbErr);
            // We don't throw here to still allow the user to download it
        }
        
        return new NextResponse(outputBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="Skillizee_Export_${uniqueId.substring(0,8)}.${ext}"`
            }
        });

    } catch (error: any) {
        console.error("Export error:", error);
        
        let errorMessage = error.stderr || error.message;
        if (typeof errorMessage === 'string' && errorMessage.includes('\n')) {
            // FFMPEG errors are always at the bottom of stderr
            errorMessage = errorMessage.split('\n').slice(-20).join('\n');
        }
        return NextResponse.json({ error: `Export failed:\n${errorMessage}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Video Export API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  } finally {
    if (tempVideoPath) await unlink(tempVideoPath).catch(() => {});
    if (tempFilterPath) await unlink(tempFilterPath).catch(() => {});
    if (tempOutputPath) await unlink(tempOutputPath).catch(() => {});
    for (const imgPath of downloadedImages) {
        await unlink(imgPath).catch(() => {});
    }
  }
}
