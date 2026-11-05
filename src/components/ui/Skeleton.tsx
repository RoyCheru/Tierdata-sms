import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-sunken", className)} />;
}

export function SkeletonTableRows({ columns = 4, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className={cn("h-4 flex-1", colIndex === 0 && "max-w-40")} />
          ))}
        </div>
      ))}
    </div>
  );
}
