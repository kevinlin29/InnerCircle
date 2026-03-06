import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { invalidateFriendCache } from "@/lib/friends";

export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireSessionForApi>>;
  try {
    session = await requireSessionForApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const { friendId } = await req.json();

    const result = await prisma.friendship.deleteMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    invalidateFriendCache(userId);
    invalidateFriendCache(friendId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
