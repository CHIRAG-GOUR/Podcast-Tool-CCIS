"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Circle, Loader2, Sparkles, Zap, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { extractAudioFromVideo } from "@/lib/client-audio-extractor"

interface ProcessingViewProps {
  file: File | null
  context?: string
  onComplete: (data: unknown) => void
  onCancel?: () => void
}

const STEPS = [
  "Upload Complete",
  "Analyzing Video Content",
  "Generating Smart Clips",
  "Finalizing Project"
]

/**
 * Attempts to upload a file to Cloud Storage using a signed resumable URL.
 * Returns the fileKey on success, null on failure.
 */
async function uploadToCloudStorage(
  fileToUpload: File | Blob,
  filename: string,
  contentType: string,
  onUploadProgress?: (progressPct: number) => void
): Promise<string | null> {
  try {
    const urlRes = await fetch("/api/video/upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN}`
      },
      body: JSON.stringify({ filename, contentType })
    });

    if (!urlRes.ok) return null;

    const urlData = await urlRes.json().catch(() => ({}));
    if (!urlData.url || !urlData.key) return null;

    const initRes = await fetch(urlData.url, {
      method: "POST",
      headers: {
        "x-goog-resumable": "start",
        "Content-Type": contentType
      }
    });

    if (!initRes.ok) return null;

    const sessionUrl = initRes.headers.get("location");
    if (!sessionUrl) return null;

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", sessionUrl, true);
      xhr.setRequestHeader("Content-Type", contentType);

      if (xhr.upload && onUploadProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const uploadPct = Math.round((e.loaded / e.total) * 100);
            onUploadProgress(uploadPct);
          }
        };
      }

      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(xhr.response) : reject(new Error(`Upload status ${xhr.status}`));
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("Upload aborted"));
      xhr.send(fileToUpload);
    });

    return urlData.key;
  } catch (err) {
    console.warn("[uploadToCloudStorage] Failed:", err);
    return null;
  }
}

