import Skeleton from "@/components/shared/Skeleton";

export default function SignInLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <Skeleton className="mx-auto h-9 w-32 rounded" />
          <Skeleton className="mx-auto h-3 w-48 rounded" />
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-6 shadow-xl space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="space-y-2 pt-2">
            <Skeleton className="mx-auto h-3 w-32 rounded" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
