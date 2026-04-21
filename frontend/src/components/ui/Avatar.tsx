'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function stringToColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-blue-600',
    'bg-blue-400',
    'bg-blue-700',
    'bg-blue-300',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  className,
  status,
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const initials = getInitials(name);
  const bgColor = stringToColor(name);

  return (
    <div className={cn('relative inline-flex', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-semibold text-white overflow-hidden',
          sizeMap[size],
          !src || imageError ? bgColor : 'bg-gray-100'
        )}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white',
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

interface AvatarGroupProps {
  avatars: { src?: string; name: string }[];
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function AvatarGroup({
  avatars,
  max = 3,
  size = 'md',
  className,
}: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {visibleAvatars.map((avatar, index) => (
        <div
          key={index}
          className="relative ring-2 ring-white rounded-full"
        >
          <Avatar {...avatar} size={size} />
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'relative ring-2 ring-white rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500',
            sizeMap[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
