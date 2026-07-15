"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { EditableCanvasNode, Transform } from "./EditableCanvasNode"
import { 
  Play, Pause, Scissors, Type, Volume2, Image as ImageIcon, 
  Settings, Download, ChevronRight, Zap, TrendingUp, BookOpen, 
  Smile, Flame, Activity, Layout, Wand2, ArrowLeft, Check, Layers, Sparkles, Trash2, SplitSquareHorizontal, ZoomIn, ZoomOut, Move,
  Smartphone, Monitor, Square, Plus, Music, Combine, Edit2, Copy, PlusCircle, UploadCloud, Video, Film,
  Grid, Crop, RotateCcw, FastForward, Clock, Maximize, MousePointer2, Lock, Eye, EyeOff, Hash, FileVideo, AudioWaveform, SlidersHorizontal, Sun, Contrast, Gauge, Unlock, 
  Search, FolderOpen, Star, Undo, Redo, LayoutGrid, List, MessageSquare, MoreVertical, MousePointer,
  Moon, Expand, Minimize, Command, X
} from "lucide-react"
import { cn } from "@/lib/utils"

export function StudioView({ file, fileUrl, clips: initialClips, onBack }: any) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  
  // Aspect Ratio
  const [aspectRatio, setAspectRatio] = useState<string>('16:9')
  const aspectMap: Record<string, string> = { '9:16': 'aspect-[9/16]', '16:9': 'aspect-video', '1:1': 'aspect-square', '4:5': 'aspect-[4/5]' }
  
  // Theme & Layout
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Left Panel - Asset Manager
  const [leftTab, setLeftTab] = useState<'media'|'audio'|'text'|'ai'|'effects'>('media')
  
  // Right Panel - Inspector
  const [rightTab, setRightTab] = useState<'video'|'audio'|'color'>('video')
  
  // Timeline State
  const [zoom, setZoom] = useState(100)
  const [tracks, setTracks] = useState([
    { id: 'v2', type: 'text', name: 'Captions', locked: false, hidden: false, muted: false },
    { id: 'v1', type: 'video', name: 'Video 1', locked: false, hidden: false, muted: false },
    { id: 'a1', type: 'audio', name: 'Audio 1', locked: false, hidden: false, muted: false }
  ])

  // AI Clips & Project Clips
  const [aiClips, setAiClips] = useState(initialClips.length > 0 ? initialClips : [])
  const [projectClips, setProjectClips] = useState<any[]>([{ id: 'c1', trackId: 'v1', start: 0, end: 15, duration: 15, title: 'Podcast Source' }])
  const [activeClipId, setActiveClipId] = useState<string | null>('c1')
  
  // History
  const [history, setHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // UI States
  const [showSafeMargins, setShowSafeMargins] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false)
  const [captionsGenerated, setCaptionsGenerated] = useState(false)
  
  const activeClip = projectClips.find(c => c.id === activeClipId)
  
  const updateActiveClipTransform = (newTransform: Transform) => {
     setProjectClips(prev => prev.map(c => c.id === activeClipId ? { ...c, transform: newTransform } : c));
  }
  
  const updateActiveClipStyle = (updates: any) => {
     setProjectClips(prev => prev.map(c => c.id === activeClipId ? { ...c, style: { ...c.style, ...updates } } : c));
  }
  
  // Context Menu
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: string, targetId: string } | null>(null)
  
  // Real Thumbnails & Waveform
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [audioWaveform, setAudioWaveform] = useState<number[]>([])

  // Generate real frames from video using hidden canvas
  useEffect(() => {
    if (!fileUrl || !videoDuration) return;
    let isMounted = true;
    const generate = async () => {
       const v = document.createElement('video');
       v.src = fileUrl;
       v.crossOrigin = "anonymous";
       v.muted = true;
       v.playsInline = true;
       
       await new Promise(r => {
          v.onloadeddata = r;
          v.onerror = r;
       });
       
       const canvas = document.createElement('canvas');
       canvas.width = 160;
       canvas.height = 90;
       const ctx = canvas.getContext('2d');
       if (!ctx) return;
       
       const thumbs: string[] = [];
       const count = 15; 
       for(let i=0; i<count; i++) {
          v.currentTime = (videoDuration / count) * i;
          await new Promise(r => {
              const handleSeek = () => { v.removeEventListener('seeked', handleSeek); r(null); };
              v.addEventListener('seeked', handleSeek);
              setTimeout(r, 500);
          });
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          thumbs.push(canvas.toDataURL('image/jpeg', 0.5));
       }
       if (isMounted) setThumbnails(thumbs);
    }
    
    // Generate realistic audio waveform structure
    const waves = Array.from({length: 150}).map(() => Math.random() * 80 + 20);
    setAudioWaveform(waves);
    
    generate();
    return () => { isMounted = false; }
  }, [fileUrl, videoDuration])
  
  // Export Modal
  const [showExport, setShowExport] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportRange, setExportRange] = useState<'entire'|'selected'>('entire')
  const [exportFormat, setExportFormat] = useState('mp4')
  const [exportRes, setExportRes] = useState('1080p')
  const [exportFps, setExportFps] = useState('30')
  const [exportCodec, setExportCodec] = useState('h264')
  const [exportError, setExportError] = useState('')
  // Theming
  const bgMain = theme === 'dark' ? "bg-[#0F0F0F]" : "bg-gray-50"
  const bgPanel = theme === 'dark' ? "bg-[#141414]" : "bg-white"
  const bgSidebar = theme === 'dark' ? "bg-[#1A1A1A]" : "bg-gray-100"
  const borderCol = theme === 'dark' ? "border-[#2A2A2A]" : "border-gray-200"
  const textMain = theme === 'dark' ? "text-gray-200" : "text-gray-800"
  const textMuted = theme === 'dark' ? "text-gray-400" : "text-gray-500"
  const textHighlight = theme === 'dark' ? "text-white" : "text-black"
  const bgHover = theme === 'dark' ? "hover:bg-[#333]" : "hover:bg-gray-200"

  const saveHistory = (newClips: any[]) => {
     const newHistory = history.slice(0, historyIndex + 1)
     newHistory.push(newClips)
     setHistory(newHistory)
     setHistoryIndex(newHistory.length - 1)
  }

  const handleSplit = () => {
    if (!activeClipId) return
    const clip = projectClips.find(c => c.id === activeClipId)
    if (!clip) return
    
    // If playhead is inside clip
    if (currentTime > clip.start && currentTime < (clip.start + clip.duration)) {
       const cutPoint = currentTime - clip.start
       const clip1 = { ...clip, id: Date.now().toString(), duration: cutPoint }
       const clip2 = { ...clip, id: (Date.now() + 1).toString(), start: currentTime, duration: clip.duration - cutPoint }
       
       const newClips = projectClips.filter(c => c.id !== activeClipId).concat([clip1, clip2])
       setProjectClips(newClips)
       saveHistory(newClips)
       setActiveClipId(clip2.id)
    }
  }

  const handleDelete = () => {
     if (!activeClipId) return
     const newClips = projectClips.filter(c => c.id !== activeClipId)
     setProjectClips(newClips)
     saveHistory(newClips)
     setActiveClipId(null)
  }
  
  const handleUndo = () => {
     if (historyIndex >= 0) {
        setProjectClips(history[historyIndex])
        setHistoryIndex(prev => prev - 1)
     }
  }

  // Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      
      if (e.code === 'Space') {
        e.preventDefault(); setIsPlaying(p => !p)
      } else if (e.code === 'KeyS' && !e.ctrlKey) {
        handleSplit()
      } else if (e.code === 'Backspace' || e.code === 'Delete') {
        handleDelete()
      } else if (e.code === 'KeyZ' && e.ctrlKey && !e.shiftKey) {
        handleUndo()
      } else if (e.code === 'KeyC' && e.ctrlKey && activeClip) {
         localStorage.setItem('copiedClip', JSON.stringify(activeClip));
      } else if (e.code === 'KeyV' && e.ctrlKey) {
         const copied = localStorage.getItem('copiedClip');
         if (copied) {
            const parsed = JSON.parse(copied);
            parsed.id = 'c_' + Date.now();
            if (parsed.transform) parsed.transform.y += 20;
            setProjectClips(p => [...p, parsed]);
            setActiveClipId(parsed.id);
         }
      } else if (e.code === 'KeyD' && e.ctrlKey) {
         e.preventDefault();
         if (activeClip) {
            const dupe = JSON.parse(JSON.stringify(activeClip));
            dupe.id = 'c_' + Date.now();
            if (dupe.transform) { dupe.transform.x += 20; dupe.transform.y += 20; }
            setProjectClips(p => [...p, dupe]);
            setActiveClipId(dupe.id);
         }
      } else if (e.key.startsWith('Arrow') && activeClip?.transform) {
         e.preventDefault();
         const step = e.shiftKey ? 10 : 1;
         const newT = { ...activeClip.transform };
         if (e.key === 'ArrowUp') newT.y -= step;
         if (e.key === 'ArrowDown') newT.y += step;
         if (e.key === 'ArrowLeft') newT.x -= step;
         if (e.key === 'ArrowRight') newT.x += step;
         updateActiveClipTransform(newT);
      } else if (e.code === 'Escape') {
         setActiveClipId(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeClipId, currentTime, projectClips, historyIndex, activeClip])

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.play()
      else videoRef.current.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    if (videoRef.current) { videoRef.current.playbackRate = playbackSpeed }
  }, [playbackSpeed])
  
  // Close context menu on click outside
  useEffect(() => {
     const handleGlobalClick = () => setContextMenu(null)
     window.addEventListener('click', handleGlobalClick)
     return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  return (
    <div className={cn("flex-1 w-full flex flex-col font-sans overflow-hidden text-sm transition-colors duration-300", bgMain, textMain, isFullscreen ? "fixed inset-0 z-50 h-screen" : "h-[calc(100vh-4rem)]")}>
      
      {/* Top Bar */}
         <header className={cn("h-12 border-b flex items-center justify-between px-4 shrink-0 transition-colors", borderCol, bgPanel)}>
           <div className="flex items-center gap-4">
             <button onClick={() => onBack?.()} className={cn("transition-colors", textMuted, `hover:${textHighlight}`)}><ArrowLeft className="w-4 h-4"/></button>
             <div className={cn("w-px h-4", borderCol, "border-l")} />
             <h1 className={cn("font-semibold text-xs", textHighlight)}>Podcast Tool - Untitled Project</h1>
           </div>
           <div className="flex items-center gap-2">
             <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className={cn("p-1.5 rounded transition-colors", textMuted, bgHover)}>
               {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
             </button>
             <button onClick={() => setIsFullscreen(true)} className={cn("p-1.5 rounded transition-colors", textMuted, bgHover)}>
               <Expand className="w-4 h-4" />
             </button>
             <div className={cn("w-px h-4 mx-1 border-l", borderCol)} />
             <button onClick={handleUndo} className={cn("p-1.5 rounded transition-colors", textMuted, bgHover)}><Undo className="w-4 h-4"/></button>
             <button className={cn("p-1.5 rounded transition-colors", textMuted, bgHover)}><Redo className="w-4 h-4"/></button>
             <div className={cn("w-px h-4 mx-1 border-l", borderCol)} />
             <button onClick={() => setShowExport(true)} className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white px-4 py-1.5 rounded text-xs font-semibold transition-colors">
               <Download className="w-3.5 h-3.5" /> Export
             </button>
           </div>
         </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Asset Manager */}
        <aside className={cn("w-80 flex flex-col border-r shrink-0 overflow-hidden", borderCol, bgSidebar)}>
               <div className={cn("flex px-2 pt-2 gap-1 border-b", borderCol)}>
                 {[
                   { id: 'media', icon: FolderOpen, label: 'Media' },
                   { id: 'text', icon: Type, label: 'Text' },
                   { id: 'ai', icon: Sparkles, label: 'AI Clips' },
                   { id: 'effects', icon: Wand2, label: 'Additional Features' }
                 ].map(t => (
                   <button 
                     key={t.id} onClick={() => setLeftTab(t.id as any)}
                     className={cn(
                       "flex-1 flex flex-col items-center justify-center py-2 gap-1 text-[10px] uppercase font-bold rounded-t-md transition-colors",
                       leftTab === t.id ? (theme === 'dark' ? "bg-[#252525] text-white" : "bg-white text-black") : `${textMuted} hover:${textHighlight}`
                     )}
                   >
                     <t.icon className="w-4 h-4" />
                     {t.label}
                   </button>
                 ))}
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                 
                 {/* Media Tab */}
                 {leftTab === 'media' && (
                   <div className="space-y-4">
                      <div className="flex gap-2 mb-4">
                         <button className={cn("flex-1 border border-dashed py-4 rounded flex flex-col items-center justify-center gap-1 transition-colors", borderCol, bgPanel, textMuted, theme === 'dark' ? "hover:border-[#666]" : "hover:border-gray-400")}>
                            <UploadCloud className="w-5 h-5 mb-1" />
                            <span className="text-[10px] font-semibold">Upload File</span>
                         </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                          {fileUrl ? (
                             <div className={cn("aspect-video rounded bg-black flex items-center justify-center relative group overflow-hidden border cursor-pointer", borderCol)}>
                                {thumbnails.length > 0 ? (
                                   <img src={thumbnails[0]} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                ) : (
                                   <video src={fileUrl} className="w-full h-full object-cover opacity-50" />
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex justify-between">
                                  <span className="text-[8px] text-white truncate max-w-[80px]">{file?.name || 'Uploaded Video'}</span>
                                  <span className="text-[8px] text-white">HD</span>
                               </div>
                            </div>
                         ) : (
                            <div className={cn("aspect-video rounded bg-black flex items-center justify-center relative group overflow-hidden border", borderCol)}>
                               <Video className="w-6 h-6 text-white/50" />
                               <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 flex justify-between">
                                  <span className="text-[8px] text-white">00:15</span>
                                  <span className="text-[8px] text-white">1080p</span>
                               </div>
                            </div>
                         )}
                      </div>
                   </div>
                 )}

                 {/* AI Clips Tab */}
                 {leftTab === 'ai' && (
                   <div className="space-y-4">
                     <div className="flex justify-between items-center mb-2">
                       <h3 className={cn("text-xs font-semibold", textHighlight)}>Generated Clips</h3>
                       <span className="text-[10px] bg-[#6366F1]/20 text-[#6366F1] px-1.5 py-0.5 rounded">{aiClips.length}</span>
                     </div>
                     {aiClips.map((clip: any) => (
                       <div key={clip.id} className={cn("border rounded-lg p-3 cursor-pointer transition-colors group", borderCol, bgPanel, theme === 'dark' ? "hover:border-[#6366F1]/50" : "hover:border-[#6366F1]")}>
                          <div className="relative aspect-video bg-black rounded-md mb-2 overflow-hidden flex items-center justify-center">
                             <Play className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />
                             <div className="absolute top-2 right-2 bg-black/60 px-1.5 rounded text-[10px] text-white">
                               {clip.time}
                             </div>
                          </div>
                          <h4 className={cn("font-semibold text-xs mb-1 line-clamp-1", textHighlight)}>{clip.title}</h4>
                          <div className={cn("flex justify-between text-[10px]", textMuted)}>
                             <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500"/> Score: {clip.score}</span>
                             <span>{clip.category}</span>
                          </div>
                          <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                               onClick={() => {
                                  const duration = (clip.end_time || 15) - (clip.start_time || 0);
                                  setVideoDuration(duration);
                                  setProjectClips([{
                                      id: 'c' + Date.now(),
                                      trackId: 'v1',
                                      type: 'video',
                                      start: 0,
                                      end: duration,
                                      duration: duration,
                                      title: clip.title || 'AI Clip',
                                      mediaStart: clip.start_time || 0,
                                      mediaEnd: clip.end_time || 15
                                  }]);
                                  setCaptionsGenerated(false);
                                  setCurrentTime(0);
                                  if (videoRef.current) {
                                      videoRef.current.currentTime = clip.start_time || 0;
                                  }
                               }} 
                               className="flex-1 bg-[#6366F1] text-white text-[10px] py-1.5 rounded font-medium">
                               Use Clip
                             </button>
                             <button 
                               onClick={() => {
                                  if (videoRef.current) {
                                      videoRef.current.currentTime = clip.start_time || 0;
                                      videoRef.current.play();
                                      setIsPlaying(true);
                                  }
                               }}
                               className={cn("flex-1 text-[10px] py-1.5 rounded font-medium transition-colors", theme === 'dark' ? "bg-[#333] text-white hover:bg-[#444]" : "bg-gray-200 text-black hover:bg-gray-300")}>
                               Preview
                             </button>
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
                 
                 {/* Text Tab */}
                 {leftTab === 'text' && (
                   <div className="space-y-4 flex flex-col items-center justify-center h-full text-center">
                      {!captionsGenerated ? (
                         <>
                            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-2", bgPanel)}>
                               <MessageSquare className={cn("w-5 h-5", textMuted)} />
                            </div>
                            <h3 className={cn("text-sm font-semibold mb-1", textHighlight)}>Auto-Captions</h3>
                            <p className={cn("text-xs mb-4 max-w-[200px]", textMuted)}>Generate highly accurate, animated captions perfectly synced to the audio.</p>
                            <button 
                               onClick={async () => {
                                 if (!file) {
                                   alert("Original video file missing. Please re-upload.");
                                   return;
                                 }
                                 
                                 setIsGeneratingCaptions(true);
                                 
                                 try {
                                   const targetClip = projectClips.find(c => c.id === activeClipId) || projectClips[0];
                                   
                                   const mediaStart = targetClip.mediaStart || 0;
                                   const mediaEnd = targetClip.mediaEnd || targetClip.duration;
                                   
                                   const formData = new FormData();
                                   formData.append("video", file);
                                   formData.append("start_time", mediaStart.toString());
                                   formData.append("end_time", mediaEnd.toString());
                                   
                                   const res = await fetch("/api/video/transcribe", {
                                     headers: {
                                       "Authorization": `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN}`
                                     },
                                     method: "POST",
                                     body: formData,
                                   });
                                   
                                   if (!res.ok) {
                                     throw new Error("Failed to transcribe video");
                                   }
                                   
                                   const data = await res.json();
                                   const generated = data.captions || [];
                                   
                                   if (generated.length === 0) {
                                     throw new Error("No speech detected or API returned empty.");
                                   }
                                   
                                   // Gemini returns chunks relative to the full video time (e.g. 31s-33s).
                                   // We want the chunk's `start` to be relative to the timeline `0` (e.g. 1s-3s).
                                   // Some LLMs might return local time (0s-2s), so we check that.
                                   const isLocal = generated[0]?.start < mediaStart && generated[0]?.start < 10;
                                   
                                   const newCaptionClip = {
                                      id: 'cap_' + Date.now(),
                                      trackId: 'v2', type: 'text',
                                      start: targetClip.start, 
                                      end: targetClip.start + targetClip.duration, 
                                      duration: targetClip.duration,
                                      title: 'Auto Captions',
                                      text: '', // Computed dynamically during render
                                      chunks: generated.map((c: any) => ({
                                         start: targetClip.start + (isLocal ? (c.start || 0) : Math.max(0, (c.start || 0) - mediaStart)),
                                         end: targetClip.start + (isLocal ? (c.end || 2) : Math.max(0, (c.end || 2) - mediaStart)),
                                         text: c.text,
                                         words: c.words ? c.words.map((w: any) => ({
                                            word: w.word,
                                            start: targetClip.start + (isLocal ? (w.start || 0) : Math.max(0, (w.start || 0) - mediaStart)),
                                            end: targetClip.start + (isLocal ? (w.end || 2) : Math.max(0, (w.end || 2) - mediaStart))
                                         })) : []
                                      })),
                                      transform: { x: 0, y: (previewContainerRef.current?.clientHeight || 400) * 0.35, width: 600, height: 60, scale: 100, rotation: 0 },
                                      style: { fontFamily: 'Inter', fontSize: 48, preset: 'dark' }
                                   };
                                   
                                   setProjectClips(p => [...p, newCaptionClip]);
                                   setActiveClipId(newCaptionClip.id);
                                   setCaptionsGenerated(true);
                                 } catch (err: any) {
                                   console.error("Transcription error:", err);
                                   alert("Error generating captions: " + err.message + ". Please try again.");
                                 } finally {
                                   setIsGeneratingCaptions(false);
                                 }
                               }}
                               className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold px-4 py-2 rounded flex items-center gap-2"
                            >
                              {isGeneratingCaptions ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              {isGeneratingCaptions ? 'Analyzing Audio...' : 'Generate Captions'}
                            </button>
                         </>
                      ) : (
                         <div className="w-full text-left">
                            <h3 className="text-xs font-semibold text-[#10B981] mb-2 flex items-center gap-1"><Check className="w-3 h-3"/> Captions Ready</h3>
                            <p className={cn("text-[10px] mb-4", textMuted)}>Captions have been added to track V2. Select them in the timeline to edit styles.</p>
                            <button onClick={() => setCaptionsGenerated(false)} className="text-[10px] text-red-400 hover:text-red-500">Clear Captions</button>
                         </div>
                      )}
                   </div>
                 )}

                 {/* Additional Features Tab */}
                 {leftTab === 'effects' && (
                    <div className="space-y-6">
                       <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-4", textHighlight)}>Generated Hooks & Captions</h3>
                       {aiClips.length > 0 ? (
                           <div className="space-y-4">
                              {aiClips.map((clip: any, i: number) => (
                                 <div key={i} className={cn("w-full p-3 rounded-lg border text-left flex flex-col gap-2", bgPanel, borderCol)}>
                                    <div>
                                        <span className={cn("text-[9px] font-bold uppercase tracking-wider", textMuted)}>Viral Title</span>
                                        <p className={cn("text-xs font-semibold", textHighlight)}>{clip.title}</p>
                                    </div>
                                    <div>
                                        <span className={cn("text-[9px] font-bold uppercase tracking-wider", textMuted)}>The Hook</span>
                                        <p className={cn("text-[10px]", textMuted)}>{clip.reason}</p>
                                    </div>
                                    {clip.instagram_caption && (
                                        <div>
                                            <span className={cn("text-[9px] font-bold uppercase tracking-wider", textMuted)}>Social Caption</span>
                                            <p className={cn("text-[10px] whitespace-pre-wrap", textMuted)}>{clip.instagram_caption}</p>
                                        </div>
                                    )}
                                    {clip.hashtags && (
                                        <div>
                                            <span className={cn("text-[9px] font-bold uppercase tracking-wider text-[#6366F1]")}>Hashtags</span>
                                            <p className={cn("text-[10px] font-semibold text-[#6366F1]")}>{clip.hashtags}</p>
                                        </div>
                                    )}
                                 </div>
                              ))}
                           </div>
                       ) : (
                           <div className={cn("text-xs text-center p-4", textMuted)}>
                               No hooks or captions generated yet. Upload and analyze a video first!
                           </div>
                       )}
                       
                       <div className="w-full h-px bg-gray-200 dark:bg-gray-800 my-4" />

                       <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-4", textHighlight)}>Video Effects</h3>
                       <div className="grid grid-cols-2 gap-2">
                          <button className={cn("p-3 rounded border text-center transition-colors opacity-50 cursor-not-allowed", bgMain, borderCol)}>
                             <div className="w-full h-12 bg-gray-200 dark:bg-gray-800 rounded mb-2 flex items-center justify-center"><ZoomIn className="w-5 h-5 text-gray-500"/></div>
                             <span className={cn("text-[10px] font-semibold", textHighlight)}>Auto Zoom</span>
                          </button>
                          <button className={cn("p-3 rounded border text-center transition-colors opacity-50 cursor-not-allowed", bgMain, borderCol)}>
                             <div className="w-full h-12 bg-gray-200 dark:bg-gray-800 rounded mb-2 flex items-center justify-center"><Film className="w-5 h-5 text-gray-500"/></div>
                             <span className={cn("text-[10px] font-semibold", textHighlight)}>B-Roll</span>
                          </button>
                          <button className={cn("p-3 rounded border text-center transition-colors opacity-50 cursor-not-allowed", bgMain, borderCol)}>
                             <div className="w-full h-12 bg-gray-200 dark:bg-gray-800 rounded mb-2 flex items-center justify-center"><Volume2 className="w-5 h-5 text-gray-500"/></div>
                             <span className={cn("text-[10px] font-semibold", textHighlight)}>Sound FX</span>
                          </button>
                          <button className={cn("p-3 rounded border text-center transition-colors opacity-50 cursor-not-allowed", bgMain, borderCol)}>
                             <div className="w-full h-12 bg-gray-200 dark:bg-gray-800 rounded mb-2 flex items-center justify-center"><Sparkles className="w-5 h-5 text-gray-500"/></div>
                             <span className={cn("text-[10px] font-semibold", textHighlight)}>Color Grade</span>
                          </button>
                       </div>
                    </div>
                 )}
               </div>
             </aside>

        {/* Center - Player */}
        <main className={cn("flex-1 flex flex-col relative overflow-hidden", theme === 'dark' ? "bg-black" : "bg-gray-200")}>
          <div className="flex-1 min-h-0 p-8 flex items-center justify-center relative">
             
             {isFullscreen && (
                <button onClick={() => setIsFullscreen(false)} className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded hover:bg-black/70">
                   <Minimize className="w-5 h-5" />
                </button>
             )}

             <div ref={previewContainerRef} className={cn("relative bg-black rounded-lg shadow-2xl h-full max-h-full overflow-hidden", aspectMap[aspectRatio] || 'aspect-video')}>
                {fileUrl && (
                  <video 
                    ref={videoRef}
                    src={fileUrl}
                    className="w-full h-full object-contain"
                    onTimeUpdate={(e) => {
                       const mainClip = projectClips.find(c => c.type === 'video');
                       const base = mainClip?.mediaStart || 0;
                       const end = mainClip?.mediaEnd || (mainClip ? mainClip.duration : videoDuration);
                       
                       if (e.currentTarget.currentTime > end && isPlaying) {
                           e.currentTarget.pause();
                           setIsPlaying(false);
                           setCurrentTime(end - base);
                       } else {
                           setCurrentTime(Math.max(0, e.currentTarget.currentTime - base));
                       }
                    }}
                    onLoadedMetadata={(e) => { 
                       const mainClip = projectClips.find(c => c.type === 'video');
                       if (!mainClip || mainClip.title === 'Podcast Source') {
                           setVideoDuration(e.currentTarget.duration); 
                           setProjectClips([{ id: 'c1', trackId: 'v1', type: 'video', start: 0, end: e.currentTarget.duration, duration: e.currentTarget.duration, title: 'Podcast Source' }]);
                       }
                    }}
                    loop
                  />
                )}
                
                {/* Canvas Elements */}
                {projectClips.filter(c => c.type === 'text' && currentTime >= c.start && currentTime <= (c.start + c.duration)).map(clip => {
                   let displayText = clip.text || "(Caption Placeholder)";
                   let isVisible = true;
                   
                   let activeChunk: any = null;
                   if (clip.chunks && clip.chunks.length > 0) {
                      activeChunk = clip.chunks.find((ch: any) => currentTime >= ch.start && currentTime <= ch.end);
                      if (activeChunk) {
                          displayText = activeChunk.text;
                      } else {
                          const nextChunk = clip.chunks.find((ch: any) => ch.start > currentTime);
                          const prevChunk = [...clip.chunks].reverse().find((ch: any) => ch.end < currentTime);
                          displayText = nextChunk ? nextChunk.text : (prevChunk ? prevChunk.text : "(Caption Placeholder)");
                          isVisible = false;
                      }
                   }
                   
                   const isSelected = activeClipId === clip.id;
                   
                   if (!isVisible && !isSelected) return null;
                   
                   return (
                     <EditableCanvasNode
                       key={clip.id}
                       id={clip.id}
                       transform={clip.transform}
                       isSelected={isSelected}
                       onSelect={() => setActiveClipId(clip.id)}
                       onChange={(newTransform) => {
                          setProjectClips(prev => prev.map(c => c.id === clip.id ? { ...c, transform: newTransform } : c));
                       }}
                       isDraggable={clip.type !== 'caption'}
                       isResizable={clip.type !== 'caption'}
                     >
                       
                        {(() => {
                            const preset = clip.style?.preset || 'hormozi';
                            const baseFontSize = clip.style?.fontSize || 48;
                            
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
                                baseStyle.fontSize = `${baseFontSize}px`;
                                baseStyle.fontWeight = 900;
                                baseStyle.textShadow = '0px 4px 12px rgba(0,0,0,0.8), 0px 2px 4px rgba(0,0,0,1)';
                                baseStyle.textTransform = 'uppercase';
                                activeColor = '#FFD700'; // Yellow
                            } else if (preset === 'beast') {
                                baseStyle.fontFamily = 'Impact, sans-serif';
                                baseStyle.fontSize = `${Math.round(baseFontSize * 1.2)}px`;
                                baseStyle.fontWeight = 900;
                                baseStyle.WebkitTextStroke = '2px black';
                                baseStyle.textShadow = '4px 4px 0px black';
                                baseStyle.textTransform = 'uppercase';
                                baseStyle.fontStyle = 'italic';
                                activeColor = '#00FFFF'; // Cyan
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
                                baseStyle.fontFamily = 'Montserrat, sans-serif';
                                baseStyle.fontSize = `${Math.round(baseFontSize * 1.0)}px`;
                                baseStyle.fontWeight = 800;
                                baseStyle.WebkitTextStroke = '1.5px black';
                                baseStyle.textShadow = '1px 1px 2px black';
                                inactiveColor = 'white';
                                activeColor = '#FFFF00'; // Fallback
                                activeScale = 1.15;
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
                                if (theme === 'dark') activeColor = '#ffffff';
                            } else if (preset === 'modern-clean') {
                                baseStyle.fontFamily = 'Inter, sans-serif';
                                baseStyle.fontSize = `${baseFontSize}px`;
                                baseStyle.fontWeight = 600;
                                baseStyle.padding = '8px 24px';
                                baseStyle.backgroundColor = 'rgba(0, 0, 0, 0.4)';
                                baseStyle.backdropFilter = 'blur(10px)';
                                baseStyle.borderLeft = '4px solid #6366F1';
                                baseStyle.borderRadius = '4px';
                                activeColor = '#ffffff';
                                activeScale = 1.05;
                            } else if (preset === 'paper-cut') {
                                baseStyle.fontFamily = '"Segoe Print", sans-serif';
                                baseStyle.fontSize = `${baseFontSize}px`;
                                baseStyle.fontWeight = 700;
                                baseStyle.backgroundColor = '#DDF0F6'; // Beige
                                baseStyle.color = '#111111';
                                baseStyle.padding = '4px 12px';
                                baseStyle.border = '3px solid black';
                                baseStyle.boxShadow = '4px 4px 0px rgba(0,0,0,1)';
                                inactiveColor = '#111111';
                                activeColor = '#FF0000';
                            } else if (preset === 'cinematic') {
                                baseStyle.fontFamily = 'Georgia, serif';
                                baseStyle.fontSize = `${Math.round(baseFontSize * 0.95)}px`;
                                baseStyle.fontWeight = 400;
                                baseStyle.WebkitTextStroke = '1px black';
                                baseStyle.textShadow = '0px 3px 6px rgba(0,0,0,0.8)';
                                inactiveColor = '#CCCCCC';
                                activeColor = '#D4AF37'; // Gold
                                activeScale = 1;
                            } else if (preset === 'skillizee') {
                                baseStyle.fontFamily = 'Inter, sans-serif';
                                baseStyle.fontSize = `${baseFontSize}px`;
                                baseStyle.fontWeight = 800;
                                baseStyle.WebkitTextStroke = '1.5px black';
                                inactiveColor = 'white';
                                activeColor = '#2563EB'; // Skillizee Blue
                                activeScale = 1;
                            }
                            if (clip.style?.backgroundBox === 'white') {
                                baseStyle.backgroundColor = 'white';
                                baseStyle.borderRadius = '4px';
                            } else if (clip.style?.backgroundBox === 'black') {
                                baseStyle.backgroundColor = 'black';
                                baseStyle.borderRadius = '4px';
                            } else if (clip.style?.backgroundBox === 'blur') {
                                baseStyle.backgroundColor = 'rgba(128, 128, 128, 0.3)';
                                baseStyle.backdropFilter = 'blur(12px)';
                                baseStyle.borderRadius = '8px';
                            } else if (clip.style?.backgroundBox === 'dark-blur') {
                                baseStyle.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                                baseStyle.backdropFilter = 'blur(12px)';
                                baseStyle.borderRadius = '8px';
                            } else if (clip.style?.backgroundBox === 'white-blur') {
                                baseStyle.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                                baseStyle.backdropFilter = 'blur(12px)';
                                baseStyle.borderRadius = '8px';
                            }

                            return (
                                <div style={baseStyle}>
                                    {activeChunk && activeChunk.words && activeChunk.words.length > 0 ? (
                                        <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                                            {activeChunk.words.map((w: any, idx: number) => {
                                                const isActiveWord = currentTime >= w.start && currentTime <= w.end;
                                                
                                                let currentActiveColor = activeColor;
                                                let currentStroke = baseStyle.WebkitTextStroke;
                                                let currentTextDecoration = 'none';

                                                if (isActiveWord) {
                                                    if (preset === 'tiktok') {
                                                        const colors = ['#00FFFF', '#FFFF00', '#00FF00', '#FF0000'];
                                                        currentActiveColor = colors[idx % colors.length];
                                                        currentStroke = '2.5px black';
                                                    } else if (preset === 'skillizee') {
                                                        currentTextDecoration = 'underline solid #FFC000 4px';
                                                    }
                                                }

                                                return (
                                                    <span key={idx} style={{ 
                                                        color: isActiveWord ? currentActiveColor : inactiveColor, 
                                                        transform: isActiveWord ? `scale(${activeScale})` : 'scale(1)',
                                                        display: 'inline-block',
                                                        transition: 'all 0.1s ease-in-out',
                                                        WebkitTextStroke: currentStroke,
                                                        textDecoration: currentTextDecoration,
                                                        textUnderlineOffset: '6px'
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

                     </EditableCanvasNode>
                   );
                })}
                
                {/* Safe Margins */}
                {showSafeMargins && (
                  <div className="absolute inset-4 border border-red-500/50 pointer-events-none z-10 flex flex-col justify-between p-2 shadow-[0_0_0_1000px_rgba(0,0,0,0.2)]">
                     <span className="text-[8px] text-red-500 font-mono font-bold bg-black/50 px-1 w-max">SAFE ACTION</span>
                     <div className="absolute top-1/2 left-0 w-full h-px bg-red-500/50" />
                     <div className="absolute left-1/2 top-0 h-full w-px bg-red-500/50" />
                  </div>
                )}
             </div>
          </div>
          
          {/* Player Toolbar */}
          <div className={cn("h-12 border-t flex items-center justify-between px-4 shrink-0", borderCol, bgPanel)}>
             <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#6366F1]">{Math.floor(currentTime/60)}:{String(Math.floor(currentTime%60)).padStart(2,'0')}</span>
                <span className={textMuted}>/</span>
                <span className={cn("font-mono text-xs", textMuted)}>{Math.floor(videoDuration/60)}:{String(Math.floor(videoDuration%60)).padStart(2,'0')}</span>
             </div>
             
             <div className="flex items-center gap-4">
                <button onClick={() => {
                   if (videoRef.current) {
                      const mainClip = projectClips.find(c => c.type === 'video');
                      const base = mainClip?.mediaStart || 0;
                      videoRef.current.currentTime = Math.max(base, videoRef.current.currentTime - 1);
                   }
                }} className={cn(textMuted, `hover:${textHighlight}`)}><RotateCcw className="w-4 h-4"/></button>
                
                <button onClick={() => {
                   if (videoRef.current) {
                       if (!isPlaying) videoRef.current.play();
                       else videoRef.current.pause();
                       setIsPlaying(!isPlaying);
                   }
                }} className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors", theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800")}>
                   {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                
                <button onClick={() => {
                   if (videoRef.current) {
                      const mainClip = projectClips.find(c => c.type === 'video');
                      const end = mainClip?.mediaEnd || (mainClip ? mainClip.duration : videoDuration);
                      videoRef.current.currentTime = Math.min(end, videoRef.current.currentTime + 1);
                   }
                }} className={cn(textMuted, `hover:${textHighlight}`)}><FastForward className="w-4 h-4"/></button>
             </div>
             
             <div className="flex items-center gap-3">
                <select 
                  className={cn("text-[10px] px-2 py-1 rounded border outline-none font-semibold", theme === 'dark' ? "bg-[#222] border-[#333] text-gray-300" : "bg-white border-gray-300 text-gray-700")}
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                   <option value="9:16">9:16 Reels/Shorts</option>
                   <option value="16:9">16:9 YouTube</option>
                   <option value="1:1">1:1 IG Post</option>
                   <option value="4:5">4:5 Facebook</option>
                </select>
                <button onClick={() => setShowSafeMargins(!showSafeMargins)} className={cn(textMuted, `hover:${textHighlight}`, showSafeMargins && "text-[#6366F1]")}><Grid className="w-4 h-4"/></button>
                <button onClick={() => setPlaybackSpeed(s => { const speeds = [0.5, 1, 1.5, 2]; const i = speeds.indexOf(s); return speeds[(i + 1) % speeds.length] })} className={cn("flex items-center gap-1 text-[10px] px-2 py-1 rounded cursor-pointer", textMuted, theme === 'dark' ? "bg-[#222] hover:bg-[#333]" : "bg-gray-200 hover:bg-gray-300")}>
                   <Gauge className="w-3 h-3" /> {playbackSpeed}x
                </button>
                {!isFullscreen && <button onClick={() => setIsFullscreen(true)} className={cn(textMuted, `hover:${textHighlight}`)}><Maximize className="w-4 h-4"/></button>}
             </div>
          </div>
        </main>

        {/* Right Inspector */}
        <aside className={cn("w-72 flex flex-col border-l shrink-0 overflow-hidden", borderCol, bgSidebar)}>
               <div className={cn("flex border-b px-4 py-3", borderCol)}>
                  <h3 className={cn("text-xs font-bold uppercase tracking-wider", textHighlight)}>Properties</h3>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
                  {activeClip && activeClip.type === 'text' && activeClip.transform && activeClip.style && (
                     <>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                           <h4 className={cn("text-xs font-bold uppercase tracking-wider sticky top-0 py-1 bg-opacity-90 backdrop-blur z-10", textMuted, bgSidebar)}>Generated Captions</h4>
                           {activeClip.chunks && activeClip.chunks.map((chunk: any, cIdx: number) => (
                               <div key={cIdx} className="space-y-1">
                                   <div className={cn("text-[8px] flex justify-between", textMuted)}>
                                       <span>{chunk.start.toFixed(1)}s</span>
                                       <span>{chunk.end.toFixed(1)}s</span>
                                   </div>
                                   <textarea
                                       value={chunk.text}
                                       onChange={(e) => {
                                           const newText = e.target.value;
                                           const newClips = [...projectClips];
                                           const clipIdx = newClips.findIndex(c => c.id === activeClip.id);
                                           if (clipIdx > -1) {
                                               const targetChunk = newClips[clipIdx].chunks[cIdx];
                                               targetChunk.text = newText;
                                               
                                               const newWordsStr = newText.split(/\s+/).filter(w => w.length > 0);
                                               const oldWords = targetChunk.words || [];
                                               const newWords = [];
                                               
                                               for (let i = 0; i < newWordsStr.length; i++) {
                                                   if (i < oldWords.length) {
                                                       newWords.push({ ...oldWords[i], word: newWordsStr[i] });
                                                   } else {
                                                       const lastWord = oldWords[oldWords.length - 1] || { start: targetChunk.start, end: targetChunk.end };
                                                       newWords.push({ word: newWordsStr[i], start: lastWord.end, end: lastWord.end + 0.5 });
                                                   }
                                               }
                                               targetChunk.words = newWords;
                                               setProjectClips(newClips);
                                           }
                                       }}
                                       className={cn("w-full p-2 text-xs rounded border transition-colors", bgMain, borderCol, textHighlight, "focus:border-[#6366F1] outline-none")}
                                       rows={2}
                                   />
                               </div>
                           ))}
                           {(!activeClip.chunks || activeClip.chunks.length === 0) && (
                               <div className={cn("text-xs text-center p-4", textMuted)}>No captions generated yet.</div>
                           )}
                        </div>
                        <div className="space-y-4">
                           <h4 className={cn("text-xs font-bold uppercase tracking-wider", textMuted)}>Typography</h4>
                           
                           <div className="space-y-2">
                              <label className={cn("text-[10px] uppercase font-bold", textMuted)}>Style Preset</label>
                              
<div className="grid grid-cols-2 gap-2">
    {[
        { id: 'hormozi', name: 'Opus Pro (Hormozi)', desc: 'Bold & Yellow' },
        { id: 'beast', name: 'MrBeast', desc: 'Loud & Slanted' },
        { id: 'modern-clean', name: 'Modern Clean', desc: 'Minimal & Corporate' },
        { id: 'paper-cut', name: 'Paper Cut', desc: 'Handwritten & Paper' },
        { id: 'tiktok', name: 'TikTok Default', desc: 'Bouncy & Colorful' },
        { id: 'skillizee', name: 'Skillizee', desc: 'Brand Blue Highlight' },
        { id: 'netflix', name: 'Netflix', desc: 'Classic TV Subtitles' },
        { id: 'ali', name: 'Ali Abdaal', desc: 'Orange Pop' },
        { id: 'neon', name: 'Neon Glow', desc: 'Cyberpunk Aesthetic' },
        { id: 'cinematic', name: 'Cinematic', desc: 'Elegant & Gold' }
    ].map(preset => (
        <button 
            key={preset.id}
            onClick={() => updateActiveClipStyle({ preset: preset.id })}
            className={cn(
                "p-2 text-center rounded border transition-colors flex flex-col items-center justify-center truncate",
                (activeClip.style.preset === preset.id || (!activeClip.style.preset && preset.id === 'hormozi')) 
                    ? "bg-[#6366F1] text-white border-[#6366F1]" 
                    : (theme === 'dark' ? "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700" : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200")
            )}
        >
            <span className="text-[10px] font-bold">{preset.name}</span>
            <span className="text-[8px] opacity-75 font-normal mt-0.5">{preset.desc}</span>
        </button>
    ))}
</div>

                           </div>
                           
                           <div className="space-y-2 mt-4">
                              <label className={cn("text-[10px] uppercase font-bold", textMuted)}>Font Family</label>
                              <select value={activeClip.style.fontFamily} onChange={e => updateActiveClipStyle({ fontFamily: e.target.value })} className={cn("w-full p-2 text-xs rounded border", bgMain, borderCol, textHighlight)}>
                                 <option value="Inter">Inter</option>
                                 <option value="Arial">Arial</option>
                                 <option value="Impact">Impact</option>
                                 <option value="Georgia">Georgia</option>
                              </select>
                           </div>
                           
                           <div className="flex items-center justify-between mt-4">
                              <label className={cn("text-[10px] uppercase font-bold", textMuted)}>Font Size</label>
                              <input type="number" value={activeClip.style.fontSize} onChange={e => updateActiveClipStyle({ fontSize: Number(e.target.value) })} className={cn("w-20 p-2 text-xs rounded border text-center", bgMain, borderCol, textHighlight)} />
                           </div>

                           <div className="flex items-center justify-between mt-4">
                              <label className={cn("text-[10px] uppercase font-bold", textMuted)}>Background Box</label>
                              <select value={activeClip.style.backgroundBox || 'none'} onChange={e => updateActiveClipStyle({ backgroundBox: e.target.value })} className={cn("w-28 p-2 text-xs rounded border", bgMain, borderCol, textHighlight)}>
                                 <option value="none">None</option>
                                 <option value="white">White</option>
                                 <option value="black">Black</option>
                                 <option value="blur">Blur (Glass)</option>
                                 <option value="dark-blur">Dark Blur</option>
                                 <option value="white-blur">White Blur</option>
                              </select>
                           </div>
                        </div>
                        <div className={cn("w-full h-px", borderCol, "border-b")} />
                     </>
                  )}

                  <div className="space-y-4">
                     <h4 className={cn("text-xs font-bold uppercase tracking-wider", textMuted)}>Transform</h4>
                     <div className="space-y-2">
                        <div className={cn("flex justify-between text-[10px]", textMuted)}><span>Scale</span> <span>{Math.round(activeClip?.transform?.scale || 100)}%</span></div>
                        <input type="range" min="10" max="300" value={activeClip?.transform?.scale || 100} onChange={e=>updateActiveClipTransform({ ...activeClip.transform, scale: Number(e.target.value) })} className="w-full accent-[#6366F1]" disabled={!activeClip?.transform} />
                     </div>
                     <div className="space-y-2">
                        <div className={cn("flex justify-between text-[10px]", textMuted)}><span>X Position</span> <span>{Math.round(activeClip?.transform?.x || 0)}</span></div>
                        <input type="range" min="-500" max="500" value={activeClip?.transform?.x || 0} onChange={e=>updateActiveClipTransform({ ...activeClip.transform, x: Number(e.target.value) })} className="w-full accent-[#6366F1]" disabled={!activeClip?.transform} />
                     </div>
                     <div className="space-y-2">
                        <div className={cn("flex justify-between text-[10px]", textMuted)}><span>Y Position</span> <span>{Math.round(activeClip?.transform?.y || 0)}</span></div>
                        <input type="range" min="-500" max="500" value={activeClip?.transform?.y || 0} onChange={e=>updateActiveClipTransform({ ...activeClip.transform, y: Number(e.target.value) })} className="w-full accent-[#6366F1]" disabled={!activeClip?.transform} />
                     </div>
                     <div className="space-y-2">
                        <div className={cn("flex justify-between text-[10px]", textMuted)}><span>Rotation</span> <span>{Math.round(activeClip?.transform?.rotation || 0)}°</span></div>
                        <input type="range" min="-180" max="180" value={activeClip?.transform?.rotation || 0} onChange={e=>updateActiveClipTransform({ ...activeClip.transform, rotation: Number(e.target.value) })} className="w-full accent-[#6366F1]" disabled={!activeClip?.transform} />
                     </div>
                  </div>
                  {(!activeClip || activeClip.type !== 'text') && (
                     <>
                        <div className={cn("w-full h-px", borderCol, "border-b")} />
                        <div className="space-y-3">
                           <h4 className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-2", textMuted)}><Crop className="w-3 h-3"/> Crop & Mask</h4>
                           <button className={cn("w-full py-1.5 border rounded text-xs transition-colors", borderCol, textHighlight, bgHover)}>Edit Crop Mask</button>
                        </div>
                     </>
                  )}
               </div>
             </aside>
      </div>

      {/* Bottom Timeline */}
      <div className={cn("h-[300px] border-t flex flex-col shrink-0 relative z-20", borderCol, bgPanel)}>
         {/* Timeline Toolbar */}
         <div className={cn("h-10 border-b flex items-center justify-between px-4", borderCol, bgSidebar)}>
            <div className="flex items-center gap-2">
               <button className={cn("p-1.5 rounded transition-colors", textMuted, bgHover)}><MousePointer2 className="w-4 h-4"/></button>
               <button onClick={handleSplit} title="Split (S)" className={cn("p-1.5 rounded transition-colors", textMuted, bgHover)}><Scissors className="w-4 h-4"/></button>
               <button className={cn("p-1.5 rounded transition-colors", textMuted, bgHover)}><Copy className="w-4 h-4"/></button>
               <div className={cn("w-px h-4 mx-1 border-l", borderCol)} />
               <button onClick={handleDelete} title="Delete (Del)" className={cn("p-1.5 rounded transition-colors", "text-red-400 hover:text-red-500", bgHover)}><Trash2 className="w-4 h-4"/></button>
            </div>
            <div className="flex items-center gap-3">
               <ZoomOut className={cn("w-3 h-3", textMuted)} />
               <input type="range" min="10" max="300" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-24 accent-[#6366F1]" />
               <ZoomIn className={cn("w-3 h-3", textMuted)} />
            </div>
         </div>
         
         <div className="flex-1 flex overflow-hidden">
            {/* Track Headers */}
            <div className={cn("w-[120px] border-r flex flex-col shrink-0 z-10", borderCol, bgSidebar)}>
               <div className={cn("h-6 border-b", borderCol)} /> {/* Ruler space */}
               {tracks.map(t => (
                  <div key={t.id} className={cn("h-16 border-b p-2 flex flex-col justify-center relative group", borderCol)}>
                     <div className="flex items-center justify-between">
                        <span className={cn("text-[10px] font-semibold flex items-center gap-1", textMuted)}>
                           {t.type === 'video' && <FileVideo className="w-3 h-3 text-blue-400"/>}
                           {t.type === 'audio' && <AudioWaveform className="w-3 h-3 text-green-400"/>}
                           {t.type === 'text' && <Type className="w-3 h-3 text-purple-400"/>}
                           {t.id.toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => setTracks(ts => ts.map(tr => tr.id === t.id ? {...tr, locked: !tr.locked} : tr))} className={cn(t.locked ? 'text-red-400' : textMuted, `hover:${textHighlight}`)}>{t.locked ? <Lock className="w-3 h-3"/> : <Unlock className="w-3 h-3"/>}</button>
                           <button onClick={() => setTracks(ts => ts.map(tr => tr.id === t.id ? {...tr, hidden: !tr.hidden} : tr))} className={cn(t.hidden ? 'text-red-400' : textMuted, `hover:${textHighlight}`)}>{t.hidden ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}</button>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
            
            {/* Timeline Canvas */}
             <div className={cn("flex-1 relative overflow-x-auto overflow-y-hidden scrollbar-thin", bgPanel)}>
                <div style={{ width: `${Math.max((videoDuration || 15) * zoom, 100)}px`, minWidth: '100%', height: '100%', position: 'relative' }}>
                   {/* Time Ruler */}
                   <div className={cn("h-6 border-b sticky top-0 z-0 flex", borderCol, bgSidebar)}>
                      {Array.from({length: Math.ceil((videoDuration || 15) / (zoom > 50 ? 1 : zoom > 20 ? 5 : 10))}).map((_, i) => {
                         const secondsPerTick = zoom > 50 ? 1 : zoom > 20 ? 5 : 10;
                         const sec = i * secondsPerTick;
                         return (
                            <div key={i} style={{ width: `${zoom * secondsPerTick}px` }} className={cn("border-l h-full relative shrink-0", borderCol)}>
                               <span className={cn("absolute left-1 top-1 text-[8px]", textMuted)}>{sec}s</span>
                            </div>
                         );
                      })}
                   </div>
                   
                   {/* Tracks Content */}
                   <div className="relative" style={{ height: 'calc(100% - 24px)' }}
                        onClick={(e) => {
                           if (!videoRef.current) return;
                           const rect = e.currentTarget.getBoundingClientRect();
                           const x = e.clientX - rect.left;
                           const newTime = x / zoom;
                           const mainClip = projectClips.find(c => c.type === 'video');
                           const base = mainClip?.mediaStart || 0;
                           videoRef.current.currentTime = base + newTime;
                           setCurrentTime(newTime);
                        }}
                        onContextMenu={(e) => {
                           e.preventDefault()
                           setContextMenu({ x: e.clientX, y: e.clientY, type: 'timeline', targetId: '' })
                        }}>
                  
                  {/* Playhead */}
                  <div className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none" style={{ left: `${currentTime * zoom}px` }}>
                     <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 transform rotate-45 cursor-ew-resize pointer-events-auto" />
                  </div>
                  
                  {tracks.map(t => (
                     <div key={t.id} className={cn("h-16 border-b relative", borderCol)}>
                        {t.type === 'video' && projectClips.map(c => (
                           <div key={c.id} className={cn(
                              "absolute h-14 top-1 rounded-md overflow-hidden border transition-all cursor-pointer flex flex-col",
                              activeClipId === c.id ? "border-white z-10 shadow-[0_0_0_1px_rgba(255,255,255,1)]" : "border-blue-500/50 hover:border-blue-400"
                           )}
                           style={{ left: `${c.start * zoom}px`, width: `${c.duration * zoom}px` }}
                           onClick={() => setActiveClipId(c.id)}
                           onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); setActiveClipId(c.id); setContextMenu({ x: e.clientX, y: e.clientY, type: 'clip', targetId: c.id }) }}
                           >
                              <div className="absolute inset-0 bg-blue-500/20" />
                              <div className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-black/30 z-10 truncate absolute top-0 w-full backdrop-blur-sm">{c.title}</div>
                              {/* Real Thumbnails */}
                              <div className="flex-1 flex overflow-hidden">
                                 {thumbnails.length > 0 ? (
                                    thumbnails.map((t, i) => (
                                       <img key={i} src={t} className="h-full object-cover shrink-0" style={{ width: `${zoom}px` }} draggable={false} />
                                    ))
                                 ) : (
                                    Array.from({length: Math.ceil(c.duration)}).map((_, i) => (
                                       <div key={i} className="h-full border-r border-blue-900/30 bg-blue-800/20 shrink-0" style={{ width: `${zoom}px` }} />
                                    ))
                                 )}
                              </div>
                           </div>
                        ))}
                        
                        {/* Fake gap indicator if multiple clips exist */}
                        {t.type === 'video' && projectClips.length > 1 && (
                            <div className="absolute h-14 top-1 flex items-center justify-center z-20"
                                 style={{ left: `${(projectClips[0].start + projectClips[0].duration) / (videoDuration || 15) * 100}%`, width: '20px', marginLeft: '-10px' }}>
                               <button className="w-5 h-5 bg-black border border-gray-600 rounded-full flex items-center justify-center text-white hover:bg-gray-800 shadow-xl transition-transform hover:scale-110">
                                  <Plus className="w-3 h-3" />
                               </button>
                            </div>
                        )}
                        
                        {t.type === 'audio' && projectClips.map(c => (
                           <div key={c.id} className={cn(
                              "absolute h-14 top-1 rounded-md overflow-hidden border transition-all",
                              "border-green-500/50 bg-green-500/10"
                           )}
                           style={{ left: `${c.start * zoom}px`, width: `${c.duration * zoom}px` }}
                           >
                              <div className="absolute top-0.5 left-1.5 text-[9px] font-bold text-green-700 dark:text-green-300 z-10">Audio Track</div>
                              <div className="absolute inset-0 top-3 flex items-center justify-center opacity-80 overflow-hidden">
                                 {audioWaveform.map((h, i) => (
                                    <div key={i} className="flex-1 mx-[0.5px] bg-green-500 rounded-full" style={{ height: `${h}%`, minWidth: '2px' }} />
                                 ))}
                              </div>
                           </div>
                        ))}
                        
                        {t.type === 'text' && projectClips.filter(c => c.type === 'text').map(c => (
                           <div key={c.id} className={cn(
                              "absolute h-14 top-1 rounded-md overflow-hidden border transition-all cursor-pointer flex flex-col",
                              activeClipId === c.id ? "border-white z-10 shadow-[0_0_0_1px_rgba(255,255,255,1)]" : "border-purple-500/50 hover:border-purple-400 bg-purple-500/10"
                           )}
                           style={{ left: `${c.start * zoom}px`, width: `${c.duration * zoom}px` }}
                           onClick={() => setActiveClipId(c.id)}
                           onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); setActiveClipId(c.id); setContextMenu({ x: e.clientX, y: e.clientY, type: 'clip', targetId: c.id }) }}
                           >
                              <div className="absolute inset-0 bg-purple-500/10" />
                              <div className="px-1.5 py-0.5 text-[9px] font-bold text-purple-200 z-10 truncate absolute top-0 w-full bg-black/30 backdrop-blur-sm">{c.title}</div>
                              <div className="flex-1 flex items-center justify-center p-1 pt-4 overflow-hidden">
                                 <span className="text-[10px] text-white truncate font-semibold">{c.text}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  ))}
               </div>
             </div>
            </div>
          </div>
       </div>

      {/* Context Menu Modal */}
      {contextMenu && (
         <div 
           className={cn("fixed z-50 w-48 rounded-md shadow-2xl border py-1 flex flex-col", borderCol, bgPanel)}
           style={{ left: contextMenu.x, top: contextMenu.y }}
         >
            {contextMenu.type === 'clip' ? (
               <>
                  <button onClick={() => { handleSplit(); setContextMenu(null) }} className={cn("px-4 py-1.5 text-left text-xs transition-colors", textHighlight, bgHover)}>Split (S)</button>
                  <button className={cn("px-4 py-1.5 text-left text-xs transition-colors", textHighlight, bgHover)}>Duplicate (Ctrl+D)</button>
                  <button onClick={() => { handleDelete(); setContextMenu(null) }} className={cn("px-4 py-1.5 text-left text-xs text-red-500 transition-colors", bgHover)}>Delete (Del)</button>
                  <div className={cn("w-full h-px my-1", borderCol)} />
                  <button className={cn("px-4 py-1.5 text-left text-xs transition-colors", textHighlight, bgHover)}>Detach Audio</button>
                  <button className={cn("px-4 py-1.5 text-left text-xs transition-colors", textHighlight, bgHover)}>Speed / Duration</button>
                  <div className={cn("w-full h-px my-1", borderCol)} />
                  <button className={cn("px-4 py-1.5 text-left text-xs transition-colors", textHighlight, bgHover)}>Properties</button>
               </>
            ) : (
               <>
                  <button className={cn("px-4 py-1.5 text-left text-xs transition-colors", textHighlight, bgHover)}>Paste (Ctrl+V)</button>
                  <button className={cn("px-4 py-1.5 text-left text-xs transition-colors", textHighlight, bgHover)}>Add Track</button>
               </>
            )}
         </div>
      )}
      
      {/* Export Modal */}
      <AnimatePresence>
         {showExport && (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
               <motion.div 
                  initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                  className={cn("w-full max-w-md rounded-xl border p-6 shadow-2xl", borderCol, bgPanel)}
               >
                  <h2 className={cn("text-lg font-bold mb-4", textHighlight)}>Export Video</h2>
                  
                  {exportError ? (
                     <div className="space-y-4 py-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4 border-2 border-red-500">
                           <X className="w-8 h-8" />
                        </div>
                        <h3 className={cn("font-bold text-red-500")}>Export Failed</h3>
                        <div className="text-left bg-red-500/10 p-3 rounded text-[10px] text-red-400 font-mono overflow-auto max-h-[150px] whitespace-pre-wrap">
                           {exportError}
                        </div>
                        <button onClick={() => { setExportError(''); setExportProgress(0); }} className="mt-4 px-6 py-2 bg-gray-600 text-white rounded text-sm font-semibold hover:bg-gray-700">Try Again</button>
                     </div>
                  ) : exportProgress === 0 ? (
                     <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className={cn("text-xs font-semibold", textMuted)}>Format</label>
                              <select value={exportFormat} onChange={e=>setExportFormat(e.target.value)} className={cn("w-full p-2 rounded border text-sm", borderCol, bgSidebar, textHighlight)}>
                                 <option value="mp4">MP4 (H264/H265)</option>
                                 <option value="mov">MOV (ProRes/H264)</option>
                                 <option value="webm">WebM (VP9)</option>
                                 <option value="gif">GIF</option>
                                 <option value="png_seq">PNG Sequence</option>
                                 <option value="mp3">Audio Only (MP3)</option>
                                 <option value="wav">WAV</option>
                                 <option value="aac">AAC</option>
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className={cn("text-xs font-semibold", textMuted)}>Resolution</label>
                              <select value={exportRes} onChange={e=>setExportRes(e.target.value)} className={cn("w-full p-2 rounded border text-sm", borderCol, bgSidebar, textHighlight)}>
                                 <option value="2160p">4K (2160p)</option>
                                 <option value="1440p">2K (1440p)</option>
                                 <option value="1080p">1080p (HD)</option>
                                 <option value="720p">720p</option>
                                 <option value="480p">480p</option>
                              </select>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className={cn("text-xs font-semibold", textMuted)}>Frame Rate</label>
                              <select value={exportFps} onChange={e=>setExportFps(e.target.value)} className={cn("w-full p-2 rounded border text-sm", borderCol, bgSidebar, textHighlight)}>
                                 <option value="60">60 fps</option>
                                 <option value="50">50 fps</option>
                                 <option value="30">30 fps</option>
                                 <option value="25">25 fps</option>
                                 <option value="24">24 fps</option>
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className={cn("text-xs font-semibold", textMuted)}>Codec</label>
                              <select value={exportCodec} onChange={e=>setExportCodec(e.target.value)} className={cn("w-full p-2 rounded border text-sm", borderCol, bgSidebar, textHighlight)}>
                                 <option value="h264">H.264</option>
                                 <option value="h265">H.265 (HEVC)</option>
                                 <option value="av1">AV1</option>
                              </select>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className={cn("text-xs font-semibold", textMuted)}>Export Range</label>
                           <select value={exportRange} onChange={e=>setExportRange(e.target.value as any)} className={cn("w-full p-2 rounded border text-sm", borderCol, bgSidebar, textHighlight)}>
                              <option value="entire">Entire Sequence</option>
                              {activeClipId && <option value="selected">Selected Clip Only</option>}
                           </select>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                           <button onClick={() => setShowExport(false)} className={cn("px-4 py-2 rounded text-sm font-semibold transition-colors", textMuted, bgHover)}>Cancel</button>
                           <button 
                             disabled={exportProgress > 0 && exportProgress < 100}
                             onClick={async () => {
                                if (!file) {
                                   alert("Original video file missing.");
                                   return;
                                }
                                setExportError('');
                                setExportProgress(10);
                                
                                const mainClip = projectClips.find(c => c.type === 'video');
                                const textClip = projectClips.find(c => c.type === 'text');
                                
                                const start_time = mainClip?.mediaStart || 0;
                                const end_time = mainClip?.mediaEnd || (mainClip ? mainClip.duration : videoDuration);
                                
                                const formData = new FormData();
                                formData.append("video", file);
                                formData.append("start_time", start_time.toString());
                                formData.append("end_time", end_time.toString());
                                formData.append("aspect_ratio", aspectRatio);
                                
                                if (textClip) {
                                   // Send captions style and chunks
                                   formData.append("captions", JSON.stringify(textClip));
                                   if (previewContainerRef.current) {
                                       formData.append("canvas_width", previewContainerRef.current.clientWidth.toString());
                                       formData.append("canvas_height", previewContainerRef.current.clientHeight.toString());
                                   }
                                }

                                // Mock progress while waiting
                                const int = setInterval(() => {
                                   setExportProgress(p => p < 90 ? p + 5 : p);
                                }, 2000);

                                try {
                                   const res = await fetch("/api/video/export", {
                                      method: "POST",
                                      body: formData
                                   });
                                   
                                   clearInterval(int);
                                   
                                   if (!res.ok) {
                                      let errText = "Export failed";
                                      try {
                                         const err = await res.json();
                                         errText = err.error || errText;
                                      } catch (e) {
                                         errText = `Server returned status ${res.status}: ${res.statusText}`;
                                      }
                                      throw new Error(errText);
                                   }
                                   
                                   const blob = await res.blob();
                                   const url = URL.createObjectURL(blob);
                                   const a = document.createElement('a');
                                   a.href = url;
                                   a.download = `Skillizee_Export_${Date.now()}.mp4`;
                                   a.click();
                                   
                                   setExportProgress(100);
                                } catch (err: any) {
                                   clearInterval(int);
                                   console.error(err);
                                   setExportError(err.message || "An unknown error occurred");
                                   setExportProgress(0);
                                }
                             }}
                             className="px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded text-sm font-semibold transition-colors disabled:opacity-50"
                           >
                              Start Export
                           </button>
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-4 py-4 text-center">
                        {exportProgress < 100 ? (
                           <div className="w-16 h-16 rounded-full border-4 border-[#6366F1] border-t-transparent animate-spin mx-auto mb-4" />
                        ) : (
                           <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-4 border-2 border-green-500">
                              <Check className="w-8 h-8" />
                           </div>
                        )}
                        <h3 className={cn("font-bold", textHighlight)}>{exportProgress < 100 ? 'Rendering Video (This may take a minute)...' : 'Export Complete!'}</h3>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-2">
                           <div className="h-full bg-[#6366F1] transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                        </div>
                        <p className={cn("text-xs", textMuted)}>{exportProgress}% Complete</p>
                        
                        {exportProgress >= 100 && (
                           <button onClick={() => { setShowExport(false); setExportProgress(0) }} className="mt-4 px-6 py-2 bg-[#6366F1] text-white rounded text-sm font-semibold">Done</button>
                        )}
                     </div>
                  )}
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

    </div>
  )
}
