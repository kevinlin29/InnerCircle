# InnerCircle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack small-circle social media platform with enforced friend caps, real-time chat, image processing, and AI content moderation.

**Architecture:** Next.js 14+ App Router full-stack application. Server Components for data fetching, API Routes for REST endpoints, Server Actions for mutations. A standalone custom HTTP server wraps the Next.js app to support Socket.io persistent WebSocket connections. PostgreSQL via Prisma ORM for data. DigitalOcean Spaces (S3-compatible) for file storage. Redux Toolkit for client-side state management.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, Better Auth, Socket.io, Redux Toolkit, Sharp (image processing), AWS SDK v3 (S3-compatible client), AI moderation API

---

## Architecture Review Notes

The following key decisions were validated by architecture review and are baked into this plan:

### 1. Custom Server for Socket.io (Day 1, not a fallback)
Next.js API Routes/App Router **cannot** handle WebSocket upgrades. The plan uses a custom `server.ts` from the start that creates an HTTP server, attaches Socket.io, then passes non-WebSocket traffic to Next.js. This is ~40 lines and eliminates the integration risk entirely.

### 2. Redux Scope — Only for Real-Time State
Redux Toolkit + React Server Components are in tension. This plan uses Redux **only** for truly global real-time state (notification counts, unread messages, online/offline presence, chat messages). Feed data and friend lists are fetched server-side via Server Components or API calls. This satisfies the "Advanced State Management" rubric requirement without the RSC impedance mismatch.

### 3. Add a Conversation Model for Chat
The flat `Message(senderId, receiverId)` schema makes conversation queries inefficient. This plan adds a `Conversation` table so listing conversations, showing unread counts, and paginating message history are all straightforward queries.

### 4. Centralized Friend-Based Access Control
Every API route must call `requireSession()` and `assertFriendship()` from a single `src/lib/auth-utils.ts` module. Never inline friend-checks in route handlers. One file to audit.

### 5. Friend Cap Race Condition — Use Prisma Transactions
The accept-friend-request handler wraps the count-check and status-update in a `prisma.$transaction()` to prevent concurrent accepts from exceeding the cap.

### 6. Prisma Singleton for Dev Hot-Reload
The `src/lib/prisma.ts` file uses a `globalThis` singleton pattern to prevent connection pool exhaustion during Next.js hot-reloads.

### 7. Image Pipeline — Compress Before Upload
Sharp processes images server-side before uploading to S3 (not after). Client-side file size limit of 5-10MB keeps Sharp's work manageable. No background job queue needed for a course project.

### 8. Scope Risk Awareness
The course warns against "too broad" projects and specifically names social media platforms. The presentation must emphasize the friend cap as a **structural constraint** (not just a config flag) and demonstrate depth over breadth. Function > form in Weeks 1-2; polish in Week 3.

---

## Phase 1: Project Scaffolding & Database (Days 1-2)

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `tsconfig.json` (auto-generated)
- Create: `tailwind.config.ts` (auto-generated)
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Scaffold Next.js with TypeScript and Tailwind**

```bash
npx create-next-app@latest innercircle --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

This creates the base Next.js project with App Router, TypeScript, Tailwind CSS, and ESLint pre-configured. Use the `src/` directory convention.

**Step 2: Install core dependencies**

```bash
cd innercircle

# UI components
npx shadcn@latest init

# Database
npm install prisma @prisma/client

# Authentication
npm install better-auth

# Real-time
npm install socket.io socket.io-client

# State management
npm install @reduxjs/toolkit react-redux

# Image processing
npm install sharp

# S3-compatible storage (DigitalOcean Spaces)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Utilities
npm install zod date-fns uuid
npm install -D @types/uuid
```

**Step 3: Create `.env.example`**

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/innercircle"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"

# DigitalOcean Spaces / S3
S3_ENDPOINT="https://nyc3.digitaloceanspaces.com"
S3_REGION="nyc3"
S3_BUCKET="innercircle-uploads"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"

# AI Content Moderation
MODERATION_API_KEY="your-moderation-api-key"
MODERATION_API_URL="https://api.moderationservice.com/v1/analyze"

# Socket.io
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
```

**Step 4: Copy `.env.example` to `.env` and fill in real values**

**Step 5: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js project with core dependencies"
```

---

### Task 2: Define Prisma Schema and Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`

**Step 1: Initialize Prisma**

```bash
npx prisma init
```

**Step 2: Define the full database schema**

