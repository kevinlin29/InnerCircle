"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, Search, X } from "lucide-react";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import ScrollToTop from "@/components/ScrollToTop";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PostItem } from "@/types/api";

export default function HomeFeedPage() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
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
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-xl px-4 py-6 pb-20 md:pb-6">
          <h1 className="mb-6 text-2xl font-bold tracking-tight">Feed</h1>
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="mx-auto max-w-xl px-4 py-6 pb-20 md:pb-6">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Feed</h1>
          <div className="flex-1" />
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-8 text-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
            <p className="text-lg font-medium">No posts yet</p>
            <p className="text-sm">
              Add some friends and create your first post!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {(() => {
              const query = searchQuery.toLowerCase().trim();
              const filtered = query
                ? posts.filter(
                    (p) =>
                      p.textContent?.toLowerCase().includes(query) ||
                      p.author.name.toLowerCase().includes(query)
                  )
                : posts;
              if (filtered.length === 0 && query) {
                return (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No posts matching &ldquo;{searchQuery}&rdquo;
                  </p>
                );
              }
              return filtered.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                />
              ));
            })()}

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
      <ScrollToTop containerRef={scrollRef} />
    </div>
  );
}
