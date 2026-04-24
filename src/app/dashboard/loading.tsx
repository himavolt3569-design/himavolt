export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] flex animate-pulse">
      <div className="hidden md:flex flex-col w-64 border-r border-[var(--border-soft)] p-4 gap-3">
        <div className="h-8 w-40 rounded bg-[var(--surface)] mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 w-full rounded-lg bg-[var(--surface)]" />
        ))}
      </div>
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 rounded bg-[var(--surface)]" />
          <div className="h-9 w-32 rounded-lg bg-[var(--surface)]" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border-soft)] p-4 space-y-2"
            >
              <div className="h-4 w-20 rounded bg-[var(--surface)]" />
              <div className="h-7 w-16 rounded bg-[var(--surface)]" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[var(--border-soft)] h-80 bg-[var(--surface)]" />
      </div>
    </div>
  );
}
