import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

// Using the key from test_gemini.mjs
const apiKey = "AIzaSyBKohd5u-1t3CPU85PyRj_aVQ60Z2um0hA";
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const captionsPrompt = `You are a highly accurate transcription assistant. Your task is to transcribe the speech in this media.
CRITICAL INSTRUCTION: Break the transcription into short phrases (3-5 words) suitable for fast-paced Captions.ai style videos.
For each phrase, you MUST also provide an array of the exact individual words spoken, with word-level timestamps.

Return a JSON array of phrase objects. Each object must have:
- "text": The full phrase spoken.
- "start": Phrase start time (float, seconds).
- "end": Phrase end time (float, seconds).
- "words": An array of objects, where each object has:
    - "word": The individual word.
    - "start": The exact start time of this word.
    - "end": The exact end time of this word.

Return ONLY valid JSON without markdown formatting.`;

    console.log("Testing text generation without video to see if it hallucinates or errors...");
    const result = await model.generateContent(captionsPrompt);
    console.log(result.response.text());
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
