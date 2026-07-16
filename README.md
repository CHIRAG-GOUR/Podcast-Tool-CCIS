# Skillizee Podcast & Video Studio Tool

## Overview
This is a professional AI-powered Podcast & Video Intelligence Studio designed to automatically analyze long-form video content, extract viral moments, generate captions, and provide a full-fledged timeline editor for creating short-form content.

## Recent Progress & Updates

* **Viral Content Tab Integration:** Separated Viral Content from Video Effects. The Social Tab is now fully context-aware—it dynamically links the AI-generated hooks, Instagram captions, and on-screen caption texts directly to the active video or text clip in the timeline.
* **Caption Styling:** Auto-applies AI-recommended caption presets (Hormozi, Minimalist, Beast, TikTok) when clips are imported to the timeline.
* **Export Enhancements:** Fixed a critical bug where GIF files were being incorrectly saved as `.mp4`. The client now properly extracts the correct file extension from the backend's `Content-Disposition` header, supporting exports in MP4, MOV, WEBM, GIF, MP3, WAV, and AAC.
* **UI Refinements:** Streamlined the Studio View with a collapsible properties sidebar, dynamic track rendering, and improved timeline scrubbing handles.

## Getting Started

First, run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
