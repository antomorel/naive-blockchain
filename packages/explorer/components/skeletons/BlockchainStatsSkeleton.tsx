import { Skeleton } from "@/components/ui/skeleton";

const SkeletonCard = () => (
  <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-2">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-8 w-32" />
  </div>
);

export const BlockchainStatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </div>
);
