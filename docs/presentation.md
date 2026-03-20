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

## A Small-Circle Social Media Platform with Geospatial Sharing

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

### A social platform that **limits your circle** to ~25 friends

<div class="columns">
<div class="col">

**Core Concept**
- **Enforced friend cap** — must remove a friend to add a new one once at the limit
- Every post, message, and interaction happens within a **small, trusted group**
- **Geospatial sharing** — posts pinned to locations and visualized on a 3D globe

</div>
<div class="col">

**Target Users**
- Young adults and students
- Want to stay connected with **close friends**
- Share moments through **geospatial photo sharing** on an interactive globe
- **Without** the noise and pressure of large-scale social networks

</div>
</div>

---

# Technical Architecture

### Next.js Full-Stack Application (Option A)

<div class="columns">
<div class="col">

**Frontend**
- **Next.js 16** — App Router + Server Components
- **React 19** + TypeScript
- **Tailwind CSS** + **shadcn/ui** (10 components)
- **Redux Toolkit** — global state management (`postsSlice`)
- **Socket.io Client** — real-time notifications
- **react-globe.gl** — 3D globe visualization

</div>
<div class="col">

**Backend**
- **API Routes** (18 endpoints) + **Server Actions** for mutations
- **PostgreSQL** + **Prisma ORM** (10 models)
- **Better Auth** — session-based authentication
- **Socket.io** on custom HTTP server (`server.ts`)
- **S3 / DigitalOcean Spaces** — cloud storage (+ local dev fallback)
- **Sharp** — server-side image processing

</div>
</div>

> **Key Decision:** Custom HTTP server wraps Next.js to support persistent WebSocket connections alongside Next.js API Routes and Server Actions.

---

# Database Design

### 10 models, relational schema with Prisma ORM + PostgreSQL

<div class="columns">
<div class="col">

**Core Models**
- `User` — profile, avatar, bio, friendCapLimit (default 25)
- `Friendship` — self-referencing many-to-many (PENDING / ACCEPTED / DECLINED)
- `Post` — text content, **lat/lng** for geospatial mapping
- `PostImage` — multiple images per post with thumbnails
- `Comment` / `Like` — social interactions

</div>
<div class="col">

**Advanced Models**
- `Conversation` — efficient chat model (avoids N+1 queries)
- `Message` — real-time chat with read receipts
- `Notification` — 6 types (friend_request, like, comment, message, etc.)
- `Session` / `Account` / `Verification` — Better Auth managed

</div>
</div>

> **Design Decision:** Added `Conversation` table instead of flat messages to make listing conversations, unread counts, and pagination efficient.

---

# Demo: Login & Authentication

### Better Auth with email/password + session management

<div class="columns">
<div class="col">

**Implementation**
- `better-auth` library with Prisma adapter
- Session-based auth (7-day expiry, 1-day refresh)
- `proxy.ts` — Next.js 16 route protection (replaces deprecated middleware)
- Unauthenticated → redirect to `/login`
- Authenticated on `/login` → redirect to `/feed`

**Server-side helpers:**
- `getSession()` / `requireSession()` / `requireSessionForApi()`

</div>
<div class="col">

**Screenshot: Login Page**
- Dark theme, clean Card layout
- Email + password form
- Link to registration
- Responsive: `max-w-[90vw] sm:max-w-sm`

**API Endpoints:**
```
POST /api/auth/sign-up/email  → Register
POST /api/auth/sign-in/email  → Login
GET  /api/auth/get-session    → Session
```

</div>
</div>

---

# Demo: Globe Feed — The Core Experience

### Interactive 3D globe shows posts pinned to real-world locations

<div class="columns">
<div class="col">

**How It Works**
- **react-globe.gl** renders an interactive 3D Earth
- Posts with lat/lng appear as colored pins on the globe
- Click a pin → camera flies to location → opens Post Detail drawer
- Color-coded by author (hash-based coloring)
- Filter by time range (7d / 30d / 90d / 1y / All) and scope (All / Mine)

</div>
<div class="col">

**State Management (Redux)**
- `postsSlice` manages: `items[]`, `loading`, `selectedPostId`, `datePreset`, `scope`
- `fetchPosts` async thunk with cursor pagination
- `filteredPosts` derived via `useMemo` with date cutoff + scope filter
- New posts added via `addPost` action → instant globe update

</div>
</div>

> **Technical Challenge:** Redux/Immer freezes store objects. three-globe needs to mutate data objects internally. Solved by shallow-copying posts before passing to GlobeViewer.

---

# Demo: Create Post & Post Detail

### Full post creation with image upload, geolocation, and interactive detail view

<div class="columns">
<div class="col">

**Create Post (FAB → Drawer)**
- Text content input
- **Image upload** → `POST /api/upload` → Sharp processing → S3/local storage
- **Geolocation**: "Use My Location" (browser API) or manual lat/lng entry
- Posts with coordinates appear on the globe immediately

</div>
<div class="col">

**Post Detail (Drawer)**
- Author info with avatar
- Image gallery (horizontal scroll)
- **Location badge** with coordinates
- **Interactive like** button (toggle via `POST /api/posts/[postId]/like`)
- **Comment section**: list existing + submit new comments
- Real-time comment count and like state updates

</div>
</div>

> **File Processing Pipeline:** Upload (10MB max) → Sharp resize (1920px) → WebP conversion (quality 80) → Thumbnail (400×400) → S3 upload → return `{url, thumbnailUrl}`

