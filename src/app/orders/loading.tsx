import Skeleton, {
  SkeletonOrderCard,
} from "@/components/shared/Skeleton";

export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas-sub)] pb-24">
      <div className="border-b border-[var(--border-soft)] bg-[var(--canvas)] px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-28 rounded" />
            <Skeleton className="h-3 w-40 rounded" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      <main className="mx-auto max-w-2xl space-y-3 px-4 py-6">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
          ))}
        </div>

        {/* Order list */}
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonOrderCard key={i} />
        ))}
      </main>
    </div>
  );
}
