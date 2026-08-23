import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import Footer from "@/components/layout/Footer";

export default function BlogLoading() {
  return (
    <>
      <MarketplaceHeader />
      <div className="min-h-screen bg-[#F7F9FC] pt-12 pb-20 px-4">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <div className="h-10 sm:h-12 w-64 bg-gray-200 animate-pulse rounded-lg mx-auto mb-4" />
            <div className="h-6 w-80 max-w-full bg-gray-200 animate-pulse rounded-lg mx-auto" />
          </div>

          <div className="mb-12 h-14 w-full max-w-2xl mx-auto bg-gray-200 animate-pulse rounded-[1.5rem]" />

          <div className="flex flex-col lg:flex-row gap-12">
            {/* Main Content Skeleton */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col bg-white border border-[var(--border-soft)] rounded-3xl overflow-hidden shadow-sm h-[400px]">
                    <div className="w-full aspect-video bg-gray-200 animate-pulse" />
                    <div className="p-6 flex-1 flex flex-col gap-4">
                      <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                      <div className="h-6 w-3/4 bg-gray-200 animate-pulse rounded" />
                      <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                      <div className="h-4 w-5/6 bg-gray-200 animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <div className="w-full lg:w-80 shrink-0 space-y-8">
              <div className="bg-white p-6 rounded-3xl border border-[var(--border-soft)] shadow-sm h-72">
                <div className="h-6 w-32 bg-gray-200 animate-pulse rounded mb-6" />
                <div className="space-y-3">
                  <div className="h-10 w-full bg-gray-200 animate-pulse rounded-xl" />
                  <div className="h-10 w-full bg-gray-200 animate-pulse rounded-xl" />
                  <div className="h-10 w-full bg-gray-200 animate-pulse rounded-xl" />
                  <div className="h-10 w-full bg-gray-200 animate-pulse rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