---

# Demo: Friends Management

### Search, add, and manage your inner circle

<div class="columns">
<div class="col">

**Friends Page (`/friends`)**
- **Find People** — search by name or email via `/api/users/search`
- **Send friend request** → Server Action `sendFriendRequestAction()`
- **Pending Requests** — accept or decline with Server Actions
- **My Friends** — list with remove option
- **Friend cap enforcement** — checked before both send and accept

</div>
<div class="col">

**Server Actions (Next.js "use server")**
```typescript
// src/app/actions/friends.ts
sendFriendRequestAction(addresseeId)
respondFriendRequestAction(id, action)
removeFriendAction(friendId)

// src/app/actions/posts.ts
createPostAction(input)
toggleLikeAction(postId)
```
Uses `revalidatePath()` for cache invalidation.

</div>
</div>

> **Access Control:** Feed only shows posts from yourself + friends. Single-post API checks `areFriends()` before returning data.

---

# Advanced Feature 1: Real-Time (Socket.io)

### Live notifications via WebSocket — no page refresh needed

<div class="columns">
<div class="col">

**Server (`socket-server.ts`)**
- Custom HTTP server attaches Socket.io
- Session token authentication middleware
- `userSockets` Map for multi-tab support
- Online/offline status broadcast to friends only

**Events:**
```
chat:message    → send/receive DM
chat:typing     → typing indicator
chat:read       → read receipts
notification:new → live notifications
user:online/offline → presence
```

</div>
<div class="col">

**Client Integration**
- `useSocket()` hook manages connection lifecycle
- Connects on Feed mount, disconnects on unmount
- `NotificationToast` component shows pop-up alerts
- Socket events can trigger Redux dispatches

**Feed page integration:**
```typescript
useSocket({
  onNotification: (notification) => {
    addToast(notification);
  },
});
```

</div>
</div>

---

# Advanced Feature 2: File Handling & Processing

### Non-trivial server-side image processing with Sharp

**Full Pipeline:**
```
Client (max 10MB, image/* only)
  → POST /api/upload (formData)
  → Sharp: resize to 1920px + WebP (quality: 80) → main image
  → Sharp: crop to 400×400 + WebP (quality: 60) → thumbnail
  → Upload both to S3 (or local /public/uploads/ in dev)
  → Background: AI content moderation (async, fail-open)
  → Return { url, thumbnailUrl }
```

<div class="columns">
<div class="col">

**Cloud Storage**
- S3-compatible (DigitalOcean Spaces / AWS)
- **Local fallback** when `S3_ACCESS_KEY` is empty — saves to `public/uploads/`
- Files associated with posts via `PostImage` model

</div>
<div class="col">

**Avatar Processing**
- Crop to 256×256 square
- Convert to WebP (quality: 80)
- Single file, no thumbnail needed

</div>
</div>

---

# Advanced Feature 3: Redux Toolkit State Management

### Global client-side state shared across components

<div class="columns">
<div class="col">

**Store Setup**
- `configureStore` with `postsReducer`
- `StoreProvider` wraps entire app in `layout.tsx`
- Typed hooks: `useAppDispatch`, `useAppSelector`

**postsSlice manages:**
- `items: PostItem[]` — all loaded posts
- `loading` / `error` — async fetch state
- `selectedPostId` — currently viewed post
- `datePreset` / `scope` — filter state

</div>
<div class="col">

**Why Redux over local state?**
- Post data shared between GlobeViewer, FilterPanel, PostDetailDrawer, CreatePostDrawer
- Derived state (`filteredPosts`) with clear update logic via `useMemo`
- `createAsyncThunk` for paginated post fetching
- Real-time socket events can dispatch to update store globally
- Optimistic updates: `addPost`, `updatePostLike`, `incrementCommentCount`

</div>
</div>

> **Architecture:** Feed page reads from Redux → GlobeViewer renders pins → PostDetailDrawer reads selected post → CreatePostDrawer dispatches `addPost` → globe updates instantly.

---

# Requirements Checklist

### All core and advanced requirements satisfied

| Requirement | Status | Implementation |
|-------------|--------|---------------|
| TypeScript (frontend + backend) | ✅ | All `.ts` / `.tsx`, 18 API routes |
| Next.js with App Router | ✅ | Next.js 16, Server Components, API Routes, Server Actions |
| Tailwind CSS + shadcn/ui | ✅ | 10 shadcn components, responsive breakpoints |
| Responsive Design | ✅ | `sm:` / `md:` / `lg:` across login, register, feed, friends |
| PostgreSQL | ✅ | Prisma ORM, 10 models |
| Cloud Storage | ✅ | S3 upload/download + local dev fallback |
| **Adv: Auth** | ✅ | Better Auth, sessions, protected routes, friend-based ACL |
| **Adv: Real-Time** | ✅ | Socket.io server + client, live notifications |
| **Adv: File Handling** | ✅ | Sharp image processing, WebP, thumbnails |
| **Adv: Redux State Mgmt** | ✅ | Redux Toolkit, postsSlice, global state |

> **4 advanced features** implemented (only 2 required).

---

<!-- _class: lead -->

# Thank You

### Questions?

**InnerCircle** — Social media that feels personal, not performative.

GitHub: **github.com/kevinlin29/InnerCircle** (branch: `feature/build-plan`)

**Team:** Qiwen Lin · Irys Zhang · Weijie Zhu · Zhengyang Li
