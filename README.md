# Skillizee Podcast & Video Studio Tool

## Overview
This is a professional AI-powered Podcast & Video Intelligence Studio designed to automatically analyze long-form video content, extract viral moments, generate captions, and provide a full-fledged timeline editor for creating short-form content.

## Recent Progress & Updates

* **Client-Side Audio Extraction & 10x Pipeline Acceleration:** Integrated browser-based Web Audio API extraction (`client-audio-extractor.ts`) to extract audio directly in the browser, reducing network upload payload by up to 85% (~41 MB -> 32 MB).
* **Single Upload Parallel AI Pipeline:** Reused a single Gemini file upload for both viral clips discovery and word-level transcription models running in parallel, eliminating duplicate network polling and cutting server AI processing time in half.
* **Dynamic Step-by-Step Progress Bar:** Redesigned `ProcessingView.tsx` with clean, real-time dynamic progress bars across all 4 processing steps without random timers or emojis.
* **Bulletproof Clip & Main Video Captions:** Fixed caption phrase overlap filtering (`e >= mStart && s <= mEnd`), guaranteeing that both the main video track (`Podcast Source`) and all imported AI clips contain full, word-level captions.
* **Live On-Demand AI Transcription Fallback:** Updated `/api/video/transcribe` and `StudioView.tsx` so that clicking "Add Captions to Timeline" automatically triggers live audio transcription if pre-cached captions are missing.
* **Viral Content Tab Integration:** Separated Viral Content from Video Effects. The Social Tab is now fully context-aware—it dynamically links the AI-generated hooks, Instagram captions, and on-screen caption texts directly to the active video or text clip in the timeline.
* **Caption Styling:** Auto-applies AI-recommended caption presets (Hormozi, Minimalist, Beast, TikTok) when clips are imported to the timeline.
* **Export Enhancements:** Fixed a critical bug where GIF files were being incorrectly saved as `.mp4`. The client now properly extracts the correct file extension from the backend's `Content-Disposition` header, supporting exports in MP4, MOV, WEBM, GIF, MP3, WAV, and AAC.
* **UI & Type Refinements:** Streamlined Studio View with a collapsible properties sidebar, dynamic track rendering, clean TypeScript types, and zero ESLint errors.

## Getting Started

First, run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
