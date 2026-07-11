"use client"

import { useState, useEffect } from "react"
import { PenTool, FileText, Loader2, PlayCircle, Settings2, Users, Clock, Copy, CheckCircle2, Edit3, Save, Download } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { motion } from "framer-motion"

export default function ScriptGenerator() {
  const [reports, setReports] = useState<any[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  
  const [selectedReportId, setSelectedReportId] = useState("")
  const [duration, setDuration] = useState("10")
  const [format, setFormat] = useState("Monologue")
  const [hosts, setHosts] = useState("1 Host")
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    fetch("/api/library")
      .then(res => res.json())
      .then(data => {
        if (data.reports) {
          setReports(data.reports)
          if (typeof window !== "undefined") {
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
  }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReportId) return

    const selectedReport = reports.find(r => r.id === selectedReportId)
    if (!selectedReport) return

    setIsGenerating(true)
    setGeneratedScript(null)
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
      if (data.script) {
        setGeneratedScript(data.script)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (generatedScript) {
      navigator.clipboard.writeText(generatedScript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadWord = () => {
    if (!generatedScript) return;
    
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
            "xmlns='http://www.w3.org/TR/REC-html40'>" +
            "<head><meta charset='utf-8'><title>Podcast Script</title></head><body>";
            
    let htmlContent = generatedScript
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
    fileDownload.download = 'Podcast_Script.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <PenTool className="h-6 w-6 text-indigo-500" />
          Script Generator
        </h2>
        <p className="text-muted-foreground mt-2">
          Turn your high-level research outlines into word-for-word conversational podcast scripts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Settings Panel */}
        <div className="lg:col-span-4 space-y-6">
          <form onSubmit={handleGenerate} className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
            
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Source Material
              </label>
              <select 
                value={selectedReportId}
                onChange={(e) => {
                  setSelectedReportId(e.target.value)
                  if (typeof window !== "undefined") localStorage.setItem("activeReportId", e.target.value)
                }}
                className="w-full p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                disabled={isLoadingReports || isGenerating}
                required
              >
                <option value="">Select a saved research report...</option>
                {reports.map(r => (
                  <option key={r.id} value={r.id}>{r.topic} ({r.style || 'Standard'})</option>
                ))}
              </select>
              {isLoadingReports && <p className="text-xs text-muted-foreground mt-2 animate-pulse">Loading library...</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" /> Duration
                </label>
                <select 
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full p-2.5 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
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
                  className="w-full p-2.5 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
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
                className="w-full p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
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
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold flex justify-center items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
              {isGenerating ? "Writing Script..." : "Generate Script"}
            </button>
          </form>
        </div>

        {/* Script Output Panel */}
        <div className="lg:col-span-8">
          {!generatedScript && !isGenerating ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-xl bg-card/50">
              <PenTool className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Teleprompter Ready</h3>
              <p className="text-muted-foreground max-w-sm">Select a research report and hit generate. We'll turn your talking points into a fully conversational, word-for-word script.</p>
            </div>
          ) : isGenerating ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 border rounded-xl bg-card">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <h3 className="text-xl font-semibold animate-pulse">Drafting Your Script</h3>
              <p className="text-muted-foreground mt-2">Writing natural dialogue and intro bumpers...</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-full"
            >
              <div className="border-b p-4 bg-muted/30 flex justify-between items-center flex-wrap gap-2">
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 bg-background border rounded text-xs font-semibold">{duration} Mins</span>
                  <span className="px-2.5 py-1 bg-background border rounded text-xs font-semibold">{hosts}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors"
                  >
                    {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    {isEditing ? "Save Edits" : "Edit"}
                  </button>
                  <button 
                    onClick={handleDownloadWord}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Docx
                  </button>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-sm font-medium transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="p-0 overflow-y-auto max-h-[800px] flex-1">
                {isEditing ? (
                  <textarea 
                    value={generatedScript || ""}
                    onChange={(e) => setGeneratedScript(e.target.value)}
                    className="w-full h-full min-h-[500px] p-8 outline-none resize-none bg-background text-[1.05rem] leading-relaxed"
                    autoFocus
                  />
                ) : (
                  <div className="p-8 prose prose-neutral dark:prose-invert max-w-none text-[1.05rem] leading-relaxed">
                    <ReactMarkdown>{generatedScript || ""}</ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
