import { Server as SocketServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { z } from "zod";
import { prisma } from "./prisma";
import { getFriendIds } from "./friends";

let io: SocketServer | null = null;

// Map userId → Set of socket IDs (user can have multiple tabs)
const userSockets = new Map<string, Set<string>>();

// Zod schemas for input validation
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

export function getIO(): SocketServer {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

/** Emit an event to a specific user (all their connected sockets) */
export function emitToUser(userId: string, event: string, data: unknown) {
  const sockets = userSockets.get(userId);
  if (sockets && io) {
    for (const socketId of sockets) {
      io.to(socketId).emit(event, data);
    }
  }
}

/** Emit a notification to a user via Socket.io */
export function emitNotification(userId: string, notification: {
  id: string;
  type: string;
  message: string;
  referenceId?: string | null;
  createdAt: Date;
}) {
  emitToUser(userId, "notification:new", notification);
}

/** Check if a user is currently online */
export function isUserOnline(userId: string): boolean {
  const sockets = userSockets.get(userId);
  return !!sockets && sockets.size > 0;
}

export function initSocketServer(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socketio",
  });

  // Authentication middleware — verify session token server-side
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

      // Attach verified user data to socket
      socket.data.userId = session.userId;
      socket.data.userName = session.user.name;
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    const userName = socket.data.userName as string;

    // Track user connection
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Notify only friends of online status (not all users)
    const friendIds = await getFriendIds(userId);
    for (const friendId of friendIds) {
      emitToUser(friendId, "user:online", { userId });
    }

    // Handle direct message
    socket.on("chat:message", async (data: unknown, callback?: (msg: unknown) => void) => {
      try {
        const parsed = ChatMessageSchema.parse(data);
        const [participantAId, participantBId] = [userId, parsed.receiverId].sort();

        // Transaction: find/create conversation + create message + update timestamp
        const { message, conversation } = await prisma.$transaction(async (tx) => {
          let conv = await tx.conversation.findUnique({
            where: { participantAId_participantBId: { participantAId, participantBId } },
          });

          if (!conv) {
            conv = await tx.conversation.create({
              data: { participantAId, participantBId },
            });
          }

          const msg = await tx.message.create({
            data: {
              conversationId: conv.id,
              senderId: userId,
              content: parsed.content,
            },
          });

          await tx.conversation.update({
            where: { id: conv.id },
            data: { lastMessageAt: msg.createdAt },
          });

          return { message: msg, conversation: conv };
        });

        const messagePayload = {
          id: message.id,
          conversationId: conversation.id,
          senderId: userId,
          senderName: userName,
          content: message.content,
          createdAt: message.createdAt,
          readAt: null,
        };

        // Emit immediately
        emitToUser(parsed.receiverId, "chat:message", messagePayload);
        socket.emit("chat:message:sent", messagePayload);
        if (callback) callback(messagePayload);

        // Fire-and-forget notification creation
        prisma.notification.create({
          data: {
            recipientId: parsed.receiverId,
            type: "MESSAGE",
            referenceId: conversation.id,
            message: `${userName} sent you a message`,
          },
        }).then((notification) => {
          emitNotification(parsed.receiverId, {
            id: notification.id,
            type: notification.type,
            message: notification.message,
            referenceId: notification.referenceId,
            createdAt: notification.createdAt,
          });
        }).catch((err) => console.error("Notification creation failed:", err));
      } catch (error) {
        if (error instanceof z.ZodError) {
          socket.emit("error", { message: "Invalid message format" });
          return;
        }
        console.error("Error handling chat message:", error);
      }
    });

    // Handle typing indicator
    socket.on("chat:typing", (data: unknown) => {
      try {
        const parsed = ChatTypingSchema.parse(data);
        emitToUser(parsed.receiverId, "chat:typing", { userId, isTyping: parsed.isTyping });
      } catch {
        // Silently ignore invalid typing events
      }
    });

    // Handle read receipts
    socket.on("chat:read", async (data: unknown) => {
      try {
        const parsed = ChatReadSchema.parse(data);

        const updated = await prisma.message.updateMany({
          where: {
            conversationId: parsed.conversationId,
            senderId: { not: userId },
            readAt: null,
          },
          data: { readAt: new Date() },
        });

        if (updated.count > 0) {
          const conversation = await prisma.conversation.findUnique({
            where: { id: parsed.conversationId },
          });
          if (conversation) {
            const otherUserId = conversation.participantAId === userId
              ? conversation.participantBId
              : conversation.participantAId;
            emitToUser(otherUserId, "chat:read", {
              conversationId: parsed.conversationId,
              readBy: userId,
            });
          }
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          socket.emit("error", { message: "Invalid read receipt format" });
          return;
        }
        console.error("Error handling read receipt:", error);
      }
    });

    // Handle disconnect — only notify friends
    socket.on("disconnect", () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          for (const friendId of friendIds) {
            emitToUser(friendId, "user:offline", { userId });
          }
        }
      }
    });
  });

  return io;
}
