interface Props {
  className?: string;
}

export function Skeleton({ className = '' }: Props) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function SkeletonCard({ className = '' }: Props) {
  return (
    <div className={`glass-surface rounded-2xl p-6 border border-white/5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-14 w-24 mb-3" />
      <Skeleton className="h-6 w-20 rounded-lg" />
    </div>
  );
}

export function SkeletonChart({ className = '' }: Props) {
  return (
    <div className={`glass-surface rounded-2xl p-6 border border-white/5 ${className}`}>
      <Skeleton className="h-5 w-48 mb-6" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export function SkeletonText({ className = '' }: Props) {
  return <Skeleton className={`h-4 rounded ${className}`} />;
}
