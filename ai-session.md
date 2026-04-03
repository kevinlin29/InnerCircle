# AI Interaction Record

This file documents 3 representative AI interactions that meaningfully influenced the InnerCircle project. Each example demonstrates how the team critically evaluated AI output, identified mistakes, and verified the final implementation.

---

## Session 1: Integrating Socket.io with Next.js App Router

### Prompt (sent to AI)

> We're building a social media app with Next.js 16 App Router. We need real-time notifications (likes, comments, friend requests) and live chat using Socket.io. How should we set up Socket.io alongside Next.js? Can we use API routes or middleware to handle WebSocket connections?

### AI Response (trimmed)

The AI suggested three approaches:

1. **Use Next.js middleware (`middleware.ts`)** to intercept WebSocket upgrade requests and initialize Socket.io there.
2. **Create an API route** at `app/api/socket/route.ts` that initializes the Socket.io server on first request using `globalThis` to persist the instance.
3. **Use a separate Express server** on a different port for Socket.io, and connect the frontend to both Next.js (port 3000) and Socket.io (port 3001).

The AI recommended Option 2 as the "cleanest" approach, providing code that looked roughly like:

```typescript
// app/api/socket/route.ts
import { Server as SocketServer } from "socket.io";

export async function GET(req: Request) {
  if (!(globalThis as any).io) {
    const io = new SocketServer(/* ... */);
    (globalThis as any).io = io;
  }
  return new Response("Socket initialized");
}
```

### What Your Team Did With It

- **What was useful:** The idea of using `globalThis` to share a single Socket.io instance across the application was valuable and we adopted this pattern in our final implementation.

- **What was incorrect:** Both Options 1 and 2 were fundamentally flawed:
  - **Middleware runs in the Edge Runtime**, which does not support Node.js APIs like `http.Server` or the `pg` driver needed for database-backed session validation. Socket.io cannot run in Edge Runtime at all.
  - **API Routes cannot handle WebSocket upgrades.** Next.js API Routes process standard HTTP request/response cycles. The HTTP `Upgrade` header for WebSocket connections is handled at the server level, below the Next.js routing layer. An API route would never receive the upgrade event.
  
  We discovered this by actually trying Option 2 — the Socket.io client received a `transport error` because the server never completed the WebSocket handshake. Console logging confirmed the API route handler was invoked as a normal HTTP GET, not as a WebSocket upgrade.

- **How we verified and replaced the suggestion:** We implemented a **custom Node.js HTTP server** (`server.ts`) that wraps the Next.js request handler. This server directly handles WebSocket upgrades and initializes Socket.io at the server level:

  ```typescript
  // server.ts
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  
  app.prepare().then(() => {
    const httpServer = createServer((req, res) => handle(req, res));
    const io = initSocketServer(httpServer); // Socket.io attaches here
    httpServer.listen(port);
  });
  ```

  The `globalThis` pattern from the AI suggestion was still useful — we use it to share the Socket.io instance between the native Node.js server process and Next.js API Routes (which run in a webpack-bundled context). This allows any API route to call `emitToUser()` or `emitNotification()` to push real-time events. We verified cross-context sharing by logging the Socket.io instance identity in both `server.ts` and an API route, confirming they reference the same object.

---

## Session 2: Preventing Race Conditions on Friend Cap Enforcement

### Prompt (sent to AI)

> Our app has a 25-friend limit per user. When a user accepts a friend request, we need to check that neither the accepter nor the requester has exceeded their cap. How should we implement this in Prisma with PostgreSQL?

### AI Response (trimmed)

The AI suggested a straightforward check-then-update pattern:

```typescript
export async function POST(req: NextRequest) {
  const userId = session.user.id;
  const { friendshipId } = await req.json();

  // Check the accepter's friend count
  const friendCount = await prisma.friendship.count({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });

  if (friendCount >= 25) {
    return NextResponse.json({ error: "Friend limit reached" }, { status: 400 });
  }

  // Accept the request
  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: "ACCEPTED" },
  });
}
```

The AI noted this was "simple and effective" and also reminded us to check the requester's cap.

### What Your Team Did With It

