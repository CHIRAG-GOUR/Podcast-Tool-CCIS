"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Play, Pause, Scissors, Type, Volume2, Image as ImageIcon, 
  Settings, Download, ChevronRight, Zap, TrendingUp, BookOpen, 
  Smile, Flame, Activity, Layout, Wand2, ArrowLeft, Check, Layers, Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

interface StudioViewProps {
  fileDetails: { name: string; size: number; type: string } | null
}

const MOCK_CLIPS = [
  {
    id: 1,
    title: "Strong Hook",
    time: "00:42–01:18",
    score: 96,
    reason: "Strong hook, high emotion, actionable advice.",
    category: "Viral",
    reach: "High",
    icon: Flame,
    color: "text-orange-500",
    bg: "bg-orange-500/10"
  },
  {
    id: 2,
    title: "Interesting Story",
    time: "04:18–05:10",
    score: 88,
    reason: "Great storytelling arc with unexpected conclusion.",
    category: "Story",
    reach: "Medium",
    icon: BookOpen,
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    id: 3,
    title: "Educational Insight",
    time: "09:42–10:34",
    score: 92,
    reason: "Clear explanation of a complex topic. High retention potential.",
    category: "Educational",
    reach: "High",
    icon: TrendingUp,
    color: "text-green-500",
    bg: "bg-green-500/10"
  },
  {
    id: 4,
    title: "Funny Moment",
    time: "13:50–14:42",
    score: 85,
    reason: "Genuine laughter, great audience engagement.",
    category: "Funny",
    reach: "Medium",
    icon: Smile,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10"
  },
]

const AI_SUGGESTIONS = [
  "This clip starts too slowly. Start at 00:44 instead.",
  "Remove 2.7 seconds of silence.",
  "Highlight the quote at 00:58.",
  "Increase caption size for mobile readability."
]

