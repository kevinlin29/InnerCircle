"use client";

import {
  use,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { connectSocket, getSocket, disconnectSocket } from "@/lib/socket-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MessageItem, SocketChatMessage, SocketTypingEvent } from "@/types/api";

interface OtherUser {
  id: string;
  name: string;
  image: string | null;
}

export default function ChatThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: otherUserId } = use(params);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load user info and message history
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [userRes, msgRes] = await Promise.all([
          fetch(`/api/users/${otherUserId}`),
          fetch(`/api/messages/${otherUserId}`),
        ]);

        if (userRes.ok) {
          const data = await userRes.json();
          setOtherUser({
            id: data.user.id,
            name: data.user.name,
            image: data.user.image,
          });
        }

        if (msgRes.ok) {
          const data = await msgRes.json();
          setMessages(data.messages);
          setConversationId(data.conversationId);
        }
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [otherUserId]);

  // Connect socket and listen for messages
  useEffect(() => {
    let mounted = true;

    async function setup() {
      try {
        const socket = await connectSocket();
        if (!mounted) return;
        setSocketReady(true);

        socket.on("chat:message", (msg: SocketChatMessage) => {
          if (msg.senderId === otherUserId) {
            setMessages((prev) => [
              ...prev,
              {
                id: msg.id,
                conversationId: msg.conversationId,
                senderId: msg.senderId,
                content: msg.content,
                readAt: null,
                createdAt: msg.createdAt,
              },
            ]);
            setConversationId(msg.conversationId);
            scrollToBottom();

            // Mark as read
            socket.emit("chat:read", { conversationId: msg.conversationId });
          }
        });

        socket.on("chat:message:sent", (msg: SocketChatMessage) => {
          if (msg.conversationId) {
            setConversationId(msg.conversationId);
          }
        });

        socket.on("chat:typing", (data: SocketTypingEvent) => {
          if (data.userId === otherUserId) {
            setIsTyping(data.isTyping);
          }
        });

        // Mark existing messages as read
        if (conversationId) {
          socket.emit("chat:read", { conversationId });
        }
      } catch {
        // Socket connection failed -- chat will work without real-time
      }
    }

    setup();

    return () => {
      mounted = false;
      const socket = getSocket();
      if (socket) {
        socket.off("chat:message");
        socket.off("chat:message:sent");
        socket.off("chat:typing");
      }
    };
  }, [otherUserId, conversationId, scrollToBottom]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  function handleTyping() {
    const socket = getSocket();
    if (!socket) return;

    socket.emit("chat:typing", { receiverId: otherUserId, isTyping: true });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("chat:typing", { receiverId: otherUserId, isTyping: false });
    }, 2000);
  }

  async function sendMessage() {
    const content = text.trim();
    if (!content || sending || !currentUserId) return;

    setSending(true);
    setText("");

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("chat:typing", { receiverId: otherUserId, isTyping: false });
      socket.emit(
        "chat:message",
        { receiverId: otherUserId, content },
        (msg: SocketChatMessage) => {
          setMessages((prev) => [
            ...prev,
            {
              id: msg.id,
              conversationId: msg.conversationId,
              senderId: currentUserId,
              content: msg.content,
              readAt: null,
              createdAt: msg.createdAt,
            },
          ]);
          setSending(false);
          scrollToBottom();
        }
      );

      // Fallback timeout in case callback doesn't fire
      setTimeout(() => setSending(false), 5000);
    } else {
      setSending(false);
    }
  }

  const initials = otherUser?.name
    ? otherUser.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href="/chat">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Link href={`/profile/${otherUserId}`} className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={otherUser?.image ?? undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{otherUser?.name ?? "User"}</p>
            {isTyping && (
              <p className="text-xs text-muted-foreground animate-pulse">
                typing...
              </p>
            )}
          </div>
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-xl flex-col gap-2">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No messages yet. Say hello!
            </p>
          )}
          {messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {formatDistanceToNow(new Date(msg.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <div className="mx-auto flex max-w-xl gap-2">
          <Input
            placeholder={socketReady ? "Type a message..." : "Connecting..."}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={!socketReady}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!text.trim() || sending || !socketReady}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
