import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PostItem } from "@/types/api";

interface FeedState {
  posts: PostItem[];
  loading: boolean;
  cursor: string | null;
  hasMore: boolean;
}

const initialState: FeedState = {
  posts: [],
  loading: false,
  cursor: null,
  hasMore: true,
};

const feedSlice = createSlice({
  name: "feed",
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setPosts(state, action: PayloadAction<PostItem[]>) {
      state.posts = action.payload;
    },
    appendPosts(
      state,
      action: PayloadAction<{ posts: PostItem[]; nextCursor: string | null }>
    ) {
      state.posts.push(...action.payload.posts);
      state.cursor = action.payload.nextCursor;
      state.hasMore = !!action.payload.nextCursor;
    },
    prependPost(state, action: PayloadAction<PostItem>) {
      state.posts.unshift(action.payload);
    },
    toggleLike(
      state,
      action: PayloadAction<{ postId: string; liked: boolean }>
    ) {
      const post = state.posts.find((p) => p.id === action.payload.postId);
      if (post) {
        post.isLiked = action.payload.liked;
        post.likeCount += action.payload.liked ? 1 : -1;
      }
    },
    incrementCommentCount(state, action: PayloadAction<string>) {
      const post = state.posts.find((p) => p.id === action.payload);
      if (post) post.commentCount += 1;
    },
  },
});

export const {
  setLoading,
  setPosts,
  appendPosts,
  prependPost,
  toggleLike,
  incrementCommentCount,
} = feedSlice.actions;
export default feedSlice.reducer;
