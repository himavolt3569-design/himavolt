export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] animate-pulse">
      <div className="h-[180px] sm:h-[240px] bg-[var(--surface)]" />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-[var(--surface)]" />
          <div className="h-4 w-32 rounded bg-[var(--surface)]" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-24 rounded-full bg-[var(--surface)] shrink-0"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden border border-[var(--border-soft)]"
            >
              <div className="h-40 bg-[var(--surface)]" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-3/4 rounded bg-[var(--surface)]" />
                <div className="h-4 w-1/2 rounded bg-[var(--surface)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