Write `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  emailVerified  Boolean  @default(false)
  name           String
  image          String?  // avatar URL
  bio            String?  @default("")
  friendCapLimit Int      @default(25)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Better Auth fields
  sessions Session[]
  accounts Account[]

  // App relationships
  sentRequests     Friendship[] @relation("FriendshipRequester")
  receivedRequests Friendship[] @relation("FriendshipAddressee")
  posts            Post[]
  comments         Comment[]
  likes            Like[]
  sentMessages      Message[]       @relation("MessageSender")
  conversationsAsA  Conversation[]  @relation("ConversationParticipantA")
  conversationsAsB  Conversation[]  @relation("ConversationParticipantB")
  notifications     Notification[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Verification {
  id         String    @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime? @default(now())
  updatedAt  DateTime? @updatedAt
}

enum FriendshipStatus {
  PENDING
  ACCEPTED
  DECLINED
}

model Friendship {
  id          String           @id @default(cuid())
  requesterId String
  addresseeId String
  status      FriendshipStatus @default(PENDING)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  requester User @relation("FriendshipRequester", fields: [requesterId], references: [id], onDelete: Cascade)
  addressee User @relation("FriendshipAddressee", fields: [addresseeId], references: [id], onDelete: Cascade)

  @@unique([requesterId, addresseeId])
  @@index([addresseeId])
}

model Post {
  id          String      @id @default(cuid())
  authorId    String
  textContent String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  author   User        @relation(fields: [authorId], references: [id], onDelete: Cascade)
  images   PostImage[]
  comments Comment[]
  likes    Like[]

  @@index([authorId])
  @@index([createdAt])
}

model PostImage {
  id           String @id @default(cuid())
  postId       String
  imageUrl     String
  thumbnailUrl String?
  orderIndex   Int    @default(0)

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([postId])
}

model Comment {
  id        String   @id @default(cuid())
  postId    String
  authorId  String
  content   String
  createdAt DateTime @default(now())

  post   Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  author User @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([postId])
}

model Like {
  id        String   @id @default(cuid())
  postId    String
  userId    String
  createdAt DateTime @default(now())

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([postId, userId])
  @@index([postId])
}

model Conversation {
  id             String   @id @default(cuid())
  participantAId String
  participantBId String
  lastMessageAt  DateTime @default(now())
  createdAt      DateTime @default(now())

  participantA User      @relation("ConversationParticipantA", fields: [participantAId], references: [id], onDelete: Cascade)
  participantB User      @relation("ConversationParticipantB", fields: [participantBId], references: [id], onDelete: Cascade)
  messages     Message[]

  @@unique([participantAId, participantBId])
  @@index([participantAId])
  @@index([participantBId])
  @@index([lastMessageAt])
}

model Message {
  id             String    @id @default(cuid())
  conversationId String
  senderId       String
  content        String
  readAt         DateTime?
  createdAt      DateTime  @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender       User         @relation("MessageSender", fields: [senderId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
}

enum NotificationType {
  FRIEND_REQUEST
  FRIEND_ACCEPT
  NEW_POST
  LIKE
  COMMENT
  MESSAGE
}

model Notification {
  id          String           @id @default(cuid())
  recipientId String
  type        NotificationType
  referenceId String?
  message     String
  read        Boolean          @default(false)
  createdAt   DateTime         @default(now())

  recipient User @relation(fields: [recipientId], references: [id], onDelete: Cascade)

  @@index([recipientId, read])
  @@index([createdAt])
}
```

**Step 3: Create Prisma client singleton**

Write `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 4: Run initial migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration creates all tables in PostgreSQL.

**Step 5: Verify with Prisma Studio**

```bash
npx prisma studio
```

Expected: Opens browser showing all tables with correct columns and relations.

**Step 6: Commit**

```bash
git add prisma/ src/lib/prisma.ts
git commit -m "feat: define Prisma schema with all models and run initial migration"
```

---

## Phase 2: Authentication (Days 2-3)

### Task 3: Set Up Better Auth Server

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...all]/route.ts`
- Create: `src/lib/auth-client.ts`

**Step 1: Create the Better Auth server instance**

Write `src/lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      bio: { type: "string", required: false, defaultValue: "" },
      friendCapLimit: { type: "number", required: false, defaultValue: 25 },
    },
  },
});
```

**Step 2: Create the API route handler**

Write `src/app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
```

**Step 3: Create the auth client for frontend use**

Write `src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

**Step 4: Commit**

```bash
git add src/lib/auth.ts src/lib/auth-client.ts src/app/api/auth/
git commit -m "feat: configure Better Auth with Prisma adapter and Next.js route handler"
```

---

### Task 4: Build Auth UI (Sign Up, Sign In, Sign Out)

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/components/auth/login-form.tsx`
- Create: `src/components/auth/register-form.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Install shadcn/ui components needed for auth forms**

```bash
npx shadcn@latest add button input label card form toast
```

**Step 2: Create the registration form component**

Write `src/components/auth/register-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signUp.email({ name, email, password });

    if (error) {
      setError(error.message ?? "Registration failed");
      setLoading(false);
      return;
    }

    router.push("/feed");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Join InnerCircle and connect with your closest friends.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline">Sign in</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Create the login form component**

Write `src/components/auth/login-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signIn.email({ email, password });

    if (error) {
      setError(error.message ?? "Login failed");
      setLoading(false);
      return;
    }

    router.push("/feed");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>Sign in to your InnerCircle account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary underline">Sign up</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 4: Create auth layout and pages**

Write `src/app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}
```

Write `src/app/(auth)/login/page.tsx`:

```typescript
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return <LoginForm />;
}
```

Write `src/app/(auth)/register/page.tsx`:

```typescript
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return <RegisterForm />;
}
```

**Step 5: Add auth middleware for protected routes**

Write `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const publicPaths = ["/login", "/register", "/"];

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.includes(pathname)) {
    // Redirect logged-in users away from auth pages
    if (sessionCookie && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/feed", request.url));
    }
    return NextResponse.next();
  }

  // Protect all other routes
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add auth UI (login, register) with route protection middleware"
```

---

### Task 5: Create Auth Helper for Server Components & API Routes

**Files:**
- Create: `src/lib/auth-utils.ts`

**Step 1: Create server-side auth utility**

Write `src/lib/auth-utils.ts`:

```typescript
import { headers } from "next/headers";
import { auth } from "./auth";
import { redirect } from "next/navigation";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireSessionForApi() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
```

**Step 2: Commit**

```bash
git add src/lib/auth-utils.ts
git commit -m "feat: add server-side auth helpers (getSession, requireSession)"
```

---

## Phase 3: App Layout & Navigation (Days 3-4)

### Task 6: Build Main App Layout with Sidebar/Bottom Nav

**Files:**
- Create: `src/app/(main)/layout.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/mobile-nav.tsx`
- Create: `src/components/layout/user-menu.tsx`

**Step 1: Install additional shadcn/ui components**

```bash
npx shadcn@latest add avatar dropdown-menu separator sheet badge scroll-area tabs dialog textarea tooltip popover
```

**Step 2: Create sidebar navigation**

Write `src/components/layout/sidebar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MessageCircle, Bell, User, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r bg-card h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold">InnerCircle</h1>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={() => signOut({ fetchOptions: { onSuccess: () => window.location.href = "/login" } })}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
```

**Step 3: Create mobile bottom navigation**

Write `src/components/layout/mobile-nav.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MessageCircle, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 text-xs",
              pathname === item.href
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

