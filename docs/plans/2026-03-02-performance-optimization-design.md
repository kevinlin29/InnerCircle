# Performance & Security Optimization Design

**Date:** 2026-03-02
**Status:** Approved
**Scope:** P0 (Critical), P1 (High), P2 (Medium) issues from backend performance audit

---

## Problem Statement

The backend has several performance bottlenecks and a critical security vulnerability that will degrade user experience at scale and expose the app to abuse. This document covers 12 fixes across 4 workstreams that the team can divide and implement in parallel.

## Priority Summary

| Priority | Issue | File | Impact |
|----------|-------|------|--------|
| P0 | Socket.io trusts client-supplied userId | `socket-server.ts:49` | Auth bypass — anyone can impersonate any user |
| P0 | N+1 queries in conversations list | `conversations/route.ts:36-57` | 30-150ms saved per load |
| P1 | No WebSocket input validation | `socket-server.ts:67` | Injection risk |
| P1 | Redundant friendship queries in profile | `users/[userId]/route.ts` | 8-15ms saved per request |
| P1 | 4 sequential DB queries per chat message | `socket-server.ts:72-128` | 4-8ms saved per message |
| P1 | Image decoded twice | `image-processing.ts:14-20` | 40-60% faster uploads |
| P1 | Connection pool not configured | `prisma.ts:11-17` | Prevents pool exhaustion under load |
| P2 | User search without trigram index | `users/search/route.ts` | 10-400ms saved at scale |
| P2 | Global online/offline broadcast | `socket-server.ts:64,182` | O(N) → O(friends) per event |
| P2 | Missing composite indexes | `schema.prisma` | Faster read receipts, session cleanup |
| P2 | No graceful shutdown | `server.ts` | Deployment reliability |
| P2 | Sequential awaits in like/comment | `like/route.ts` | 2-4ms saved per request |

---

## Workstream 1: Database & Query Optimization

**Owner:** TBD
**Files:** `prisma/schema.prisma`, `src/lib/friends.ts`, `src/lib/prisma.ts`
**Covers:** P1 (connection pool), P2 (missing indexes, trigram index, friend cache)

### 1a. Configure Connection Pool (`src/lib/prisma.ts`)

The `pg.Pool` uses defaults (`max: 10`), which will exhaust under concurrent Socket.io + API traffic.

**Before:**
```typescript
const pool = new pg.Pool({
  host: url.hostname,
  port: parseInt(url.port) || 5432,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
});
```

**After:**
```typescript
const pool = new pg.Pool({
  host: url.hostname,
  port: parseInt(url.port) || 5432,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
});
```

### 1b. Add Missing Database Indexes (`prisma/schema.prisma`)

Add composite index for read receipt queries, userId index on Like, and userId index on Session:

```prisma
model Message {
  // ... existing fields ...
  @@index([conversationId, createdAt])
  @@index([conversationId, senderId, readAt])  // NEW: read receipt updates
}

model Like {
  // ... existing fields ...
  @@unique([postId, userId])
  @@index([postId])
  @@index([userId])  // NEW: "posts I liked" queries
}

model Session {
  // ... existing fields ...
  @@index([userId])  // NEW: session cleanup
}
```

### 1c. Add Trigram Index for User Search

Create a new Prisma migration with raw SQL:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_user_name_trgm ON "User" USING GIN (name gin_trgm_ops);
CREATE INDEX idx_user_email_trgm ON "User" USING GIN (email gin_trgm_ops);
```

This makes `ILIKE '%query%'` use a GIN index scan instead of a sequential scan. No application code changes needed.

### 1d. Add Friend ID Cache (`src/lib/friends.ts`)

`getFriendIds()` is called on every feed load but friend lists change infrequently. Add a simple in-memory TTL cache:

```typescript
const friendIdCache = new Map<string, { ids: string[]; expiry: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

export async function getFriendIds(userId: string): Promise<string[]> {
  const cached = friendIdCache.get(userId);
  if (cached && cached.expiry > Date.now()) {
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

  friendIdCache.set(userId, { ids, expiry: Date.now() + CACHE_TTL_MS });
  return ids;
}

/** Call when friendships change (accept, remove) */
export function invalidateFriendCache(userId: string) {
  friendIdCache.delete(userId);
}
```

Then call `invalidateFriendCache()` in the friend respond and friend remove routes after mutations.

---

## Workstream 2: N+1 and Sequential Query Fixes

**Owner:** TBD
**Files:** `src/app/api/messages/conversations/route.ts`, `src/app/api/users/[userId]/route.ts`, `src/app/api/posts/[postId]/like/route.ts`, `src/app/api/upload/route.ts`
**Covers:** P0 (conversations N+1), P1 (profile queries), P2 (like/upload sequential awaits)

### 2a. Fix Conversations N+1 (`src/app/api/messages/conversations/route.ts`)

**Problem:** For N conversations, N+1 queries are issued (1 list + N unread counts).

**Fix:** Replace per-conversation `count()` with a single `groupBy()`:

```typescript
// After fetching conversations, batch all unread counts in ONE query
const conversationIds = conversations.map((c) => c.id);
const unreadCounts = conversationIds.length > 0
  ? await prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        readAt: null,
      },
      _count: { id: true },
    })
  : [];

