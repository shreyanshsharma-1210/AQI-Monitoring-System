/**
 * Reusable loading skeleton components.
 * Usage:
 *   <Skeleton className="h-4 w-32" />
 *   <SkeletonCard />
 *   <SkeletonGauge />
 */

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-700 dark:bg-gray-700 light:bg-gray-200 ${className}`}
    />
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="rounded-xl bg-gray-800 dark:bg-gray-800 light:bg-gray-100 p-4 space-y-3 animate-pulse">
      <Skeleton className="h-4 w-2/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-1/2' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonGauge() {
  return (
    <div className="flex flex-col items-center gap-3 animate-pulse">
      <Skeleton className="h-36 w-36 rounded-full" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 bg-gray-800 dark:bg-gray-800 light:bg-gray-100 rounded-xl px-4 py-3 animate-pulse">
      <Skeleton className="h-4 w-6 shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-2 w-14" />
      </div>
      <Skeleton className="h-7 w-20 rounded-lg" />
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}
