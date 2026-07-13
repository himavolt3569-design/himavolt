"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Trash2,
  Upload,
  Loader2,
  Image as ImageIcon,
  GripVertical,
  Star,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch, peekApiCache } from "@/lib/api-client";
import { uploadFile } from "@/lib/upload";
import ImageCropDialog from "@/components/shared/ImageCropDialog";

interface SlideData {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

export default function HotelMediaLibrary() {
  const { selectedRestaurant, restaurants, updateRestaurant } = useRestaurant();
  const { showToast } = useToast();
  const restaurant = selectedRestaurant ?? restaurants[0];

  const slidesPath = restaurant ? `/api/restaurants/${restaurant.id}/hero-slides` : "";
  const [slides, setSlides] = useState<SlideData[]>(() => peekApiCache<{ slides: SlideData[] }>(slidesPath)?.slides ?? []);
  const [loading, setLoading] = useState(() => !peekApiCache(slidesPath));
  
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<{ url: string; file: File } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchSlides = useCallback(async () => {
    if (!restaurant) return;
    if (!peekApiCache(`/api/restaurants/${restaurant.id}/hero-slides`)) setLoading(true);
    try {
      const data = await apiFetch<{ slides: SlideData[] }>(
        `/api/restaurants/${restaurant.id}/hero-slides`
      );
      setSlides(Array.isArray(data.slides) ? data.slides : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 5 * 1024 * 1024) {
        showToast("File too large (max 5MB)", "error");
        return;
      }
      setCropFile({ url: URL.createObjectURL(f), file: f });
    }
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handleCropConfirm = async (croppedFile: File) => {
    setCropFile(null);
    setUploading(true);
    try {
      const url = await uploadFile(croppedFile, "hero-slides");
      await addSlide(url);
    } catch {
      showToast("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const addSlide = async (url: string) => {
    if (!restaurant) return;
    try {
      const res = await apiFetch<{ slide: SlideData }>(
        `/api/restaurants/${restaurant.id}/hero-slides`,
        {
          method: "POST",
          body: {
            imageUrl: url,
            title: null,
            subtitle: null,
            linkItemId: null,
          },
        }
      );
      setSlides((prev) => [...prev, res.slide]);
      showToast("Image added!");
    } catch {
      showToast("Failed to create slide", "error");
    }
  };

  const handleMakeCover = async (url: string) => {
    if (!restaurant) return;
    try {
      await apiFetch<{ restaurant: any }>(
        `/api/restaurants/${restaurant.id}`,
        {
          method: "PATCH",
          body: { coverUrl: url },
        }
      );
      updateRestaurant(restaurant.id, { coverUrl: url });
      showToast("Cover image updated instantly!");
    } catch {
      showToast("Failed to set cover image", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!restaurant) return;
    try {
      await apiFetch(
        `/api/restaurants/${restaurant.id}/hero-slides?slideId=${id}`,
        { method: "DELETE" }
      );
      setSlides((prev) => prev.filter((s) => s.id !== id));
      showToast("Image removed");
    } catch {
      showToast("Failed to delete image", "error");
    }
  };

  if (!restaurant) return null;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-1)]">Media Library</h2>
          <p className="text-sm text-[var(--accent-text)]/50">
            Upload up to 5 beautiful, high-quality photos for your hotel's main gallery.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileSelect}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || slides.length >= 5}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent-hover)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading..." : "Upload Photo"}
        </button>
      </div>

      {!loading && slides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--accent)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-muted)] mb-4">
            <ImageIcon className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-[var(--accent-text)]">
            No media uploaded yet
          </p>
          <p className="text-xs text-[var(--accent)] mt-1">
            Start by uploading some stunning shots of your property
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide, i) => {
            const isCover = restaurant.coverUrl === slide.imageUrl;
            
            return (
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 rounded-2xl ring-1 ring-[var(--border)] bg-[var(--canvas)] p-3 hover:ring-[var(--accent-border)]/50 transition-colors"
              >
                <div className="text-[var(--accent)] hidden sm:block opacity-50 cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4" />
                </div>

                <div className="h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-[var(--accent-muted)] border border-[var(--border)] relative group">
                  <img
                    src={slide.imageUrl}
                    alt="Property"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {isCover && (
                    <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md rounded-md px-1.5 py-0.5 flex items-center gap-1 shadow-sm">
                      <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-[9px] font-bold text-white uppercase tracking-wider">Cover</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[var(--text-1)]">
                    Hero Slide {i + 1}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5 max-w-sm truncate">
                    {slide.imageUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isCover && (
                    <button
                      onClick={() => handleMakeCover(slide.imageUrl)}
                      className="hidden sm:flex items-center gap-1.5 rounded-lg bg-[var(--canvas-sub)] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)] transition-all cursor-pointer"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Set as Cover
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(slide.id)}
                    className="rounded-lg p-2 text-[var(--text-3)] hover:bg-[var(--status-error-bg)] hover:text-[var(--status-error-text)] transition-colors cursor-pointer"
                    title="Delete image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {cropFile && (
        <ImageCropDialog
          open={!!cropFile}
          imageSrc={cropFile.url}
          fileName={cropFile.file.name}
          initialAspectId="16x9"
          onCancel={() => setCropFile(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
