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
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
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
    const systemInstruction = `You are a helpful and knowledgeable university chatbot.
You help students study and learn from university exam papers, lectures, and resources.
Use the provided EXAM PAPER CONTEXT below to answer the user's question. 
If the context doesn't contain the answer, use your general knowledge, but prioritize details in the context.
Always cite your sources inline using markdown hyperlinks. When you refer to details from a document, format the citation inline exactly as \`[FolderPath/FileName.pdf](URL)\` at the end of the sentence or bullet point, using the exact path-prefixed document name and URL provided for that document in the EXAM PAPER CONTEXT. Never use index numbers like Source 1 or generic labels.
Keep your tone academic, encouraging, and supportive.

---
EXAM PAPER CONTEXT:
${context}
---`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction,
    });

    // Format history for Gemini API
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
    console.error("Error generating chat response:", error);
    throw error;
  }
}
