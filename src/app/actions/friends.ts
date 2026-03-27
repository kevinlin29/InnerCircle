"use server";

import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getFriendCount, invalidateFriendCache } from "@/lib/friends";
import { revalidatePath } from "next/cache";

export async function sendFriendRequestAction(addresseeId: string) {
  const session = await requireSessionForApi();
  const userId = session.user.id;

  if (userId === addresseeId) {
    return { error: "Cannot send a friend request to yourself" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { friendCapLimit: true },
  });
  const friendCount = await getFriendCount(userId);
  if (user && friendCount >= user.friendCapLimit) {
    return { error: "You have reached your friend limit" };
  }

  const [requesterId, reqAddresseeId] = [userId, addresseeId].sort();
  const existing = await prisma.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId, addresseeId: reqAddresseeId } },
  });
  if (existing) {
    return { error: "Friend request already exists" };
  }

  await prisma.friendship.create({
    data: { requesterId: userId, addresseeId },
  });

  await prisma.notification.create({
    data: {
      recipientId: addresseeId,
      type: "FRIEND_REQUEST",
      referenceId: userId,
      message: `${session.user.name} sent you a friend request`,
    },
  });

  revalidatePath("/friends");
  return { success: true };
}

export async function respondFriendRequestAction(
  friendshipId: string,
  action: "accept" | "decline"
) {
  const session = await requireSessionForApi();
  const userId = session.user.id;

  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });

  if (!friendship || friendship.addresseeId !== userId) {
    return { error: "Friend request not found" };
  }

  if (friendship.status !== "PENDING") {
    return { error: "Request already handled" };
  }

  if (action === "decline") {
    await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: "DECLINED" },
    });
    revalidatePath("/friends");
    return { success: true };
  }

  // Accept
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { friendCapLimit: true },
  });
  const friendCount = await getFriendCount(userId);
  if (user && friendCount >= user.friendCapLimit) {
    return { error: "You have reached your friend limit" };
  }

  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: "ACCEPTED" },
  });

  invalidateFriendCache(userId);
  invalidateFriendCache(friendship.requesterId);

  await prisma.notification.create({
    data: {
      recipientId: friendship.requesterId,
      type: "FRIEND_ACCEPT",
      referenceId: userId,
      message: `${session.user.name} accepted your friend request`,
    },
  });

  revalidatePath("/friends");
  return { success: true };
}

export async function removeFriendAction(friendId: string) {
  const session = await requireSessionForApi();
  const userId = session.user.id;

  const [a, b] = [userId, friendId].sort();
  await prisma.friendship.deleteMany({
    where: {
      requesterId: a,
      addresseeId: b,
      status: "ACCEPTED",
    },
  });

  invalidateFriendCache(userId);
  invalidateFriendCache(friendId);

  revalidatePath("/friends");
  return { success: true };
}
