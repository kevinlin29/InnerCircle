import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";
import fs from "node:fs/promises";
import path from "node:path";

const useS3 = !!(process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);

// Only initialise the S3 client when credentials are available
const s3 = useS3
  ? new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "nyc3",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      forcePathStyle: false,
    })
  : null;

const BUCKET = process.env.S3_BUCKET ?? "";

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function ensureLocalDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Upload a file buffer to S3-compatible storage or local filesystem.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  buffer: Buffer,
  folder: string,
  contentType: string,
  extension: string
): Promise<string> {
  const filename = `${uuid()}.${extension}`;
  const key = `${folder}/${filename}`;

  if (useS3 && s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: "public-read",
      })
    );

    const endpoint = process.env.S3_ENDPOINT!.replace("https://", "");
    return `https://${BUCKET}.${endpoint}/${key}`;
  }

  // Fallback: save to public/uploads for local development
  const localDir = path.join(LOCAL_UPLOAD_DIR, folder);
  await ensureLocalDir(localDir);
  const filePath = path.join(localDir, filename);
  await fs.writeFile(filePath, buffer);
  return `/uploads/${key}`;
}

/**
 * Delete a file from S3-compatible storage or local filesystem.
 */
export async function deleteFile(url: string): Promise<void> {
  if (useS3 && s3) {
    const endpoint = process.env.S3_ENDPOINT!.replace("https://", "");
    const prefix = `https://${BUCKET}.${endpoint}/`;
    if (!url.startsWith(prefix)) return;
    const key = url.slice(prefix.length);
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return;
  }

  // Fallback: delete from local filesystem
  if (url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", url);
    await fs.unlink(filePath).catch(() => {});
  }
}
