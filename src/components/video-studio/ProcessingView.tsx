"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react"
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
  "Uploading to Cloud",
  "AI Analysis & Transcription",
  "Finalizing Project"
]

/**
 * Uploads file/blob to Cloud Storage via resumable signed URL with progress reporting.
 */
async function uploadToCloudStorage(
  fileToUpload: File | Blob,
  filename: string,
  contentType: string,
  onProgress?: (pct: number) => void
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

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            const pct = Math.min(100, Math.max(0, Math.round((e.loaded / e.total) * 100)));
            onProgress(pct);
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
  const [stepProgress, setStepProgress] = useState<{ [key: number]: number }>({ 0: 0, 1: 0, 2: 0, 3: 0 })
  const [statusMessage, setStatusMessage] = useState<string>("Initializing...")
  const [compressionStats, setCompressionStats] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let aiIntervalTimer: NodeJS.Timeout | null = null;

    const processVideo = async () => {
      try {
        if (!file) throw new Error("No file selected");

        // ─── STEP 0: Client-Side Audio Extraction ───
        setCurrentStepIndex(0);
        setStatusMessage("Extracting audio track in browser...");
        setStepProgress({ 0: 0, 1: 0, 2: 0, 3: 0 });

        let extractedAudioBlob: Blob | null = null;
        let extractedFileName = "";
        let extractedMimeType = "";

        try {
          const extraction = await extractAudioFromVideo(file, (pct, status) => {
            setStepProgress((prev) => ({ ...prev, 0: Math.min(100, pct) }));
            setStatusMessage(status);
          });

          if (extraction) {
            extractedAudioBlob = extraction.audioBlob;
            extractedFileName = extraction.fileName;
            extractedMimeType = extraction.mimeType;
            setCompressionStats(
              `Payload optimized: ${extraction.originalSizeMB.toFixed(0)} MB -> ${extraction.extractedSizeMB.toFixed(1)} MB (${extraction.compressionRatioPct}% reduction)`
            );
            console.log("[ProcessingView] Client audio extraction complete:", extraction);
          }
        } catch (extractErr) {
          console.warn("[ProcessingView] Client extraction failed:", extractErr);
        }

        setStepProgress((prev) => ({ ...prev, 0: 100 }));

        // ─── STEP 1: Upload to Cloud Storage ───
        setCurrentStepIndex(1);
        let fileKey: string | null = null;

        if (extractedAudioBlob) {
          setStatusMessage("Uploading optimized audio payload to cloud...");
          fileKey = await uploadToCloudStorage(
            extractedAudioBlob,
            extractedFileName,
            extractedMimeType,
            (pct) => {
              setStepProgress((prev) => ({ ...prev, 1: pct }));
            }
          );
        }

        if (!fileKey) {
          setStatusMessage("Uploading video file to cloud storage...");
          setCompressionStats(null);
          fileKey = await uploadToCloudStorage(
            file,
            file.name,
            file.type,
            (pct) => {
              setStepProgress((prev) => ({ ...prev, 1: pct }));
            }
          );
        }

        setStepProgress((prev) => ({ ...prev, 1: 100 }));

        // ─── STEP 2: Server AI Analysis ───
        setCurrentStepIndex(2);
        setStatusMessage("AI is analyzing speech, finding viral hooks and generating captions...");

        let aiPct = 0;
        aiIntervalTimer = setInterval(() => {
          aiPct = Math.min(95, aiPct + 1);
          setStepProgress((prev) => ({ ...prev, 2: aiPct }));
        }, 350);

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

        if (aiIntervalTimer) clearInterval(aiIntervalTimer);
        setStepProgress((prev) => ({ ...prev, 2: 100 }));

        // ─── STEP 3: Finalizing Project ───
        setCurrentStepIndex(3);
        setStatusMessage("Finalizing project and loading Studio Timeline...");
        setStepProgress((prev) => ({ ...prev, 3: 100 }));

        setTimeout(() => {
          onComplete(data);
        }, 600);

      } catch (err: unknown) {
        const errObj = err as { message?: string };
        console.error("Video processing error:", err);
        setError(errObj.message || "Failed to analyze video. Please try again.");
        if (aiIntervalTimer) clearInterval(aiIntervalTimer);
      }
    };

    processVideo();

    return () => {
      if (aiIntervalTimer) clearInterval(aiIntervalTimer);
    };
  }, [file, context, onComplete]);

  // Compute total overall percentage (0% -> 100%) across 4 steps
  const overallProgress = Math.min(100, Math.round(
    ((stepProgress[0] || 0) * 0.25) +
    ((stepProgress[1] || 0) * 0.25) +
    ((stepProgress[2] || 0) * 0.40) +
    ((stepProgress[3] || 0) * 0.10)
  ));

  return (
    <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="text-center mb-8 relative z-10">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
        </div>
        {error ? (
          <h2 className="text-3xl font-bold mb-2 text-red-600">Processing Failed</h2>
        ) : (
          <h2 className="text-3xl font-bold mb-2 text-gray-900">
            AI Engine Processing
          </h2>
        )}
        <p className={error ? "text-red-500 font-medium" : "text-gray-500 text-sm"}>
          {error ? error : statusMessage}
        </p>

        {compressionStats && !error && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-full">
            {compressionStats}
          </div>
        )}
      </div>

      {/* Overall Progress Bar */}
      {!error && (
        <div className="mb-8 relative z-10 bg-gray-50 border border-gray-100 rounded-2xl p-4 shadow-inner">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Overall Processing Progress
            </span>
            <span className="text-sm font-bold font-mono text-primary">
              {overallProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 4 Steps List with Individual Progress Bars */}
      <div className="space-y-6 relative z-10 pl-2 md:pl-6">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex || stepProgress[index] === 100
          const isCurrent = index === currentStepIndex && stepProgress[index] < 100
          const currentPct = isCompleted ? 100 : (isCurrent ? (stepProgress[index] || 0) : 0)

          return (
            <div key={step} className="flex flex-col gap-2 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative z-10">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "font-medium text-sm md:text-base transition-colors duration-300",
                      isCompleted
                        ? "text-gray-900 font-semibold"
                        : isCurrent
                        ? "text-blue-600 font-bold"
                        : "text-gray-400"
                    )}
                  >
                    {step}
                  </span>
                </div>

                <span
                  className={cn(
                    "text-xs font-mono px-2.5 py-0.5 rounded-full border transition-all duration-300",
                    isCompleted
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium"
                      : isCurrent
                      ? "bg-blue-50 text-blue-700 border-blue-200 font-semibold"
                      : "bg-gray-50 text-gray-400 border-gray-200"
                  )}
                >
                  {currentPct}%
                </span>
              </div>

              {/* Per-step Fulfillment Progress Bar */}
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden ml-8 max-w-[calc(100%-2rem)]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300 ease-out",
                    isCompleted
                      ? "bg-emerald-500"
                      : isCurrent
                      ? "bg-blue-600"
                      : "bg-transparent"
                  )}
                  style={{ width: `${currentPct}%` }}
                />
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
