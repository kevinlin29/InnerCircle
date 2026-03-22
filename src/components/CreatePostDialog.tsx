"use client";

import { useState, useRef, useCallback } from "react";
import { ImagePlus, MapPin, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resizeImage } from "@/lib/client-image";

interface UploadedImage {
  file: File;
  preview: string;
  url?: string;
  thumbnailUrl?: string;
}

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export default function CreatePostDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePostDialogProps) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [useLocation, setUseLocation] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setText("");
    setImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.preview));
      return [];
    });
    setUseLocation(false);
    setLat("");
    setLng("");
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const newImages: UploadedImage[] = [];
    for (let i = 0; i < files.length && images.length + newImages.length < 4; i++) {
      const raw = files[i];
      if (!raw.type.startsWith("image/")) continue;
      const file = await resizeImage(raw);
      newImages.push({ file, preview: URL.createObjectURL(file) });
    }
    setImages((prev) => [...prev, ...newImages]);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  }

  function detectLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setUseLocation(true);
      },
      () => {
        setUseLocation(true);
      }
    );
  }

  async function handleSubmit() {
    if (!text.trim() && images.length === 0) return;
    setSubmitting(true);

    try {
      let imageUrls: { url: string; thumbnail: string }[] = [];

      if (images.length > 0) {
        setUploading(true);
        const uploadPromises = images.map(async (img) => {
          const form = new FormData();
          form.append("file", img.file);
          form.append("type", "post");
          const res = await fetch("/api/upload", { method: "POST", body: form });
          if (!res.ok) throw new Error("Upload failed");
          return res.json();
        });
        imageUrls = await Promise.all(uploadPromises);
        setUploading(false);
      }

      const body: Record<string, unknown> = {};
      if (text.trim()) body.textContent = text.trim();
      if (imageUrls.length > 0) body.imageUrls = imageUrls;
      if (useLocation && lat && lng) {
        body.lat = parseFloat(lat);
        body.lng = parseFloat(lng);
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to create post");

      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      console.error("Create post error:", err);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Post</DialogTitle>
          <DialogDescription>
            Share a moment with your inner circle.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Textarea
            placeholder="What's on your mind?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="resize-none"
          />

          {/* Image previews */}
          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <div key={i} className="relative shrink-0">
                  <img
                    src={img.preview}
                    alt=""
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-xs"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Location fields */}
          {useLocation && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lat" className="text-xs">
                  Latitude
                </Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  placeholder="43.6532"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lng" className="text-xs">
                  Longitude
                </Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  placeholder="-79.3832"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => fileRef.current?.click()}
              disabled={images.length >= 4}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={useLocation ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={detectLocation}
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || (!text.trim() && images.length === 0)}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploading ? "Uploading..." : "Posting..."}
              </>
            ) : (
              "Post"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
