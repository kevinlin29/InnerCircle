import { NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let session: Awaited<ReturnType<typeof requireSessionForApi>>;
  try {
    session = await requireSessionForApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participantAId: userId },
          { participantBId: userId },
        ],
      },
      include: {
        participantA: { select: { id: true, name: true, image: true } },
        participantB: { select: { id: true, name: true, image: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, content: true, senderId: true, createdAt: true, readAt: true },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    // Batch all unread counts in ONE query instead of N+1
    const conversationIds = conversations.map((c) => c.id);
    const unreadCounts = conversationIds.length > 0
      ? await prisma.message.groupBy({
          by: ["conversationId"],
          where: {
            conversationId: { in: conversationIds },
            senderId: { not: userId },
            readAt: null,
          },
          _count: { id: true },
        })
      : [];

    const unreadMap = new Map(
      unreadCounts.map((u) => [u.conversationId, u._count.id])
    );

    const result = conversations.map((conv) => {
      const otherUser = conv.participantAId === userId ? conv.participantB : conv.participantA;
      return {
        id: conv.id,
        otherUser,
        lastMessage: conv.messages[0] ?? null,
        unreadCount: unreadMap.get(conv.id) ?? 0,
        lastMessageAt: conv.lastMessageAt,
      };
    });

    return NextResponse.json({ conversations: result });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
