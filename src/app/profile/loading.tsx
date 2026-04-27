import Skeleton, {
  SkeletonAvatar,
  SkeletonStatGrid,
} from "@/components/shared/Skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas-sub)] pb-24">
      <main className="mx-auto max-w-md space-y-5 px-4 py-8">
        {/* Identity */}
        <div className="flex items-center gap-4 rounded-3xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--border-soft)]">
          <SkeletonAvatar size="xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
        </div>

        <SkeletonStatGrid count={2} className="grid-cols-2 sm:grid-cols-2 lg:grid-cols-2" />

        {/* Settings list */}
        <div className="rounded-2xl bg-[var(--canvas)] p-2 ring-1 ring-[var(--border-soft)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-3"
            >
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-1/3 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
