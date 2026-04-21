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
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export function TopNav() {
  const { user, handleLogout } = useAuth();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'New Screening Results',
      message: 'Screening for "Senior Developer" role completed',
      timestamp: '2 hours ago',
      read: false,
      type: 'success',
    },
    {
      id: '2',
      title: 'Application Received',
      message: 'New candidate applied for "Product Manager" role',
      timestamp: '5 hours ago',
      read: false,
      type: 'info',
    },
    {
      id: '3',
      title: 'Job Expiring Soon',
      message: '"UX Designer" posting expires in 3 days',
      timestamp: '1 day ago',
      read: true,
      type: 'warning',
    },
  ]);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const onLogout = () => {
    setShowProfileMenu(false);
    handleLogout();
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getNotificationTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-amber-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="sticky top-0 bg-white border-b border-gray-200 z-30">
      <div className="px-6 py-1.5 flex items-center justify-between">
        {/* Left Side - Placeholder for breadcrumbs or title */}
        <div className="flex-1"></div>

        {/* Right Side - Notifications & Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className={cn(
                'relative p-1.5 rounded-lg transition-colors',
                'hover:bg-gray-100',
                unreadCount > 0 ? 'text-blue-600' : 'text-gray-600'
              )}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Notifications
                    </h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearNotifications}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => handleMarkAsRead(notification.id)}
                          className={cn(
                            'p-4 cursor-pointer transition-colors',
                            'hover:bg-gray-50',
                            !notification.read && 'bg-blue-50'
                          )}
                        >
                          <div className="flex gap-3">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full flex-shrink-0 mt-1.5',
                                notification.type === 'success' && 'bg-green-500',
                                notification.type === 'warning' && 'bg-amber-500',
                                notification.type === 'error' && 'bg-red-500',
                                notification.type === 'info' && 'bg-blue-500'
                              )}
                            ></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {notification.timestamp}
                              </p>
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

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200"></div>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <Avatar
                name={`${user?.firstName || 'User'} ${user?.lastName || ''}`}
                size="sm"
              />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-gray-600 group-hover:text-gray-900" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={`${user?.firstName || 'User'} ${user?.lastName || ''}`}
                      size="md"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
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

                {/* Logout Button */}
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
