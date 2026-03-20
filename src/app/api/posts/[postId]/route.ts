import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { areFriends } from "@/lib/friends";

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

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, name: true, image: true } },
        images: { orderBy: { orderIndex: "asc" } },
        _count: { select: { comments: true, likes: true } },
        likes: { where: { userId }, select: { id: true } },
      },
    });

    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Friend-based access control
    if (post.authorId !== userId && !(await areFriends(userId, post.authorId))) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    return NextResponse.json({
      post: {
        id: post.id,
        authorId: post.authorId,
        author: post.author,
        textContent: post.textContent,
        lat: post.lat,
        lng: post.lng,
        images: post.images,
        isLiked: post.likes.length > 0,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        createdAt: post.createdAt,
      },
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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
    const { postId } = await params;

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await prisma.post.delete({ where: { id: postId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
