import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Generates vector embeddings for a given text.
 * Uses 'text-embedding-004' (default free tier embedding model).
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Generates an answer from Gemini, combining chat history and retrieved document context.
 */
export async function generateChatResponse(
  message: string,
  history: { role: string; content: string }[],
  context: string
): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Format history for Gemini API
    const formattedHistory = history.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const systemInstruction = `You are a helpful and knowledgeable university chatbot.
You help students study and learn from university exam papers, lectures, and resources.
Use the provided EXAM PAPER CONTEXT below to answer the user's question. 
If the context doesn't contain the answer, use your general knowledge, but prioritize details in the context.
Always cite the source/paper name if available.
Keep your tone academic, encouraging, and supportive.

---
EXAM PAPER CONTEXT:
${context}
---`;

    const chat = model.startChat({
      history: formattedHistory,
      systemInstruction,
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating chat response:", error);
    throw error;
  }
}
