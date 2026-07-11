import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const proModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    
    const prompt = `You are a viral trend analyst for educational and general podcasts.
The user wants to discover trending sub-topics related to: "${topic}".
Generate exactly 10 highly engaging, trending sub-topics.
For each sub-topic, provide:
1. title: The sub-topic title.
2. description: A short, punchy 2-sentence description of why it's interesting.
3. platform: Where it's trending most (e.g., "Reddit", "Instagram", "Twitter", "TikTok", "LinkedIn").
4. score: A trend score out of 100 (e.g., 95).
5. source: A simulated specific source (e.g., "r/education", "@edutok", "LinkedIn Top Voices").

Return ONLY a valid JSON array of objects with these exact keys. Do not use markdown blocks like \`\`\`json.`;

    const result = await proModel.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith("```json")) {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (text.startsWith("```")) {
        text = text.replace(/```/g, '').trim();
    }
    
    const topics = JSON.parse(text);

    return NextResponse.json({ topics });
  } catch (error: any) {
    console.error("Discovery API error:", error);
    return NextResponse.json({ error: "An error occurred during discovery" }, { status: 500 });
  }
}
