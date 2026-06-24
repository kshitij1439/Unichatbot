import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEmbedding } from "@/lib/gemini";
import { generateChatResponseStream } from "@/lib/llm";
import { fetchCircularsFromSppu } from "@/lib/sppu";
import { searchSimilarChunks } from "@/lib/qdrant";
import { getAuthenticatedUser } from "@/lib/auth";

/**
 * GET: Lists all chat sessions, or fetches messages of a specific session.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sessionId) {
      // Fetch messages for a specific session scoped to user
      const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId: user.userId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!session) {
        return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
      }

      return NextResponse.json(session);
    } else {
      // List all sessions scoped to user
      const sessions = await prisma.chatSession.findMany({
        where: { userId: user.userId },
        orderBy: { updatedAt: "desc" },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 1, // Get first message or just return session info
          },
        },
      });
      return NextResponse.json({ sessions });
    }
  } catch (error: any) {
    console.error("Chat API GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch chat information" },
      { status: 500 }
    );
  }
}

/**
 * POST: Sends a new message in a chat session. Searches Qdrant for exam paper context,
 * invokes Gemini, and saves both messages to the database.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, sessionId: incomingSessionId, model } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const responseStream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          let sessionId = incomingSessionId;
          let session;

          // 1. Create session if it doesn't exist
          if (!sessionId || sessionId === "new") {
            const generatedTitle = message.length > 30 ? message.substring(0, 30) + "..." : message;
            session = await prisma.chatSession.create({
              data: { 
                title: generatedTitle,
                userId: user.userId,
              },
            });
            sessionId = session.id;
          } else {
            session = await prisma.chatSession.findFirst({
              where: { id: sessionId, userId: user.userId },
            });
            if (!session) {
              sendEvent("error", { error: "Chat session not found" });
              controller.close();
              return;
            }
          }

          // 2. Save user message to database
          const userMessage = await prisma.message.create({
            data: {
              role: "user",
              content: message,
              sessionId,
            },
          });

          // 3. Update session's updatedAt timestamp
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() },
          });

          // Send session details & user message immediately so the client can render it
          sendEvent("session", { sessionId, userMessage });

          // 4. Retrieve context from Qdrant DB
          console.log("Generating query embedding for vector search...");
          let context = "";
          let sourcesFooter = "";
          try {
            // Get all allowed document IDs (global + local to this user)
            const allowedDocs = await prisma.document.findMany({
              where: {
                OR: [
                  { userId: null },
                  { userId: user.userId },
                ],
              },
              select: { id: true },
            });
            const allowedDocIds = allowedDocs.map((d) => d.id);

            const queryEmbedding = await getEmbedding(message);
            console.log("Searching Qdrant for similar chunks...");
            const searchResults = await searchSimilarChunks(queryEmbedding, 4, allowedDocIds);

            if (searchResults && searchResults.length > 0) {
              const docIds = Array.from(
                new Set(searchResults.map((res: any) => res.payload?.documentId).filter(Boolean))
              ) as string[];

              const documents = await prisma.document.findMany({
                where: { id: { in: docIds } },
                select: { id: true, name: true, url: true, path: true },
              });

              const docMetaMap = new Map<string, { url: string | null; fullName: string }>(
                documents.map((d: { id: string; name: string; url: string | null; path: string | null }) => {
                  const fullName = d.path ? `${d.path}/${d.name}` : d.name;
                  return [d.id, { url: d.url, fullName }];
                })
              );

              context = searchResults
                .map((res: any) => {
                  const payload = res.payload;
                  const meta = docMetaMap.get(payload?.documentId);
                  const docUrl = meta?.url || "";
                  const docFullName = meta?.fullName || payload?.docName || "Unknown Doc";
                  return `[Document: ${docFullName}] (URL: ${docUrl})\nContent:\n${payload?.content || ""}\n`;
                })
                .join("\n---\n");

              const uniqueDocsWithUrls = documents.filter(
                (d: { id: string; name: string; url: string | null; path: string | null }) => d.url
              );
              if (uniqueDocsWithUrls.length > 0) {
                sourcesFooter = "\n\n---\n**Sources Cited:**\n" + uniqueDocsWithUrls
                  .map((d: { id: string; name: string; url: string | null; path: string | null }) => {
                    const docFullName = d.path ? `${d.path}/${d.name}` : d.name;
                    return `- [${docFullName}](${d.url})`;
                  })
                  .join("\n");
              }
            }
          } catch (qdrantErr) {
            console.error("Vector search failed, proceeding without context:", qdrantErr);
            context = "No specific context could be retrieved from the vector database.";
          }

          // Fetch circulars context and append to the generation prompt
          let circularsContext = "No active circulars retrieved.";
          try {
            console.log("Fetching SPPU circulars for RAG prompt injection...");
            const circularsList = await fetchCircularsFromSppu();
            circularsContext = "ACTIVE UNIVERSITY CIRCULARS & NOTICES:\n" + circularsList.map(c => {
              return `- [${c.title}](${c.url}) [Category: ${c.category}] (Published Date: ${c.date})\n  Summary: ${c.summary}`;
            }).join("\n");
          } catch (circErr) {
            console.error("Failed to fetch circulars for RAG context:", circErr);
          }

          context = `\n${circularsContext}\n\n========================\n\nEXAM CHUNKS FROM STUDY DOCUMENTS:\n${context}`;

          // 5. Fetch history
          const historyMessages = await prisma.message.findMany({
            where: {
              sessionId,
              NOT: { id: userMessage.id },
            },
            orderBy: { createdAt: "asc" },
          });

          const chatHistory = historyMessages.map((msg: { role: string; content: string }) => ({
            role: msg.role,
            content: msg.content,
          }));

          // 6. Request streaming answer from LLM
          console.log(`Requesting ${model === "grok" ? "Grok" : "Gemini"} chat completion stream...`);
          const resultStream = await generateChatResponseStream(
            message,
            chatHistory,
            context,
            model === "grok" ? "grok" : "gemini"
          );

          let accumulatedResponse = "";
          for await (const chunk of resultStream.stream) {
            const chunkText = chunk.text();
            accumulatedResponse += chunkText;
            sendEvent("token", chunkText);
          }

          const finalResponseContent = accumulatedResponse + sourcesFooter;

          // 7. Save assistant message to DB
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              content: finalResponseContent,
              sessionId,
            },
          });

          sendEvent("done", { assistantMessage });
        } catch (err: any) {
          console.error("Stream handling error:", err);
          sendEvent("error", { error: err.message || "Failed to process chat message stream" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("Chat API POST setup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize stream" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Deletes an entire chat session.
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: user.userId },
    });

    if (!session) {
      return NextResponse.json({ error: "Chat session not found or unauthorized" }, { status: 404 });
    }

    await prisma.chatSession.delete({
      where: { id: sessionId },
    });
    return NextResponse.json({ success: true, message: "Chat session deleted" });
  } catch (error: any) {
    console.error("Chat API DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete chat session" },
      { status: 500 }
    );
  }
}
