import Skeleton, {
  SkeletonText,
} from "@/components/shared/Skeleton";

export default function RoomLandingLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas-sub)] pb-32">
      {/* Nav */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--canvas)]/80 px-4 py-3 backdrop-blur-xl">
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="h-5 w-24 rounded" />
      </div>

      {/* Hero */}
      <Skeleton className="h-72 w-full rounded-none sm:h-96" />

      <main className="mx-auto max-w-2xl space-y-5 px-4 -mt-8 sm:-mt-10">
        {/* Title card */}
        <div className="rounded-3xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)] shadow-lg space-y-3">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-6 w-2/3 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
          <Skeleton className="h-8 w-32 rounded" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-[var(--canvas-sub)] p-3 ring-1 ring-[var(--border-soft)] space-y-1.5"
            >
              <Skeleton className="h-3 w-1/2 rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)] space-y-3">
          <Skeleton className="h-4 w-32 rounded" />
          <SkeletonText lines={4} />
        </div>

        {/* Amenities */}
        <div className="rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)] space-y-3">
          <Skeleton className="h-4 w-32 rounded" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </main>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--border-soft)] bg-[var(--canvas)]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Skeleton className="h-12 flex-1 rounded-2xl" />
          <Skeleton className="h-12 w-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
