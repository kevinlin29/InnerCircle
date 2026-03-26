import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getFriendCount } from "@/lib/friends";
import { emitNotification } from "@/lib/socket-server";

export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireSessionForApi>>;
  try {
    session = await requireSessionForApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const { addresseeId } = await req.json();

    if (userId === addresseeId) {
      return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });
    }

    // Check friend cap for requester
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { friendCapLimit: true } });
    const friendCount = await getFriendCount(userId);
    if (user && friendCount >= user.friendCapLimit) {
      return NextResponse.json({ error: "You have reached your friend limit" }, { status: 400 });
    }

    // Check if friendship already exists (in either direction)
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId },
          { requesterId: addresseeId, addresseeId: userId },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Friend request already exists" }, { status: 400 });
    }

    const friendship = await prisma.friendship.create({
      data: { requesterId: userId, addresseeId },
    });

    const notification = await prisma.notification.create({
      data: {
        recipientId: addresseeId,
        type: "FRIEND_REQUEST",
        referenceId: friendship.id,
        message: `${session.user.name} sent you a friend request`,
      },
    });
    try {
      emitNotification(addresseeId, {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        referenceId: notification.referenceId,
        createdAt: notification.createdAt,
      });
    } catch {
      // Socket not initialized in dev
    }

    return NextResponse.json({ friendship });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
