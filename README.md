# InnerCircle

A small-circle social media platform with geospatial sharing — built for meaningful connections, not follower counts.

## Team Information

| Name | Student Number | Email |
|------|---------------|-------|
| Qiwen Lin | *(fill in)* | *(fill in)* |
| Irys Zhang | *(fill in)* | *(fill in)* |
| Weijie Zhu | *(fill in)* | *(fill in)* |
| Zhengyang Li | *1012373977* | *zhengyang.li@mail.utoronto.ca* |

> **Note:** Please replace the placeholder student numbers and emails above before submission.

## Video Demo



## Motivation

Mainstream social media platforms are designed around maximizing follower counts and engagement metrics, which often lead to shallow interactions, content overload, and performative behavior. Research on Dunbar's Number suggests that humans can maintain only about 5–15 truly meaningful relationships — yet most platforms encourage users to accumulate hundreds or thousands of connections.

**InnerCircle** flips this model by enforcing a **friend cap of ~25 people**, inspired by the "inner circle" layer of Dunbar's Number. Users must deliberately choose who belongs in their circle: to add a new friend, they may need to remove an existing one. This constraint transforms social media from a broadcasting tool into a space for genuine, intentional connection.

The platform also introduces **geospatial sharing**: every post is pinned to a location on an interactive 3D globe, allowing users to explore their friends' experiences across the world. Combined with friend-based access control (you only see posts from your circle), InnerCircle creates a focused, intimate social experience.

**Target users:** University students and young professionals who are fatigued by algorithm-driven feeds and want a social platform that feels personal, not performative.

## Objectives

The project aims to build a full-stack web application that:

1. Demonstrates that **constrained social graphs** can foster more meaningful online interaction.
2. Pioneers a **geospatial feed** (3D globe) as the primary content discovery mechanism, replacing infinite scrolling with spatial exploration.
3. Implements all ECE1724 core technical requirements with a polished, production-quality codebase.
4. Explores five advanced features: authentication, real-time functionality, file handling, advanced state management, and external API integration.

## Technical Stack

InnerCircle follows **Option A: Next.js Full-Stack** with the App Router architecture.

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) + React 19 |
| **Language** | TypeScript (all frontend and backend code) |
| **Styling** | Tailwind CSS + shadcn/ui component library |
| **State Management** | Redux Toolkit (`postsSlice` shared across 4+ components) |
| **Real-Time** | Socket.io (server + client) on custom HTTP server |
| **Database** | PostgreSQL + Prisma ORM (10 models, indexes, transactions) |
| **Cloud Storage** | DigitalOcean Spaces (S3-compatible object storage) |
| **Image Processing** | Sharp (resize, WebP conversion, thumbnail generation) |
| **Authentication** | Better Auth (session-based, email/password) |
| **Content Moderation** | SightEngine AI (cloud-based image analysis) |
| **3D Visualization** | react-globe.gl + Three.js |
| **Testing** | Vitest (5 test suites) |

### Data Flow

```
Browser (React + Redux + Socket.io)
        │
        ▼
Custom HTTP Server (server.ts)
  │                        │
  ▼                        ▼
Next.js Handler       Socket.io (real-time)
  │
  ▼
Prisma ORM ───► PostgreSQL
  │
  ▼
DigitalOcean Spaces (images)
```

**Key architectural decision:** Next.js API Routes cannot handle WebSocket upgrades, so we built a custom Node.js HTTP server (`server.ts`) that wraps the Next.js request handler alongside a Socket.io server. The Socket.io instance is shared with API Routes via `globalThis`, enabling any API endpoint to push real-time events.

## Features

### Core Technical Requirements

All six core requirements are fully implemented:

