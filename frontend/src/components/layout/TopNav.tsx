'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useNotifications } from '@/contexts/NotificationsContext';

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
}: {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const { user, handleLogout } = useAuth();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
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
    <div className="sticky top-0 bg-white border-b border-gray-200 z-30">
      <div className="px-6 py-1.5 flex items-center justify-between">
        {/* Left: Logo + sidebar toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">TalentAI</span>
          </Link>
        </div>

        {/* Right: Notifications + Profile */}
        <div className="flex items-center gap-3">
          {/* Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className={cn(
                'relative p-1.5 rounded-lg transition-colors hover:bg-gray-100',
                unreadCount > 0 ? 'text-blue-600' : 'text-gray-600'
              )}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </h3>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => { clearAll(); setShowNotifications(false); }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-[480px] overflow-y-auto">
                  {activeJobList.length === 0 && notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Screening and resume uploads will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {/* ── Active (in-progress) jobs at top ─────────────── */}
                      {activeJobList.map((job) => (
                        <div key={job.bgJobId} className="p-4 bg-blue-50/40">
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                                {job.jobType === 'screening' ? (
                                  <Brain className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-xs font-semibold text-gray-900">{job.title}</p>
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100">
                                  <span className="w-1 h-1 rounded-full bg-blue-600 animate-pulse" />
                                  <span className="text-[10px] font-medium text-blue-700">Live</span>
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-600 line-clamp-2">{job.message}</p>
                              <div className="mt-2 h-1 bg-blue-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/3" />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">{formatTimestamp(job.timestamp)}</p>
                            </div>
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0 mt-0.5" />
                          </div>
                        </div>
                      ))}

                      {/* ── Completed notifications ───────────────────────── */}
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n.id, n.link)}
                          className={cn(
                            'p-4 transition-colors',
                            n.link ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default',
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
                              <p className="text-sm font-medium text-gray-900">{n.title}</p>
                              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-gray-400">{formatTimestamp(n.timestamp)}</p>
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

          <div className="w-px h-5 bg-gray-200" />

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <Avatar name={user?.name || 'User'} size="sm" />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-gray-600 group-hover:text-gray-900" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <Avatar name={user?.name || 'User'} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="p-1">
                  <Link
                    href="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span>Settings</span>
                  </Link>
                </div>

                <div className="p-2 border-t border-gray-200">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
