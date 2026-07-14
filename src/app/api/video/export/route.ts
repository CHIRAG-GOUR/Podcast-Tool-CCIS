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

function generateFilterGraph(captions: any[], styleParams: any, videoWidth: number, videoHeight: number, canvasW: number, canvasH: number) {
    // Scale the font size relative to the user's zoom/scale transform.
    // If the canvas is 500px tall and video is 1920px tall, font needs to be scaled up.
    // The relative height ratio is used to make sure font size matches the screen accurately.
    const baseFontSize = styleParams.fontSize || 48;
    const userScale = (styleParams.transform?.scale || 100) / 100;
    
    // Default canvas height if not provided (fallback)
    const cw = canvasW || videoWidth;
    const ch = canvasH || videoHeight;
    const renderScale = videoHeight / ch;

    // Standard YouTube CC styling: Responsive size based on video height (~4.5% of 1080p is 48px)
    const fontSize = Math.round(videoHeight * 0.045);
    
    // Drawtext colors (Classic YouTube CC)
    const fontColor = 'white';
    const boxColor = 'black@0.75';

    // Calculate absolute positions
    // Framer motion x/y are relative to the center in DOM space.
    // We scale them up to FFMPEG space by multiplying by renderScale.
    const domOffsetX = styleParams.transform?.x || 0;
    const domOffsetY = styleParams.transform?.y || 0;
    
    const rawOffsetX = Math.round(domOffsetX * renderScale);
    const rawOffsetY = Math.round(domOffsetY * renderScale);

    // Hard-clamp the offsets so they physically CANNOT push the text off-screen
    // Even if DOM state goes wild, the text stays within the video boundaries.
    const maxOffsetX = (videoWidth / 2) - 50;
    const offsetX = Math.max(Math.min(rawOffsetX, maxOffsetX), -maxOffsetX);
    
    const maxOffsetY = (videoHeight / 2) - 80;
    const offsetY = Math.max(Math.min(rawOffsetY, maxOffsetY), -maxOffsetY);

    let filterStr = `scale=${videoWidth}:${videoHeight}:force_original_aspect_ratio=increase,crop=${videoWidth}:${videoHeight}`;

    // Use an absolute path to a bundled font for Vercel support
    // Download a font like 'Inter-Bold.ttf' and place it in 'public/fonts/'
    const fontPath = join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf').replace(/\\/g, '/').replace(/:/g, '\\:');

    captions.forEach(cap => {
        // FFMPEG filtergraphs split on commas and colons.
        // We replace single quotes with smart quotes to avoid FFMPEG quoting hell.
        // Aggressively strip trailing spaces that can corrupt FFMPEG text_w calculations
        let safeText = cap.text
            .replace(/\s+$/g, '')
            .replace(/^\s+/g, '')
            .replace(/'/g, "\u2019")
            .replace(/:/g, "\\:")
            .replace(/,/g, "\\,")
            .replace(/\n/g, ' ');
            
        // Wrap text at ~45 characters (Standard YouTube CC width)
        safeText = wrapText(safeText, 45);
            
        // Force FFMPEG to always center exactly, and perfectly place at bottom 8% safe area
        filterStr += `,\ndrawtext=fontfile='${fontPath}':text='${safeText}':enable='between(t\\,${cap.start}\\,${cap.end})':fontsize=${fontSize}:fontcolor=${fontColor}:shadowcolor=black@0.9:shadowx=2:shadowy=2:box=1:boxcolor=${boxColor}:boxborderw=8:x=(${videoWidth}-text_w)/2:y=${videoHeight}-text_h-(${videoHeight}*0.08)`;
    });

    return filterStr;
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

    const filterContent = generateFilterGraph(captions, style, targetWidth, targetHeight, canvasW, canvasH);
    await writeFile(tempFilterPath, filterContent, 'utf-8');

    const startNum = parseFloat(startTime) || 0;
    const endNum = parseFloat(endTime) || 0;
    const duration = endNum - startNum;

    // Build FFMPEG command
    // Use the absolute path tempFilterPath for the filter_complex_script so ffmpeg doesn't fail.
    const ffmpegCmd = [
        `"${ffmpegInstaller.path}" -y`,
        `-ss ${startNum}`,
        `-t ${duration}`,
        `-i "${tempVideoPath}"`,
        `-filter_complex_script "${tempFilterPath}"`,
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
