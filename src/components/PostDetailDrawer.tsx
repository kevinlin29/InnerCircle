"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { PostItem } from "@/types/api";

interface PostDetailDrawerProps {
  postId: string | null;
  onClose: () => void;
}

export default function PostDetailDrawer({
  postId,
  onClose,
}: PostDetailDrawerProps) {
  const [post, setPost] = useState<PostItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postId) {
      setPost(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/posts/${postId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setPost(data.post ?? null);
      })
      .catch(() => {
        if (!cancelled) setPost(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const initials = post?.author.name
    ? post.author.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <Sheet open={!!postId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Post Detail</SheetTitle>
          <SheetDescription className="sr-only">
            Detailed view of a post
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          </div>
        )}

        {!loading && post && (
          <div className="flex flex-col gap-4 px-4 pb-6">
            {/* Author */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author.image ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{post.author.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>

            {/* Images */}
            {post.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto rounded-lg">
                {post.images.map((img) => (
                  <img
                    key={img.id}
                    src={img.imageUrl}
                    alt=""
                    className="h-56 w-auto flex-shrink-0 rounded-lg object-cover"
                  />
                ))}
              </div>
            )}

            {/* Text */}
            {post.textContent && (
              <p className="text-sm leading-relaxed">{post.textContent}</p>
            )}

            {/* Location badge */}
            {post.lat != null && post.lng != null && (
              <Badge variant="secondary" className="w-fit text-xs">
                {post.lat.toFixed(2)}, {post.lng.toFixed(2)}
              </Badge>
            )}

            <Separator />

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Heart
                  className={`h-4 w-4 ${post.isLiked ? "fill-red-500 text-red-500" : ""}`}
                />
                {post.likeCount}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                {post.commentCount}
              </span>
            </div>
          </div>
        )}

        {!loading && !post && postId && (
          <p className="px-4 text-sm text-muted-foreground">
            Post not found.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
