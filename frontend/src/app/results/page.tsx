'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchResults, deleteResult, setPage } from '@/store/screeningSlice';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Trophy, Users, Clock, ChevronRight, Trash2, Mail,
  FileText, ChevronLeft, CalendarDays, Zap, TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import EmailModal from '@/components/email/EmailModal';
import { ScreeningResult } from '@/types';

const PAGE_SIZE = 10;

function scoreConfig(s: number) {
  if (s >= 70) return { label: 'Strong',    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500', dot: 'bg-emerald-500' };
  if (s >= 55) return { label: 'Average',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   bar: 'bg-amber-400',   dot: 'bg-amber-400'   };
  return          { label: 'Below Bar', bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',     bar: 'bg-red-400',     dot: 'bg-red-400'     };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest leading-none">{label}</p>
        <p className="text-base font-bold text-gray-900 leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5 leading-none">{sub}</p>}
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center">
        <Trophy className="w-5 h-5 text-gray-300" />
      </div>
      <p className="text-sm font-semibold text-gray-800 mb-1">No evaluations yet</p>
      <p className="text-xs text-gray-400 mb-5">Run a screening to see candidate rankings here</p>
      <Link
        href="/screening"
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        <Zap className="w-3.5 h-3.5" />
        Start Evaluation
      </Link>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-3 flex gap-6">
        {[200, 70, 70, 90, 60].map((w, i) => (
          <div key={i} className="h-2.5 bg-gray-200 rounded animate-pulse" style={{ width: w }} />
        ))}
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0">
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-100 rounded animate-pulse w-2/5" />
            <div className="h-2 bg-gray-100 rounded animate-pulse w-1/5" />
          </div>
          <div className="h-2.5 bg-gray-100 rounded animate-pulse w-8" />
          <div className="h-2.5 bg-gray-100 rounded animate-pulse w-8" />
          <div className="h-5 bg-gray-100 rounded-full animate-pulse w-24" />
          <div className="h-5 bg-gray-100 rounded animate-pulse w-14" />
        </div>
      ))}
    </div>
  );
}

// ── Score Bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const cfg = scoreConfig(score);
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className={`text-[11px] font-bold tabular-nums ${cfg.text}`}>{score}%</span>
    </div>
  );
}

