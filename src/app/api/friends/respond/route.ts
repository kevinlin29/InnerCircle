import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { invalidateFriendCache } from "@/lib/friends";
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
    const { friendshipId, action } = await req.json();

    if (action === "accept") {
      // Use transaction to prevent race condition on friend cap
      const result = await prisma.$transaction(async (tx) => {
        const friendship = await tx.friendship.findUnique({ where: { id: friendshipId } });
        if (!friendship || friendship.addresseeId !== userId) {
          throw new Error("Not found");
        }
        if (friendship.status !== "PENDING") {
          throw new Error("Already responded");
        }

        // Check cap for accepter
        const user = await tx.user.findUnique({ where: { id: userId }, select: { friendCapLimit: true } });
        const friendCount = await tx.friendship.count({
          where: {
            status: "ACCEPTED",
            OR: [{ requesterId: userId }, { addresseeId: userId }],
          },
        });
        if (user && friendCount >= user.friendCapLimit) {
          throw new Error("You have reached your friend limit");
        }

        // Check cap for requester too
        const requester = await tx.user.findUnique({ where: { id: friendship.requesterId }, select: { friendCapLimit: true } });
        const requesterCount = await tx.friendship.count({
          where: {
            status: "ACCEPTED",
            OR: [{ requesterId: friendship.requesterId }, { addresseeId: friendship.requesterId }],
          },
        });
        if (requester && requesterCount >= requester.friendCapLimit) {
          throw new Error("The requester has reached their friend limit");
        }

        return tx.friendship.update({
          where: { id: friendshipId },
          data: { status: "ACCEPTED" },
        });
      });

      const notification = await prisma.notification.create({
        data: {
          recipientId: result.requesterId,
          type: "FRIEND_ACCEPT",
          referenceId: result.id,
          message: `${session.user.name} accepted your friend request`,
        },
      });

      try {
        emitNotification(result.requesterId, {
          id: notification.id,
          type: notification.type,
          message: notification.message,
          referenceId: notification.referenceId,
          createdAt: notification.createdAt,
        });
      } catch {
        // Socket.io may not be initialized; ignore
      }

      invalidateFriendCache(userId);
      invalidateFriendCache(result.requesterId);

      return NextResponse.json({ friendship: result });
    } else if (action === "decline") {
      const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
      if (!friendship || friendship.addresseeId !== userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: "DECLINED" },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
