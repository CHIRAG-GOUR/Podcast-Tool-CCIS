import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db as adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { query, style } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const proModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
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
        await sendEvent("progress", { step: "Analyzing query intent...", progress: 10 });
        
        const chat = proModel.startChat({
          history: [
            {
              role: "user",
              parts: [{ text: `We are preparing a highly-researched podcast episode on the topic: "${query}". You are an expert investigative researcher and producer.` }],
            },
            {
              role: "model",
              parts: [{ text: "Understood. I am ready to conduct deep internet research and structure it into a professional podcast format." }],
            },
          ],
        });

        await sendEvent("progress", { step: "Running live Google Search for statistics & trends...", progress: 10 });
        
        // Step 1: Initial exploration
        const planPrompt = `Please use your Google Search tool to find the absolute most up-to-date, highly credible statistics, recent news, and market trends regarding: "${query}". Summarize your factual findings with extreme detail. Do not hold back on data.`;
        await chat.sendMessage(planPrompt);
        
        await sendEvent("progress", { step: "Gathering counter-arguments and expert opinions...", progress: 35 });
        
        // Step 2: Deep Dive
        const researchPrompt = `Excellent. Now, use your Search tool again to look for counter-arguments, debates, controversies, and expert opinions about this topic. We need a well-rounded, provocative perspective to make the podcast highly engaging. Compile the most compelling talking points.`;
        await chat.sendMessage(researchPrompt);
        
        await sendEvent("progress", { step: "Synthesizing research into a podcast structure...", progress: 70 });
        
        // Step 3: Synthesis
        const styleInstruction = style ? `The tone and style of the final output MUST BE: ${style}.` : `Use a professional yet engaging podcast tone.`;
        
        const finalPrompt = `You are a master podcast producer. Based on ALL the deep internet research, facts, statistics, and debates you just gathered in our previous messages, generate a highly structured, data-rich podcast script outline and show flow.
${styleInstruction}

You MUST return ONLY a valid JSON object representing the podcast structure. Do not wrap it in markdown code blocks like \`\`\`json.
The JSON must follow this exact structure:
{
  "title": "Catchy Episode Title",
  "brief": "A 2-sentence summary of the episode objective.",
  "segments": [
    {
      "title": "Intro",
      "duration": "2 mins",
      "category": "intro", // Use "intro", "sponsor", "content", or "outro"
      "blocks": [
        {
          "type": "dialogue", // or "bullets" for talking points
          "content": "Welcome back to the show..." // if dialogue, string. if bullets, array of strings.
        }
      ]
    }
  ]
}

Ensure you include an Intro, a Sponsor message, at least 3 deep Content segments (heavily packed with the specific deep research facts, statistics, and debates you just found), and an Outro. Make the content incredibly rich, detailed, and ensure it explicitly cites the data you researched.`;

        const finalResult = await chat.sendMessage(finalPrompt);
        let reportText = finalResult.response.text().trim();
        
        // Clean markdown JSON wrapping if model still includes it
        if (reportText.startsWith("\`\`\`json")) {
            reportText = reportText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        } else if (reportText.startsWith("\`\`\`")) {
            reportText = reportText.replace(/\`\`\`/g, '').trim();
        }

        const report = reportText;
        
        await sendEvent("progress", { step: "Finalizing script board...", progress: 95 });
        
        // Save to Firestore
        try {
          await adminDb.collection('research_reports').add({
            topic: query,
            style: style || 'Standard',
            report: report, // Now saving the JSON string
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
