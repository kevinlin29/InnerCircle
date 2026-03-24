"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { GlobeMethods } from "react-globe.gl";
import type { PostItem } from "@/types/api";

const GLOBE_IMAGE =
  "//unpkg.com/three-globe/example/img/earth-night.jpg";
const BACKGROUND_IMAGE =
  "//unpkg.com/three-globe/example/img/night-sky.png";

const POINT_COLORS = [
  "#f472b6", // pink
  "#60a5fa", // blue
  "#34d399", // green
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#fb923c", // orange
  "#2dd4bf", // teal
  "#f87171", // red
];

function colorForAuthor(authorId: string): string {
  let hash = 0;
  for (let i = 0; i < authorId.length; i++) {
    hash = authorId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return POINT_COLORS[Math.abs(hash) % POINT_COLORS.length];
}

interface GlobeViewerProps {
  posts: PostItem[];
  onSelectPost: (postId: string) => void;
}

export default function GlobeViewer({ posts, onSelectPost }: GlobeViewerProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setDimensions({ width: el.clientWidth, height: el.clientHeight });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geoPoints = useMemo(
    () => posts.filter((p) => p.lat != null && p.lng != null),
    [posts]
  );

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enableDamping = true;

    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });
  }, []);

  const handlePointClick = useCallback(
    (point: object) => {
      const p = point as PostItem;
      onSelectPost(p.id);

      const globe = globeRef.current;
      if (globe && p.lat != null && p.lng != null) {
        globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.5 }, 800);
      }
    },
    [onSelectPost]
  );

  const GlobeComponent = useMemo(() => {
    // Dynamic require needed because react-globe.gl uses browser APIs
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Globe = require("react-globe.gl").default;
    return Globe;
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
        pointLat={(d: object) => (d as PostItem).lat!}
        pointLng={(d: object) => (d as PostItem).lng!}
        pointColor={(d: object) => colorForAuthor((d as PostItem).authorId)}
        pointAltitude={0.06}
        pointRadius={0.4}
        pointLabel={(d: object) => {
          const p = d as PostItem;
          return `<div style="color:#fff;font-size:13px;padding:4px 8px;background:rgba(0,0,0,0.75);border-radius:6px;">
            <b>${p.author.name}</b><br/>
            ${p.textContent ? p.textContent.slice(0, 60) + (p.textContent.length > 60 ? "..." : "") : "Photo post"}
          </div>`;
        }}
        onPointClick={handlePointClick}
        showPointerCursor={true}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}
