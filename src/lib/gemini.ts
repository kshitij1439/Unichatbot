import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Generates vector embeddings for a given text.
 * Uses 'gemini-embedding-001' (default embedding model).
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Generates a chat response using Gemini models.
 */
export async function generateGeminiChatResponse(
  message: string,
  history: { role: string; content: string }[],
  context: string,
  systemInstruction: string
): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction,
    });

    const formattedHistory = history.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating Gemini chat response:", error);
    throw error;
  }
}

/**
 * Generates a streaming chat response using Gemini models.
 */
export async function generateGeminiChatResponseStream(
  message: string,
  history: { role: string; content: string }[],
  context: string,
  systemInstruction: string
): Promise<any> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction,
    });

    const formattedHistory = history.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    const resultStream = await chat.sendMessageStream(message);
    return resultStream;
  } catch (error) {
    console.error("Error generating Gemini chat response stream:", error);
    throw error;
  }
}
