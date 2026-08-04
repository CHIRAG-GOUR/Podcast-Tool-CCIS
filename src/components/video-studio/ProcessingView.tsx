"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProcessingViewProps {
  file: File | null
  context?: string
  onComplete: (data: unknown) => void
  onCancel?: () => void
}

const STEPS = [
  "Uploading Video",
  "Analyzing Video Content",
  "Generating Smart Clips",
  "Finalizing Project"
]

export function ProcessingView({ file, context, onComplete, onCancel }: ProcessingViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let intervalTimer: NodeJS.Timeout | null = null;
    const processVideo = async () => {
      try {
        if (!file) throw new Error("No file selected");

        let fileKey: string | null = null;

        // 1. Attempt Cloud Storage signed URL upload (resumable for large files in production)
        try {
          const urlRes = await fetch("/api/video/upload-url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN}`
            },
            body: JSON.stringify({ filename: file.name, contentType: file.type })
          });

          if (urlRes.ok) {
            const urlData = await urlRes.json().catch(() => ({}));
            if (urlData.url && urlData.key) {
              const initRes = await fetch(urlData.url, {
                method: "POST",
                headers: {
                  "x-goog-resumable": "start",
                  "Content-Type": file.type
                }
              });

              if (initRes.ok) {
                const sessionUrl = initRes.headers.get("location");
                if (sessionUrl) {
                  await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("PUT", sessionUrl, true);
                    xhr.setRequestHeader("Content-Type", file.type);
                    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(xhr.response) : reject(new Error(`Status ${xhr.status}`));
                    xhr.onerror = () => reject(new Error("Network error"));
                    xhr.onabort = () => reject(new Error("Aborted"));
                    xhr.send(file);
                  });
                  fileKey = urlData.key;
                  console.log("[ProcessingView] Cloud storage upload complete. fileKey:", fileKey);
                }
              }
            }
          }
        } catch (cloudErr) {
          console.warn("[ProcessingView] Cloud storage signed URL upload failed/unavailable, falling back to direct upload:", cloudErr);
        }

        // Advance step after upload initialization
        setCurrentStepIndex(1);

        // Fake processing steps for Analysis and Generation
        intervalTimer = setInterval(() => {
          setCurrentStepIndex(prev => {
            if (prev < STEPS.length - 1) return prev + 1;
            if (intervalTimer) clearInterval(intervalTimer);
            return prev;
          });
        }, 8000); // 8s per fake step

        // 2. Trigger Analysis via fileKey (cloud) or direct video file (local/fallback)
        const formData = new FormData();
        if (fileKey) {
          formData.append("fileKey", fileKey);
        } else {
          formData.append("video", file);
        }
        if (context) formData.append("context", context);

        const res = await fetch(`/api/video/analyze`, {
          headers: {
            "Authorization": `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN}`
          },
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          let errMessage = "Failed to analyze video";
          try {
            const errData = await res.json();
            if (errData.error) errMessage = errData.error;
          } catch { }
          throw new Error(errMessage);
        }

        const data = await res.json();

        if (intervalTimer) clearInterval(intervalTimer);
        setCurrentStepIndex(STEPS.length); // complete all steps
        setTimeout(() => {
          onComplete(data);
        }, 1000);

      } catch (err: unknown) {
        const errObj = err as { message?: string };
        console.error("Video processing error:", err);
        setError(errObj.message || "Failed to analyze video. Please try again.");
        if (intervalTimer) clearInterval(intervalTimer);
      }
    };

    processVideo();

    return () => {
      if (intervalTimer) clearInterval(intervalTimer);
    };
  }, [file, context, onComplete]);

  return (
    <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="text-center mb-10 relative z-10">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
        </div>
        {error ? (
          <h2 className="text-3xl font-bold mb-3 text-red-600">Processing Failed</h2>
        ) : (
          <h2 className="text-3xl font-bold mb-3 text-gray-900">AI Engine Processing</h2>
        )}
        <p className={error ? "text-red-500 font-medium" : "text-gray-500"}>
          {error
            ? error
            : (file?.name ? `Analyzing ${file.name}...` : 'Analyzing your video...') + " You can safely leave this page, we'll notify you when it's done."}
        </p>
      </div>

      <div className="space-y-6 relative z-10 pl-4 md:pl-12">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex
          const isCurrent = index === currentStepIndex

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
                  <Circle className="w-6 h-6 text-gray-300" />
                )}
              </div>

              <span
                className={cn(
                  "font-medium md:text-lg transition-colors duration-300",
                  isCompleted ? "text-gray-900" : isCurrent ? "text-blue-600 font-semibold" : "text-gray-400"
                )}
              >
                {step}
              </span>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-medium transition-colors"
          >
            Go Back & Try Again
          </button>
        </div>
      )}
    </div>
  )
}
