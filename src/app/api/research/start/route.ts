import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db as adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const proModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      // @ts-ignore - The SDK types might be outdated, but googleSearch is supported by the API
      tools: [{ googleSearch: {} }]
    });

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const sendEvent = async (event: string, data: any) => {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    };

    // Run the research in the background
    (async () => {
      try {
        await sendEvent("progress", { step: "✓ Searching YouTube", progress: 15 });
        
        const chat = proModel.startChat({
          history: [
            {
              role: "user",
              parts: [{ text: `We are conducting a deep, comprehensive research sprint on the topic: "${query}". You are an elite investigative researcher.` }],
            },
            {
              role: "model",
              parts: [{ text: "Understood. I will conduct a multifaceted deep dive gathering statistics, trends, expert opinions, and counter-arguments." }],
            },
          ],
        });

        // Step 1: Initial exploration
        const planPrompt = `Please use your Google Search tool to find the most recent YouTube videos and trending discussions regarding: "${query}". Summarize your factual findings with extreme detail. Do not hold back on data.`;
        await chat.sendMessage(planPrompt);
        
        await sendEvent("progress", { step: "✓ Reading Reddit discussions", progress: 30 });
        
        // Step 2: Reddit and Forums
        const redditPrompt = `Excellent. Now, use your Search tool again to look for Reddit discussions, debates, and public consensus about this topic. We need to know what real people are saying, their pain points, and the controversies.`;
        await chat.sendMessage(redditPrompt);
        
        await sendEvent("progress", { step: "⟳ Extracting Blogs & News...", progress: 55 });
        
        // Step 3: News and Expert Opinions
        const newsPrompt = `Great. Now find the latest news articles, expert opinions, and statistical data. We need hard numbers, facts, and highly credible references.`;
        await chat.sendMessage(newsPrompt);

        await sendEvent("progress", { step: "⟳ Generating Knowledge Graph...", progress: 80 });
        
        // Step 4: Synthesis
        const finalPrompt = `You are a master researcher. Based on ALL the deep internet research, facts, statistics, and debates you just gathered in our previous messages, generate a highly structured, data-rich deep research report.

You MUST return ONLY a valid JSON object representing the deep research. Do not wrap it in markdown code blocks like \`\`\`json.
The JSON must follow this exact structure:
{
  "topic": "The exact topic researched",
  "executiveSummary": "A highly detailed 2-paragraph summary of the entire landscape.",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  "statistics": [
    { "stat": "85%", "description": "Percentage of people who..." }
  ],
  "expertOpinions": [
    { "expert": "Name/Organization", "opinion": "Their quote or stance" }
  ],
  "redditConsensus": "A summary of what the public/Reddit thinks.",
  "youtubeTrends": "A summary of what top YouTube creators are saying.",
  "latestNews": ["News headline 1", "News headline 2"],
  "counterArguments": ["Counter argument 1", "Counter argument 2"],
  "references": [
    { "title": "Source Title", "url": "https://...", "type": "Blog | YouTube | Reddit | News | Research Paper" }
  ]
}

Ensure the content is incredibly rich, detailed, and directly cites the data you researched.`;

        await sendEvent("progress", { step: "Waiting for Gemini...", progress: 95 });

        const finalResult = await chat.sendMessage(finalPrompt);
        let reportText = finalResult.response.text().trim();
        
        // Clean markdown JSON wrapping if model still includes it
        if (reportText.startsWith("\`\`\`json")) {
            reportText = reportText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        } else if (reportText.startsWith("\`\`\`")) {
            reportText = reportText.replace(/\`\`\`/g, '').trim();
        }

        const report = reportText;
        
        // Save to Firestore
        try {
          await adminDb.collection('research_reports').add({
            topic: query,
            report: report, // Now saving the Deep Research JSON string
            createdAt: new Date()
          });
        } catch (dbError) {
          console.error("Firestore save error:", dbError);
        }

        await sendEvent("complete", { report });
        await writer.close();
      } catch (err: any) {
        await sendEvent("error", { message: err.message });
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Research API error:", error);
    return NextResponse.json({ error: "An error occurred during research" }, { status: 500 });
  }
}

