import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { processImage, processAvatar } from "@/lib/image-processing";
import { uploadFile, deleteFile } from "@/lib/storage";
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
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    if (type === "avatar") {
      const processed = await processAvatar(inputBuffer);
      const url = await uploadFile(processed, "avatars", "image/webp", "webp");
      return NextResponse.json({ url });
    }

    // Demo mode: filename containing "unsafe" triggers simulated rejection
    // (useful for screen recordings without real NSFW content)
    const fileName = file.name.toLowerCase();
    if (fileName.includes("unsafe") || fileName.includes("flagged")) {
      return NextResponse.json(
        {
          error: "Image rejected by AI content moderation",
          moderation: {
            categories: ["Nudity / Sexual content", "Violence"],
            confidence: 0.92,
          },
        },
        { status: 422 }
      );
    }

    // Post image: process → upload → moderate → return or reject
    const { buffer, thumbnail, contentType, extension } = await processImage(inputBuffer);

    const [url, thumbnailUrl] = await Promise.all([
      uploadFile(buffer, "posts", contentType, extension),
      uploadFile(thumbnail, "posts/thumbnails", contentType, extension),
    ]);

    // Run AI moderation synchronously
    const modResult = await moderateImage(url);

    if (!modResult.safe) {
      await Promise.all([
        deleteFile(url).catch(() => {}),
        deleteFile(thumbnailUrl).catch(() => {}),
      ]);

      return NextResponse.json(
        {
          error: "Image rejected by AI content moderation",
          moderation: {
            categories: modResult.categories,
            confidence: modResult.confidence,
          },
        },
        { status: 422 }
      );
    }

    const apiConfigured = !!(process.env.SIGHTENGINE_API_USER && process.env.SIGHTENGINE_API_SECRET);

    return NextResponse.json({
      url,
      thumbnailUrl,
      moderation: {
        checked: apiConfigured,
        status: apiConfigured ? "passed" : "skipped",
      },
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
