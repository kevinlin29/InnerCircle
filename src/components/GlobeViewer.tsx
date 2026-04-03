"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { X, Heart, MessageCircle, Image } from "lucide-react";
import type { GlobeMethods } from "react-globe.gl";
import type { PostItem } from "@/types/api";

const GLOBE_IMAGE =
  "//unpkg.com/three-globe/example/img/earth-night.jpg";
const BACKGROUND_IMAGE =
  "//unpkg.com/three-globe/example/img/night-sky.png";

const POINT_COLORS = [
  "#f472b6", "#60a5fa", "#34d399", "#fbbf24",
  "#a78bfa", "#fb923c", "#2dd4bf", "#f87171",
];

const CLUSTER_COLOR = "#ffffff";

function colorForAuthor(authorId: string): string {
  let hash = 0;
  for (let i = 0; i < authorId.length; i++) {
    hash = authorId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return POINT_COLORS[Math.abs(hash) % POINT_COLORS.length];
}

// ── Clustering types ──

interface GlobePoint {
  lat: number;
  lng: number;
  isCluster: boolean;
  count: number;
  posts: PostItem[];
  color: string;
  radius: number;
  altitude: number;
  id: string;
  label: string;
}

function clusterPosts(posts: PostItem[], threshold: number): GlobePoint[] {
  const geo = posts.filter((p) => p.lat != null && p.lng != null);
  const assigned = new Set<number>();
  const result: GlobePoint[] = [];

  for (let i = 0; i < geo.length; i++) {
    if (assigned.has(i)) continue;
    const group: number[] = [i];
    assigned.add(i);

    for (let j = i + 1; j < geo.length; j++) {
      if (assigned.has(j)) continue;
      const dLat = geo[i].lat! - geo[j].lat!;
      const dLng = geo[i].lng! - geo[j].lng!;
      if (Math.sqrt(dLat * dLat + dLng * dLng) < threshold) {
        group.push(j);
        assigned.add(j);
      }
    }

    const groupPosts = group.map((idx) => geo[idx]);

    if (group.length === 1) {
      const p = groupPosts[0];
      result.push({
        lat: p.lat!,
        lng: p.lng!,
        isCluster: false,
        count: 1,
        posts: groupPosts,
        color: colorForAuthor(p.authorId),
        radius: 1.0,
        altitude: 0.1,
        id: p.id,
        label: `<div style="color:#fff;font-size:13px;padding:4px 8px;background:rgba(0,0,0,.8);border-radius:6px;max-width:220px;">
          <b>${p.author.name}</b><br/>
          ${p.textContent ? p.textContent.slice(0, 60) + (p.textContent.length > 60 ? "…" : "") : "Photo post"}
        </div>`,
      });
    } else {
      const avgLat = groupPosts.reduce((s, p) => s + p.lat!, 0) / group.length;
      const avgLng = groupPosts.reduce((s, p) => s + p.lng!, 0) / group.length;
      const uniqueAuthors = new Set(groupPosts.map((p) => p.author.name));
      const authorPreview = [...uniqueAuthors].slice(0, 3).join(", ");
      const extra = uniqueAuthors.size > 3 ? ` +${uniqueAuthors.size - 3}` : "";

      result.push({
        lat: avgLat,
        lng: avgLng,
        isCluster: true,
        count: group.length,
        posts: groupPosts,
        color: CLUSTER_COLOR,
        radius: Math.min(0.6 + group.length * 0.12, 1.6),
        altitude: 0.1,
        id: `cluster-${i}`,
        label: `<div style="color:#fff;font-size:13px;padding:6px 10px;background:rgba(0,0,0,.85);border-radius:8px;text-align:center;">
          <b>${group.length} posts</b><br/>
          <span style="font-size:11px;opacity:.8;">${authorPreview}${extra}</span><br/>
          <span style="font-size:10px;opacity:.6;">Click to zoom in</span>
        </div>`,
      });
    }
  }

  return result;
}

// ── Component ──

interface GlobeViewerProps {
  posts: PostItem[];
  onSelectPost: (postId: string) => void;
}

const EXPAND_ALTITUDE = 0.8;

export default function GlobeViewer({ posts, onSelectPost }: GlobeViewerProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [altitude, setAltitude] = useState(2.5);
  const [expandedCluster, setExpandedCluster] = useState<GlobePoint | null>(null);

  const geoPoints = useMemo(
    () => clusterPosts(posts, altitude * 2.2),
    [posts, altitude]
  );

  // Labels overlay for cluster counts
  const clusterLabels = useMemo(
    () =>
      geoPoints
        .filter((p) => p.isCluster)
        .map((p) => ({ ...p, text: String(p.count) })),
    [geoPoints]
  );

  // Close expanded cluster when altitude changes significantly (user scrolled away)
  useEffect(() => {
    if (expandedCluster && altitude > EXPAND_ALTITUDE + 0.3) {
      setExpandedCluster(null);
    }
  }, [altitude, expandedCluster]);

  // Globe setup + altitude tracking
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enableDamping = true;
    controls.minDistance = 110;

    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

    let raf: number;
    const onControlChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const pov = globe.pointOfView();
        setAltitude((prev) => {
          const rounded = Math.round(pov.altitude * 10) / 10;
          return rounded === prev ? prev : rounded;
        });
      });
    };

    controls.addEventListener("change", onControlChange);
    return () => {
      controls.removeEventListener("change", onControlChange);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handlePointClick = useCallback(
    (point: object) => {
      const p = point as GlobePoint;
      const globe = globeRef.current;

      if (p.isCluster) {
        if (altitude <= EXPAND_ALTITUDE) {
          setExpandedCluster(p);
        } else if (globe) {
          const newAlt = Math.max(altitude * 0.4, 0.3);
          globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: newAlt }, 800);
        }
      } else {
        setExpandedCluster(null);
        onSelectPost(p.posts[0].id);
        if (globe) {
          globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.5 }, 800);
        }
      }
    },
    [onSelectPost, altitude]
  );

  const handleListPostClick = useCallback(
    (postId: string) => {
      setExpandedCluster(null);
      onSelectPost(postId);
    },
    [onSelectPost]
  );

  const GlobeComponent = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-globe.gl").default;
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <GlobeComponent
        ref={globeRef}
        globeImageUrl={GLOBE_IMAGE}
        backgroundImageUrl={BACKGROUND_IMAGE}
        showAtmosphere={true}
        atmosphereColor="#3a86ff"
        atmosphereAltitude={0.15}
        pointsData={geoPoints}
        pointLat={(d: object) => (d as GlobePoint).lat}
        pointLng={(d: object) => (d as GlobePoint).lng}
        pointColor={(d: object) => (d as GlobePoint).color}
        pointAltitude={(d: object) => (d as GlobePoint).altitude}
        pointRadius={(d: object) => (d as GlobePoint).radius}
        pointLabel={(d: object) => (d as GlobePoint).label}
        onPointClick={handlePointClick}
        labelsData={clusterLabels}
        labelLat={(d: object) => (d as GlobePoint).lat}
        labelLng={(d: object) => (d as GlobePoint).lng}
        labelText={(d: object) => (d as GlobePoint & { text: string }).text}
        labelSize={1.4}
        labelDotRadius={0}
        labelColor={() => "rgba(255,255,255,0.95)"}
        labelAltitude={0.12}
        labelResolution={3}
        showPointerCursor={true}
        width={typeof window !== "undefined" ? window.innerWidth : 1200}
        height={typeof window !== "undefined" ? window.innerHeight : 800}
      />

      {/* Expanded cluster list panel */}
      {expandedCluster && (
        <div className="absolute left-1/2 top-1/2 z-20 w-80 max-w-[90vw] -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-95 duration-200">
          <div className="rounded-xl border border-border/60 bg-background/90 shadow-2xl backdrop-blur-lg">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
              <span className="text-sm font-semibold">
                {expandedCluster.count} posts at this location
              </span>
              <button
                onClick={() => setExpandedCluster(null)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Post list */}
            <div className="max-h-72 overflow-y-auto">
              {expandedCluster.posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => handleListPostClick(post.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  {/* Thumbnail or icon */}
                  {post.images?.length > 0 ? (
                    <img
                      src={post.images[0].thumbnailUrl || post.images[0].imageUrl}
                      alt=""
                      className="h-10 w-10 flex-shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                      <Image className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium">
                        {post.author.name}
                      </span>
                      <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {post.textContent || "Photo post"}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-2.5 w-2.5" /> {post.likeCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="h-2.5 w-2.5" /> {post.commentCount}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
