"use client"

import { useState, useEffect } from "react"
import { Share2, FileText, Loader2, Sparkles, Copy, CheckCircle2, Type, Image as ImageIcon, MessageSquare, Briefcase, Hash, Camera } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { motion } from "framer-motion"

interface AssetsData {
  titles: string[]
  showNotes: string
  socialPosts: {
    twitter: string
    linkedin: string
    instagram: string
  }
  coverArtPrompts: string[]
}

export default function PublishingAssets() {
  const [reports, setReports] = useState<any[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  
  const [selectedReportId, setSelectedReportId] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [assets, setAssets] = useState<AssetsData | null>(null)
  
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({})

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
    setAssets(null)

    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedReport.topic,
          reportData: selectedReport.report
        })
      })
      
      const data = await res.json()
      if (data.assets) {
        setAssets(data.assets)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedStates(prev => ({ ...prev, [key]: true }))
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }))
    }, 2000)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Share2 className="h-6 w-6 text-pink-500" />
          Publishing Assets
        </h2>
        <p className="text-muted-foreground mt-2">
          Auto-generate catchy titles, show notes, social media posts, and cover art prompts for your episode.
        </p>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-sm mb-8">
        <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Source Episode Material
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
          
          <button 
            type="submit"
            disabled={!selectedReportId || isGenerating}
            className="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-lg font-bold flex justify-center items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all h-[46px]"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isGenerating ? "Generating..." : "Generate Assets"}
          </button>
        </form>
      </div>

      {!assets && !isGenerating && (
        <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-xl bg-card/50">
          <Share2 className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Ready to Publish?</h3>
          <p className="text-muted-foreground max-w-sm">Select an episode above and we'll generate everything you need to hit publish and promote your podcast across all platforms.</p>
        </div>
      )}

      {isGenerating && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 border rounded-xl bg-card animate-pulse p-6">
              <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {assets && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Titles & Cover Art - Left Column */}
          <div className="space-y-6">
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="border-b p-4 bg-muted/30 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Type className="w-4 h-4 text-blue-500" /> Episode Titles</h3>
              </div>
              <div className="p-6 space-y-3">
                {assets.titles.map((title, idx) => (
                  <div key={idx} className="flex justify-between items-center group p-3 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border">
                    <span className="font-medium">{title}</span>
                    <button onClick={() => handleCopy(title, `title-${idx}`)} className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                      {copiedStates[`title-${idx}`] ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="border-b p-4 bg-muted/30 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4 text-purple-500" /> Cover Art Prompts</h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-muted-foreground mb-2">Paste these into Midjourney or DALL-E to generate custom episode art.</p>
                {assets.coverArtPrompts.map((prompt, idx) => (
                  <div key={idx} className="relative group p-4 bg-muted/30 rounded-lg border text-sm leading-relaxed">
                    {prompt}
                    <button onClick={() => handleCopy(prompt, `art-${idx}`)} className="absolute top-2 right-2 p-2 bg-background border rounded-md shadow-sm text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                      {copiedStates[`art-${idx}`] ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Show Notes & Social - Right Column */}
          <div className="space-y-6">
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="border-b p-4 bg-muted/30 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-orange-500" /> Show Notes</h3>
                <button onClick={() => handleCopy(assets.showNotes, 'notes')} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border hover:bg-muted rounded-md text-xs font-medium transition-colors">
                  {copiedStates['notes'] ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copiedStates['notes'] ? "Copied" : "Copy All"}
                </button>
              </div>
              <div className="p-6 prose prose-neutral dark:prose-invert prose-sm max-w-none">
                <ReactMarkdown>{assets.showNotes}</ReactMarkdown>
              </div>
            </div>
            
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="border-b p-4 bg-muted/30 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-green-500" /> Social Media Copy</h3>
              </div>
              <div className="p-6 space-y-6">
                
                {/* Twitter */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><Hash className="w-4 h-4 text-sky-500" /> Twitter Thread</h4>
                    <button onClick={() => handleCopy(assets.socialPosts.twitter, 'twitter')} className="text-muted-foreground hover:text-primary transition-colors">
                      {copiedStates['twitter'] ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap">
                    {assets.socialPosts.twitter}
                  </div>
                </div>

                {/* LinkedIn */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-600" /> LinkedIn Post</h4>
                    <button onClick={() => handleCopy(assets.socialPosts.linkedin, 'linkedin')} className="text-muted-foreground hover:text-primary transition-colors">
                      {copiedStates['linkedin'] ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap">
                    {assets.socialPosts.linkedin}
                  </div>
                </div>

                {/* Instagram */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><Camera className="w-4 h-4 text-pink-500" /> Instagram Caption</h4>
                    <button onClick={() => handleCopy(assets.socialPosts.instagram, 'instagram')} className="text-muted-foreground hover:text-primary transition-colors">
                      {copiedStates['instagram'] ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap">
                    {assets.socialPosts.instagram}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
