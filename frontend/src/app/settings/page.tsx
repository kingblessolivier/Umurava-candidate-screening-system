'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { updateProfile } from '@/store/authSlice';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Bell, Lock, Palette, Shield, Save, ChevronRight,
  Eye, EyeOff, X, Check, Loader2, Moon, Sun,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOTIF_KEY = 'talentai_notifications';

function loadNotifPrefs() {
  if (typeof window === 'undefined') return { email: true, screeningComplete: true, newCandidates: false };
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? JSON.parse(raw) : { email: true, screeningComplete: true, newCandidates: false };
  } catch {
    return { email: true, screeningComplete: true, newCandidates: false };
  }
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
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

// ── Change Password Modal ─────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const toggle = (f: keyof typeof show) => setShow(p => ({ ...p, [f]: !p[f] }));
  const set = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  const validate = () => {
    if (!form.current) return 'Current password is required';
    if (form.next.length < 8) return 'New password must be at least 8 characters';
    if (form.next !== form.confirm) return 'New passwords do not match';
    if (form.next === form.current) return 'New password must differ from current password';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }

    setSaving(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: form.current,
        newPassword: form.next,
      });
      toast.success('Password updated successfully');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-100 shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-blue-600" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-gray-900">Change Password</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {(
            [
              { key: 'current', label: 'Current Password', placeholder: 'Your current password' },
              { key: 'next',    label: 'New Password',     placeholder: 'At least 8 characters'  },
              { key: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' },
            ] as const
          ).map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                {label}
              </label>
              <div className="relative">
                <input
                  type={show[key] ? 'text' : 'password'}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={set(key)}
                  autoComplete={key === 'current' ? 'current-password' : 'new-password'}
                  className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-lg text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {show[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {key === 'next' && form.next.length > 0 && form.next.length < 8 && (
                <p className="text-[11px] text-red-500 mt-1">Minimum 8 characters</p>
              )}
              {key === 'confirm' && form.confirm.length > 0 && form.next !== form.confirm && (
                <p className="text-[11px] text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
          ))}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Settings Content ─────────────────────────────────────────────────────

function SettingsContent() {
  const dispatch    = useDispatch<AppDispatch>();
  const { user }    = useSelector((s: RootState) => s.auth);
  const { isDark, toggleDark } = useTheme();

  const [name, setName]   = useState(user?.name  ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileSaving, setProfileSaving] = useState(false);

  const [notifications, setNotifications] = useState(loadNotifPrefs);
  const [notifSaved, setNotifSaved]       = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Sync form when Redux user updates (e.g. after a successful save)
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  // ── Profile save ────────────────────────────────────────────────────────────
  const handleProfileSave = async () => {
    const trimName  = name.trim();
    const trimEmail = email.trim().toLowerCase();

    if (!trimName) { toast.error('Name cannot be empty'); return; }
    if (!trimEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      toast.error('Enter a valid email address');
      return;
    }

    const unchanged = trimName === user?.name && trimEmail === user?.email;
    if (unchanged) { toast('No changes to save'); return; }

    setProfileSaving(true);
    try {
      await dispatch(updateProfile({ name: trimName, email: trimEmail })).unwrap();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Notification save ───────────────────────────────────────────────────────
  const toggleNotif = (key: keyof typeof notifications) => {
    setNotifications(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleNotifSave = () => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
    setNotifSaved(true);
    toast.success('Notification preferences saved');
    setTimeout(() => setNotifSaved(false), 2000);
  };

  const notificationRows = [
    {
      key:   'email' as const,
      label: 'Email Notifications',
      sub:   'Receive email updates for account activity',
    },
    {
      key:   'screeningComplete' as const,
      label: 'Evaluation Complete',
      sub:   'Get notified when a screening evaluation finishes',
    },
    {
      key:   'newCandidates' as const,
      label: 'New Candidates',
      sub:   'Alerts when new applications are submitted',
    },
  ];

  return (
    <>
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      <div className="-mx-6 -my-4">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">Account Settings</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">Manage your preferences and security</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 max-w-[860px] space-y-4">

          {/* ── Profile ────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader icon={Lock} label="Profile" />
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={profileSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {profileSaving
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Save className="w-3.5 h-3.5" />}
                  {profileSaving ? 'Saving…' : 'Save Profile'}
                </button>
                {user && (name.trim() !== user.name || email.trim().toLowerCase() !== user.email) && (
                  <span className="text-[11px] text-amber-600 font-medium">Unsaved changes</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Notifications ──────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bell className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.75} />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Notifications</p>
              </div>
              <button
                type="button"
                onClick={handleNotifSave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-[11px] font-semibold rounded-lg transition-colors"
              >
                {notifSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                {notifSaved ? 'Saved' : 'Save'}
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {notificationRows.map(({ key, label, sub }) => (
                <div key={key} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
                  </div>
                  <Toggle checked={notifications[key]} onChange={() => toggleNotif(key)} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Security ───────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader icon={Shield} label="Privacy & Security" />
            <div className="divide-y divide-gray-50">
              {/* Change password — opens modal */}
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.75} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-800">Change Password</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Update your account password</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </button>

              {/* 2FA — coming soon */}
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800">Two-Factor Authentication</p>
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-bold text-amber-700 tracking-wide uppercase">
                        Coming soon
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">Add an extra layer of account security</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-200" />
              </div>
            </div>
          </div>

          {/* ── Appearance ─────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader icon={Palette} label="Appearance" />
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  {isDark ? (
                    <Moon className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.75} />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Dark Mode</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {isDark ? 'Dark theme is active' : 'Switch to a dark color scheme'}
                  </p>
                </div>
              </div>
              <Toggle checked={isDark} onChange={toggleDark} />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
