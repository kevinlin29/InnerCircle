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

We plan to implement the following five advanced features, of which at least two are required by the course:

1. **User Authentication and Authorization** : Registration, login, session management, and protected routes using Better Auth. Friend-based access control ensures only friends can view posts and send messages.

2. **Real-Time Functionality** : Live one-on-one chat via Socket.io, real-time notification delivery, and online/offline status indicators. No page refresh is required for new messages or notifications.

3. **File Handling and Processing** : Server-side image compression, thumbnail generation, and format conversion. Client-side image cropping before upload. Support for multiple image formats.

4. **Advanced State Management** : Redux Toolkit for managing feed, chat, notification, and friend status state across components. Centralized state enables consistent UI updates.

5. **Integration with External APIs** : AI-powered content moderation for uploaded images (flagging inappropriate content) and third-party image recognition for auto-suggesting post tags.

### Scope and Feasibility

The core application (auth, profiles, friend system, posts, feed) is achievable within the first few weeks using well-documented technologies (Next.js, Prisma, PostgreSQL). Real-time chat and notifications add complexity but Socket.io is a mature library with strong Next.js integration patterns. The friend cap mechanic is a simple database constraint. Image processing and cloud storage are well-supported by existing libraries (Sharp for image processing, AWS SDK for S3-compatible storage). The scope is intentionally bounded: we are building a focused, single-purpose app rather than a feature-rich general social platform, which keeps the project feasible within the course timeline.

## 3. Tentative Plan

### Team Responsibilities

<!-- TODO: Fill in actual member names and responsibilities -->

| Member | Primary Responsibilities |
|--------|------------------------|
| Qiwen Lin | Backend architecture design, database schema design (Prisma + PostgreSQL), real-time chat implementation, Socket.io integration, notification system logic |
| Irys Zhang | Authentication & authorization (Better Auth), friend system implementation (requests, cap enforcement, access control), API route development, server-side business logic |
| Weijie Zhu | Frontend UI/UX implementation (Home Feed, Profile, Friend Management), responsive design (mobile + desktop), Tailwind + shadcn/ui components, Redux Toolkit integration for global state |
| Zhengyang Li | Image upload pipeline (DigitalOcean Spaces integration), server-side image processing (compression, WebP conversion, thumbnails), AI content moderation API integration, performance optimization & deployment configuration |

### Week-by-Week Plan

**Week 1 : Project Setup and Core Infrastructure**
- Initialize Next.js project with TypeScript, Tailwind CSS, and Prisma
- Set up PostgreSQL database and define schema migrations
- Implement user authentication (registration, login, sessions) with Better Auth
- Create basic page layout and navigation structure

**Week 2 : Friend System and User Profiles**
- Build user profile pages (avatar upload, bio, display name)
- Implement friend request system (send, accept, decline) with enforced cap
- Set up DigitalOcean Spaces for image storage
- Begin server-side image processing pipeline

**Week 3 : Posts, Feed, and Interactions**
- Implement post creation (text + photo) with image upload
- Build home feed with friend-only visibility
- Add like and comment functionality
- Integrate client-side image cropping

**Week 4 : Real-Time Features**
- Set up Socket.io for WebSocket connections
- Implement one-on-one real-time chat
- Build notification system (friend requests, likes, comments, messages)
- Add online/offline status indicators

**Week 5 : Advanced Features and Polish**
- Integrate Redux Toolkit for global state management
- Connect AI content moderation API for image uploads
- Responsive design refinements for mobile
- Bug fixes, performance optimization, and edge case handling

**Week 6 : Testing, Deployment, and Final Submission**
- End-to-end testing of all features
- Deployment and final demo preparation
- Documentation and video demo recording

## 4. Initial Independent Reasoning (Before Using AI)

### Application Structure and Architecture

<!--
TODO: Describe your team's initial decisions about the overall structure of the application
(e.g., Next.js full-stack vs. separate frontend and backend).
Explain why this structure felt appropriate for your project goals and team skills.
-->

We chose a Next.js full-stack architecture early on because most team members had prior experience with React but limited backend experience. Next.js's built-in API routes and server actions meant we could avoid setting up a separate Express.js server, reducing the operational complexity of managing two codebases. The App Router's server components also offered a natural way to handle data fetching close to the database without building a full REST API layer first.

### Data and State Design

<!--
TODO: Outline your early thinking about how data would be stored, accessed, and shared across the system.
-->

Our initial thinking centered on PostgreSQL as the primary data store since the data (users, posts, friendships, messages) is highly relational. We planned to use an ORM (Prisma) to simplify queries and migrations. For client-side state, we initially debated between React Context and Redux Toolkit, and we leaned toward Redux because the app has multiple pieces of global state (feed, chat, notifications, online status) that need to stay synchronized across views. Real-time data (chat messages, notifications) would be pushed via WebSockets rather than polling.

### Feature Selection and Scope Decisions

<!--
TODO: Explain how your team initially decided on the core features and advanced features.
What tradeoffs did you consider?
-->

We started by listing features common to social media platforms and then scoped down based on our core concept (small, capped friend groups). We decided that the friend cap was the defining feature and everything else (posts, chat, notifications) should reinforce the intimate-group dynamic. We chose real-time chat over a stories feature because chat felt more essential to close-friend interaction. We considered group chats but deferred them to keep scope manageable, since one-on-one messaging is simpler and still serves the core use case. For advanced features, we selected authentication, real-time, and file handling because they were integral to the app, not bolted-on.

### Anticipated Challenges

<!--
TODO: Identify aspects your team expected to be most challenging before starting implementation.
-->

We expected real-time functionality to be the biggest challenge because none of us had prior experience with WebSockets or Socket.io in a Next.js context. Integrating Socket.io with Next.js's server architecture (which is serverless-oriented) was a known pain point we anticipated needing to research. Image processing on the server side was another concern, as handling upload, compression, and thumbnail generation in a performant way without blocking API routes. Finally, we were concerned about the complexity of friend-based access control: ensuring every query and API route correctly filters data to only show content from accepted friends.

### Early Collaboration Plan

<!--
TODO: Describe how responsibilities were initially expected to be divided and how the team planned to coordinate.
-->

We planned to divide work by feature area rather than by frontend/backend, so each member would own a vertical slice of the application (e.g., one person handles the entire chat feature from database to UI). This reduces coordination overhead and gives each member full-stack experience. We planned to coordinate via a shared GitHub repository with feature branches and pull requests for code review. Weekly sync meetings would be used to align on progress and resolve blockers.

## 5. AI Assistance Disclosure

### Which parts of the proposal were developed without AI assistance?

<!--
TODO: List the sections or ideas that were entirely your team's original work.
-->

The core concept of a friend-capped social platform, the motivation section, and the feature selection decisions were developed entirely through team discussion without AI assistance. The weekly plan breakdown and team responsibility division were also done independently based on our assessment of each member's skills.

### If AI was used, what specific tasks or drafts did it help with?

AI tools (Claude) were used to define detailed workflows of the application, such as the image upload and processing pipeline and the friend request flow. AI also helped fill in technical detail for the advanced features section (e.g., specifying exact fields in the database schema and elaborating on file handling steps). Additionally, AI assisted with restructuring and formatting the Markdown document for cleaner presentation.

### AI-influenced idea: explanation and team evaluation

Claude suggested including AI-powered content moderation as an advanced feature to satisfy the "External API Integration" course requirement. Our team discussed whether content moderation was truly necessary for a platform designed around small, trusted friend groups where users already know each other. We decided to keep it because it still serves as a safety net for inappropriate content, and scoping it to image uploads only (rather than text) keeps API costs manageable while meeting the requirement.
