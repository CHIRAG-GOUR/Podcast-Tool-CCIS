/**
 * Client-Side Audio Extractor Utility
 * High-performance browser audio extraction for ultra-fast podcast processing.
 * Converts video files (MP4, MOV, MKV, WEBM) to compact audio payloads (16kHz Mono 16-bit WAV)
 * directly in the user's browser using the native Web Audio API.
 */

export interface ExtractionResult {
  audioBlob: Blob
  fileName: string
  mimeType: string
  originalSizeMB: number
  extractedSizeMB: number
  compressionRatioPct: number
}

export async function extractAudioFromVideo(
  videoFile: File,
  onProgress?: (progressPct: number, statusText: string) => void
): Promise<ExtractionResult | null> {
  try {
    const originalSizeMB = videoFile.size / (1024 * 1024)
    console.log(
      `[ClientAudioExtractor] Starting extraction for: ${videoFile.name} (${originalSizeMB.toFixed(1)} MB)`
    )
    onProgress?.(5, "Reading media file into browser memory...")

    // Read video file buffer
    const arrayBuffer = await videoFile.arrayBuffer()
    onProgress?.(25, "Decoding audio track with Web Audio API...")

    // Initialize AudioContext at 16kHz for speech recognition optimization
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    
    if (!AudioContextClass) {
      console.warn("[ClientAudioExtractor] Web Audio API not supported in this browser.")
      return null
    }

    const audioContext = new AudioContextClass({ sampleRate: 16000 })
    
    let audioBuffer: AudioBuffer
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    } catch (decodeErr) {
      console.warn("[ClientAudioExtractor] AudioContext.decodeAudioData failed:", decodeErr)
      await audioContext.close()
      return null
    }

    onProgress?.(65, "Encoding optimized 16kHz mono WAV payload...")

    // Downmix to Mono 16kHz 16-bit PCM WAV for maximum compatibility and minimal size
    const wavBlob = audioBufferToWavBlob(audioBuffer, 16000)
    await audioContext.close()

    const extractedSizeMB = wavBlob.size / (1024 * 1024)
    const compressionRatioPct = Math.round((1 - extractedSizeMB / originalSizeMB) * 100)

    console.log(
      `[ClientAudioExtractor] Complete! Reduced from ${originalSizeMB.toFixed(1)} MB -> ${extractedSizeMB.toFixed(
        1
      )} MB (${compressionRatioPct}% reduction)`
    )

    onProgress?.(100, "Audio extraction complete!")

    const baseName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.')) || 'extracted_audio'
    return {
      audioBlob: wavBlob,
      fileName: `${baseName}_audio.wav`,
      mimeType: 'audio/wav',
      originalSizeMB,
      extractedSizeMB,
      compressionRatioPct
    }
  } catch (err) {
    console.warn("[ClientAudioExtractor] Unexpected error during extraction, falling back to direct upload:", err)
    return null
  }
}

/**
 * Converts AudioBuffer to 16kHz Mono 16-bit PCM WAV Blob
 */
function audioBufferToWavBlob(buffer: AudioBuffer, targetSampleRate: number = 16000): Blob {
  const numberOfChannels = 1 // Mono for speech
  const length = Math.floor(buffer.duration * targetSampleRate)
  const resultBuffer = new Float32Array(length)

  const inputChannel0 = buffer.getChannelData(0)
  const inputChannel1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null
  const ratio = buffer.sampleRate / targetSampleRate

  for (let i = 0; i < length; i++) {
    const inputIdx = Math.floor(i * ratio)
    if (inputIdx < inputChannel0.length) {
      if (inputChannel1 && inputIdx < inputChannel1.length) {
        resultBuffer[i] = (inputChannel0[inputIdx] + inputChannel1[inputIdx]) / 2
      } else {
        resultBuffer[i] = inputChannel0[inputIdx]
      }
    }
  }

  const dataView = encode16BitWAV(resultBuffer, targetSampleRate, numberOfChannels)
  return new Blob([dataView.buffer as ArrayBuffer], { type: 'audio/wav' })
}

/**
 * Encodes 32-bit float samples into a 16-bit PCM WAV DataView
 */
function encode16BitWAV(samples: Float32Array, sampleRate: number, numChannels: number): DataView {
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
  const view = new DataView(buffer)

  /* RIFF header */
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * bytesPerSample, true)
  writeString(view, 8, 'WAVE')
  
  /* fmt subchunk */
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true)  // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true) // ByteRate
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true) // BitsPerSample

  /* data subchunk */
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * bytesPerSample, true)

  // Write 16-bit PCM audio samples
  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }

  return view
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
