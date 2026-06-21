import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEmbedding, generateChatResponse } from "@/lib/gemini";
import { searchSimilarChunks } from "@/lib/qdrant";

/**
 * GET: Lists all chat sessions, or fetches messages of a specific session.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  try {
    if (sessionId) {
      // Fetch messages for a specific session
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
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
      // List all sessions
      const sessions = await prisma.chatSession.findMany({
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
    const { message, sessionId: incomingSessionId } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    let sessionId = incomingSessionId;
    let session;

    // 1. Create session if it doesn't exist
    if (!sessionId || sessionId === "new") {
      const generatedTitle = message.length > 30 ? message.substring(0, 30) + "..." : message;
      session = await prisma.chatSession.create({
        data: { title: generatedTitle },
      });
      sessionId = session.id;
    } else {
      session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) {
        return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
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

    // 4. Retrieve context from Qdrant DB
    console.log("Generating query embedding for vector search...");
    let context = "";
    let sourcesFooter = "";
    try {
      const queryEmbedding = await getEmbedding(message);
      console.log("Searching Qdrant for similar chunks...");
      const searchResults = await searchSimilarChunks(queryEmbedding, 4);

      if (searchResults && searchResults.length > 0) {
        // Collect unique document IDs from search results
        const docIds = Array.from(
          new Set(searchResults.map((res: any) => res.payload?.documentId).filter(Boolean))
        ) as string[];

        // Fetch Cloudinary URLs and names for these documents
        const documents = await prisma.document.findMany({
          where: { id: { in: docIds } },
          select: { id: true, name: true, url: true },
        });

        const docUrlMap = new Map<string, string | null>(
          documents.map((d: { id: string; name: string; url: string | null }) => [d.id, d.url])
        );

        context = searchResults
          .map((res: any, idx) => {
            const payload = res.payload;
            const docUrl = docUrlMap.get(payload?.documentId) || "";
            return `[Source ${idx + 1}: ${payload?.docName || "Unknown Doc"}] (URL: ${docUrl})\nContent:\n${payload?.content || ""}\n`;
          })
          .join("\n---\n");

        // Construct a clean, clickable sources footer
        const uniqueDocsWithUrls = documents.filter(
          (d: { id: string; name: string; url: string | null }) => d.url
        );
        if (uniqueDocsWithUrls.length > 0) {
          sourcesFooter = "\n\n---\n**Sources Cited:**\n" + uniqueDocsWithUrls
            .map((doc: { id: string; name: string; url: string | null }, idx: number) => `- [${doc.name}](${doc.url})`)
            .join("\n");
        }
      }
    } catch (qdrantErr) {
      console.error("Vector search failed, proceeding without context:", qdrantErr);
      context = "No specific context could be retrieved from the vector database.";
    }

    // 5. Fetch chat history for Gemini (excluding the newly created user message to prevent duplication in history list)
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

    // 6. Ask Gemini for reply
    console.log("Requesting Gemini chat completion...");
    const aiResponseContent = await generateChatResponse(message, chatHistory, context);
    const finalResponseContent = aiResponseContent + sourcesFooter;

    // 7. Save AI assistant response to database
    const assistantMessage = await prisma.message.create({
      data: {
        role: "assistant",
        content: finalResponseContent,
        sessionId,
      },
    });

    return NextResponse.json({
      sessionId,
      userMessage,
      assistantMessage,
    });
  } catch (error: any) {
    console.error("Chat API POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat message" },
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
