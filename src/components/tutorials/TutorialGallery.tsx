"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlayCircle,
  LogIn,
  UtensilsCrossed,
  Monitor,
  ShoppingBag,
  CreditCard,
  Users,
  Settings,
  BedDouble,
  Truck,
  BarChart3,
  Sparkles,
  Play,
  Loader2,
  Eye,
  Lock,
  X,
  type LucideIcon,
} from "lucide-react";
import VideoPlayer from "./VideoPlayer";
import {
  formatDuration,
  type TutorialCategoryDTO,
  type TutorialVideoDTO,
} from "@/lib/tutorials";

/** Allowlisted icon names -> components. Unknown names fall back to PlayCircle. */
const ICONS: Record<string, LucideIcon> = {
  PlayCircle,
  LogIn,
  UtensilsCrossed,
  Monitor,
  ShoppingBag,
  CreditCard,
  Users,
  Settings,
  BedDouble,
  Truck,
  BarChart3,
  Sparkles,
};

interface ApiResponse {
  categories: TutorialCategoryDTO[];
  featured: TutorialVideoDTO | null;
  signedIn: boolean;
}

/**
 * The /demo library.
 *
 * Videos are browsed as a grid per section and played in a modal. An earlier
 * version pinned one video to a permanent stage at the top, which cost a screen
 * and a half before the first section and meant something was always playing at
 * you before you had chosen anything.
 *
 * Members-only videos are listed rather than hidden — seeing that a POS
 * walkthrough exists is the argument for signing up. They arrive from the API
 * with their media blanked, so the lock is enforced server-side.
 */
