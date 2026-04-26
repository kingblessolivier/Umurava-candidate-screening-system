'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  Bell,
  LogOut,
  Settings,
  User as UserIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Brain,
  Menu,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useNotifications } from '@/contexts/NotificationsContext';
import { formatDisplayName } from '@/lib/utils';

function formatTimestamp(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function TopNav({
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenMobileSidebar,
}: {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}) {
  const { user, handleLogout } = useAuth();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayName = mounted ? formatDisplayName(user?.name) : 'User';
  const displayEmail = mounted ? (user?.email || '') : '';
  const { notifications, activeJobs, unreadCount, markAsRead, clearAll } = useNotifications();
  const activeJobList = Object.values(activeJobs);

  const handleNotificationClick = (id: string, link?: string) => {
    markAsRead(id);
    if (link) {
      setShowNotifications(false);
      router.push(link);
    }
  };

  const onLogout = () => {
    setShowProfileMenu(false);
    handleLogout();
  };

  return (
    <div
      className={cn(
        'fixed top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-md shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-all duration-300 ease-out',
        isSidebarCollapsed ? 'left-0 w-full lg:left-[72px] lg:w-[calc(100%-72px)]' : 'left-0 w-full lg:left-[240px] lg:w-[calc(100%-240px)]'
      )}
    >
      <div className="flex items-center justify-between px-5 py-2">
        {/* Left: Logo + sidebar toggle */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenMobileSidebar}
            suppressHydrationWarning
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleSidebar}
            suppressHydrationWarning
            className="hidden lg:inline-flex rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="hidden sm:block leading-tight">
              <span className="block text-xs font-semibold tracking-tight text-slate-900">TalentAI</span>
              <span className="block text-[10px] text-slate-500">Hiring workspace</span>
            </div>
          </Link>
        </div>

        {/* Right: Notifications + Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              suppressHydrationWarning
              className={cn(
                'relative rounded-lg p-1.5 transition-colors hover:bg-slate-100',
                unreadCount > 0 ? 'text-blue-600' : 'text-slate-500'
              )}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute right-0 top-0 min-w-[16px] h-4 translate-x-1/4 -translate-y-1/4 rounded-full bg-red-500 px-0.5 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 z-50">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 bg-slate-50/80">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                        {unreadCount} new
                      </span>
                    )}
                  </h3>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => { clearAll(); setShowNotifications(false); }}
                      suppressHydrationWarning
                      className="text-xs font-medium text-slate-500 hover:text-slate-800"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-[480px] overflow-y-auto">
                  {activeJobList.length === 0 && notifications.length === 0 ? (
                      <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No notifications yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Screening and resume uploads will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {/* ── Active (in-progress) jobs at top ─────────────── */}
                      {activeJobList.map((job) => {
                        const pe = job.metadata?.progressEvent as { overallProgress?: number; evaluatedCount?: number; selectedModels?: { batchTier?: string } } | undefined;
                        const pct = pe?.overallProgress ?? 0;
                        const modelTier = pe?.selectedModels?.batchTier;
                        const isScreening = job.jobType === 'screening';
                        return (
                        <div
                          key={job.bgJobId}
                          onClick={() => {
                            if (isScreening) {
                              setShowNotifications(false);
                              router.push('/screening');
                            }
                          }}
                          className={cn(
                            'p-4 bg-blue-50/40 transition-colors',
                            isScreening && 'cursor-pointer hover:bg-blue-100/60'
                          )}
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                                {isScreening ? (
                                  <Brain className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <p className="text-xs font-semibold text-slate-900">{job.title}</p>
                                <span className="flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5">
                                  <span className="w-1 h-1 rounded-full bg-blue-600 animate-pulse" />
                                  <span className="text-[10px] font-medium text-blue-700">Live</span>
                                </span>
                                {modelTier && modelTier !== 'Pinned' && (
                                  <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                                    {modelTier} tier
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-2">{job.message}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-blue-100">
                                  <div
                                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                    style={{ width: pct > 0 ? `${pct}%` : '8%' }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-blue-600 w-8 text-right flex-shrink-0">
                                  {pct > 0 ? `${pct}%` : '…'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-[10px] text-slate-400">{mounted ? formatTimestamp(job.timestamp) : ''}</p>
                                {isScreening && (
                                  <span className="text-[10px] text-blue-600 font-medium">View progress →</span>
                                )}
                              </div>
                            </div>
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0 mt-0.5" />
                          </div>
                        </div>
                        );
                      })}

                      {/* ── Completed notifications ───────────────────────── */}
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n.id, n.link)}
                          className={cn(
                            'p-4 transition-colors',
                            n.link ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default',
                            !n.read && 'bg-blue-50/60'
                          )}
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {n.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900">{n.title}</p>
                              <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-slate-400">{mounted ? formatTimestamp(n.timestamp) : ''}</p>
                                {n.link && (
                                  <span className="text-xs text-blue-600 font-medium">View results →</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:block w-px h-4 bg-slate-200" />

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              suppressHydrationWarning
              className="group flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2 py-1 shadow-sm shadow-slate-100 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <Avatar name={displayName} size="sm" />
              <span className="hidden max-w-[140px] truncate text-xs font-medium tracking-tight text-slate-900 sm:block">
                {displayName}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500 transition-colors group-hover:text-slate-900" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 z-50">
                {/* Header */}
                <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50/80 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={displayName} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                      <p className="truncate text-xs text-slate-500">{displayEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="p-1.5">
                  <Link
                    href="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400 transition-colors group-hover:text-blue-500" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Settings className="w-4 h-4 text-slate-400 transition-colors group-hover:text-blue-500" />
                    <span>Settings</span>
                  </Link>
                </div>

                {/* Divider and Logout */}
                <div className="mx-2 my-1 border-t border-slate-100" />
                <div className="p-1.5">
                  <button
                    onClick={onLogout}
                    suppressHydrationWarning
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
