'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Bell, Lock, Palette, Globe, Shield, Save, ChevronRight } from 'lucide-react';

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
      <Icon className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.75} />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({
    email: true,
    screeningComplete: true,
    newCandidates: false,
  });

  const toggle = (key: keyof typeof notifications) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  const notificationRows = [
    {
      key: 'email' as const,
      label: 'Email Notifications',
      sub: 'Receive email updates for account activity',
    },
    {
      key: 'screeningComplete' as const,
      label: 'Evaluation Complete',
      sub: 'Get notified when a screening evaluation finishes',
    },
    {
      key: 'newCandidates' as const,
      label: 'New Candidates',
      sub: 'Alerts when new applications are submitted',
    },
  ];

  const securityRows = [
    {
      icon: Shield,
      label: 'Change Password',
      sub: 'Update your account password',
    },
    {
      icon: Globe,
      label: 'Two-Factor Authentication',
      sub: 'Add an extra layer of account security',
    },
  ];

  return (
    <div className="-mx-6 -my-4">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">Account Settings</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Manage your preferences and security</p>
          </div>
          <button className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="px-6 py-5 max-w-[860px] space-y-4">

        {/* ── Profile Settings ───────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader icon={Lock} label="Profile" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                defaultValue={user?.name || ''}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                defaultValue={user?.email || ''}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ── Notifications ──────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader icon={Bell} label="Notifications" />
          <div className="divide-y divide-gray-50">
            {notificationRows.map(({ key, label, sub }) => (
              <div key={key} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
                </div>
                <Toggle checked={notifications[key]} onChange={() => toggle(key)} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Security ───────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader icon={Shield} label="Privacy & Security" />
          <div className="divide-y divide-gray-50">
            {securityRows.map(({ icon: Icon, label, sub }) => (
              <button
                key={label}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.75} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* ── Appearance ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader icon={Palette} label="Appearance" />
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-medium text-gray-800">Dark Mode</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Switch to a dark color scheme</p>
            </div>
            <Toggle checked={false} onChange={() => {}} />
          </div>
        </div>

      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
