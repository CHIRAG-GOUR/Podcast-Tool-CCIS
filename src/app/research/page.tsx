"use client"

import { Suspense, useState, FormEvent, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Search, Loader2, Sparkles, Settings2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { ScriptBoard } from "@/components/ui/ScriptBoard"

const SCRIPT_STYLES = [
  "Professional", "Fun & Casual", "Corporate / Office", "Educational", 
  "Satirical / Comedy", "Deep Dive / Analytical", "Storytelling / Narrative", 
  "Debate / Controversial", "Interview Style", "Quick Tips / Bitesize"
]

function ResearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [query, setQuery] = useState(initialQuery)
  const [style, setStyle] = useState("Professional")
  const [isSearching, setIsSearching] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [report, setReport] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)

  // Auto-start research if query parameter exists
  useEffect(() => {
    if (initialQuery && !isSearching && !report && !error) {
      handleResearchCore(initialQuery, style)
    }
  }, [initialQuery])

  const handleResearch = async (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    handleResearchCore(query, style)
  }

  const handleResearchCore = async (searchQuery: string, selectedStyle: string) => {
    setIsSearching(true)
    setReport(null)
    setProgress(0)
    setError(null)
    setCurrentStep("Initializing research engine...")

    try {
      const response = await fetch("/api/research/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, style: selectedStyle }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || `HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error("No response body from server")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")
        
        let currentEvent = ""
        
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.replace("event: ", "").trim()
          } else if (line.startsWith("data: ")) {
            const dataString = line.replace("data: ", "").trim()
            if (!dataString) continue

            try {
              const data = JSON.parse(dataString)
              if (currentEvent === "progress") {
                setCurrentStep(data.step)
                setProgress(data.progress)
              } else if (currentEvent === "complete") {
                setReport(data.report)
                setIsSearching(false)
              } else if (currentEvent === "error") {
                setError(data.message)
                setIsSearching(false)
              }
            } catch (err) {
              console.error("Failed to parse SSE data", dataString)
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-500" />
          Deep Research Engine
        </h2>
        <p className="text-muted-foreground mt-2">
          Enter a topic to conduct comprehensive internet research and generate a structured report.
        </p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleResearch} className="relative group space-y-4">
        <div className="relative">
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/50 to-blue-500/50 opacity-20 blur transition duration-500 group-hover:opacity-40"></div>
          <div className="relative flex flex-col sm:flex-row items-center rounded-2xl bg-card p-2 shadow-sm border border-border focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
            <div className="flex-1 flex items-center w-full px-4">
              <Search className="h-5 w-5 text-muted-foreground mr-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isSearching}
                placeholder="What topic should we research today?"
                className="w-full bg-transparent py-3 text-lg outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
            </div>
            
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="mr-2 p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              title="Research Options"
            >
              <Settings2 className="h-5 w-5" />
            </button>

            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="w-full sm:w-auto mt-2 sm:mt-0 rounded-xl bg-primary px-8 py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Researching...
                </>
              ) : (
                "Start Research"
              )}
            </button>
          </div>
        </div>

        {/* Options Panel */}
        {showOptions && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <h4 className="text-sm font-semibold mb-3">Target Output Style</h4>
            <div className="flex flex-wrap gap-2">
              {SCRIPT_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                    style === s 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-transparent text-muted-foreground hover:bg-muted border-border'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </form>

      {/* Progress View */}
      {isSearching && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-8 shadow-sm text-center space-y-6"
        >
          <div className="flex justify-center">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
              <div 
                className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
                style={{ animationDuration: '1.5s' }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                {progress}%
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-medium text-primary animate-pulse">{currentStep}</h3>
            <p className="text-muted-foreground text-sm">Our AI agents are analyzing sources, extracting facts, and synthesizing insights.</p>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>
      )}

      {/* Error View */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-destructive"
        >
          <h3 className="font-semibold mb-2">Research Failed</h3>
          <p>{error}</p>
        </motion.div>
      )}

      {/* Result View */}
      {report && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-8 shadow-sm max-w-none overflow-hidden"
        >
          <ScriptBoard rawReport={report} />
        </motion.div>
      )}
    </div>
  )
}

export default function Research() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ResearchContent />
    </Suspense>
  )
}