**Step 4: Create the main app layout**

Write `src/app/(main)/layout.tsx`:

```typescript
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
```

**Step 5: Create placeholder pages for each route**

Write `src/app/(main)/feed/page.tsx`:

```typescript
export default function FeedPage() {
  return <div className="p-6"><h1 className="text-2xl font-bold">Feed</h1></div>;
}
```

Create similar placeholder files for:
- `src/app/(main)/friends/page.tsx`
- `src/app/(main)/chat/page.tsx`
- `src/app/(main)/notifications/page.tsx`
- `src/app/(main)/profile/page.tsx`

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add main layout with sidebar nav (desktop) and bottom tab bar (mobile)"
```

---

## Phase 4: Friend System (Days 4-6)

### Task 7: Friend System API Routes

**Files:**
- Create: `src/app/api/friends/route.ts` — list friends
- Create: `src/app/api/friends/request/route.ts` — send friend request
- Create: `src/app/api/friends/respond/route.ts` — accept/decline
- Create: `src/app/api/friends/remove/route.ts` — remove friend
- Create: `src/app/api/users/search/route.ts` — search users
- Create: `src/lib/friends.ts` — shared friend query helpers

**Step 1: Create friend query helpers**

Write `src/lib/friends.ts`:

```typescript
import { prisma } from "./prisma";

/** Get all accepted friend IDs for a user */
export async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });

  return friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );
}

/** Check if two users are friends */
export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId1, addresseeId: userId2 },
        { requesterId: userId2, addresseeId: userId1 },
      ],
    },
  });
  return !!friendship;
}

/** Get friend count for a user */
export async function getFriendCount(userId: string): Promise<number> {
  return prisma.friendship.count({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
}
```

**Step 2: Create friend list API**

Write `src/app/api/friends/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireSessionForApi();
    const userId = session.user.id;

    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, name: true, image: true, bio: true } },
        addressee: { select: { id: true, name: true, image: true, bio: true } },
      },
    });

    const friends = friendships.map((f) =>
      f.requesterId === userId ? f.addressee : f.requester
    );

    return NextResponse.json({ friends });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

**Step 3: Create friend request API**

Write `src/app/api/friends/request/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getFriendCount } from "@/lib/friends";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionForApi();
    const userId = session.user.id;
    const { addresseeId } = await req.json();

    if (userId === addresseeId) {
      return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });
    }

    // Check friend cap for requester
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { friendCapLimit: true } });
    const friendCount = await getFriendCount(userId);
    if (user && friendCount >= user.friendCapLimit) {
      return NextResponse.json({ error: "You have reached your friend limit" }, { status: 400 });
    }

    // Check if friendship already exists
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId },
          { requesterId: addresseeId, addresseeId: userId },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Friend request already exists" }, { status: 400 });
    }

    const friendship = await prisma.friendship.create({
      data: { requesterId: userId, addresseeId },
    });

    // Create notification for addressee
    await prisma.notification.create({
      data: {
        recipientId: addresseeId,
        type: "FRIEND_REQUEST",
        referenceId: friendship.id,
        message: `${session.user.name} sent you a friend request`,
      },
    });

    return NextResponse.json({ friendship });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

**Step 4: Create respond to friend request API**

Write `src/app/api/friends/respond/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getFriendCount } from "@/lib/friends";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionForApi();
    const userId = session.user.id;
    const { friendshipId, action } = await req.json(); // action: "accept" | "decline"

    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });

    if (!friendship || friendship.addresseeId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (friendship.status !== "PENDING") {
      return NextResponse.json({ error: "Already responded" }, { status: 400 });
    }

    if (action === "accept") {
      // Check friend cap for accepter
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { friendCapLimit: true } });
      const friendCount = await getFriendCount(userId);
      if (user && friendCount >= user.friendCapLimit) {
        return NextResponse.json({ error: "You have reached your friend limit" }, { status: 400 });
      }

      await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: "ACCEPTED" },
      });

      // Notify the requester
      await prisma.notification.create({
        data: {
          recipientId: friendship.requesterId,
          type: "FRIEND_ACCEPT",
          referenceId: friendship.id,
          message: `${session.user.name} accepted your friend request`,
        },
      });
    } else {
      await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: "DECLINED" },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

**Step 5: Create remove friend API**

