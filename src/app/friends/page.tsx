"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, UserPlus, UserMinus, Check, X } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import {
  sendFriendRequestAction,
  respondFriendRequestAction,
  removeFriendAction,
} from "@/app/actions/friends";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { UserPreview, PendingRequest } from "@/types/api";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function FriendsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [friends, setFriends] = useState<UserPreview[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserPreview[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Load friends and pending requests
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [friendsRes, pendingRes] = await Promise.all([
          fetch("/api/friends").then((r) => r.json()),
          fetch("/api/friends/pending").then((r) => r.json()),
        ]);
        setFriends(friendsRes.friends ?? []);
        setPending(pendingRes.requests ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await res.json();
      const results = (data.users ?? []).filter(
        (u: UserPreview) => u.id !== session?.user?.id
      );
      setSearchResults(results);
      if (results.length === 0) setMessage("No users found.");
    } catch {
      setMessage("Search failed.");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, session?.user?.id]);

  const handleSendRequest = useCallback(
    async (userId: string) => {
      setActionLoading(userId);
      setMessage(null);
      const result = await sendFriendRequestAction(userId);
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage("Friend request sent!");
        setSearchResults((prev) => prev.filter((u) => u.id !== userId));
      }
      setActionLoading(null);
    },
    []
  );

  const handleRespond = useCallback(
    async (friendshipId: string, action: "accept" | "decline") => {
      setActionLoading(friendshipId);
      const result = await respondFriendRequestAction(friendshipId, action);
      if (result.error) {
        setMessage(result.error);
      } else {
        setPending((prev) => prev.filter((p) => p.id !== friendshipId));
        if (action === "accept") {
          // Reload friends list
          const res = await fetch("/api/friends").then((r) => r.json());
          setFriends(res.friends ?? []);
          setMessage("Friend request accepted!");
        } else {
          setMessage("Friend request declined.");
        }
      }
      setActionLoading(null);
    },
    []
  );

  const handleRemoveFriend = useCallback(async (friendId: string) => {
    setActionLoading(friendId);
    const result = await removeFriendAction(friendId);
    if (result.error) {
      setMessage(result.error);
    } else {
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
      setMessage("Friend removed.");
    }
    setActionLoading(null);
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background px-4 py-6 sm:px-6 lg:max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/feed")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold sm:text-2xl">Friends</h1>
      </div>

      {message && (
        <p className="mb-4 rounded-md bg-muted px-3 py-2 text-sm">{message}</p>
      )}

      {/* Search users */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Find People</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={searching || !searchQuery.trim()}>
              <Search className="mr-1.5 h-4 w-4" />
              {searching ? "..." : "Search"}
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {searchResults.map((user) => {
                const isFriend = friends.some((f) => f.id === user.id);
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.image ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                      </div>
                    </div>
                    {isFriend ? (
                      <span className="text-xs text-muted-foreground">Already friends</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleSendRequest(user.id)}
                        disabled={actionLoading === user.id}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Add
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending requests */}
      {pending.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Pending Requests ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pending.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={req.requester.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(req.requester.name)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium">{req.requester.name}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="icon-xs"
                    variant="outline"
                    onClick={() => handleRespond(req.id, "accept")}
                    disabled={actionLoading === req.id}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => handleRespond(req.id, "decline")}
                    disabled={actionLoading === req.id}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator className="mb-6" />

      {/* Friends list */}
      <div>
        <h2 className="mb-3 text-base font-semibold">
          My Friends {!loading && `(${friends.length})`}
        </h2>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          </div>
        )}

        {!loading && friends.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No friends yet. Search for people above to add them!
          </p>
        )}

        <div className="flex flex-col gap-2">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={friend.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(friend.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{friend.name}</p>
                  {friend.bio && (
                    <p className="text-xs text-muted-foreground">{friend.bio}</p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveFriend(friend.id)}
                disabled={actionLoading === friend.id}
              >
                <UserMinus className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
