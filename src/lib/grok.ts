/**
 * Helper to determine the target API endpoint and model based on the API key prefix.
 * Automatically routes 'gsk_' keys to Groq and others to xAI Grok.
 */
function getApiConfig(apiKey: string) {
  const isGroq = apiKey.startsWith("gsk_");
  return {
    endpoint: isGroq 
      ? "https://api.groq.com/openai/v1/chat/completions" 
      : "https://api.x.ai/v1/chat/completions",
    model: isGroq 
      ? "llama-3.3-70b-versatile" 
      : "grok-beta",
  };
}

/**
 * Generates a chat response using Grok (xAI) or Groq models.
 */
export async function generateGrokChatResponse(
  message: string,
  history: { role: string; content: string }[],
  context: string,
  systemInstruction: string
): Promise<string> {
  const grokApiKey = process.env.GROK_API_KEY || "";
  if (!grokApiKey) {
    throw new Error("GROK_API_KEY is not configured.");
  }

  const { endpoint, model } = getApiConfig(grokApiKey);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${grokApiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemInstruction },
          ...history.map((msg) => ({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content,
          })),
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating response:", error);
    throw error;
  }
}

/**
 * Generates a streaming chat response using Grok (xAI) or Groq models.
 */
export async function generateGrokChatResponseStream(
  message: string,
  history: { role: string; content: string }[],
  context: string,
  systemInstruction: string
): Promise<any> {
  const grokApiKey = process.env.GROK_API_KEY || "";
  if (!grokApiKey) {
    throw new Error("GROK_API_KEY is not configured.");
  }

  const { endpoint, model } = getApiConfig(grokApiKey);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${grokApiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemInstruction },
          ...history.map((msg) => ({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content,
          })),
          { role: "user", content: message },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.statusText} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error("No response body from API");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return {
      stream: (async function* () {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const cleaned = line.trim();
              if (!cleaned) continue;
              if (cleaned === "data: [DONE]") continue;

              if (cleaned.startsWith("data: ")) {
                try {
                  const json = JSON.parse(cleaned.substring(6));
                  const text = json.choices?.[0]?.delta?.content || "";
                  if (text) {
                    yield { text: () => text };
                  }
                } catch (e) {
                  console.error("Error parsing SSE JSON:", e);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      })(),
    };
  } catch (error) {
    console.error("Error generating response stream:", error);
    throw error;
  }
}