Write `src/app/api/friends/remove/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionForApi();
    const userId = session.user.id;
    const { friendId } = await req.json();

    await prisma.friendship.deleteMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

**Step 6: Create user search API**

Write `src/app/api/users/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSessionForApi();
    const query = req.nextUrl.searchParams.get("q") ?? "";

    if (query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: session.user.id } },
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: { id: true, name: true, image: true, bio: true },
      take: 20,
    });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: implement friend system API (request, accept, decline, remove, search)"
```

---

### Task 8: Friend System UI

**Files:**
- Create: `src/app/(main)/friends/page.tsx` (replace placeholder)
- Create: `src/components/friends/friend-list.tsx`
- Create: `src/components/friends/friend-requests.tsx`
- Create: `src/components/friends/user-search.tsx`
- Create: `src/components/friends/friend-cap-indicator.tsx`

This task builds the full Friends page with three tabs: My Friends, Pending Requests, and Find Friends. Each tab is its own component. The friend cap indicator shows "12 / 25 friends" with a progress bar.

**Key implementation details:**
- Use `Tabs` from shadcn/ui for the three-tab layout
- `UserSearch` uses a debounced input that hits `/api/users/search?q=`
- Each search result shows an "Add Friend" button (disabled if either user is at cap)
- `FriendRequests` shows incoming pending requests with Accept/Decline buttons
- `FriendList` shows all accepted friends with a "Remove" button (with confirmation dialog)
- `FriendCapIndicator` is a progress bar showing `currentCount / capLimit`

**Step 1: Build each component with the patterns above**

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add friends page UI (friend list, requests, search, cap indicator)"
```

---

## Phase 5: Posts & Feed (Days 5-7)

### Task 9: Post Creation & Feed API

**Files:**
- Create: `src/app/api/posts/route.ts` — GET feed, POST create
- Create: `src/app/api/posts/[postId]/route.ts` — GET single post, DELETE
- Create: `src/app/api/posts/[postId]/like/route.ts` — POST toggle like
- Create: `src/app/api/posts/[postId]/comments/route.ts` — GET & POST comments

**Step 1: Create the posts API**

