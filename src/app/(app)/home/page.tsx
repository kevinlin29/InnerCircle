"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import PostCard from "@/components/PostCard";
import type { PostItem } from "@/types/api";

export default function HomeFeedPage() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(
    async (nextCursor?: string | null) => {
      const isInitial = !nextCursor;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      try {
        const url = nextCursor
          ? `/api/posts?cursor=${nextCursor}`
          : "/api/posts";
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();

        setPosts((prev) =>
          isInitial ? data.posts : [...prev, ...data.posts]
        );
        setCursor(data.nextCursor ?? null);
        setHasMore(!!data.nextCursor);
      } catch {
        // network error
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor) {
          fetchPosts(cursor);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, cursor, fetchPosts]);

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
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Feed</h1>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
            <p className="text-lg font-medium">No posts yet</p>
            <p className="text-sm">
              Add some friends and create your first post!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {loadingMore && (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
