import { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Tailwind classes that define size (e.g. "h-6 w-32"). */
  className?: string;
}

/**
 * Pulsing placeholder block. Use composition (multiple <Skeleton />s)
 * to mirror the shape of the content being loaded.
 */
export function Skeleton({ className = '', ...rest }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-[var(--bg-hover)] shadow-[var(--shadow-inset)] ${className}`}
      {...rest}
    />
  );
}

/** Convenience: a generic page-skeleton used while a route is loading. */
export function PageSkeleton() {
  return (
    <div className="app-page" aria-busy="true">
      <span className="sr-only">Загрузка</span>
      <Skeleton className="h-8 w-48 mb-3" />
      <Skeleton className="h-4 w-32 mb-6" />
      <Skeleton className="h-24 w-full mb-4" />
      <Skeleton className="h-32 w-full mb-4" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}
