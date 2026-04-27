import Skeleton, { SkeletonGrid } from "@/components/shared/Skeleton";

export default function HotelLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas-sub)]">
      {/* Nav */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--canvas)]/80 px-5 py-3.5 backdrop-blur-xl">
        <Skeleton className="h-5 w-28 rounded" />
        <Skeleton className="h-5 w-24 rounded" />
      </div>

      {/* Hero */}
      <Skeleton className="h-64 w-full rounded-none sm:h-80 md:h-96" />

      {/* Quick info bar */}
      <div className="border-b border-[var(--border-soft)] bg-[var(--canvas)] px-5 py-3 flex gap-6 overflow-x-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-32 shrink-0 rounded" />
        ))}
      </div>

      {/* Type filter */}
      <div className="sticky top-[57px] z-30 bg-[var(--canvas)]/90 backdrop-blur-sm border-b border-[var(--border-soft)] px-5 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      {/* Rooms grid */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <SkeletonGrid rows={2} cols={3} cardClass="h-72 rounded-2xl" />
      </main>
    </div>
  );
}
