"use client";

import { useCallback, useState } from "react";
import { ImageIcon, Loader2, Store, Trash2, Upload } from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { uploadFile } from "@/lib/upload";

/**
 * Logo and cover photograph for this restaurant.
 *
 * The first-run modal asks for these once. This is the permanent home, so an
 * owner can change a seasonal cover or fix a bad crop later without waiting for
 * a prompt they already dismissed.
 *
 * These two images are the whole of a venue's visual identity on the platform:
 * the cover is what customers judge on every card in search results, and the
 * logo carries onto the menu page, receipts and order updates.
 */
export default function BrandingTab() {
  const { selectedRestaurant, updateRestaurant, fetchRestaurants } = useRestaurant();
  const { showToast } = useToast();

  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [saving, setSaving] = useState(false);

  const logoUrl = selectedRestaurant?.imageUrl ?? "";
  const coverUrl = selectedRestaurant?.coverUrl ?? "";

  const save = useCallback(
    async (patch: { imageUrl?: string | null; coverUrl?: string | null }) => {
      if (!selectedRestaurant) return;
      setSaving(true);
      try {
        await updateRestaurant(selectedRestaurant.id, patch);
        await fetchRestaurants();
        showToast("Saved", "success");
      } catch {
        showToast("Could not save. Please try again.", "error");
      }
      setSaving(false);
    },
    [selectedRestaurant, updateRestaurant, fetchRestaurants, showToast],
  );

  const pick = useCallback(
    async (kind: "logo" | "cover", file: File | undefined) => {
      if (!file) return;
      setUploading(kind);
      try {
        const url = await uploadFile(file, "restaurant");
        await save(kind === "logo" ? { imageUrl: url } : { coverUrl: url });
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Upload failed", "error");
      }
      setUploading(null);
    },
    [save, showToast],
  );

  if (!selectedRestaurant) return null;

  const busy = uploading !== null || saving;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-[var(--text-1)]">
          <ImageIcon className="h-5 w-5" />
          Photos &amp; Branding
        </h2>
        <p className="mt-1 text-sm text-[var(--text-2)]">
          How {selectedRestaurant.name} looks to customers across the site.
        </p>
      </div>

      {/* Cover */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5">
        <h3 className="text-sm font-bold text-[var(--text-1)]">
          Cover photograph
        </h3>
        <p className="mb-4 mt-0.5 text-[12px] text-[var(--text-3)]">
          The main image on your card in nearby search, category pages and the
          landing page. A wide shot of your food or your room works best. Without
          one, customers see a plain placeholder next to venues that have a photo.
        </p>

        <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-[var(--canvas-sub)]">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 text-[var(--text-3)]">
              <Store className="h-8 w-8" />
              <span className="text-[12px] font-semibold">
                This is what customers see now
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[var(--accent-hover)]">
            {uploading === "cover" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {coverUrl ? "Replace cover" : "Upload cover"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => pick("cover", e.target.files?.[0])}
            />
          </label>

          {coverUrl && (
            <button
              onClick={() => save({ coverUrl: null })}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-[var(--text-3)] transition-colors hover:text-red-500 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          )}
        </div>
      </section>

      {/* Logo */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5">
        <h3 className="text-sm font-bold text-[var(--text-1)]">Logo</h3>
        <p className="mb-4 mt-0.5 text-[12px] text-[var(--text-3)]">
          Shown on your menu page header, printed receipts and order updates. A
          square image with the subject centred works best.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Store className="h-7 w-7 text-[var(--text-3)]" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--surface)] px-4 py-2.5 text-[13px] font-bold text-[var(--text-1)] transition-colors hover:bg-[var(--canvas-sub)]">
              {uploading === "logo" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {logoUrl ? "Replace logo" : "Upload logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => pick("logo", e.target.files?.[0])}
              />
            </label>

            {logoUrl && (
              <button
                onClick={() => save({ imageUrl: null })}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-[var(--text-3)] transition-colors hover:text-red-500 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Live preview of the public card, so the effect is obvious */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5">
        <h3 className="mb-3 text-sm font-bold text-[var(--text-1)]">
          How your card looks to customers
        </h3>
        <div className="w-full max-w-[220px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--canvas)]">
          <div className="h-28 w-full overflow-hidden bg-[var(--surface)]">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Store className="h-6 w-6 text-[var(--text-3)]" />
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="truncate text-[14px] font-bold text-[var(--text-1)]">
              {selectedRestaurant.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-3)]">
              {selectedRestaurant.city}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
