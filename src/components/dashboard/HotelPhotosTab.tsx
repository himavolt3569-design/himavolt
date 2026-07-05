"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Image as ImageIcon, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch, peekApiCache } from "@/lib/api-client";
import { uploadFile } from "@/lib/upload";
import { runWithConcurrency } from "@/lib/concurrency";
import { cn } from "@/lib/utils";

interface SlideData {
  id: string;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  sortOrder: number;
  isActive: boolean;
}

// Manages the same HeroSlide records used both as the public /hotel/[slug]
// gallery and the restaurant menu hero carousel — this view just gives hotel
// owners a photo-grid way to fill that gallery in, without the menu-item
// linking fields that only make sense from the menu side (see HeroSlidesManager).
export default function HotelPhotosTab() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { showToast } = useToast();
  const restaurant = selectedRestaurant ?? restaurants[0];

  const slidesPath = restaurant ? `/api/restaurants/${restaurant.id}/hero-slides` : "";
  const [slides, setSlides] = useState<SlideData[]>(
    () => peekApiCache<{ slides: SlideData[] }>(slidesPath)?.slides ?? [],
  );
  const [loading, setLoading] = useState(() => !peekApiCache(slidesPath));
  // Local object-URL previews shown the instant photos are picked, before the
  // network upload finishes — same pattern as the Room Photos uploader.
  const [pendingPhotos, setPendingPhotos] = useState<{ id: string; previewUrl: string; file: File }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchSlides = useCallback(async () => {
    if (!restaurant) return;
    if (!peekApiCache(`/api/restaurants/${restaurant.id}/hero-slides`)) setLoading(true);
    try {
      const data = await apiFetch<{ slides: SlideData[] }>(
        `/api/restaurants/${restaurant.id}/hero-slides`,
      );
      setSlides(Array.isArray(data.slides) ? data.slides : []);
    } catch {
      // leave existing slides in place on transient failure
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length || !restaurant) return;

    const pending = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      previewUrl: URL.createObjectURL(file),
      file,
    }));
    setPendingPhotos((prev) => [...prev, ...pending]);
    try {
      const created = await runWithConcurrency(pending, 3, async (p) => {
        const imageUrl = await uploadFile(p.file, "hero-slides");
        const res = await apiFetch<{ slide: SlideData }>(
          `/api/restaurants/${restaurant.id}/hero-slides`,
          { method: "POST", body: { imageUrl } },
        );
        return res.slide;
      });
      setSlides((prev) => [...prev, ...created]);
    } catch {
      showToast("Some photos failed to upload", "error");
    } finally {
      setPendingPhotos((prev) => prev.filter((p) => !pending.includes(p)));
      pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    }
  };

  const handleToggleActive = async (slide: SlideData) => {
    if (!restaurant) return;
    setSlides((prev) => prev.map((s) => (s.id === slide.id ? { ...s, isActive: !s.isActive } : s)));
    try {
      await apiFetch<{ slide: SlideData }>(`/api/restaurants/${restaurant.id}/hero-slides`, {
        method: "PATCH",
        body: { slideId: slide.id, isActive: !slide.isActive },
      });
    } catch {
      setSlides((prev) => prev.map((s) => (s.id === slide.id ? slide : s))); // rollback
      showToast("Failed to update photo", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!restaurant) return;
    const snapshot = slides;
    setSlides((prev) => prev.filter((s) => s.id !== id));
    try {
      await apiFetch(`/api/restaurants/${restaurant.id}/hero-slides?slideId=${id}`, {
        method: "DELETE",
      });
    } catch {
      setSlides(snapshot); // rollback
      showToast("Failed to delete photo", "error");
    }
  };

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-3)]">
        <ImageIcon className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium">Select a restaurant first</p>
      </div>
    );
  }

  const hasPhotos = slides.length > 0 || pendingPhotos.length > 0;

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-1)]">Property Photos</h2>
        <p className="text-sm text-[var(--text-3)] mt-0.5">
          Shown in your hotel&apos;s public gallery — the first photo is the cover guests see first.
        </p>
      </div>

      {!loading && !hasPhotos ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-3)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-muted)] mb-4 text-[var(--accent-text)]">
            <ImageIcon className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-2)]">No photos yet</p>
          <p className="text-xs mt-1">
            Add a few so guests see your property instead of empty placeholders
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className={cn(
                "relative group aspect-square rounded-xl overflow-hidden ring-1 bg-[var(--canvas-sub)]",
                slide.isActive ? "ring-[var(--border)]" : "ring-[var(--border)] opacity-50",
              )}
            >
              <img
                src={slide.imageUrl}
                alt={slide.title || "Property photo"}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-colors group-hover:bg-black/50 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleToggleActive(slide)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[var(--text-1)]"
                  title={slide.isActive ? "Hide from gallery" : "Show in gallery"}
                >
                  {slide.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(slide.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-600"
                  title="Delete photo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {idx === 0 && slide.isActive && (
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow-sm">
                  Cover
                </span>
              )}
              {!slide.isActive && (
                <span className="absolute top-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                  Hidden
                </span>
              )}
            </div>
          ))}
          {pendingPhotos.map((p) => (
            <div
              key={p.id}
              className="relative aspect-square rounded-xl overflow-hidden ring-1 ring-[var(--border)] bg-[var(--canvas-sub)]"
            >
              <img src={p.previewUrl} alt="Uploading" className="h-full w-full object-cover opacity-60" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            </div>
          ))}
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
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-6 text-center hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent-text)]">
          <ImageIcon className="h-5 w-5" />
        </span>
        <span className="text-[13px] font-bold text-[var(--text-1)]">
          {hasPhotos ? "Add more photos" : "Click to upload photos"}
        </span>
        <span className="text-[11px] text-[var(--text-3)]">
          JPG or PNG · You can select several · First photo is the cover
        </span>
      </button>
    </div>
  );
}
