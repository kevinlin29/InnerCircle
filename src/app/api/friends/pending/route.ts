import { NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { getPendingRequests } from "@/lib/friends";

export async function GET() {
  let session: Awaited<ReturnType<typeof requireSessionForApi>>;
  try {
    session = await requireSessionForApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requests = await getPendingRequests(session.user.id);
    return NextResponse.json({ requests });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
