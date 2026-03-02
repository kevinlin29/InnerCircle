# InnerCircle — A Small-Circle Social Media Platform

## Team Information

| Name | Student Number | Email |
|------|---------------|-------|
| Qiwen Lin | 101| qw.lin@mail.utoronto.ca |
| Member 2 | | |
| Member 3 | | |
| Member 4 | | |

## Motivation

Mainstream social media platforms like Instagram, Twitter, and Facebook encourage users to accumulate large follower counts and broadcast content to wide audiences. This design prioritizes engagement metrics over meaningful connection, often leading to shallow interactions, social comparison, and content overload.

Research consistently shows that people maintain meaningful relationships with only a small number of close friends. Yet, existing platforms provide little support for this kind of intimate sharing — posts are either fully public or hidden behind clunky privacy settings.

**InnerCircle** addresses this gap by enforcing a limited friend count (approximately 20–30 connections max, but configurable), ensuring that every post, message, and interaction happens within a small, trusted group. The platform is designed for users who want a social media experience that feels personal rather than performative.

**Target users**: Young adults and students who want to stay connected with close friends through photo sharing and real-time messaging, without the noise and pressure of large-scale social networks.

## Objectives

- Build a full-stack social media web application that prioritizes intimate, small-group sharing over mass broadcasting
- Implement a friend system with an enforced cap on connections to encourage meaningful relationships
- Provide real-time chat and notifications so users can interact with friends instantly
- Support photo and text-based posts visible only to accepted friends
- Deliver a responsive, polished user experience across desktop and mobile devices

## Technical Stack

- **Architecture**: Next.js Full-Stack (App Router, Server Components, API Routes, Server Actions)
- **Frontend**: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes and Server Actions (TypeScript)
- **Database**: PostgreSQL
- **Cloud Storage**: DigitalOcean Spaces (or AWS S3) for user-uploaded photos and media
- **Authentication**: Better Auth for session-based authentication and authorization
- **Real-Time**: WebSockets (Socket.io) for live chat and notifications
- **State Management**: Redux Toolkit for global client-side state
- **External APIs**: Cloud-based AI content moderation, image recognition
- **Advanced Features**:
  1. User Authentication and Authorization (Better Auth — registration, login, session management, protected routes, friend-based access control)
  2. Real-Time Functionality (Socket.io — live chat between friends, real-time notifications for friend requests, new posts, and messages)
  3. File Handling and Processing (server-side image compression, thumbnail generation, client-side image cropping before upload)
  4. Advanced State Management (Redux Toolkit — managing feed, chat, notifications, and online status across components)
  5. Integration with External APIs (AI-powered content moderation for uploaded images, and/or third-party image processing services)

## Features

### Core Features

- **User Authentication**: Registration, login/logout, session management, and protected routes using Better Auth
- **User Profiles**: Profile page with avatar upload, display name, bio, and friend list
- **Friend System with Cap**: Send/accept/decline friend requests with an enforced maximum friend count (~20–30). Users must remove an existing friend before adding a new one once at the cap
- **Photo & Text Posts**: Create posts with text, photos, or both. Posts are visible only to accepted friends in a chronological feed
- **Feed**: A home feed showing recent posts from all friends, with the ability to like and comment
- **Real-Time Chat**: One-on-one messaging with friends, delivered instantly via WebSockets
- **Notifications**: Real-time notifications for friend requests, new messages, likes, and comments
- **Responsive Design**: Fully responsive UI that works on desktop and mobile browsers

### Advanced Feature 1: User Authentication and Authorization
- User registration with email and password
- Session-based authentication using Better Auth
- Protected API routes and pages
- Friend-based access control (only friends can view posts and send messages)

### Advanced Feature 2: Real-Time Functionality
- Live one-on-one chat between friends using Socket.io
- Real-time notification delivery (friend requests, new posts, likes, comments)
- Online/offline status indicators for friends
- No page refresh required for new messages or notifications

### Advanced Feature 3: File Handling and Processing
- Server-side image compression and optimization for uploaded photos
- Automatic thumbnail generation for feed previews
- Client-side image cropping and resizing before upload
- Support for multiple image formats with automatic conversion

### Advanced Feature 4: Advanced State Management
- Redux Toolkit for managing global application state
- Centralized feed state shared across components (feed, profile, notifications)
- Real-time chat state with message history and delivery status
- Notification state synchronized across views
- Online/offline friend status tracked globally

### Advanced Feature 5: Integration with External APIs
- AI-powered content moderation for uploaded images (e.g., flagging inappropriate content)
- Third-party image recognition or tagging service for auto-suggesting post tags
- Optional: email notification service (e.g., SendGrid) for friend request alerts when offline

## User Guide

<!-- To be completed after implementation — will include screenshots and step-by-step usage instructions -->

## Development Guide

### Prerequisites

- Node.js (v18+)
- PostgreSQL
- A DigitalOcean Spaces or AWS S3 account for cloud storage

### Environment Setup

<!-- To be completed — will include .env.example and configuration steps -->

### Database Initialization

<!-- To be completed — will include schema migration instructions -->

### Cloud Storage Configuration

<!-- To be completed — will include bucket setup and credential configuration -->

### Running Locally

<!-- To be completed — will include npm install, dev server, and database setup commands -->

## Deployment

<!-- To be completed if applicable -->

## Video Demo

<!-- To be completed — include video URL here -->

## AI Assistance & Verification

<!-- To be completed after development — reference ai-session.md for details -->

### Where AI Contributed

### Representative AI Mistake or Limitation

### How Correctness Was Verified

## Individual Contributions

| Member | Contributions |
|--------|--------------|
| Member 1 | |
| Member 2 | |
| Member 3 | |
| Member 4 | |

## Lessons Learned and Concluding Remarks

<!-- To be completed after development -->
