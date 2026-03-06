import { prisma } from "./prisma";

// In-memory TTL cache for friend IDs (60s TTL)
const friendIdCache = new Map<string, { ids: string[]; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

/** Get all accepted friend IDs for a user (cached for 60s) */
export async function getFriendIds(userId: string): Promise<string[]> {
  const cached = friendIdCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ids;
  }

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });

  const ids = friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );

  friendIdCache.set(userId, { ids, expiresAt: Date.now() + CACHE_TTL_MS });
  return ids;
}

/** Invalidate the friend ID cache for a user */
export function invalidateFriendCache(userId: string): void {
  friendIdCache.delete(userId);
}

/** Check if two users are friends */
export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId1, addresseeId: userId2 },
        { requesterId: userId2, addresseeId: userId1 },
      ],
    },
  });
  return !!friendship;
}

/** Get accepted friend count for a user */
export async function getFriendCount(userId: string): Promise<number> {
  return prisma.friendship.count({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
}

/** Get pending incoming friend requests for a user */
export async function getPendingRequests(userId: string) {
  return prisma.friendship.findMany({
    where: {
      addresseeId: userId,
      status: "PENDING",
    },
    include: {
      requester: {
        select: { id: true, name: true, image: true, bio: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
