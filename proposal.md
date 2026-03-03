# InnerCircle : A Small-Circle Social Media Platform

## Team Information

| Name | Student Number | Email |
|------|---------------|-------|
| Qiwen Lin | 1012495104 | qw.lin@mail.utoronto.ca |
| Irys Zhang | 1012794424 | irys.zhang@mail.utoronto.ca |
| Weijie Zhu | 1009310906 | weijie.zhu@mail.utoronto.ca |
| Zhengyang Li | 1012373977 | zhengyang.li@mail.utoronto.ca |


---

## 1. Motivation

Mainstream social media platforms like Instagram, Twitter, and Facebook encourage users to accumulate large follower counts and broadcast content to wide audiences. This design prioritizes engagement metrics over meaningful connection, often leading to shallow interactions, social comparison, and content overload.

Research consistently shows that people maintain meaningful relationships with only a small number of close friends (Dunbar's number suggests roughly 5-15 intimate connections). Yet, existing platforms provide little support for this kind of intimate sharing, as posts are often either fully public or restricted by clunky privacy settings.

**Existing solutions and their limitations**: Platforms like BeReal attempt to encourage authenticity but still operate on an open follower model with no cap on connections. Close Friends lists on Instagram are an afterthought rather than a core design principle. Group chats on messaging apps (WhatsApp, iMessage) lack the social feed and profile features that make social media engaging. None of these solutions structurally enforce small, meaningful networks.

**InnerCircle** addresses this gap by enforcing a limited friend count (approximately 20-30 connections max, configurable), ensuring that every post, message, and interaction happens within a small, trusted group. The platform is designed for users who want a social media experience that feels personal rather than performative.

**Target users**: Young adults and students who want to stay connected with close friends through photo sharing and real-time messaging, without the noise and pressure of large-scale social networks.

## 2. Objective and Key Features

### Objectives

- Build a full-stack social media web application that prioritizes intimate, small-group sharing over mass broadcasting
- Implement a friend system with an enforced cap on connections to encourage meaningful relationships
- Provide real-time chat and notifications so users can interact with friends instantly
- Support photo and text-based posts visible only to accepted friends
- Deliver a responsive, polished user experience across desktop and mobile devices

### Technical Implementation Approach

We will use a **Next.js Full-Stack** architecture (App Router with Server Components, API Routes, and Server Actions). This approach keeps the frontend and backend in a single codebase, simplifying deployment and enabling server-side rendering for performance. TypeScript is used throughout for type safety.

**Tech stack summary**:

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes and Server Actions
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: Better Auth (session-based)
- **Real-Time**: Socket.io for live chat and notifications
- **Cloud Storage**: DigitalOcean Spaces (S3-compatible) for user-uploaded photos
- **State Management**: Redux Toolkit for global client-side state
- **External APIs**: Cloud-based AI content moderation service

### Database Schema and Relationships

The core database schema includes the following tables and relationships:

- **User**: id, email, passwordHash, displayName, bio, avatarUrl, friendCapLimit, createdAt
- **Friendship**: id, requesterId → User, addresseeId → User, status (pending/accepted/declined), createdAt
- **Post**: id, authorId → User, textContent, createdAt
- **PostImage**: id, postId → Post, imageUrl, thumbnailUrl, orderIndex
- **Comment**: id, postId → Post, authorId → User, content, createdAt
- **Like**: id, postId → Post, userId → User, createdAt (unique constraint on postId + userId)
- **Message**: id, senderId → User, receiverId → User, content, readAt, createdAt
- **Notification**: id, recipientId → User, type (friend_request/new_post/like/comment/message), referenceId, read, createdAt

Key relationships: A User has many Posts, Comments, and Likes. Friendships are a self-referencing many-to-many relationship on User. Posts have many PostImages (one-to-many), Comments, and Likes. Messages are a one-to-one chat model between two Users.

### File Storage Requirements

User-uploaded images (profile avatars, post photos) are stored in DigitalOcean Spaces, an S3-compatible object storage service. Images are processed server-side before storage: compressed, resized, and converted to WebP format. Thumbnails are auto-generated for feed previews. A client-side cropping tool allows users to crop and resize images before upload to reduce bandwidth. Files are organized in buckets by type (`avatars/`, `posts/`), with unique filenames to prevent collisions.

### User Interface and Experience Design

The UI follows a clean, minimal aesthetic using Tailwind CSS and shadcn/ui components. Key views include:

- **Home Feed**: Chronological list of friend posts with like/comment actions
- **Profile Page**: User avatar, bio, friend list, and personal post history
- **Chat**: Real-time one-on-one messaging interface with message history
- **Friend Management**: Search users, send/accept/decline requests, view friend list with cap indicator
- **Notifications**: Real-time notification panel for friend requests, likes, comments, and messages

The layout is fully responsive, adapting from a sidebar navigation on desktop to a bottom tab bar on mobile.

### Advanced Features

We plan to implement the following five advanced features, of which at least two are required by the course. Each goes beyond basic CRUD and involves a distinct technical challenge:

1. **User Authentication and Authorization**: Registration, login, session management, and protected routes using Better Auth. Friend-based access control ensures only friends can view posts and send messages. The challenge is consistently enforcing friend-only visibility across every query and API route, not just the auth flow itself.

2. **Real-Time Functionality**: Live one-on-one chat via Socket.io, real-time notification delivery, and online/offline status indicators. No page refresh is required for new messages or notifications. The challenge is managing persistent WebSocket connections within Next.js's serverless-oriented architecture, which doesn't natively support long-lived connections.

3. **File Handling and Processing**: Server-side image compression, thumbnail generation, and format conversion. Client-side image cropping before upload. Support for multiple image formats. The challenge is coordinating an async pipeline (upload → validate → compress → generate thumbnail → store) without blocking API routes or consuming excessive memory.

4. **Advanced State Management**: Redux Toolkit for managing feed, chat, notification, and friend status state across components. Centralized state enables consistent UI updates. The challenge is keeping state consistent across multiple real-time data sources (WebSocket events, API responses, optimistic updates) without race conditions or stale data.

5. **Integration with External APIs**: AI-powered content moderation for uploaded images (flagging inappropriate content before they appear in friends' feeds). The challenge is handling async external calls with unpredictable latency and designing graceful degradation when the API is unavailable, so the core upload flow is never blocked by a third-party failure.

### Scope and Feasibility

We recognize this feature set is broad for a 6-week timeline, so our approach is to build MVP versions of each feature first before polishing any single one. The core loop (auth → add friends → create post → see feed) is the priority; chat, notifications, and image processing are secondary and will be scoped down if needed (e.g., notifications could fall back to polling instead of WebSockets, image processing could skip thumbnail generation). The friend cap mechanic is a simple database constraint. The technologies are all well-documented (Next.js, Prisma, PostgreSQL, Sharp, AWS SDK), and we are intentionally building a focused, single-purpose app rather than a general social platform.

**Risk mitigation**:

- **Socket.io + Next.js integration risk**: Next.js is serverless-oriented, and persistent WebSocket connections may not work cleanly with the default deployment model. If Socket.io integration proves too difficult within the Next.js server, our fallback is to run a lightweight standalone Socket.io server alongside the Next.js app and proxy connections to it. This isolates the real-time concern without rearchitecting the rest of the application.
- **External API availability/cost risk**: The AI content moderation API could become unavailable, rate-limited, or unexpectedly expensive. We will implement the moderation call as a non-blocking step: uploads succeed immediately and are visible to friends, while moderation runs asynchronously. If the API is down or returns an error, posts are flagged for manual review rather than rejected outright, so the core user experience is never blocked by a third-party dependency.

## 3. Tentative Plan

### Team Responsibilities

| Member | Primary Responsibilities |
|--------|------------------------|
| Qiwen Lin | Backend architecture design, database schema design (Prisma + PostgreSQL), real-time chat implementation, Socket.io integration, notification system logic |
| Irys Zhang | Authentication & authorization (Better Auth), friend system implementation (requests, cap enforcement, access control), API route development, server-side business logic |
| Weijie Zhu | Frontend UI/UX implementation (Home Feed, Profile, Friend Management), responsive design (mobile + desktop), Tailwind + shadcn/ui components, Redux Toolkit integration for global state |
| Zhengyang Li | Image upload pipeline (DigitalOcean Spaces integration), server-side image processing (compression, WebP conversion, thumbnails), AI content moderation API integration, performance optimization & deployment configuration |

### Week-by-Week Plan

**Week 1 (Mar 2–8): Project Setup, Auth, Profiles, and Friend System**
- Initialize Next.js project with TypeScript, Tailwind CSS, and Prisma
- Set up PostgreSQL database and define schema migrations
- Implement user authentication (registration, login, sessions) with Better Auth
- Set up Redux Toolkit store with initial slices (auth, UI)
- Create basic page layout and navigation structure
- Build user profile pages (avatar upload, bio, display name)
- Implement friend request system (send, accept, decline) with enforced cap
- Set up DigitalOcean Spaces for image storage

**Week 2 (Mar 9–15): Posts, Feed, Image Pipeline, and Real-Time Groundwork**
- Implement post creation (text + photo) with image upload
- Build home feed with friend-only visibility
- Add like and comment functionality
- Build server-side image processing pipeline (compression, WebP conversion, thumbnail generation)
- Integrate client-side image cropping
- Set up Socket.io server and establish basic WebSocket connections (groundwork for Week 3)
- Add feed and notification Redux slices

**Week 3 (Mar 16–22): Real-Time Chat, Notifications, and External API**
- Implement one-on-one real-time chat UI and message persistence
- Build notification system (friend requests, likes, comments, messages)
- Add online/offline status indicators
- If Socket.io integration with Next.js proves problematic, switch to standalone server fallback (see risk mitigation)
- Connect AI content moderation API for image uploads with async fallback

**Week 4 (Mar 23–27): Polish, Testing, and Final Submission**
- Responsive design refinements for mobile (bottom tab bar, touch targets)
- Performance optimization (image lazy loading, pagination for feed and chat history)
- Bug fixes and edge case handling across all features
- End-to-end testing of core user flows (signup → add friend → post → chat)
- Documentation and video demo recording

## 4. Initial Independent Reasoning (Before Using AI)

### Application Structure and Architecture

Honestly, the main reason we went with Next.js was that three of us had used React before but nobody was confident setting up a standalone backend from scratch. We briefly considered a React + Express split, but the idea of maintaining two repos, dealing with CORS, and deploying two services felt like a lot of overhead for a course project. Next.js API routes seemed like a shortcut to having a backend without actually "building a backend." We didn't fully understand the App Router vs. Pages Router tradeoff at first—we picked App Router mostly because it was the newer option and we figured we should learn it.

### Data and State Design

We knew we wanted PostgreSQL because the data is clearly relational (users have friends, posts belong to users, etc.), and a couple of us had used it in a databases course. We picked Prisma as the ORM mainly because it came up in every Next.js tutorial we found. For client-side state, we went back and forth between React Context and Redux—Context seemed simpler, but we were worried it would get messy once we had chat messages, notifications, and feed data all floating around. We didn't have a strong technical argument for Redux at this point, more of a gut feeling that we'd regret Context later. For real-time data, we knew we wanted WebSockets over polling, but hadn't figured out exactly how that would integrate with Next.js yet.

### Feature Selection and Scope Decisions

We started by brainstorming every social media feature we could think of—stories, reels, group chats, reactions, polls—and then tried to cut anything that didn't directly support the "small circle" idea. The friend cap was always the core concept, but we debated for a while whether to include group chats or just one-on-one messaging. Group chats would make sense for a small-circle platform, but we were worried about the added complexity (group creation, member management, typing indicators for multiple people) and decided to keep it to DMs for now. We also almost included a stories feature but cut it because it felt like scope creep and none of us were sure how to handle ephemeral content deletion cleanly. The advanced features we picked (auth, real-time, file handling) were mostly just things the app needed to work—we didn't want to bolt on something unrelated just to check a box.

### Anticipated Challenges

Real-time chat scared us the most. None of us had used WebSockets before, and from what we read online, Socket.io and Next.js don't play together that naturally since Next.js leans serverless and WebSockets need persistent connections. We weren't sure if we'd need a separate server just for chat or if there was a way to make it work within Next.js. Image processing was another unknown—we knew libraries like Sharp existed, but we hadn't actually done server-side image manipulation before and were worried about it being slow or memory-heavy. The friend-based access control also felt like it could get tricky: it's easy to forget a check somewhere and accidentally leak a post to a non-friend, and we didn't have a clear pattern in mind for how to enforce it consistently across every route.

### Early Collaboration Plan

We initially talked about dividing work by feature area (vertical slices), where each person would own an entire feature from database to UI. But when we actually tried to assign work, it made more sense to split by skill and comfort level — one person on frontend, one on backend architecture, one on auth and API routes, one on the image/storage pipeline. We figured this would let each person go deeper in their area instead of everyone context-switching between frontend and backend constantly. We planned to coordinate via a shared GitHub repository with feature branches and pull requests. Weekly syncs would keep everyone aligned and catch integration issues early, since the horizontal split means we'd need to be more deliberate about connecting each other's work.

## 5. AI Assistance Disclosure

### Which parts of the proposal were developed without AI assistance?

The core concept of a friend-capped social platform, the motivation section, and the feature selection decisions all came from team discussions—those sections reflect what we actually care about building and why. The weekly plan breakdown and team responsibility division were also done independently, based on what each person felt comfortable owning.

### If AI was used, what specific tasks or drafts did it help with?

We used Claude to flesh out technical details that we had vague ideas about but couldn't articulate precisely—for example, we knew we wanted "image upload and compression" but Claude helped us think through the specific pipeline (client-side crop → upload → server-side compress → generate thumbnail → store in S3). Similarly, the database schema fields were partly AI-generated: we had the tables in mind but Claude suggested specific columns like `thumbnailUrl` and `orderIndex` that we hadn't considered. Claude also helped restructure the Markdown document, which is worth noting because the polished formatting doesn't reflect how messy our original draft was.

### AI-influenced idea: explanation and team evaluation

Claude suggested including AI-powered content moderation as an advanced feature to satisfy the "External API Integration" course requirement. This was a case where the AI pushed us toward something we probably wouldn't have thought of on our own. We debated it honestly—content moderation feels a bit unnecessary for a platform where you only share with 20-30 close friends who you presumably trust. But we decided to keep it for two reasons: it genuinely satisfies the external API requirement without feeling completely forced, and it gave us a chance to think about what happens when a third-party service fails (which led to the fallback design in our risk mitigation section). In retrospect, the AI was most useful for filling in implementation details we lacked the experience to specify, but the high-level decisions about what to build and why still came from us.