| Requirement | Implementation |
|-------------|---------------|
| **TypeScript** | 100% TypeScript — all `.ts`/`.tsx` files across frontend and backend |
| **Frontend (React/Next.js)** | Next.js 16 App Router with React 19, Tailwind CSS, shadcn/ui, responsive design (`sm:`/`md:`/`lg:` breakpoints) |
| **Backend** | Next.js App Router: 18 API route endpoints + 5 Server Actions + Server Components |
| **Frontend–Backend Integration** | Redux fetches API data, Server Actions handle mutations, Socket.io pushes real-time updates |
| **Relational Database** | PostgreSQL with Prisma ORM — 10 models, composite unique constraints, indexes, `$transaction()` for atomicity |
| **Cloud Storage** | DigitalOcean Spaces (S3-compatible): image upload/download with public URLs stored in database |

### Advanced Features (5 implemented, 2 required)

#### 1. User Authentication and Authorization

- **Better Auth** with session-based authentication (email/password, 8-char minimum)
- Session cookies with 7-day expiry and 1-day refresh cycle
- Route protection: unauthenticated users are redirected to login; logged-in users are redirected from login/register to `/feed`
- **Friend-based access control** on every API endpoint — users can only view posts and profiles of people in their circle

#### 2. Real-Time Functionality

- **Socket.io** running on a custom HTTP server alongside Next.js
- Authentication middleware validates session tokens on WebSocket handshake
- Live notifications for: likes, comments, friend requests, friend acceptances, new posts, and messages
- Cross-session post data synchronization (`post:updated` broadcast)
- Real-time chat with typing indicators and read receipts
- Online/offline status tracking with friend-scoped visibility

#### 3. File Handling and Processing

- **Sharp** image processing pipeline:
  - Post images: resize to max 1920px, convert to WebP (quality 80), generate 400×400 thumbnails (quality 60)
  - Avatars: crop to 256×256, convert to WebP
  - Parallel processing: main image and thumbnail generated concurrently from a single decode
- Upload to DigitalOcean Spaces with `public-read` ACL
- Graceful fallback to local filesystem (`public/uploads/`) when S3 credentials are unavailable

#### 4. Advanced State Management

- **Redux Toolkit** with `postsSlice` managing global state shared across 4+ components:
  - `items` (post list), `loading`, `error`, `selectedPostId`, `datePreset`, `scope`
- Async thunk `fetchPosts` with cursor-based pagination
- Reducers: `addPost`, `selectPost`, `setDatePreset`, `setScope`, `updatePostLike`, `incrementCommentCount`, `syncPostCounts`
- Real-time state sync: Socket.io events dispatch Redux actions to update like/comment counts across all connected clients

#### 5. Integration with External APIs

- **SightEngine AI** — cloud-based image content moderation:
  - Models: `nudity-2.1`, `offensive`, `gore`, `violence`
  - Synchronous check on upload with 12-second timeout
  - Configurable thresholds (nudity: 0.5, offensive: 0.7, gore: 0.5, violence: 0.7)
  - Flagged images are auto-deleted from S3 and the upload returns HTTP 422 with flagged categories
  - **Fail-open design**: if the API is unavailable or not configured, uploads proceed normally
- **DigitalOcean Spaces** — S3-compatible cloud object storage API for all file operations

### Additional Features

- **3D Globe Feed**: Interactive globe visualization using react-globe.gl + Three.js with dynamic marker clustering (threshold scales with camera altitude: `altitude × 2.2`)
- **Friend Cap Enforcement**: `prisma.$transaction()` prevents race conditions when two concurrent friend accepts could exceed the 25-friend limit
- **Dark/Light Theme**: Toggle with `localStorage` persistence
- **Image Lightbox**: Full-screen image viewer with keyboard navigation
- **Skeleton Loading**: Loading placeholders for feed and chat
- **Keyboard Shortcuts**: Accessibility-focused navigation shortcuts
- **Error Boundary**: Graceful crash recovery with user-friendly fallback UI
- **Scroll-to-Top**: Smooth scroll animation button on feed
- **Post Editing**: Inline edit with PATCH API
- **Post Deletion**: Confirmation dialog with toast feedback

