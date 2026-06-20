import * as pdfImport from "pdf-parse";
// Bypasses default export resolution differences in bundlers
const pdf = (pdfImport as any).default || pdfImport;

/**
 * Extracts raw text from a PDF Buffer.
 */
export async function parsePdf(buffer: Buffer): Promise<{ text: string; pagesCount: number }> {
  try {
    const data = await pdf(buffer);
    return {
      text: data.text || "",
      pagesCount: data.numpages || 1,
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
    startIndex = endIndex - chunkOverlap;
    
    // Prevent infinite loops if overlap size exceeds remaining length or creates no progress
    if (startIndex >= endIndex || chunkSize <= chunkOverlap) {
      startIndex = endIndex;
    }
  }

  return chunks;
}
