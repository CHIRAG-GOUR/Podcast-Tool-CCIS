import sys
import re

file_path = r'e:\1. Skillizee\Podcast Tool\src\app\api\video\export\route.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace generateAssFile
generate_ass_pattern = r'function generateAssFile\(captions: any\[\], videoWidth: number, videoHeight: number\).*?return ass;\s*\}'

new_generate_ass = """function generateAssFile(captions: any[], videoWidth: number, videoHeight: number, preset: string = 'hormozi') {
    const fontSize = Math.round(videoHeight * 0.05);
    
    let fontName = 'Inter';
    let baseFontSize = fontSize;
    // Format: Primary, Secondary, Outline, Back
    let colors = '&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000';
    // Format: Bold, Italic, BorderStyle, Outline, Shadow, Spacing
    let styleProps = '-1,0,1,0,8,0';
    
    let activeColor = '&H0000FFFF&'; // Yellow BGR
    let inactiveColor = '&H00FFFFFF&'; // White BGR
    let activeScale = false;

    if (preset === 'hormozi') {
        baseFontSize = fontSize;
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H80000000';
        styleProps = '-1,0,1,0,8,0'; // Shadow=8
        activeColor = '&H0000FFFF&';
        activeScale = true;
    } else if (preset === 'beast') {
        fontName = 'Impact';
        baseFontSize = Math.round(fontSize * 1.2);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H80000000';
        styleProps = '-1,-1,1,6,4,0'; // Outline=6, Shadow=4, Italic=-1
        activeColor = '&H00FFFF00&'; // Cyan
        activeScale = true;
    } else if (preset === 'youtube') {
        fontName = 'Arial';
        baseFontSize = Math.round(fontSize * 0.6);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&HB3000000';
        styleProps = '-1,0,3,0,0,0'; // BorderStyle=3 (Opaque box)
        activeColor = '&H00FFFFFF&';
        inactiveColor = '&H00FFFFFF&';
    } else if (preset === 'tiktok') {
        fontName = 'Inter';
        baseFontSize = Math.round(fontSize * 0.9);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H80000000';
        styleProps = '-1,0,1,3,0,0'; // Outline=3
        activeColor = '&H000000FF&'; // Red
    } else if (preset === 'netflix') {
        fontName = 'Arial';
        baseFontSize = Math.round(fontSize * 0.8);
        colors = '&H0000FFFF,&H000000FF,&H00000000,&H00000000';
        styleProps = '-1,0,1,0,2,0'; // Shadow=2
        activeColor = '&H0000FFFF&';
        inactiveColor = '&H0000FFFF&';
    } else if (preset === 'ali') {
        fontName = 'Inter';
        baseFontSize = Math.round(fontSize * 0.9);
        colors = '&H00FFFFFF,&H000000FF,&H00000000,&H00000000';
        styleProps = '-1,0,1,0,5,0'; // Shadow=5
        activeColor = '&H0000A5FF&'; // Orange
        activeScale = true;
    } else if (preset === 'neon') {
        fontName = 'Inter';
        baseFontSize = fontSize;
        colors = '&H00FFFFFF,&H000000FF,&H00FF00FF,&H00000000';
        styleProps = '-1,-1,1,5,0,0'; // Magenta Outline
        activeColor = '&H00FFFF00&'; // Cyan
    } else if (preset === 'minimalist') {
        fontName = 'Inter';
        baseFontSize = fontSize;
        colors = '&H00D3D3D3,&H000000FF,&H00000000,&H00000000';
        styleProps = '0,0,1,0,0,0'; // No bold, No shadow
        inactiveColor = '&H00D3D3D3&'; // LightGray
        activeColor = '&H00000000&'; // Black
    } else if (preset === 'typewriter') {
        fontName = 'Courier New';
        baseFontSize = Math.round(fontSize * 0.7);
        colors = '&H00346516,&H000000FF,&H00000000,&HB3000000';
        styleProps = '-1,0,3,1,0,0';
        inactiveColor = '&H00346516&';
        activeColor = '&H005EC522&';
    } else if (preset === 'cinematic') {
        fontName = 'Georgia';
        baseFontSize = Math.round(fontSize * 0.8);
        colors = '&H80FFFFFF,&H000000FF,&H00000000,&H00000000'; // Semi-transparent white
        styleProps = '0,-1,1,0,4,2'; // Shadow=4, Spacing=2, Italic=-1
        inactiveColor = '&H80FFFFFF&';
        activeColor = '&H00FFFFFF&'; // Solid white
    }
    
    let ass = `[Script Info]\\nScriptType: v4.00+\\nPlayResX: ${videoWidth}\\nPlayResY: ${videoHeight}\\n\\n[V4+ Styles]\\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Spacing, Angle, Alignment, MarginL, MarginR, MarginV, Encoding\\nStyle: Captions,${fontName},${baseFontSize},${colors},${styleProps},0,5,20,20,0,1\\n\\n[Events]\\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\\n`;

    captions.forEach(chunk => {
        const words = chunk.words || [];
        
        if (words.length === 0) {
            const start = formatAssTime(chunk.start);
            const end = formatAssTime(chunk.end);
            ass += `Dialogue: 0,${start},${end},Captions,,0,0,0,,${chunk.text}\\n`;
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
                        sentence += `{\\\\fscx115\\\\fscy115\\\\c${activeColor}}${cw.word}{\\\\fscx100\\\\fscy100\\\\c${inactiveColor}} `;
                    } else {
                        sentence += `{\\\\c${activeColor}}${cw.word}{\\\\c${inactiveColor}} `;
                    }
                } else {
                    sentence += `${cw.word} `;
                }
            }
            ass += `Dialogue: 0,${start},${end},Captions,,0,0,0,,${sentence.trim()}\\n`;
        }
    });

    return ass;
}"""

content = re.sub(generate_ass_pattern, new_generate_ass, content, flags=re.DOTALL)

# Update the call to pass preset
target_call = r'const assContent = generateAssFile\(captions, targetWidth, targetHeight\);'
new_call = "const assContent = generateAssFile(captions, targetWidth, targetHeight, style.preset || 'hormozi');"
content = content.replace(target_call, new_call)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated export/route.ts")
