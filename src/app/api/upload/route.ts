import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { processImage, processAvatar } from "@/lib/image-processing";
import { uploadFile } from "@/lib/storage";
import { moderateImage } from "@/lib/moderation";

export async function POST(req: NextRequest) {
  try {
    await requireSessionForApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "post" | "avatar"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    if (type === "avatar") {
      const processed = await processAvatar(inputBuffer);
      const url = await uploadFile(processed, "avatars", "image/webp", "webp");
      return NextResponse.json({ url });
    }

    // Post image (default)
    const { buffer, thumbnail, contentType, extension } = await processImage(inputBuffer);

    // Parallelize S3 uploads
    const [url, thumbnailUrl] = await Promise.all([
      uploadFile(buffer, "posts", contentType, extension),
      uploadFile(thumbnail, "posts/thumbnails", contentType, extension),
    ]);

    // Trigger moderation in background (non-blocking, with error handling)
    moderateImage(url)
      .then((result) => {
        if (!result.safe) {
          console.warn(`Image flagged by moderation: ${url}`, result.categories);
        }
      })
      .catch((err) => console.error("Moderation failed:", err));

    return NextResponse.json({ url, thumbnailUrl });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
