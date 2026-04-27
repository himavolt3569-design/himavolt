import Skeleton, {
  SkeletonText,
  SkeletonOrderCard,
} from "@/components/shared/Skeleton";

export default function TrackOrderLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas-sub)] pb-12">
      {/* Top bar */}
      <div className="border-b border-[var(--border-soft)] bg-[var(--canvas)] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        {/* Status hero */}
        <div className="space-y-3 rounded-3xl bg-[var(--canvas)] p-6 ring-1 ring-[var(--border-soft)]">
          <Skeleton className="mx-auto h-14 w-14 rounded-full" />
          <Skeleton className="mx-auto h-5 w-44 rounded" />
          <Skeleton className="mx-auto h-4 w-28 rounded" />
        </div>

        {/* Timeline steps */}
        <div className="rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)]">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3 rounded" />
                  <Skeleton className="h-3 w-1/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)] space-y-3">
          <Skeleton className="h-5 w-28 rounded" />
          <SkeletonText lines={3} />
        </div>

        <SkeletonOrderCard />
      </main>
    </div>
  );
}
