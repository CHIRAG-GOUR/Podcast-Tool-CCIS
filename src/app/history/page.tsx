"use client"

import { useState, useEffect } from "react"
import { History as HistoryIcon, Clock, Activity, FileText, CheckCircle2, ChevronRight, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

export default function History() {
  const router = useRouter()
  const [activities, setActivities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // We can reuse the library endpoint to get a log of research generations
    fetch("/api/library")
      .then(res => res.json())
      .then(data => {
        if (data.reports) {
          setActivities(data.reports)
        }
        setIsLoading(false)
      })
      .catch(err => {
        console.error("Failed to load history", err)
        setIsLoading(false)
      })
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <HistoryIcon className="h-6 w-6 text-slate-500" />
          Activity History
        </h2>
        <p className="text-muted-foreground mt-2">
          Audit log of all your AI generations, deep research, and script writing sessions.
        </p>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden mt-8">
        <div className="border-b p-4 bg-muted/30">
          <h3 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> Application Audit Log</h3>
        </div>
        
        {isLoading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No activity found yet. Run a Deep Research query to populate your history.
          </div>
        ) : (
          <div className="divide-y">
            {activities.map((activity, idx) => (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                key={activity.id || idx} 
                className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer"
                onClick={() => router.push('/topic-library')}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{activity.topic || "Untitled Deep Research"}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Report Generated</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 ml-2" /> {formatDate(activity.createdAt)}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md border font-medium">
                    {activity.style || 'Standard'}
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity group-hover:translate-x-1 duration-200" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
