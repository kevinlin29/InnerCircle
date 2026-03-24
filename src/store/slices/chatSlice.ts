import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ConversationPreview, MessageItem } from "@/types/api";

interface ChatState {
  conversations: ConversationPreview[];
  activeMessages: MessageItem[];
  activeConversationId: string | null;
  typingUsers: Record<string, boolean>;
  onlineUsers: Set<string>;
}

const initialState: ChatState = {
  conversations: [],
  activeMessages: [],
  activeConversationId: null,
  typingUsers: {},
  onlineUsers: new Set(),
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConversations(state, action: PayloadAction<ConversationPreview[]>) {
      state.conversations = action.payload;
    },
    setActiveMessages(
      state,
      action: PayloadAction<{ messages: MessageItem[]; conversationId: string | null }>
    ) {
      state.activeMessages = action.payload.messages;
      state.activeConversationId = action.payload.conversationId;
    },
    addMessage(state, action: PayloadAction<MessageItem>) {
      state.activeMessages.push(action.payload);
    },
    setTyping(
      state,
      action: PayloadAction<{ userId: string; isTyping: boolean }>
    ) {
      state.typingUsers[action.payload.userId] = action.payload.isTyping;
    },
    setUserOnline(state, action: PayloadAction<string>) {
      state.onlineUsers = new Set(state.onlineUsers).add(action.payload);
    },
    setUserOffline(state, action: PayloadAction<string>) {
      const next = new Set(state.onlineUsers);
      next.delete(action.payload);
      state.onlineUsers = next;
    },
  },
});

export const {
  setConversations,
  setActiveMessages,
  addMessage,
  setTyping,
  setUserOnline,
  setUserOffline,
} = chatSlice.actions;
export default chatSlice.reducer;
