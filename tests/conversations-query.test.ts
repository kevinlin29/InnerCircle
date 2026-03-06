import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
const mockFindMany = vi.fn();
const mockGroupBy = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    message: {
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
      count: vi.fn(), // should NOT be called anymore
    },
  },
}));

vi.mock("@/lib/auth-utils", () => ({
  requireSessionForApi: vi.fn().mockResolvedValue({
    user: { id: "user1", name: "Test User" },
  }),
}));

describe("Conversations API - N+1 Fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use groupBy instead of per-conversation count", async () => {
    // Setup: 3 conversations
    const conversations = [
      {
        id: "conv1",
        participantAId: "user1",
        participantBId: "user2",
        participantA: { id: "user1", name: "User 1", image: null },
        participantB: { id: "user2", name: "User 2", image: null },
        messages: [{ id: "m1", content: "Hi", senderId: "user2", createdAt: new Date(), readAt: null }],
        lastMessageAt: new Date(),
      },
      {
        id: "conv2",
        participantAId: "user1",
        participantBId: "user3",
        participantA: { id: "user1", name: "User 1", image: null },
        participantB: { id: "user3", name: "User 3", image: null },
        messages: [{ id: "m2", content: "Hey", senderId: "user1", createdAt: new Date(), readAt: null }],
        lastMessageAt: new Date(),
      },
      {
        id: "conv3",
        participantAId: "user1",
        participantBId: "user4",
        participantA: { id: "user1", name: "User 1", image: null },
        participantB: { id: "user4", name: "User 4", image: null },
        messages: [],
        lastMessageAt: new Date(),
      },
    ];

    mockFindMany.mockResolvedValue(conversations);
    mockGroupBy.mockResolvedValue([
      { conversationId: "conv1", _count: { id: 3 } },
      { conversationId: "conv3", _count: { id: 1 } },
    ]);

    // Import and call the handler
    const { GET } = await import("@/app/api/messages/conversations/route");
    const response = await GET();
    const body = await response.json();

    // Verify groupBy was used (not individual counts)
    expect(mockGroupBy).toHaveBeenCalledTimes(1);
    expect(mockGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["conversationId"],
        where: expect.objectContaining({
          conversationId: { in: ["conv1", "conv2", "conv3"] },
          senderId: { not: "user1" },
          readAt: null,
        }),
      })
    );

    // Verify the old per-conversation count was NOT called
    const { prisma } = await import("@/lib/prisma");
    expect(prisma.message.count).not.toHaveBeenCalled();

    // Verify response shape and unread counts
    expect(body.conversations).toHaveLength(3);
    expect(body.conversations[0].unreadCount).toBe(3); // conv1
    expect(body.conversations[1].unreadCount).toBe(0); // conv2 (no unread)
    expect(body.conversations[2].unreadCount).toBe(1); // conv3
  });

  it("should handle empty conversations list", async () => {
    mockFindMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/messages/conversations/route");
    const response = await GET();
    const body = await response.json();

    // Should NOT call groupBy when there are no conversations
    expect(mockGroupBy).not.toHaveBeenCalled();
    expect(body.conversations).toHaveLength(0);
  });

  it("query count should be exactly 2 regardless of conversation count", async () => {
    // Simulate 20 conversations
    const conversations = Array.from({ length: 20 }, (_, i) => ({
      id: `conv${i}`,
      participantAId: "user1",
      participantBId: `user${i + 10}`,
      participantA: { id: "user1", name: "User 1", image: null },
      participantB: { id: `user${i + 10}`, name: `User ${i + 10}`, image: null },
      messages: [],
      lastMessageAt: new Date(),
    }));

    mockFindMany.mockResolvedValue(conversations);
    mockGroupBy.mockResolvedValue([]);

    const { GET } = await import("@/app/api/messages/conversations/route");
    await GET();

    // Exactly 2 queries: findMany + groupBy
    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockGroupBy).toHaveBeenCalledTimes(1);
    // Old approach would have been 1 + 20 = 21 queries
  });
});
