'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionProps {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  delay?: number;
}

const variantStyles = {
  primary: {
    iconBg: 'bg-blue-50 group-hover:bg-blue-100',
    iconColor: 'text-blue-600',
    border: 'group-hover:border-blue-300',
  },
  secondary: {
    iconBg: 'bg-blue-50 group-hover:bg-blue-100',
    iconColor: 'text-blue-600',
    border: 'group-hover:border-blue-300',
  },
  success: {
    iconBg: 'bg-blue-50 group-hover:bg-blue-100',
    iconColor: 'text-blue-600',
    border: 'group-hover:border-blue-300',
  },
  warning: {
    iconBg: 'bg-blue-50 group-hover:bg-blue-100',
    iconColor: 'text-blue-600',
    border: 'group-hover:border-blue-300',
  },
};

export function QuickAction({
  href,
  label,
  description,
  icon: Icon,
  variant = 'primary',
  delay = 0,
}: QuickActionProps) {
  const styles = variantStyles[variant];

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-4 p-5 rounded-xl',
        'bg-white border border-gray-200 transition-all duration-200',
        'hover:border-gray-300 hover:shadow-md',
        styles.border
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          'w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
          styles.iconBg
        )}
      >
        <Icon className={cn('w-5 h-5', styles.iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-900">
          {label}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{description}</p>
      </div>
    </Link>
  );
}
