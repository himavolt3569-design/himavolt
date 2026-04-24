export default function KitchenLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] animate-pulse">
      <div className="h-16 border-b border-[var(--border-soft)] flex items-center px-4 gap-4">
        <div className="h-8 w-32 rounded bg-[var(--surface)]" />
        <div className="flex gap-2 ml-auto">
          <div className="h-8 w-20 rounded bg-[var(--surface)]" />
          <div className="h-8 w-20 rounded bg-[var(--surface)]" />
        </div>
      </div>
      <div className="flex gap-2 px-4 py-3 border-b border-[var(--border-soft)]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-lg bg-[var(--surface)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--border-soft)] p-4 space-y-3"
          >
            <div className="flex justify-between">
              <div className="h-5 w-20 rounded bg-[var(--surface)]" />
              <div className="h-5 w-16 rounded bg-[var(--surface)]" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-[var(--surface)]" />
              <div className="h-4 w-3/4 rounded bg-[var(--surface)]" />
            </div>
            <div className="h-9 w-full rounded-lg bg-[var(--surface)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
