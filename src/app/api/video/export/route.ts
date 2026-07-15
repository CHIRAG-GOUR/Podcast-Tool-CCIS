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

function generateAssFile(captions: any[], videoWidth: number, videoHeight: number, preset: string = 'hormozi', userFontSize: number = 48) {
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
    } else if (preset === 'unusual-paper') {
        fontName = 'Ink Free';
        baseFontSize = fontSize;
        colors = '&H00000000,&H000000FF,&H00E6EBF0,&H00000000'; // Black text, light grey-beige box
        styleProps = '-1,0,3,6,0,0'; // BorderStyle=3, Outline=6
        activeColor = '&H0000FF&'; // Pure Red
        inactiveColor = '&H000000&';
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
        fontName = 'Inter';
        baseFontSize = Math.round(fontSize * 0.9);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H80000000';
        styleProps = '-1,0,1,3,0,0'; // Outline=3
        activeColor = '&H0000FF&'; // Red
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
        baseFontSize = Math.round(fontSize * 0.8);
        colors = '&H80FFFFFF,&H000000FF,&H00000000,&H00000000'; 
        styleProps = '0,-1,1,0,4,2'; 
        inactiveColor = '&HFFFFFF&';
        activeColor = '&HFFFFFF&'; 
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
            
            let sentence = "";
            for (let j = 0; j < words.length; j++) {
                const cw = words[j];
                if (j === i) {
                    if (activeScale) {
                        sentence += `{\\fscx115\\fscy115\\c${activeColor}}${cw.word}{\\fscx100\\fscy100\\c${inactiveColor}} `;
                    } else {
                        sentence += `{\\c${activeColor}}${cw.word}{\\c${inactiveColor}} `;
                    }
                } else {
                    sentence += `${cw.word} `;
                }
            }
            ass += `Dialogue: 0,${start},${end},Captions,,0,0,0,,${sentence.trim()}
`;
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
    
    const canvasW = parseFloat(formData.get('canvas_width') as string) || 0;
    const canvasH = parseFloat(formData.get('canvas_height') as string) || 0;

    let targetWidth = 1080;
    let targetHeight = 1920;
    
    if (aspectRatio === '16:9') {
        targetWidth = 1920;
        targetHeight = 1080;
    } else if (aspectRatio === '1:1') {
        targetWidth = 1080;
        targetHeight = 1080;
    } else if (aspectRatio === '4:5') {
        targetWidth = 1080;
        targetHeight = 1350;
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uniqueId = uuidv4();
    const tempVideoPath = join(tmpdir(), `${uniqueId}-input.mp4`);
    const tempFilterPath = join(tmpdir(), `${uniqueId}-filter.txt`);
    const tempOutputPath = join(tmpdir(), `${uniqueId}-output.mp4`);
    
    await writeFile(tempVideoPath, buffer);
    console.log(`Saved temp video to ${tempVideoPath} for export with ratio ${targetWidth}x${targetHeight}`);

    let vfStr = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}`;

    if (captions.length > 0) {
        const assContent = generateAssFile(captions, targetWidth, targetHeight, (style as any).preset, (style as any).fontSize);
        await writeFile(tempFilterPath, assContent, 'utf-8');
        const fontsDir = join(process.cwd(), 'public', 'fonts').replace(/\\/g, '/').replace(/:/g, '\\:');
        const safeAssPath = tempFilterPath.replace(/\\/g, '/').replace(/:/g, '\\:');
        vfStr += `,subtitles='${safeAssPath}':fontsdir='${fontsDir}'`;
    }

    const startNum = parseFloat(startTime) || 0;
    const endNum = parseFloat(endTime) || 0;
    const duration = endNum - startNum;

    // Build FFMPEG command
    const ffmpegCmd = [
        `"${ffmpegInstaller.path}" -y`,
        `-ss ${startNum}`,
        `-t ${duration}`,
        `-i "${tempVideoPath}"`,
        `-vf "${vfStr}"`,
        `-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k`,
        `"${tempOutputPath}"`
    ].join(' ');
    
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
        
        return new NextResponse(outputBuffer, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="Skillizee_Export_${uniqueId.substring(0,8)}.mp4"`
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
