"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export default function TutorialGallery({
  initialVideoId,
}: {
  initialVideoId?: string;
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(initialVideoId ?? null);
  const [filter, setFilter] = useState<string>("all");
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tutorials");
        if (!res.ok) throw new Error("Could not load videos");
        const json = (await res.json()) as ApiResponse;
        if (cancelled) return;
        setData(json);
        setActiveId((prev) => prev ?? json.featured?.id ?? null);
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

  const active = useMemo(
    () => allVideos.find((v) => v.id === activeId) ?? allVideos[0] ?? null,
    [allVideos, activeId],
  );

  const activeCategory = useMemo(
    () => data?.categories.find((c) => c.id === active?.categoryId) ?? null,
    [data, active],
  );

  const shownCategories = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.categories;
    return data.categories.filter((c) => c.id === filter);
  }, [data, filter]);

  const select = (video: TutorialVideoDTO) => {
    setActiveId(video.id);
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const countView = (id: string) => {
    // Fire and forget; a failed count must never interrupt playback.
    void fetch(`/api/tutorials/${id}/view`, { method: "POST" }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--accent)]" />
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

  return (
    <div className="space-y-12">
      {/* ── Stage ─────────────────────────────────────────────────────── */}
      <div ref={stageRef} className="scroll-mt-24">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start">
          {active && (
            <VideoPlayer
              key={active.id}
              video={active}
              onCounted={() => countView(active.id)}
            />
          )}

          {active && (
            <div className="lg:pt-1">
              {activeCategory && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--accent-text)] ring-1 ring-[var(--accent-border)]">
                  {iconFor(activeCategory.icon)}
                  {activeCategory.name}
                </span>
              )}

              <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight text-[var(--text-1)] sm:text-3xl">
                {active.title}
              </h2>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-[var(--text-3)]">
                {formatDuration(active.durationSec) && (
                  <span className="tabular-nums">
                    {formatDuration(active.durationSec)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {active.viewCount.toLocaleString()}
                </span>
                {active.audience === "AUTHENTICATED" && (
                  <span className="inline-flex items-center gap-1 text-[var(--accent-text)]">
                    <Lock className="h-3.5 w-3.5" />
                    Members only
                  </span>
                )}
              </div>

              {active.description && (
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-2)]">
                  {active.description}
                </p>
              )}

              {!data.signedIn && (
                <div className="mt-6 rounded-xl bg-[var(--accent-muted)] p-4 ring-1 ring-[var(--accent-border)]">
                  <p className="text-sm font-semibold text-[var(--text-1)]">
                    More walkthroughs inside
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-2)]">
                    Sign in to unlock the full POS, kitchen and billing guides.
                  </p>
                  <a
                    href="/sign-in"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.98]"
                  >
                    Get started free
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
                  active={video.id === active?.id}
                  onSelect={() => select(video)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
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

function VideoCard({
  video,
  active,
  onSelect,
}: {
  video: TutorialVideoDTO;
  active: boolean;
  onSelect: () => void;
}) {
  const duration = formatDuration(video.durationSec);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group/card overflow-hidden rounded-2xl bg-[var(--surface)] text-left ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-22px_rgba(44,26,14,0.5)] active:scale-[0.99] ${
        active
          ? "ring-2 ring-[var(--accent)]"
          : "ring-[var(--border)] hover:ring-[var(--accent-border)]"
      }`}
      aria-current={active ? "true" : undefined}
    >
      <div className="relative aspect-video overflow-hidden bg-[var(--canvas-sub)]">
        {video.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.posterUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--accent-muted)] to-[var(--canvas-sub)]">
            <PlayCircle className="h-9 w-9 text-[var(--accent)] opacity-60" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover/card:bg-black/25" />

        <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-[var(--accent)] opacity-0 shadow-lg transition-all duration-300 group-hover/card:scale-100 group-hover/card:opacity-100">
          <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
        </span>

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

      <div className="p-3.5">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-[var(--text-1)]">
          {video.title}
        </p>
        {video.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-3)]">
            {video.description}
          </p>
        )}
      </div>
    </button>
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
