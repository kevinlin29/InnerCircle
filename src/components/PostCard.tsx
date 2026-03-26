"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, MapPin, Send, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useSession } from "@/lib/auth-client";
import { useToast } from "@/components/ui/toast";
import ImageLightbox from "@/components/ImageLightbox";
import type { PostItem, CommentItem } from "@/types/api";

interface PostCardProps {
  post: PostItem;
  onLikeToggle?: (postId: string, liked: boolean) => void;
  onDeleted?: (postId: string) => void;
}

export default function PostCard({ post, onLikeToggle, onDeleted }: PostCardProps) {
  const { data: session } = useSession();
  const { success, error: showError } = useToast();
  const [liked, setLiked] = useState(post.isLiked);
  const [deleting, setDeleting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const isMine = session?.user?.id === post.authorId;
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const initials = post.author.name
    ? post.author.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success("Post deleted");
      onDeleted?.(post.id);
    } catch {
      showError("Failed to delete post");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleLike() {
    const prev = liked;
    setLiked(!prev);
    setLikeCount((c) => c + (prev ? -1 : 1));

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLiked(data.liked);
      onLikeToggle?.(post.id, data.liked);
    } catch {
      setLiked(prev);
      setLikeCount((c) => c + (prev ? 1 : -1));
    }
  }

  async function loadComments() {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setShowComments(true);
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments(data.comments);
    } catch {
      // keep empty
    } finally {
      setLoadingComments(false);
    }
  }

  async function submitComment() {
    const content = commentText.trim();
    if (!content || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      setCommentCount((c) => c + 1);
      setCommentText("");
    } catch {
      // ignore
    } finally {
      setSubmittingComment(false);
    }
  }

  return (
    <article className="rounded-xl border border-border bg-card text-card-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href={`/profile/${post.authorId}`}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author.image ?? undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex flex-col min-w-0">
          <Link
            href={`/profile/${post.authorId}`}
            className="text-sm font-semibold hover:underline truncate"
          >
            {post.author.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {post.lat != null && post.lng != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {post.lat.toFixed(1)}, {post.lng.toFixed(1)}
            </span>
          )}
          {isMine && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete post?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your post
                    and all its comments and likes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Text */}
      {post.textContent && (
        <p className="px-4 pb-2 text-sm leading-relaxed">{post.textContent}</p>
      )}

      {/* Images */}
      {post.images.length > 0 && (
        <div className="flex gap-1 overflow-x-auto px-4 pb-3">
          {post.images.map((img, i) => (
            <img
              key={img.id}
              src={img.imageUrl}
              alt=""
              className="h-64 w-auto max-w-full flex-shrink-0 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
            />
          ))}
        </div>
      )}

      <ImageLightbox
        images={post.images}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      <Separator />

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLike}
          className="gap-1.5"
        >
          <Heart
            className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`}
          />
          <span className="text-xs">{likeCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadComments}
          className="gap-1.5"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs">{commentCount}</span>
        </Button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-border px-4 py-3">
          {loadingComments ? (
            <div className="flex justify-center py-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="h-6 w-6 shrink-0" size="sm">
                    <AvatarImage src={c.author.image ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {c.author.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold">{c.author.name}</span>
                    <span className="text-sm text-foreground/90">{c.content}</span>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No comments yet. Be the first!
                </p>
              )}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              className="h-8 text-sm"
            />
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={submitComment}
              disabled={!commentText.trim() || submittingComment}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
