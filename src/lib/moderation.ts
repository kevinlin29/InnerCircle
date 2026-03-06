interface ModerationResult {
  safe: boolean;
  categories: string[];
  confidence: number;
}

/**
 * Call external AI moderation API to check if an image is appropriate.
 * Designed to fail open: if the API is unavailable or errors, the image is treated as safe.
 * This is intentionally non-blocking — call without await for background processing.
 */
export async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  try {
    const apiUrl = process.env.MODERATION_API_URL;
    const apiKey = process.env.MODERATION_API_KEY;

    if (!apiUrl || !apiKey) {
      console.warn("Moderation API not configured, skipping moderation");
      return { safe: true, categories: [], confidence: 0 };
    }

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ image_url: imageUrl }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!res.ok) {
      console.error("Moderation API error:", res.status, res.statusText);
      return { safe: true, categories: [], confidence: 0 };
    }

    const data = await res.json();
    return {
      safe: data.safe ?? true,
      categories: data.flagged_categories ?? [],
      confidence: data.confidence ?? 0,
    };
  } catch (error) {
    // Network error, timeout, or other failure — fail open
    console.error("Moderation API unavailable:", error);
    return { safe: true, categories: [], confidence: 0 };
  }
}
