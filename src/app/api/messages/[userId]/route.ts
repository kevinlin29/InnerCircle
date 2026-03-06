import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { areFriends } from "@/lib/friends";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  let session: Awaited<ReturnType<typeof requireSessionForApi>>;
  try {
    session = await requireSessionForApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentUserId = session.user.id;
    const { userId: otherUserId } = await params;

    // Verify friendship
    if (!(await areFriends(currentUserId, otherUserId))) {
      return NextResponse.json({ error: "Not friends" }, { status: 403 });
    }

    // Find conversation (sorted participant IDs for unique constraint)
    const [participantAId, participantBId] = [currentUserId, otherUserId].sort();

    const conversation = await prisma.conversation.findUnique({
      where: { participantAId_participantBId: { participantAId, participantBId } },
    });

    if (!conversation) {
      return NextResponse.json({ messages: [], conversationId: null, nextCursor: null });
    }

    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = 50;

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    return NextResponse.json({
      messages: items.reverse(), // Return in chronological order
      conversationId: conversation.id,
      nextCursor: hasMore ? items[0].id : null,
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
