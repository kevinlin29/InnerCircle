"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { subDays, subYears } from "date-fns";
import { useSession } from "@/lib/auth-client";
import FilterPanel, {
  type DatePreset,
  type ScopeFilter,
} from "@/components/FilterPanel";
import PostDetailDrawer from "@/components/PostDetailDrawer";
import type { PostItem } from "@/types/api";

const GlobeViewer = dynamic(() => import("@/components/GlobeViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
    </div>
  ),
});

function getCutoffDate(preset: DatePreset): Date | null {
  const now = new Date();
  switch (preset) {
    case "7d":
      return subDays(now, 7);
    case "30d":
      return subDays(now, 30);
    case "90d":
      return subDays(now, 90);
    case "1y":
      return subYears(now, 1);
    case "all":
      return null;
  }
}

export default function FeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [scope, setScope] = useState<ScopeFilter>("all");

  useEffect(() => {
    let cancelled = false;

    async function fetchAllPosts() {
      setLoading(true);
      const allPosts: PostItem[] = [];
      let cursor: string | null = null;

      try {
        do {
          const url: string = cursor
            ? `/api/posts?cursor=${cursor}`
            : "/api/posts";
          const res = await fetch(url);
          if (!res.ok) break;
          const data = await res.json();
          if (cancelled) return;
          allPosts.push(...data.posts);
          cursor = data.nextCursor ?? null;
        } while (cursor);

        if (!cancelled) setPosts(allPosts);
      } catch {
        // Network error -- keep whatever we have
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAllPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    let result = posts;

    const cutoff = getCutoffDate(datePreset);
    if (cutoff) {
      result = result.filter(
        (p) => new Date(p.createdAt) >= cutoff
      );
    }

    if (scope === "mine" && session?.user?.id) {
      result = result.filter((p) => p.authorId === session.user.id);
    }

    return result;
  }, [posts, datePreset, scope, session?.user?.id]);

  const handleSelectPost = useCallback((postId: string) => {
    setSelectedPostId(postId);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedPostId(null);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {loading ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            <p className="text-sm text-muted-foreground">Loading posts...</p>
          </div>
        </div>
      ) : (
        <GlobeViewer posts={filteredPosts} onSelectPost={handleSelectPost} />
      )}

      <FilterPanel
        datePreset={datePreset}
        scope={scope}
        onDatePresetChange={setDatePreset}
        onScopeChange={setScope}
      />

      <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-border/50 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-md md:bottom-4 bottom-20">
        {filteredPosts.filter((p) => p.lat != null && p.lng != null).length}{" "}
        posts on globe
      </div>

      <PostDetailDrawer
        postId={selectedPostId}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
