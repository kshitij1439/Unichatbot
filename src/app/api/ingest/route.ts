import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { listDriveFiles, downloadDriveFile } from "@/lib/gdrive";
import { uploadBuffer } from "@/lib/cloudinary";
import { parsePdf, chunkText } from "@/lib/parser";
import { getEmbedding } from "@/lib/gemini";
import { upsertChunks, deleteDocumentChunks } from "@/lib/qdrant";
import crypto from "crypto";

/**
 * GET: Lists all files in the designated Google Drive folder and maps them
 * to their current ingestion status in the Prisma database.
 */
export async function GET() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    return NextResponse.json(
      { error: "GOOGLE_DRIVE_FOLDER_ID environment variable is not configured." },
      { status: 500 }
    );
  }

  try {
    // 1. Fetch files from Google Drive
    const driveFiles = await listDriveFiles(folderId);

    // 2. Fetch documents recorded in Prisma
    const dbDocuments = await prisma.document.findMany();

    // 3. Map drive files to db statuses
    const files = driveFiles.map((driveFile) => {
      const dbDoc = dbDocuments.find((doc) => doc.fileId === driveFile.id);
      return {
        id: driveFile.id,
        name: driveFile.name,
        mimeType: driveFile.mimeType,
        size: driveFile.size,
        createdTime: driveFile.createdTime,
        ingested: !!dbDoc && dbDoc.status === "COMPLETED",
        status: dbDoc ? dbDoc.status : "NOT_INGESTED",
        dbId: dbDoc ? dbDoc.id : null,
        url: dbDoc ? dbDoc.url : null,
      };
    });

    // Also include any local-only documents that aren't on Drive
    const localOnly = dbDocuments
      .filter((doc) => !doc.fileId)
      .map((doc) => ({
        id: null,
        name: doc.name,
        mimeType: doc.mimeType || "application/pdf",
        size: null,
        createdTime: doc.createdAt.toISOString(),
        ingested: doc.status === "COMPLETED",
        status: doc.status,
        dbId: doc.id,
        url: doc.url,
      }));

    return NextResponse.json({ files: [...files, ...localOnly] });
  } catch (error: any) {
    console.error("Ingestion list error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch document status list" },
      { status: 500 }
    );
  }
}

/**
 * POST: Triggers the ingestion pipeline for a specific Google Drive file ID.
 */
export async function POST(req: NextRequest) {
  try {
    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: "fileId parameter is required" }, { status: 400 });
    }

    // 1. Check if the file is already being processed or exists
    let document = await prisma.document.findUnique({
      where: { fileId },
    });

    if (document) {
      // If it exists, clean up old chunks and vectors before re-ingesting
      await deleteDocumentChunks(document.id);
      await prisma.chunk.deleteMany({
        where: { documentId: document.id },
      });
      
      document = await prisma.document.update({
        where: { id: document.id },
        data: { status: "PROCESSING" },
      });
    } else {
      // Create new document entry
      document = await prisma.document.create({
        data: {
          fileId,
          name: "Pending download...",
          status: "PROCESSING",
        },
      });
    }

    // 2. Download the file from Google Drive
    console.log(`Downloading file ${fileId} from Google Drive...`);
    const { buffer, name, mimeType } = await downloadDriveFile(fileId);

    // Update document metadata with real file name
    document = await prisma.document.update({
      where: { id: document.id },
      data: { name, mimeType },
    });

    // 3. Upload to Cloudinary for storage
    console.log(`Uploading ${name} to Cloudinary...`);
    let cloudinaryUrl = "";
    try {
      const uploadRes = await uploadBuffer(buffer, name);
      cloudinaryUrl = uploadRes.url;
    } catch (err) {
      console.warn("Cloudinary upload failed, proceeding with local parsing anyway:", err);
    }

    // 4. Parse text from PDF
    console.log(`Parsing text from ${name}...`);
    if (mimeType !== "application/pdf" && !name.endsWith(".pdf")) {
      throw new Error("Only PDF files are currently supported for parsing.");
    }

    const { text } = await parsePdf(buffer);
    if (!text.trim()) {
      throw new Error("PDF file appears to be empty or contains non-extractable text.");
    }

    // 5. Chunk text
    console.log(`Splitting text into chunks...`);
    const textChunks = chunkText(text, 1000, 200);
    console.log(`Total chunks created: ${textChunks.length}`);

    // 6. Generate embeddings and prepare points for Qdrant
    console.log(`Generating embeddings and uploading vectors to Qdrant...`);
    const qdrantPoints: any[] = [];
    const prismaChunksData: any[] = [];

    // Process chunks sequentially or in parallel batches to avoid rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
      const batch = textChunks.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (chunkTextContent, batchIdx) => {
          const globalIdx = i + batchIdx;
          const chunkId = crypto.randomUUID();
          
          // Generate Gemini embedding
          const embedding = await getEmbedding(chunkTextContent);
          
          qdrantPoints.push({
            id: chunkId,
            vector: embedding,
            payload: {
              documentId: document.id,
              docName: name,
              content: chunkTextContent,
              pageIndex: 0, // In simple parsing pageIndex is simplified
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

    // 7. Upsert vectors to Qdrant
    await upsertChunks(qdrantPoints);

    // 8. Save chunk metadata in Prisma
    await prisma.chunk.createMany({
      data: prismaChunksData,
    });

    // 9. Mark document processing as COMPLETED
    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "COMPLETED",
        url: cloudinaryUrl || null,
      },
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      name,
      chunksCount: textChunks.length,
    });
  } catch (error: any) {
    console.error("Ingestion pipeline error:", error);
    
    // Attempt to mark document as FAILED if we have its ID
    try {
      const requestData = await req.clone().json().catch(() => ({}));
      if (requestData.fileId) {
        await prisma.document.updateMany({
          where: { fileId: requestData.fileId, status: "PROCESSING" },
          data: { status: "FAILED" },
        });
      }
    } catch (dbErr) {
      console.error("Could not update document status to FAILED:", dbErr);
    }

    return NextResponse.json(
      { error: error.message || "Failed to ingest document" },
      { status: 500 }
    );
  }
}
