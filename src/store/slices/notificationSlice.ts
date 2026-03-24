import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { NotificationItem } from "@/types/api";

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications(
      state,
      action: PayloadAction<{ items: NotificationItem[]; unreadCount: number }>
    ) {
      state.items = action.payload.items;
      state.unreadCount = action.payload.unreadCount;
    },
    addNotification(state, action: PayloadAction<NotificationItem>) {
      state.items.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    markAllRead(state) {
      state.items = state.items.map((n) => ({ ...n, read: true }));
      state.unreadCount = 0;
    },
  },
});

export const { setNotifications, addNotification, markAllRead } =
  notificationSlice.actions;
export default notificationSlice.reducer;
