"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProcessingViewProps {
  fileDetails: { name: string; size: number; type: string } | null
  onComplete: () => void
}

const STEPS = [
  "Upload Complete",
  "Extracting Audio",
  "Generating Transcript",
  "Detecting Speakers",
  "Identifying Topics",
  "Detecting Hooks",
  "Ranking Viral Moments",
  "Generating Captions",
  "Rendering Clips"
]

export function ProcessingView({ fileDetails, onComplete }: ProcessingViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // Mock processing simulation
  useEffect(() => {
    let current = 0
    const interval = setInterval(() => {
      current++
      if (current >= STEPS.length) {
        clearInterval(interval)
        setTimeout(() => {
          onComplete()
        }, 800)
      } else {
        setCurrentStepIndex(current)
      }
    }, 1500) // 1.5s per step for demonstration

    return () => clearInterval(interval)
  }, [onComplete])

  return (
    <div className="w-full max-w-2xl bg-card/50 backdrop-blur-xl border rounded-3xl p-10 shadow-lg relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <div className="text-center mb-10 relative z-10">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <h2 className="text-3xl font-bold mb-3">AI Engine Processing</h2>
        <p className="text-muted-foreground">
          {fileDetails?.name ? `Analyzing ${fileDetails.name}...` : 'Analyzing your video...'} You can safely leave this page, we'll notify you when it's done.
        </p>
      </div>

      <div className="space-y-6 relative z-10 pl-4 md:pl-12">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex
          const isCurrent = index === currentStepIndex
          const isPending = index > currentStepIndex

          return (
            <div key={step} className="flex items-center gap-4 relative">
              {/* Connector Line */}
              {index !== STEPS.length - 1 && (
                <div 
                  className={cn(
                    "absolute left-[11px] top-[30px] bottom-[-24px] w-[2px]",
                    isCompleted ? "bg-primary" : "bg-border"
                  )} 
                />
              )}
              
              <div className="relative z-10">
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-primary fill-primary/10" />
                ) : isCurrent ? (
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground/30" />
                )}
              </div>
              
              <span 
                className={cn(
                  "font-medium text-lg transition-colors duration-300",
                  isCompleted ? "text-foreground" : isCurrent ? "text-blue-500 font-semibold" : "text-muted-foreground/50"
                )}
              >
                {step}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