export default function TutorialGallery({
  initialVideoId,
}: {
  initialVideoId?: string;
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialVideoId ?? null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tutorials");
        if (!res.ok) throw new Error("Could not load videos");
        const json = (await res.json()) as ApiResponse;
        if (cancelled) return;
        setData(json);
      } catch {
        if (!cancelled) setError("We could not load the videos. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allVideos = useMemo(
    () => data?.categories.flatMap((c) => c.videos) ?? [],
    [data],
  );

  const open = useMemo(
    () => allVideos.find((v) => v.id === openId) ?? null,
    [allVideos, openId],
  );

  const openCategory = useMemo(
    () => data?.categories.find((c) => c.id === open?.categoryId) ?? null,
    [data, open],
  );

  const shownCategories = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.categories;
    return data.categories.filter((c) => c.id === filter);
  }, [data, filter]);

  const countView = useCallback((id: string) => {
    // Fire and forget; a failed count must never interrupt playback.
    void fetch(`/api/tutorials/${id}/view`, { method: "POST" }).catch(() => {});
  }, []);

  // A locked video reached by deep link must not sit in a modal that cannot
  // play it.
  useEffect(() => {
    if (open?.locked) setOpenId(null);
  }, [open]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="block overflow-hidden rounded-2xl bg-[var(--surface)] text-left ring-1 ring-[var(--border)] h-[240px]">
            <div className="relative aspect-video overflow-hidden bg-[var(--canvas-sub)] animate-pulse" />
            <div className="p-3.5 space-y-2 mt-1">
              <div className="h-4 w-3/4 bg-[var(--border-soft)] animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-[var(--border-soft)] animate-pulse rounded mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-[var(--surface)] p-8 text-center ring-1 ring-[var(--border)]">
        <p className="text-sm text-[var(--text-2)]">{error}</p>
      </div>
    );
  }

  if (!data || allVideos.length === 0) {
    return <EmptyState />;
  }

  const lockedCount = allVideos.filter((v) => v.locked).length;

  return (
    <div className="space-y-8">
      {/* ── Sign-in prompt, only when something is actually locked ─────── */}
      {!data.signedIn && lockedCount > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-[var(--accent-muted)] px-4 py-3 ring-1 ring-[var(--accent-border)]">
          <Lock className="h-4 w-4 shrink-0 text-[var(--accent-text)]" />
          <p className="min-w-0 flex-1 text-sm text-[var(--text-2)]">
            <span className="font-semibold text-[var(--text-1)]">
              {lockedCount} {lockedCount === 1 ? "video is" : "videos are"} members only.
            </span>{" "}
            Sign in to unlock the full POS, kitchen and billing guides.
          </p>
          <a
            href="/sign-in"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.98]"
          >
            <LogIn className="h-3.5 w-3.5" />
            Login
          </a>
        </div>
      )}

      {/* ── Section filter ────────────────────────────────────────────── */}
      {data.categories.length > 1 && (
        <div className="sticky top-16 z-20 -mx-4 border-y border-[var(--border-soft)] bg-[var(--canvas)]/85 px-4 py-2.5 backdrop-blur-md sm:top-[68px]">
          <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterPill
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label={`All ${allVideos.length}`}
            />
            {data.categories.map((c) => (
              <FilterPill
                key={c.id}
                active={filter === c.id}
                onClick={() => setFilter(c.id)}
                label={c.name}
                icon={iconFor(c.icon)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Sections ──────────────────────────────────────────────────── */}
      <div className="space-y-12">
        {shownCategories.map((category) => (
          <section key={category.id} id={category.slug} className="scroll-mt-32">
            <div className="mb-4 flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent-text)] ring-1 ring-[var(--accent-border)]">
                {iconFor(category.icon, "h-5 w-5")}
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold tracking-tight text-[var(--text-1)]">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="mt-0.5 text-sm text-[var(--text-3)]">
                    {category.description}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {category.videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onSelect={() => setOpenId(video.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {open && !open.locked && (
        <PlayerModal
          video={open}
          category={openCategory}
          onClose={() => setOpenId(null)}
          onCounted={() => countView(open.id)}
        />
      )}
    </div>
  );
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

function iconFor(name: string | null, className = "h-3.5 w-3.5") {
  const Icon = (name && ICONS[name]) || PlayCircle;
  return <Icon className={className} />;
}

function FilterPill({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] ${
        active
          ? "bg-[var(--accent)] text-white shadow-sm"
          : "bg-[var(--surface)] text-[var(--text-2)] ring-1 ring-[var(--border)] hover:ring-[var(--accent)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * One card. Locked cards are anchors to sign-in rather than buttons, so the
 * action is a real link — middle-clickable, and obvious from the status bar.
 */
function VideoCard({
  video,
  onSelect,
}: {
  video: TutorialVideoDTO;
  onSelect: () => void;
}) {
  const duration = formatDuration(video.durationSec);
  const locked = Boolean(video.locked);

  const shell =
    "group/card block overflow-hidden rounded-2xl bg-[var(--surface)] text-left ring-1 ring-[var(--border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-22px_rgba(44,26,14,0.5)] hover:ring-[var(--accent-border)] active:scale-[0.99]";

  const thumbnail = (
    <div className="relative aspect-video overflow-hidden bg-[var(--canvas-sub)]">
      {video.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.posterUrl}
          alt=""
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105 ${
            locked ? "blur-[2px] brightness-[0.55]" : ""
          }`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--accent-muted)] to-[var(--canvas-sub)]">
          <PlayCircle className="h-9 w-9 text-[var(--accent)] opacity-60" />
        </div>
      )}

      {locked ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45">
          <Lock className="h-5 w-5 text-white" />
          <span className="text-[11px] font-bold text-white underline underline-offset-2">
            Login to watch
          </span>
        </span>
      ) : (
        <>
          <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover/card:bg-black/25" />
          <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-[var(--accent)] opacity-0 shadow-lg transition-all duration-300 group-hover/card:scale-100 group-hover/card:opacity-100">
            <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
          </span>
        </>
      )}

      {duration && (
        <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white backdrop-blur-sm">
          {duration}
        </span>
      )}

      {video.audience === "AUTHENTICATED" && (
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          <Lock className="h-2.5 w-2.5" />
          Members
        </span>
      )}
    </div>
  );

  const body = (
    <div className="p-3.5">
      <p className="line-clamp-2 text-sm font-bold leading-snug text-[var(--text-1)]">
        {video.title}
      </p>
      {video.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-3)]">
          {video.description}
        </p>
      )}
      {locked && (
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent-text)]">
          <LogIn className="h-3 w-3" />
          Login to watch
        </span>
      )}
    </div>
  );

  if (locked) {
    return (
      <a href="/sign-in" className={shell} aria-label={`Sign in to watch ${video.title}`}>
        {thumbnail}
        {body}
      </a>
    );
  }

  return (
    <button type="button" onClick={onSelect} className={`${shell} w-full`}>
      {thumbnail}
      {body}
    </button>
  );
}

/** Modal player. The controls, including PiP and fullscreen, live in VideoPlayer. */
function PlayerModal({
  video,
  category,
  onClose,
  onCounted,
}: {
  video: TutorialVideoDTO;
  category: TutorialCategoryDTO | null;
  onClose: () => void;
  onCounted: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    // Freeze the page behind the modal so a scroll gesture over the player does
    // not move the gallery underneath it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:p-6"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.97 }}
          role="dialog"
          aria-modal="true"
          aria-label={video.title}
          className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl ring-1 ring-[var(--border)]"
        >
          <VideoPlayer video={video} autoPlay onCounted={onCounted} />

          <div className="flex items-start gap-4 p-5">
            <div className="min-w-0 flex-1">
              {category && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--accent-text)] ring-1 ring-[var(--accent-border)]">
                  {iconFor(category.icon)}
                  {category.name}
                </span>
              )}

              <h2 className="mt-2.5 text-xl font-black leading-tight tracking-tight text-[var(--text-1)] sm:text-2xl">
                {video.title}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-[var(--text-3)]">
                {formatDuration(video.durationSec) && (
                  <span className="tabular-nums">{formatDuration(video.durationSec)}</span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {video.viewCount.toLocaleString()}
                </span>
                {video.audience === "AUTHENTICATED" && (
                  <span className="inline-flex items-center gap-1 text-[var(--accent-text)]">
                    <Lock className="h-3.5 w-3.5" />
                    Members only
                  </span>
                )}
              </div>

              {video.description && (
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-2)]">
                  {video.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-lg p-2 text-[var(--text-3)] transition-colors hover:bg-[var(--canvas-sub)] hover:text-[var(--text-1)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md rounded-2xl bg-[var(--surface)] p-10 text-center ring-1 ring-[var(--border)]">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-muted)]">
        <PlayCircle className="h-7 w-7 text-[var(--accent)]" />
      </span>
      <h2 className="text-lg font-bold text-[var(--text-1)]">
        Walkthroughs are on the way
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">
        We are recording step-by-step videos for every part of HimaVolt. Check
        back shortly — or read the written guide in the meantime.
      </p>
      <a
        href="/guide"
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.98]"
      >
        Open the guide
      </a>
    </div>
  );
}
