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
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/candidates', icon: Users, label: 'Candidates' },
  { href: '/screening', icon: Zap, label: 'Screening' },
  { href: '/results', icon: Trophy, label: 'Results' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export function Sidebar({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
  const { user, handleLogout } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const onLogout = () => {
    handleLogout();
  };

  return (
    <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          'fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300 ease-out',
          'bg-blue-600 text-white',
          isCollapsed ? 'w-[72px]' : 'w-[240px]'
        )}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-blue-500">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-200',
              'hover:bg-blue-500',
              isCollapsed && 'justify-center'
            )}
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-white text-sm leading-tight">TalentAI</span>
                <span className="text-[10px] text-blue-200 leading-tight">Smart Screening</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {!isCollapsed && (
            <p className="px-3 mb-3 text-[10px] font-semibold text-blue-300 uppercase tracking-wider">
              Menu
            </p>
          )}
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            const isHovered = hoveredItem === href;

            return (
              <Link
                key={href}
                href={href}
                onMouseEnter={() => setHoveredItem(href)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                  isActive
                    ? 'bg-blue-500 text-white font-semibold'
                    : isHovered
                    ? 'bg-blue-500 text-white'
                    : 'text-blue-100',
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
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200',
                  isActive || isHovered
                    ? 'bg-blue-400'
                    : 'bg-blue-500'
                )}>
                  <Icon className="w-4 h-4" />
                </div>

                {!isCollapsed && (
                  <>
                    <span className="flex-1">{label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>


        {/* User & Logout */}
        <div className="px-3 py-4 border-t border-blue-500">
          {user && (
            <div className={cn(
              'mb-3 p-3 rounded-lg bg-blue-500',
              isCollapsed && 'p-2 flex justify-center'
            )}>
              {!isCollapsed ? (
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-blue-200 truncate">{user.email}</p>
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
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
              'text-blue-100 hover:bg-blue-500 hover:text-white transition-all duration-200',
              isCollapsed && 'justify-center px-2'
            )}
            title={isCollapsed ? 'Log out' : undefined}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500">
              <LogOut className="w-4 h-4" />
            </div>
            {!isCollapsed && <span className="text-xs">Log out</span>}
          </button>
        </div>
      </motion.aside>
  );
}