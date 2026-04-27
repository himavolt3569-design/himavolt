import Skeleton, { SkeletonText } from "@/components/shared/Skeleton";

export default function FeedbackLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--accent-muted)] to-[var(--canvas)] flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md mb-6">
        <Skeleton className="h-4 w-32 rounded" />
      </div>
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-[var(--canvas)] ring-1 ring-[var(--border-soft)] shadow-2xl">
        <div className="bg-gradient-to-br from-[#3e1e0c] to-[#5a3118] px-6 py-8 text-center space-y-3">
          <Skeleton className="mx-auto h-16 w-16 rounded-2xl bg-white/15" />
          <Skeleton className="mx-auto h-5 w-44 rounded bg-white/15" />
          <Skeleton className="mx-auto h-3 w-32 rounded bg-white/15" />
        </div>
        <div className="space-y-5 p-6">
          {/* Star row */}
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-9 rounded-full" />
            ))}
          </div>

          <SkeletonText lines={4} />

          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
