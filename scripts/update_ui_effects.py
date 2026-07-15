import sys
import re

# 1. Update StudioView.tsx
studio_path = r'e:\1. Skillizee\Podcast Tool\src\components\video-studio\StudioView.tsx'
with open(studio_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the presets list to add the new ones
preset_list_pattern = r'const preset = clip\.style\?\.preset \|\| \'hormozi\';.*?let activeColor = \'#FFD700\'; // Default Yellow.*?if \(preset === \'hormozi\'\) \{.*\}'
ui_replacement = """                            const preset = clip.style?.preset || 'hormozi';
                            const baseFontSize = clip.style?.fontSize || 48;
                            
                            let baseStyle: React.CSSProperties = {
                                fontFamily: clip.style?.fontFamily || 'Inter, sans-serif',
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

                            if (preset === 'hormozi' || preset === 'opus') {
                                baseStyle.fontFamily = 'Montserrat, Impact, sans-serif';
                                baseStyle.fontSize = `${baseFontSize}px`;
                                baseStyle.fontWeight = 900;
                                baseStyle.WebkitTextStroke = '3px black';
                                baseStyle.textShadow = '0px 4px 15px rgba(0,0,0,0.9), 0px 2px 5px rgba(0,0,0,1)';
                                baseStyle.textTransform = 'uppercase';
                                activeColor = '#FFF000'; // Super bright yellow
                                inactiveColor = 'white';
                                activeScale = 1.15; // Pronounced bounce
                            } else if (preset === 'beast') {
                                baseStyle.fontFamily = 'Impact, sans-serif';
                                baseStyle.fontSize = `${Math.round(baseFontSize * 1.2)}px`;
                                baseStyle.fontWeight = 900;
                                baseStyle.WebkitTextStroke = '2px black';
                                baseStyle.textShadow = '4px 4px 0px black';
                                baseStyle.textTransform = 'uppercase';
                                baseStyle.fontStyle = 'italic';
                                activeColor = '#00FFFF'; // Cyan
                            } else if (preset === 'modern-clean') {
                                baseStyle.fontFamily = 'Inter, sans-serif';
                                baseStyle.fontSize = `${Math.round(baseFontSize * 0.8)}px`;
                                baseStyle.fontWeight = 500;
                                baseStyle.backgroundColor = 'white';
                                baseStyle.color = 'black';
                                baseStyle.padding = '8px 24px';
                                baseStyle.borderRadius = '2px';
                                baseStyle.boxShadow = '0px 10px 30px rgba(0,0,0,0.1)';
                                inactiveColor = 'black';
                                activeColor = '#3B82F6'; // Blue highlight
                                activeScale = 1;
                            } else if (preset === 'paper-cut') {
                                baseStyle.fontFamily = 'Courier New, monospace';
                                baseStyle.fontSize = `${baseFontSize}px`;
                                baseStyle.fontWeight = 900;
                                baseStyle.backgroundColor = '#FDFBF7';
                                baseStyle.color = '#1A1A1A';
                                baseStyle.padding = '4px 16px';
                                baseStyle.transform = 'rotate(-2deg)';
                                baseStyle.boxShadow = '2px 2px 0px rgba(0,0,0,1)';
                                inactiveColor = '#1A1A1A';
                                activeColor = '#E11D48'; // Rose
                                activeScale = 1.05;
                            } else if (preset === 'unusual-paper') {
                                baseStyle.fontFamily = 'Georgia, serif';
                                baseStyle.fontSize = `${baseFontSize}px`;
                                baseStyle.fontWeight = 800;
                                baseStyle.backgroundColor = '#111111';
                                baseStyle.color = '#F5F5F5';
                                baseStyle.padding = '10px 20px';
                                baseStyle.border = '2px solid white';
                                inactiveColor = '#F5F5F5';
                                activeColor = '#FBBF24'; // Amber
                                activeScale = 1;
                            } else if (preset === 'youtube') {
                                baseStyle.fontSize = `${Math.round(baseFontSize * 0.6)}px`;
                                baseStyle.fontWeight = 600;
                                baseStyle.backgroundColor = 'rgba(0,0,0,0.75)';
                                baseStyle.borderRadius = '4px';
                                baseStyle.padding = '4px 12px';
                                activeColor = 'white';
                                inactiveColor = 'white';
                                activeScale = 1;
                            } else if (preset === 'tiktok') {
                                baseStyle.fontSize = `${Math.round(baseFontSize * 0.9)}px`;
                                baseStyle.fontWeight = 800;
                                baseStyle.WebkitTextStroke = '1.5px black';
                                baseStyle.textShadow = '1px 1px 2px black';
                                activeColor = '#FF0050'; // TikTok Red
                            } else if (preset === 'netflix') {
                                baseStyle.fontSize = `${Math.round(baseFontSize * 0.8)}px`;
                                baseStyle.fontWeight = 600;
                                baseStyle.textShadow = '0px 2px 4px rgba(0,0,0,0.8)';
                                inactiveColor = '#FFD700'; // Yellow text
                                activeColor = '#FFD700';
                                activeScale = 1;
                            } else if (preset === 'ali') {
                                baseStyle.fontSize = `${Math.round(baseFontSize * 0.9)}px`;
                                baseStyle.fontWeight = 700;
                                baseStyle.textShadow = '0px 2px 8px rgba(0,0,0,0.5)';
                                activeColor = '#FF7A00'; // Orange
                            } else if (preset === 'neon') {
                                baseStyle.fontSize = `${baseFontSize}px`;
                                baseStyle.fontWeight = 800;
                                baseStyle.fontStyle = 'italic';
                                baseStyle.textShadow = '0 0 10px #ff00ff, 0 0 20px #ff00ff';
                                inactiveColor = '#ffffff';
                                activeColor = '#00ffff'; // Cyan active
                            } else if (preset === 'minimalist') {
                                baseStyle.fontSize = `${baseFontSize}px`;
                                baseStyle.fontWeight = 300;
                                inactiveColor = '#9CA3AF'; // Gray
                                activeColor = '#111827'; // Black
                            } else if (preset === 'typewriter') {
                                baseStyle.fontFamily = 'monospace';
                                baseStyle.fontSize = `${Math.round(baseFontSize * 0.7)}px`;
                                baseStyle.backgroundColor = 'rgba(0,0,0,0.9)';
                                baseStyle.border = '1px solid #22c55e';
                                baseStyle.padding = '8px 16px';
                                inactiveColor = '#166534';
                                activeColor = '#22c55e';
                                activeScale = 1;
                            } else if (preset === 'cinematic') {
                                baseStyle.fontFamily = 'Georgia, serif';
                                baseStyle.fontSize = `${Math.round(baseFontSize * 0.8)}px`;
                                baseStyle.fontWeight = 400;
                                baseStyle.fontStyle = 'italic';
                                baseStyle.letterSpacing = '2px';
                                baseStyle.textShadow = '0px 2px 8px rgba(0,0,0,0.8)';
                                inactiveColor = 'rgba(255,255,255,0.5)';
                                activeColor = 'white';
                                activeScale = 1;
                            }"""
content = re.sub(r'const preset = clip\.style\?\.preset \|\| \'hormozi\';.*?if \(preset === \'cinematic\'\) \{.*?\}', ui_replacement, content, flags=re.DOTALL)

# Update preset buttons list
preset_buttons_replacement = """<div className="grid grid-cols-2 gap-2">
    {[
        { id: 'hormozi', name: 'Opus Pro (Hormozi)' },
        { id: 'beast', name: 'MrBeast' },
        { id: 'modern-clean', name: 'Modern Clean' },
        { id: 'paper-cut', name: 'Paper Cut' },
        { id: 'unusual-paper', name: 'Unusual Paper' },
        { id: 'tiktok', name: 'TikTok Default' },
        { id: 'netflix', name: 'Netflix' },
        { id: 'ali', name: 'Ali Abdaal' },
        { id: 'neon', name: 'Neon Glow' },
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
</div>"""
content = re.sub(r'<div className="grid grid-cols-2 gap-2">.*?</div>', preset_buttons_replacement, content, flags=re.DOTALL)

# Add Effects tab content
effects_tab_content = """                 {leftTab === 'effects' && (
                    <div className="space-y-4 p-4">
                       <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-4", textHighlight)}>Suggested Hooks & Headings</h3>
                       <div className="space-y-3">
                          {[
                             "🔥 You Won't Believe What Happened Next!",
                             "The Secret to 10x Growth 🚀",
                             "Stop Doing THIS Immediately 🛑",
                             "Why 99% of People Fail at This...",
                             "The Truth About The Industry 🤯"
                          ].map((heading, i) => (
                             <div key={i} className={cn("p-3 rounded border cursor-pointer transition-colors", bgMain, borderCol, "hover:border-[#6366F1]")} onClick={() => {
                                 // Add a text clip with this heading
                                 const newClip = {
                                    id: 'hook_' + Date.now(),
                                    trackId: 'v3', type: 'text',
                                    start: 0, end: 3, duration: 3,
                                    title: 'Hook Text',
                                    text: heading,
                                    chunks: [{ start: 0, end: 3, text: heading, words: [] }],
                                    transform: { x: 0, y: 50, width: 600, height: 60, scale: 100, rotation: 0 },
                                    style: { fontFamily: 'Montserrat', fontSize: 48, preset: 'hormozi' }
                                 };
                                 setProjectClips(p => [...p, newClip]);
                             }}>
                                <p className={cn("text-xs font-bold", textHighlight)}>{heading}</p>
                                <p className={cn("text-[9px] mt-1", textMuted)}>Click to add to timeline (0:00 - 0:03)</p>
                             </div>
                          ))}
                       </div>

                       <div className="my-6 border-b" />

                       <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-4", textHighlight)}>Video Effects</h3>
                       <div className="grid grid-cols-2 gap-2">
                          <button className={cn("p-3 rounded border text-center transition-colors", bgMain, borderCol, "hover:border-[#6366F1]")}>
                             <div className="w-full h-12 bg-gray-200 dark:bg-gray-800 rounded mb-2 flex items-center justify-center"><ZoomIn className="w-5 h-5 text-gray-500"/></div>
                             <span className={cn("text-[10px] font-semibold", textHighlight)}>Auto Zoom</span>
                          </button>
                          <button className={cn("p-3 rounded border text-center transition-colors", bgMain, borderCol, "hover:border-[#6366F1]")}>
                             <div className="w-full h-12 bg-gray-200 dark:bg-gray-800 rounded mb-2 flex items-center justify-center"><Film className="w-5 h-5 text-gray-500"/></div>
                             <span className={cn("text-[10px] font-semibold", textHighlight)}>B-Roll</span>
                          </button>
                          <button className={cn("p-3 rounded border text-center transition-colors", bgMain, borderCol, "hover:border-[#6366F1]")}>
                             <div className="w-full h-12 bg-gray-200 dark:bg-gray-800 rounded mb-2 flex items-center justify-center"><Volume2 className="w-5 h-5 text-gray-500"/></div>
                             <span className={cn("text-[10px] font-semibold", textHighlight)}>Sound FX</span>
                          </button>
                          <button className={cn("p-3 rounded border text-center transition-colors", bgMain, borderCol, "hover:border-[#6366F1]")}>
                             <div className="w-full h-12 bg-gray-200 dark:bg-gray-800 rounded mb-2 flex items-center justify-center"><Sparkles className="w-5 h-5 text-gray-500"/></div>
                             <span className={cn("text-[10px] font-semibold", textHighlight)}>Color Grade</span>
                          </button>
                       </div>
                    </div>
                 )}"""
# Find where leftTab === 'text' ends (around `)}` for text tab) and insert effects_tab_content
content = content.replace("                   </div>\n                 )}\n               </div>\n             </aside>", "                   </div>\n                 )}\n" + effects_tab_content + "\n               </div>\n             </aside>")

# Need to make sure ZoomIn, Film, Volume2 are imported
if "ZoomIn" not in content:
    content = content.replace("import { Play, Pause, FastForward, Rewind,", "import { Play, Pause, FastForward, Rewind, ZoomIn, Film, Volume2,")

with open(studio_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated StudioView.tsx with new presets and Effects tab.")
