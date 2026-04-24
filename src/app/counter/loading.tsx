export default function CounterLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] animate-pulse">
      <div className="h-16 border-b border-[var(--border-soft)] flex items-center px-4 gap-4">
        <div className="h-8 w-36 rounded bg-[var(--surface)]" />
        <div className="ml-auto flex gap-2">
          <div className="h-8 w-24 rounded bg-[var(--surface)]" />
          <div className="h-8 w-8 rounded-full bg-[var(--surface)]" />
        </div>
      </div>
      <div className="flex gap-3 p-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 w-36 h-20 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--border-soft)] p-4 space-y-3"
          >
            <div className="flex justify-between">
              <div className="h-5 w-24 rounded bg-[var(--surface)]" />
              <div className="h-6 w-16 rounded-full bg-[var(--surface)]" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-[var(--surface)]" />
              <div className="h-4 w-2/3 rounded bg-[var(--surface)]" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 flex-1 rounded-lg bg-[var(--surface)]" />
              <div className="h-9 flex-1 rounded-lg bg-[var(--surface)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
