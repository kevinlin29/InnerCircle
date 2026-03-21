"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ConversationPreview } from "@/types/api";

export default function ChatListPage() {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/messages/conversations");
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations);
        }
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-xl px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Messages</h1>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
            <MessageCircle className="h-10 w-10" />
            <p className="text-sm">No conversations yet.</p>
            <p className="text-xs">Start chatting from a friend's profile!</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {conversations.map((conv) => {
              const initials = conv.otherUser.name
                ? conv.otherUser.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "?";

              return (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.otherUser.id}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent"
                >
                  <Avatar>
                    <AvatarImage src={conv.otherUser.image ?? undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold truncate">
                        {conv.otherUser.name}
                      </span>
                      {conv.lastMessage && (
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {formatDistanceToNow(
                            new Date(conv.lastMessage.createdAt),
                            { addSuffix: true }
                          )}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge className="shrink-0 rounded-full px-2 text-xs">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
