const MAX_DIMENSION = 2000;
const AVATAR_SIZE = 512;
const QUALITY = 0.85;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      type,
      quality
    );
  });
}

/**
 * Resize an image client-side before upload.
 * Constrains to MAX_DIMENSION on the longest side and compresses as WebP.
 */
export async function resizeImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const img = await loadImage(file);
  const { naturalWidth: w, naturalHeight: h } = img;

  if (w <= MAX_DIMENSION && h <= MAX_DIMENSION && file.size < 2 * 1024 * 1024) {
    URL.revokeObjectURL(img.src);
    return file;
  }

  const scale = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h, 1);
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, newW, newH);
  URL.revokeObjectURL(img.src);

  const blob = await canvasToBlob(canvas, "image/webp", QUALITY);
  const name = file.name.replace(/\.[^.]+$/, ".webp");
  return new File([blob], name, { type: "image/webp" });
}

/**
 * Crop an image to a centered square for avatar use, then resize to AVATAR_SIZE.
 */
export async function cropAvatar(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const img = await loadImage(file);
  const { naturalWidth: w, naturalHeight: h } = img;

  const size = Math.min(w, h);
  const sx = Math.round((w - size) / 2);
  const sy = Math.round((h - size) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  URL.revokeObjectURL(img.src);

  const blob = await canvasToBlob(canvas, "image/webp", QUALITY);
  const name = file.name.replace(/\.[^.]+$/, "-avatar.webp");
  return new File([blob], name, { type: "image/webp" });
}
