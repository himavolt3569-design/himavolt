"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Store,
  Upload,
  X,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";
import { uploadFile } from "@/lib/upload";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

/**
 * First run setup for a restaurant.
 *
 * Two problems this solves, both of which were silently costing owners business:
 *
 * 1. There was no way to give a restaurant a photograph anywhere in the product,
 *    so every card on the public landing page fell back to a grey cutlery icon.
 *    A venue with no picture reads as closed or fake next to one that has one.
 *
 * 2. An owner who signed up with Google has no password, so they cannot use the
 *    staff PIN screen or recover the account if they lose access to that Google
 *    account. Offering it at setup is the only moment they are guaranteed to see.
 *
 * Shown right after a restaurant is created, and again on dashboard open for
 * restaurants created before this existed. Dismissible, but it comes back until
 * the venue actually has a picture, because that is the part the public sees.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  initialImageUrl?: string | null;
  initialCoverUrl?: string | null;
  /** True when the account has no password yet (Google or OTP sign up). */
  needsPassword: boolean;
}

export default function RestaurantSetupModal({
  open,
  onClose,
  restaurantId,
  restaurantName,
  initialImageUrl,
  initialCoverUrl,
  needsPassword,
}: Props) {
  const { updateRestaurant } = useRestaurant();
  const { showToast } = useToast();

  const [logoUrl, setLogoUrl] = useState(initialImageUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl ?? "");
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [passwordDone, setPasswordDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const pick = useCallback(
    async (kind: "logo" | "cover", file: File | undefined) => {
      if (!file) return;
      setUploading(kind);
      try {
        const url = await uploadFile(file, "restaurant");
        if (kind === "logo") setLogoUrl(url);
        else setCoverUrl(url);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Upload failed", "error");
      }
      setUploading(null);
    },
    [showToast],
  );

  const savePassword = async () => {
    if (password.length < 8) {
      showToast("Use at least 8 characters", "error");
      return;
    }
    if (password !== confirm) {
      showToast("Both passwords must match", "error");
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      // Mirror onto our own row so the staff PIN screen and account recovery
      // know a password exists.
      await apiFetch("/api/me", { method: "PATCH", body: { hasPassword: true } });
      setPasswordDone(true);
      setPassword("");
      setConfirm("");
      showToast("Password set", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not set password", "error");
    }
    setSaving(false);
  };

  const saveAndClose = async () => {
    setSaving(true);
    try {
      if (logoUrl !== (initialImageUrl ?? "") || coverUrl !== (initialCoverUrl ?? "")) {
        await updateRestaurant(restaurantId, {
          imageUrl: logoUrl || null,
          coverUrl: coverUrl || null,
        });
      }
      showToast("Saved", "success");
      onClose();
    } catch {
      showToast("Could not save. Please try again.", "error");
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[var(--canvas)] shadow-2xl sm:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--canvas)] px-5 py-4">
          <div>
            <h2 className="text-[17px] font-black text-[var(--text-1)]">
              Finish setting up {restaurantName}
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--text-2)]">
              A photograph is the difference between a customer tapping your card
              and scrolling past it.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-[var(--text-3)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text-1)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-6 px-5 py-5">
          {/* Cover */}
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-[13px] font-bold text-[var(--text-1)]">
              <ImageIcon className="h-4 w-4 text-[var(--accent)]" />
              Cover photograph
            </h3>
            <p className="mb-3 text-[11px] text-[var(--text-3)]">
              Shown on your card in search results and across the landing page.
              A wide shot of the food or the room works best.
            </p>

            <div className="relative h-36 w-full overflow-hidden rounded-2xl bg-[var(--canvas-sub)]">
              {coverUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setCoverUrl("")}
                    className="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold text-white"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 text-[var(--text-3)]">
                  <Store className="h-7 w-7" />
                  <span className="text-[11px]">This is what customers see now</span>
                </div>
              )}
            </div>

            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[var(--accent-hover)]">
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
                disabled={uploading !== null}
                onChange={(e) => pick("cover", e.target.files?.[0])}
              />
            </label>
          </section>

          {/* Logo */}
          <section>
            <h3 className="mb-1 text-[13px] font-bold text-[var(--text-1)]">
              Logo
            </h3>
            <p className="mb-3 text-[11px] text-[var(--text-3)]">
              Used on your menu page, receipts and order updates.
            </p>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[var(--canvas-sub)]">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Store className="h-6 w-6 text-[var(--text-3)]" />
                  </div>
                )}
              </div>
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
                  disabled={uploading !== null}
                  onChange={(e) => pick("logo", e.target.files?.[0])}
                />
              </label>
            </div>
          </section>

          {/* Password, only when the account has none */}
          {needsPassword && !passwordDone && (
            <section className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-muted)] p-4">
              <h3 className="mb-1 flex items-center gap-2 text-[13px] font-bold text-[var(--text-1)]">
                <KeyRound className="h-4 w-4 text-[var(--accent-text)]" />
                Set a password
              </h3>
              <p className="mb-3 text-[11px] text-[var(--accent-text)]">
                You signed in with Google, so this account has no password yet.
                Setting one lets you sign in without Google and recover the
                account if you ever lose access to it.
              </p>
              <div className="space-y-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password, at least 8 characters"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)]"
                />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)]"
                />
                <button
                  onClick={savePassword}
                  disabled={saving || !password || !confirm}
                  className="w-full rounded-xl bg-[var(--text-1)] py-2.5 text-[13px] font-bold text-[var(--canvas)] transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Set password
                </button>
              </div>
            </section>
          )}

          {passwordDone && (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-semibold text-emerald-700">
              <Check className="h-4 w-4" />
              Password set. You can now sign in without Google.
            </p>
          )}
        </div>

        <footer className="sticky bottom-0 flex gap-2 border-t border-[var(--border)] bg-[var(--canvas)] px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-3 text-[13px] font-bold text-[var(--text-3)] transition-colors hover:text-[var(--text-1)]"
          >
            Later
          </button>
          <button
            onClick={saveAndClose}
            disabled={saving || uploading !== null}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-[14px] font-black text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save and continue
          </button>
        </footer>
      </div>
    </div>
  );
}
