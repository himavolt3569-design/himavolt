import {
  SkeletonDetailHero,
  SkeletonGrid,
} from "@/components/shared/Skeleton";

export default function FoodDetailLoading() {
  return (
    <div className="min-h-screen bg-[var(--canvas-sub)] pb-24">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <SkeletonDetailHero />
        <div className="space-y-3">
          <div className="h-5 w-40 rounded-md bg-[var(--surface)] animate-pulse" />
          <SkeletonGrid rows={2} cols={3} cardClass="h-44 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
