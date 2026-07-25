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
   Moon, Expand, Minimize, Command, X, ChevronUp, ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import WaveSurfer from 'wavesurfer.js'

const WaveformTrack = ({ fileUrl, width }: { fileUrl: string, width: number }) => {
   const containerRef = useRef<HTMLDivElement>(null)
   useEffect(() => {
      if (!containerRef.current || !fileUrl) return
      const ws = WaveSurfer.create({
         container: containerRef.current,
         waveColor: 'rgba(34, 197, 94, 0.4)',
         progressColor: 'rgba(34, 197, 94, 0.9)',
         url: fileUrl,
         height: 38,
         barWidth: 2,
         barGap: 1,
         barRadius: 2,
         interact: false,
         cursorWidth: 0,
         normalize: true,
      })
      return () => {
         ws.destroy()
      }
   }, [fileUrl])

   return (
      <div className="absolute inset-0 top-4 bottom-1 px-1 flex items-center overflow-hidden opacity-90">
         <div ref={containerRef} style={{ width: width - 8 }} />
      </div>
   )
}

const CopyButton = ({ text }: { text: string }) => {
   const [copied, setCopied] = useState(false);
   return (
      <button
         onClick={() => {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
         }}
         className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors ml-1 inline-flex items-center justify-center"
         title="Copy to clipboard"
      >
         {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-[#6366F1]" />}
      </button>
   );
};


export function StudioView({ file, fileKey, fileUrl, clips: initialClips, initialCaptions, initialCuts, onBack }: any) {
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
   const [leftTab, setLeftTab] = useState<'media' | 'audio' | 'text' | 'ai' | 'social' | 'effects'>('media')

   // Right Panel - Inspector
   const [showProperties, setShowProperties] = useState(false)

   // Timeline State
   const [timelineHeight, setTimelineHeight] = useState(300)
   const [zoom, setZoom] = useState(100)
   const [tracks, setTracks] = useState([
      { id: 'v4', type: 'overlay', name: 'Overlays', locked: false, hidden: false, muted: false },
      { id: 'v3', type: 'cut', name: 'Camera Cuts', locked: false, hidden: false, muted: false },
      { id: 'v2', type: 'text', name: 'Captions', locked: false, hidden: false, muted: false },
      { id: 'v1', type: 'video', name: 'Video 1', locked: false, hidden: false, muted: false },
      { id: 'a1', type: 'audio', name: 'Audio 1', locked: false, hidden: false, muted: false }
   ])

   // AI Clips & Project Clips
   const [aiClips, setAiClips] = useState(initialClips.length > 0 ? initialClips : [])
   const [projectClips, setProjectClips] = useState<any[]>(() => {
      const defaultClips: any[] = [{ id: 'c1', trackId: 'v1', type: 'video', start: 0, end: 15, duration: 15, title: 'Podcast Source' }];

      if (initialCuts && initialCuts.length > 0) {
         initialCuts.forEach((cut: any, index: number) => {
            if (cut.start < 15) {
               defaultClips.push({
                  id: 'cut_' + index,
                  trackId: 'v3',
                  type: 'cut',
                  start: cut.start,
                  end: Math.min(cut.end, 15),
                  duration: Math.min(cut.end, 15) - cut.start,
                  title: cut.speaker === 'left' ? 'Speaker A (Crop)' : 'Speaker B (Crop)',
                  cx_percent: cut.cx_percent !== undefined ? cut.cx_percent : 0.5,
                  crop_y: cut.crop_y || 0
               });
            }
         });
      } else {
         // Add mock camera cuts for 9:16 layout
         defaultClips.push(
            { id: 'cut1', trackId: 'v3', type: 'cut', start: 0, end: 4.5, duration: 4.5, title: 'Speaker A (Crop)', cx_percent: 0.25, crop_y: 0 },
            { id: 'cut2', trackId: 'v3', type: 'cut', start: 4.5, end: 9.2, duration: 4.7, title: 'Speaker B (Crop)', cx_percent: 0.75, crop_y: 0 },
            { id: 'cut3', trackId: 'v3', type: 'cut', start: 9.2, end: 15.0, duration: 5.8, title: 'Speaker A (Crop)', cx_percent: 0.25, crop_y: 0 }
         );
      }

      return defaultClips;
   });
   const [activeClipId, setActiveClipId] = useState<string | null>('c1')

   // History
   const [history, setHistory] = useState<any[]>([])
   const [historyIndex, setHistoryIndex] = useState(-1)

   // UI States
   const [showSafeMargins, setShowSafeMargins] = useState(false)
   const [playbackSpeed, setPlaybackSpeed] = useState(1)

   const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false)
   const [captionsGenerated, setCaptionsGenerated] = useState(!!(initialCaptions && initialCaptions.length > 0))

   const [uploadedMedia, setUploadedMedia] = useState<{ id: string, name: string, url: string, type: 'audio' | 'image' | 'video' }[]>([])
   const fileInputRef = useRef<HTMLInputElement>(null)

   const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      const newMedia = Array.from(e.target.files).map(file => ({
         id: 'media_' + Date.now() + Math.random(),
         name: file.name,
         url: URL.createObjectURL(file),
         type: file.type.startsWith('image') ? 'image' : file.type.startsWith('audio') ? 'audio' : 'video' as any
      }));
      setUploadedMedia(p => [...p, ...newMedia]);
   };

   const activeClip = projectClips.find(c => c.id === activeClipId)

   const updateActiveClipTransform = (newTransform: Partial<Transform>) => {
      setProjectClips(prev => prev.map(c => {
         if (c.id === activeClipId) {
            const baseT = c.transform || { x: 50, y: 50, width: 200, height: 200, scale: 100, rotation: 0, opacity: 100, zIndex: 50 };
            return { ...c, transform: { ...baseT, ...newTransform } as Transform };
         }
         return c;
      }));
   }

   const updateActiveClipStyle = (updates: any) => {
      setProjectClips(prev => prev.map(c => c.id === activeClipId ? { ...c, style: { ...c.style, ...updates } } : c));
   }

   // Context Menu
   const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: string, targetId: string } | null>(null)

   // Real Thumbnails
   const [thumbnails, setThumbnails] = useState<string[]>([])

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
         for (let i = 0; i < count; i++) {
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

      generate();
      return () => { isMounted = false; }
   }, [fileUrl, videoDuration])

   // Export Modal
   const [showExport, setShowExport] = useState(false)
   const [exportProgress, setExportProgress] = useState(0)
   const [exportRange, setExportRange] = useState<'entire' | 'selected'>('entire')
   const [exportFormat, setExportFormat] = useState('mp4')
   const [exportRes, setExportRes] = useState('1080p')
   const [exportFps, setExportFps] = useState('30')
   const [exportCodec, setExportCodec] = useState('h264')
   const [exportError, setExportError] = useState('')
   const [autoSilenceRemove, setAutoSilenceRemove] = useState(true)
   const [addSoundDesign, setAddSoundDesign] = useState(true)
   const [bouncyText, setBouncyText] = useState(true)
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
               if (parsed.transform) {
                  parsed.transform = { x: 50, y: 50, width: 200, height: 200, scale: 100, rotation: 0, opacity: 100, zIndex: 50, ...parsed.transform };
                  parsed.transform.y += 20;
               }
               setProjectClips(p => [...p, parsed]);
               setActiveClipId(parsed.id);
            }
         } else if (e.code === 'KeyD' && e.ctrlKey) {
            e.preventDefault();
            if (activeClip) {
               const dupe = JSON.parse(JSON.stringify(activeClip));
               dupe.id = 'c_' + Date.now();
               if (dupe.transform) {
                  dupe.transform = { x: 50, y: 50, width: 200, height: 200, scale: 100, rotation: 0, opacity: 100, zIndex: 50, ...dupe.transform };
                  dupe.transform.x += 20;
                  dupe.transform.y += 20;
               }
               setProjectClips(p => [...p, dupe]);
               setActiveClipId(dupe.id);
            }
         } else if (e.key.startsWith('Arrow') && activeClip?.transform) {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            const newT = { x: 50, y: 50, width: 200, height: 200, scale: 100, rotation: 0, opacity: 100, zIndex: 50, ...activeClip.transform };
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
      <div className={cn("flex-1 w-full flex flex-col font-sans overflow-hidden text-sm transition-colors duration-300 relative", bgMain, textMain, isFullscreen ? "fixed inset-0 z-50 h-screen" : "h-[calc(100vh-4rem)]")}>

         {/* Auto-Hide Top Bar Wrapper */}
         <div className="absolute top-0 inset-x-0 z-[60] flex flex-col transform -translate-y-[calc(100%-8px)] hover:translate-y-0 transition-transform duration-300 ease-in-out">
            <header className={cn("h-12 border-b flex items-center justify-between px-4 shrink-0 shadow-lg", borderCol, bgPanel)}>
               <div className="flex items-center gap-4">
                  <button onClick={() => onBack?.()} className={cn("transition-colors", textMuted, `hover:${textHighlight}`)}><ArrowLeft className="w-4 h-4" /></button>
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
                  <button onClick={handleUndo} className={cn("p-1.5 rounded transition-colors", textMuted, bgHover)}><Undo className="w-4 h-4" /></button>
                  <button className={cn("p-1.5 rounded transition-colors", textMuted, bgHover)}><Redo className="w-4 h-4" /></button>
                  <button onClick={() => setShowProperties(!showProperties)} className={cn("p-1.5 rounded transition-colors", textMuted, bgHover, showProperties && textHighlight)}>
                     <SlidersHorizontal className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowExport(true)} className="flex items-center justify-center bg-[#6366F1] hover:bg-[#4F46E5] text-white w-7 h-7 rounded transition-colors" title="Export">
                     <Download className="w-4 h-4" />
                  </button>
               </div>
            </header>
            {/* Hover Trigger Zone */}
            <div className="h-6 w-full bg-transparent" />
         </div>

         {/* Main Layout */}
         <div className="flex-1 flex overflow-hidden min-h-[250px] pt-2">

            {/* Left Asset Manager */}
            <aside className={cn("w-80 flex flex-col border-r shrink-0 overflow-hidden", borderCol, bgSidebar)}>
               <div className={cn("flex px-2 pt-2 gap-1 border-b", borderCol)}>
                  {[
                     { id: 'media', icon: FolderOpen, label: 'Media' },
                     { id: 'text', icon: Type, label: 'Text' },
                     { id: 'ai', icon: Sparkles, label: 'AI Clips' },
                     { id: 'social', icon: Flame, label: 'Viral Content' },
                     { id: 'effects', icon: Wand2, label: 'Effects' }
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
                           <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleMediaUpload} accept="image/*,video/*,audio/*" />
                           <button onClick={() => fileInputRef.current?.click()} className={cn("flex-1 border border-dashed py-4 rounded flex flex-col items-center justify-center gap-1 transition-colors", borderCol, bgPanel, textMuted, theme === 'dark' ? "hover:border-[#666]" : "hover:border-gray-400")}>
                              <UploadCloud className="w-5 h-5 mb-1" />
                              <span className="text-[10px] font-semibold">Upload File</span>
                           </button>
                        </div>
                        <div className="flex flex-col gap-2">
                           {fileUrl && (
                              <div className={cn("aspect-video rounded bg-black flex items-center justify-center relative group overflow-hidden border cursor-pointer", borderCol)}>
                                 {thumbnails.length > 0 ? (
                                    <img src={thumbnails[0]} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                 ) : (
                                    <video src={fileUrl} className="w-full h-full object-cover opacity-50" />
                                 )}
                                 <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex justify-between">
                                    <span className="text-[8px] text-white truncate max-w-[80px]">{file?.name || 'Main Video'}</span>
                                    <span className="text-[8px] text-white">HD</span>
                                 </div>
                              </div>
                           )}
                           {uploadedMedia.map(m => (
                              <div key={m.id} onClick={() => {
                                 setProjectClips(p => {
                                    const tId = m.type === 'audio' ? 'a1' : 'v4';
                                    const start = currentTime;
                                    return [...p, { id: m.id + '_' + Date.now(), trackId: tId, type: m.type, start, duration: 5, title: m.name, mediaUrl: m.url, transform: { x: 50, y: 50, scale: 100, rotation: 0, zIndex: 50, opacity: 100 } }];
                                 })
                              }} className={cn("h-16 rounded bg-black flex items-center relative group overflow-hidden border cursor-pointer transition-colors hover:border-blue-500", borderCol)}>
                                 {m.type === 'image' ? (
                                    <img src={m.url} className="h-full w-24 object-cover" />
                                 ) : m.type === 'video' ? (
                                    <video src={m.url} className="h-full w-24 object-cover" />
                                 ) : (
                                    <div className="h-full w-24 flex items-center justify-center bg-green-500/20 text-green-400"><AudioWaveform className="w-6 h-6" /></div>
                                 )}
                                 <div className="flex-1 px-3 py-2 flex flex-col justify-center">
                                    <span className="text-xs font-semibold text-white truncate">{m.name}</span>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">{m.type}</span>
                                 </div>
                                 <div className="absolute inset-y-0 right-0 w-10 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 backdrop-blur transition-opacity">
                                    <Plus className="w-4 h-4 text-white" />
                                 </div>
                              </div>
                           ))}
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
                                 {fileUrl && (
                                    <video
                                       src={`${fileUrl}#t=${clip.start_time || 0.1}`}
                                       className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                                       preload="metadata"
                                    />
                                 )}
                                 <Play className="relative z-10 w-6 h-6 text-white/70 group-hover:text-white transition-colors drop-shadow-md" />
                                 <div className="absolute z-10 top-2 right-2 bg-black/60 px-1.5 rounded text-[10px] text-white drop-shadow-md">
                                    {clip.time}
                                 </div>
                              </div>
                              <h4 className={cn("font-semibold text-xs mb-1 line-clamp-1", textHighlight)}>{clip.title}</h4>
                              {clip.hashtags && (
                                 <p className="text-[9px] text-[#6366F1] font-semibold mb-2 line-clamp-2 leading-tight">
                                    {clip.hashtags}
                                 </p>
                              )}
                              <div className={cn("flex justify-between text-[10px]", textMuted)}>
                                 <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" /> Score: {clip.score}</span>
                                 <span>{clip.category}</span>
                              </div>
                              <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => {
                                    const duration = (clip.end_time || 15) - (clip.start_time || 0);
                                    setVideoDuration(duration);
                                    const mediaStart = clip.start_time || 0;
                                    const mediaEnd = clip.end_time || 15;

                                    const newClips: any[] = [{
                                       id: 'c' + Date.now(),
                                       trackId: 'v1',
                                       type: 'video',
                                       start: 0,
                                       end: duration,
                                       duration: duration,
                                       title: clip.title || 'AI Clip',
                                       mediaStart: mediaStart,
                                       mediaEnd: mediaEnd
                                    }];

                                    if (clip.captions && clip.captions.length > 0) {
                                       const shiftedChunks = clip.captions;

                                       let preset = 'hormozi';
                                       if (clip.caption_style) {
                                          const styleStr = clip.caption_style.toLowerCase();
                                          if (styleStr.includes('minimal')) preset = 'minimalist';
                                          else if (styleStr.includes('bold')) preset = 'beast';
                                          else if (styleStr.includes('youtube')) preset = 'youtube';
                                          else if (styleStr.includes('tiktok')) preset = 'tiktok';
                                       }

                                       newClips.push({
                                          id: 'cap_' + Date.now(),
                                          trackId: 'v2', type: 'text',
                                          start: 0,
                                          end: duration,
                                          duration: duration,
                                          title: 'Auto Captions',
                                          text: '',
                                          chunks: shiftedChunks,
                                          transform: { x: 0, y: 150, width: 600, height: 60, scale: 100, rotation: 0 },
                                          style: { fontFamily: 'Inter', fontSize: 48, preset: preset }
                                       });
                                       setCaptionsGenerated(true);
                                    } else {
                                       setCaptionsGenerated(false);
                                    }

                                    if (initialCuts && initialCuts.length > 0) {
                                       const validCuts = initialCuts.filter((c: any) => c.end > mediaStart && c.start < mediaEnd);
                                       validCuts.forEach((cut: any, idx: number) => {
                                          const shiftedStart = Math.max(0, cut.start - mediaStart);
                                          const shiftedEnd = Math.min(duration, cut.end - mediaStart);
                                          if (shiftedEnd > shiftedStart) {
                                             newClips.push({
                                                id: 'cut_' + Date.now() + '_' + idx,
                                                trackId: 'v3',
                                                type: 'cut',
                                                start: shiftedStart,
                                                end: shiftedEnd,
                                                duration: shiftedEnd - shiftedStart,
                                                title: `Camera: ${cut.speaker || 'Focus'}`,
                                                cx_percent: cut.cx_percent !== undefined ? cut.cx_percent : 0.5,
                                                crop_y: cut.crop_y || 0
                                             });
                                          }
                                       });
                                    } else {
                                       // Auto-generate mock camera shifts if no real AI tracking data is available
                                       let currentCutTime = 0;
                                       let cutIdx = 1;
                                       while (currentCutTime < duration) {
                                          const cutDuration = Math.min(duration - currentCutTime, 3.5 + Math.random() * 2);
                                          const isSpeakerA = cutIdx % 2 !== 0;
                                          newClips.push({
                                             id: 'cut_' + Date.now() + '_' + cutIdx,
                                             trackId: 'v3',
                                             type: 'cut',
                                             start: currentCutTime,
                                             end: currentCutTime + cutDuration,
                                             duration: cutDuration,
                                             title: isSpeakerA ? 'Speaker A (Crop)' : 'Speaker B (Crop)',
                                             cx_percent: isSpeakerA ? 0.25 : 0.75,
                                             crop_y: 0
                                          });
                                          currentCutTime += cutDuration;
                                          cutIdx++;
                                       }
                                    }
                                    setProjectClips(newClips);
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
                              <p className={cn("text-xs mb-4 max-w-[200px]", textMuted)}>Click below to add the AI-generated captions to your timeline.</p>
                              <button
                                 onClick={() => {
                                    if (!activeClip || activeClip.type !== 'video') {
                                       alert("Please select a video clip first.");
                                       return;
                                    }

                                    const sourceClip = aiClips.find((c: any) => c.start_time === activeClip.mediaStart);
                                    if (!sourceClip || !sourceClip.captions || sourceClip.captions.length === 0) {
                                       alert("No captions were generated for this clip.");
                                       return;
                                    }

                                    const newCaptionClip = {
                                       id: 'cap_' + Date.now(),
                                       trackId: 'v2', type: 'text',
                                       start: activeClip.start,
                                       end: activeClip.start + activeClip.duration,
                                       duration: activeClip.duration,
                                       title: 'Auto Captions',
                                       text: '',
                                       chunks: sourceClip.captions,
                                       transform: { x: 0, y: 150, width: 600, height: 60, scale: 100, rotation: 0 },
                                       style: { fontFamily: 'Inter', fontSize: 48, preset: 'dark' }
                                    };

                                    setProjectClips(p => [...p, newCaptionClip]);
                                    setActiveClipId(newCaptionClip.id);
                                    setCaptionsGenerated(true);
                                 }}
                                 className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold px-4 py-2 rounded flex items-center gap-2"
                              >
                                 <Sparkles className="w-3 h-3" />
                                 Add Captions to Timeline
                              </button>
                           </>
                        ) : (
                           <div className="w-full text-left">
                              <h3 className="text-xs font-semibold text-[#10B981] mb-2 flex items-center gap-1"><Check className="w-3 h-3" /> Captions Ready</h3>
                              <p className={cn("text-[10px] mb-4", textMuted)}>Captions have been added to track V2. Select them in the timeline to edit styles.</p>
                              <button onClick={() => {
                                 setProjectClips(p => p.filter(c => c.type !== 'text'));
                                 setCaptionsGenerated(false);
                              }} className="text-[10px] text-red-400 hover:text-red-500">Remove Captions</button>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Social Content Tab */}
                  {leftTab === 'social' && (
                     <div className="space-y-6">
                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-4", textHighlight)}>Viral Content for Selected Clip</h3>
                        {(() => {
                           let socialClip = null;
                           let targetVideoClip = activeClip;

                           // If a text clip is selected (like Captions) or nothing is selected, find the relevant video clip
                           if (!targetVideoClip || targetVideoClip.type !== 'video') {
                              targetVideoClip = projectClips.find(c => c.type === 'video' && currentTime >= c.start && currentTime <= c.start + c.duration) || projectClips.find(c => c.type === 'video');
                           }

                           if (targetVideoClip && targetVideoClip.type === 'video') {
                              socialClip = aiClips.find((c: any) => c.title === targetVideoClip?.title);
                              if (!socialClip && aiClips.length > 0 && (targetVideoClip.title === 'Podcast Source' || targetVideoClip.title === 'Auto Captions')) {
                                 socialClip = aiClips[0];
                              }
                           }

                           if (!socialClip) {
                              return (
                                 <div className={cn("text-xs text-center p-4", textMuted)}>
                                    {aiClips.length === 0
                                       ? "No hooks or captions generated yet. Upload and analyze a video first!"
                                       : "Please select an AI-generated clip in the timeline to view its viral content."}
                                 </div>
                              );
                           }

                           return (
                              <div className={cn("w-full p-3 rounded-lg border text-left flex flex-col gap-3", bgPanel, borderCol)}>
                                 <div>
                                    <div className="flex items-center justify-between mb-1">
                                       <span className={cn("text-[9px] font-bold uppercase tracking-wider", textMuted)}>Viral Title</span>
                                       <CopyButton text={socialClip.title} />
                                    </div>
                                    <p className={cn("text-xs font-semibold", textHighlight)}>{socialClip.title}</p>
                                 </div>
                                 <div>
                                    <div className="flex items-center justify-between mb-1">
                                       <span className={cn("text-[9px] font-bold uppercase tracking-wider", textMuted)}>The Hook</span>
                                       <CopyButton text={socialClip.reason} />
                                    </div>
                                    <p className={cn("text-[10px]", textMuted)}>{socialClip.reason}</p>
                                 </div>
                                 {socialClip.caption_text && (
                                    <div>
                                       <div className="flex items-center justify-between mb-1">
                                          <span className={cn("text-[9px] font-bold uppercase tracking-wider text-[#6366F1]")}>On-Screen Caption</span>
                                          <CopyButton text={socialClip.caption_text} />
                                       </div>
                                       <p className={cn("text-[10px] font-semibold text-[#6366F1]")}>{socialClip.caption_text}</p>
                                    </div>
                                 )}
                                 {socialClip.instagram_caption && (
                                    <div>
                                       <div className="flex items-center justify-between mb-1">
                                          <span className={cn("text-[9px] font-bold uppercase tracking-wider", textMuted)}>Social Caption</span>
                                          <CopyButton text={socialClip.instagram_caption} />
                                       </div>
                                       <p className={cn("text-[10px] whitespace-pre-wrap", textMuted)}>{socialClip.instagram_caption}</p>
                                    </div>
                                 )}
                                 {socialClip.hashtags && (
                                    <div>
                                       <div className="flex items-center justify-between mb-1">
                                          <span className={cn("text-[9px] font-bold uppercase tracking-wider text-[#6366F1]")}>Hashtags</span>
                                          <CopyButton text={socialClip.hashtags} />
                                       </div>
                                       <p className={cn("text-[10px] font-semibold text-[#6366F1]")}>{socialClip.hashtags}</p>
                                    </div>
                                 )}
                                 {socialClip.broll && socialClip.broll.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-700/30">
                                       <span className={cn("text-[9px] font-bold uppercase tracking-wider text-pink-500 mb-2 block")}>Suggested B-Roll</span>
                                       <div className="flex flex-col gap-2">
                                          {socialClip.broll.map((br: any, idx: number) => (
                                             <div
                                                key={idx}
                                                className="bg-black/20 p-2 rounded flex gap-2 items-start cursor-grab active:cursor-grabbing hover:bg-black/40 transition-colors"
                                                draggable
                                                onDragStart={(e) => {
                                                   e.dataTransfer.setData('application/json', JSON.stringify({
                                                      type: 'broll',
                                                      url: `https://image.pollinations.ai/prompt/${encodeURIComponent(br.keyword)}?width=1080&height=1920&nologo=true`,
                                                      keyword: br.keyword,
                                                      start: br.start_time
                                                   }));
                                                }}
                                             >
                                                <img src={`https://image.pollinations.ai/prompt/${encodeURIComponent(br.keyword)}?width=150&height=150&nologo=true`} className="w-12 h-12 rounded object-cover shrink-0 bg-black/40 pointer-events-none" alt={br.keyword} />
                                                <div className="flex-1 pointer-events-none">
                                                   <p className="text-[10px] font-semibold text-white">"{br.keyword}"</p>
                                                   <p className="text-[9px] text-gray-400 mt-1">@ {br.start_time.toFixed(1)}s (for {br.duration}s)</p>
                                                   <p className="text-[8px] text-[#6366F1] mt-1 opacity-80">Drag onto video →</p>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    </div>
                                 )}
                              </div>
                           );
                        })()}
                     </div>
                  )}

                  {/* Additional Features Tab */}
                  {leftTab === 'effects' && (
                     <div className="space-y-6">
                        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-4", textHighlight)}>Video Effects</h3>
                        <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[400px] pr-1 scrollbar-thin">
                           {[
                              { id: 'reset', name: 'Reset All', icon: RotateCcw, filter: 'none', transform: { scale: 1, scaleX: 1, scaleY: 1 } },
                              { id: 'zoom', name: 'Zoom In', icon: ZoomIn, transform: { scale: 1.2 } },
                              { id: 'zoom-out', name: 'Zoom Out', icon: ZoomOut, transform: { scale: 0.8 } },
                              { id: 'mirror', name: 'Mirror Flip', icon: SplitSquareHorizontal, transform: { scaleX: -1 } },
                              { id: 'flip-v', name: 'Flip Vert', icon: Move, transform: { scaleY: -1 } },
                              { id: 'cinematic', name: 'Cinematic', icon: Film, filter: 'brightness(0.9) contrast(1.2) saturate(1.3)' },
                              { id: 'vintage', name: 'Vintage', icon: ImageIcon, filter: 'sepia(0.6) contrast(1.1)' },
                              { id: 'bw', name: 'B & W', icon: Contrast, filter: 'grayscale(100%)' },
                              { id: 'cyberpunk', name: 'Cyberpunk', icon: Zap, filter: 'hue-rotate(90deg) saturate(1.5) contrast(1.1)' },
                              { id: 'warm', name: 'Warm Tone', icon: Sun, filter: 'sepia(0.3) saturate(1.2)' },
                              { id: 'cool', name: 'Cool Tone', icon: Moon, filter: 'hue-rotate(-20deg) saturate(1.1)' },
                              { id: 'high-contrast', name: 'High Contrast', icon: Contrast, filter: 'contrast(1.5)' },
                              { id: 'bright', name: 'Brighten', icon: Sun, filter: 'brightness(1.2)' },
                              { id: 'dark', name: 'Darken', icon: Moon, filter: 'brightness(0.8)' },
                              { id: 'blur', name: 'Blur Focus', icon: EyeOff, filter: 'blur(4px)' },
                              { id: 'invert', name: 'Invert', icon: Sparkles, filter: 'invert(100%)' },
                              { id: 'saturate', name: 'Super Color', icon: Flame, filter: 'saturate(2)' },
                              { id: 'b-roll', name: 'B-Roll FX', icon: Film, filter: 'grayscale(50%) brightness(0.7)' },
                           ].map(effect => {
                              return (
                                 <button
                                    key={effect.id}
                                    onClick={() => {
                                       setProjectClips(prev => prev.map(c => {
                                          if (c.type === 'video') {
                                             const currentFilter = c.style?.filters || 'none';
                                             const currentScale = c.transform?.scale ?? 1;
                                             const currentScaleX = c.transform?.scaleX ?? 1;
                                             const currentScaleY = c.transform?.scaleY ?? 1;

                                             let newFilter = currentFilter;
                                             let newTransform = { ...(c.transform || { scale: 1, scaleX: 1, scaleY: 1 }) };

                                             if (effect.id === 'reset') {
                                                newFilter = 'none';
                                                newTransform = { ...newTransform, scale: 1, scaleX: 1, scaleY: 1 };
                                             } else {
                                                if (effect.filter !== undefined) {
                                                   if (currentFilter === effect.filter) {
                                                      newFilter = 'none';
                                                   } else {
                                                      newFilter = effect.filter;
                                                   }
                                                }

                                                if (effect.transform) {
                                                   let isApplied = true;
                                                   if (effect.transform.scale !== undefined && currentScale !== effect.transform.scale) isApplied = false;
                                                   if (effect.transform.scaleX !== undefined && currentScaleX !== effect.transform.scaleX) isApplied = false;
                                                   if (effect.transform.scaleY !== undefined && currentScaleY !== effect.transform.scaleY) isApplied = false;

                                                   if (isApplied) {
                                                      if (effect.transform.scale !== undefined) newTransform.scale = 1;
                                                      if (effect.transform.scaleX !== undefined) newTransform.scaleX = 1;
                                                      if (effect.transform.scaleY !== undefined) newTransform.scaleY = 1;
                                                   } else {
                                                      newTransform = { ...newTransform, ...effect.transform };
                                                   }
                                                }
                                             }

                                             return {
                                                ...c,
                                                style: {
                                                   ...c.style,
                                                   filters: newFilter,
                                                },
                                                transform: newTransform
                                             }
                                          }
                                          return c;
                                       }));
                                    }}
                                    className={cn("p-2 rounded border text-center transition-colors flex flex-col items-center justify-center gap-1", bgMain, borderCol, "hover:border-[#6366F1] hover:bg-[#6366F1]/10")}
                                 >
                                    <effect.icon className={cn("w-4 h-4 mb-1", textMuted, "group-hover:text-[#6366F1]")} />
                                    <span className={cn("text-[9px] font-semibold truncate w-full", textHighlight)}>{effect.name}</span>
                                 </button>
                              );
                           })}
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

                  <div
                     ref={previewContainerRef}
                     style={{ containerType: 'inline-size' }}
                     className={cn("relative bg-black rounded-lg shadow-2xl h-full max-h-full max-w-full overflow-hidden flex-shrink-0 mx-auto", aspectMap[aspectRatio] || 'aspect-video')}
                     onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                     }}
                     onDrop={(e) => {
                        e.preventDefault();
                        const data = e.dataTransfer.getData('application/json');
                        if (data) {
                           try {
                              const parsed = JSON.parse(data);
                              if (parsed.type === 'broll') {
                                 const mainClip = projectClips.find(c => c.type === 'video');
                                 const baseStart = mainClip?.start || 0;
                                 setProjectClips(prev => [...prev, {
                                    id: 'broll_' + Date.now(),
                                    trackId: 'v4',
                                    type: 'image',
                                    start: currentTime + baseStart,
                                    duration: 3.0,
                                    title: `B-Roll: ${parsed.keyword.substring(0, 15)}...`,
                                    mediaUrl: parsed.url,
                                    transform: { x: 50, y: 50, width: 1080, height: 1920, scale: 100, rotation: 0, opacity: 100, zIndex: 60 }
                                 }]);
                              }
                           } catch (err) { }
                        }
                     }}
                  >
                     {fileUrl && (() => {
                        const cameraCuts = projectClips.filter(c => c.type === 'cut');
                        const activeCut = cameraCuts.find(c => currentTime >= c.start && currentTime <= c.end);
                        let objectPosition = 'center';
                        let objectFit = 'object-contain';

                        if (aspectRatio === '9:16' || aspectRatio === '1:1' || aspectRatio === '4:5') {
                           objectFit = 'object-cover';
                           if (aspectRatio === '9:16' && activeCut && activeCut.cx_percent !== undefined) {
                              // Correct math for object-position:
                              // We want cx_percent of the video to be at 50% of the container.
                              // Let R = container_width / video_width = (9/16) / (16/9) = 0.3164
                              const R = 0.3164;
                              const P = (activeCut.cx_percent - 0.5 * R) / (1 - R);
                              const percent = P * 100;
                              objectPosition = `${Math.min(100, Math.max(0, percent))}% center`;
                           } else {
                              objectPosition = '50% center';
                           }
                        }

                        return (
                           <video
                              ref={videoRef}
                              src={fileUrl}
                              style={{
                                 filter: projectClips.find(c => c.type === 'video')?.style?.filters || 'none',
                                 transform: `
                         scale(${projectClips.find(c => c.type === 'video')?.transform?.scale || 1}) 
                         scaleX(${projectClips.find(c => c.type === 'video')?.transform?.scaleX || 1})
                         scaleY(${projectClips.find(c => c.type === 'video')?.transform?.scaleY || 1})
                       `,
                                 objectPosition
                              }}
                              className={`w-full h-full ${objectFit}`}
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
                                    const loadedDuration = e.currentTarget.duration;
                                    setVideoDuration(loadedDuration);
                                    setProjectClips(prev => prev.map(c => {
                                       if (c.title === 'Podcast Source' || c.title === 'Auto Captions') {
                                          return { ...c, end: loadedDuration, duration: loadedDuration };
                                       }
                                       return c;
                                    }));
                                 }
                              }}
                              loop
                           />
                        );
                     })()}

                     {/* Canvas Elements */}
                     {projectClips.filter(c => c.type === 'text' && currentTime >= c.start && currentTime <= (c.start + c.duration)).map(clip => {
                        let displayText = clip.text || "(Caption Placeholder)";
                        let isVisible = true;

                        let activeChunk: any = null;
                        let displayWords: any[] = [];
                        if (clip.chunks && clip.chunks.length > 0) {
                           activeChunk = clip.chunks.find((ch: any) => currentTime >= ch.start && currentTime <= ch.end);
                           if (activeChunk) {
                              displayText = activeChunk.text;
                              if (activeChunk.words && activeChunk.words.length > 0) {
                                 displayWords = activeChunk.words;
                              } else if (activeChunk.text) {
                                 // Generate synthetic word timings for karaoke effect
                                 const wordsArr = activeChunk.text.trim().split(/\s+/);
                                 const duration = activeChunk.end - activeChunk.start;
                                 const timePerWord = duration / Math.max(1, wordsArr.length);
                                 displayWords = wordsArr.map((w: string, i: number) => ({
                                    word: w,
                                    start: activeChunk.start + (i * timePerWord),
                                    end: activeChunk.start + ((i + 1) * timePerWord)
                                 }));
                              }
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
                              transform={clip.transform || { x: 0, y: 150, width: 600, height: 60, scale: 100, rotation: 0 }}
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
                                    maxWidth: '100%',
                                    width: '100%',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '10px',
                                    opacity: isVisible ? 1 : (isSelected ? 0.5 : 0),
                                    lineHeight: '1.2',
                                    paintOrder: 'stroke fill',
                                    WebkitFontSmoothing: 'antialiased'
                                 };

                                 let activeColor = '#FFD700'; // Default Yellow
                                 let inactiveColor = 'white';
                                 let activeScale = 1.1;

                                 if (preset === 'hormozi' || preset === 'opus') {
                                    baseStyle.fontFamily = 'Montserrat, sans-serif';
                                    baseStyle.fontSize = `${baseFontSize}px`;
                                    baseStyle.fontWeight = 900;
                                    baseStyle.WebkitTextStroke = '0.06em black';
                                    baseStyle.textShadow = '0em 0.08em 0.2em rgba(0,0,0,0.8), 0em 0.04em 0.08em rgba(0,0,0,1)';
                                    baseStyle.textTransform = 'uppercase';
                                    activeColor = '#FFFF00'; // Yellow
                                    inactiveColor = 'white';
                                    activeScale = 1.15;
                                 } else if (preset === 'modern-clean') {
                                    baseStyle.fontFamily = 'Inter, sans-serif';
                                    baseStyle.fontSize = `${Math.round(baseFontSize * 0.8)}px`;
                                    baseStyle.fontWeight = 600;
                                    baseStyle.backgroundColor = 'white';
                                    baseStyle.borderRadius = '0.1em';
                                    baseStyle.padding = '0.2em 0.4em';
                                    baseStyle.borderLeft = '0.1em solid #6366F1';
                                    activeColor = '#3B82F6'; // Blue
                                    inactiveColor = 'black';
                                    activeScale = 1;
                                 } else if (preset === 'paper-cut') {
                                    baseStyle.fontFamily = '"Segoe Print", sans-serif';
                                    baseStyle.fontSize = `${baseFontSize}px`;
                                    baseStyle.fontWeight = 700;
                                    baseStyle.backgroundColor = '#DDF0F6'; // Beige
                                    baseStyle.padding = '0.16em 0.33em';
                                    baseStyle.border = '0.06em solid black';
                                    baseStyle.boxShadow = '0.08em 0.08em 0em rgba(0,0,0,1)';
                                    inactiveColor = '#111111';
                                    activeColor = '#FF0000';
                                    activeScale = 1.15;
                                 } else if (preset === 'beast') {
                                    baseStyle.fontFamily = 'Impact, sans-serif';
                                    baseStyle.fontSize = `${Math.round(baseFontSize * 1.2)}px`;
                                    baseStyle.fontWeight = 900;
                                    baseStyle.WebkitTextStroke = '0.104em black';
                                    baseStyle.textShadow = '0.07em 0.07em 0em black';
                                    baseStyle.textTransform = 'uppercase';
                                    baseStyle.fontStyle = 'italic';
                                    inactiveColor = 'white';
                                    activeColor = '#00FFFF'; // Cyan
                                    activeScale = 1.15;
                                 } else if (preset === 'youtube') {
                                    baseStyle.fontFamily = 'Arial, sans-serif';
                                    baseStyle.fontSize = `${Math.round(baseFontSize * 0.6)}px`;
                                    baseStyle.fontWeight = 600;
                                    baseStyle.backgroundColor = 'rgba(0,0,0,0.5)';
                                    baseStyle.borderRadius = '0.14em';
                                    baseStyle.padding = '0.14em 0.41em';
                                    activeColor = 'white';
                                    inactiveColor = 'white';
                                    activeScale = 1;
                                 } else if (preset === 'tiktok') {
                                    baseStyle.fontFamily = 'Montserrat, sans-serif';
                                    baseStyle.fontSize = `${Math.round(baseFontSize * 1.0)}px`;
                                    baseStyle.fontWeight = 800;
                                    baseStyle.WebkitTextStroke = '0.052em black';
                                    baseStyle.textShadow = '0.02em 0.02em 0.04em black';
                                    inactiveColor = 'white';
                                    activeColor = '#FFFF00'; // Fallback Yellow
                                    activeScale = 1.15;
                                 } else if (preset === 'netflix') {
                                    baseStyle.fontFamily = 'Arial, sans-serif';
                                    baseStyle.fontSize = `${Math.round(baseFontSize * 0.8)}px`;
                                    baseStyle.fontWeight = 600;
                                    baseStyle.textShadow = '0em 0.052em 0.104em rgba(0,0,0,0.8)';
                                    inactiveColor = '#FFFF00'; // Yellow
                                    activeColor = '#FFFF00';
                                    activeScale = 1;
                                 } else if (preset === 'ali') {
                                    baseStyle.fontFamily = 'Inter, sans-serif';
                                    baseStyle.fontSize = `${Math.round(baseFontSize * 0.9)}px`;
                                    baseStyle.fontWeight = 700;
                                    baseStyle.textShadow = '0em 0.115em 0.23em rgba(0,0,0,0.5)';
                                    inactiveColor = 'white';
                                    activeColor = '#FFA500'; // Orange
                                    activeScale = 1.15;
                                 } else if (preset === 'neon') {
                                    baseStyle.fontFamily = 'Inter, sans-serif';
                                    baseStyle.fontSize = `${baseFontSize}px`;
                                    baseStyle.fontWeight = 800;
                                    baseStyle.fontStyle = 'italic';
                                    baseStyle.textShadow = '0 0 0.1em #FF00FF, 0 0 0.2em #FF00FF'; // Magenta
                                    inactiveColor = 'white';
                                    activeColor = '#00FFFF'; // Cyan
                                    activeScale = 1;
                                 } else if (preset === 'minimalist') {
                                    baseStyle.fontFamily = 'Inter, sans-serif';
                                    baseStyle.fontSize = `${baseFontSize}px`;
                                    baseStyle.fontWeight = 300;
                                    inactiveColor = '#D3D3D3'; // LightGray
                                    activeColor = '#000000'; // Black
                                    if (theme === 'dark') activeColor = '#ffffff';
                                    activeScale = 1;
                                 } else if (preset === 'cinematic-bold' || preset === 'cinematic') {
                                    baseStyle.fontFamily = '"Montserrat", "Arial Black", sans-serif';
                                    baseStyle.fontSize = `${Math.round(baseFontSize * 1.2)}px`;
                                    baseStyle.fontWeight = 900;
                                    baseStyle.letterSpacing = '-0.02em';
                                    baseStyle.WebkitTextStroke = '0.04em black';
                                    baseStyle.textShadow = '0 0.1em 0 rgba(0,0,0,0.8)';
                                    inactiveColor = '#E8F0FE'; // Light blue hint
                                    activeColor = '#FFFFFF';
                                    activeScale = 1.1;
                                 } else if (preset === 'cinematic-elegant') {
                                    baseStyle.fontFamily = '"Playfair Display", "Cinzel", "Didot", serif';
                                    baseStyle.fontSize = `${Math.round(baseFontSize * 1.1)}px`;
                                    baseStyle.fontWeight = 400;
                                    baseStyle.letterSpacing = '0.08em';
                                    baseStyle.textTransform = 'uppercase';
                                    baseStyle.textShadow = '0 0.05em 0.2em rgba(0,0,0,0.9)';
                                    inactiveColor = '#CCCCCC';
                                    activeColor = '#FFFFFF';
                                    activeScale = 1.05;
                                 } else if (preset === 'cinematic-condensed') {
                                    baseStyle.fontFamily = '"Bebas Neue", "Anton", "Oswald", "Impact", sans-serif';
                                    baseStyle.fontSize = `${Math.round(baseFontSize * 1.4)}px`;
                                    baseStyle.fontWeight = 400;
                                    baseStyle.textTransform = 'uppercase';
                                    baseStyle.letterSpacing = '0.02em';
                                    baseStyle.textShadow = '0 0.1em 0.3em rgba(0,0,0,0.9)';
                                    inactiveColor = '#FF4500'; // OrangeRed
                                    activeColor = '#FF8C00'; // DarkOrange
                                    activeScale = 1.05;
                                 } else if (preset === 'skillizee') {
                                    baseStyle.fontFamily = 'Inter, sans-serif';
                                    baseStyle.fontSize = `${baseFontSize}px`;
                                    baseStyle.fontWeight = 800;
                                    baseStyle.WebkitTextStroke = '0.031em black';
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
                                    baseStyle.backgroundColor = 'rgba(128, 128, 128, 0.5)';
                                    baseStyle.backdropFilter = 'blur(12px)';
                                    baseStyle.borderRadius = '8px';
                                 } else if (clip.style?.backgroundBox === 'dark-blur') {
                                    baseStyle.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                                    baseStyle.backdropFilter = 'blur(12px)';
                                    baseStyle.borderRadius = '8px';
                                 } else if (clip.style?.backgroundBox === 'white-blur') {
                                    baseStyle.backgroundColor = 'rgba(255, 255, 255, 0.44)';
                                    baseStyle.backdropFilter = 'blur(12px)';
                                    baseStyle.borderRadius = '8px';
                                 }
                                 if (baseStyle.fontSize) {
                                    const pxSize = parseFloat(baseStyle.fontSize as string);
                                    const isPortrait = aspectRatio === '9:16' || aspectRatio === '4:5';
                                    const refWidth = isPortrait ? 1080 : 1920;
                                    const scaleVw = (pxSize / refWidth) * 100;
                                    baseStyle.fontSize = `${scaleVw}cqw`;
                                 }

                                 // Fallback color if not rendered as individual words
                                 if (!baseStyle.color) {
                                    baseStyle.color = activeColor;
                                 }

                                 return (
                                    <div style={baseStyle}>
                                       {displayWords.length > 0 ? (
                                          <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                                             {displayWords.map((w: any, idx: number) => {
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
                                                      currentTextDecoration = 'underline solid #FFFF00 4px';
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

                     {projectClips.filter(c => (c.type === 'image' || c.type === 'video') && c.id !== 'c1' && currentTime >= c.start && currentTime <= (c.start + c.duration)).map(clip => {
                        const isSelected = activeClipId === clip.id;
                        const opacity = clip.transform?.opacity !== undefined ? clip.transform.opacity / 100 : 1;
                        return (
                           <EditableCanvasNode
                              key={clip.id}
                              id={clip.id}
                              transform={clip.transform || { x: 50, y: 50, width: 200, height: 200, scale: 100, rotation: 0 }}
                              isSelected={isSelected}
                              onSelect={() => setActiveClipId(clip.id)}
                              onChange={(newTransform) => {
                                 setProjectClips(prev => prev.map(c => c.id === clip.id ? { ...c, transform: newTransform } : c));
                              }}
                              isDraggable={true}
                              isResizable={true}
                              zIndex={clip.transform?.zIndex || 50}
                           >
                              {clip.type === 'image' ? (
                                 <img src={clip.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity }} draggable={false} />
                              ) : (
                                 <video src={clip.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity }} />
                              )}
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
                     <span className="font-mono text-xs text-[#6366F1]">{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
                     <span className={textMuted}>/</span>
                     <span className={cn("font-mono text-xs", textMuted)}>{Math.floor(videoDuration / 60)}:{String(Math.floor(videoDuration % 60)).padStart(2, '0')}</span>
                  </div>

                  <div className="flex items-center gap-4">
                     <button onClick={() => {
                        if (videoRef.current) {
                           const mainClip = projectClips.find(c => c.type === 'video');
                           const base = mainClip?.mediaStart || 0;
                           videoRef.current.currentTime = Math.max(base, videoRef.current.currentTime - 1);
                        }
                     }} className={cn(textMuted, `hover:${textHighlight}`)}><RotateCcw className="w-4 h-4" /></button>

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
                     }} className={cn(textMuted, `hover:${textHighlight}`)}><FastForward className="w-4 h-4" /></button>
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
                     <button onClick={() => setShowSafeMargins(!showSafeMargins)} className={cn(textMuted, `hover:${textHighlight}`, showSafeMargins && "text-[#6366F1]")}><Grid className="w-4 h-4" /></button>
                     <button onClick={() => setPlaybackSpeed(s => { const speeds = [0.5, 1, 1.5, 2]; const i = speeds.indexOf(s); return speeds[(i + 1) % speeds.length] })} className={cn("flex items-center gap-1 text-[10px] px-2 py-1 rounded cursor-pointer", textMuted, theme === 'dark' ? "bg-[#222] hover:bg-[#333]" : "bg-gray-200 hover:bg-gray-300")}>
                        <Gauge className="w-3 h-3" /> {playbackSpeed}x
                     </button>
                     {!isFullscreen && <button onClick={() => setIsFullscreen(true)} className={cn(textMuted, `hover:${textHighlight}`)}><Maximize className="w-4 h-4" /></button>}
                  </div>
               </div>
            </main>

            {/* Right Inspector */}
            {showProperties ? (
               <aside className={cn("w-72 flex flex-col border-l shrink-0 overflow-hidden", borderCol, bgSidebar)}>
                  <div className={cn("flex justify-between items-center border-b px-4 py-3", borderCol)}>
                     <h3 className={cn("text-xs font-bold uppercase tracking-wider", textHighlight)}>Properties</h3>
                     <button onClick={() => setShowProperties(false)} className={cn("p-1 rounded transition-colors", textMuted, bgHover)} title="Close Properties">
                        <X className="w-4 h-4" />
                     </button>
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
                                       { id: 'hormozi', name: 'Opus Pro (Hormozi)', desc: 'Bold & Yellow', font: 'Montserrat, sans-serif', previewStyle: { fontFamily: 'Montserrat, sans-serif', fontWeight: 900, textTransform: 'uppercase', WebkitTextStroke: '0.5px black', color: '#FFFF00', textShadow: '0 1px 3px rgba(0,0,0,0.8)' } },
                                       { id: 'beast', name: 'MrBeast', desc: 'Loud & Slanted', font: 'Impact, sans-serif', previewStyle: { fontFamily: 'Impact, sans-serif', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', WebkitTextStroke: '0.5px black', color: '#00FFFF', textShadow: '1px 1px 0 black' } },
                                       { id: 'modern-clean', name: 'Modern Clean', desc: 'Minimal & Corporate', font: 'Inter, sans-serif', previewStyle: { fontFamily: 'Inter, sans-serif', fontWeight: 600, backgroundColor: 'white', color: '#3B82F6', borderRadius: '2px', padding: '2px 4px', borderLeft: '3px solid #6366F1' } },
                                       { id: 'paper-cut', name: 'Paper Cut', desc: 'Handwritten & Paper', font: '"Segoe Print", sans-serif', previewStyle: { fontFamily: '"Segoe Print", sans-serif', fontWeight: 700, backgroundColor: '#DDF0F6', color: '#FF0000', padding: '1px 4px', border: '1px solid black', boxShadow: '1px 1px 0 rgba(0,0,0,1)' } },
                                       { id: 'tiktok', name: 'TikTok Default', desc: 'Bouncy & Colorful', font: 'Arial, sans-serif', previewStyle: { fontFamily: 'Montserrat, sans-serif', fontWeight: 800, WebkitTextStroke: '0.5px black', color: '#FFFF00', textShadow: '1px 1px 2px black' } },
                                       { id: 'skillizee', name: 'Skillizee', desc: 'Brand Blue Highlight', font: 'Inter, sans-serif', previewStyle: { fontFamily: 'Inter, sans-serif', fontWeight: 800, WebkitTextStroke: '0.5px black', color: '#2563EB' } },
                                       { id: 'netflix', name: 'Netflix', desc: 'Classic TV Subtitles', font: 'Arial, sans-serif', previewStyle: { fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#FFFF00', textShadow: '0 1px 3px rgba(0,0,0,0.8)' } },
                                       { id: 'ali', name: 'Ali Abdaal', desc: 'Orange Pop', font: 'Inter, sans-serif', previewStyle: { fontFamily: 'Inter, sans-serif', fontWeight: 700, color: '#FFA500', textShadow: '0 2px 4px rgba(0,0,0,0.5)' } },
                                       { id: 'neon', name: 'Neon Glow', desc: 'Cyberpunk Aesthetic', font: 'Inter, sans-serif', previewStyle: { fontFamily: 'Inter, sans-serif', fontWeight: 800, fontStyle: 'italic', color: '#00FFFF', textShadow: '0 0 2px #FF00FF, 0 0 4px #FF00FF' } },
                                       { id: 'cinematic-bold', name: 'Cinematic Bold', desc: 'Chunky & Engaging', font: 'Impact, sans-serif', previewStyle: { fontFamily: '"Montserrat", "Arial Black", sans-serif', fontWeight: 900, letterSpacing: '-0.02em', WebkitTextStroke: '0.5px black', color: '#FFFFFF', textShadow: '0 1px 0 rgba(0,0,0,0.8)' } },
                                       { id: 'cinematic-elegant', name: 'Cinematic Serif', desc: 'Elegant (Euphoria)', font: 'Georgia, serif', previewStyle: { fontFamily: '"Playfair Display", "Cinzel", "Didot", serif', fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#FFFFFF', textShadow: '0 1px 3px rgba(0,0,0,0.9)' } },
                                       { id: 'cinematic-condensed', name: 'Cinematic Sans', desc: 'Condensed (Sunlight)', font: '"Arial Narrow", Roboto Condensed, sans-serif', previewStyle: { fontFamily: '"Bebas Neue", "Anton", "Oswald", "Impact", sans-serif', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#FF8C00', textShadow: '0 1px 4px rgba(0,0,0,0.9)' } }
                                    ].map(preset => (
                                       <button
                                          key={preset.id}
                                          onClick={() => updateActiveClipStyle({ preset: preset.id })}
                                          className={cn(
                                             "py-3 px-1 text-center rounded border transition-colors flex flex-col items-center justify-center truncate",
                                             (activeClip.style.preset === preset.id || (!activeClip.style.preset && preset.id === 'hormozi'))
                                                ? "bg-[#6366F1]/20 border-[#6366F1]" // Lighter selection background so text colors remain clearly visible
                                                : (theme === 'dark' ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-gray-100 border-gray-300 hover:bg-gray-200")
                                          )}
                                       >
                                          <div className="flex-1 flex items-center justify-center min-h-[30px]">
                                             <span className="text-[12px] leading-tight" style={preset.previewStyle as any}>{preset.name}</span>
                                          </div>
                                          <span className="text-[9px] opacity-75 mt-1" style={{ fontFamily: 'Inter, sans-serif', color: theme === 'dark' ? '#9CA3AF' : '#4B5563' }}>{preset.desc}</span>
                                       </button>
                                    ))}
                                 </div>

                              </div>

                              <div className="space-y-2 mt-4">
                                 <label className={cn("text-[10px] uppercase font-bold", textMuted)}>Font Family</label>
                                 <select value={activeClip.style.fontFamily} onChange={e => updateActiveClipStyle({ fontFamily: e.target.value })} className={cn("w-full p-2 text-xs rounded border", bgMain, borderCol, textHighlight)}>
                                    <option value="Inter" style={{ fontFamily: 'Inter, sans-serif' }}>Inter</option>
                                    <option value="Arial" style={{ fontFamily: 'Arial, sans-serif' }}>Arial</option>
                                    <option value="Impact" style={{ fontFamily: 'Impact, sans-serif' }}>Impact</option>
                                    <option value="Georgia" style={{ fontFamily: 'Georgia, serif' }}>Georgia</option>
                                    <option value="Montserrat" style={{ fontFamily: 'Montserrat, sans-serif' }}>Montserrat</option>
                                    <option value="Segoe Print" style={{ fontFamily: '"Segoe Print", sans-serif' }}>Segoe Print</option>
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

                     {activeClip && activeClip.type !== 'cut' && (
                        <div className="space-y-4">
                           <h4 className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-2", textMuted)}><Clock className="w-3 h-3" /> Timing</h4>
                           <div className="flex gap-2">
                              <div className="flex-1">
                                 <label className={cn("text-[10px] block mb-1", textMuted)}>Start (s)</label>
                                 <input type="number" step="0.1" value={activeClip.start} onChange={e => {
                                    setProjectClips(prev => prev.map(c => c.id === activeClip.id ? { ...c, start: Number(e.target.value) } : c));
                                 }} className={cn("w-full p-1.5 text-xs rounded border text-center bg-transparent", borderCol, textHighlight)} />
                              </div>
                              <div className="flex-1">
                                 <label className={cn("text-[10px] block mb-1", textMuted)}>Duration (s)</label>
                                 <input type="number" step="0.1" value={activeClip.duration} onChange={e => {
                                    setProjectClips(prev => prev.map(c => c.id === activeClip.id ? { ...c, duration: Number(e.target.value) } : c));
                                 }} className={cn("w-full p-1.5 text-xs rounded border text-center bg-transparent", borderCol, textHighlight)} />
                              </div>
                           </div>
                        </div>
                     )}

                     <div className={cn("w-full h-px", borderCol, "border-b")} />

                     <div className="space-y-4">
                        <h4 className={cn("text-xs font-bold uppercase tracking-wider", textMuted)}>Transform</h4>
                        <div className="space-y-3">
                           <div className="flex items-center justify-between gap-2">
                              <span className={cn("text-[10px] w-16", textMuted)}>Scale</span>
                              <input type="range" min="10" max="300" value={activeClip?.transform?.scale || 100} onChange={e => updateActiveClipTransform({ ...activeClip.transform, scale: Number(e.target.value) })} className="flex-1 accent-[#6366F1]" disabled={!activeClip?.transform} />
                              <input type="number" value={Math.round(activeClip?.transform?.scale || 100)} onChange={e => updateActiveClipTransform({ ...activeClip.transform, scale: Number(e.target.value) })} className={cn("w-12 p-1 text-[10px] rounded border text-center bg-transparent", borderCol, textHighlight)} disabled={!activeClip?.transform} />
                           </div>
                           <div className="flex items-center justify-between gap-2">
                              <span className={cn("text-[10px] w-16", textMuted)}>X Pos</span>
                              <input type="range" min="-500" max="500" value={activeClip?.transform?.x || 0} onChange={e => updateActiveClipTransform({ ...activeClip.transform, x: Number(e.target.value) })} className="flex-1 accent-[#6366F1]" disabled={!activeClip?.transform} />
                              <input type="number" value={Math.round(activeClip?.transform?.x || 0)} onChange={e => updateActiveClipTransform({ ...activeClip.transform, x: Number(e.target.value) })} className={cn("w-12 p-1 text-[10px] rounded border text-center bg-transparent", borderCol, textHighlight)} disabled={!activeClip?.transform} />
                           </div>
                           <div className="flex items-center justify-between gap-2">
                              <span className={cn("text-[10px] w-16", textMuted)}>Y Pos</span>
                              <input type="range" min="-500" max="500" value={activeClip?.transform?.y || 0} onChange={e => updateActiveClipTransform({ ...activeClip.transform, y: Number(e.target.value) })} className="flex-1 accent-[#6366F1]" disabled={!activeClip?.transform} />
                              <input type="number" value={Math.round(activeClip?.transform?.y || 0)} onChange={e => updateActiveClipTransform({ ...activeClip.transform, y: Number(e.target.value) })} className={cn("w-12 p-1 text-[10px] rounded border text-center bg-transparent", borderCol, textHighlight)} disabled={!activeClip?.transform} />
                           </div>
                           <div className="flex items-center justify-between gap-2">
                              <span className={cn("text-[10px] w-16", textMuted)}>Rotate</span>
                              <input type="range" min="-180" max="180" value={activeClip?.transform?.rotation || 0} onChange={e => updateActiveClipTransform({ ...activeClip.transform, rotation: Number(e.target.value) })} className="flex-1 accent-[#6366F1]" disabled={!activeClip?.transform} />
                              <input type="number" value={Math.round(activeClip?.transform?.rotation || 0)} onChange={e => updateActiveClipTransform({ ...activeClip.transform, rotation: Number(e.target.value) })} className={cn("w-12 p-1 text-[10px] rounded border text-center bg-transparent", borderCol, textHighlight)} disabled={!activeClip?.transform} />
                           </div>
                           <div className="flex items-center justify-between gap-2">
                              <span className={cn("text-[10px] w-16", textMuted)}>Opacity</span>
                              <input type="range" min="0" max="100" value={activeClip?.transform?.opacity !== undefined ? activeClip.transform.opacity : 100} onChange={e => updateActiveClipTransform({ ...activeClip.transform, opacity: Number(e.target.value) })} className="flex-1 accent-[#6366F1]" disabled={!activeClip?.transform} />
                              <input type="number" value={Math.round(activeClip?.transform?.opacity !== undefined ? activeClip.transform.opacity : 100)} onChange={e => updateActiveClipTransform({ ...activeClip.transform, opacity: Number(e.target.value) })} className={cn("w-12 p-1 text-[10px] rounded border text-center bg-transparent", borderCol, textHighlight)} disabled={!activeClip?.transform} />
                           </div>
                        </div>
                     </div>

                     {activeClip?.type !== 'cut' && activeClip?.type !== 'audio' && (
                        <>
                           <div className={cn("w-full h-px border-b my-4", borderCol)} />
                           <div className="space-y-3">
                              <h4 className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-2", textMuted)}><Layers className="w-3 h-3" /> Layering</h4>
                              <div className="flex gap-2">
                                 <button onClick={() => updateActiveClipTransform({ ...activeClip.transform, zIndex: (activeClip.transform?.zIndex || 50) + 1 })} className={cn("flex-1 py-1.5 border rounded text-xs transition-colors flex items-center justify-center gap-1", borderCol, textHighlight, bgHover)}>
                                    <ChevronUp className="w-3 h-3" /> Forward
                                 </button>
                                 <button onClick={() => updateActiveClipTransform({ ...activeClip.transform, zIndex: (activeClip.transform?.zIndex || 50) - 1 })} className={cn("flex-1 py-1.5 border rounded text-xs transition-colors flex items-center justify-center gap-1", borderCol, textHighlight, bgHover)}>
                                    <ChevronDown className="w-3 h-3" /> Backward
                                 </button>
                              </div>
                              <button onClick={() => updateActiveClipTransform({ ...activeClip.transform, zIndex: 9999 })} className={cn("w-full py-1.5 border rounded text-xs transition-colors bg-blue-500/10 text-blue-500 border-blue-500/50 hover:bg-blue-500/20")}>
                                 Always on Top
                              </button>
                           </div>
                        </>
                     )}

                     {activeClip?.type === 'cut' && (
                        <>
                           <div className={cn("w-full h-px my-4", borderCol, "border-b")} />
                           <div className="space-y-3">
                              <h4 className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-orange-500")}><Crop className="w-3 h-3" /> AI Auto-Framing</h4>
                              <p className={cn("text-[10px]", textMuted, "leading-tight mb-2")}>Manually override the AI's camera position for this specific cut.</p>
                              <div className="space-y-2">
                                 <div className={cn("flex justify-between text-[10px]", textMuted)}><span>Horizontal Pan (Center X)</span> <span>{Math.round((activeClip.cx_percent || 0.5) * 100)}%</span></div>
                                 <input type="range" min="0" max="100" value={(activeClip.cx_percent || 0.5) * 100} onChange={e => {
                                    const newClips = projectClips.map(c => c.id === activeClip.id ? { ...c, cx_percent: Number(e.target.value) / 100 } : c);
                                    setProjectClips(newClips);
                                 }} className="w-full accent-orange-500" />
                              </div>
                           </div>
                        </>
                     )}
                  </div>
               </aside>
            ) : (
               <aside className={cn("w-12 flex flex-col border-l shrink-0 items-center py-2", borderCol, bgSidebar)}>
                  <button onClick={() => setShowProperties(true)} className={cn("p-2 rounded transition-colors", textMuted, bgHover)} title="Expand Properties">
                     <SlidersHorizontal className="w-5 h-5" />
                  </button>
               </aside>
            )}
         </div>

         {/* Resizer Handle */}
         <div
            className={cn("h-1.5 w-full cursor-row-resize z-50 hover:bg-[#6366F1] transition-colors relative group shrink-0", bgMain)}
            onMouseDown={(e) => {
               e.preventDefault();
               const startY = e.clientY;
               const startHeight = timelineHeight;
               const onMouseMove = (moveEvent: MouseEvent) => {
                  const deltaY = startY - moveEvent.clientY;
                  setTimelineHeight(Math.max(100, Math.min(window.innerHeight - 300, startHeight + deltaY)));
               };
               const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
               };
               document.addEventListener('mousemove', onMouseMove);
               document.addEventListener('mouseup', onMouseUp);
            }}
         >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 rounded bg-gray-400 group-hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
         </div>

         {/* Bottom Timeline */}
         <div style={{ height: timelineHeight }} className={cn("border-t flex flex-col shrink-0 relative z-20", borderCol, bgPanel)}>
            {/* Timeline Toolbar */}
            <div className={cn("h-10 border-b flex items-center justify-between px-4", borderCol, bgSidebar)}>
               <div className="flex items-center gap-2">
                  <button className={cn("p-1.5 rounded transition-colors", textMuted, bgHover)}><MousePointer2 className="w-4 h-4" /></button>
                  <button onClick={handleSplit} title="Split (S)" className={cn("p-1.5 rounded transition-colors", textMuted, bgHover)}><Scissors className="w-4 h-4" /></button>
                  <button className={cn("p-1.5 rounded transition-colors", textMuted, bgHover)}><Copy className="w-4 h-4" /></button>
                  <div className={cn("w-px h-4 mx-1 border-l", borderCol)} />
                  <button onClick={handleDelete} title="Delete (Del)" className={cn("p-1.5 rounded transition-colors", "text-red-400 hover:text-red-500", bgHover)}><Trash2 className="w-4 h-4" /></button>
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
                  {tracks.map((t, index) => (
                     <div key={t.id} className={cn("h-16 border-b p-2 flex flex-col justify-center relative group", borderCol)}>
                        <div className="flex items-center justify-between">
                           <span className={cn("text-[10px] font-semibold flex items-center gap-1", textMuted)}>
                              {t.type === 'video' && <FileVideo className="w-3 h-3 text-blue-400" />}
                              {t.type === 'audio' && <AudioWaveform className="w-3 h-3 text-green-400" />}
                              {t.type === 'text' && <Type className="w-3 h-3 text-purple-400" />}
                              {t.type === 'cut' && <Video className="w-3 h-3 text-orange-400" />}
                              {t.type === 'overlay' && <ImageIcon className="w-3 h-3 text-pink-400" />}
                              {t.id.toUpperCase()}
                           </span>
                           <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => {
                                 if (index > 0) {
                                    const newTracks = [...tracks];
                                    [newTracks[index - 1], newTracks[index]] = [newTracks[index], newTracks[index - 1]];
                                    setTracks(newTracks);
                                 }
                              }} className={cn("p-0.5 rounded", textMuted, `hover:${textHighlight}`)} title="Move Up"><ChevronUp className="w-3 h-3" /></button>
                              <button onClick={() => {
                                 if (index < tracks.length - 1) {
                                    const newTracks = [...tracks];
                                    [newTracks[index + 1], newTracks[index]] = [newTracks[index], newTracks[index + 1]];
                                    setTracks(newTracks);
                                 }
                              }} className={cn("p-0.5 rounded", textMuted, `hover:${textHighlight}`)} title="Move Down"><ChevronDown className="w-3 h-3" /></button>

                              <button onClick={() => setTracks(ts => ts.map(tr => tr.id === t.id ? { ...tr, locked: !tr.locked } : tr))} className={cn("ml-1", t.locked ? 'text-red-400' : textMuted, `hover:${textHighlight}`)} title={t.locked ? 'Unlock' : 'Lock'}>{t.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}</button>
                              <button onClick={() => setTracks(ts => ts.map(tr => tr.id === t.id ? { ...tr, hidden: !tr.hidden } : tr))} className={cn(t.hidden ? 'text-red-400' : textMuted, `hover:${textHighlight}`)} title={t.hidden ? 'Show' : 'Hide'}>{t.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</button>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>

               {/* Timeline Canvas */}
               <div className={cn("flex-1 relative overflow-x-auto overflow-y-hidden scrollbar-thin", bgPanel)}>
                  <div style={{ width: `${Math.max((videoDuration || 15) * zoom, 100)}px`, minWidth: '100%', height: '100%', position: 'relative' }}>
                     {/* Time Ruler */}
                     <div className={cn("h-7 border-b sticky top-0 z-0 flex overflow-hidden", borderCol, bgPanel)}>
                        {Array.from({ length: Math.ceil((videoDuration || 15) + 1) }).map((_, i) => (
                           <div key={i} style={{ width: `${zoom}px` }} className="h-full relative shrink-0">
                              {/* Main tick */}
                              <div className={cn("absolute bottom-0 left-0 w-px h-3 bg-gray-400 dark:bg-gray-600")} />

                              {/* Sub ticks based on zoom level */}
                              {zoom > 20 && (
                                 <div className={cn("absolute bottom-0 left-1/2 w-px h-1.5 bg-gray-300 dark:bg-gray-700")} />
                              )}
                              {zoom > 50 && (
                                 <>
                                    <div className={cn("absolute bottom-0 left-1/4 w-px h-1 bg-gray-200 dark:bg-gray-800")} />
                                    <div className={cn("absolute bottom-0 left-3/4 w-px h-1 bg-gray-200 dark:bg-gray-800")} />
                                 </>
                              )}

                              {/* Label */}
                              {(i % (zoom > 50 ? 1 : zoom > 20 ? 2 : 5) === 0) && (
                                 <span className={cn("absolute left-1.5 top-0.5 text-[9px] font-mono tracking-tight", textMuted)}>
                                    {new Date(i * 1000).toISOString().substr(14, 5)}
                                 </span>
                              )}
                           </div>
                        ))}
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
                        <div
                           className="absolute top-0 bottom-0 w-[1.5px] bg-red-500 z-30 pointer-events-none drop-shadow-md"
                           style={{
                              left: `${currentTime * zoom}px`,
                              transition: isPlaying ? 'left 0.25s linear' : 'none'
                           }}
                        >
                           <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-red-500 rounded-sm transform rotate-45 cursor-ew-resize pointer-events-auto border border-red-600 shadow-sm" />
                        </div>

                        {tracks.map(t => (
                           <div key={t.id} className={cn("h-16 border-b relative", borderCol)}>
                              {projectClips.filter(c => c.trackId === t.id).map(c => {
                                 if (c.type === 'video' || c.type === 'image') {
                                    return (
                                       <div key={c.id} className={cn(
                                          "absolute h-14 top-1 rounded-md overflow-hidden border transition-all cursor-pointer flex flex-col",
                                          activeClipId === c.id ? "border-white z-10 shadow-[0_0_0_1px_rgba(255,255,255,1)]" : (c.type === 'image' ? "border-pink-500/50 hover:border-pink-400" : "border-blue-500/50 hover:border-blue-400")
                                       )}
                                          style={{ left: `${c.start * zoom}px`, width: `${c.duration * zoom}px` }}
                                          onClick={() => setActiveClipId(c.id)}
                                          onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); setActiveClipId(c.id); setContextMenu({ x: e.clientX, y: e.clientY, type: 'clip', targetId: c.id }) }}
                                       >
                                          <div className={cn("absolute inset-0", c.type === 'image' ? "bg-pink-500/20" : "bg-blue-500/20")} />
                                          <div className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-black/30 z-10 truncate absolute top-0 w-full backdrop-blur-sm">{c.title}</div>
                                          <div className="flex-1 flex overflow-hidden">
                                             {c.id === 'c1' && thumbnails.length > 0 ? (
                                                thumbnails.map((thumb, i) => (
                                                   <img key={i} src={thumb} className="h-full object-cover shrink-0" style={{ width: `${zoom}px` }} draggable={false} />
                                                ))
                                             ) : c.type === 'image' ? (
                                                <img src={c.mediaUrl} className="h-full w-full object-cover shrink-0" draggable={false} />
                                             ) : (
                                                Array.from({ length: Math.ceil(c.duration) }).map((_, i) => (
                                                   <div key={i} className="h-full border-r border-blue-900/30 bg-blue-800/20 shrink-0" style={{ width: `${zoom}px` }} />
                                                ))
                                             )}
                                          </div>
                                       </div>
                                    );
                                 }

                                 if (c.type === 'audio') {
                                    return (
                                       <div key={c.id} className={cn(
                                          "absolute h-14 top-1 rounded-md overflow-hidden border transition-all cursor-pointer flex flex-col",
                                          activeClipId === c.id ? "border-white z-10 shadow-[0_0_0_1px_rgba(255,255,255,1)]" : "border-green-500/50 hover:border-green-400 bg-green-500/10"
                                       )}
                                          style={{ left: `${c.start * zoom}px`, width: `${c.duration * zoom}px` }}
                                          onClick={() => setActiveClipId(c.id)}
                                       >
                                          <div className="absolute top-1 left-2 text-[9px] font-bold text-green-700 dark:text-green-300 z-10 flex items-center gap-1">
                                             <AudioWaveform className="w-3 h-3" /> {c.title}
                                          </div>
                                          <WaveformTrack fileUrl={c.mediaUrl || fileUrl} width={c.duration * zoom} />
                                       </div>
                                    );
                                 }

                                 if (c.type === 'text') {
                                    return (
                                       <div key={c.id} className={cn(
                                          "absolute h-14 top-1 rounded-md overflow-hidden border transition-all cursor-pointer flex flex-col justify-center items-center",
                                          activeClipId === c.id ? "border-white z-10 shadow-[0_0_0_1px_rgba(255,255,255,1)]" : "border-purple-500/50 hover:border-purple-400 bg-purple-500/10"
                                       )}
                                          style={{ left: `${c.start * zoom}px`, width: `${c.duration * zoom}px` }}
                                          onClick={() => setActiveClipId(c.id)}
                                          onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); setActiveClipId(c.id); setContextMenu({ x: e.clientX, y: e.clientY, type: 'clip', targetId: c.id }) }}
                                       >
                                          <div className="absolute inset-0 bg-purple-500/10" />
                                          <div className="px-1.5 py-0.5 text-[9px] font-bold text-purple-200 z-10 truncate absolute top-0 w-full bg-black/30 backdrop-blur-sm">{c.title}</div>
                                          <div className="flex-1 flex items-center justify-center p-1 pt-4 overflow-hidden w-full">
                                             <span className="text-[10px] text-white truncate font-semibold w-full text-center">{c.text || 'Auto Captions'}</span>
                                          </div>
                                       </div>
                                    );
                                 }

                                 if (c.type === 'cut') {
                                    return (
                                       <div key={c.id} className={cn(
                                          "absolute h-10 top-3 rounded-md overflow-hidden border transition-all cursor-pointer flex flex-col justify-center items-center",
                                          activeClipId === c.id ? "border-white z-10 shadow-[0_0_0_1px_rgba(255,255,255,1)]" : "border-orange-500/50 hover:border-orange-400"
                                       )}
                                          style={{ left: `${c.start * zoom}px`, width: `${c.duration * zoom}px` }}
                                          onClick={() => setActiveClipId(c.id)}
                                       >
                                          <div className="absolute inset-0 bg-orange-500/20" />
                                          <span className="text-[10px] font-bold text-orange-100 relative z-10 truncate px-2">{c.title}</span>
                                       </div>
                                    );
                                 }

                                 return null;
                              })}

                              {t.type === 'video' && projectClips.filter(c => c.trackId === t.id).length > 1 && (
                                 <div className="absolute h-14 top-1 flex items-center justify-center z-20"
                                    style={{ left: `${(projectClips[0].start + projectClips[0].duration) / (videoDuration || 15) * 100}%`, width: '20px', marginLeft: '-10px' }}>
                                    <button className="w-5 h-5 bg-black border border-gray-600 rounded-full flex items-center justify-center text-white hover:bg-gray-800 shadow-xl transition-transform hover:scale-110">
                                       <Plus className="w-3 h-3" />
                                    </button>
                                 </div>
                              )}
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
                                 <select value={exportFormat} onChange={e => setExportFormat(e.target.value)} className={cn("w-full p-2 rounded border text-sm", borderCol, bgSidebar, textHighlight)}>
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
                                 <select value={exportRes} onChange={e => setExportRes(e.target.value)} className={cn("w-full p-2 rounded border text-sm", borderCol, bgSidebar, textHighlight)}>
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
                                 <select value={exportFps} onChange={e => setExportFps(e.target.value)} className={cn("w-full p-2 rounded border text-sm", borderCol, bgSidebar, textHighlight)}>
                                    <option value="60">60 fps</option>
                                    <option value="50">50 fps</option>
                                    <option value="30">30 fps</option>
                                    <option value="25">25 fps</option>
                                    <option value="24">24 fps</option>
                                 </select>
                              </div>
                              <div className="space-y-2">
                                 <label className={cn("text-xs font-semibold", textMuted)}>Codec</label>
                                 <select value={exportCodec} onChange={e => setExportCodec(e.target.value)} className={cn("w-full p-2 rounded border text-sm", borderCol, bgSidebar, textHighlight)}>
                                    <option value="h264">H.264</option>
                                    <option value="h265">H.265 (HEVC)</option>
                                    <option value="av1">AV1</option>
                                 </select>
                              </div>
                           </div>
                           <div className="space-y-3 pt-2">
                              <h3 className={cn("text-xs font-bold uppercase tracking-wider", textMuted)}>Viral Optimization</h3>
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                 <input type="checkbox" checked={autoSilenceRemove} onChange={e => setAutoSilenceRemove(e.target.checked)} className="rounded" />
                                 <span className={textMain}>Auto-Remove Silences (Jump Cuts)</span>
                              </label>
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                 <input type="checkbox" checked={addSoundDesign} onChange={e => setAddSoundDesign(e.target.checked)} className="rounded" />
                                 <span className={textMain}>Background Music & SFX Mix</span>
                              </label>
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                 <input type="checkbox" checked={bouncyText} onChange={e => setBouncyText(e.target.checked)} className="rounded" />
                                 <span className={textMain}>Dynamic Text Animations (Spring Bounce)</span>
                              </label>
                           </div>
                           <div className="space-y-2">
                              <label className={cn("text-xs font-semibold", textMuted)}>Export Range</label>
                              <select value={exportRange} onChange={e => setExportRange(e.target.value as any)} className={cn("w-full p-2 rounded border text-sm", borderCol, bgSidebar, textHighlight)}>
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

                                    let start_time = mainClip?.mediaStart || 0;
                                    let end_time = start_time + (videoDuration || 15);
                                    let timelineOffset = 0;

                                    if (exportRange === 'selected') {
                                       const active = projectClips.find(c => c.id === activeClipId);
                                       if (active && active.type === 'video') {
                                          start_time = active.mediaStart ?? (start_time + active.start);
                                          end_time = active.mediaEnd ?? (start_time + active.duration);
                                          timelineOffset = active.start;
                                       }
                                       // Ignore selecting cuts/text for export range to prevent 2-second exports
                                    }

                                    const formData = new FormData();
                                    if (fileKey) {
                                       formData.append("fileKey", fileKey);
                                    } else if (file) {
                                       formData.append("video", file);
                                    }
                                    formData.append("start_time", start_time.toString());
                                    formData.append("end_time", end_time.toString());
                                    formData.append("aspect_ratio", aspectRatio);
                                    formData.append("export_format", exportFormat);
                                    formData.append("export_res", exportRes);
                                    formData.append("export_fps", exportFps);
                                    formData.append("export_codec", exportCodec);
                                    formData.append("viral_remove_silence", autoSilenceRemove ? "true" : "false");
                                    formData.append("viral_sound_design", addSoundDesign ? "true" : "false");
                                    formData.append("viral_bouncy_text", bouncyText ? "true" : "false");

                                    if (textClip) {
                                       let exportTextClip = JSON.parse(JSON.stringify(textClip));
                                       
                                       // Shift chunk times relative to the FFMPEG export window
                                       // FFMPEG starts at 0, corresponding to 'start_time' on the timeline.
                                       // chunk absolute time = textClip.start + chunk.start
                                       // FFMPEG relative time = absolute time - start_time
                                       exportTextClip.data.chunks = exportTextClip.data.chunks.map((chunk: any) => ({
                                          ...chunk,
                                          start: textClip.start + chunk.start - start_time,
                                          end: textClip.start + chunk.end - start_time,
                                          words: chunk.words?.map((w: any) => ({
                                             ...w,
                                             start: textClip.start + w.start - start_time,
                                             end: textClip.start + w.end - start_time
                                          }))
                                       })).filter((chunk: any) => chunk.start >= 0 && chunk.end > 0);
                                       
                                       formData.append("captions", JSON.stringify(exportTextClip));
                                       if (previewContainerRef.current) {
                                          formData.append("canvas_width", previewContainerRef.current.clientWidth.toString());
                                          formData.append("canvas_height", previewContainerRef.current.clientHeight.toString());
                                       }
                                    }

                                    let exportCameraCuts = projectClips.filter(c => c.type === 'cut');
                                    if (exportCameraCuts.length > 0) {
                                       formData.append("cameraCuts", JSON.stringify(exportCameraCuts));
                                    }

                                    let exportProjectClips = JSON.parse(JSON.stringify(projectClips));
                                    if (timelineOffset > 0) {
                                       exportProjectClips = exportProjectClips.map((c: any) => {
                                          if (c.trackId === 'v4' && c.type === 'image') {
                                             return {
                                                ...c,
                                                start: Math.max(0, c.start - timelineOffset)
                                             };
                                          }
                                          return c;
                                       });
                                    }
                                    formData.append("projectClips", JSON.stringify(exportProjectClips));

                                    // Mock progress while waiting
                                    const int = setInterval(() => {
                                       setExportProgress(p => p < 90 ? p + 5 : p);
                                    }, 2000);

                                    try {
                                       const res = await fetch(`/api/video/export`, {
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

                                       const disposition = res.headers.get('Content-Disposition');
                                       let filename = `Skillizee_Export_${Date.now()}.${exportFormat === 'png_seq' ? 'mp4' : exportFormat}`;
                                       if (disposition && disposition.indexOf('filename=') !== -1) {
                                          const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                                          if (matches != null && matches[1]) {
                                             filename = matches[1].replace(/['"]/g, '');
                                          }
                                       }

                                       const blob = await res.blob();
                                       const url = URL.createObjectURL(blob);
                                       const a = document.createElement('a');
                                       a.href = url;
                                       a.download = filename;
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
