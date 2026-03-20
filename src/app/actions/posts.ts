"use server";

import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface CreatePostInput {
  textContent?: string;
  lat?: number;
  lng?: number;
  imageUrls?: { url: string; thumbnail: string }[];
}

export async function createPostAction(input: CreatePostInput) {
  const session = await requireSessionForApi();
  const userId = session.user.id;

  if (!input.textContent?.trim() && (!input.imageUrls || input.imageUrls.length === 0)) {
    return { error: "Post must have text or images" };
  }

  const post = await prisma.post.create({
    data: {
      authorId: userId,
      textContent: input.textContent?.trim() ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      images: input.imageUrls?.length
        ? {
            create: input.imageUrls.map((img, i) => ({
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

  revalidatePath("/feed");

  return {
    post: {
      id: post.id,
      authorId: post.authorId,
      author: post.author,
      textContent: post.textContent,
      lat: post.lat,
      lng: post.lng,
      images: post.images,
      isLiked: false,
      likeCount: 0,
      commentCount: 0,
      createdAt: post.createdAt.toISOString(),
    },
  };
}

export async function toggleLikeAction(postId: string) {
  const session = await requireSessionForApi();
  const userId = session.user.id;

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return { liked: false };
  }

  await prisma.like.create({ data: { postId, userId } });
  return { liked: true };
}