## Database Schema

The application uses PostgreSQL with Prisma ORM. The schema consists of 10 models and 2 enums:

```
User ─┬─► Session (auth sessions, cascade delete)
      ├─► Account (OAuth/password credentials, cascade delete)
      ├─► Post ──┬─► PostImage (multiple images per post)
      │          ├─► Comment
      │          └─► Like (unique per user per post)
      ├─► Friendship (requester ↔ addressee, status: PENDING/ACCEPTED/DECLINED)
      ├─► Conversation ──► Message (1-on-1 DMs between friends)
      └─► Notification (FRIEND_REQUEST, FRIEND_ACCEPT, NEW_POST, LIKE, COMMENT, MESSAGE)

Verification (email verification tokens)
```

Key design decisions:
- `Friendship` uses `@@unique([requesterId, addresseeId])` to prevent duplicate requests
- `Like` uses `@@unique([postId, userId])` to enforce one like per user per post
- `Conversation` uses `@@unique([participantAId, participantBId])` for 1-on-1 chat deduplication
- Strategic indexes on foreign keys and frequently queried columns (`createdAt`, `read`, `lastMessageAt`)

## User Guide

### Registration and Login

1. Navigate to the app and click **Register**.
2. Enter your name, email, and password (minimum 8 characters).
3. After registration, you are redirected to the login page.
4. Log in with your credentials — a session cookie is set automatically.

### Globe Feed

The main feed displays an interactive 3D globe with geo-tagged posts from you and your friends:

- **Rotate** the globe by clicking and dragging.
- **Zoom** in/out with the scroll wheel.
- **Cluster markers** appear when zoomed out — click a cluster to zoom into that area.
- **Individual pins** appear when zoomed in — click a pin to view the post detail.
- Use the **Filter Panel** on the left to filter posts by date range (Today, This Week, This Month, All Time) and scope (All Friends, My Posts).

### Creating a Post

1. Click the **Create Post** button.
2. Enter text content (optional) and upload images (optional but at least one of text or image is required).
3. Set the **geolocation** for the post (latitude and longitude) — required for globe placement.
4. Submit — the image is processed (resize + WebP + thumbnail), uploaded to cloud storage, and checked by AI content moderation.
5. If the image is flagged as inappropriate, it is automatically removed and you receive a notification with the flagged categories.

### Friend Management

1. Navigate to the **Friends** page.
2. **Search** for users by name or email (minimum 2 characters).
3. **Send a friend request** — the recipient receives a real-time notification.
4. **Accept or decline** incoming requests from the Pending tab.
5. The **25-friend cap** is enforced: if your circle is full, you must remove a friend before adding a new one.

### Real-Time Interactions

- **Like** a post — the author receives an instant notification; like counts update across all connected clients.
- **Comment** on a post — same real-time sync.
- **Chat** with friends — real-time messages with typing indicators, read receipts, and online status.
- **Notifications** appear as toast popups — click to navigate to the relevant post or profile.

### Profile

- View and edit your **bio** and **avatar** (avatar is cropped to 256×256 and converted to WebP).
- View your own posts on your profile page.

## Development Guide

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **PostgreSQL** 14+ running locally or remotely
- **DigitalOcean Spaces** account (or any S3-compatible storage) for cloud file handling
- **SightEngine** account for AI content moderation (optional — the app works without it)

### Environment Setup

1. Clone the repository:

```bash
git clone https://github.com/kevinlin29/InnerCircle.git
cd InnerCircle
```

2. Install dependencies:

```bash
npm install
```

3. Copy the environment template and fill in your credentials:

```bash
cp .env.example .env
```

4. Edit `.env` with your values:

