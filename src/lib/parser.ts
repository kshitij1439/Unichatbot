import { PDFParse } from "pdf-parse";
import path from "path";
import { pathToFileURL } from "url";

// Dynamically locate and set the pdfjs worker path as a file:// URL (required on Windows)
const workerPath = path.resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
PDFParse.setWorker(pathToFileURL(workerPath).href);

/**
 * Extracts raw text from a PDF Buffer.
 */
export async function parsePdf(buffer: Buffer): Promise<{ text: string; pagesCount: number }> {
  try {
    const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const parser = new PDFParse({ data: uint8Array });
    const result = await parser.getText();
    return {
      text: result.text || "",
      pagesCount: result.total || 1,
    };
  } catch (error) {
    console.error("Error parsing PDF file:", error);
    throw new Error("Failed to parse PDF file content.");
  }
}

/**
 * Splits text into overlapping chunks of a target size.
 */
export function chunkText(text: string, chunkSize = 1000, chunkOverlap = 200): string[] {
  // Replace multiple newlines or tabs with a single space to clean up formatting
  const cleanText = text.replace(/\s+/g, " ").trim();
  if (!cleanText) return [];

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex < cleanText.length) {
      // Find the nearest word boundary so we don't cut words in half
      const nextSpace = cleanText.lastIndexOf(" ", endIndex);
      if (nextSpace > startIndex) {
        endIndex = nextSpace;
      }
    } else {
      endIndex = cleanText.length;
    }

    const chunk = cleanText.substring(startIndex, endIndex).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    // Move start index forward, accounting for overlap
    const nextStart = endIndex - chunkOverlap;
    
    // Prevent infinite loops if overlap size exceeds remaining length or creates no progress
    if (nextStart <= startIndex) {
      startIndex = endIndex;
    } else {
      startIndex = nextStart;
    }
  }

  return chunks;
}
