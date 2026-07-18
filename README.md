# Skillizee Podcast & Video Studio Tool

## Overview
This is a professional AI-powered Podcast & Video Intelligence Studio designed to automatically analyze long-form video content, extract viral moments, generate captions, and provide a full-fledged timeline editor for creating short-form content.

## Recent Progress & Updates

* **Viral Content Tab Integration:** Separated Viral Content from Video Effects. The Social Tab is now fully context-aware—it dynamically links the AI-generated hooks, Instagram captions, and on-screen caption texts directly to the active video or text clip in the timeline.
* **Caption Styling:** Auto-applies AI-recommended caption presets (Hormozi, Minimalist, Beast, TikTok) when clips are imported to the timeline.
* **Export Enhancements:** Fixed a critical bug where GIF files were being incorrectly saved as `.mp4`. The client now properly extracts the correct file extension from the backend's `Content-Disposition` header, supporting exports in MP4, MOV, WEBM, GIF, MP3, WAV, and AAC.
* **UI Refinements:** Streamlined the Studio View with a collapsible properties sidebar, dynamic track rendering, and improved timeline scrubbing handles.
* **Drag-and-Drop B-Roll:** Added intuitive support for dragging and dropping B-roll directly onto the video preview to instantly add them to the timeline.
* **Intelligent Auto-Framing & Centering:** Corrected the mathematical offsets for 9:16 portrait formats so the active speaker and captions remain perfectly centered.
* **Caption Rendering & Export Fixes:** Resolved issues with incomplete (2-3 second) exports, and restored precise word-by-word color highlighting animations (like TikTok multi-color and Skillizee underlines).
* **Codebase Stability:** Refactored `StudioView.tsx` to resolve React JSX build errors, optimize the timeline UI, and improve state synchronization.

## Getting Started

First, run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
