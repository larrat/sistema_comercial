import React from 'react';

type ShimmerProps = {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
};

export function Shimmer({ className = '', width, height, rounded = 'md' }: ShimmerProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  const roundedClass = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={`relative overflow-hidden bg-white/5 ${roundedClass} ${className} animate-pulse`}
      style={style}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/5">
          <Shimmer width={48} height={48} rounded="lg" />
          <div className="flex-1 flex flex-col gap-2">
            <Shimmer width="60%" height={16} />
            <Shimmer width="40%" height={12} />
          </div>
          <Shimmer width={80} height={24} rounded="full" />
        </div>
      ))}
    </div>
  );
}
