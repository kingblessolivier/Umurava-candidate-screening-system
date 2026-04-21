'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  trend?: {
    value: string;
    isPositive: boolean;
  };
  delay?: number;
}

const variantStyles = {
  primary: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  secondary: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  success: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  warning: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
};

export function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  variant = 'primary',
  trend,
  delay = 0,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card isHoverable>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', styles.iconBg)}>
            <Icon className={cn('w-5 h-5', styles.iconColor)} />
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          {subValue && (
            <span className="text-sm text-gray-500">{subValue}</span>
          )}
        </div>

        {trend && (
          <div className="mt-2 flex items-center gap-1">
            <span
              className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
            <span className="text-xs text-gray-400">vs last month</span>
          </div>
        )}
      </div>
    </Card>
  );
}
