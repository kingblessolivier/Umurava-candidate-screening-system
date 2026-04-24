'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchResults, deleteResult, setPage } from '@/store/screeningSlice';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Trophy, Users, Clock, ChevronRight, Trash2, Mail,
  FileText, ChevronLeft, CalendarDays, Zap,
} from 'lucide-react';
import EmailModal from '@/components/email/EmailModal';
import { ScreeningResult } from '@/types';

const PAGE_SIZE = 10;

function scoreConfig(s: number) {
  if (s >= 70) return { label: 'Strong', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
  if (s >= 55) return { label: 'Average', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' };
  return { label: 'Below Bar', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, palette }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType;
  palette: { bg: string; icon: string; border: string };
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1.5 leading-none">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${palette.bg} border ${palette.border}`}>
        <Icon className={`w-4 h-4 ${palette.icon}`} strokeWidth={1.75} />
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
        <Trophy className="w-6 h-6 text-gray-300" />
      </div>
      <p className="text-sm font-semibold text-gray-900 mb-1">No evaluation results yet</p>
      <p className="text-xs text-gray-400 mb-5">Complete a screening to see candidate rankings here</p>
      <Link
        href="/screening"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        <Zap className="w-3.5 h-3.5" />
        Start Evaluation
      </Link>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3 flex gap-8">
        {[240, 80, 80, 80].map((w, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded animate-pulse" style={{ width: w }} />
        ))}
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-5 px-5 py-4 border-b border-gray-50 last:border-0">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-100 rounded animate-pulse w-1/3" />
            <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/5" />
          </div>
          <div className="h-3 bg-gray-100 rounded animate-pulse w-10" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-10" />
          <div className="h-6 bg-gray-100 rounded-full animate-pulse w-20" />
          <div className="h-6 bg-gray-100 rounded animate-pulse w-16" />
        </div>
      ))}
    </div>
  );
}

// ── Result Row ────────────────────────────────────────────────────────────────
function ResultRow({
  result, onDelete, onEmail,
}: {
  result: ScreeningResult;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onEmail: (e: React.MouseEvent, r: ScreeningResult) => void;
}) {
  const avgScore = result.shortlist?.length
    ? Math.round(result.shortlist.reduce((a, c) => a + c.finalScore, 0) / result.shortlist.length)
    : 0;
  const cfg = avgScore > 0 ? scoreConfig(avgScore) : null;
  const rate = result.totalApplicants
    ? Math.round((result.shortlistSize / result.totalApplicants) * 100)
    : 0;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group hover:bg-gray-50/60 transition-colors"
    >
      {/* Position */}
      <td className="px-5 py-4 min-w-0">
        <Link href={`/results/${result._id}`} className="block">
          <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate max-w-[280px]">
            {result.jobTitle}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
            <CalendarDays className="w-3 h-3 flex-shrink-0" />
            {formatDate(result.screeningDate)}
          </p>
        </Link>
      </td>

      {/* Applicants */}
      <td className="px-5 py-4 text-center whitespace-nowrap">
        <p className="text-sm font-semibold text-gray-800">{result.totalApplicants}</p>
        <p className="text-[10px] text-gray-400">reviewed</p>
      </td>

      {/* Shortlisted */}
      <td className="px-5 py-4 text-center whitespace-nowrap">
        <p className="text-sm font-semibold text-emerald-700">{result.shortlistSize}</p>
        <p className="text-[10px] text-gray-400">{rate}% rate</p>
      </td>

      {/* Avg Score */}
      <td className="px-5 py-4 text-center whitespace-nowrap">
        {cfg ? (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
            {avgScore}% &middot; {cfg.label}
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity">
          {result.shortlist?.length > 0 && (
            <button
              onClick={(e) => onEmail(e, result)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <Mail className="w-3 h-3" />
              Email {result.shortlistSize}
            </button>
          )}
          <Link
            href={`/results/${result._id}`}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
          <button
            onClick={(e) => onDelete(result._id || '', e)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  const pages: number[] = [];
  let from = Math.max(1, page - 2);
  const to = Math.min(totalPages, from + 4);
  from = Math.max(1, to - 4);
  for (let i = from; i <= to; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-400">
        Showing <span className="font-semibold text-gray-600">{start}–{end}</span> of{' '}
        <span className="font-semibold text-gray-600">{total}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
              p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { results, loading, page, total } = useSelector((s: RootState) => s.screening);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<{
    open: boolean;
    recipients: { name: string; email: string }[];
    jobTitle: string;
  }>({ open: false, recipients: [], jobTitle: '' });

  useEffect(() => { dispatch(fetchResults({ page, limit: PAGE_SIZE })); }, [dispatch, page]);

  const handleEmailShortlisted = (e: React.MouseEvent, result: ScreeningResult) => {
    e.preventDefault();
    if (!result.shortlist?.length) return;
    const recipients = result.shortlist.map((c) => ({
      name: c.candidateName?.trim() || c.email.split('@')[0],
      email: c.email,
    }));
    setEmailModal({ open: true, recipients, jobTitle: result.jobTitle });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Delete this evaluation result?')) return;
    setDeletingId(id);
    try {
      await dispatch(deleteResult(id)).unwrap();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const totalScreened = results.reduce((a, r) => a + (r.totalApplicants || 0), 0);
  const totalShortlisted = results.reduce((a, r) => a + (r.shortlistSize || 0), 0);
  const selectionRate = totalScreened > 0
    ? `${Math.round((totalShortlisted / totalScreened) * 100)}% selection rate`
    : 'no data yet';
  const avgDuration = results.length
    ? `${(results.reduce((a, r) => a + (r.processingTimeMs || 0), 0) / results.length / 1000).toFixed(1)}s`
    : '—';

  void deletingId;

  return (
    <div className="-mx-6 -my-4">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">Evaluation Results</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {total} {total === 1 ? 'evaluation' : 'evaluations'} completed
            </p>
          </div>
          <Link
            href="/screening"
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            New Evaluation
          </Link>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5 max-w-[1400px] mx-auto">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Total Evaluations"
            value={total}
            sub="all time"
            icon={FileText}
            palette={{ bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' }}
          />
          <MetricCard
            label="Applicants Reviewed"
            value={totalScreened}
            sub="across all roles"
            icon={Users}
            palette={{ bg: 'bg-gray-50', icon: 'text-gray-500', border: 'border-gray-200' }}
          />
          <MetricCard
            label="Candidates Shortlisted"
            value={totalShortlisted}
            sub={selectionRate}
            icon={Trophy}
            palette={{ bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' }}
          />
          <MetricCard
            label="Avg. Processing Time"
            value={avgDuration}
            sub="per evaluation run"
            icon={Clock}
            palette={{ bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' }}
          />
        </div>

        {/* Results Table */}
        {loading ? (
          <LoadingState />
        ) : results.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    Position
                  </th>
                  <th className="px-5 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    Applicants
                  </th>
                  <th className="px-5 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    Shortlisted
                  </th>
                  <th className="px-5 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    Avg. Score
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r) => (
                  <ResultRow
                    key={r._id}
                    result={r}
                    onDelete={handleDelete}
                    onEmail={handleEmailShortlisted}
                  />
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={total} onPage={(p) => dispatch(setPage(p))} />
          </div>
        )}
      </div>

      <EmailModal
        isOpen={emailModal.open}
        onClose={() => setEmailModal({ open: false, recipients: [], jobTitle: '' })}
        recipients={emailModal.recipients}
        jobTitle={emailModal.jobTitle}
        context="shortlist"
      />
    </div>
  );
}
