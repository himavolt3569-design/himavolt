import Skeleton, {
  SkeletonStatGrid,
  SkeletonTable,
} from "@/components/shared/Skeleton";

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EFF6FF] via-[#F5F8FF] to-[#EDF2FF]">
      {/* Top bar */}
      <div className="border-b border-[var(--border-soft)] bg-[var(--canvas)]/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-32 rounded" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Tab strip */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-xl" />
          ))}
        </div>

        {/* Live presence card */}
        <div className="rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--accent-border)] space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
          <SkeletonStatGrid count={4} />
        </div>

        <SkeletonStatGrid count={8} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)] lg:col-span-2 space-y-3">
            <Skeleton className="h-5 w-40 rounded" />
            <SkeletonTable rows={5} />
          </div>
          <div className="rounded-2xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)] space-y-3">
            <Skeleton className="h-5 w-32 rounded" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-4 flex-1 rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
