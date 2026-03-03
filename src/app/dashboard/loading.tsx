export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6F8]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-gray-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-amber-500" />
        </div>
        <p className="text-sm font-medium text-gray-400 tracking-wide">
          Loading dashboard...
        </p>
      </div>
    </div>
  );
}
