import { Skeleton } from "@/components/ui/skeleton";

export const ProductCardSkeleton = () => {
  return (
    <div className="rounded-3xl overflow-hidden bg-[#15151A] border border-white/5">
      <Skeleton className="aspect-square w-full bg-white/5" />
      <div className="p-3.5 space-y-2">
        <Skeleton className="h-4 w-3/4 bg-white/5" />
        <Skeleton className="h-3 w-1/2 bg-white/5" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-4 w-16 bg-white/5" />
          <Skeleton className="h-3 w-12 bg-white/5" />
        </div>
      </div>
    </div>
  );
};
