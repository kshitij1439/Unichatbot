import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
  secure: true,
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

/**
 * Uploads a file buffer directly to Cloudinary.
 */
export function uploadBuffer(
  buffer: Buffer,
  fileName: string,
  folderName = "university_chatbot"
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    // Sanitize the file name to avoid Cloudinary naming errors
    const sanitizedName = fileName
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .substring(0, 100);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        public_id: sanitizedName,
        resource_type: "auto", // Auto detects pdf, docx, txt, etc.
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(error);
        } else {
          resolve({
            url: result?.secure_url || "",
            publicId: result?.public_id || "",
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
}

export default cloudinary;
