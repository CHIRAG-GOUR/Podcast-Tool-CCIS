"use client"

import { useState, useEffect } from "react"
import { Library, Folder, MoreVertical, Search, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { motion, AnimatePresence } from "framer-motion"
import { ScriptBoard } from "@/components/ui/ScriptBoard"

export default function TopicLibrary() {
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetch("/api/library")
      .then(res => res.json())
      .then(data => {
        if (data.reports) setReports(data.reports)
        setIsLoading(false)
      })
      .catch(err => {
        console.error("Failed to load reports", err)
        setIsLoading(false)
      })
  }, [])

  const filteredReports = reports.filter(r => 
    (r.topic || "Untitled Topic").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const folders = ["All Research", "Education", "Technology", "Business"]

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Library className="h-6 w-6 text-purple-500" />
            Topic Library
          </h2>
          <p className="text-muted-foreground mt-2">
            Manage and view your saved podcast research reports and generated scripts.
          </p>
        </div>
      </div>

      {!selectedReport ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {folders.map((folder, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${i === 0 ? 'bg-primary/10 border-primary/20' : 'bg-card hover:bg-muted/50'}`}>
                <div className="flex items-center gap-3">
                  <Folder className={`h-5 w-5 ${i === 0 ? 'text-primary' : 'text-blue-500'}`} />
                  <span className={`font-medium ${i === 0 ? 'text-primary' : ''}`}>{folder}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Saved Research Reports</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your library..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-card focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12 border rounded-xl bg-card">
                <p className="text-muted-foreground">No reports found.</p>
              </div>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground border-b">
                    <tr>
                      <th className="px-6 py-4 font-medium">Topic Name</th>
                      <th className="px-6 py-4 font-medium">Style</th>
                      <th className="px-6 py-4 font-medium">Date Saved</th>
                      <th className="px-6 py-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{report.topic}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-secondary rounded-md text-xs font-medium">
                            {report.style || "Standard"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {new Date(report.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleSelectReport(report)}
                            className="text-primary hover:underline font-medium"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6"
          >
            <button 
              onClick={() => setSelectedReport(null)}
              className="mb-6 text-sm text-primary hover:underline flex items-center gap-1"
            >
              &larr; Back to Library
            </button>
            <div className="rounded-xl border bg-card p-8 shadow-sm">
              <div className="border-b pb-4 mb-6">
                <h1 className="text-3xl font-bold">{selectedReport.topic}</h1>
                <div className="flex gap-3 mt-3 text-sm text-muted-foreground">
                  <span className="bg-secondary px-2 py-1 rounded text-foreground font-medium">Style: {selectedReport.style || 'Standard'}</span>
                  <span className="py-1">Generated: {new Date(selectedReport.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="max-w-none">
                <ScriptBoard rawReport={selectedReport.report} />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
