import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { topic, reportData } = await req.json();

    if (!topic || !reportData) {
      return NextResponse.json({ error: "Topic and report data are required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const proModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `You are an expert podcast producer and social media manager.
Take the following podcast research report for the topic "${topic}" and generate a comprehensive set of publishing assets.

Return ONLY a valid JSON object. Do not use markdown formatting like \`\`\`json.
The JSON object MUST strictly follow this structure:
{
  "titles": ["String", "String", "String", "String", "String"], // 5 catchy, highly clickable episode titles
  "showNotes": "String", // Comprehensive show notes (use markdown inside the string: Summary, Key Takeaways, Timestamps guess)
  "socialPosts": {
    "twitter": "String", // An engaging 3-part Twitter thread (use markdown)
    "linkedin": "String", // A professional, insightful LinkedIn post with line breaks
    "instagram": "String" // A visually descriptive Instagram caption with emojis and 10 relevant hashtags
  },
  "coverArtPrompts": ["String", "String", "String"] // 3 highly descriptive Midjourney/DALL-E prompts for the episode cover art
}

Research Data:
${JSON.stringify(reportData, null, 2)}
`;

    const result = await proModel.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith("```json")) {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (text.startsWith("```")) {
        text = text.replace(/```/g, '').trim();
    }

    return NextResponse.json({ assets: JSON.parse(text) });
  } catch (error) {
    console.error("Asset Generation API Error:", error);
    return NextResponse.json({ error: "Failed to generate assets" }, { status: 500 });
  }
}