- **What was useful:** The overall logic (check both parties' caps before accepting) and the Prisma query structure for counting bidirectional friendships were correct and directly usable.

- **What was incorrect:** The check-then-update pattern has a classic **Time-of-Check to Time-of-Use (TOCTOU) race condition**. If User A has 24 friends and two pending requests from User B and User C, and both B and C click "Accept" at the same time:
  1. Request B reads `friendCount = 24` → passes check
  2. Request C reads `friendCount = 24` → passes check (the count hasn't changed yet)
  3. Request B updates → User A now has 25 friends
  4. Request C updates → User A now has **26 friends**, violating the cap

  We identified this by reasoning about concurrent request scenarios during code review, before it ever hit production.

- **How we verified and replaced the suggestion:** We wrapped the entire check-and-update sequence in `prisma.$transaction()`:

  ```typescript
  const result = await prisma.$transaction(async (tx) => {
    const friendship = await tx.friendship.findUnique({ where: { id: friendshipId } });
    // ... validate friendship exists and is PENDING ...

    // Check cap for accepter (inside transaction)
    const user = await tx.user.findUnique({ where: { id: userId }, select: { friendCapLimit: true } });
    const friendCount = await tx.friendship.count({
      where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    });
    if (user && friendCount >= user.friendCapLimit) {
      throw new Error("You have reached your friend limit");
    }

    // Check cap for requester too (inside same transaction)
    // ... similar check for requester ...

    return tx.friendship.update({ where: { id: friendshipId }, data: { status: "ACCEPTED" } });
  });
  ```

  Prisma's interactive transactions use PostgreSQL's default `READ COMMITTED` isolation. While this does not fully prevent the race under heavy concurrency (it would require `SERIALIZABLE`), in practice the transaction significantly narrows the window and is sufficient for our use case (social app, not financial). We verified correctness by writing a Vitest test (`tests/prisma-pool.test.ts`) that asserts the transaction pattern is used in the respond route, and by manually testing concurrent accepts with two browser sessions.

---

## Session 3: Dynamic Globe Marker Clustering Based on Zoom Level

### Prompt (sent to AI)

> We're using react-globe.gl to display geo-tagged posts on a 3D globe. When many posts are in the same area (like a city), they overlap. How should we cluster nearby markers and expand them when the user zooms in?

### AI Response (trimmed)

The AI suggested using the `supercluster` library (a well-known geospatial clustering library for Mapbox):

```typescript
import Supercluster from "supercluster";

const index = new Supercluster({ radius: 60, maxZoom: 16 });
index.load(geoJsonFeatures);

// On zoom change, re-query clusters
const clusters = index.getClusters(bbox, zoomLevel);
```

The AI explained that `supercluster` uses a hierarchical spatial index with configurable radius and zoom levels, and that it integrates naturally with 2D map libraries like Mapbox GL or Leaflet.

### What Your Team Did With It

- **What was useful:** The concept of re-clustering on zoom/altitude change was correct — we adopted the pattern of recalculating clusters whenever the camera position changes.

- **What was incorrect or not applicable:**
  - `supercluster` is designed for **2D tile-based maps** (Mapbox, Leaflet). It expects a bounding box (`bbox`) and integer zoom level, which react-globe.gl (a Three.js-based 3D globe) does not provide. The globe uses camera `altitude` (a continuous float), not discrete zoom levels or tile coordinates.
  - The `radius` parameter in `supercluster` is in **screen pixels**, which has no direct meaning on a 3D globe where the projection changes with perspective and latitude.
  - Adding `supercluster` (with its GeoJSON dependency chain) would add unnecessary bundle weight for what turned out to be a simple geometric problem.

- **How we verified and replaced the suggestion:** We implemented a lightweight custom clustering algorithm directly in the component:

  1. **Euclidean distance on lat/lng** as the clustering metric (sufficient for our scale — we're clustering posts within a city, not doing precise great-circle calculations).
  2. **Dynamic threshold**: `altitude × 2.2`, where `altitude` is tracked via a `requestAnimationFrame` loop on the globe's OrbitControls `change` event. This means:
     - Zoomed out (altitude ~2.5): threshold = 5.5° — large clusters covering entire countries
     - Zoomed in (altitude ~0.5): threshold = 1.1° — only very close posts cluster
     - Zoomed way in (altitude ~0.3): nearly all clusters expand into individual pins
  3. **Cluster expansion UI**: When altitude is below 0.8 and the user clicks a cluster, instead of zooming further (which would distort the globe), we show an overlay panel listing the clustered posts with thumbnails, timestamps, and like/comment counts.

  We verified the behavior by testing with 50+ posts distributed across Toronto, New York, and London. The clustering transitions felt natural at every zoom level. We tuned the `2.2` multiplier empirically by comparing it against `1.5` (too aggressive — pins separated too early) and `3.0` (too conservative — clusters persisted even at close range). The final value of `2.2` provided the best visual balance.

  We also compared the result against what `supercluster` would produce on a 2D Mapbox map with similar data, and confirmed our simple approach produced comparable visual groupings for our dataset size (< 500 posts), without the overhead of a spatial index.
