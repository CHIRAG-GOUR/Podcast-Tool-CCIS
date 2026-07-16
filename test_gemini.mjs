import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

const apiKey = "AIzaSyBKohd5u-1t3CPU85PyRj_aVQ60Z2um0hA";
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

async function run() {
  try {
    console.log("Uploading video to Gemini File API...");
    const uploadResult = await fileManager.uploadFile("example_podcast.mp4", {
      mimeType: "video/mp4",
      displayName: "Podcast Example",
    });
    
    console.log(`Uploaded as: ${uploadResult.file.uri}`);
    
    let fileState = await fileManager.getFile(uploadResult.file.name);
    while (fileState.state === "PROCESSING") {
        console.log("Waiting for Google to process the video...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
        fileState = await fileManager.getFile(uploadResult.file.name);
    }
    
    if (fileState.state === "FAILED") {
        throw new Error("Video processing failed on Google's servers.");
    }
    
    console.log("Video is ready! Calling gemini-2.5-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      "Summarize what is happening in the first 5 seconds of this video in one short sentence.",
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType
        }
      }
    ]);
    
    console.log("\n--- RESPONSE FROM GEMINI 2.5 FLASH ---");
    console.log(result.response.text());
    console.log("--------------------------------------\n");
    
    console.log("Cleaning up and deleting video from File API...");
    await fileManager.deleteFile(uploadResult.file.name);
    console.log("SUCCESS: The key and the flash model are working perfectly!");
  } catch (error) {
    console.error("Error testing API:", error);
  }
}

run();
