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

    const prompt = `You are a master podcast scriptwriter and video producer. 
Take the following research report and outline for the topic "${topic}" and expand it into a complete production package.

Configuration:
- Duration: Approximately ${duration} minutes.
- Format: ${format}
- Hosts: ${hosts}

Research Data to base the script on:
${JSON.stringify(reportData, null, 2)}

You MUST return ONLY a valid JSON object. Do not wrap it in markdown code blocks like \`\`\`json.
The JSON must follow this exact structure, where each field contains markdown-formatted text:
{
  "overview": "A brief production overview, pacing guide, and tone direction.",
  "script": "The FULL, WORD-FOR-WORD teleprompter-ready podcast script. Use bolding for speaker names (e.g., **Host 1:**). Include natural transitions and banter.",
  "cameraNotes": "Camera angles, lighting suggestions, and set design notes.",
  "broll": "A shot list of B-roll footage to insert during the edit to keep it engaging.",
  "graphics": "Lower thirds, on-screen text, and data visualizations (charts/graphs) to display.",
  "cta": "Suggested Calls to Action (subscribe, comment, newsletter, sponsors).",
  "seo": "YouTube tags, chapters/timestamps, and SEO optimized description."
}`;

    const result = await proModel.generateContent(prompt);
    let scriptText = result.response.text().trim();

    if (scriptText.startsWith("\`\`\`json")) {
        scriptText = scriptText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    } else if (scriptText.startsWith("\`\`\`")) {
        scriptText = scriptText.replace(/\`\`\`/g, '').trim();
    }
    
    let scriptData;
    try {
      scriptData = JSON.parse(scriptText);
    } catch (e) {
      // Fallback if the AI fails to generate JSON
      scriptData = {
        overview: "Failed to parse JSON. Raw output below.",
        script: scriptText,
        cameraNotes: "",
        broll: "",
        graphics: "",
        cta: "",
        seo: ""
      }
    }

    return NextResponse.json({ scriptData });
  } catch (error) {
    console.error("Script Generation API Error:", error);
    return NextResponse.json({ error: "Failed to generate script" }, { status: 500 });
  }
}