const unreadMap = new Map(
  unreadCounts.map((u) => [u.conversationId, u._count.id])
);

// Then use unreadMap.get(conv.id) ?? 0 instead of individual counts
```

**Result:** N+1 queries → exactly 2, regardless of conversation count.

### 2b. Parallelize User Profile Queries (`src/app/api/users/[userId]/route.ts`)

**Problem:** 5 sequential queries — `findUnique(user)`, `getFriendCount()`, `areFriends()`, `findFirst(friendship)`, `findMany(posts)`. Queries 3 and 4 are nearly identical.

**Fix:** Combine into 3 parallel queries + 1 conditional:

```typescript
const [user, friendCount, friendship] = await Promise.all([
  prisma.user.findUnique({ where: { id: userId }, select: { ... } }),
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

const isFriend = friendship?.status === "ACCEPTED";
const friendshipStatus = friendship?.status ?? null;

// Only fetch posts if friend or self (conditional 4th query)
```

This single `findFirst` replaces both `areFriends()` and the separate friendship status lookup.

### 2c. Parallelize Like Toggle (`src/app/api/posts/[postId]/like/route.ts`)

**Problem:** `findUnique(post)` and `findUnique(like)` run sequentially but are independent.

**Fix:**
```typescript
const [post, existingLike] = await Promise.all([
  prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } }),
  prisma.like.findUnique({ where: { postId_userId: { postId, userId } } }),
]);
```

### 2d. Parallelize S3 Uploads + Fix Unhandled Promise (`src/app/api/upload/route.ts`)

**Problem:** Full image and thumbnail uploaded sequentially. Moderation promise has no `.catch()`.

**Fix:**
```typescript
const [url, thumbnailUrl] = await Promise.all([
  uploadFile(buffer, "posts", contentType, extension),
  uploadFile(thumbnail, "posts/thumbnails", contentType, extension),
]);

moderateImage(url)
  .then((result) => {
    if (!result.safe) {
      console.warn(`Image flagged by moderation: ${url}`, result.categories);
    }
  })
  .catch((err) => console.error("Moderation failed:", err));
```

---

## Workstream 3: Socket.io Security & Performance

**Owner:** TBD
**Files:** `src/lib/socket-server.ts`, new `src/lib/socket-client.ts`
**Covers:** P0 (auth bypass), P1 (input validation, sequential queries), P2 (global broadcast)

### 3a. Server-Side Auth Middleware (SECURITY CRITICAL)

**Problem:** `socket.handshake.auth.userId` is trusted without verification. Any client can claim any identity.

**Fix:** Add `io.use()` middleware that verifies the session token:

```typescript
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token as string;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      return next(new Error("Invalid or expired session"));
    }

    socket.data.userId = session.userId;
    socket.data.userName = session.user.name;
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
});
```

Then use `socket.data.userId` (verified) instead of `socket.handshake.auth.userId` (unverified) throughout.

### 3b. Client-Side Socket Module (new `src/lib/socket-client.ts`)

Create a client-side socket module that sends the session token:

```typescript
"use client";

