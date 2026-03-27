export interface ModerationResult {
  safe: boolean;
  categories: string[];
  confidence: number;
}

const THRESHOLDS: Record<string, number> = {
  nudity: 0.5,
  offensive: 0.7,
  gore: 0.5,
  violence: 0.7,
};

const CATEGORY_LABELS: Record<string, string> = {
  nudity: "Nudity / Sexual content",
  offensive: "Offensive / Hate symbols",
  gore: "Gore / Graphic violence",
  violence: "Violence",
};

/**
 * Call SightEngine API to check if an image is appropriate.
 * Fail-open: if API is unavailable or not configured, treat as safe.
 */
export async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    console.warn("[Moderation] SightEngine not configured, skipping");
    return { safe: true, categories: [], confidence: 0 };
  }

  try {
    const params = new URLSearchParams({
      url: imageUrl,
      models: "nudity-2.1,offensive,gore,violence",
      api_user: apiUser,
      api_secret: apiSecret,
    });

    const res = await fetch(
      `https://api.sightengine.com/1.0/check.json?${params}`,
      { signal: AbortSignal.timeout(12000) }
    );

    if (!res.ok) {
      console.error("[Moderation] API error:", res.status, res.statusText);
      return { safe: true, categories: [], confidence: 0 };
    }

    const data = await res.json();
    if (data.status !== "success") {
      console.error("[Moderation] API returned non-success:", data);
      return { safe: true, categories: [], confidence: 0 };
    }

    const flagged: string[] = [];
    let maxConfidence = 0;

    // Nudity: check the most explicit sub-scores
    const nudityMax = Math.max(
      data.nudity?.sexual_activity ?? 0,
      data.nudity?.sexual_display ?? 0,
      data.nudity?.erotica ?? 0,
      data.nudity?.very_suggestive ?? 0,
    );
    if (nudityMax > THRESHOLDS.nudity) {
      flagged.push("nudity");
      maxConfidence = Math.max(maxConfidence, nudityMax);
    }

    // Offensive gestures & hate symbols
    const offensiveProb = data.offensive?.prob ?? 0;
    if (offensiveProb > THRESHOLDS.offensive) {
      flagged.push("offensive");
      maxConfidence = Math.max(maxConfidence, offensiveProb);
    }

    // Gore
    const goreProb = data.gore?.prob ?? 0;
    if (goreProb > THRESHOLDS.gore) {
      flagged.push("gore");
      maxConfidence = Math.max(maxConfidence, goreProb);
    }

    // Violence
    const violenceProb = data.violence?.prob ?? 0;
    if (violenceProb > THRESHOLDS.violence) {
      flagged.push("violence");
      maxConfidence = Math.max(maxConfidence, violenceProb);
    }

    const safe = flagged.length === 0;
    if (!safe) {
      console.warn(
        `[Moderation] Image FLAGGED: ${imageUrl}`,
        flagged.map((c) => `${c}=${(data[c]?.prob ?? nudityMax).toFixed(2)}`).join(", ")
      );
    }

    return {
      safe,
      categories: flagged.map((c) => CATEGORY_LABELS[c] ?? c),
      confidence: Math.round(maxConfidence * 100) / 100,
    };
  } catch (error) {
    console.error("[Moderation] API unavailable:", error);
    return { safe: true, categories: [], confidence: 0 };
  }
}
