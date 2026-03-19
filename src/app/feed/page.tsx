"use client";

import { useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { subDays, subYears } from "date-fns";
import { LogOut, Plus, Users } from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchPosts,
  addPost,
  selectPost,
  setDatePreset,
  setScope,
  type DatePreset,
} from "@/store/postsSlice";
import { Button } from "@/components/ui/button";
import FilterPanel from "@/components/FilterPanel";
import PostDetailDrawer from "@/components/PostDetailDrawer";
import CreatePostDrawer from "@/components/CreatePostDrawer";
import NotificationToast from "@/components/NotificationToast";
import { useSocket } from "@/hooks/useSocket";
import type { PostItem } from "@/types/api";
import { useState } from "react";

const GlobeViewer = dynamic(() => import("@/components/GlobeViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
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
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: session } = useSession();
  const { items: posts, loading, selectedPostId, datePreset, scope } =
    useAppSelector((s) => s.posts);
  const [createOpen, setCreateOpen] = useState(false);

  // Real-time notifications via Socket.io
  useSocket({
    onNotification: (notification) => {
      const addToast = (window as unknown as Record<string, unknown>)
        .__addToast as ((n: unknown) => void) | undefined;
      addToast?.(notification);
    },
  });

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  const filteredPosts = useMemo(() => {
    let result = posts;

    const cutoff = getCutoffDate(datePreset);
    if (cutoff) {
      result = result.filter((p) => new Date(p.createdAt) >= cutoff);
    }

    if (scope === "mine" && session?.user?.id) {
      result = result.filter((p) => p.authorId === session.user.id);
    }

    return result;
  }, [posts, datePreset, scope, session?.user?.id]);

  const handleSelectPost = useCallback(
    (postId: string) => {
      dispatch(selectPost(postId));
    },
    [dispatch]
  );

  const handleCloseDrawer = useCallback(() => {
    dispatch(selectPost(null));
  }, [dispatch]);

  const handlePostCreated = useCallback(
    (newPost: PostItem) => {
      dispatch(addPost(newPost));
    },
    [dispatch]
  );

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
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
        onDatePresetChange={(v) => dispatch(setDatePreset(v))}
        onScopeChange={(v) => dispatch(setScope(v))}
      />

      {/* User info + sign out + friends link */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-2 rounded-xl border border-border/50 bg-background/80 px-2 py-1.5 backdrop-blur-md sm:right-4 sm:top-4 sm:px-3 sm:py-2">
        {session?.user && (
          <span className="hidden text-sm font-medium sm:inline">
            {session.user.name || session.user.email}
          </span>
        )}
        <Button variant="ghost" size="icon-xs" asChild>
          <a href="/friends">
            <Users className="h-4 w-4" />
          </a>
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* FAB — Create Post */}
      <Button
        className="absolute bottom-4 right-4 z-10 h-12 w-12 rounded-full shadow-lg sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
        size="icon-lg"
        onClick={() => setCreateOpen(true)}
      >
        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>

      {/* Post count indicator */}
      <div className="absolute bottom-4 left-2 z-10 rounded-lg border border-border/50 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-md sm:left-4 sm:px-3 sm:py-1.5 sm:text-xs">
        {filteredPosts.filter((p) => p.lat != null && p.lng != null).length}{" "}
        posts on globe
      </div>

      <PostDetailDrawer
        postId={selectedPostId}
        onClose={handleCloseDrawer}
      />

      <CreatePostDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onPostCreated={handlePostCreated}
      />

      <NotificationToast />
    </div>
  );
}
