'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import {
  User, Mail, Briefcase, Edit2, ArrowRight,
  Settings, Users, Zap, LogOut, ShieldCheck,
} from 'lucide-react';
import { AuthGuard } from '@/components/layout/AuthGuard';
import Link from 'next/link';
import { formatDisplayName } from '@/lib/utils';
import { AppDispatch, RootState } from '@/store';
import { fetchJobs } from '@/store/jobsSlice';
import { fetchCandidates } from '@/store/candidatesSlice';
import { fetchResults } from '@/store/screeningSlice';

function ProfileContent() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, handleLogout } = useAuth();

  const jobsTotal      = useSelector((s: RootState) => s.jobs.total);
  const candidatesTotal = useSelector((s: RootState) => s.candidates.total);
  const screeningTotal = useSelector((s: RootState) => s.screening.total);

  useEffect(() => {
    dispatch(fetchJobs());
    dispatch(fetchCandidates());
    dispatch(fetchResults());
  }, [dispatch]);

  const displayName  = formatDisplayName(user?.name);
  const displayEmail = user?.email || '—';
  const role         = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Recruiter';

  const stats = [
    { value: jobsTotal,       label: 'Jobs',        color: 'text-blue-600',    bg: 'bg-blue-50',    icon: Briefcase },
    { value: candidatesTotal, label: 'Candidates',  color: 'text-violet-600',  bg: 'bg-violet-50',  icon: Users     },
    { value: screeningTotal,  label: 'Evaluations', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Zap       },
  ];

  const quickLinks = [
    { label: 'Account Settings', href: '/settings',   icon: Settings  },
    { label: 'Jobs',             href: '/jobs',        icon: Briefcase },
    { label: 'Candidates',       href: '/candidates',  icon: Users     },
    { label: 'Evaluations',      href: '/results',     icon: Zap       },
  ];

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">

      {/* ── Profile Card ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-20 bg-gradient-to-r from-blue-600 to-violet-600" />

        {/* Avatar + actions row */}
        <div className="px-5 pb-4">
          <div className="flex items-end justify-between -mt-8 mb-3">
            <div className="ring-4 ring-white rounded-full">
              <Avatar name={displayName} size="lg" />
            </div>
            <div className="flex items-center gap-2 mt-10">
              <Link
                href="/settings"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit2 className="w-3 h-3" />
                Edit Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            </div>
          </div>

          <h1 className="text-sm font-bold text-gray-900 leading-tight">{displayName}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{displayEmail}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-semibold text-blue-700">
              <ShieldCheck className="w-3 h-3" />
              {role}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ value, label, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.75} />
            </div>
            <div>
              <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Personal Information</p>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { icon: User,      label: 'Full Name',     value: displayName   },
              { icon: Mail,      label: 'Email',         value: displayEmail  },
              { icon: Briefcase, label: 'Role',          value: role          },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <div className="w-6 h-6 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3 h-3 text-gray-400" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                  <p className="text-xs font-semibold text-gray-800 truncate mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Quick Links</p>
          </div>
          <div className="p-1.5 space-y-0.5">
            {quickLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors group"
              >
                <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" strokeWidth={1.75} />
                <span className="flex-1">{label}</span>
                <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </Link>
            ))}
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
