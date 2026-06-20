import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadBuffer } from "@/lib/cloudinary";
import { parsePdf, chunkText } from "@/lib/parser";
import { getEmbedding } from "@/lib/gemini";
import { upsertChunks } from "@/lib/qdrant";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided in the upload request" }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF documents are supported currently" }, { status: 400 });
    }

    console.log(`Starting manual upload processing for file: ${file.name}`);

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Create a Document record in Prisma
    let document = await prisma.document.create({
      data: {
        name: file.name,
        mimeType: file.type,
        status: "PROCESSING",
      },
    });

    // 2. Upload to Cloudinary
    console.log(`Uploading ${file.name} to Cloudinary...`);
    let cloudinaryUrl = "";
    try {
      const uploadRes = await uploadBuffer(buffer, file.name);
      cloudinaryUrl = uploadRes.url;
    } catch (err) {
      console.warn("Cloudinary upload failed, proceeding with parsing anyway:", err);
    }

    // 3. Parse PDF Text
    console.log(`Parsing PDF text...`);
    const { text } = await parsePdf(buffer);
    if (!text.trim()) {
      throw new Error("PDF text extraction failed or document is empty.");
    }

    // 4. Chunk Text
    const textChunks = chunkText(text, 1000, 200);
    console.log(`Split file into ${textChunks.length} chunks`);

    // 5. Embed and Upsert
    const qdrantPoints: any[] = [];
    const prismaChunksData: any[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
      const batch = textChunks.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (chunkTextContent, batchIdx) => {
          const globalIdx = i + batchIdx;
          const chunkId = crypto.randomUUID();
          const embedding = await getEmbedding(chunkTextContent);

          qdrantPoints.push({
            id: chunkId,
            vector: embedding,
            payload: {
              documentId: document.id,
              docName: file.name,
              content: chunkTextContent,
              pageIndex: 0,
            },
          });

          prismaChunksData.push({
            id: chunkId,
            documentId: document.id,
            content: chunkTextContent,
            pageIndex: 0,
            qdrantId: chunkId,
          });
        })
      );
    }

    // Upsert to Qdrant and save to Prisma
    await upsertChunks(qdrantPoints);
    await prisma.chunk.createMany({
      data: prismaChunksData,
    });

    // Update document status
    document = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "COMPLETED",
        url: cloudinaryUrl || null,
      },
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      name: file.name,
      chunksCount: textChunks.length,
      url: cloudinaryUrl,
    });
  } catch (error: any) {
    console.error("Manual file upload failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process uploaded file" },
      { status: 500 }
    );
  }
}
