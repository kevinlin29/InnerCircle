import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import type { PostItem } from "@/types/api";

export type DatePreset = "7d" | "30d" | "90d" | "1y" | "all";
export type ScopeFilter = "all" | "mine";

interface PostsState {
  items: PostItem[];
  loading: boolean;
  error: string | null;
  selectedPostId: string | null;
  datePreset: DatePreset;
  scope: ScopeFilter;
}

const initialState: PostsState = {
  items: [],
  loading: true,
  error: null,
  selectedPostId: null,
  datePreset: "all",
  scope: "all",
};

export const fetchPosts = createAsyncThunk("posts/fetchAll", async () => {
  const allPosts: PostItem[] = [];
  let cursor: string | null = null;

  do {
    const url = cursor ? `/api/posts?cursor=${cursor}` : "/api/posts";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch posts");
    const data = await res.json();
    allPosts.push(...data.posts);
    cursor = data.nextCursor ?? null;
  } while (cursor);

  return allPosts;
});

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    addPost(state, action: PayloadAction<PostItem>) {
      state.items.unshift(action.payload);
    },
    selectPost(state, action: PayloadAction<string | null>) {
      state.selectedPostId = action.payload;
    },
    setDatePreset(state, action: PayloadAction<DatePreset>) {
      state.datePreset = action.payload;
    },
    setScope(state, action: PayloadAction<ScopeFilter>) {
      state.scope = action.payload;
    },
    updatePostLike(
      state,
      action: PayloadAction<{ postId: string; liked: boolean }>
    ) {
      const post = state.items.find((p) => p.id === action.payload.postId);
      if (post) {
        post.isLiked = action.payload.liked;
        post.likeCount += action.payload.liked ? 1 : -1;
      }
    },
    incrementCommentCount(state, action: PayloadAction<string>) {
      const post = state.items.find((p) => p.id === action.payload);
      if (post) post.commentCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch posts";
      });
  },
});

export const {
  addPost,
  selectPost,
  setDatePreset,
  setScope,
  updatePostLike,
  incrementCommentCount,
} = postsSlice.actions;
export default postsSlice.reducer;
