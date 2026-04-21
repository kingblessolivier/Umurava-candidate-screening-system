'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ButtonBaseProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

interface ButtonAsButton extends ButtonBaseProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'prefix' | 'suffix'> {
  href?: undefined;
}

interface ButtonAsLink extends ButtonBaseProps, Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'prefix' | 'suffix'> {
  href: string;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200',
  outline: 'bg-transparent text-blue-600 border border-blue-600 hover:border-blue-700 hover:bg-blue-50',
  ghost: 'bg-transparent text-blue-600 hover:text-blue-700 hover:bg-blue-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-2.5 text-sm gap-2 rounded-lg',
};

export function Button(props: ButtonProps) {
  const {
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    disabled,
    ...rest
  } = props;

  const buttonClasses = cn(
    'inline-flex items-center justify-center font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-[0.98]',
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && 'w-full',
    className
  );

  const content = (
    <>
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!isLoading && leftIcon}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </>
  );

  if ('href' in props && props.href) {
    const { href, ...linkProps } = rest as ButtonAsLink;
    return (
      <Link
        href={href}
        className={buttonClasses}
        {...linkProps}
      >
        {content}
      </Link>
    );
  }

  const { ...buttonProps } = rest as ButtonAsButton;
  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...buttonProps}
    >
      {content}
    </button>
  );
}
