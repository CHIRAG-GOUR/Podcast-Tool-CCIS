import sys
import re

file_path = r'e:\1. Skillizee\Podcast Tool\src\components\video-studio\StudioView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the preset buttons with a grid of 10 presets
preset_ui_target = r'<div className="grid grid-cols-2 gap-2">\s*<button\s*onClick=\{\(\) => updateActiveClipStyle\(\{ preset: \'dark\' \}\)\}\s*className=\{cn\("p-2 text-xs rounded border text-center transition-colors font-bold", activeClip\.style\.preset === \'dark\' \|\| !activeClip\.style\.preset \? "bg-black text-white border-white" : "bg-gray-100 text-gray-500 border-gray-300"\)\}\s*>\s*Dark \(YouTube\)\s*</button>\s*<button\s*onClick=\{\(\) => updateActiveClipStyle\(\{ preset: \'light\' \}\)\}\s*className=\{cn\("p-2 text-xs rounded border text-center transition-colors font-bold", activeClip\.style\.preset === \'light\' \? "bg-white text-black border-black" : "bg-gray-800 text-gray-400 border-gray-700"\)\}\s*>\s*Light\s*</button>\s*</div>'

presets_html = """
<div className="grid grid-cols-2 gap-2">
    {[
        { id: 'hormozi', name: 'Captions.ai (Hormozi)' },
        { id: 'beast', name: 'MrBeast' },
        { id: 'youtube', name: 'YouTube CC' },
        { id: 'tiktok', name: 'TikTok Default' },
        { id: 'netflix', name: 'Netflix' },
        { id: 'ali', name: 'Ali Abdaal' },
        { id: 'neon', name: 'Neon Glow' },
        { id: 'minimalist', name: 'Minimalist' },
        { id: 'typewriter', name: 'Terminal' },
        { id: 'cinematic', name: 'Cinematic' }
    ].map(preset => (
        <button 
            key={preset.id}
            onClick={() => updateActiveClipStyle({ preset: preset.id })}
            className={cn(
                "p-2 text-[10px] rounded border text-center transition-colors font-bold truncate",
                (activeClip.style.preset === preset.id || (!activeClip.style.preset && preset.id === 'hormozi')) 
                    ? "bg-[#6366F1] text-white border-[#6366F1]" 
                    : (theme === 'dark' ? "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700" : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200")
            )}
        >
            {preset.name}
        </button>
    ))}
</div>
"""

content = re.sub(preset_ui_target, presets_html, content)

# Now update the preview rendering logic
preview_rendering_target = r'<div\s+style=\{\{\s+fontFamily: clip\.style\?\.fontFamily \|\| \'Inter\',\s+fontSize: \'clamp\(24px, 4vw, 48px\)\',\s+fontWeight: 800,\s+color: \'white\',\s+textAlign: \'center\',\s+whiteSpace: \'pre-wrap\',\s+maxWidth: \'90%\',\s+display: \'flex\',\s+alignItems: \'center\',\s+justifyContent: \'center\',\s+padding: \'10px\',\s+opacity: isVisible \? 1 : \(isSelected \? 0\.5 : 0\),\s+textShadow: \'0px 4px 12px rgba\(0,0,0,0\.8\), 0px 2px 4px rgba\(0,0,0,1\)\',\s+lineHeight: \'1\.2\'\s+\}\}\s*>\s*\{activeChunk && activeChunk\.words && activeChunk\.words\.length > 0 \? \(\s*<div>\s*\{activeChunk\.words\.map\(\(w: any, idx: number\) => \{\s*const isActiveWord = currentTime >= w\.start && currentTime <= w\.end;\s*return \(\s*<span key=\{idx\} style=\{\{ color: isActiveWord \? \'#FFD700\' : \'white\', transition: \'color 0\.1s\' \}\}>\s*\{w\.word\}\{\' \'\}\s*</span>\s*\);\s*\}\)\}\s*</div>\s*\) : \(\s*displayText \|\| \(isSelected \? "\(Silence\)" : ""\)\s*\)\}\s*</div>'

