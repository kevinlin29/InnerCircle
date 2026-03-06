import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "nyc3",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: false,
});

const BUCKET = process.env.S3_BUCKET!;

/**
 * Upload a file buffer to S3-compatible storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  buffer: Buffer,
  folder: string,
  contentType: string,
  extension: string
): Promise<string> {
  const key = `${folder}/${uuid()}.${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  // Construct public URL
  // DigitalOcean Spaces URL format: https://BUCKET.REGION.digitaloceanspaces.com/KEY
  const endpoint = process.env.S3_ENDPOINT!.replace("https://", "");
  return `https://${BUCKET}.${endpoint}/${key}`;
}

/**
 * Delete a file from S3-compatible storage by its URL.
 */
export async function deleteFile(url: string): Promise<void> {
  // Extract key from URL
  const endpoint = process.env.S3_ENDPOINT!.replace("https://", "");
  const prefix = `https://${BUCKET}.${endpoint}/`;

  if (!url.startsWith(prefix)) return;

  const key = url.slice(prefix.length);

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}
