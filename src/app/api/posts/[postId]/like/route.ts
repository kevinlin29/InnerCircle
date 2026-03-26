import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { areFriends } from "@/lib/friends";
import { emitNotification } from "@/lib/socket-server";

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

    // Parallelize independent lookups
    const [post, existingLike] = await Promise.all([
      prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } }),
      prisma.like.findUnique({ where: { postId_userId: { postId, userId } } }),
    ]);

    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (post.authorId !== userId && !(await areFriends(userId, post.authorId))) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      return NextResponse.json({ liked: false });
    } else {
      await prisma.like.create({ data: { postId, userId } });

      if (post.authorId !== userId) {
        const notification = await prisma.notification.create({
          data: {
            recipientId: post.authorId,
            type: "LIKE",
            referenceId: postId,
            message: `${session.user.name} liked your post`,
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
          // Socket not initialized in dev — safe to ignore
        }
      }

      return NextResponse.json({ liked: true });
    }
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
