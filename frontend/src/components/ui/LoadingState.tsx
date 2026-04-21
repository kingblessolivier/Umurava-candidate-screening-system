'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function LoadingState({
  size = 'md',
  text = 'Loading...',
  className,
  fullScreen = false,
}: LoadingStateProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-blue-600', sizeMap[size])} />
      {text && (
        <p className="text-sm text-gray-500">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm z-50">
        {content}
      </div>
    );
  }

  return content;
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className,
  style,
  ...props
}: SkeletonProps) {
  const baseStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    ...style,
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 rounded',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'h-4 w-full',
        className
      )}
      style={baseStyle}
      {...props}
    />
  );
}

export function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton width="60%" />
              <Skeleton width="40%" />
              <div className="flex gap-2 pt-2">
                <Skeleton width={60} height={20} className="rounded-full" />
                <Skeleton width={80} height={20} className="rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
