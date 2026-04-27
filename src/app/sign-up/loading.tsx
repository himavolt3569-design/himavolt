import Skeleton from "@/components/shared/Skeleton";

export default function SignUpLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <Skeleton className="mx-auto h-9 w-32 rounded" />
          <Skeleton className="mx-auto h-4 w-56 rounded" />
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border-2 border-[var(--border)] bg-[var(--canvas)] p-5 space-y-3"
            >
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-5 w-2/3 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <div className="space-y-1.5 pt-1">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-3 w-3/4 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