# We'll use a dynamic component for the rendering based on preset
preview_logic_html = """
                        {(() => {
                            const preset = clip.style?.preset || 'hormozi';
                            
                            // Base text styles mapped from preset
                            let baseStyle: React.CSSProperties = {
                                fontFamily: clip.style?.fontFamily || 'Inter',
                                textAlign: 'center',
                                whiteSpace: 'pre-wrap',
                                maxWidth: '90%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '10px',
                                opacity: isVisible ? 1 : (isSelected ? 0.5 : 0),
                                lineHeight: '1.2'
                            };

                            let activeColor = '#FFD700'; // Default Yellow
                            let inactiveColor = 'white';
                            let activeScale = 1.1;

                            if (preset === 'hormozi') {
                                baseStyle.fontSize = 'clamp(24px, 4vw, 48px)';
                                baseStyle.fontWeight = 900;
                                baseStyle.textShadow = '0px 4px 12px rgba(0,0,0,0.8), 0px 2px 4px rgba(0,0,0,1)';
                                baseStyle.textTransform = 'uppercase';
                                activeColor = '#FFD700'; // Yellow
                            } else if (preset === 'beast') {
                                baseStyle.fontFamily = 'Impact, sans-serif';
                                baseStyle.fontSize = 'clamp(28px, 5vw, 54px)';
                                baseStyle.fontWeight = 900;
                                baseStyle.WebkitTextStroke = '2px black';
                                baseStyle.textShadow = '4px 4px 0px black';
                                baseStyle.textTransform = 'uppercase';
                                baseStyle.fontStyle = 'italic';
                                activeColor = '#00FFFF'; // Cyan
                            } else if (preset === 'youtube') {
                                baseStyle.fontSize = 'clamp(16px, 2.5vw, 24px)';
                                baseStyle.fontWeight = 600;
                                baseStyle.backgroundColor = 'rgba(0,0,0,0.75)';
                                baseStyle.borderRadius = '4px';
                                baseStyle.padding = '4px 12px';
                                activeColor = 'white';
                                inactiveColor = 'white';
                                activeScale = 1;
                            } else if (preset === 'tiktok') {
                                baseStyle.fontSize = 'clamp(22px, 3.5vw, 42px)';
                                baseStyle.fontWeight = 800;
                                baseStyle.WebkitTextStroke = '1.5px black';
                                baseStyle.textShadow = '1px 1px 2px black';
                                activeColor = '#FF0050'; // TikTok Red
                            } else if (preset === 'netflix') {
                                baseStyle.fontSize = 'clamp(20px, 3vw, 36px)';
                                baseStyle.fontWeight = 600;
                                baseStyle.textShadow = '0px 2px 4px rgba(0,0,0,0.8)';
                                inactiveColor = '#FFD700'; // Yellow text
                                activeColor = '#FFD700';
                                activeScale = 1;
                            } else if (preset === 'ali') {
                                baseStyle.fontSize = 'clamp(22px, 3.5vw, 40px)';
                                baseStyle.fontWeight = 700;
                                baseStyle.textShadow = '0px 2px 8px rgba(0,0,0,0.5)';
                                activeColor = '#FF7A00'; // Orange
                            } else if (preset === 'neon') {
                                baseStyle.fontSize = 'clamp(24px, 4vw, 48px)';
                                baseStyle.fontWeight = 800;
                                baseStyle.fontStyle = 'italic';
                                baseStyle.textShadow = '0 0 10px #ff00ff, 0 0 20px #ff00ff';
                                inactiveColor = '#ffffff';
                                activeColor = '#00ffff'; // Cyan active
                            } else if (preset === 'minimalist') {
                                baseStyle.fontSize = 'clamp(24px, 4vw, 48px)';
                                baseStyle.fontWeight = 300;
                                inactiveColor = '#9CA3AF'; // Gray
                                activeColor = '#111827'; // Black
                                if (theme === 'dark') activeColor = '#ffffff';
                            } else if (preset === 'typewriter') {
                                baseStyle.fontFamily = 'monospace';
                                baseStyle.fontSize = 'clamp(18px, 3vw, 32px)';
                                baseStyle.backgroundColor = 'rgba(0,0,0,0.9)';
                                baseStyle.border = '1px solid #22c55e';
                                baseStyle.padding = '8px 16px';
                                inactiveColor = '#166534';
                                activeColor = '#22c55e';
                                activeScale = 1;
                            } else if (preset === 'cinematic') {
                                baseStyle.fontFamily = 'Georgia, serif';
                                baseStyle.fontSize = 'clamp(18px, 3vw, 32px)';
                                baseStyle.fontWeight = 400;
                                baseStyle.fontStyle = 'italic';
                                baseStyle.letterSpacing = '2px';
                                baseStyle.textShadow = '0px 2px 8px rgba(0,0,0,0.8)';
                                inactiveColor = 'rgba(255,255,255,0.5)';
                                activeColor = 'white';
                                activeScale = 1;
                            }

                            return (
                                <div style={baseStyle}>
                                    {activeChunk && activeChunk.words && activeChunk.words.length > 0 ? (
                                        <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                                            {activeChunk.words.map((w: any, idx: number) => {
                                                const isActiveWord = currentTime >= w.start && currentTime <= w.end;
                                                return (
                                                    <span key={idx} style={{ 
                                                        color: isActiveWord ? activeColor : inactiveColor, 
                                                        transform: isActiveWord ? `scale(${activeScale})` : 'scale(1)',
                                                        display: 'inline-block',
                                                        transition: 'all 0.1s ease-in-out',
                                                        WebkitTextStroke: isActiveWord && preset === 'tiktok' ? '1.5px black' : baseStyle.WebkitTextStroke
                                                    }}>
                                                        {w.word}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        displayText || (isSelected ? "(Silence)" : "")
                                    )}
                                </div>
                            );
                        })()}
"""

content = re.sub(preview_rendering_target, preview_logic_html, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated StudioView.tsx")
