"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UploadView } from "@/components/video-studio/UploadView"
import { ProcessingView } from "@/components/video-studio/ProcessingView"
import { StudioView } from "@/components/video-studio/StudioView"

export type ViewState = 'upload' | 'processing' | 'studio'

export default function VideoStudio() {
  const [view, setView] = useState<ViewState>('upload')
  const [fileDetails, setFileDetails] = useState<{name: string, size: number, type: string} | null>(null)

  const handleUploadComplete = (file: File) => {
    setFileDetails({ name: file.name, size: file.size, type: file.type })
    setView('processing')
  }

  const handleProcessingComplete = () => {
    setView('studio')
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full overflow-hidden flex flex-col bg-background relative">
      <AnimatePresence mode="wait">
        {view === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="h-full w-full flex items-center justify-center p-8"
          >
            <UploadView onUploadComplete={handleUploadComplete} />
          </motion.div>
        )}

        {view === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="h-full w-full flex items-center justify-center p-8"
          >
            <ProcessingView fileDetails={fileDetails} onComplete={handleProcessingComplete} />
          </motion.div>
        )}

        {view === 'studio' && (
          <motion.div
            key="studio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full w-full"
          >
            <StudioView fileDetails={fileDetails} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
