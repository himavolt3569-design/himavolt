import { Loader2 } from "lucide-react";

export default function CounterLoading() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 text-[#eaa94d] animate-spin" />
        <p className="text-sm font-medium text-gray-500">Loading counter...</p>
      </div>
    </div>
  );
}