```
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/innercircle"

# Better Auth
BETTER_AUTH_SECRET="generate-a-random-secret-here"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

# DigitalOcean Spaces / S3-compatible storage
S3_ENDPOINT="https://nyc3.digitaloceanspaces.com"
S3_REGION="nyc3"
S3_BUCKET="your-bucket-name"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"

# AI Content Moderation — SightEngine
SIGHTENGINE_API_USER="your-api-user"
SIGHTENGINE_API_SECRET="your-api-secret"

# Socket.io
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

> **Credentials sent to TA.**

### Database Initialization

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# (Optional) Open Prisma Studio to inspect data
npx prisma studio
```

### Cloud Storage Configuration

1. Create a **DigitalOcean Space** (or S3 bucket) with public-read ACL for uploaded files.
2. Generate an API key pair (Access Key + Secret Key) from the DigitalOcean control panel.
3. Set the `S3_*` variables in `.env` as shown above.
4. If S3 credentials are not provided, the app falls back to local file storage at `public/uploads/`.

### SightEngine Configuration (Optional)

1. Sign up at [sightengine.com](https://sightengine.com) and get your API user ID and secret.
2. Set `SIGHTENGINE_API_USER` and `SIGHTENGINE_API_SECRET` in `.env`.
3. If not configured, image moderation is skipped (fail-open design) and all uploads proceed.

### Local Development and Testing

```bash
# Start the development server (custom server with Socket.io)
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

The `dev` script launches `tsx server.ts`, which starts a custom Node.js HTTP server wrapping the Next.js handler and initializing Socket.io for WebSocket connections.

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint the codebase
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

The test suite includes 5 test files covering image processing, Prisma connection pooling, Socket.io validation, friend cache logic, and conversation queries.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/api/auth/[...all]` | Better Auth handler (login, register, session) |
| `GET` | `/api/posts` | Paginated feed (own + friends' posts) with like/comment counts |
| `POST` | `/api/posts` | Create a new post (text, images, geolocation) |
| `GET` | `/api/posts/[postId]` | Single post detail (friend check enforced) |
| `PATCH` | `/api/posts/[postId]` | Edit post text (author only) |
| `DELETE` | `/api/posts/[postId]` | Delete post (author only) |
| `POST` | `/api/posts/[postId]/like` | Toggle like (friend or self check) |
| `GET` | `/api/posts/[postId]/comments` | Paginated comments |
| `POST` | `/api/posts/[postId]/comments` | Add a comment |
| `POST` | `/api/upload` | Upload image (avatar or post) with Sharp processing + S3 + moderation |
| `GET` | `/api/users/me` | Current user profile + friend count |
| `PATCH` | `/api/users/me` | Update current user profile |
| `GET` | `/api/users/search` | Search users by name/email |
| `GET` | `/api/users/[userId]` | User public profile + friendship status |
| `GET` | `/api/friends` | Accepted friends list |
| `GET` | `/api/friends/pending` | Pending friend requests |
| `POST` | `/api/friends/request` | Send friend request |
| `POST` | `/api/friends/respond` | Accept or decline request |
| `POST` | `/api/friends/remove` | Remove a friend |
| `GET` | `/api/notifications` | Paginated notifications + unread count |
| `PATCH` | `/api/notifications` | Mark notifications as read |
| `GET` | `/api/messages/conversations` | Conversation list with last message + unread count |
| `GET` | `/api/messages/[userId]` | Chat history with a friend (paginated) |

## AI Assistance & Verification (Summary)

AI tools (primarily Cursor with Claude) were used throughout the development process. The team's approach to AI usage can be summarized as:

**Where AI meaningfully contributed:**
- **Architecture exploration**: Designing the custom server approach to integrate Socket.io with Next.js App Router, specifically the `globalThis` pattern for sharing the Socket.io instance between the native Node.js server process and webpack-bundled API Routes.
- **Database schema design**: Iterating on the Prisma schema relationships, particularly the bidirectional friendship model and conversation deduplication strategy.
- **Image processing pipeline**: Implementing the Sharp parallel processing pattern (clone from single decode) and the SightEngine moderation integration.
- **Globe clustering algorithm**: Developing the dynamic threshold formula (`altitude × 2.2`) for marker clustering on the 3D globe.

**One representative mistake in AI output:**
The AI initially suggested using Next.js middleware (`middleware.ts`) for route protection and Socket.io authentication. However, Next.js middleware runs in the Edge Runtime, which does not support direct database access or the `pg` driver. The team identified this limitation through testing and instead implemented route protection via a `proxy.ts` utility function, and Socket.io authentication via a custom `io.use()` middleware in the Node.js server context. See `ai-session.md` for the full interaction.

**How correctness was verified:**
- Manual end-to-end testing of all user flows (registration → post creation → interaction → friend management → real-time notifications)
- Vitest test suite (5 test files) covering image processing, database pooling, Socket.io validation, friend cache, and conversation queries
- Console logging and network inspection for real-time Socket.io events
- Transaction-level testing for the friend cap race condition (`prisma.$transaction()`)

For detailed AI interaction examples, see [`ai-session.md`](./ai-session.md).

## Individual Contributions

| Team Member | Primary Contributions |
|-------------|----------------------|
| **Qiwen Lin** | Project setup, custom server architecture (`server.ts`), Socket.io real-time infrastructure, chat system, online status tracking, deployment configuration |
| **Irys Zhang** | Authentication system (Better Auth), friend management with cap enforcement, notification system, API route protection |
| **Weijie Zhu** | Globe visualization (react-globe.gl + clustering), feed page, post CRUD, Redux state management, image lightbox, UI polish (theme toggle, skeleton loading, keyboard shortcuts) |
| **Zhengyang Li** | Image upload pipeline (Sharp + S3 + SightEngine moderation), cloud storage integration, profile page, post image handling, testing suite |

> Contributions are aligned with Git commit history. Run `git shortlog -sn --all` to verify commit distribution.

## Lessons Learned and Concluding Remarks

### Technical Insights

1. **Next.js + WebSockets require a custom server.** The App Router's API Routes run within the Next.js request handler and cannot intercept HTTP upgrade requests. Wrapping Next.js with a plain Node.js `createServer` was the cleanest solution, though it required careful sharing of the Socket.io instance via `globalThis` to bridge the native Node and webpack-bundled execution contexts.

2. **Transaction-level enforcement matters for invariants.** The friend cap (max 25) is a hard constraint that must hold even under concurrent requests. Using `prisma.$transaction()` with isolation level awareness prevents the race condition where two simultaneous accept operations could both succeed and exceed the limit.

3. **Fail-open design for external services is pragmatic.** The SightEngine moderation API has a 12-second timeout. If it fails, uploads proceed rather than blocking. This trade-off was deliberate: content moderation is important but should not break the core user experience.

4. **Dynamic clustering improves globe UX significantly.** A static clustering threshold caused either too much or too little aggregation depending on zoom level. Tying the threshold to camera altitude (`altitude × 2.2`) creates a natural transition from clusters to individual pins as the user zooms in.

### Process Reflections

- **GitHub Issues and PRs** were essential for coordinating a 4-person team. Feature branches prevented merge conflicts and PRs provided a review checkpoint.
- **AI tools accelerated development** but required critical evaluation. The team found that AI suggestions for architecture and integration patterns needed adaptation to the specific constraints of our stack (e.g., Edge Runtime limitations, Socket.io in App Router context).
- **Scope management** was the biggest challenge. The initial plan included more features (e.g., post reactions, location autocomplete, friend suggestions), which were deliberately cut to ensure the core experience was polished.

### Concluding Remarks

InnerCircle demonstrates that constraining social connections can create a more meaningful online social experience. The 3D globe feed replaces infinite scrolling with spatial exploration, and the 25-friend cap forces intentional relationship management. While the platform is a course project, the underlying design philosophy — that less can be more in social media — represents a genuine departure from mainstream platform design.
