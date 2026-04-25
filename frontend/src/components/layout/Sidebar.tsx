'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Zap,
  Trophy,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/candidates', icon: Users, label: 'Candidates' },
  { href: '/screening', icon: Zap, label: 'Screening' },
  { href: '/results', icon: Trophy, label: 'Results' },
];

function SidebarSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300 ease-out',
        'bg-blue-600 text-white',
        isCollapsed ? 'w-[68px]' : 'w-[224px]'
      )}
    >
      {/* Logo skeleton */}
      <div className="px-4 py-5 border-b border-blue-500">
        <div className={cn(
          'flex items-center gap-3 px-2 py-2 rounded-lg',
          isCollapsed && 'justify-center'
        )}>
          <div className="w-10 h-10 rounded-lg bg-blue-500 animate-pulse flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col gap-2">
              <div className="w-20 h-3 bg-blue-400 rounded animate-pulse" />
              <div className="w-28 h-2 bg-blue-400 rounded animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* Navigation skeleton */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg',
            isCollapsed && 'justify-center px-2'
          )}>
            <div className="w-8 h-8 rounded-lg bg-blue-500 animate-pulse flex-shrink-0" />
            {!isCollapsed && <div className="flex-1 h-4 bg-blue-400 rounded animate-pulse" />}
          </div>
        ))}
      </nav>

      {/* User & Logout skeleton */}
      <div className="px-3 py-4 border-t border-blue-500">
        {!isCollapsed ? (
          <div className="mb-3 p-3 rounded-lg bg-blue-500 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-400 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="w-24 h-3 bg-blue-300 rounded animate-pulse" />
                <div className="w-32 h-2 bg-blue-300 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-3 flex justify-center">
            <div className="w-8 h-8 rounded-full bg-blue-400 animate-pulse" />
          </div>
        )}
        <div className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg',
          isCollapsed && 'justify-center px-2'
        )}>
          <div className="w-8 h-8 rounded-lg bg-blue-500 animate-pulse flex-shrink-0" />
          {!isCollapsed && <div className="flex-1 h-4 bg-blue-400 rounded animate-pulse" />}
        </div>
      </div>
    </aside>
  );
}

export function Sidebar({
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
}: {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { handleLogout, loading: authLoading } = useAuth();

  const onLogout = () => {
    handleLogout();
  };

  // Show skeleton while auth is loading
  if (authLoading) {
    return <SidebarSkeleton isCollapsed={isCollapsed} />;
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300 ease-out',
        'bg-blue-600 text-white',
        'w-[240px] transform lg:translate-x-0',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        isCollapsed ? 'lg:w-[72px]' : 'lg:w-[240px]'
      )}
    >
        <div className="flex items-center justify-end px-3 pt-3 lg:hidden">
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            suppressHydrationWarning
            className="rounded-lg p-1.5 text-blue-100 hover:bg-blue-500/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Logo */}
        <div className="px-3 py-4 border-b border-blue-500/80">
          <Link
            href="/"
            onClick={onCloseMobile}
            className={cn(
              'flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all duration-200',
              'hover:bg-blue-500/90',
              isCollapsed && 'justify-center'
            )}
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg flex-shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-white text-xs leading-tight tracking-wide">TalentAI</span>
                <span className="text-[10px] text-blue-200 leading-tight">Smart Screening</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-3 space-y-1.5 overflow-y-auto">
          {!isCollapsed && (
            <p className="px-2.5 mb-2 text-[9px] font-semibold text-blue-300 uppercase tracking-[0.14em]">
              Menu
            </p>
          )}
           {navItems.map(({ href, icon: Icon, label }) => {
             const isActive =
               href === '/' ? pathname === '/' : pathname.startsWith(href);

             return (
               <Link
                 key={href}
                 href={href}
                 onClick={onCloseMobile}
                 className={cn(
                  'relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all duration-200 border border-transparent',
                   isActive
                    ? 'bg-blue-500 text-white font-semibold border-blue-400/60 shadow-sm'
                    : 'text-blue-100 hover:bg-blue-500/70',
                   isCollapsed && 'justify-center px-2'
                 )}
                 title={isCollapsed ? label : undefined}
               >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}

                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200',
                  isActive
                    ? 'bg-blue-400'
                    : 'bg-blue-500/90'
                )}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {!isCollapsed && (
                  <>
                    <span className="flex-1 leading-none">{label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>
        {/* Logout */}
        <div className="px-2.5 py-3 border-t border-blue-500/80">
          <button
            onClick={onLogout}
            suppressHydrationWarning
            className={cn(
              'group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs border border-transparent',
              'text-blue-100 hover:bg-red-600 hover:text-white hover:border-red-500/70 transition-all duration-200',
              isCollapsed && 'justify-center px-2'
            )}
            title={isCollapsed ? 'Log out' : undefined}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500 group-hover:bg-red-500 transition-colors duration-200">
              <LogOut className="w-3.5 h-3.5" />
            </div>
            {!isCollapsed && <span className="text-[11px] leading-none">Log out</span>}
          </button>
        </div>
      </aside>
  );
}
