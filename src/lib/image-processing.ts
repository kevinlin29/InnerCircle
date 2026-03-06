import sharp from "sharp";

interface ProcessedImage {
  buffer: Buffer;
  thumbnail: Buffer;
  contentType: string;
  extension: string;
}

/**
 * Process a post image: compress, resize, convert to WebP, generate thumbnail.
 * Decodes the input once and clones for each output for efficiency.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const pipeline = sharp(input);

  const [buffer, thumbnail] = await Promise.all([
    pipeline.clone()
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer(),
    pipeline.clone()
      .resize(400, 400, { fit: "cover" })
      .webp({ quality: 60 })
      .toBuffer(),
  ]);

  return {
    buffer,
    thumbnail,
    contentType: "image/webp",
    extension: "webp",
  };
}

/**
 * Process an avatar image: crop to square, resize to 256x256, convert to WebP.
 */
export async function processAvatar(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize(256, 256, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();
}