Write `src/app/api/posts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getFriendIds } from "@/lib/friends";

// GET /api/posts — feed (friends' posts, chronological)
export async function GET(req: NextRequest) {
  try {
    const session = await requireSessionForApi();
    const userId = session.user.id;

    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = 20;

    const friendIds = await getFriendIds(userId);
    const authorIds = [userId, ...friendIds]; // include own posts

    const posts = await prisma.post.findMany({
      where: { authorId: { in: authorIds } },
      include: {
        author: { select: { id: true, name: true, image: true } },
        images: { orderBy: { orderIndex: "asc" } },
        _count: { select: { comments: true, likes: true } },
        likes: { where: { userId }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;

    return NextResponse.json({
      posts: items.map((post) => ({
        ...post,
        isLiked: post.likes.length > 0,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        likes: undefined,
        _count: undefined,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// POST /api/posts — create a new post
export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionForApi();
    const userId = session.user.id;
    const { textContent, imageUrls } = await req.json();

    if (!textContent && (!imageUrls || imageUrls.length === 0)) {
      return NextResponse.json({ error: "Post must have text or images" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        authorId: userId,
        textContent: textContent ?? null,
        images: imageUrls?.length
          ? {
              create: imageUrls.map((img: { url: string; thumbnail: string }, i: number) => ({
                imageUrl: img.url,
                thumbnailUrl: img.thumbnail,
                orderIndex: i,
              })),
            }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        images: { orderBy: { orderIndex: "asc" } },
      },
    });

    return NextResponse.json({ post });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

**Step 2: Create like toggle API**

Write `src/app/api/posts/[postId]/like/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { areFriends } from "@/lib/friends";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await requireSessionForApi();
    const userId = session.user.id;
    const { postId } = await params;

    // Verify post exists and user has access (is friend of author)
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (post.authorId !== userId && !(await areFriends(userId, post.authorId))) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Toggle like
    const existingLike = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      return NextResponse.json({ liked: false });
    } else {
      await prisma.like.create({ data: { postId, userId } });

      // Notify post author (if not self-like)
      if (post.authorId !== userId) {
        await prisma.notification.create({
          data: {
            recipientId: post.authorId,
            type: "LIKE",
            referenceId: postId,
            message: `${session.user.name} liked your post`,
          },
        });
      }

      return NextResponse.json({ liked: true });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

**Step 3: Create comments API**

Write `src/app/api/posts/[postId]/comments/route.ts` — similar pattern: GET returns paginated comments, POST creates a comment with friend-check and notification.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: implement posts API (feed, create, like, comment) with friend-based access control"
```

---

### Task 10: Feed & Post UI

**Files:**
- Rewrite: `src/app/(main)/feed/page.tsx`
- Create: `src/components/feed/post-card.tsx`
- Create: `src/components/feed/create-post.tsx`
- Create: `src/components/feed/comment-section.tsx`
- Create: `src/components/feed/image-gallery.tsx`

**Key implementation details:**
- Feed page fetches from `/api/posts` with infinite scroll (IntersectionObserver)
- `CreatePost` component at top of feed with text area + image upload button
- `PostCard` shows author avatar, name, timestamp, text, image gallery, like button with count, comment count
- `CommentSection` expands inline on a post card when clicked
- `ImageGallery` displays post images in a grid (1 image = full width, 2 = side by side, 3+ = grid)
- Like button uses optimistic update pattern (update UI immediately, revert on error)

**Step 1: Build each component**

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add feed page UI with post cards, create post, comments, and image gallery"
```

---

## Phase 6: User Profiles (Days 6-7)

### Task 11: Profile API & UI

**Files:**
- Create: `src/app/api/users/[userId]/route.ts` — GET user profile
- Rewrite: `src/app/(main)/profile/page.tsx` — own profile
- Create: `src/app/(main)/profile/[userId]/page.tsx` — other user's profile
- Create: `src/components/profile/profile-header.tsx`
- Create: `src/components/profile/edit-profile-dialog.tsx`

**Key implementation details:**
- Profile shows avatar, name, bio, friend count / cap, and the user's posts
- Edit Profile dialog allows changing name, bio, and avatar (image upload)
- Viewing another user's profile: if not friends, show limited info + "Add Friend" button; if friends, show full profile + posts
- Profile API enforces friend-based visibility

**Step 1: Build API route and components**

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add profile page with edit dialog and friend-based visibility"
```

---

## Phase 7: Image Upload & Processing Pipeline (Days 7-9)

### Task 12: S3-Compatible Storage Client

**Files:**
- Create: `src/lib/storage.ts`

**Step 1: Create the storage utility**

Write `src/lib/storage.ts`:

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "nyc3",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: false,
});

const BUCKET = process.env.S3_BUCKET!;

export async function uploadFile(
  buffer: Buffer,
  folder: string,
  contentType: string,
  extension: string
): Promise<string> {
  const key = `${folder}/${uuid()}.${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  return `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`;
}

export async function deleteFile(url: string): Promise<void> {
  const key = url.split(`/${BUCKET}/`)[1];
  if (!key) return;

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}
```

**Step 2: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: add S3-compatible storage utility for DigitalOcean Spaces"
```

---

### Task 13: Image Processing Pipeline

**Files:**
- Create: `src/lib/image-processing.ts`
- Create: `src/app/api/upload/route.ts`

**Step 1: Create image processing utility**

Write `src/lib/image-processing.ts`:

```typescript
import sharp from "sharp";

interface ProcessedImage {
  buffer: Buffer;
  thumbnail: Buffer;
  contentType: string;
  extension: string;
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  // Compress and convert to WebP
  const buffer = await sharp(input)
    .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // Generate thumbnail
  const thumbnail = await sharp(input)
    .resize(400, 400, { fit: "cover" })
    .webp({ quality: 60 })
    .toBuffer();

  return {
    buffer,
    thumbnail,
    contentType: "image/webp",
    extension: "webp",
  };
}

export async function processAvatar(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize(256, 256, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();
}
```

**Step 2: Create the upload API route**

Write `src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { processImage, processAvatar } from "@/lib/image-processing";
import { uploadFile } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionForApi();
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "post" | "avatar"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    if (type === "avatar") {
      const processed = await processAvatar(inputBuffer);
      const url = await uploadFile(processed, "avatars", "image/webp", "webp");
      return NextResponse.json({ url });
    }

    // Post image
    const { buffer, thumbnail, contentType, extension } = await processImage(inputBuffer);
    const url = await uploadFile(buffer, "posts", contentType, extension);
    const thumbnailUrl = await uploadFile(thumbnail, "posts/thumbnails", contentType, extension);

    return NextResponse.json({ url, thumbnailUrl });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add image processing pipeline (compress, resize, WebP, thumbnails) and upload API"
```

---

### Task 14: Client-Side Image Cropping Component

**Files:**
- Create: `src/components/upload/image-cropper.tsx`
- Create: `src/components/upload/image-upload-button.tsx`

**Key implementation details:**
- Install `react-image-crop` for client-side cropping
- `ImageCropper` opens in a dialog, allows crop + aspect ratio selection, outputs cropped blob
- `ImageUploadButton` combines file input + cropper dialog + upload to `/api/upload`
- Show loading state during upload

**Step 1: Install react-image-crop**

```bash
npm install react-image-crop
```

**Step 2: Build components**

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add client-side image cropping component"
```

---

## Phase 8: Redux Toolkit State Management (Days 8-10)

### Task 15: Redux Store Setup

**Files:**
- Create: `src/store/store.ts`
- Create: `src/store/provider.tsx`
- Create: `src/store/slices/feedSlice.ts`
- Create: `src/store/slices/chatSlice.ts`
- Create: `src/store/slices/notificationSlice.ts`
- Create: `src/store/slices/friendSlice.ts`
- Modify: `src/app/(main)/layout.tsx` — wrap with Redux Provider

**Step 1: Create the Redux store**

Write `src/store/store.ts`:

```typescript
import { configureStore } from "@reduxjs/toolkit";
import feedReducer from "./slices/feedSlice";
import chatReducer from "./slices/chatSlice";
import notificationReducer from "./slices/notificationSlice";
import friendReducer from "./slices/friendSlice";

export const store = configureStore({
  reducer: {
    feed: feedReducer,
    chat: chatReducer,
    notifications: notificationReducer,
    friends: friendReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

Write `src/store/provider.tsx`:

```typescript
"use client";

import { Provider } from "react-redux";
import { store } from "./store";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
```

**Step 2: Create the feed slice (example of pattern for all slices)**

Write `src/store/slices/feedSlice.ts`:

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

interface Post {
  id: string;
  authorId: string;
  author: { id: string; name: string; image: string | null };
  textContent: string | null;
  images: { id: string; imageUrl: string; thumbnailUrl: string | null; orderIndex: number }[];
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

interface FeedState {
  posts: Post[];
  nextCursor: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: FeedState = {
  posts: [],
  nextCursor: null,
  loading: false,
  error: null,
};

export const fetchFeed = createAsyncThunk(
  "feed/fetchFeed",
  async (cursor: string | null, { rejectWithValue }) => {
    const url = cursor ? `/api/posts?cursor=${cursor}` : "/api/posts";
    const res = await fetch(url);
    if (!res.ok) return rejectWithValue("Failed to fetch feed");
    return res.json();
  }
);

const feedSlice = createSlice({
  name: "feed",
  initialState,
  reducers: {
    addPost: (state, action: PayloadAction<Post>) => {
      state.posts.unshift(action.payload);
    },
    toggleLike: (state, action: PayloadAction<{ postId: string; liked: boolean }>) => {
      const post = state.posts.find((p) => p.id === action.payload.postId);
      if (post) {
        post.isLiked = action.payload.liked;
        post.likeCount += action.payload.liked ? 1 : -1;
      }
    },
    incrementCommentCount: (state, action: PayloadAction<string>) => {
      const post = state.posts.find((p) => p.id === action.payload);
      if (post) post.commentCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeed.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.meta.arg
          ? [...state.posts, ...action.payload.posts]
          : action.payload.posts;
        state.nextCursor = action.payload.nextCursor;
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { addPost, toggleLike, incrementCommentCount } = feedSlice.actions;
export default feedSlice.reducer;
```

**Step 3: Create `chatSlice.ts`, `notificationSlice.ts`, `friendSlice.ts`** — follow same pattern with relevant state shapes:
- `chatSlice`: conversations list, activeConversation, messages[], typing indicators
- `notificationSlice`: notifications[], unreadCount
- `friendSlice`: friends[], pendingRequests[], friendCount, capLimit

**Step 4: Wrap the main layout with ReduxProvider**

Update `src/app/(main)/layout.tsx` to include `<ReduxProvider>` around `{children}`.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: set up Redux Toolkit store with feed, chat, notification, and friend slices"
```

---

## Phase 9: Real-Time Chat (Days 10-13)

### Task 16: Socket.io Server Setup

**Files:**
- Create: `server.ts` (custom server wrapping Next.js)
- Create: `src/lib/socket-server.ts`
- Modify: `package.json` — update `dev` and `start` scripts

**Step 1: Create the custom server**

Write `server.ts` at project root:

```typescript
import { createServer } from "http";
import next from "next";
import { initSocketServer } from "./src/lib/socket-server";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  initSocketServer(httpServer);

  const port = process.env.PORT || 3000;
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
```

**Step 2: Create Socket.io server initialization**

Write `src/lib/socket-server.ts`:

```typescript
import { Server as SocketServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { prisma } from "./prisma";

let io: SocketServer | null = null;

export function getIO(): SocketServer {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

// Map userId → Set of socket IDs (user can have multiple tabs)
const userSockets = new Map<string, Set<string>>();

export function initSocketServer(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socketio",
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId as string;

    if (!userId) {
      socket.disconnect();
      return;
    }

    // Track user connection
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Broadcast online status
    socket.broadcast.emit("user:online", { userId });

    // Handle direct message
    socket.on("chat:message", async (data: { receiverId: string; content: string }) => {
      const message = await prisma.message.create({
        data: {
          senderId: userId,
          receiverId: data.receiverId,
          content: data.content,
        },
      });

      // Send to receiver's sockets
      const receiverSockets = userSockets.get(data.receiverId);
      if (receiverSockets) {
        for (const socketId of receiverSockets) {
          io!.to(socketId).emit("chat:message", {
            ...message,
            senderName: socket.handshake.auth.userName,
          });
        }
      }

      // Send back to sender (for other tabs)
      socket.emit("chat:message:sent", message);
    });

    // Handle typing indicator
    socket.on("chat:typing", (data: { receiverId: string; isTyping: boolean }) => {
      const receiverSockets = userSockets.get(data.receiverId);
      if (receiverSockets) {
        for (const socketId of receiverSockets) {
          io!.to(socketId).emit("chat:typing", { userId, isTyping: data.isTyping });
        }
      }
    });

    // Handle read receipts
    socket.on("chat:read", async (data: { senderId: string }) => {
      await prisma.message.updateMany({
        where: {
          senderId: data.senderId,
          receiverId: userId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      const senderSockets = userSockets.get(data.senderId);
      if (senderSockets) {
        for (const socketId of senderSockets) {
          io!.to(socketId).emit("chat:read", { readBy: userId });
        }
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          socket.broadcast.emit("user:offline", { userId });
        }
      }
    });
  });
}
```

**Step 3: Update `package.json` scripts**

```json
{
  "scripts": {
    "dev": "ts-node --project tsconfig.server.json server.ts",
    "build": "next build",
    "start": "NODE_ENV=production ts-node --project tsconfig.server.json server.ts"
  }
}
```

Create `tsconfig.server.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "outDir": "./dist",
    "noEmit": false
  },
  "include": ["server.ts", "src/lib/socket-server.ts", "src/lib/prisma.ts"]
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: set up custom server with Socket.io for real-time chat"
```

---

### Task 17: Socket.io Client & Chat Provider

**Files:**
- Create: `src/lib/socket-client.ts`
- Create: `src/providers/socket-provider.tsx`

**Step 1: Create the socket client**

Write `src/lib/socket-client.ts`:

```typescript
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(userId: string, userName: string): Socket {
  if (socket?.connected) return socket;

  socket = io({
    path: "/api/socketio",
    auth: { userId, userName },
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
```

**Step 2: Create the Socket provider**

Write `src/providers/socket-provider.tsx`:

```typescript
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { connectSocket, disconnectSocket } from "@/lib/socket-client";
import { useSession } from "@/lib/auth-client";
import { useAppDispatch } from "@/store/hooks";
// Import relevant Redux actions for handling incoming events

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!session?.user) return;

    const s = connectSocket(session.user.id, session.user.name);
    setSocket(s);

    s.on("connect", () => setIsConnected(true));
    s.on("disconnect", () => setIsConnected(false));

    // Wire incoming events to Redux
    s.on("chat:message", (message) => {
      dispatch(/* addIncomingMessage(message) */);
      dispatch(/* addNotification for new message */);
    });

    s.on("user:online", ({ userId }) => {
      dispatch(/* setUserOnline(userId) */);
    });

    s.on("user:offline", ({ userId }) => {
      dispatch(/* setUserOffline(userId) */);
    });

    return () => {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
    };
  }, [session?.user, dispatch]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
```

**Step 3: Add SocketProvider to main layout (inside ReduxProvider)**

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add Socket.io client provider with Redux integration"
```

---

### Task 18: Chat UI

**Files:**
- Create: `src/app/api/messages/[userId]/route.ts` — GET message history
- Create: `src/app/api/messages/conversations/route.ts` — GET conversation list
- Rewrite: `src/app/(main)/chat/page.tsx`
- Create: `src/components/chat/conversation-list.tsx`
- Create: `src/components/chat/chat-window.tsx`
- Create: `src/components/chat/message-bubble.tsx`

**Key implementation details:**
- Chat page has two-panel layout: conversation list on left, active chat on right
- On mobile, conversation list is the default view; tapping opens the chat window (full screen)
- Message history loaded from API on conversation open, new messages via Socket.io
- Messages have read receipts (single/double checkmarks)
- Typing indicator shown when friend is typing
- Auto-scroll to bottom on new messages
- Messages grouped by date

**Step 1: Build API routes and UI components**

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add chat UI with conversation list, message window, and typing indicators"
```

---

## Phase 10: Notifications (Days 12-14)

### Task 19: Notification System

**Files:**
- Create: `src/app/api/notifications/route.ts` — GET notifications, PATCH mark as read
- Rewrite: `src/app/(main)/notifications/page.tsx`
- Create: `src/components/notifications/notification-list.tsx`
- Create: `src/components/notifications/notification-item.tsx`
- Create: `src/components/layout/notification-badge.tsx`

**Key implementation details:**
- Notification API returns paginated notifications sorted by createdAt desc
- Real-time notifications delivered via Socket.io (server emits when creating notifications)
- Update `socket-server.ts` to emit `notification:new` event when notifications are created
- Notification badge on Bell icon in sidebar/bottom nav shows unread count from Redux
- Clicking a notification marks it as read and navigates to the relevant content (post, chat, profile)
- Notification types: FRIEND_REQUEST, FRIEND_ACCEPT, NEW_POST, LIKE, COMMENT, MESSAGE

**Step 1: Add notification emission to socket server**

In `src/lib/socket-server.ts`, export a helper function:

```typescript
export function emitNotification(userId: string, notification: object) {
  const sockets = userSockets.get(userId);
  if (sockets && io) {
    for (const socketId of sockets) {
      io.to(socketId).emit("notification:new", notification);
    }
  }
}
```

Then call `emitNotification` from API routes that create notifications (friend request, like, comment, etc.)

**Step 2: Build API route and UI components**

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add notification system with real-time delivery and badge indicator"
```

---

## Phase 11: AI Content Moderation (Days 14-15)

### Task 20: AI Content Moderation Integration

**Files:**
- Create: `src/lib/moderation.ts`
- Modify: `src/app/api/upload/route.ts` — add async moderation call

**Step 1: Create the moderation utility**

Write `src/lib/moderation.ts`:

```typescript
interface ModerationResult {
  safe: boolean;
  categories: string[];
  confidence: number;
}

export async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  try {
    const res = await fetch(process.env.MODERATION_API_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MODERATION_API_KEY}`,
      },
      body: JSON.stringify({ image_url: imageUrl }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!res.ok) {
      // API error — fail open (allow the image)
      console.error("Moderation API error:", res.status);
      return { safe: true, categories: [], confidence: 0 };
    }

    const data = await res.json();
    return {
      safe: data.safe ?? true,
      categories: data.flagged_categories ?? [],
      confidence: data.confidence ?? 0,
    };
  } catch (error) {
    // Network error or timeout — fail open
    console.error("Moderation API unavailable:", error);
    return { safe: true, categories: [], confidence: 0 };
  }
}
```

**Step 2: Integrate into upload route**

Modify `src/app/api/upload/route.ts` to call moderation async (non-blocking):

```typescript
// After uploading the image, trigger moderation in the background
// Do NOT await — let it run async
moderateImage(url).then(async (result) => {
  if (!result.safe) {
    // Flag the image — could add a `flagged` boolean to PostImage model
    // Or create a moderation log entry
    console.warn(`Image flagged: ${url}`, result.categories);
  }
});
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: integrate AI content moderation with non-blocking fallback"
```

---

## Phase 12: Polish & Responsive Design (Days 15-18)

### Task 21: Responsive Design Refinements

- Review all pages for mobile responsiveness
- Ensure bottom tab bar works correctly on mobile
- Add touch-friendly tap targets (min 44px)
- Test sidebar collapse/expand behavior
- Add loading skeletons for feed, chat, and notifications
- Add empty states for "No posts yet", "No friends yet", "No messages yet"

### Task 22: Performance Optimization

- Add image lazy loading with `next/image` where appropriate
- Implement pagination for feed (infinite scroll) and chat history
- Add debouncing to user search input
- Optimize Prisma queries with proper `select` and `include`
- Add database indexes (already defined in schema)

### Task 23: Error Handling & Edge Cases

- Add error boundaries for React component errors
- Handle network errors gracefully in all API calls
- Add toast notifications for user-facing errors
- Handle friend cap edge cases (concurrent accepts)
- Validate all API inputs with Zod schemas

---

## Phase 13: Testing & Documentation (Days 18-20)

### Task 24: End-to-End Testing of Core Flows

Test these flows manually (and optionally with Playwright):
1. Register → Login → Create Profile
2. Search for user → Send friend request → Accept request
3. Create text post → See in feed → Like → Comment
4. Create post with image → Image appears compressed in feed
5. Open chat → Send message → Receive real-time response
6. Receive notification → Click to navigate → Mark as read
7. Reach friend cap → Cannot add more friends → Remove friend → Can add again

### Task 25: Documentation

- Complete `README.md` with all sections (User Guide with screenshots, Development Guide, etc.)
- Create `ai-session.md` with 1-3 representative AI interactions
- Record video demo (1-5 minutes)

---

## Summary: File Structure

```
innercircle/
├── prisma/
│   └── schema.prisma
├── server.ts                          # Custom server for Socket.io
├── tsconfig.server.json
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Landing page → redirect to /feed or /login
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (main)/
│   │   │   ├── layout.tsx             # Sidebar + bottom nav + providers
│   │   │   ├── feed/page.tsx
│   │   │   ├── friends/page.tsx
│   │   │   ├── chat/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── profile/[userId]/page.tsx
│   │   └── api/
│   │       ├── auth/[...all]/route.ts
│   │       ├── upload/route.ts
│   │       ├── posts/route.ts
│   │       ├── posts/[postId]/route.ts
│   │       ├── posts/[postId]/like/route.ts
│   │       ├── posts/[postId]/comments/route.ts
│   │       ├── friends/route.ts
│   │       ├── friends/request/route.ts
│   │       ├── friends/respond/route.ts
│   │       ├── friends/remove/route.ts
│   │       ├── users/search/route.ts
│   │       ├── users/[userId]/route.ts
│   │       ├── messages/[userId]/route.ts
│   │       ├── messages/conversations/route.ts
│   │       └── notifications/route.ts
│   ├── components/
│   │   ├── auth/
│   │   ├── layout/
│   │   ├── feed/
│   │   ├── friends/
│   │   ├── chat/
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── upload/
│   │   └── ui/                        # shadcn/ui components
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── auth-client.ts
│   │   ├── auth-utils.ts
│   │   ├── prisma.ts
│   │   ├── friends.ts
│   │   ├── storage.ts
│   │   ├── image-processing.ts
│   │   ├── moderation.ts
│   │   ├── socket-client.ts
│   │   ├── socket-server.ts
│   │   └── utils.ts
│   ├── store/
│   │   ├── store.ts
│   │   ├── provider.tsx
│   │   ├── hooks.ts
│   │   └── slices/
│   │       ├── feedSlice.ts
│   │       ├── chatSlice.ts
│   │       ├── notificationSlice.ts
│   │       └── friendSlice.ts
│   ├── providers/
│   │   └── socket-provider.tsx
│   └── middleware.ts
├── docs/
│   └── plans/
├── .env.example
├── README.md
└── ai-session.md
```

## Task-to-Team-Member Mapping (suggested)

| Task | Owner | Days |
|------|-------|------|
| 1. Init project | Qiwen | 1 |
| 2. Prisma schema | Qiwen | 1-2 |
| 3. Better Auth server | Irys | 2 |
| 4. Auth UI | Weijie | 2-3 |
| 5. Auth helpers | Irys | 3 |
| 6. App layout & nav | Weijie | 3-4 |
| 7. Friend system API | Irys | 4-6 |
| 8. Friend system UI | Weijie | 5-6 |
| 9. Posts & Feed API | Irys | 5-7 |
| 10. Feed UI | Weijie | 6-7 |
| 11. Profile API & UI | Weijie + Irys | 6-7 |
| 12. S3 storage client | Zhengyang | 4-5 |
| 13. Image processing | Zhengyang | 5-7 |
| 14. Client-side crop | Zhengyang | 7-8 |
| 15. Redux store | Weijie | 8-9 |
| 16. Socket.io server | Qiwen | 8-10 |
| 17. Socket.io client | Qiwen | 10-11 |
| 18. Chat UI | Weijie + Qiwen | 11-13 |
| 19. Notifications | Qiwen + Weijie | 12-14 |
| 20. AI moderation | Zhengyang | 14-15 |
| 21. Responsive polish | Weijie | 15-17 |
| 22. Performance | Zhengyang | 15-17 |
| 23. Error handling | All | 16-18 |
| 24. Testing | All | 18-20 |
| 25. Documentation | All | 18-20 |

## Critical Path

```
Init → Schema → Auth → Layout → Friend API → Friend UI → Post API → Feed UI
                                                                       ↓
                                              Storage → Image Pipeline → Upload in Feed
                                                                       ↓
                                                              Redux → Socket Server → Socket Client → Chat UI → Notifications
```

The friend system and feed are the core loop. Storage/images can be built in parallel. Real-time features layer on top once the core loop works.
