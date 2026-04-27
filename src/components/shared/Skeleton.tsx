import { cn } from "@/lib/utils";

/**
 * Single-element shimmer block. Everything else in this file composes on top
 * of it so the whole site shares one animation source (`animate-pulse`).
 *
 * Tailwind 4 uses CSS variables (`--surface`) so skeletons match the active
 * theme automatically — no light/dark variants needed at the call site.
 */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[var(--surface)]",
        className,
      )}
    />
  );
}

/* ── Atoms ─────────────────────────────────────────────────────────── */

export function SkeletonLine({
  width = "w-full",
  height = "h-4",
  className,
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return <Skeleton className={cn(height, width, className)} />;
}

export function SkeletonAvatar({
  size = "md",
  rounded = "full",
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  rounded?: "full" | "xl" | "2xl";
  className?: string;
}) {
  const sizeClass =
    size === "sm"
      ? "h-8 w-8"
      : size === "lg"
        ? "h-14 w-14"
        : size === "xl"
          ? "h-20 w-20"
          : "h-10 w-10";
  const radius =
    rounded === "full"
      ? "rounded-full"
      : rounded === "xl"
        ? "rounded-xl"
        : "rounded-2xl";
  return <Skeleton className={cn(sizeClass, radius, "shrink-0", className)} />;
}

export function SkeletonButton({
  width = "w-24",
  height = "h-9",
  className,
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return <Skeleton className={cn(height, width, "rounded-lg", className)} />;
}

/* ── Molecules ──────────────────────────────────────────────────────── */

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-4 shadow-sm", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--canvas)] px-4 py-3">
          <Skeleton className="h-4 w-16 shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24 shrink-0" />
          <Skeleton className="h-7 w-20 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonOrderCard() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonMenuItemCard() {
  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] overflow-hidden shadow-sm">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* ── Organisms ──────────────────────────────────────────────────────── */

/**
 * A reusable card-grid skeleton. Accepts a per-card class so callers can
 * opt-in to e.g. square cards (POS kiosk) or wide cards (room listing).
 */
export function SkeletonGrid({
  rows = 2,
  cols = 3,
  cardClass = "h-32 rounded-2xl",
  className,
}: {
  rows?: number;
  cols?: number;
  cardClass?: string;
  className?: string;
}) {
  const total = rows * cols;
  const colsClass =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : cols === 4
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={cn("grid gap-4", colsClass, className)}>
      {Array.from({ length: total }).map((_, i) => (
        <Skeleton key={i} className={cardClass} />
      ))}
    </div>
  );
}

export function SkeletonStatGrid({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-1/2 rounded" />
              <Skeleton className="h-7 w-2/3 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Hero placeholder used by detail pages (food, hotel room, bill, etc.).
 * Renders the same vertical rhythm as the real page so layout doesn't shift
 * once the data loads in.
 */
export function SkeletonDetailHero({
  showSuggestions = false,
}: {
  showSuggestions?: boolean;
}) {
  return (
    <div className="space-y-5">
      <Skeleton className="h-64 w-full rounded-3xl sm:h-80" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/2 rounded-md" />
        <Skeleton className="h-4 w-1/3 rounded-md" />
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      {showSuggestions && (
        <div className="space-y-3 pt-4">
          <Skeleton className="h-5 w-40 rounded-md" />
          <SkeletonGrid rows={1} cols={3} />
        </div>
      )}
    </div>
  );
}

export default Skeleton;
