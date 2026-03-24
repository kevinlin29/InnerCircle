"use client";

import { useEffect, useState, useRef } from "react";
import { Camera, Loader2, UserPlus, UserCheck, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PostCard from "@/components/PostCard";
import { cropAvatar } from "@/lib/client-image";
import type { UserProfile, PostItem } from "@/types/api";

interface ProfileViewProps {
  userId?: string;
}

export default function ProfileView({ userId }: ProfileViewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const url = userId ? `/api/users/${userId}` : "/api/users/me";
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();

        if (userId) {
          setProfile(data.user);
          setPosts(data.posts ?? []);
        } else {
          setProfile({
            ...data.user,
            isSelf: true,
            isFriend: false,
            friendshipStatus: null,
          });
          const postsRes = await fetch(`/api/users/${data.user.id}`);
          if (postsRes.ok) {
            const postsData = await postsRes.json();
            setPosts(postsData.posts ?? []);
          }
        }
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  function startEditing() {
    if (!profile) return;
    setEditName(profile.name || "");
    setEditBio(profile.bio || "");
    setEditing(true);
  }

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, bio: editBio }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile((prev) =>
        prev ? { ...prev, name: data.user.name, bio: data.user.bio } : prev
      );
      setEditing(false);
    } catch {
      // error
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(rawFile: File) {
    if (!rawFile.type.startsWith("image/")) return;
    setUploadingAvatar(true);
    try {
      const file = await cropAvatar(rawFile);
      const form = new FormData();
      form.append("file", file);
      form.append("type", "avatar");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      if (!uploadRes.ok) throw new Error();
      const { url } = await uploadRes.json();

      const patchRes = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: url }),
      });
      if (!patchRes.ok) throw new Error();

      setProfile((prev) => (prev ? { ...prev, image: url } : prev));
    } catch {
      // error
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function sendFriendRequest() {
    if (!profile) return;
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: profile.id }),
      });
      if (!res.ok) throw new Error();
      setProfile((prev) =>
        prev ? { ...prev, friendshipStatus: "PENDING" } : prev
      );
    } catch {
      // error
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        User not found
      </div>
    );
  }

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-xl px-4 py-6 pb-20 md:pb-6">
        {/* Profile header */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <Avatar className="h-20 w-20 text-lg" size="lg">
              <AvatarImage src={profile.image ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {profile.isSelf && (
              <>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarUpload(f);
                  }}
                />
              </>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center gap-2 sm:items-start">
            {editing ? (
              <div className="flex w-full flex-col gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Display name"
                  className="h-8"
                />
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Bio"
                  rows={2}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveProfile} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold">{profile.name}</h1>
                {profile.bio && (
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                )}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Badge variant="secondary">
                    {profile.friendCount} / {profile.friendCapLimit} friends
                  </Badge>
                </div>
                {profile.isSelf && (
                  <Button size="sm" variant="outline" onClick={startEditing}>
                    Edit Profile
                  </Button>
                )}
                {!profile.isSelf && !profile.isFriend && !profile.friendshipStatus && (
                  <Button size="sm" onClick={sendFriendRequest} className="gap-1.5">
                    <UserPlus className="h-4 w-4" />
                    Add Friend
                  </Button>
                )}
                {!profile.isSelf && profile.friendshipStatus === "PENDING" && (
                  <Button size="sm" variant="secondary" disabled className="gap-1.5">
                    <Clock className="h-4 w-4" />
                    Request Sent
                  </Button>
                )}
                {!profile.isSelf && profile.isFriend && (
                  <Badge variant="secondary" className="gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" />
                    Friends
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Posts */}
        {(profile.isSelf || profile.isFriend) ? (
          posts.length > 0 ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Posts</h2>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No posts yet.
            </p>
          )
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Add as a friend to see their posts.
          </p>
        )}
      </div>
    </div>
  );
}