// ── Result Row ────────────────────────────────────────────────────────────────
function ResultRow({ result, onDelete, onEmail }: {
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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="group hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0"
    >
      {/* Position */}
      <td className="px-4 py-3 min-w-0">
        <Link href={`/results/${result._id}`} className="block group/link">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-gray-900 group-hover/link:text-blue-600 transition-colors truncate max-w-[260px]">
              {result.jobTitle}
            </p>
            <ArrowUpRight className="w-3 h-3 text-gray-300 group-hover/link:text-blue-500 flex-shrink-0 transition-colors" />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
            <CalendarDays className="w-2.5 h-2.5 flex-shrink-0" />
            {formatDate(result.screeningDate)}
          </p>
        </Link>
      </td>

      {/* Reviewed */}
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <p className="text-xs font-bold text-gray-800">{result.totalApplicants}</p>
        <p className="text-[10px] text-gray-400">reviewed</p>
      </td>

      {/* Shortlisted */}
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <p className="text-xs font-bold text-emerald-700">{result.shortlistSize}</p>
        <p className="text-[10px] text-gray-400">{rate}%</p>
      </td>

      {/* Score */}
      <td className="px-4 py-3 whitespace-nowrap">
        {cfg && avgScore > 0 ? (
          <div className="space-y-1">
            <ScoreBar score={avgScore} />
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-gray-300">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          {result.shortlist?.length > 0 && (
            <button
              onClick={(e) => onEmail(e, result)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <Mail className="w-2.5 h-2.5" />
              Email {result.shortlistSize}
            </button>
          )}
          <Link
            href={`/results/${result._id}`}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={(e) => onDelete(result._id || '', e)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function PageNav({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end   = Math.min(page * PAGE_SIZE, total);

  let from = Math.max(1, page - 2);
  const to = Math.min(totalPages, from + 4);
  from = Math.max(1, to - 4);
  const pages = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/40">
      <p className="text-[10px] text-gray-400">
        <span className="font-semibold text-gray-600">{start}–{end}</span> of{' '}
        <span className="font-semibold text-gray-600">{total}</span>
      </p>
      <div className="flex items-center gap-0.5">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {pages.map((p) => (
          <button key={p} onClick={() => onPage(p)}
            className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors ${
              p === page ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-200'
            }`}>
            {p}
          </button>
        ))}
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { results, loading, page, total } = useSelector((s: RootState) => s.screening);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<{
    open: boolean; recipients: { name: string; email: string }[]; jobTitle: string;
  }>({ open: false, recipients: [], jobTitle: '' });

  useEffect(() => { dispatch(fetchResults({ page, limit: PAGE_SIZE })); }, [dispatch, page]);

  const handleEmail = (e: React.MouseEvent, r: ScreeningResult) => {
    e.preventDefault();
    if (!r.shortlist?.length) return;
    setEmailModal({
      open: true,
      jobTitle: r.jobTitle,
      recipients: r.shortlist.map((c) => ({
        name:  c.candidateName?.trim() || c.email.split('@')[0],
        email: c.email,
      })),
    });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Delete this evaluation result?')) return;
    setDeletingId(id);
    try   { await dispatch(deleteResult(id)).unwrap(); }
    catch { /* already shown by slice */ }
    finally { setDeletingId(null); }
  };

  void deletingId;

  const totalScreened    = results.reduce((a, r) => a + (r.totalApplicants || 0), 0);
  const totalShortlisted = results.reduce((a, r) => a + (r.shortlistSize || 0), 0);
  const selectionRate    = totalScreened > 0
    ? `${Math.round((totalShortlisted / totalScreened) * 100)}% selection rate`
    : undefined;
  const avgMs = results.length
    ? results.reduce((a, r) => a + (r.processingTimeMs || 0), 0) / results.length
    : 0;
  const avgDuration = avgMs > 0 ? `${(avgMs / 1000).toFixed(1)}s avg` : '—';

  return (
    <div className="-mx-6 -my-4">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-gray-900 tracking-tight">Evaluation Results</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {total} {total === 1 ? 'evaluation' : 'evaluations'} completed
            </p>
          </div>
          <Link
            href="/screening"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            New Evaluation
          </Link>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4 max-w-[1200px] mx-auto">

        {/* ── Stats row ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Evaluations"      value={total}           sub="all time"       icon={FileText}   color="bg-blue-50 text-blue-600"    />
          <StatCard label="Applicants"        value={totalScreened}   sub="across all jobs" icon={Users}      color="bg-gray-100 text-gray-500"   />
          <StatCard label="Shortlisted"       value={totalShortlisted} sub={selectionRate}  icon={Trophy}     color="bg-emerald-50 text-emerald-600" />
          <StatCard label="Avg. Processing"   value={avgDuration}                          icon={Clock}      color="bg-amber-50 text-amber-600"   />
        </div>

        {/* ── Table ──────────────────────────────────────────── */}
        {loading ? (
          <Skeleton />
        ) : results.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Table header */}
            <div className="grid grid-cols-[1fr_72px_72px_160px_120px] border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
              {['Position', 'Reviewed', 'Shortlisted', 'Avg. Score', ''].map((h, i) => (
                <div key={i} className={`text-[10px] font-semibold text-gray-400 uppercase tracking-widest ${i > 0 && i < 4 ? 'text-center' : i === 4 ? 'text-right' : ''}`}>
                  {h}
                </div>
              ))}
            </div>

            <table className="w-full">
              <colgroup>
                <col className="w-auto" />
                <col className="w-[72px]" />
                <col className="w-[72px]" />
                <col className="w-[160px]" />
                <col className="w-[120px]" />
              </colgroup>
              <tbody>
                {results.map((r, i) => (
                  <motion.tr
                    key={r._id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0"
                  >
                    {/* Position */}
                    <td className="px-4 py-3 min-w-0">
                      <Link href={`/results/${r._id}`} className="block group/link">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-gray-900 group-hover/link:text-blue-600 transition-colors truncate max-w-[260px]">
                            {r.jobTitle}
                          </p>
                          <ArrowUpRight className="w-3 h-3 text-gray-300 group-hover/link:text-blue-500 flex-shrink-0 transition-colors" />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <CalendarDays className="w-2.5 h-2.5 flex-shrink-0" />
                          {formatDate(r.screeningDate)}
                        </p>
                      </Link>
                    </td>

                    {/* Reviewed */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <p className="text-xs font-bold text-gray-800">{r.totalApplicants}</p>
                      <p className="text-[10px] text-gray-400">total</p>
                    </td>

                    {/* Shortlisted */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <p className="text-xs font-bold text-emerald-600">{r.shortlistSize}</p>
                      <p className="text-[10px] text-gray-400">
                        {r.totalApplicants ? `${Math.round((r.shortlistSize / r.totalApplicants) * 100)}%` : '—'}
                      </p>
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        const avg = r.shortlist?.length
                          ? Math.round(r.shortlist.reduce((a, c) => a + c.finalScore, 0) / r.shortlist.length)
                          : 0;
                        if (!avg) return <span className="text-[11px] text-gray-300">—</span>;
                        const cfg = scoreConfig(avg);
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${avg}%` }} />
                              </div>
                              <span className={`text-[11px] font-bold tabular-nums ${cfg.text}`}>{avg}%</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {(r.shortlist?.length ?? 0) > 0 && (
                          <button
                            onClick={(e) => handleEmail(e, r)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          >
                            <Mail className="w-2.5 h-2.5" />
                            Email {r.shortlistSize}
                          </button>
                        )}
                        <Link
                          href={`/results/${r._id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={(e) => handleDelete(r._id || '', e)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            <PageNav page={page} total={total} onPage={(p) => dispatch(setPage(p))} />
          </div>
        )}

        {/* ── Top performers strip (when data exists) ──────── */}
        {!loading && results.length > 0 && (() => {
          const best = [...results]
            .filter((r) => r.shortlist?.length)
            .sort((a, b) => {
              const sa = a.shortlist ? Math.round(a.shortlist.reduce((x, c) => x + c.finalScore, 0) / a.shortlist.length) : 0;
              const sb = b.shortlist ? Math.round(b.shortlist.reduce((x, c) => x + c.finalScore, 0) / b.shortlist.length) : 0;
              return sb - sa;
            })
            .slice(0, 3);
          if (!best.length) return null;
          return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Top Performing Evaluations</p>
              </div>
              <div className="divide-y divide-gray-50">
                {best.map((r, i) => {
                  const avg = r.shortlist
                    ? Math.round(r.shortlist.reduce((a, c) => a + c.finalScore, 0) / r.shortlist.length)
                    : 0;
                  const cfg = scoreConfig(avg);
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <Link key={r._id} href={`/results/${r._id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                      <span className="text-sm w-5 text-center flex-shrink-0">{medals[i]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate">{r.jobTitle}</p>
                        <p className="text-[10px] text-gray-400">{r.shortlistSize} shortlisted · {formatDate(r.screeningDate)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${avg}%` }} />
                        </div>
                        <span className={`text-[11px] font-bold tabular-nums ${cfg.text}`}>{avg}%</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })()}

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
