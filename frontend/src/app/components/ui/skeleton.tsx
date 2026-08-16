import { cn } from './utils';

/**
 * Skeleton loading placeholder with shimmer animation.
 * Matches the shape of whatever content is loading.
 *
 * @example
 * <Skeleton className="h-8 w-32 rounded-md" />
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-white/5',
        className,
      )}
    />
  );
}
