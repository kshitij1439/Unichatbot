import { QdrantClient } from "@qdrant/js-client-rest";

const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
const qdrantApiKey = process.env.QDRANT_API_KEY || "";

export const qdrant = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey || undefined,
});

export const COLLECTION_NAME = "university_papers";
export const EMBEDDING_DIMENSION = 3072; // Dimension of Gemini 'gemini-embedding-001'

/**
 * Ensures that the target collection exists in Qdrant.
 */
export async function ensureCollectionExists() {
  try {
    const result = await qdrant.getCollections();
    const exists = result.collections.some((c) => c.name === COLLECTION_NAME);

    if (!exists) {
      console.log(`Creating Qdrant collection: ${COLLECTION_NAME}`);
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: EMBEDDING_DIMENSION,
          distance: "Cosine",
        },
      });
    }

    // Always ensure the payload index for documentId exists (required for filtered deletion)
    try {
      await qdrant.createPayloadIndex(COLLECTION_NAME, {
        field_name: "documentId",
        field_schema: "keyword",
      });
    } catch (indexError) {
      // Ignore if index already exists or is being created
    }
  } catch (error) {
    console.error("Error checking or creating Qdrant collection:", error);
    throw error;
  }
}

/**
 * Upserts text chunks and their embeddings into Qdrant.
 */
export async function upsertChunks(
  points: {
    id: string; // UUID
    vector: number[];
    payload: {
      documentId: string;
      docName: string;
      content: string;
      pageIndex: number;
    };
  }[]
) {
  try {
    await ensureCollectionExists();
    await qdrant.upsert(COLLECTION_NAME, {
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });
  } catch (error) {
    console.error("Error upserting chunks to Qdrant:", error);
    throw error;
  }
}

/**
 * Searches for similar text chunks in Qdrant.
 */
export async function searchSimilarChunks(
  vector: number[],
  limit = 5,
  allowedDocumentIds?: string[]
) {
  try {
    await ensureCollectionExists();

    // Build filter if allowedDocumentIds is specified
    const filter = allowedDocumentIds
      ? {
          should: allowedDocumentIds.map((id) => ({
            key: "documentId",
            match: { value: id },
          })),
        }
      : undefined;

    const results = await qdrant.search(COLLECTION_NAME, {
      vector,
      limit,
      filter,
      with_payload: true,
    });
    return results;
  } catch (error) {
    console.error("Error searching in Qdrant:", error);
    throw error;
  }
}

/**
 * Deletes all points belonging to a specific document.
 */
export async function deleteDocumentChunks(documentId: string) {
  try {
    await ensureCollectionExists();
    await qdrant.delete(COLLECTION_NAME, {
      filter: {
        must: [
          {
            key: "documentId",
            match: {
              value: documentId,
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error(`Error deleting chunks for document ${documentId} from Qdrant:`, error);
    throw error;
  }
}
