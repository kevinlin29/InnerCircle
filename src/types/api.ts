// ============ Common ============

export interface PaginatedResponse<T> {
  nextCursor: string | null;
}

// ============ User ============

export interface UserPreview {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
}

export interface UserProfile extends UserPreview {
  friendCount: number;
  friendCapLimit: number;
  isFriend: boolean;
  isSelf: boolean;
  friendshipStatus: string | null;
  createdAt: string;
}

export interface MeResponse {
  user: UserPreview & {
    email: string;
    friendCount: number;
    friendCapLimit: number;
    createdAt: string;
  };
}

export interface UserProfileResponse {
  user: UserProfile;
  posts?: PostItem[];
}

// ============ Friends ============

export interface FriendListResponse {
  friends: UserPreview[];
}

export interface FriendRequestBody {
  addresseeId: string;
}

export interface FriendRespondBody {
  friendshipId: string;
  action: "accept" | "decline";
}

export interface FriendRemoveBody {
  friendId: string;
}

export interface PendingRequest {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "PENDING";
  createdAt: string;
  requester: UserPreview;
}

export interface PendingRequestsResponse {
  requests: PendingRequest[];
}

export interface UserSearchResponse {
  users: UserPreview[];
}

// ============ Posts ============

export interface PostImage {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  orderIndex: number;
}

export interface PostItem {
  id: string;
  authorId: string;
  author: { id: string; name: string; image: string | null };
  textContent: string | null;
  lat: number | null;
  lng: number | null;
  images: PostImage[];
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export interface FeedResponse extends PaginatedResponse<PostItem> {
  posts: PostItem[];
}

export interface CreatePostBody {
  textContent?: string;
  lat?: number;
  lng?: number;
  imageUrls?: { url: string; thumbnail: string }[];
}

export interface SinglePostResponse {
  post: PostItem;
}

export interface LikeResponse {
  liked: boolean;
}

// ============ Comments ============

export interface CommentItem {
  id: string;
  postId: string;
  authorId: string;
  author: { id: string; name: string; image: string | null };
  content: string;
  createdAt: string;
}

export interface CommentsResponse extends PaginatedResponse<CommentItem> {
  comments: CommentItem[];
}

export interface CreateCommentBody {
  content: string;
}

// ============ Messages ============

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: { id: string; name: string; image: string | null };
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationPreview {
  id: string;
  otherUser: UserPreview;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    readAt: string | null;
  } | null;
  unreadCount: number;
  lastMessageAt: string;
}

export interface ConversationsResponse {
  conversations: ConversationPreview[];
}

export interface MessageHistoryResponse extends PaginatedResponse<MessageItem> {
  messages: MessageItem[];
  conversationId: string | null;
}

// ============ Notifications ============

export type NotificationType =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPT"
  | "NEW_POST"
  | "LIKE"
  | "COMMENT"
  | "MESSAGE";

export interface NotificationItem {
  id: string;
  recipientId: string;
  type: NotificationType;
  referenceId: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse extends PaginatedResponse<NotificationItem> {
  notifications: NotificationItem[];
  unreadCount: number;
}

export interface MarkNotificationsBody {
  notificationIds?: string[];
  markAll?: boolean;
}

// ============ Upload ============

export interface UploadResponse {
  url: string;
  thumbnailUrl?: string;
}

// ============ Socket.io Events ============

export interface SocketChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  readAt: null;
}

export interface SocketTypingEvent {
  userId: string;
  isTyping: boolean;
}

export interface SocketReadEvent {
  conversationId: string;
  readBy: string;
}

export interface SocketUserStatusEvent {
  userId: string;
}
