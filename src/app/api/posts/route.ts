import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getFriendIds } from "@/lib/friends";

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

    const friendIds = await getFriendIds(userId);
    const authorIds = [userId, ...friendIds];

    const posts = await prisma.post.findMany({
      where: { authorId: { in: authorIds } },
      include: {
        author: { select: { id: true, name: true, image: true } },
        images: { orderBy: { orderIndex: "asc" } },
        _count: { select: { comments: true, likes: true } },
        likes: { where: { userId }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;

    return NextResponse.json({
      posts: items.map((post) => ({
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
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSessionForApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const { textContent, imageUrls, lat, lng } = await req.json();

    if (!textContent && (!imageUrls || imageUrls.length === 0)) {
      return NextResponse.json({ error: "Post must have text or images" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        authorId: userId,
        textContent: textContent ?? null,
        lat: lat ?? null,
        lng: lng ?? null,
        images: imageUrls?.length
          ? {
              create: imageUrls.map((img: { url: string; thumbnail: string }, i: number) => ({
                imageUrl: img.url,
                thumbnailUrl: img.thumbnail ?? null,
                orderIndex: i,
              })),
            }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        images: { orderBy: { orderIndex: "asc" } },
      },
    });

    return NextResponse.json({ post });
  } catch (err) {
    console.error("Post creation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
