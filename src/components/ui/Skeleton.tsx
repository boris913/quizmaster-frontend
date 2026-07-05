import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden="true" />;
}

/** A ready-made skeleton mimicking a Card row (e.g. a quiz or session list item). */
export function SkeletonCardRow() {
  return (
    <div className="rounded-lg border border-borderc bg-surface p-4 flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-5 w-5 rounded-full" />
    </div>
  );
}
