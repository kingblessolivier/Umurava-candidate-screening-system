'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { User, Mail, Briefcase, Calendar, Edit2, ArrowRight } from 'lucide-react';
import { AuthGuard } from '@/components/layout/AuthGuard';
import Link from 'next/link';
import { formatDisplayName } from '@/lib/utils';

function ProfileContent() {
  const { user } = useAuth();
  const displayName = formatDisplayName(user?.name);
  const displayEmail = user?.email || '—';
  const role = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Recruiter';

  return (
    <div className="-mx-6 -my-4">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={displayName} size="md" />
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">{displayName}</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">{displayEmail}</p>
            </div>
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Left: main info ───────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Personal Information */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Personal Information</p>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { icon: User, label: 'Full Name', value: displayName },
                  { icon: Mail, label: 'Email Address', value: displayEmail },
                  { icon: Briefcase, label: 'Role', value: role },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Activity Overview</p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-50 px-2 py-2">
                {[
                  { value: '24', label: 'Jobs Posted', color: 'text-blue-600' },
                  { value: '156', label: 'Candidates', color: 'text-gray-700' },
                  { value: '89', label: 'Evaluations', color: 'text-emerald-600' },
                ].map(({ value, label, color }) => (
                  <div key={label} className="text-center py-3">
                    <p className={`text-xl font-bold leading-none ${color}`}>{value}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: sidebar ────────────────────────────── */}
          <div className="space-y-4">

            {/* Account */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Account</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Member Since</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">April 2026</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-semibold text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Quick Links</p>
              </div>
              <div className="p-2">
                {[
                  { label: 'Account Settings', href: '/settings' },
                  { label: 'Browse Jobs', href: '/jobs' },
                  { label: 'View Candidates', href: '/candidates' },
                ].map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors group"
                  >
                    <span>{label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
