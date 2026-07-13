"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { PenTool, FileText, Loader2, PlayCircle, Settings2, Users, Clock, Copy, CheckCircle2, Edit3, Save, Download, Video, Image as ImageIcon, Megaphone, Search, Layout, ArrowRight } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

function ScriptGeneratorContent() {
  const searchParams = useSearchParams()
  const initialTopic = searchParams.get("topic")

  const [reports, setReports] = useState<any[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  
  const [selectedReportId, setSelectedReportId] = useState("")
  const [duration, setDuration] = useState("10")
  const [format, setFormat] = useState("Monologue")
  const [hosts, setHosts] = useState("1 Host")
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedData, setGeneratedData] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<string>("script")
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const [editedText, setEditedText] = useState("")

  useEffect(() => {
    fetch("/api/library")
      .then(res => res.json())
      .then(data => {
        if (data.reports) {
          setReports(data.reports)
          if (initialTopic) {
            const report = data.reports.find((r:any) => r.topic === initialTopic)
            if (report) setSelectedReportId(report.id)
          } else if (typeof window !== "undefined") {
            const activeId = localStorage.getItem("activeReportId")
            if (activeId && data.reports.find((r:any) => r.id === activeId)) {
              setSelectedReportId(activeId)
            }
          }
        }
        setIsLoadingReports(false)
      })
      .catch(err => {
        console.error("Failed to load reports", err)
        setIsLoadingReports(false)
      })
  }, [initialTopic])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReportId) return

    const selectedReport = reports.find(r => r.id === selectedReportId)
    if (!selectedReport) return

    setIsGenerating(true)
    setGeneratedData(null)
    setIsEditing(false)

    try {
      const res = await fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedReport.topic,
          reportData: selectedReport.report,
          duration,
          format,
          hosts
        })
      })
      
      const data = await res.json()
      if (data.scriptData) {
        setGeneratedData(data.scriptData)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (generatedData && generatedData[activeTab]) {
      navigator.clipboard.writeText(isEditing ? editedText : generatedData[activeTab])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadWord = () => {
    if (!generatedData) return;
    
    const content = isEditing ? editedText : generatedData[activeTab];
    
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
            "xmlns='http://www.w3.org/TR/REC-html40'>" +
            "<head><meta charset='utf-8'><title>Podcast Script</title></head><body>";
            
    let htmlContent = content
      .replace(/### (.*?)\n/g, '<h3>$1</h3>')
      .replace(/## (.*?)\n/g, '<h2>$1</h2>')
      .replace(/# (.*?)\n/g, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
      
    const footer = "</body></html>";
    const sourceHTML = header + htmlContent + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `Podcast_${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Save
      setGeneratedData({
        ...generatedData,
        [activeTab]: editedText
      })
      setIsEditing(false)
    } else {
      // Enter Edit mode
      setEditedText(generatedData[activeTab])
      setIsEditing(true)
    }
  }

  // Effect to sync text when switching tabs in edit mode
  useEffect(() => {
    if (isEditing && generatedData) {
      setEditedText(generatedData[activeTab])
    }
  }, [activeTab])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layout },
    { id: 'script', label: 'Script', icon: FileText },
    { id: 'cameraNotes', label: 'Camera Notes', icon: Video },
    { id: 'broll', label: 'B-Roll', icon: PlayCircle },
    { id: 'graphics', label: 'Graphics', icon: ImageIcon },
    { id: 'cta', label: 'Call to Action', icon: Megaphone },
    { id: 'seo', label: 'SEO & Metadata', icon: Search },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <PenTool className="h-6 w-6 text-indigo-500" />
          Production Studio
        </h2>
        <p className="text-muted-foreground mt-2">
          Turn your high-level research outlines into a complete, ready-to-shoot production package.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mt-6">
        {/* Settings Panel */}
        <div className="xl:col-span-3 space-y-6">
          <form onSubmit={handleGenerate} className="glass-card p-6 space-y-6">
            
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Source Research
              </label>
              <select 
                value={selectedReportId}
                onChange={(e) => {
                  setSelectedReportId(e.target.value)
                  if (typeof window !== "undefined") localStorage.setItem("activeReportId", e.target.value)
                }}
                className="w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                disabled={isLoadingReports || isGenerating}
                required
              >
                <option value="">Select a saved research report...</option>
                {reports.map(r => (
                  <option key={r.id} value={r.id}>{r.topic}</option>
                ))}
              </select>
              {isLoadingReports && <p className="text-xs text-muted-foreground mt-2 animate-pulse">Loading library...</p>}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" /> Target Duration
                </label>
                <select 
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full p-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  disabled={isGenerating}
                >
                  <option value="5">5 Minutes</option>
                  <option value="10">10 Minutes</option>
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-500" /> Hosts
                </label>
                <select 
                  value={hosts}
                  onChange={(e) => setHosts(e.target.value)}
                  className="w-full p-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  disabled={isGenerating}
                >
                  <option value="1 Host">1 Host (Solo)</option>
                  <option value="2 Co-hosts">2 Co-hosts</option>
                  <option value="Host + Guest">Host + 1 Guest</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-purple-500" /> Format & Flow
              </label>
              <select 
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                disabled={isGenerating}
              >
                <option value="Monologue">Monologue / Deep Dive</option>
                <option value="Conversational / Banter">Conversational / Banter</option>
                <option value="Interview Q&A">Interview / Q&A</option>
                <option value="Storytelling / Narrative">Storytelling / Narrative</option>
                <option value="News & Updates">News / Rapid Fire</option>
              </select>
            </div>

            <button 
              type="submit"
              disabled={!selectedReportId || isGenerating}
              className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold flex justify-center items-center gap-2 hover:opacity-90 hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50 transition-all shadow-md"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
              {isGenerating ? "Producing..." : "Produce Package"}
            </button>
          </form>
        </div>

        {/* Output Panel */}
        <div className="xl:col-span-9 h-full min-h-[600px] flex flex-col">
          {!generatedData && !isGenerating ? (
            <div className="h-full flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-2xl bg-card/30">
              <div className="p-4 bg-primary/10 rounded-full mb-6">
                <PenTool className="w-12 h-12 text-primary opacity-80" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Production Studio Ready</h3>
              <p className="text-muted-foreground max-w-md">Select a deep research report on the left and hit produce. We'll generate a comprehensive teleprompter script, shot lists, and SEO metadata.</p>
            </div>
          ) : isGenerating ? (
            <div className="h-full flex-1 flex flex-col items-center justify-center text-center p-12 border rounded-2xl bg-card">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
              <h3 className="text-2xl font-semibold animate-pulse text-primary">Drafting Production Package</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">Writing natural dialogue, planning camera angles, and optimizing metadata...</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card flex flex-col h-full overflow-hidden"
            >
              {/* Tab Navigation */}
              <div className="flex overflow-x-auto border-b border-border/50 bg-muted/20 p-2 gap-1 hide-scrollbar">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                        isActive 
                          ? "bg-background text-primary shadow-sm border border-border/50" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <tab.icon className={cn("w-4 h-4", isActive ? "text-primary" : "")} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {/* Toolbar */}
              <div className="flex justify-end items-center gap-2 p-3 bg-background border-b border-border/30">
                <button 
                  onClick={handleEditToggle}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
                    isEditing ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border"
                  )}
                >
                  {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  {isEditing ? "Save Edits" : "Edit Tab"}
                </button>
                <button 
                  onClick={handleDownloadWord}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors border border-border"
                >
                  <Download className="w-4 h-4" />
                  Docx
                </button>
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-sm font-medium transition-colors border border-primary/20"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              {/* Content Area */}
              <div className="p-0 overflow-y-auto max-h-[700px] flex-1 bg-background relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    {isEditing ? (
                      <textarea 
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="w-full h-full min-h-[500px] p-8 outline-none resize-none bg-transparent text-[1.05rem] leading-relaxed font-sans"
                        autoFocus
                      />
                    ) : (
                      <div className="p-8 prose prose-neutral dark:prose-invert max-w-none text-[1.05rem] leading-relaxed">
                        <ReactMarkdown>{generatedData[activeTab] || "*No content generated for this section.*"}</ReactMarkdown>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Workflow Bridge */}
              <div className="p-4 border-t border-border/50 bg-muted/10 flex justify-end">
                <button
                  onClick={() => {
                    const report = reports.find(r => r.id === selectedReportId)
                    if (report) {
                      window.location.href = `/publishing-assets?topic=${encodeURIComponent(report.topic)}`
                    } else {
                      window.location.href = `/publishing-assets`
                    }
                  }}
                  className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-bold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                  Continue to Publishing Assets
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ScriptGenerator() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ScriptGeneratorContent />
    </Suspense>
  )
}
