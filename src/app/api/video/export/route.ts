import { NextResponse } from 'next/server';
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

function generateAssFile(captions: any[], videoWidth: number, videoHeight: number, preset: string = 'hormozi', userFontSize: number = 48, backgroundBox: string = 'none') {
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
    } else if (preset === 'cinematic') {
        fontName = 'Georgia';
        baseFontSize = Math.round(fontSize * 0.95);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H80000000'; // Pure white text, black outline, shadow
        styleProps = '0,0,1,1,3,2'; // Not bold, Not italic, BorderStyle=1, Outline=1, Shadow=3, Spacing=2
        inactiveColor = '&HCCCCCC&'; // Light grey
        activeColor = '&H37AFD4&'; // Cinematic Gold (BGR)
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
Style: Captions,${fontName},${baseFontSize},${colors},${styleProps},0,2,20,20,${Math.round(videoHeight * 0.1)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    captions.forEach(chunk => {
        const words = chunk.words || [];
        
        if (words.length === 0) {
            const start = formatAssTime(chunk.start);
            const end = formatAssTime(chunk.end);
            ass += `Dialogue: 0,${start},${end},Captions,,0,0,0,,${chunk.text}
`;
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
                            sentence += `{\\fscx115\\fscy115${prefix}}${cw.word}{\\fscx100\\fscy100${suffix}} `;
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
    const tempVideoPath = join(tmpdir(), `${uniqueId}-input.mp4`);
    const tempFilterPath = join(tmpdir(), `${uniqueId}-filter.txt`);
    const tempOutputPath = join(tmpdir(), `${uniqueId}-output.${ext}`);
    
    await writeFile(tempVideoPath, buffer);
    console.log(`Saved temp video to ${tempVideoPath} for export with ratio ${targetWidth}x${targetHeight}`);

    // Dynamic Cropping for 9:16
    let cropXExpr = '(iw-ow)/2'; // Center crop by default
    if (aspectRatio === '9:16' && cameraCuts.length > 0) {
        // Build nested if expressions for crop_x: if(between(t, start, end), crop_x, else)
        let expr = `max(0,min(iw-ow,(iw*${cameraCuts[cameraCuts.length - 1].cx_percent || 0.5})-(ow/2)))`;
        for (let i = cameraCuts.length - 1; i >= 0; i--) {
            const c = cameraCuts[i];
            const cutExpr = `max(0,min(iw-ow,(iw*${c.cx_percent || 0.5})-(ow/2)))`;
            expr = `if(between(t,${c.start},${c.start + c.duration}),${cutExpr},${expr})`;
        }
        cropXExpr = `'${expr}'`;
    } else {
        cropXExpr = `'${cropXExpr}'`;
    }

    let vfStr = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}:${cropXExpr}:0`;

    if (captions.length > 0 && !isAudioOnly) {
        const assContent = generateAssFile(captions, targetWidth, targetHeight, (style as any).preset, (style as any).fontSize, (style as any).backgroundBox);
        await writeFile(tempFilterPath, assContent, 'utf-8');
        const fontsDir = join(process.cwd(), 'public', 'fonts').replace(/\\/g, '/').replace(/:/g, '\\:');
        const safeAssPath = tempFilterPath.replace(/\\/g, '/').replace(/:/g, '\\:');
        vfStr += `,subtitles='${safeAssPath}':fontsdir='${fontsDir}'`;
    }

    const startNum = parseFloat(startTime) || 0;
    const endNum = parseFloat(endTime) || 0;
    const duration = endNum - startNum;

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

    // Build FFMPEG command
    let ffmpegCmd = `"${ffmpegInstaller.path}" -y -ss ${startNum} -t ${duration} -i "${tempVideoPath}"`;
    
    if (!isAudioOnly) {
        ffmpegCmd += ` -vf "${vfStr}" -r ${exportFps} -c:v ${vCodec} ${extraArgs}`;
        if (aCodec) {
            ffmpegCmd += ` -c:a ${aCodec} -b:a 128k`;
        }
    } else {
        ffmpegCmd += ` -vn -c:a ${aCodec} -b:a 192k`;
    }
    
    ffmpegCmd += ` "${tempOutputPath}"`;
    
    console.log("Running FFMPEG:", ffmpegCmd);
    
    try {
        await execPromise(ffmpegCmd, { cwd: tmpdir() });
        console.log("FFMPEG export complete");
        
        // Read the output file
        const outputBuffer = await readFile(tempOutputPath);
        
        // Cleanup
        await unlink(tempVideoPath).catch(()=>{});
        await unlink(tempFilterPath).catch(()=>{});
        await unlink(tempOutputPath).catch(()=>{});
        
        let contentType = 'video/mp4';
        if (ext === 'mov') contentType = 'video/quicktime';
        if (ext === 'webm') contentType = 'video/webm';
        if (ext === 'gif') contentType = 'image/gif';
        if (ext === 'mp3') contentType = 'audio/mpeg';
        if (ext === 'wav') contentType = 'audio/wav';
        if (ext === 'aac') contentType = 'audio/aac';
        
        return new NextResponse(outputBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="Skillizee_Export_${uniqueId.substring(0,8)}.${ext}"`
            }
        });

    } catch (error: any) {
        console.error("Export error:", error);
        
        // Clean up on failure
        await unlink(tempVideoPath).catch(()=>{});
        await unlink(tempFilterPath).catch(()=>{});
        await unlink(tempOutputPath).catch(()=>{});
        
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
  }
}
