"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, MapPin, Send } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { PostItem, CommentItem } from "@/types/api";

interface PostDetailDrawerProps {
  postId: string | null;
  onClose: () => void;
}

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function PostDetailDrawer({
  postId,
  onClose,
}: PostDetailDrawerProps) {
  const [post, setPost] = useState<PostItem | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!postId) {
      setPost(null);
      setComments([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch(`/api/posts/${postId}`).then((r) => r.json()),
      fetch(`/api/posts/${postId}/comments`).then((r) => r.json()),
    ])
      .then(([postData, commentsData]) => {
        if (cancelled) return;
        setPost(postData.post ?? null);
        setComments(commentsData.comments ?? []);
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

  const handleLike = useCallback(async () => {
    if (!post || liking) return;
    setLiking(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPost((prev) =>
          prev
            ? {
                ...prev,
                isLiked: data.liked,
                likeCount: prev.likeCount + (data.liked ? 1 : -1),
              }
            : null
        );
      }
    } finally {
      setLiking(false);
    }
  }, [post, liking]);

  const handleComment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!post || !commentText.trim() || submitting) return;
      setSubmitting(true);
      try {
        const res = await fetch(`/api/posts/${post.id}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: commentText.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          setComments((prev) => [...prev, data.comment]);
          setPost((prev) =>
            prev ? { ...prev, commentCount: prev.commentCount + 1 } : null
          );
          setCommentText("");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [post, commentText, submitting]
  );

  return (
    <Sheet open={!!postId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex flex-col overflow-hidden sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Post Detail</SheetTitle>
          <SheetDescription className="sr-only">
            Detailed view of a post
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          </div>
        )}

        {!loading && post && (
          <>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {/* Author */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.author.image ?? undefined} />
                  <AvatarFallback>{getInitials(post.author.name)}</AvatarFallback>
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
                <div className="mt-4 flex gap-2 overflow-x-auto rounded-lg">
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
                <p className="mt-4 text-sm leading-relaxed">{post.textContent}</p>
              )}

              {/* Location badge */}
              {post.lat != null && post.lng != null && (
                <Badge variant="secondary" className="mt-3 w-fit gap-1 text-xs">
                  <MapPin className="h-3 w-3" />
                  {post.lat.toFixed(2)}, {post.lng.toFixed(2)}
                </Badge>
              )}

              <Separator className="my-4" />

              {/* Interactive stats */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleLike}
                  disabled={liking}
                >
                  <Heart
                    className={`h-4 w-4 ${post.isLiked ? "fill-red-500 text-red-500" : ""}`}
                  />
                  <span className="text-sm">{post.likeCount}</span>
                </Button>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  {post.commentCount}
                </span>
              </div>

              <Separator className="my-4" />

              {/* Comments list */}
              <div className="flex flex-col gap-3">
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No comments yet. Be the first!
                  </p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarImage src={c.author.image ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(c.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium">{c.author.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comment input */}
            <form
              onSubmit={handleComment}
              className="flex items-center gap-2 border-t border-border px-4 py-3"
            >
              <Input
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 text-sm"
                disabled={submitting}
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={!commentText.trim() || submitting}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}

        {!loading && !post && postId && (
          <p className="px-4 text-sm text-muted-foreground">Post not found.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
