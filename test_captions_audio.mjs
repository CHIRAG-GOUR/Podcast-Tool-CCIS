import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

const apiKey = "AIzaSyBKohd5u-1t3CPU85PyRj_aVQ60Z2um0hA";
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

async function run() {
  let uploadResult;
  try {
    uploadResult = await fileManager.uploadFile("test_audio.m4a", {
      mimeType: "audio/mp4",
      displayName: "Test Audio",
    });
    
    console.log(`Uploaded as: ${uploadResult.file.uri}`);
    
    let fileState = await fileManager.getFile(uploadResult.file.name);
    while (fileState.state === "PROCESSING") {
        console.log("Waiting for Google to process the audio...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        fileState = await fileManager.getFile(uploadResult.file.name);
    }
    
    if (fileState.state === "FAILED") {
        throw new Error("Audio processing failed.");
    }
    
    console.log("Audio ready. Calling model...");
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });

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

    const captionsPromise = model.generateContent([
      {
        fileData: {
          mimeType: uploadResult.file.mimeType,
          fileUri: uploadResult.file.uri
        }
      },
      { text: captionsPrompt }
    ]);
    
    const result = await captionsPromise;
    console.log("Result text:", result.response.text());
  } catch (error) {
    console.error("Error:", error);
  } finally {
    if (uploadResult) {
      await fileManager.deleteFile(uploadResult.file.name);
    }
  }
}

run();
