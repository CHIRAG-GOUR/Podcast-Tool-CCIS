"use client"

import { useState } from "react"
import { LineChart, Search, Target, TrendingUp, AlertCircle, PlayCircle, Loader2 } from "lucide-react"
import { motion } from "framer-motion"

interface Competitor {
  name: string
  host: string
  audience: string
  strategy: string
  weakness: string
  topEpisodes: string[]
}

export default function CompetitorIntelligence() {
  const [topic, setTopic] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [competitors, setCompetitors] = useState<Competitor[]>([])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic) return
    
    setIsSearching(true)
    try {
      const res = await fetch("/api/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      })
      const data = await res.json()
      if (data.competitors) {
        setCompetitors(data.competitors)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <LineChart className="h-6 w-6 text-green-500" />
          Competitor Intelligence
        </h2>
        <p className="text-muted-foreground mt-2">
          Analyze competing podcasts, discover their strategies, and find market gaps you can exploit.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative max-w-2xl mt-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input 
          type="text" 
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter your podcast niche (e.g. EdTech Startups, Indie Game Dev...)"
          className="w-full pl-12 pr-32 py-4 rounded-xl border bg-card text-foreground focus:ring-2 focus:ring-primary outline-none shadow-sm text-lg"
          disabled={isSearching}
        />
        <button 
          type="submit"
          disabled={isSearching || !topic}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze"}
        </button>
      </form>

      {/* Empty State */}
      {!isSearching && competitors.length === 0 && (
        <div className="mt-12 text-center py-24 border-2 border-dashed rounded-xl bg-card/50">
          <LineChart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No Competitors Analyzed</h3>
          <p className="text-muted-foreground">Enter a niche above to discover top competitors and market gaps.</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {isSearching && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-6 shadow-sm animate-pulse">
              <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!isSearching && competitors.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {competitors.map((comp, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={idx} 
              className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b bg-muted/30">
                <h3 className="text-xl font-bold mb-1">{comp.name}</h3>
                <p className="text-muted-foreground text-sm font-medium">Hosted by {comp.host}</p>
              </div>
              
              <div className="p-6 space-y-6 flex-1">
                <div>
                  <h4 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                    <Target className="w-4 h-4 text-blue-500" /> Target Audience
                  </h4>
                  <p className="text-sm leading-relaxed">{comp.audience}</p>
                </div>
                
                <div>
                  <h4 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                    <TrendingUp className="w-4 h-4 text-green-500" /> Winning Strategy
                  </h4>
                  <p className="text-sm leading-relaxed">{comp.strategy}</p>
                </div>

                <div>
                  <h4 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" /> Market Gap / Weakness
                  </h4>
                  <div className="bg-orange-500/10 text-orange-700 dark:text-orange-400 p-3 rounded-lg text-sm leading-relaxed border border-orange-500/20">
                    {comp.weakness}
                  </div>
                </div>

                <div>
                  <h4 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                    <PlayCircle className="w-4 h-4 text-purple-500" /> Top Episodes
                  </h4>
                  <ul className="space-y-2">
                    {comp.topEpisodes.map((ep, i) => (
                      <li key={i} className="text-sm flex items-start gap-2 bg-muted/50 p-2 rounded-md">
                        <span className="text-muted-foreground font-medium">{i+1}.</span> {ep}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
