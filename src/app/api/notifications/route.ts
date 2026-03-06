import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

// GET /api/notifications — list notifications (paginated)
export async function GET(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireSessionForApi>>;
  try {
    session = await requireSessionForApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = 20;

    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;

    // Also get unread count
    const unreadCount = await prisma.notification.count({
      where: { recipientId: userId, read: false },
    });

    return NextResponse.json({
      notifications: items,
      unreadCount,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/notifications — mark notifications as read
export async function PATCH(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireSessionForApi>>;
  try {
    session = await requireSessionForApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const { notificationIds, markAll } = await req.json();

    if (markAll) {
      await prisma.notification.updateMany({
        where: { recipientId: userId, read: false },
        data: { read: true },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          recipientId: userId,
        },
        data: { read: true },
      });
    } else {
      return NextResponse.json({ error: "Provide notificationIds or markAll" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