export function ProcessingView({ file, context, onComplete, onCancel }: ProcessingViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [statusMessage, setStatusMessage] = useState<string>("Initializing processing engine...")
  const [compressionStats, setCompressionStats] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let progressTimer: NodeJS.Timeout | null = null;
    let statusTimer: NodeJS.Timeout | null = null;

    const processVideo = async () => {
      try {
        if (!file) throw new Error("No file selected");

        // ─── STEP 1: Upload Complete (0% -> 25%) ───
        setCurrentStepIndex(0);
        setProgressPercent(2);
        setStatusMessage("Extracting audio track in browser...");

        let extractedAudioBlob: Blob | null = null;
        let extractedFileName = "";
        let extractedMimeType = "";

        try {
          const extraction = await extractAudioFromVideo(file, (extractPct, status) => {
            setStatusMessage(status);
            // Extraction accounts for 0% to 10% of total progress
            setProgressPercent(Math.min(10, Math.round(extractPct * 0.1)));
          });

          if (extraction) {
            extractedAudioBlob = extraction.audioBlob;
            extractedFileName = extraction.fileName;
            extractedMimeType = extraction.mimeType;
            setCompressionStats(
              `⚡ ${extraction.originalSizeMB.toFixed(0)} MB → ${extraction.extractedSizeMB.toFixed(1)} MB (${extraction.compressionRatioPct}% smaller)`
            );
            console.log("[ProcessingView] Client audio extraction succeeded:", extraction);
          }
        } catch (extractErr) {
          console.warn("[ProcessingView] Client extraction failed:", extractErr);
        }

        let fileKey: string | null = null;

        // Upload extracted audio or fallback video
        if (extractedAudioBlob) {
          setStatusMessage("Uploading compressed payload to cloud storage...");
          fileKey = await uploadToCloudStorage(
            extractedAudioBlob,
            extractedFileName,
            extractedMimeType,
            (uploadPct) => {
              // Upload accounts for 10% to 25% of total progress
              setProgressPercent(10 + Math.round(uploadPct * 0.15));
            }
          );
        }

        if (!fileKey) {
          setStatusMessage("Uploading full video file to cloud storage...");
          setCompressionStats(null);
          fileKey = await uploadToCloudStorage(
            file,
            file.name,
            file.type,
            (uploadPct) => {
              setProgressPercent(Math.min(25, Math.round(uploadPct * 0.25)));
            }
          );
        }

        // Complete Step 1
        setProgressPercent(25);
        setStatusMessage("Upload complete! Starting AI analysis...");

        // ─── STEP 2: Analyzing Video Content (25% -> 60%) ───
        setCurrentStepIndex(1);

        // Smooth simulated progress during AI Gemini analysis
        progressTimer = setInterval(() => {
          setProgressPercent((prev) => {
            if (prev < 58) return prev + 1;
            return prev;
          });
        }, 800);

        const statusMessagesStep2 = [
          "Analyzing video speech & transcript...",
          "Detecting speakers & audio cadence...",
          "Identifying high-retention conversational hooks...",
          "Evaluating viral potential & topic score..."
        ];
        let statusIdx = 0;
        statusTimer = setInterval(() => {
          statusIdx = (statusIdx + 1) % statusMessagesStep2.length;
          setStatusMessage(statusMessagesStep2[statusIdx]);
        }, 6000);

        // Send payload to backend
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

        if (progressTimer) clearInterval(progressTimer);
        if (statusTimer) clearInterval(statusTimer);

        // Complete Step 2
        setProgressPercent(60);

        // ─── STEP 3: Generating Smart Clips (60% -> 90%) ───
        setCurrentStepIndex(2);
        setStatusMessage("Generating smart clips, captions & portrait cuts...");

        progressTimer = setInterval(() => {
          setProgressPercent((prev) => {
            if (prev < 88) return prev + 1;
            return prev;
          });
        }, 150);

        await new Promise((r) => setTimeout(r, 1200));

        if (progressTimer) clearInterval(progressTimer);

        // Complete Step 3
        setProgressPercent(90);

        // ─── STEP 4: Finalizing Project (90% -> 100%) ───
        setCurrentStepIndex(3);
        setStatusMessage("Finalizing project & loading Studio Timeline...");

        progressTimer = setInterval(() => {
          setProgressPercent((prev) => {
            if (prev < 100) return prev + 1;
            return 100;
          });
        }, 50);

        await new Promise((r) => setTimeout(r, 600));

        if (progressTimer) clearInterval(progressTimer);
        setProgressPercent(100);
        setCurrentStepIndex(STEPS.length);

        setTimeout(() => {
          onComplete(data);
        }, 500);

      } catch (err: unknown) {
        const errObj = err as { message?: string };
        console.error("Video processing error:", err);
        setError(errObj.message || "Failed to analyze video. Please try again.");
        if (progressTimer) clearInterval(progressTimer);
        if (statusTimer) clearInterval(statusTimer);
      }
    };

    processVideo();

    return () => {
      if (progressTimer) clearInterval(progressTimer);
      if (statusTimer) clearInterval(statusTimer);
    };
  }, [file, context, onComplete]);

  return (
    <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="text-center mb-8 relative z-10">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
        </div>
        {error ? (
          <h2 className="text-3xl font-bold mb-2 text-red-600">Processing Failed</h2>
        ) : (
          <h2 className="text-3xl font-bold mb-2 text-gray-900 flex items-center justify-center gap-2">
            AI Engine Processing <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
          </h2>
        )}
        <p className={error ? "text-red-500 font-medium" : "text-gray-500 text-sm"}>
          {error ? error : statusMessage}
        </p>

        {compressionStats && !error && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-full">
            {compressionStats}
          </div>
        )}
      </div>

      {/* Dynamic Progress Bar Component */}
      {!error && (
        <div className="mb-8 relative z-10 bg-gray-50 border border-gray-100 rounded-2xl p-4 shadow-inner">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Overall Progress
            </span>
            <span className="text-sm font-bold font-mono text-primary">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 4 Steps Indicator List */}
      <div className="space-y-5 relative z-10 pl-4 md:pl-8">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex || progressPercent === 100
          const isCurrent = index === currentStepIndex && progressPercent < 100

          return (
            <div key={step} className="flex items-center gap-4 relative">
              {/* Connector Line */}
              {index !== STEPS.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[11px] top-[30px] bottom-[-20px] w-[2px] transition-colors duration-500",
                    isCompleted ? "bg-primary" : "bg-gray-200"
                  )}
                />
              )}

              <div className="relative z-10">
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                ) : isCurrent ? (
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-300" />
                )}
              </div>

              <div className="flex-1 flex justify-between items-center">
                <span
                  className={cn(
                    "font-medium text-base md:text-lg transition-colors duration-300",
                    isCompleted ? "text-gray-900 font-semibold" : isCurrent ? "text-blue-600 font-bold" : "text-gray-400"
                  )}
                >
                  {step}
                </span>

                <span
                  className={cn(
                    "text-xs font-mono px-2.5 py-0.5 rounded-full border transition-all duration-300",
                    isCompleted
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium"
                      : isCurrent
                      ? "bg-blue-50 text-blue-700 border-blue-200 font-semibold animate-pulse"
                      : "bg-gray-50 text-gray-400 border-gray-200"
                  )}
                >
                  {isCompleted ? "100%" : isCurrent ? `${progressPercent}%` : "0%"}
                </span>
              </div>
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
