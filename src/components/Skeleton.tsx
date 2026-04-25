interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height
}: SkeletonProps) {
  const baseClasses = 'skeleton';

  const variantClasses = {
    text: 'h-4 w-full',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-xl',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'string' ? width : `${width}px`;
  if (height) style.height = typeof height === 'string' ? height : `${height}px`;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

interface SkeletonCardProps {
  lines?: number;
}

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <div className="card-bold space-y-4">
      <Skeleton variant="rounded" height="24px" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" />
      ))}
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="card-bold overflow-hidden p-0">
      <div className="bg-[color:var(--color-tournament-border)]/20 px-4 py-3">
        <Skeleton variant="text" height="12px" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton variant="circular" width="32px" height="32px" />
            <div className="flex-1">
              <Skeleton variant="text" height="16px" />
            </div>
            <Skeleton variant="text" width="40px" height="20px" />
          </div>
        ))}
      </div>
    </div>
  );
}
