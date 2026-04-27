import Skeleton, { SkeletonText } from "@/components/shared/Skeleton";

export default function BillLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas-sub)] pb-12">
      <div className="border-b border-[var(--border-soft)] bg-[var(--canvas)] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        {/* Restaurant header */}
        <div className="rounded-3xl bg-[var(--canvas)] p-6 text-center ring-1 ring-[var(--border-soft)] space-y-3">
          <Skeleton className="mx-auto h-12 w-12 rounded-2xl" />
          <Skeleton className="mx-auto h-5 w-40 rounded" />
          <Skeleton className="mx-auto h-3 w-56 rounded" />
        </div>

        {/* Order metadata */}
        <div className="rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)]">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-1/2 rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)] space-y-3">
          <Skeleton className="h-4 w-20 rounded" />
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <SkeletonText lines={2} className="flex-1 max-w-xs" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)] space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-3.5 w-16 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
