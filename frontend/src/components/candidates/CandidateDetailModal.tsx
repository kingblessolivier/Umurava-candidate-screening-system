'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Candidate } from '@/types';
import {
  Mail, Phone, MapPin, Briefcase, Calendar, GraduationCap, Trophy,
  ExternalLink, Edit2, Save, X, CheckCircle2, Plus, Trash2,
  User, Zap, FolderOpen, Settings2, Link2, Globe,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

const SKILL_LEVEL_COLOR: Record<string, string> = {
  Expert: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Advanced: 'bg-blue-100 text-blue-700 border-blue-200',
  Intermediate: 'bg-amber-100 text-amber-700 border-amber-200',
  Beginner: 'bg-gray-100 text-gray-600 border-gray-200',
};

const AVAIL_STATUS_COLOR: Record<string, string> = {
  'Available': 'bg-emerald-100 text-emerald-700',
  'Open to Opportunities': 'bg-amber-100 text-amber-700',
  'Not Available': 'bg-red-100 text-red-600',
};

type Tab = 'basic' | 'skills' | 'experience' | 'education' | 'projects' | 'extras';

interface Props {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Candidate>) => Promise<unknown>;
}

export function CandidateDetailModal({ candidate, isOpen, onClose, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('basic');
  const [form, setForm] = useState<Partial<Candidate>>({});
  const { items: jobs } = useSelector((s: RootState) => s.jobs);

  useEffect(() => {
    if (candidate) { setForm(candidate); setIsEditing(false); setTab('basic'); }
  }, [candidate]);

  if (!isOpen || !candidate) return null;

  const set = (field: string, value: unknown) => setForm(p => ({ ...p, [field]: value }));
  const setNested = (parent: string, field: string, value: unknown) =>
    setForm(p => ({ ...p, [parent]: { ...(p as Record<string, unknown>)[parent] as object, [field]: value } }));
  const updateItem = (field: string, i: number, key: string, value: unknown) =>
    setForm(p => {
      const list = [...(((p as Record<string, unknown>)[field] as unknown[]) || [])];
      list[i] = { ...(list[i] as Record<string, unknown>), [key]: value };
      return { ...p, [field]: list };
    });
  const addItem = (field: string, item: Record<string, unknown>) =>
    setForm(p => ({ ...p, [field]: [...(((p as Record<string, unknown>)[field] as unknown[]) || []), item] }));
  const removeItem = (field: string, i: number) =>
    setForm(p => {
      const list = [...(((p as Record<string, unknown>)[field] as unknown[]) || [])];
      list.splice(i, 1);
      return { ...p, [field]: list };
    });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await onUpdate(candidate._id, form) as { meta?: { requestStatus: string } };
      if (result?.meta?.requestStatus === 'fulfilled') {
        toast.success('Candidate updated');
        setIsEditing(false);
      } else toast.error('Update failed');
    } catch { toast.error('Update failed'); }
    finally { setIsSaving(false); }
  };

  const handleCancel = () => { setForm(candidate); setIsEditing(false); };

  const ic = 'w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white';
  const label = 'block text-[11px] font-medium text-gray-500 mb-1';

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'basic',      label: 'Basic',      icon: <User className="w-3 h-3" /> },
    { id: 'skills',     label: 'Skills',     icon: <Zap className="w-3 h-3" /> },
    { id: 'experience', label: 'Experience', icon: <Briefcase className="w-3 h-3" /> },
    { id: 'education',  label: 'Education',  icon: <GraduationCap className="w-3 h-3" /> },
    { id: 'projects',   label: 'Projects',   icon: <FolderOpen className="w-3 h-3" /> },
    { id: 'extras',     label: 'Extras',     icon: <Settings2 className="w-3 h-3" /> },
  ];

  const assignedJob = jobs.find(j => j._id === form.jobId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" showCloseButton={false} className="p-0">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-white">
        <Avatar name={`${candidate.firstName} ${candidate.lastName}`} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-900 truncate">
              {form.firstName} {form.lastName}
            </h2>
            {form.availability?.status && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${AVAIL_STATUS_COLOR[form.availability.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {form.availability.status}
              </span>
            )}
          </div>
          {form.headline && <p className="text-[11px] text-gray-500 truncate mt-0.5">{form.headline}</p>}
          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-400">
            {form.location && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{form.location}</span>}
            {form.email && <span className="flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{form.email}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isEditing ? (
            <>
              <button onClick={handleCancel} disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <X className="w-3 h-3" /> Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                <Save className="w-3 h-3" />
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          )}
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-0.5 px-4 pt-2 bg-white border-b border-gray-100 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border-b-2 transition-all whitespace-nowrap ${
              tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="overflow-y-auto bg-gray-50" style={{ maxHeight: '65vh' }}>

        {/* BASIC */}
        {tab === 'basic' && (
          <div className="p-4 space-y-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>First Name</label>
                  {isEditing
                    ? <input className={ic} value={form.firstName || ''} onChange={e => set('firstName', e.target.value)} />
                    : <p className="text-xs font-medium text-gray-900">{form.firstName || '—'}</p>}
                </div>
                <div>
                  <label className={label}>Last Name</label>
                  {isEditing
                    ? <input className={ic} value={form.lastName || ''} onChange={e => set('lastName', e.target.value)} />
                    : <p className="text-xs font-medium text-gray-900">{form.lastName || '—'}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Email</label>
                  {isEditing
                    ? <input type="email" className={ic} value={form.email || ''} onChange={e => set('email', e.target.value)} />
                    : <p className="text-xs text-gray-700 flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" />{form.email || '—'}</p>}
                </div>
                <div>
                  <label className={label}>Phone</label>
                  {isEditing
                    ? <input className={ic} value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+250 7xx xxx xxx" />
                    : <p className="text-xs text-gray-700 flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{form.phone || '—'}</p>}
                </div>
              </div>
              <div>
                <label className={label}>Headline</label>
                {isEditing
                  ? <input className={ic} value={form.headline || ''} onChange={e => set('headline', e.target.value)} placeholder="e.g. Senior React Developer" />
                  : <p className="text-xs font-medium text-gray-800">{form.headline || '—'}</p>}
              </div>
              <div>
                <label className={label}>Location</label>
                {isEditing
                  ? <input className={ic} value={form.location || ''} onChange={e => set('location', e.target.value)} placeholder="City, Country" />
                  : <p className="text-xs text-gray-700 flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" />{form.location || '—'}</p>}
              </div>
              <div>
                <label className={label}>Job Position</label>
                {isEditing ? (
                  <select className={ic} value={form.jobId || ''} onChange={e => set('jobId', e.target.value)}>
                    <option value="">— Select a job —</option>
                    {jobs.map(j => <option key={j._id} value={j._id}>{j.title} — {j.experienceLevel}</option>)}
                  </select>
                ) : (
                  <p className="text-xs text-gray-700 flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-gray-400" />
                    {assignedJob ? `${assignedJob.title} — ${assignedJob.experienceLevel}` : '—'}
                  </p>
                )}
              </div>
              <div>
                <label className={label}>Bio</label>
                {isEditing
                  ? <textarea rows={3} className={`${ic} resize-none`} value={form.bio || ''} onChange={e => set('bio', e.target.value)} placeholder="Brief professional bio..." />
                  : <p className="text-xs text-gray-600 leading-relaxed">{form.bio || '—'}</p>}
              </div>
            </div>
          </div>
        )}

        {/* SKILLS */}
        {tab === 'skills' && (
          <div className="p-4 space-y-3">
            {/* Skills */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Skills</h4>
                {isEditing && (
                  <button onClick={() => addItem('skills', { name: '', level: 'Intermediate', yearsOfExperience: 1 })}
                    className="flex items-center gap-1 text-[11px] text-blue-600 font-medium hover:text-blue-700">
                    <Plus className="w-3 h-3" /> Add Skill
                  </button>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  {(form.skills || []).map((s, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_60px_auto] gap-2 items-center">
                      <input className={ic} placeholder="Skill name" value={s.name} onChange={e => updateItem('skills', i, 'name', e.target.value)} />
                      <select className={ic} value={s.level} onChange={e => updateItem('skills', i, 'level', e.target.value)}>
                        <option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Expert</option>
                      </select>
                      <input type="number" min={0} className={ic} value={s.yearsOfExperience ?? 0} onChange={e => updateItem('skills', i, 'yearsOfExperience', Number(e.target.value))} />
                      <button onClick={() => removeItem('skills', i)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(form.skills || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic py-2">No skills added yet.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(form.skills || []).length > 0
                    ? form.skills!.map((s, i) => (
                        <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${SKILL_LEVEL_COLOR[s.level] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {s.name}
                          <span className="opacity-60 text-[10px]">· {s.level}{s.yearsOfExperience ? ` · ${s.yearsOfExperience}y` : ''}</span>
                        </span>
                      ))
                    : <p className="text-xs text-gray-400 italic">No skills listed.</p>}
                </div>
              )}
            </div>

            {/* Languages */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Languages</h4>
                {isEditing && (
                  <button onClick={() => addItem('languages', { name: '', proficiency: 'Fluent' })}
                    className="flex items-center gap-1 text-[11px] text-blue-600 font-medium hover:text-blue-700">
                    <Plus className="w-3 h-3" /> Add Language
                  </button>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  {(form.languages || []).map((l, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                      <input className={ic} placeholder="Language" value={l.name} onChange={e => updateItem('languages', i, 'name', e.target.value)} />
                      <select className={ic} value={l.proficiency} onChange={e => updateItem('languages', i, 'proficiency', e.target.value)}>
                        <option>Basic</option><option>Conversational</option><option>Fluent</option><option>Native</option>
                      </select>
                      <button onClick={() => removeItem('languages', i)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(form.languages || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic py-2">No languages added yet.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(form.languages || []).length > 0
                    ? form.languages!.map((l, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {l.name}<span className="opacity-60">· {l.proficiency}</span>
                        </span>
                      ))
                    : <p className="text-xs text-gray-400 italic">No languages listed.</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXPERIENCE */}
        {tab === 'experience' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Work Experience</p>
              {isEditing && (
                <button onClick={() => addItem('experience', { company: '', role: '', startDate: '', endDate: '', isCurrent: false, description: '', technologies: [] })}
                  className="flex items-center gap-1 text-[11px] text-blue-600 font-medium hover:text-blue-700">
                  <Plus className="w-3 h-3" /> Add Experience
                </button>
              )}
            </div>
            {(form.experience || []).length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
                <Briefcase className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">{isEditing ? 'Click "Add Experience" to add work history.' : 'No experience listed.'}</p>
              </div>
            )}
            {(form.experience || []).map((exp, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                {isEditing ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={label}>Role</label><input className={ic} placeholder="e.g. Backend Engineer" value={exp.role} onChange={e => updateItem('experience', i, 'role', e.target.value)} /></div>
                      <div><label className={label}>Company</label><input className={ic} placeholder="Company name" value={exp.company} onChange={e => updateItem('experience', i, 'company', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={label}>Start (YYYY-MM)</label><input type="month" className={ic} value={exp.startDate || ''} onChange={e => updateItem('experience', i, 'startDate', e.target.value)} /></div>
                      <div><label className={label}>End (YYYY-MM)</label><input type="month" className={ic} disabled={!!exp.isCurrent} value={exp.endDate || ''} onChange={e => updateItem('experience', i, 'endDate', e.target.value)} /></div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={!!exp.isCurrent} onChange={e => updateItem('experience', i, 'isCurrent', e.target.checked)} className="rounded border-gray-300 text-blue-600" />
                      Current role
                    </label>
                    <div><label className={label}>Description</label><textarea rows={2} className={`${ic} resize-none`} placeholder="Key responsibilities and achievements..." value={exp.description || ''} onChange={e => updateItem('experience', i, 'description', e.target.value)} /></div>
                    <div><label className={label}>Technologies (comma-separated)</label><input className={ic} placeholder="e.g. Node.js, PostgreSQL, Docker" value={(exp.technologies || []).join(', ')} onChange={e => updateItem('experience', i, 'technologies', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} /></div>
                    <button onClick={() => removeItem('experience', i)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3 h-3" /> Remove entry
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-gray-900">{exp.role}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{exp.company}</p>
                      </div>
                      {exp.isCurrent && <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full flex-shrink-0">Current</span>}
                    </div>
                    <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1.5">
                      <Calendar className="w-3 h-3" />{exp.startDate || '—'} – {exp.isCurrent ? 'Present' : (exp.endDate || 'Present')}
                    </p>
                    {exp.description && <p className="text-xs text-gray-600 mt-2 leading-relaxed">{exp.description}</p>}
                    {(exp.technologies?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {exp.technologies!.map((t, ti) => <span key={ti} className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded font-medium">{t}</span>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* EDUCATION */}
        {tab === 'education' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Education</p>
              {isEditing && (
                <button onClick={() => addItem('education', { institution: '', degree: '', fieldOfStudy: '', startYear: undefined, endYear: undefined })}
                  className="flex items-center gap-1 text-[11px] text-blue-600 font-medium hover:text-blue-700">
                  <Plus className="w-3 h-3" /> Add Education
                </button>
              )}
            </div>
            {(form.education || []).length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
                <GraduationCap className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">{isEditing ? 'Click "Add Education" to add academic history.' : 'No education listed.'}</p>
              </div>
            )}
            {(form.education || []).map((edu, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                {isEditing ? (
                  <div className="space-y-2.5">
                    <div><label className={label}>Institution</label><input className={ic} placeholder="University / School name" value={edu.institution} onChange={e => updateItem('education', i, 'institution', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={label}>Degree</label><input className={ic} placeholder="e.g. Bachelor's" value={edu.degree} onChange={e => updateItem('education', i, 'degree', e.target.value)} /></div>
                      <div><label className={label}>Field of Study</label><input className={ic} placeholder="e.g. Computer Science" value={edu.fieldOfStudy || ''} onChange={e => updateItem('education', i, 'fieldOfStudy', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className={label}>Start Year</label><input type="number" className={ic} placeholder="2020" value={edu.startYear || ''} onChange={e => updateItem('education', i, 'startYear', e.target.value ? Number(e.target.value) : undefined)} /></div>
                      <div><label className={label}>End Year</label><input type="number" className={ic} placeholder="2024" value={edu.endYear || ''} onChange={e => updateItem('education', i, 'endYear', e.target.value ? Number(e.target.value) : undefined)} /></div>
                      <div><label className={label}>GPA</label><input type="number" step="0.01" min={0} max={4} className={ic} placeholder="3.8" value={edu.gpa || ''} onChange={e => updateItem('education', i, 'gpa', e.target.value ? Number(e.target.value) : undefined)} /></div>
                    </div>
                    <button onClick={() => removeItem('education', i)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3 h-3" /> Remove entry
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-gray-900">{edu.degree}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{edu.institution}</p>
                    {edu.fieldOfStudy && <p className="text-xs text-gray-400 mt-0.5">{edu.fieldOfStudy}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                      {(edu.startYear || edu.endYear) && <span>{edu.startYear || '—'} – {edu.endYear || 'Present'}</span>}
                      {edu.gpa && <span className="font-medium text-gray-600">GPA: {edu.gpa}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PROJECTS */}
        {tab === 'projects' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Projects</p>
              {isEditing && (
                <button onClick={() => addItem('projects', { name: '', description: '', technologies: [], role: '', link: '', startDate: '', endDate: '' })}
                  className="flex items-center gap-1 text-[11px] text-blue-600 font-medium hover:text-blue-700">
                  <Plus className="w-3 h-3" /> Add Project
                </button>
              )}
            </div>
            {(form.projects || []).length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
                <FolderOpen className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">{isEditing ? 'Click "Add Project" to add portfolio projects.' : 'No projects listed.'}</p>
              </div>
            )}
            {(form.projects || []).map((proj, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                {isEditing ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={label}>Project Name</label><input className={ic} placeholder="e.g. AI Recruitment System" value={proj.name} onChange={e => updateItem('projects', i, 'name', e.target.value)} /></div>
                      <div><label className={label}>Role</label><input className={ic} placeholder="e.g. Lead Developer" value={proj.role || ''} onChange={e => updateItem('projects', i, 'role', e.target.value)} /></div>
                    </div>
                    <div><label className={label}>Description</label><textarea rows={2} className={`${ic} resize-none`} placeholder="What the project does and your impact..." value={proj.description || ''} onChange={e => updateItem('projects', i, 'description', e.target.value)} /></div>
                    <div><label className={label}>Technologies (comma-separated)</label><input className={ic} placeholder="e.g. Next.js, Node.js, PostgreSQL" value={(proj.technologies || []).join(', ')} onChange={e => updateItem('projects', i, 'technologies', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} /></div>
                    <div><label className={label}>Project Link</label><input className={ic} placeholder="https://github.com/..." value={proj.link || ''} onChange={e => updateItem('projects', i, 'link', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={label}>Start (YYYY-MM)</label><input type="month" className={ic} value={proj.startDate || ''} onChange={e => updateItem('projects', i, 'startDate', e.target.value)} /></div>
                      <div><label className={label}>End (YYYY-MM)</label><input type="month" className={ic} value={proj.endDate || ''} onChange={e => updateItem('projects', i, 'endDate', e.target.value)} /></div>
                    </div>
                    <button onClick={() => removeItem('projects', i)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3 h-3" /> Remove entry
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-gray-900">{proj.name}</p>
                        {proj.role && <p className="text-xs text-gray-500 mt-0.5">{proj.role}</p>}
                      </div>
                      {proj.link && (
                        <a href={proj.link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 flex-shrink-0">
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                      )}
                    </div>
                    {proj.description && <p className="text-xs text-gray-600 mt-2 leading-relaxed">{proj.description}</p>}
                    {(proj.technologies?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {proj.technologies!.map((t, ti) => <span key={ti} className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded font-medium">{t}</span>)}
                      </div>
                    )}
                    {(proj.startDate || proj.endDate) && (
                      <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{proj.startDate || '—'} – {proj.endDate || 'Present'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* EXTRAS */}
        {tab === 'extras' && (
          <div className="p-4 space-y-3">

            {/* Availability */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Availability</h4>
              {isEditing ? (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={label}>Status</label>
                    <select className={ic} value={form.availability?.status || 'Available'} onChange={e => setNested('availability', 'status', e.target.value)}>
                      <option>Available</option>
                      <option>Open to Opportunities</option>
                      <option>Not Available</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>Type</label>
                    <select className={ic} value={form.availability?.type || 'Full-time'} onChange={e => setNested('availability', 'type', e.target.value)}>
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Freelance</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>Preferred Start</label>
                    <input type="date" className={ic} value={(form.availability as Record<string, string>)?.preferredStartDate || ''} onChange={e => setNested('availability', 'preferredStartDate', e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${AVAIL_STATUS_COLOR[form.availability?.status ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                    {form.availability?.status || '—'}
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {form.availability?.type || '—'}
                  </span>
                  {(form.availability as Record<string, string>)?.preferredStartDate && (
                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> From {(form.availability as Record<string, string>).preferredStartDate}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Certifications */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Certifications</h4>
                {isEditing && (
                  <button onClick={() => addItem('certifications', { name: '', issuer: '', issueDate: '' })}
                    className="flex items-center gap-1 text-[11px] text-blue-600 font-medium hover:text-blue-700">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  {(form.certifications || []).map((c, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                      <input className={ic} placeholder="Certificate name" value={c.name} onChange={e => updateItem('certifications', i, 'name', e.target.value)} />
                      <input className={ic} placeholder="Issuer" value={c.issuer || ''} onChange={e => updateItem('certifications', i, 'issuer', e.target.value)} />
                      <input type="month" className={ic} value={c.issueDate || ''} onChange={e => updateItem('certifications', i, 'issueDate', e.target.value)} />
                      <button onClick={() => removeItem('certifications', i)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(form.certifications || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic py-1">No certifications added yet.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {(form.certifications || []).length > 0
                    ? form.certifications!.map((c, i) => (
                        <div key={i} className="flex items-center gap-2.5 p-2 bg-gray-50 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{c.name}</p>
                            <p className="text-[11px] text-gray-500">{c.issuer}{c.issueDate ? ` · ${c.issueDate}` : ''}</p>
                          </div>
                        </div>
                      ))
                    : <p className="text-xs text-gray-400 italic">No certifications listed.</p>}
                </div>
              )}
            </div>

            {/* Social Links */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Social Links</h4>
              {isEditing ? (
                <div className="space-y-2">
                  <div><label className={label}>LinkedIn</label><input className={ic} placeholder="https://linkedin.com/in/..." value={form.socialLinks?.linkedin || ''} onChange={e => setNested('socialLinks', 'linkedin', e.target.value)} /></div>
                  <div><label className={label}>GitHub</label><input className={ic} placeholder="https://github.com/..." value={form.socialLinks?.github || ''} onChange={e => setNested('socialLinks', 'github', e.target.value)} /></div>
                  <div><label className={label}>Portfolio</label><input className={ic} placeholder="https://yoursite.com" value={form.socialLinks?.portfolio || ''} onChange={e => setNested('socialLinks', 'portfolio', e.target.value)} /></div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {form.socialLinks?.linkedin && (
                    <a href={form.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      <Link2 className="w-3.5 h-3.5" /> LinkedIn
                    </a>
                  )}
                  {form.socialLinks?.github && (
                    <a href={form.socialLinks.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900 font-medium">
                      <Link2 className="w-3.5 h-3.5" /> GitHub
                    </a>
                  )}
                  {form.socialLinks?.portfolio && (
                    <a href={form.socialLinks.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium">
                      <Globe className="w-3.5 h-3.5" /> Portfolio
                    </a>
                  )}
                  {!form.socialLinks?.linkedin && !form.socialLinks?.github && !form.socialLinks?.portfolio && (
                    <p className="text-xs text-gray-400 italic">No links listed.</p>
                  )}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 px-3 py-2 text-[11px] text-gray-400">
              <span>Source: <span className="text-gray-600 font-medium capitalize">{form.source || 'platform'}</span></span>
              {form.createdAt && <span>Added: <span className="text-gray-600 font-medium">{new Date(form.createdAt).toLocaleDateString()}</span></span>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
