"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  UserPlus,
  UserMinus,
  Check,
  X,
  Loader2,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { useOnlineStatus } from "@/components/OnlineStatusProvider";
import type { UserPreview, PendingRequest } from "@/types/api";

function UserInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<UserPreview[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserPreview[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendCap, setFriendCap] = useState(25);
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsRes, pendingRes, meRes] = await Promise.all([
        fetch("/api/friends"),
        fetch("/api/friends/pending"),
        fetch("/api/users/me"),
      ]);
      if (friendsRes.ok) {
        const data = await friendsRes.json();
        setFriends(data.friends);
      }
      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPending(data.requests);
      }
      if (meRes.ok) {
        const data = await meRes.json();
        setFriendCap(data.user.friendCapLimit);
      }
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users);
        }
      } catch {
        // error
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function respondToRequest(friendshipId: string, action: "accept" | "decline") {
    setRespondingIds((prev) => new Set(prev).add(friendshipId));
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });
      if (res.ok) {
        setPending((prev) => prev.filter((r) => r.id !== friendshipId));
        if (action === "accept") {
          loadData();
        }
      }
    } catch {
      // error
    } finally {
      setRespondingIds((prev) => {
        const next = new Set(prev);
        next.delete(friendshipId);
        return next;
      });
    }
  }

  async function sendRequest(addresseeId: string) {
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId }),
      });
      if (res.ok) {
        setSearchResults((prev) => prev.filter((u) => u.id !== addresseeId));
      }
    } catch {
      // error
    }
  }

  async function removeFriend(friendId: string) {
    try {
      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
      if (res.ok) {
        setFriends((prev) => prev.filter((f) => f.id !== friendId));
      }
    } catch {
      // error
    }
  }

  const { isOnline } = useOnlineStatus();
  const friendIds = new Set(friends.map((f) => f.id));

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-xl px-4 py-6 pb-20 md:pb-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Friends</h1>
          <Badge variant="secondary" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {friends.length} / {friendCap}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Search results */}
        {searchQuery.length >= 2 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              Search Results
            </h2>
            {searching ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="flex flex-col gap-2">
                {searchResults.map((user) => (
                  <Card
                    key={user.id}
                    className="flex items-center gap-3 p-3"
                  >
                    <Link href={`/profile/${user.id}`}>
                      <Avatar>
                        <AvatarImage src={user.image ?? undefined} />
                        <AvatarFallback>
                          {UserInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/profile/${user.id}`}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {user.name}
                      </Link>
                      {user.bio && (
                        <p className="text-xs text-muted-foreground truncate">
                          {user.bio}
                        </p>
                      )}
                    </div>
                    {friendIds.has(user.id) ? (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Friends
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendRequest(user.id)}
                        className="gap-1 shrink-0"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Add
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">
                No users found.
              </p>
            )}
            <Separator className="mt-4" />
          </div>
        )}

        {/* Pending requests */}
        {pending.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              Pending Requests ({pending.length})
            </h2>
            <div className="flex flex-col gap-2">
              {pending.map((req) => (
                <Card
                  key={req.id}
                  className="flex items-center gap-3 p-3"
                >
                  <Link href={`/profile/${req.requesterId}`}>
                    <Avatar>
                      <AvatarImage src={req.requester.image ?? undefined} />
                      <AvatarFallback>
                        {UserInitials(req.requester.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${req.requesterId}`}
                      className="text-sm font-medium hover:underline truncate block"
                    >
                      {req.requester.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Wants to be friends
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon-sm"
                      variant="default"
                      onClick={() => respondToRequest(req.id, "accept")}
                      disabled={respondingIds.has(req.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => respondToRequest(req.id, "decline")}
                      disabled={respondingIds.has(req.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            <Separator className="mt-4" />
          </div>
        )}

        {/* Friends list */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Your Friends
          </h2>
          {friends.length > 0 ? (
            <div className="flex flex-col gap-2">
              {friends.map((friend) => (
                <Card
                  key={friend.id}
                  className="flex items-center gap-3 p-3"
                >
                  <Link href={`/profile/${friend.id}`} className="relative">
                    <Avatar>
                      <AvatarImage src={friend.image ?? undefined} />
                      <AvatarFallback>
                        {UserInitials(friend.name)}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline(friend.id) && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${friend.id}`}
                      className="text-sm font-medium hover:underline truncate block"
                    >
                      {friend.name}
                    </Link>
                    {friend.bio ? (
                      <p className="text-xs text-muted-foreground truncate">
                        {friend.bio}
                      </p>
                    ) : isOnline(friend.id) ? (
                      <p className="text-xs text-emerald-500">Online</p>
                    ) : null}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/chat/${friend.id}`}>Message</Link>
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeFriend(friend.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Users className="h-10 w-10" />
              <p className="text-sm">
                No friends yet. Search for people to add!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
