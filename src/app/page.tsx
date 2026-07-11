"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Flame, Clock, BookOpen, Mic2, Loader2, MessageCircle, Rss, Hash, Link as LinkIcon, Camera, ArrowRight, PlayCircle } from "lucide-react"
import { motion } from "framer-motion"

export default function Dashboard() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchMode, setSearchMode] = useState<"research" | "discover">("research")
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [discoveredTopics, setDiscoveredTopics] = useState<any[]>([])
  
  const [dashboardData, setDashboardData] = useState({
    stats: [
      { name: "Total Scripts", value: "...", icon: BookOpen, change: "+0%", changeType: "positive" },
      { name: "Avg. Generation Time", value: "...", icon: Clock, change: "-0s", changeType: "positive" },
      { name: "Audience Engagement", value: "...", icon: Flame, change: "+0%", changeType: "positive" },
    ],
    recent: [] as any[]
  })

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(data => {
        if (data.stats) {
          setDashboardData({
            stats: [
              { name: "Total Scripts", value: data.stats.totalScripts.toString(), icon: BookOpen, change: "+12%", changeType: "positive" },
              { name: "Avg. Generation Time", value: data.stats.avgGenerationTime, icon: Clock, change: "-5s", changeType: "positive" },
              { name: "Audience Engagement", value: data.stats.engagement, icon: Flame, change: "+3 this week", changeType: "positive" },
            ],
            recent: data.recent || []
          })
        }
      })
      .catch(err => console.error(err))
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) return

    if (searchMode === "research") {
      router.push(`/research?q=${encodeURIComponent(searchQuery)}`)
    } else {
      setIsDiscovering(true)
      try {
        const res = await fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: searchQuery })
        })
        const data = await res.json()
        if (data.topics) setDiscoveredTopics(data.topics)
      } catch (err) {
        console.error(err)
      } finally {
        setIsDiscovering(false)
      }
    }
  }

  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase()
    if (p.includes("reddit")) return <MessageCircle className="h-4 w-4 text-orange-500" />
    if (p.includes("twitter") || p.includes("x")) return <Hash className="h-4 w-4 text-blue-400" />
    if (p.includes("instagram")) return <Camera className="h-4 w-4 text-pink-500" />
    if (p.includes("linkedin")) return <LinkIcon className="h-4 w-4 text-blue-600" />
    return <Rss className="h-4 w-4 text-gray-500" />
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          Your AI-powered podcast production studio.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {dashboardData.stats.map((stat) => (
          <div
            key={stat.name}
            className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </h3>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{stat.value}</span>
              <span
                className={`text-sm font-medium px-2 py-0.5 rounded-full border ${
                  stat.changeType === "positive" 
                    ? "text-emerald-700 bg-emerald-100 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800" 
                    : "text-red-700 bg-red-100 border-red-300 dark:text-red-400 dark:bg-red-950 dark:border-red-800"
                }`}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Action Area */}
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-6">
            <Mic2 className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-2">What are we recording today?</h3>
          <p className="text-muted-foreground mb-8">
            Enter a topic to start deep internet research, or discover what's currently trending in your niche.
          </p>

          <div className="flex justify-center gap-4 mb-6">
            <button 
              onClick={() => setSearchMode("research")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${searchMode === 'research' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              Deep Research
            </button>
            <button 
              onClick={() => setSearchMode("discover")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${searchMode === 'discover' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              Discover Trends
            </button>
          </div>

          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={searchMode === "research" ? "e.g., The future of AI in education..." : "e.g., Tech, Education, Startups..."}
              className="w-full rounded-full border bg-background py-4 pl-12 pr-32 text-lg shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isDiscovering}
            />
            <button
              type="submit"
              disabled={isDiscovering || !searchQuery}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-primary px-6 py-2 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {isDiscovering ? <Loader2 className="w-5 h-5 animate-spin" /> : (searchMode === "research" ? "Research" : "Discover")}
            </button>
          </form>
        </div>
      </div>

      {/* Dynamic Recent Activity Feed */}
      {dashboardData.recent.length > 0 && (
        <div className="space-y-4 mt-8">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <PlayCircle className="text-blue-500 w-5 h-5" /> 
            Recent Script Generations
          </h3>
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            {dashboardData.recent.map((script, idx) => (
              <div 
                key={script.id} 
                onClick={() => router.push('/topic-library')}
                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors ${idx !== dashboardData.recent.length - 1 ? 'border-b' : ''}`}
              >
                <div>
                  <h4 className="font-semibold">{script.topic || "Untitled Script"}</h4>
                  <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                    <span className="px-2 py-0.5 bg-secondary rounded text-xs text-foreground font-medium border">Style: {script.style || 'Standard'}</span>
                    <span>{new Date(script.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discovered Topics Results */}
      {searchMode === "discover" && discoveredTopics.length > 0 && (
        <div className="space-y-4 mt-8">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Flame className="text-orange-500 w-5 h-5" /> 
            Trending Right Now
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {discoveredTopics.map((topic, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={idx} 
                className="bg-card border rounded-xl p-5 shadow-sm flex flex-col hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => router.push(`/research?q=${encodeURIComponent(topic.title)}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-md text-xs font-medium border">
                    {getPlatformIcon(topic.platform)}
                    {topic.platform}
                  </div>
                  <div className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                    Score: {topic.score}
                  </div>
                </div>
                <h4 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{topic.title}</h4>
                <p className="text-sm text-muted-foreground flex-1">{topic.description}</p>
                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex justify-between items-center">
                  <span>Source: {topic.source}</span>
                  <span className="text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Deep Research <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
