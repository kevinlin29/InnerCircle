import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getFriendCount } from "@/lib/friends";

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
    const { userId } = await params;
    const isSelf = currentUserId === userId;

    // Parallelize independent queries
    const [user, friendCount, friendship] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
          friendCapLimit: true,
          createdAt: true,
        },
      }),
      getFriendCount(userId),
      isSelf
        ? Promise.resolve(null)
        : prisma.friendship.findFirst({
            where: {
              OR: [
                { requesterId: currentUserId, addresseeId: userId },
                { requesterId: userId, addresseeId: currentUserId },
              ],
            },
            select: { status: true, requesterId: true },
          }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isFriend = friendship?.status === "ACCEPTED";
    const friendshipStatus = friendship?.status ?? null;

    // If not friends and not self, return limited info
    if (!isSelf && !isFriend) {
      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          image: user.image,
          bio: user.bio,
          friendCount,
          friendCapLimit: user.friendCapLimit,
          isFriend: false,
          isSelf: false,
          friendshipStatus,
        },
      });
    }

    // Friends or self: return full profile with recent posts
    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      include: {
        author: { select: { id: true, name: true, image: true } },
        images: { orderBy: { orderIndex: "asc" } },
        _count: { select: { comments: true, likes: true } },
        likes: { where: { userId: currentUserId }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
        bio: user.bio,
        friendCount,
        friendCapLimit: user.friendCapLimit,
        isFriend,
        isSelf,
        friendshipStatus,
        createdAt: user.createdAt,
      },
      posts: posts.map((post) => ({
        id: post.id,
        authorId: post.authorId,
        author: post.author,
        textContent: post.textContent,
        images: post.images,
        isLiked: post.likes.length > 0,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        createdAt: post.createdAt,
      })),
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
