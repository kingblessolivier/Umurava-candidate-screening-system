'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Zap,
  BarChart3,
  Trophy,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/candidates', icon: Users, label: 'Candidates' },
  { href: '/screening', icon: Zap, label: 'Screening' },
  { href: '/results', icon: Trophy, label: 'Results' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, handleLogout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const onLogout = () => {
    handleLogout();
  };

  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300',
          'bg-[#1e3a5f] text-blue-100',
          isCollapsed ? 'w-[52px]' : 'w-[200px]'
        )}
      >
        {/* Logo */}
        <div className="px-3 py-3">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-2 px-2 py-2 rounded-lg transition-colors',
              'hover:bg-[#1e40af]',
              isCollapsed && 'justify-center px-1'
            )}
          >
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-white text-xs">TalentAI</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-2 py-2 rounded-md text-xs transition-all duration-200',
                  'hover:bg-[#1e40af]',
                  isActive
                    ? 'bg-[#2563eb] text-white'
                    : 'text-blue-100 hover:text-white',
                  isCollapsed && 'justify-center px-1'
                )}
                title={isCollapsed ? label : undefined}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 flex-shrink-0',
                    isActive ? 'text-white' : 'text-blue-300'
                  )}
                />
                {!isCollapsed && <span>{label}</span>}
                {isActive && !isCollapsed && (
                  <span className="ml-auto w-1 h-1 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mx-2 mb-2 p-1.5 rounded-md text-blue-300 hover:text-white hover:bg-[#1e40af] transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* User & Logout */}
        <div className="px-3 py-3 border-t border-white/10">
          {user && (
            <div className={cn('mb-2', isCollapsed && 'flex justify-center')}>
              {!isCollapsed ? (
                <div className="flex items-center gap-2">
                  <Avatar name={user.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-blue-300 truncate">{user.email}</p>
                  </div>
                </div>
              ) : (
                <Avatar name={user.name} size="sm" />
              )}
            </div>
          )}
          <button
            onClick={onLogout}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs',
              'text-blue-300 hover:text-white hover:bg-[#1e40af] transition-colors',
              isCollapsed && 'justify-center'
            )}
            title={isCollapsed ? 'Log out' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Spacer for main content */}
      <div className={cn('transition-all duration-300 flex-shrink-0', isCollapsed ? 'w-[52px]' : 'w-[200px]')} />
    </>
  );
}
