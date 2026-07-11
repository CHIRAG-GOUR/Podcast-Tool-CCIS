import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { topic, reportData, duration, format, hosts } = await req.json();

    if (!topic || !reportData) {
      return NextResponse.json({ error: "Topic and report data are required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const proModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `You are a master podcast scriptwriter. 
Take the following research report and outline for the topic "${topic}" and expand it into a FULL, WORD-FOR-WORD teleprompter-ready podcast script.

Configuration:
- Duration: Approximately ${duration} minutes (adjust word count accordingly, assuming 150 words per minute).
- Format: ${format}
- Hosts: ${hosts}

Make it sound natural, conversational, and engaging. Include natural transitions, intro/outro bumpers, and sound effect/music cues where appropriate (e.g. [Upbeat intro music fades in]).

Research Data to base the script on:
${JSON.stringify(reportData, null, 2)}

Format the output cleanly using Markdown. Use bolding for speaker names (e.g., **Host 1:**).`;

    const result = await proModel.generateContent(prompt);
    const scriptText = result.response.text();

    return NextResponse.json({ script: scriptText });
  } catch (error) {
    console.error("Script Generation API Error:", error);
    return NextResponse.json({ error: "Failed to generate script" }, { status: 500 });
  }
}