import { io, Socket } from "socket.io-client";
import { authClient } from "./auth-client";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const session = await authClient.getSession();
  if (!session?.data?.session?.token) {
    throw new Error("No active session");
  }

  socket = io({
    path: "/api/socketio",
    auth: { token: session.data.session.token },
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

### 3c. Input Validation with Zod

Add schemas for all WebSocket message payloads:

```typescript
import { z } from "zod";

const ChatMessageSchema = z.object({
  receiverId: z.string().min(1).max(100),
  content: z.string().min(1).max(5000).trim(),
});

const ChatReadSchema = z.object({
  conversationId: z.string().min(1).max(100),
});

const ChatTypingSchema = z.object({
  receiverId: z.string().min(1).max(100),
  isTyping: z.boolean(),
});
```

Validate in each handler before processing. On validation failure, emit an error event back to the client.

### 3d. Transaction for Chat Message Handler

Wrap conversation find/create + message create + timestamp update in a single `prisma.$transaction`. Fire-and-forget the notification with `.catch()`:

```typescript
const { message, conversation } = await prisma.$transaction(async (tx) => {
  let conv = await tx.conversation.findUnique({ ... });
  if (!conv) conv = await tx.conversation.create({ ... });
  const msg = await tx.message.create({ ... });
  await tx.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: msg.createdAt } });
  return { message: msg, conversation: conv };
});

// Emit immediately, create notification in background
emitToUser(parsed.receiverId, "chat:message", messagePayload);

prisma.notification.create({ ... })
  .then((notification) => emitNotification(parsed.receiverId, { ... }))
  .catch((err) => console.error("Notification creation failed:", err));
```

### 3e. Scoped Online/Offline Broadcast

**Problem:** `socket.broadcast.emit("user:online")` sends to ALL connected sockets.

**Fix:** Only notify friends:

```typescript
io.on("connection", async (socket) => {
  const userId = socket.data.userId;
  // ... track connection ...

  const friendIds = await getFriendIds(userId);
  for (const friendId of friendIds) {
    emitToUser(friendId, "user:online", { userId });
  }

  socket.on("disconnect", async () => {
    // ... cleanup ...
    if (sockets.size === 0) {
      userSockets.delete(userId);
      for (const friendId of friendIds) {
        emitToUser(friendId, "user:offline", { userId });
      }
    }
  });
});
```

---

## Workstream 4: Server & Image Pipeline

**Owner:** TBD
**Files:** `server.ts`, `src/lib/image-processing.ts`
**Covers:** P1 (image decode twice), P2 (graceful shutdown)

### 4a. Graceful Shutdown (`server.ts`)

**Problem:** No shutdown handling — active connections and DB queries killed abruptly on deploy.

**Fix:**
```typescript
// At the very top, before imports
process.env.UV_THREADPOOL_SIZE = "8";

import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { initSocketServer } from "./src/lib/socket-server";

// ... existing setup ...

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = initSocketServer(httpServer);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close();
    io.close();
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 5000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason));
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    process.exit(1);
  });
});
```

The `UV_THREADPOOL_SIZE=8` at the top increases libuv's thread pool from the default 4, giving Sharp more threads for image processing.

### 4b. Image Decode-Once (`src/lib/image-processing.ts`)

**Problem:** `sharp(input)` is called twice, decoding the same JPEG/PNG twice (~50-100ms per decode for large images).

**Fix:** Decode once, clone for each output:

```typescript
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const pipeline = sharp(input);

  const [buffer, thumbnail] = await Promise.all([
    pipeline.clone()
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer(),
    pipeline.clone()
      .resize(400, 400, { fit: "cover" })
      .webp({ quality: 60 })
      .toBuffer(),
  ]);

  return { buffer, thumbnail, contentType: "image/webp", extension: "webp" };
}
```

---

## Testing Checklist

After implementing each workstream, verify:

- [ ] **WS1:** `npx prisma migrate dev` succeeds with new indexes. App connects to DB with configured pool.
- [ ] **WS2:** Conversations page loads without N+1 (check server logs for query count). User profile loads. Like toggle works. Image upload returns both URLs.
- [ ] **WS3:** WebSocket connection rejected without valid token. Messages still send/receive. Online status only shows to friends. Invalid payloads return error events.
- [ ] **WS4:** `Ctrl+C` gracefully shuts down. Image upload works and is noticeably faster for large images.

## Team Assignment

| Workstream | Suggested Owner | Dependencies |
|------------|----------------|--------------|
| WS1: Database & Query Optimization | Zhengyang | None — can start immediately |
| WS2: N+1 and Sequential Query Fixes | Irys | WS1 (friend cache) for feed route, but can start other fixes immediately |
| WS3: Socket.io Security & Performance | Qiwen | WS1 (friend cache) for scoped broadcast |
| WS4: Server & Image Pipeline | Weijie | None — can start immediately |
