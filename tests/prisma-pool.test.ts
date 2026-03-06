import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Prisma Pool Configuration", () => {
  const prismaFile = readFileSync(
    resolve(__dirname, "../src/lib/prisma.ts"),
    "utf-8"
  );

  it("should configure max connections", () => {
    expect(prismaFile).toContain("max:");
  });

  it("should configure min connections", () => {
    expect(prismaFile).toContain("min:");
  });

  it("should configure idle timeout", () => {
    expect(prismaFile).toContain("idleTimeoutMillis:");
  });

  it("should configure connection timeout", () => {
    expect(prismaFile).toContain("connectionTimeoutMillis:");
  });

  it("should have error handler on pool", () => {
    expect(prismaFile).toContain('pool.on("error"');
  });
});

describe("Schema Indexes", () => {
  const schemaFile = readFileSync(
    resolve(__dirname, "../prisma/schema.prisma"),
    "utf-8"
  );

  it("should have composite index on Message for read receipts", () => {
    expect(schemaFile).toContain("@@index([conversationId, senderId, readAt])");
  });

  it("should have userId index on Like", () => {
    // Check that Like model has @@index([userId])
    const likeModel = schemaFile.slice(
      schemaFile.indexOf("model Like"),
      schemaFile.indexOf("model Conversation")
    );
    expect(likeModel).toContain("@@index([userId])");
  });

  it("should have userId index on Session", () => {
    const sessionModel = schemaFile.slice(
      schemaFile.indexOf("model Session"),
      schemaFile.indexOf("model Account")
    );
    expect(sessionModel).toContain("@@index([userId])");
  });

  it("should preserve existing indexes", () => {
    expect(schemaFile).toContain("@@index([conversationId, createdAt])");
    expect(schemaFile).toContain("@@index([postId])");
    expect(schemaFile).toContain("@@unique([postId, userId])");
    expect(schemaFile).toContain("@@index([recipientId, read])");
  });
});

describe("Server Configuration", () => {
  const serverFile = readFileSync(
    resolve(__dirname, "../server.ts"),
    "utf-8"
  );

  it("should set UV_THREADPOOL_SIZE", () => {
    expect(serverFile).toContain("UV_THREADPOOL_SIZE");
  });

  it("should handle SIGTERM", () => {
    expect(serverFile).toContain("SIGTERM");
  });

  it("should handle SIGINT", () => {
    expect(serverFile).toContain("SIGINT");
  });

  it("should handle unhandledRejection", () => {
    expect(serverFile).toContain("unhandledRejection");
  });

  it("should handle uncaughtException", () => {
    expect(serverFile).toContain("uncaughtException");
  });
});

describe("Socket Server Security", () => {
  const socketFile = readFileSync(
    resolve(__dirname, "../src/lib/socket-server.ts"),
    "utf-8"
  );

  it("should NOT trust client-supplied userId", () => {
    // The old vulnerable pattern
    expect(socketFile).not.toContain("socket.handshake.auth.userId");
  });

  it("should verify session token", () => {
    expect(socketFile).toContain("socket.handshake.auth.token");
    expect(socketFile).toContain("session.findUnique");
  });

  it("should use verified userId from socket.data", () => {
    expect(socketFile).toContain("socket.data.userId");
    expect(socketFile).toContain("socket.data.userName");
  });

  it("should validate chat messages with zod", () => {
    expect(socketFile).toContain("ChatMessageSchema.parse(data)");
  });

  it("should validate read receipts with zod", () => {
    expect(socketFile).toContain("ChatReadSchema.parse(data)");
  });

  it("should validate typing events with zod", () => {
    expect(socketFile).toContain("ChatTypingSchema.parse(data)");
  });

  it("should use transaction for chat:message", () => {
    expect(socketFile).toContain("prisma.$transaction");
  });

  it("should NOT broadcast online/offline to all users", () => {
    expect(socketFile).not.toContain("socket.broadcast.emit");
  });

  it("should only notify friends of online/offline", () => {
    expect(socketFile).toContain("getFriendIds");
    expect(socketFile).toContain('emitToUser(friendId, "user:online"');
    expect(socketFile).toContain('emitToUser(friendId, "user:offline"');
  });
});

describe("Image Processing - Decode Once", () => {
  const imageFile = readFileSync(
    resolve(__dirname, "../src/lib/image-processing.ts"),
    "utf-8"
  );

  it("should call sharp(input) only once in processImage", () => {
    // Extract processImage function body
    const funcStart = imageFile.indexOf("async function processImage");
    const funcEnd = imageFile.indexOf("async function processAvatar");
    const funcBody = imageFile.slice(funcStart, funcEnd);

    // Count occurrences of sharp(input) — should be exactly 1
    const matches = funcBody.match(/sharp\(input\)/g);
    expect(matches).toHaveLength(1);
  });

  it("should use pipeline.clone() for both outputs", () => {
    expect(imageFile).toContain("pipeline.clone()");
  });

  it("should use Promise.all for parallel processing", () => {
    expect(imageFile).toContain("Promise.all");
  });
});

describe("Upload Route - Parallel S3 Uploads", () => {
  const uploadFile = readFileSync(
    resolve(__dirname, "../src/app/api/upload/route.ts"),
    "utf-8"
  );

  it("should parallelize S3 uploads with Promise.all", () => {
    expect(uploadFile).toContain("Promise.all");
    expect(uploadFile).toContain("uploadFile(buffer");
    expect(uploadFile).toContain("uploadFile(thumbnail");
  });

  it("should have .catch on moderation promise", () => {
    expect(uploadFile).toContain(".catch(");
  });
});

describe("User Profile - Parallel Queries", () => {
  const userRoute = readFileSync(
    resolve(__dirname, "../src/app/api/users/[userId]/route.ts"),
    "utf-8"
  );

  it("should parallelize with Promise.all", () => {
    expect(userRoute).toContain("Promise.all");
  });

  it("should NOT separately call areFriends", () => {
    expect(userRoute).not.toContain("areFriends(");
  });

  it("should derive isFriend from friendship query", () => {
    expect(userRoute).toContain('friendship?.status === "ACCEPTED"');
  });
});

describe("Like Route - Parallel Queries", () => {
  const likeRoute = readFileSync(
    resolve(__dirname, "../src/app/api/posts/[postId]/like/route.ts"),
    "utf-8"
  );

  it("should parallelize post and like lookups", () => {
    expect(likeRoute).toContain("Promise.all");
  });
});

describe("Friend Cache Invalidation", () => {
  const respondRoute = readFileSync(
    resolve(__dirname, "../src/app/api/friends/respond/route.ts"),
    "utf-8"
  );
  const removeRoute = readFileSync(
    resolve(__dirname, "../src/app/api/friends/remove/route.ts"),
    "utf-8"
  );

  it("should invalidate cache in respond route", () => {
    expect(respondRoute).toContain("invalidateFriendCache");
  });

  it("should invalidate cache in remove route", () => {
    expect(removeRoute).toContain("invalidateFriendCache");
  });
});

describe("Socket Client Module", () => {
  const clientFile = readFileSync(
    resolve(__dirname, "../src/lib/socket-client.ts"),
    "utf-8"
  );

  it("should send token in auth, not userId", () => {
    expect(clientFile).toContain("auth: { token }");
    expect(clientFile).not.toContain("auth: { userId");
  });

  it("should get session from authClient", () => {
    expect(clientFile).toContain("authClient.getSession()");
  });

  it("should be a client component", () => {
    expect(clientFile).toContain('"use client"');
  });
});
