"use client"

import { Lightbulb, Search, Filter } from "lucide-react"

export default function TopicDiscovery() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-yellow-500" />
          Topic Discovery
        </h2>
        <p className="text-muted-foreground mt-2">
          Discover high-performing podcast topics and unexplored niches based on real data.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search niches (e.g. AI Education, FinTech, Productivity)" 
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-card text-foreground focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border bg-card hover:bg-muted transition-colors">
          <Filter className="h-4 w-4" /> Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {[
          { title: "Future of EdTech", score: 98, searchVolume: "High", competition: "Medium" },
          { title: "Financial Literacy for Teens", score: 94, searchVolume: "Medium", competition: "Low" },
          { title: "AI in Classroom Management", score: 89, searchVolume: "High", competition: "High" }
        ].map((topic, i) => (
          <div key={i} className="p-6 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-lg mb-2">{topic.title}</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Trend Score</span>
                <span className="font-medium text-primary">{topic.score}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Search Volume</span>
                <span>{topic.searchVolume}</span>
              </div>
              <div className="flex justify-between">
                <span>Competition</span>
                <span>{topic.competition}</span>
              </div>
            </div>
            <button className="w-full mt-4 py-2 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">
              Analyze Topic
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
