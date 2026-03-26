import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { areFriends } from "@/lib/friends";
import { emitNotification } from "@/lib/socket-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  let session: Awaited<ReturnType<typeof requireSessionForApi>>;
  try {
    session = await requireSessionForApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const { postId } = await params;

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (post.authorId !== userId && !(await areFriends(userId, post.authorId))) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = 20;

    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, limit) : comments;

    return NextResponse.json({
      comments: items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  let session: Awaited<ReturnType<typeof requireSessionForApi>>;
  try {
    session = await requireSessionForApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const { postId } = await params;
    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (post.authorId !== userId && !(await areFriends(userId, post.authorId))) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const comment = await prisma.comment.create({
      data: { postId, authorId: userId, content: content.trim() },
      include: { author: { select: { id: true, name: true, image: true } } },
    });

    if (post.authorId !== userId) {
      const notification = await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          type: "COMMENT",
          referenceId: postId,
          message: `${session.user.name} commented on your post`,
        },
      });
      try {
        emitNotification(post.authorId, {
          id: notification.id,
          type: notification.type,
          message: notification.message,
          referenceId: notification.referenceId,
          createdAt: notification.createdAt,
        });
      } catch {
        // Socket not initialized in dev
      }
    }

    return NextResponse.json({ comment });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
