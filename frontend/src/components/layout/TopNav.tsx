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
  Briefcase,
  Users,
  Mail,
  Info,
  BellOff,
  BellRing,
} from 'lucide-react';
import { AppNotification } from '@/contexts/NotificationsContext';
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
  const { notifications, activeJobs, unreadCount, markAsRead, markAllRead, clearAll, pushPermission, requestPushPermission } = useNotifications();
  const activeJobList = Object.values(activeJobs);

  function categoryIcon(n: AppNotification) {
    if (n.category === 'screening') return <Brain className="w-3.5 h-3.5 text-blue-600" />;
    if (n.category === 'upload') return <FileText className="w-3.5 h-3.5 text-indigo-600" />;
    if (n.category === 'job') return <Briefcase className="w-3.5 h-3.5 text-emerald-600" />;
    if (n.category === 'candidate') return <Users className="w-3.5 h-3.5 text-violet-600" />;
    if (n.category === 'email') return <Mail className="w-3.5 h-3.5 text-amber-600" />;
    return <Info className="w-3.5 h-3.5 text-gray-500" />;
  }

  function categoryBg(n: AppNotification) {
    if (n.category === 'screening') return 'bg-blue-100 dark:bg-blue-900/40';
    if (n.category === 'upload') return 'bg-indigo-100 dark:bg-indigo-900/40';
    if (n.category === 'job') return 'bg-emerald-100 dark:bg-emerald-900/40';
    if (n.category === 'candidate') return 'bg-violet-100 dark:bg-violet-900/40';
    if (n.category === 'email') return 'bg-amber-100 dark:bg-amber-900/40';
    return 'bg-gray-100 dark:bg-slate-700';
  }

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
        'fixed top-0 z-30 border-b border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-[0_1px_0_rgba(15,23,42,0.03)] dark:shadow-[0_1px_0_rgba(0,0,0,0.2)] transition-all duration-300 ease-out',
        isSidebarCollapsed ? 'left-0 w-full lg:left-[72px] lg:w-[calc(100%-72px)]' : 'left-0 w-full lg:left-[240px] lg:w-[calc(100%-240px)]'
      )}
    >
      <div className="flex items-center justify-between px-5 py-2">
        {/* Left: Logo + sidebar toggle */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenMobileSidebar}
            suppressHydrationWarning
            className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleSidebar}
            suppressHydrationWarning
            className="hidden lg:inline-flex rounded-lg p-1.5 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-200 dark:shadow-blue-900">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="hidden sm:block leading-tight">
              <span className="block text-xs font-semibold tracking-tight text-slate-900 dark:text-white">TalentAI</span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">Hiring workspace</span>
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
                'relative rounded-lg p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800',
                unreadCount > 0 ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400'
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
              <div className="absolute right-0 mt-3 w-96 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/60 z-50">
                <div className="border-b border-slate-100 dark:border-slate-700 px-4 py-3 bg-slate-50/80 dark:bg-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      Notifications
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 text-xs text-blue-700 dark:text-blue-300">
                          {unreadCount} new
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} suppressHydrationWarning
                          className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                          Mark all read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button onClick={() => { clearAll(); setShowNotifications(false); }}
                          suppressHydrationWarning
                          className="text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Push notification permission */}
                  {pushPermission === 'default' && (
                    <button onClick={requestPushPermission} suppressHydrationWarning
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[11px] text-blue-700 dark:text-blue-300 font-medium transition-colors">
                      <BellRing className="w-3 h-3" />
                      Enable browser notifications to get alerts even when the tab is hidden
                    </button>
                  )}
                  {pushPermission === 'denied' && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-[11px] text-red-600 dark:text-red-400">
                      <BellOff className="w-3 h-3" /> Browser notifications are blocked — enable them in your browser settings
                    </div>
                  )}
                </div>

                <div className="max-h-[480px] overflow-y-auto">
                  {activeJobList.length === 0 && notifications.length === 0 ? (
                      <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Screening and resume uploads will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                      {/* ── Active (in-progress) jobs at top ─────────────── */}
                      {activeJobList.map((job) => {
                        const pe = job.metadata?.progressEvent as { overallProgress?: number; evaluatedCount?: number } | undefined;
                        const pct = pe?.overallProgress ?? 0;
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
                            'p-4 bg-blue-50/40 dark:bg-blue-900/20 transition-colors',
                            isScreening && 'cursor-pointer hover:bg-blue-100/60 dark:hover:bg-blue-900/30'
                          )}
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                {isScreening ? (
                                  <Brain className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{job.title}</p>
                                <span className="flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5">
                                  <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                                  <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300">Live</span>
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">{job.message}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/50">
                                  <div
                                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                    style={{ width: pct > 0 ? `${pct}%` : '8%' }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 w-8 text-right flex-shrink-0">
                                  {pct > 0 ? `${pct}%` : '…'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">{mounted ? formatTimestamp(job.timestamp) : ''}</p>
                                {isScreening && (
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">View progress →</span>
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
                            n.link ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800' : 'cursor-default',
                            !n.read ? 'bg-blue-50/40 dark:bg-blue-900/10' : 'bg-white dark:bg-slate-900'
                          )}
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 mt-0.5 relative">
                              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', categoryBg(n))}>
                                {categoryIcon(n)}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5">
                                {n.type === 'success' || n.type === 'info'
                                  ? <CheckCircle2 className="w-3 h-3 text-green-500 bg-white dark:bg-slate-900 rounded-full" />
                                  : <XCircle className="w-3 h-3 text-red-500 bg-white dark:bg-slate-900 rounded-full" />}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex-1 truncate">{n.title}</p>
                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">{mounted ? formatTimestamp(n.timestamp) : ''}</p>
                                {n.link && (
                                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">View →</span>
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

          <div className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-slate-700" />

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              suppressHydrationWarning
              className="group flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 px-2 py-1 shadow-sm shadow-slate-100 dark:shadow-slate-900 transition-colors hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Avatar name={displayName} size="sm" />
              <span className="hidden max-w-[140px] truncate text-xs font-medium tracking-tight text-slate-900 dark:text-white sm:block">
                {displayName}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400 transition-colors group-hover:text-slate-900 dark:group-hover:text-white" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/60 z-50">
                {/* Header */}
                <div className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-blue-50/80 dark:from-slate-800 dark:to-slate-800 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={displayName} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{displayEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="p-1.5">
                  <Link
                    href="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 transition-colors group-hover:text-blue-500" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500 transition-colors group-hover:text-blue-500" />
                    <span>Settings</span>
                  </Link>
                </div>

                {/* Divider and Logout */}
                <div className="mx-2 my-1 border-t border-slate-100 dark:border-slate-700" />
                <div className="p-1.5">
                  <button
                    onClick={onLogout}
                    suppressHydrationWarning
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
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
