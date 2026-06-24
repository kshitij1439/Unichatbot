import { generateGeminiChatResponse, generateGeminiChatResponseStream } from "./gemini";
import { generateGrokChatResponse, generateGrokChatResponseStream } from "./grok";

export type LLMModel = "gemini" | "grok";

/**
 * Common system instruction for university tutor chatbot.
 */
function getSystemInstruction(context: string): string {
  return `You are a helpful and knowledgeable university chatbot.
You help students study and learn from university exam papers, lectures, and resources.
Use the provided EXAM PAPER CONTEXT below to answer the user's question. 

CRITICAL INSTRUCTION FOR THINKING PROCESS:
Before formulating your final response, analyze the query, identify the relevant files from the EXAM PAPER CONTEXT, and structure your explanation plan.
You MUST wrap this thinking process inside a single <thought>...</thought> block at the very beginning of your response. 
Inside the <thought> block, outline your reasoning in 2-3 short bullet points (e.g. which files are relevant, what concepts you will cover, and your explanation strategy).
The <thought> block must be first. The actual helpful answer for the student must follow immediately after the closing </thought> tag.

Citations:
Always cite your sources inline using markdown hyperlinks. When you refer to details from a document, format the citation inline exactly as \`[FolderPath/FileName.pdf](URL)\` at the end of the sentence or bullet point, using the exact path-prefixed document name and URL provided for that document in the EXAM PAPER CONTEXT. Never use index numbers like Source 1 or generic labels.
Keep your tone academic, encouraging, and supportive.

---
EXAM PAPER CONTEXT:
${context}
---`;
}

/**
 * Generates an answer from the selected LLM provider, combining chat history and retrieved context.
 */
export async function generateChatResponse(
  message: string,
  history: { role: string; content: string }[],
  context: string,
  modelName: LLMModel = "gemini"
): Promise<string> {
  const systemInstruction = getSystemInstruction(context);

  if (modelName === "grok") {
    return generateGrokChatResponse(message, history, context, systemInstruction);
  }

  // Fallback/Default to Gemini
  return generateGeminiChatResponse(message, history, context, systemInstruction);
}

/**
 * Generates a streaming response from the selected LLM provider, combining chat history and retrieved context.
 */
export async function generateChatResponseStream(
  message: string,
  history: { role: string; content: string }[],
  context: string,
  modelName: LLMModel = "gemini"
): Promise<any> {
  const systemInstruction = getSystemInstruction(context);

  if (modelName === "grok") {
    return generateGrokChatResponseStream(message, history, context, systemInstruction);
  }

  // Fallback/Default to Gemini
  return generateGeminiChatResponseStream(message, history, context, systemInstruction);
}
