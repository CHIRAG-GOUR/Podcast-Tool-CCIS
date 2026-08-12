"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Circle, Loader2, Sparkles, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { extractAudioFromVideo } from "@/lib/client-audio-extractor"

interface ProcessingViewProps {
  file: File | null
  context?: string
  onComplete: (data: unknown) => void
  onCancel?: () => void
}

const STEPS = [
  "Extracting Audio (Browser)",
  "Uploading to Server",
  "AI Analysis & Transcription",
  "Finalizing Project"
]

export function ProcessingView({ file, context, onComplete, onCancel }: ProcessingViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [statusMessage, setStatusMessage] = useState<string>("Initializing...")
  const [compressionStats, setCompressionStats] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let intervalTimer: NodeJS.Timeout | null = null;
    const processVideo = async () => {
      try {
        if (!file) throw new Error("No file selected");

        // ─── STEP 0: Client-Side Audio Extraction ───
        setCurrentStepIndex(0);
        setStatusMessage("Extracting audio track in browser...");

        let fileToUpload: File = file;
        let usedClientExtraction = false;

        try {
          const extraction = await extractAudioFromVideo(file, (_pct, status) => {
            setStatusMessage(status);
          });

          if (extraction) {
            fileToUpload = new File([extraction.audioBlob], extraction.fileName, {
              type: extraction.mimeType,
            });
            usedClientExtraction = true;
            setCompressionStats(
              `⚡ ${extraction.originalSizeMB.toFixed(0)} MB → ${extraction.extractedSizeMB.toFixed(1)} MB (${extraction.compressionRatioPct}% smaller)`
            );
            console.log("[ProcessingView] Client audio extraction succeeded:", extraction);
          }
        } catch (extractErr) {
          console.warn("[ProcessingView] Client extraction failed, using original video:", extractErr);
        }

        if (!usedClientExtraction) {
          setStatusMessage("Browser extraction unavailable, uploading full video...");
        }

        // ─── STEP 1: Upload ───
        setCurrentStepIndex(1);
        setStatusMessage(usedClientExtraction
          ? "Uploading lightweight audio payload..."
          : "Uploading video file...");

        let fileKey: string | null = null;

        // Attempt Cloud Storage signed URL upload (resumable for large files)
        try {
          const urlRes = await fetch("/api/video/upload-url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN}`
            },
            body: JSON.stringify({ filename: fileToUpload.name, contentType: fileToUpload.type })
          });

          if (urlRes.ok) {
            const urlData = await urlRes.json().catch(() => ({}));
            if (urlData.url && urlData.key) {
              const initRes = await fetch(urlData.url, {
                method: "POST",
                headers: {
                  "x-goog-resumable": "start",
                  "Content-Type": fileToUpload.type
                }
              });

              if (initRes.ok) {
                const sessionUrl = initRes.headers.get("location");
                if (sessionUrl) {
                  await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("PUT", sessionUrl, true);
                    xhr.setRequestHeader("Content-Type", fileToUpload.type);
                    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(xhr.response) : reject(new Error(`Status ${xhr.status}`));
                    xhr.onerror = () => reject(new Error("Network error"));
                    xhr.onabort = () => reject(new Error("Aborted"));
                    xhr.send(fileToUpload);
                  });
                  fileKey = urlData.key;
                  console.log("[ProcessingView] Cloud storage upload complete. fileKey:", fileKey);
                }
              }
            }
          }
        } catch (cloudErr) {
          console.warn("[ProcessingView] Cloud upload failed, falling back to direct upload:", cloudErr);
        }

        // ─── STEP 2: Server Analysis (long-running) ───
        setCurrentStepIndex(2);
        setStatusMessage("AI is analyzing speech, finding viral hooks & generating captions...");

        // Gentle step pulse — just toggles status text while waiting
        const statusMessages = [
          "AI is analyzing speech, finding viral hooks & generating captions...",
          "Transcribing speech & discovering high-retention moments...",
          "Almost there — generating clip metadata & captions...",
        ];
        let msgIndex = 0;
        intervalTimer = setInterval(() => {
          msgIndex = (msgIndex + 1) % statusMessages.length;
          setStatusMessage(statusMessages[msgIndex]);
        }, 12000);

        // Build FormData — use "audio" key for extracted audio, "video" key for fallback
        const formData = new FormData();
        if (fileKey) {
          formData.append("fileKey", fileKey);
        } else if (usedClientExtraction) {
          formData.append("audio", fileToUpload);
        } else {
          formData.append("video", fileToUpload);
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

        // ─── STEP 3: Complete ───
        if (intervalTimer) clearInterval(intervalTimer);
        setCurrentStepIndex(STEPS.length); // mark all steps complete
        setStatusMessage("Complete! Opening Studio Timeline...");

        setTimeout(() => {
          onComplete(data);
        }, 800);

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
          <h2 className="text-3xl font-bold mb-3 text-gray-900 flex items-center justify-center gap-2">
            AI Engine Processing <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
          </h2>
        )}
        <p className={error ? "text-red-500 font-medium" : "text-gray-500"}>
          {error
            ? error
            : statusMessage}
        </p>

        {compressionStats && !error && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-full">
            {compressionStats}
          </div>
        )}
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
