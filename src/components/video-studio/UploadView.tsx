"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { UploadCloud, FileVideo, X, Play, Clock, Monitor } from "lucide-react"

interface UploadViewProps {
  onUploadComplete: (file: File) => void
}

export function UploadView({ onUploadComplete }: UploadViewProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (file: File) => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo', 'video/webm']
    if (validTypes.includes(file.type)) {
      setSelectedFile(file)
    } else {
      alert("Invalid file type. Please upload MP4, MOV, MKV, AVI, or WEBM.")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-primary mb-4 flex items-center justify-center gap-3">
          <FileVideo className="w-10 h-10 text-blue-500" />
          AI Video Intelligence Studio
        </h1>
        <p className="text-muted-foreground text-lg">
          Upload your podcast and let AI automatically find, edit, and caption your most viral moments.
        </p>
      </div>

      {!selectedFile ? (
        <div
          className={`relative border-2 border-dashed rounded-3xl p-16 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer bg-card/50 backdrop-blur-xl ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="video/mp4,video/quicktime,video/x-matroska,video/x-msvideo,video/webm" 
            className="hidden" 
          />
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 pointer-events-none">
            <UploadCloud className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-semibold mb-2 pointer-events-none">Drag & Drop your video here</h3>
          <p className="text-muted-foreground pointer-events-none mb-6">or click to browse files</p>
          <div className="flex gap-2 text-xs font-medium text-muted-foreground bg-background px-4 py-2 rounded-full border">
            Supported: MP4, MOV, MKV, AVI, WEBM
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card/50 backdrop-blur-xl border rounded-3xl p-8 shadow-sm relative"
        >
          <button 
            onClick={() => setSelectedFile(null)}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-full md:w-1/3 aspect-video bg-black/10 rounded-2xl border flex items-center justify-center relative overflow-hidden">
              <FileVideo className="w-16 h-16 text-muted-foreground/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                <span className="text-white font-medium text-sm drop-shadow-md truncate">{selectedFile.name}</span>
              </div>
            </div>
            
            <div className="flex-1 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-1">Ready to Process</h3>
                <p className="text-muted-foreground">We'll analyze the video for viral hooks, speakers, and topics.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background border rounded-xl p-4 flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">File Size</p>
                    <p className="font-semibold">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <div className="bg-background border rounded-xl p-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Processing</p>
                    <p className="font-semibold">~2-5 mins</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => onUploadComplete(selectedFile)}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01]"
              >
                <Play className="w-5 h-5 fill-current" />
                Analyze & Generate Clips
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