export function StudioView({ fileDetails }: StudioViewProps) {
  const [activeClipId, setActiveClipId] = useState(MOCK_CLIPS[0].id)
  const [activeTab, setActiveTab] = useState<'video' | 'text' | 'audio' | 'branding'>('text')
  const [isPlaying, setIsPlaying] = useState(false)
  const [exportFormat, setExportFormat] = useState('9:16')
  const [captionStyle, setCaptionStyle] = useState('Hormozi')

  const activeClip = MOCK_CLIPS.find(c => c.id === activeClipId)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-background/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-lg">{fileDetails?.name || "Podcast_Episode_12.mp4"}</h1>
            <p className="text-xs text-muted-foreground">AI Video Intelligence Studio</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="bg-card border border-border text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="9:16">Vertical (9:16)</option>
            <option value="16:9">Horizontal (16:9)</option>
            <option value="1:1">Square (1:1)</option>
            <option value="4:5">Portrait (4:5)</option>
          </select>
          <button className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
            Batch Export (4)
          </button>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-1.5 rounded-lg text-sm font-medium shadow-md transition-all">
            <Download className="w-4 h-4" />
            Export Selected
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Panel: Clips Gallery */}
        <aside className="w-full lg:w-72 border-r border-border/50 bg-card/30 flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-border/50 flex items-center gap-2 font-medium">
            <Wand2 className="w-4 h-4 text-primary" />
            AI Generated Clips
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {MOCK_CLIPS.map(clip => (
              <button
                key={clip.id}
                onClick={() => setActiveClipId(clip.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden",
                  activeClipId === clip.id 
                    ? "bg-card border-primary ring-1 ring-primary shadow-sm" 
                    : "bg-background border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md", clip.bg)}>
                      <clip.icon className={cn("w-4 h-4", clip.color)} />
                    </div>
                    <span className="font-semibold text-sm">{clip.title}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-primary">{clip.score}/100</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{clip.category}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  {clip.reason}
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium">
                  <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">{clip.time}</span>
                  <span className="text-blue-500">Reach: {clip.reach}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Middle Panel: Player & Timeline */}
        <main className="flex-1 flex flex-col min-w-0 bg-background/50 overflow-hidden">
          {/* Player Area */}
          <div className="flex-1 p-4 lg:p-6 flex flex-col xl:flex-row gap-6 items-center justify-center overflow-y-auto">
            <div className="aspect-[9/16] h-[55vh] min-h-[400px] max-h-[700px] shrink-0 bg-black rounded-2xl overflow-hidden relative shadow-2xl ring-1 ring-white/10 flex flex-col">
              {/* Mock Video content */}
              <div className="flex-1 flex items-center justify-center relative">
                {/* Mock Captions */}
                <div className="absolute bottom-16 text-center w-full px-8">
                  <p className={cn(
                    "font-extrabold text-2xl uppercase tracking-tight shadow-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]",
                    captionStyle === 'Hormozi' ? "text-yellow-400 font-sans italic" : 
                    captionStyle === 'Minimal' ? "text-white font-serif normal-case" : 
                    "text-white"
                  )}>
                    <span className="text-white">THIS</span> IS THE <span className="text-red-500">SECRET</span>
                  </p>
                </div>
                <Play className="w-16 h-16 text-white/50" />
              </div>
            </div>

            {/* AI Suggestions Floating Panel (Now Inline) */}
            <div className="w-full max-w-sm bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl overflow-hidden shrink-0">
              <div className="p-3 border-b border-border/50 bg-primary/5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider">AI Suggestions</span>
              </div>
              <div className="p-2 space-y-1">
                {AI_SUGGESTIONS.map((suggestion, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <p className="text-xs leading-relaxed text-muted-foreground flex-1">{suggestion}</p>
                    <button className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Timeline */}
          <div className="h-32 border-t border-border/50 bg-card/30 p-4 flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Intelligent Timeline</span>
              <div className="flex items-center gap-3">
                <button className="p-1.5 rounded bg-background border hover:bg-muted"><Scissors className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 rounded bg-background border hover:bg-muted"><Layout className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            
            {/* The Timeline Track */}
            <div className="flex-1 relative bg-background border rounded-lg overflow-hidden flex flex-col justify-end p-2 pb-6">
              {/* Markers Layer */}
              <div className="absolute inset-x-2 top-2 bottom-6">
                 {/* Mock active clip highlight */}
                 <div className="absolute left-[20%] right-[60%] top-0 bottom-0 bg-primary/20 border-x-2 border-primary rounded-sm" />
                 
                 {/* Mock AI Markers */}
                 <div className="absolute left-[25%] top-2 group cursor-pointer">
                    <Flame className="w-3 h-3 text-orange-500 drop-shadow-md" />
                    <div className="absolute -top-6 -left-4 bg-popover text-popover-foreground text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity">Viral Hook</div>
                 </div>
                 <div className="absolute left-[45%] top-4 group cursor-pointer">
                    <BookOpen className="w-3 h-3 text-blue-500 drop-shadow-md" />
                 </div>
                 <div className="absolute left-[75%] top-2 group cursor-pointer">
                    <Smile className="w-3 h-3 text-yellow-500 drop-shadow-md" />
                 </div>
              </div>

              {/* Time axis */}
              <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>00:00</span>
                <span>15:00</span>
                <span>30:00</span>
                <span>45:00</span>
              </div>
            </div>
          </div>
        </main>

        {/* Right Panel: Editor Tools */}
        <aside className="w-full lg:w-72 border-l border-border/50 bg-card/30 flex flex-col shrink-0">
          <div className="flex border-b border-border/50">
            {(['video', 'text', 'audio', 'branding'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 p-3 text-xs font-semibold capitalize flex items-center justify-center gap-1.5 border-b-2 transition-colors",
                  activeTab === tab ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {tab === 'video' && <Layout className="w-3.5 h-3.5" />}
                {tab === 'text' && <Type className="w-3.5 h-3.5" />}
                {tab === 'audio' && <Volume2 className="w-3.5 h-3.5" />}
                {tab === 'branding' && <Layers className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'text' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Caption Style</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {['Hormozi', 'Ali Abdaal', 'Minimal', 'Apple', 'Neon', 'Bold'].map(style => (
                      <button
                        key={style}
                        onClick={() => setCaptionStyle(style)}
                        className={cn(
                          "px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all",
                          captionStyle === style ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:border-primary/50"
                        )}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Highlight Keywords</span>
                      <div className="w-8 h-4 bg-primary rounded-full relative cursor-pointer"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" /></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Auto Emojis</span>
                      <div className="w-8 h-4 bg-primary rounded-full relative cursor-pointer"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" /></div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-2">Font Size</span>
                      <input type="range" className="w-full accent-primary" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'video' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">AI Framing</h4>
                  <div className="space-y-2">
                    <button className="w-full px-3 py-2 text-xs font-medium rounded-lg border bg-primary text-primary-foreground border-primary flex items-center justify-between">
                      Auto Track Active Speaker
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button className="w-full px-3 py-2 text-xs font-medium rounded-lg border bg-background hover:bg-muted flex items-center justify-between text-muted-foreground">
                      Static Crop (Center)
                    </button>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold mb-3">Adjustments</h4>
                  <div className="space-y-4">
                    {['Zoom', 'Brightness', 'Contrast'].map(adj => (
                      <div key={adj}>
                        <span className="text-xs text-muted-foreground block mb-2">{adj}</span>
                        <input type="range" className="w-full accent-primary" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'audio' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">AI Audio Enhancement</h4>
                  <button className="w-full px-3 py-3 text-xs font-medium rounded-lg border bg-primary/10 border-primary/20 text-primary flex items-center justify-center gap-2 mb-2 hover:bg-primary/20 transition-colors">
                    <Wand2 className="w-4 h-4" />
                    Studio Quality Voice
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center">Removes background noise and normalizes levels automatically.</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">Levels</h4>
                  <div className="space-y-4">
                    {['Volume', 'Background Music'].map(adj => (
                      <div key={adj}>
                        <span className="text-xs text-muted-foreground block mb-2">{adj}</span>
                        <input type="range" className="w-full accent-primary" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-6 text-center text-muted-foreground text-sm p-4">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>Upload a logo or watermark to apply to your clips.</p>
                <button className="px-4 py-2 border rounded-lg text-xs font-medium hover:bg-muted mt-2">Upload Asset</button>
              </div>
            )}
          </div>
        </aside>

      </div>
    </div>
  )
}
