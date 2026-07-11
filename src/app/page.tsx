"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Flame, Clock, BookOpen, Mic2, Loader2, ArrowRight, Sparkles, TrendingUp, History } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function Dashboard() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [recentResearch, setRecentResearch] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(data => {
        if (data.recent) {
          setRecentResearch(data.recent)
        }
      })
      .catch(err => console.error(err))
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) return
    setIsDiscovering(true)
    // Directly push to the research page and pass the query
    router.push(`/research?q=${encodeURIComponent(searchQuery)}`)
  }

  const trendingTopics = [
    "AI Replacing Teachers",
    "The Psychology of Procrastination",
    "How Quantum Computers Actually Work",
    "The Economics of Space Mining"
  ]

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center max-w-4xl mx-auto px-4 py-12">
      
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-4">
          What educational podcast would you like to create?
        </h1>
        <p className="text-lg text-muted-foreground">
          Enter a topic, and our AI will conduct deep internet research and synthesize a complete script.
        </p>
      </motion.div>

      {/* Main Search Box */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-3xl mb-12"
      >
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl transition-all group-hover:bg-primary/10 group-focus-within:bg-primary/15" />
          <div className="relative flex items-center bg-card border shadow-sm rounded-2xl p-2 transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50">
            <Search className="ml-4 h-6 w-6 text-muted-foreground" />
            <input
              type="text"
              placeholder="e.g., The history of the Silk Road..."
              className="w-full bg-transparent border-none py-4 px-4 text-lg outline-none placeholder:text-muted-foreground/60"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isDiscovering}
              autoFocus
            />
            <button
              type="submit"
              disabled={isDiscovering || !searchQuery}
              className="mr-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {isDiscovering ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Trending & Suggestions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-3xl flex flex-wrap items-center justify-center gap-3 mb-16"
      >
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mr-2">
          <TrendingUp className="w-4 h-4" /> Trending:
        </span>
        {trendingTopics.map((topic, idx) => (
          <button
            key={idx}
            onClick={() => setSearchQuery(topic)}
            className="px-4 py-2 rounded-full bg-secondary/50 text-secondary-foreground text-sm font-medium border border-secondary/20 hover:bg-secondary hover:border-secondary/40 transition-colors"
          >
            {topic}
          </button>
        ))}
      </motion.div>

      {/* Recent Research */}
      <AnimatePresence>
        {recentResearch.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-3xl"
          >
            <div className="flex items-center gap-2 mb-4 text-muted-foreground font-medium">
              <History className="w-5 h-5" />
              <h3>Recent Research</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recentResearch.map((script, idx) => (
                <div 
                  key={script.id} 
                  onClick={() => router.push('/topic-library')}
                  className="glass-card p-5 cursor-pointer hover:border-primary/30 transition-all hover:-translate-y-1 group"
                >
                  <h4 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {script.topic || "Untitled Script"}
                  </h4>
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-auto pt-4 border-t border-border/50">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {script.style || 'Standard'}</span>
                    <span>{new Date(script.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

