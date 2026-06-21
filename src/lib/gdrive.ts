import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

/**
 * Returns an authenticated Google Drive client instance.
 */
function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  // Handle newlines in private key if it comes from environment variables
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Google Drive credentials (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) are not configured.");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });

  return google.drive({ version: "v3", auth });
}

export interface GoogleDriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  isFolder: boolean;
}

/**
 * Lists the immediate children (files + folders) of a specific Google Drive folder.
 * This is a single-level listing — no recursion. Ideal for a browsable, paginated UI.
 */
export async function listDriveChildren(folderId: string): Promise<GoogleDriveItem[]> {
  try {
    const drive = getDriveClient();
    const allItems: GoogleDriveItem[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const response: any = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "nextPageToken, files(id, name, mimeType, size, createdTime)",
        pageSize: 100,
        orderBy: "folder,name",
        pageToken,
      });

      const files = response.data.files || [];
      for (const file of files) {
        allItems.push({
          id: file.id || "",
          name: file.name || "Unnamed",
          mimeType: file.mimeType || "application/octet-stream",
          size: file.size || undefined,
          createdTime: file.createdTime || undefined,
          isFolder: file.mimeType === "application/vnd.google-apps.folder",
        });
      }
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    // Sort: folders first, then files alphabetically
    allItems.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return allItems;
  } catch (error) {
    console.error("Error listing Google Drive children:", error);
    throw error;
  }
}

export interface DownloadedFile {
  buffer: Buffer;
  name: string;
  mimeType: string;
}

/**
 * Downloads a file's binary content from Google Drive by ID.
 */
export async function downloadDriveFile(fileId: string): Promise<DownloadedFile> {
  try {
    const drive = getDriveClient();
    
    // 1. Fetch file metadata first
    const metadata = await drive.files.get({
      fileId,
      fields: "name, mimeType",
    });

    const name = metadata.data.name || "document";
    const mimeType = metadata.data.mimeType || "application/octet-stream";

    // 2. Fetch the actual content as a stream
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      const stream = response.data as any;

      stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      stream.on("error", (err: any) => {
        console.error("Google Drive download stream error:", err);
        reject(err);
      });
      stream.on("end", () => {
        resolve({
          buffer: Buffer.concat(chunks),
          name,
          mimeType,
        });
      });
    });
  } catch (error) {
    console.error(`Error downloading Google Drive file ${fileId}:`, error);
    throw error;
  }
}
