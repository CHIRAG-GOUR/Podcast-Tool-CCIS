import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();
    
    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const proModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      // @ts-ignore
      tools: [{ googleSearch: {} }]
    });
    
    const prompt = `You are a podcast industry analyst. The user is starting a podcast in the niche: "${topic}".
Identify 3 top competing podcasts in this exact space.
Return ONLY a valid JSON array of objects. Do not use markdown formatting like \`\`\`json.
Each object MUST have:
- name: string (Podcast Name)
- host: string (Host Name)
- audience: string (Target demographic)
- strategy: string (What makes them successful)
- weakness: string (Their blind spot or gap in the market)
- topEpisodes: array of strings (Titles of 2 highly popular episodes)
`;

    const result = await proModel.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith("```json")) {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (text.startsWith("```")) {
        text = text.replace(/```/g, '').trim();
    }

    return NextResponse.json({ competitors: JSON.parse(text) });
  } catch (error) {
    console.error("Discover API Error:", error);
    return NextResponse.json({ error: "Failed to fetch competitors" }, { status: 500 });
  }
}
