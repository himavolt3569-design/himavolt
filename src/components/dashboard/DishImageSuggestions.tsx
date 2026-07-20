"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, ImagePlus } from "lucide-react";

type WebImage = { id: string; url: string; thumb: string; alt: string };

/**
 * Inline photo suggestions for the New/Edit Dish modal. As soon as a dish name
 * is typed it debounces, hits /api/image-search (which merges Pexels + Openverse
 * + Wikimedia), and shows a row of thumbnails to one-tap pick — so the owner
 * doesn't have to open the full picker to get a relevant photo. Hidden once an
 * image is chosen or the name is too short.
 */
export default function DishImageSuggestions({
  name,
  hasImage,
  onPick,
  onMore,
}: {
  name: string;
  hasImage: boolean;
  onPick: (url: string) => void;
  onMore: () => void;
}) {
  const [images, setImages] = useState<WebImage[]>([]);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  const q = name.trim();

  useEffect(() => {
    if (hasImage || q.length < 3) {
      setImages([]);
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/image-search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (id !== reqId.current) return; // a newer query superseded this one
        setImages(res.ok && Array.isArray(data.images) ? data.images.slice(0, 12) : []);
      } catch (e) {
        if ((e as Error).name !== "AbortError" && id === reqId.current) setImages([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, hasImage]);

  if (hasImage || q.length < 3) return null;
  if (!loading && images.length === 0) return null;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-3)]">
          <Sparkles className="h-3 w-3 text-[var(--accent)]" />
          Suggested photos for &ldquo;{q}&rdquo;
        </span>
        {images.length > 0 && (
          <button
            type="button"
            onClick={onMore}
            className="flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            <ImagePlus className="h-3 w-3" /> More
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {loading && images.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-[var(--surface)]" />
            ))
          : images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onPick(img.url)}
                title={img.alt || "Use this photo"}
                className="h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-[var(--border)] transition-all hover:ring-2 hover:ring-[var(--accent)] active:scale-95"
              >
                <img src={img.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
      </div>
    </div>
  );
}
