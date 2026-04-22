'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'outline'
  | 'dark'
  | 'dark-primary'
  | 'dark-success'
  | 'dark-warning';

type BadgeSize = 'sm' | 'md';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotColor?: string;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-blue-50 text-blue-700 border-blue-200',
  primary: 'bg-blue-50 text-blue-700 border-blue-200',
  secondary: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  outline: 'bg-transparent text-blue-600 border-blue-300',
  dark: 'bg-white/10 text-white border-white/20',
  'dark-primary': 'bg-primary-500/20 text-primary-400 border-primary-500/30',
  'dark-success': 'bg-green-500/20 text-green-400 border-green-500/30',
  'dark-warning': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const sizeStyles = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  dotColor,
  className,
  ...props
}: BadgeProps) {
  const resolvedDotColor = dotColor
    || (variant === 'success' ? '#22c55e'
    : variant === 'warning' ? '#f59e0b'
    : variant === 'error' ? '#ef4444'
    : '#3b82f6');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: resolvedDotColor }}
        />
      )}
      {children}
    </span>
  );
}
