"use client";

import { useState, useCallback, useRef } from "react";
import { ImagePlus, MapPin, X, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { PostItem } from "@/types/api";

interface UploadedImage {
  url: string;
  thumbnail: string;
  previewUrl: string; // local object URL for preview before upload completes
}

interface CreatePostDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: (post: PostItem) => void;
}

export default function CreatePostDrawer({
  open,
  onOpenChange,
  onPostCreated,
}: CreatePostDrawerProps) {
  const [textContent, setTextContent] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setTextContent("");
    setImages([]);
    setLat(null);
    setLng(null);
    setError(null);
  }, []);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setError("Unable to get your location. Please allow location access.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleClearLocation = useCallback(() => {
    setLat(null);
    setLng(null);
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      setUploading(true);
      setError(null);

      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) continue;
          if (file.size > 10 * 1024 * 1024) {
            setError("File too large (max 10MB)");
            continue;
          }

          const previewUrl = URL.createObjectURL(file);
          const formData = new FormData();
          formData.append("file", file);
          formData.append("type", "post");

          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (!res.ok) {
            const data = await res.json();
            setError(data.error ?? "Upload failed");
            URL.revokeObjectURL(previewUrl);
            continue;
          }

          const { url, thumbnailUrl } = await res.json();
          setImages((prev) => [
            ...prev,
            { url, thumbnail: thumbnailUrl ?? url, previewUrl },
          ]);
        }
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    []
  );

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!textContent.trim() && images.length === 0) {
      setError("Post must have text or images");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {};
      if (textContent.trim()) body.textContent = textContent.trim();
      if (images.length > 0) {
        body.imageUrls = images.map((img) => ({
          url: img.url,
          thumbnail: img.thumbnail,
        }));
      }
      if (lat != null && lng != null) {
        body.lat = lat;
        body.lng = lng;
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create post");
        return;
      }

      const data = await res.json();
      onPostCreated(data.post);
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }, [textContent, images, lat, lng, onPostCreated, reset, onOpenChange]);

  const canSubmit = (textContent.trim() || images.length > 0) && !submitting && !uploading;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent side="right" className="flex flex-col overflow-hidden sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Create Post</SheetTitle>
          <SheetDescription className="sr-only">
            Create a new post with text, images, and location
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Text content */}
          <div className="grid gap-2">
            <Label htmlFor="post-text">What&apos;s on your mind?</Label>
            <textarea
              id="post-text"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Share something with your inner circle..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Image upload */}
          <div className="grid gap-2">
            <Label>Images</Label>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={i} className="group relative h-24 w-24">
                    <img
                      src={img.previewUrl}
                      alt=""
                      className="h-full w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || submitting}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {uploading ? "Uploading..." : "Add Images"}
            </Button>
          </div>

          {/* Location */}
          <div className="grid gap-2">
            <Label>Location</Label>
            {lat != null && lng != null ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {lat.toFixed(4)}, {lng.toFixed(4)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleClearLocation}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleGetLocation}
                  disabled={locating}
                >
                  {locating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  {locating ? "Getting location..." : "Use My Location"}
                </Button>
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="any"
                    placeholder="Lat"
                    className="h-8 w-20 text-xs"
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) setLat(v);
                    }}
                  />
                  <Input
                    type="number"
                    step="any"
                    placeholder="Lng"
                    className="h-8 w-20 text-xs"
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) setLng(v);
                    }}
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Posts with location will appear on the globe.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Post"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
