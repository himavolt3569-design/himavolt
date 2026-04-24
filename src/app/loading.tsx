export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)]">
      <div className="h-8 w-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
    </div>
  );
}
