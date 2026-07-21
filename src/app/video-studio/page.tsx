"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UploadView } from "@/components/video-studio/UploadView"
import { ProcessingView } from "@/components/video-studio/ProcessingView"
import { StudioView } from "@/components/video-studio/StudioView"

export type ViewState = 'upload' | 'processing' | 'studio'

export default function VideoStudio() {
  const [view, setView] = useState<ViewState>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [videoContext, setVideoContext] = useState("")
  const [clips, setClips] = useState<any[]>([])
  const [captions, setCaptions] = useState<any[]>([])
  const [fileKey, setFileKey] = useState<string | null>(null)

  const handleUploadComplete = (uploadedFile: File, context: string) => {
    setFile(uploadedFile)
    setFileUrl(URL.createObjectURL(uploadedFile))
    setVideoContext(context)
    setView('processing')
  }

  const [cuts, setCuts] = useState<any[]>([])

  const handleProcessingComplete = (data: any) => {
    setClips(data.clips || [])
    setCaptions(data.captions || [])
    setCuts(data.cuts || [])
    setFileKey(data.fileKey || null)
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
            className="h-full w-full flex items-center justify-center p-4 md:p-8 overflow-y-auto"
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
            className="h-full w-full flex items-center justify-center p-4 md:p-8"
          >
            <ProcessingView file={file} context={videoContext} onComplete={handleProcessingComplete} onCancel={() => setView('upload')} />
          </motion.div>
        )}

        {view === 'studio' && (
          <motion.div
            key="studio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full w-full"
          >
            <StudioView file={file} fileKey={fileKey} fileUrl={fileUrl} clips={clips} initialCaptions={captions} initialCuts={cuts} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
