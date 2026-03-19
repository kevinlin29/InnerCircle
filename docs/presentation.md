---
marp: true
theme: default
paginate: true
backgroundColor: #ffffff
style: |
  section {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    padding: 40px 60px;
  }
  section.lead {
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  section.lead h1 {
    font-size: 2.8em;
    color: #1a1a2e;
    margin-bottom: 10px;
  }
  section.lead h2 {
    font-size: 1.4em;
    color: #6366f1;
    font-weight: 400;
  }
  h1 {
    color: #1a1a2e;
    border-bottom: 3px solid #6366f1;
    padding-bottom: 10px;
  }
  h2 { color: #4338ca; }
  strong { color: #6366f1; }
  code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
  }
  table { font-size: 0.85em; }
  th { background: #6366f1; color: white; }
  td { border: 1px solid #e2e8f0; }
  .columns { display: flex; gap: 40px; }
  .col { flex: 1; }
  blockquote {
    border-left: 4px solid #6366f1;
    background: #f8fafc;
    padding: 10px 20px;
    margin: 10px 0;
    font-style: normal;
  }
  ul { line-height: 1.6; }
  img[alt~="center"] { display: block; margin: 0 auto; }
---

<!-- _class: lead -->

# InnerCircle

## A Small-Circle Social Media Platform

**Qiwen Lin · Irys Zhang · Weijie Zhu · Zhengyang Li**

University of Toronto — CSC309 Winter 2026

---

# The Problem

### Mainstream social media encourages **quantity over quality**

- Platforms like Instagram, Twitter, Facebook prioritize **large follower counts** and engagement metrics
- Users experience **shallow interactions**, social comparison, and content overload
- Research shows people maintain meaningful relationships with only **5–15 close friends** (Dunbar's Number)

### Existing solutions fall short

| Platform | Limitation |
|----------|-----------|
| **BeReal** | Still uses open follower model, no connection cap |
| **Instagram Close Friends** | An afterthought, not a core design principle |
| **Group Chats (WhatsApp)** | Lacks social feed, profiles, and discovery features |

> **None of these structurally enforce small, meaningful networks.**

---

# Our Solution: InnerCircle

### A social platform that **limits your circle** to ~20–30 friends

<div class="columns">
<div class="col">

**Core Concept**
- **Enforced friend cap** — must remove a friend to add a new one once at the limit
- Every post, message, and interaction happens within a **small, trusted group**
- Designed for users who want social media that feels **personal, not performative**

</div>
<div class="col">

**Target Users**
- Young adults and students
- Want to stay connected with **close friends**
- Share through geospatial photo sharing and real-time messaging
- **Without** the noise and pressure of large-scale social networks

</div>
</div>

---

# Technical Architecture

### Next.js Full-Stack Application (Monorepo)

<div class="columns">
<div class="col">

**Frontend**
- **Next.js 16** — App Router + Server Components
- **React 19** + TypeScript
- **Tailwind CSS** + **shadcn/ui**
- **Redux Toolkit** — global real-time state
- **Socket.io Client** — real-time events

</div>
<div class="col">

**Backend**
- **Next.js API Routes** — RESTful API
- **PostgreSQL** + **Prisma ORM**
- **Better Auth** — session-based authentication
- **Socket.io** on a custom HTTP server
- **AWS S3 / DO Spaces** — cloud storage
- **Sharp** — server-side image processing

</div>
</div>

> **Key Decision:** Custom HTTP server wraps Next.js to support persistent WebSocket connections — solving the serverless limitation for real-time features.

---

# Database Design

### 10 models, relational schema with Prisma ORM

<div class="columns">
<div class="col">

**Core Models**
- `User` — profile, avatar, bio, friendCapLimit
- `Friendship` — self-referencing many-to-many (PENDING / ACCEPTED / DECLINED)
- `Post` — text content, lat/lng for geospatial mapping
- `PostImage` — multiple images per post with thumbnails
- `Comment` / `Like` — social interactions

</div>
<div class="col">

**Advanced Models**
- `Conversation` — efficient chat query model (avoids N+1)
- `Message` — real-time chat with read receipts
- `Notification` — 6 types (friend_request, like, comment, message, etc.)
- `Session` / `Account` — Better Auth managed

</div>
</div>

> **Design Decision:** Added `Conversation` table instead of flat Message(senderId, receiverId) to make listing conversations, unread counts, and pagination efficient.

---

# Core Feature: Authentication

### Better Auth with email/password + session management

<div class="columns">
<div class="col">

**Implementation**
- `better-auth` library with Prisma adapter
- Session-based auth (7-day expiry, 1-day refresh)
- Server-side helpers: `getSession()`, `requireSession()`, `requireSessionForApi()`
- Middleware redirects: unauthenticated → `/login`, authenticated → `/feed`

</div>
<div class="col">

**Security**
- All API routes call `requireSessionForApi()` — returns 401 if not logged in
- Protected route middleware at `src/middleware.ts`
- Password minimum 8 characters
- Centralized auth utilities — one file to audit

</div>
</div>

```
POST /api/auth/sign-up   →  Register
POST /api/auth/sign-in   →  Login
GET  /api/auth/session    →  Get current session
```

---

# Core Feature: Friend System with Cap Enforcement

### The defining feature — **structural** friend limit, not just a config flag

<div class="columns">
<div class="col">

**How It Works**
1. User searches for people by name/email
2. Send friend request → creates `Friendship(PENDING)`
3. Addressee accepts → status → `ACCEPTED`
4. **Cap check runs before both sending and accepting**
5. At cap? Must remove a friend first

</div>
<div class="col">

**API Endpoints**
```
GET    /api/friends          → friend list
POST   /api/friends/request  → send request
POST   /api/friends/respond  → accept/decline
POST   /api/friends/remove   → unfriend
GET    /api/friends/pending  → pending requests
GET    /api/users/search?q=  → user search
```

</div>
</div>

> **Race Condition Handling:** The accept handler wraps count-check + status-update in a `prisma.$transaction()` to prevent concurrent accepts from exceeding the cap.

---

# Core Feature: Posts, Feed & Interactions

### Friend-based feed with like/comment system

<div class="columns">
<div class="col">

**Feed Logic**
- Query posts from **self + all friends only**
- Cursor-based pagination (20 posts/page)
- Each post includes: author info, images, like count, comment count, `isLiked` flag
- Friend-based access control on every endpoint

</div>
<div class="col">

**API Endpoints**
```
GET    /api/posts                      → feed
POST   /api/posts                      → create post
GET    /api/posts/[postId]             → single post
POST   /api/posts/[postId]/like        → toggle like
GET    /api/posts/[postId]/comments    → list comments
POST   /api/posts/[postId]/comments    → add comment
```

</div>
</div>

- Like/comment creates a `Notification` for the post author + emits real-time Socket.io event
- Post images go through the **image processing pipeline** before storage

---

# Advanced Feature 1: Real-Time Chat (Socket.io)

### One-on-one instant messaging with typing indicators and read receipts

<div class="columns">
<div class="col">

**Architecture**
- Custom `server.ts` creates HTTP server → attaches Socket.io → passes rest to Next.js
- `userSockets` Map tracks userId → Set<socketId> (multi-tab support)
- Online/offline status broadcast

</div>
<div class="col">

**Events**
```
chat:message   → send/receive message
chat:typing    → typing indicator
chat:read      → mark messages as read
user:online    → friend came online
user:offline   → friend went offline
```

</div>
</div>

**Client-Side Integration:**
- `SocketProvider` connects on login, disconnects on logout
- Incoming events dispatched to **Redux** slices for instant UI updates
- Conversation model enables efficient history loading + unread counts

---

# Advanced Feature 2: Image Processing Pipeline

### Server-side compression, format conversion, and thumbnail generation

**Pipeline Flow:**
```
Client Upload (max 10MB) → Server receives file
    → Sharp: resize (max 1920px) + WebP conversion (quality: 80)
    → Sharp: generate thumbnail (400x400, quality: 60)
    → Upload both to S3/DigitalOcean Spaces
    → Return { url, thumbnailUrl }
```

<div class="columns">
<div class="col">

**Post Images**
- Resize to fit 1920×1920
- Convert to WebP (80% quality)
- Generate 400×400 thumbnail
- Store both versions

</div>
<div class="col">

**Avatar Processing**
- Crop to 256×256
- Convert to WebP
- Single file upload

**File Validation**
- 10MB size limit
- Image-only MIME check

</div>
</div>

---

# Advanced Feature 3: AI Content Moderation (External API)

### Non-blocking, fail-open moderation for uploaded images

<div class="columns">
<div class="col">

**Design**
1. Image uploads succeed **immediately**
2. Moderation runs **asynchronously** in the background
3. If API is down → **fail open** (allow the image)
4. Flagged images logged for review

</div>
<div class="col">

**Why Fail-Open?**
- Core UX never blocked by third-party dependency
- 10-second timeout prevents hanging
- Logged warnings for flagged content
- Graceful degradation on API errors

</div>
</div>

```typescript
// Non-blocking: fire-and-forget
moderateImage(url).then(async (result) => {
  if (!result.safe) {
    console.warn(`Image flagged: ${url}`, result.categories);
  }
});
```

> This satisfies the **External API Integration** advanced feature requirement.

---

# Advanced Feature 4: Redux Toolkit State Management

### Global state for real-time data across the application

**4 Redux Slices:**

| Slice | Purpose | Key State |
|-------|---------|-----------|
| `feedSlice` | Post feed management | posts[], nextCursor, loading |
| `chatSlice` | Real-time messaging | conversations[], activeConversation, messages[] |
| `notificationSlice` | Notification tracking | notifications[], unreadCount |
| `friendSlice` | Friend status management | friends[], pendingRequests[], onlineUsers |

**Why Redux, not just React Context?**
- Multiple real-time data sources (WebSocket events + API responses + optimistic updates)
- `createAsyncThunk` for API calls with loading/error states
- Consistent updates across components without race conditions or stale data
- Socket.io events dispatch directly to Redux → instant UI updates everywhere

---

# Frontend UI Design

### Clean, minimal aesthetic — responsive across desktop and mobile

<div class="columns">
<div class="col">

**Desktop Layout**
- Left sidebar navigation
- 5 main sections: Feed, Friends, Chat, Notifications, Profile
- Sign out at bottom of sidebar

**Mobile Layout**
- Bottom tab bar navigation
- Full-screen views for chat
- Touch-friendly targets (min 44px)

</div>
<div class="col">

**Key Pages**
- **Feed** — infinite scroll with post cards
- **Friends** — 3-tab layout (My Friends, Requests, Search) + cap indicator
- **Chat** — two-panel (conversation list + chat window)
- **Notifications** — real-time badge + notification list
- **Profile** — avatar, bio, friend count, post history

**Components:** shadcn/ui + Tailwind CSS

</div>
</div>

---

# Implementation Status & Completion Plan

| Module | Status | Notes |
|--------|--------|-------|
| Database & Prisma Schema | ✅ Complete | 10 models, all migrations applied |
| Authentication (Better Auth) | ✅ Complete | Sign up, sign in, sessions, middleware |
| Friend System API | ✅ Complete | Request, accept, decline, remove, cap enforcement |
| Posts & Feed API | ✅ Complete | CRUD, like, comment, friend-based filtering |
| Real-Time Chat (Socket.io) | ✅ Complete | Custom server, message persistence, typing |
| Notification System | ✅ Complete | 6 types, real-time delivery |
| Image Processing Pipeline | ✅ Complete | Sharp, WebP, thumbnails, S3 upload |
| AI Content Moderation | ✅ Complete | Async, fail-open, external API |
| Frontend UI & Pages | 🔧 In Progress | Layout, components being built |
| Redux State Management | 🔧 In Progress | Store configured, slices defined |

> **Plan:** Complete frontend pages and Redux integration by March 27. Core user flow (auth → friends → post → feed → chat) is the priority.

---

<!-- _class: lead -->

# Thank You

### Questions?

**InnerCircle** — Social media that feels personal, not performative.

GitHub Repository: *[to be shared]*

**Team:** Qiwen Lin · Irys Zhang · Weijie Zhu · Zhengyang Li

