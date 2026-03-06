import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    friendship: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// We need to re-import the module for each test to reset the cache
// Since the cache is module-level state, we use dynamic imports

describe("Friend ID Cache", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should return friend IDs from database on first call", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { getFriendIds } = await import("@/lib/friends");

    vi.mocked(prisma.friendship.findMany).mockResolvedValue([
      { requesterId: "user1", addresseeId: "friend1" } as never,
      { requesterId: "friend2", addresseeId: "user1" } as never,
    ]);

    const result = await getFriendIds("user1");
    expect(result).toEqual(["friend1", "friend2"]);
    expect(prisma.friendship.findMany).toHaveBeenCalledTimes(1);
  });

  it("should return cached results on second call (no DB hit)", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { getFriendIds } = await import("@/lib/friends");

    vi.mocked(prisma.friendship.findMany).mockResolvedValue([
      { requesterId: "user1", addresseeId: "friend1" } as never,
    ]);

    await getFriendIds("user1");
    const result = await getFriendIds("user1");

    expect(result).toEqual(["friend1"]);
    // Should only have been called ONCE — second call hits cache
    expect(prisma.friendship.findMany).toHaveBeenCalledTimes(1);
  });

  it("should invalidate cache and re-fetch from DB", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { getFriendIds, invalidateFriendCache } = await import("@/lib/friends");

    vi.mocked(prisma.friendship.findMany)
      .mockResolvedValueOnce([
        { requesterId: "user1", addresseeId: "friend1" } as never,
      ])
      .mockResolvedValueOnce([
        { requesterId: "user1", addresseeId: "friend1" } as never,
        { requesterId: "user1", addresseeId: "friend2" } as never,
      ]);

    const first = await getFriendIds("user1");
    expect(first).toEqual(["friend1"]);

    invalidateFriendCache("user1");

    const second = await getFriendIds("user1");
    expect(second).toEqual(["friend1", "friend2"]);
    expect(prisma.friendship.findMany).toHaveBeenCalledTimes(2);
  });

  it("should cache independently per user", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { getFriendIds } = await import("@/lib/friends");

    vi.mocked(prisma.friendship.findMany)
      .mockResolvedValueOnce([
        { requesterId: "userA", addresseeId: "friend1" } as never,
      ])
      .mockResolvedValueOnce([
        { requesterId: "userB", addresseeId: "friend2" } as never,
      ]);

    const a = await getFriendIds("userA");
    const b = await getFriendIds("userB");

    expect(a).toEqual(["friend1"]);
    expect(b).toEqual(["friend2"]);
    expect(prisma.friendship.findMany).toHaveBeenCalledTimes(2);
  });

  it("cache performance: second call should be <1ms", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { getFriendIds } = await import("@/lib/friends");

    // Simulate slow DB
    vi.mocked(prisma.friendship.findMany).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([
        { requesterId: "user1", addresseeId: "f1" } as never,
        { requesterId: "user1", addresseeId: "f2" } as never,
        { requesterId: "user1", addresseeId: "f3" } as never,
      ]), 50))
    );

    // First call: hits DB (slow)
    const start1 = performance.now();
    await getFriendIds("user1");
    const elapsed1 = performance.now() - start1;

    // Second call: hits cache (fast)
    const start2 = performance.now();
    await getFriendIds("user1");
    const elapsed2 = performance.now() - start2;

    expect(elapsed1).toBeGreaterThan(40); // DB call took ~50ms
    expect(elapsed2).toBeLessThan(1); // Cache hit should be <1ms
  });
});
