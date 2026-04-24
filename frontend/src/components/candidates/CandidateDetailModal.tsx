'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Candidate } from '@/types';
import {
  Mail, Phone, MapPin, Briefcase, Calendar,
  GraduationCap, Trophy, ExternalLink, Edit2, Save, X, CheckCircle2, Trash2, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import toast from 'react-hot-toast';

const SKILL_LEVEL_COLOR: Record<string, 'success' | 'primary' | 'warning' | 'neutral'> = {
  Expert: 'success', Advanced: 'primary', Intermediate: 'warning', Beginner: 'neutral',
};

interface Props {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Candidate>) => Promise<unknown>;
}

export function CandidateDetailModal({ candidate, isOpen, onClose, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<Partial<Candidate>>({});
  const { items: jobs } = useSelector((s: RootState) => s.jobs);

  useEffect(() => {
    if (candidate) {
      setForm(candidate);
      setIsEditing(false);
    }
  }, [candidate]);

  if (!isOpen || !candidate) return null;

  const set = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setNested = (parent: string, field: string, value: unknown) =>
    setForm((prev) => ({
      ...prev,
      [parent]: { ...(prev as Record<string, unknown>)[parent] as object, [field]: value },
    }));

  const updateArrayItem = (field: string, index: number, key: string, value: unknown) =>
    setForm((prev) => {
      const list = [
        ...((((prev as Record<string, unknown>)[field] as unknown[]) || [])),
      ];
      list[index] = {
        ...((list[index] as Record<string, unknown>) || {}),
        [key]: value,
      };
      return { ...prev, [field]: list };
    });

  const addArrayItem = (field: string, item: Record<string, unknown>) =>
    setForm((prev) => {
      const list = [
        ...((((prev as Record<string, unknown>)[field] as unknown[]) || [])),
        item,
      ];
      return { ...prev, [field]: list };
    });

  const removeArrayItem = (field: string, index: number) =>
    setForm((prev) => {
      const list = [
        ...((((prev as Record<string, unknown>)[field] as unknown[]) || [])),
      ];
      list.splice(index, 1);
      return { ...prev, [field]: list };
    });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await onUpdate(candidate._id, form) as { meta?: { requestStatus: string } };
      if (result?.meta?.requestStatus === 'fulfilled') {
        toast.success('Candidate updated');
        setIsEditing(false);
      } else {
        toast.error('Update failed');
      }
    } catch {
      toast.error('Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(candidate);
    setIsEditing(false);
  };

  const jobTitle = jobs.find((j) => j._id === form.jobId)
    ? `${jobs.find((j) => j._id === form.jobId)!.title} — ${jobs.find((j) => j._id === form.jobId)!.experienceLevel}`
    : 'No job assigned';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" showCloseButton={false} className="p-0">
      {/* ── Modal Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-50/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Avatar name={`${form.firstName} ${form.lastName}`} size="md" />
          <div>
            <h2 className="text-base font-semibold text-gray-900 leading-none">
              {form.firstName} {form.lastName}
            </h2>
            {form.headline && (
              <p className="text-xs text-gray-500 mt-1">{form.headline}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving}>
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleSave} isLoading={isSaving}>
                <Save className="w-3.5 h-3.5 mr-1" /> Save
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-gray-700 transition-colors border border-transparent hover:border-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable Content ───────────────────────────────────────── */}
      <div className="p-6 space-y-4 bg-slate-50/60">

        {/* Basic Information */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-3">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
              {isEditing ? (
                <Input value={form.firstName || ''} onChange={(e) => set('firstName', e.target.value)} />
              ) : (
                <p className="text-sm text-gray-900">{form.firstName || '—'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
              {isEditing ? (
                <Input value={form.lastName || ''} onChange={(e) => set('lastName', e.target.value)} />
              ) : (
                <p className="text-sm text-gray-900">{form.lastName || '—'}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                {isEditing ? (
                  <Input value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{form.email}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Phone</span>
              </label>
              {isEditing ? (
                <Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="+1 555 000 0000" />
              ) : (
                <p className="text-sm text-gray-900">{form.phone || '—'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Headline</label>
              {isEditing ? (
                <Input value={form.headline || ''} onChange={(e) => set('headline', e.target.value)} placeholder="e.g. Senior React Developer" />
              ) : (
                <p className="text-sm text-gray-900">{form.headline || '—'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Location</span>
              </label>
              {isEditing ? (
                <Input value={form.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="City, Country" />
              ) : (
                <p className="text-sm text-gray-900">{form.location || '—'}</p>
              )}
            </div>

            {/* Job assignment — full width */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />Job Position</span>
              </label>
              {isEditing ? (
                <select
                  value={form.jobId || ''}
                  onChange={(e) => set('jobId', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">— Select a job —</option>
                  {jobs.map((j) => (
                    <option key={j._id} value={j._id}>
                      {j.title} — {j.experienceLevel}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-900">{jobTitle}</p>
              )}
            </div>

            {/* Bio — full width */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
              {isEditing ? (
                <TextArea
                  value={form.bio || ''}
                  onChange={(e) => set('bio', e.target.value)}
                  rows={3}
                  placeholder="Brief bio about the candidate..."
                />
              ) : (
                <p className="text-sm text-gray-700">{form.bio || '—'}</p>
              )}
            </div>
          </div>
        </section>

        {/* Availability */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-3">
            Availability
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              {isEditing ? (
                <Select
                  value={form.availability?.status || 'Available'}
                  onChange={(e) => setNested('availability', 'status', e.target.value)}
                  options={[
                    { value: 'Available', label: 'Available' },
                    { value: 'Open to Opportunities', label: 'Open to Opportunities' },
                    { value: 'Not Available', label: 'Not Available' },
                  ]}
                />
              ) : (
                <Badge variant={form.availability?.status === 'Available' ? 'success' : 'warning'}>
                  {form.availability?.status || 'Available'}
                </Badge>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              {isEditing ? (
                <Select
                  value={form.availability?.type || 'Full-time'}
                  onChange={(e) => setNested('availability', 'type', e.target.value)}
                  options={[
                    { value: 'Full-time', label: 'Full-time' },
                    { value: 'Part-time', label: 'Part-time' },
                    { value: 'Contract', label: 'Contract' },
                    { value: 'Freelance', label: 'Freelance' },
                  ]}
                />
              ) : (
                <Badge variant="primary">{form.availability?.type || 'Full-time'}</Badge>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              {isEditing ? (
                <Input
                  type="date"
                  value={form.availability?.startDate || ''}
                  onChange={(e) => setNested('availability', 'startDate', e.target.value)}
                />
              ) : (
                <p className="text-sm text-gray-900">{form.availability?.startDate || '—'}</p>
              )}
            </div>
          </div>
        </section>

        {/* Skills */}
        {(form.skills?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-3">
              Skills
            </h3>
            {isEditing ? (
              <div className="space-y-2">
                {(form.skills || []).map((skill, i) => (
                  <div key={`${skill.name}-${i}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-4">
                      <Input
                        value={skill.name}
                        onChange={(e) => updateArrayItem('skills', i, 'name', e.target.value)}
                        placeholder="Skill"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Select
                        value={skill.level}
                        onChange={(e) => updateArrayItem('skills', i, 'level', e.target.value)}
                        options={[
                          { value: 'Beginner', label: 'Beginner' },
                          { value: 'Intermediate', label: 'Intermediate' },
                          { value: 'Advanced', label: 'Advanced' },
                          { value: 'Expert', label: 'Expert' },
                        ]}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Input
                        type="number"
                        min={0}
                        value={String(skill.yearsOfExperience ?? 0)}
                        onChange={(e) => updateArrayItem('skills', i, 'yearsOfExperience', Number(e.target.value || 0))}
                        placeholder="Years"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button size="sm" variant="ghost" onClick={() => removeArrayItem('skills', i)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addArrayItem('skills', { name: '', level: 'Intermediate', yearsOfExperience: 0 })}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Skill
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {form.skills!.map((skill) => (
                  <Badge key={skill.name} variant={SKILL_LEVEL_COLOR[skill.level]} size="md">
                    {skill.name}
                    <span className="ml-1.5 opacity-60 text-[10px]">
                      {skill.yearsOfExperience}y · {skill.level}
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Languages */}
        {(form.languages?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-3">
              Languages
            </h3>
            {isEditing ? (
              <div className="space-y-2">
                {(form.languages || []).map((language, i) => (
                  <div key={`${language.name}-${i}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-5">
                      <Input
                        value={language.name}
                        onChange={(e) => updateArrayItem('languages', i, 'name', e.target.value)}
                        placeholder="Language"
                      />
                    </div>
                    <div className="md:col-span-5">
                      <Select
                        value={language.proficiency}
                        onChange={(e) => updateArrayItem('languages', i, 'proficiency', e.target.value)}
                        options={[
                          { value: 'Basic', label: 'Basic' },
                          { value: 'Conversational', label: 'Conversational' },
                          { value: 'Fluent', label: 'Fluent' },
                          { value: 'Native', label: 'Native' },
                        ]}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button size="sm" variant="ghost" onClick={() => removeArrayItem('languages', i)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addArrayItem('languages', { name: '', proficiency: 'Conversational' })}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Language
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {form.languages!.map((language) => (
                  <Badge key={`${language.name}-${language.proficiency}`} variant="neutral" size="md">
                    {language.name}
                    <span className="ml-1.5 opacity-70 text-[10px]">{language.proficiency}</span>
                  </Badge>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Work Experience */}
        {(form.experience?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Work Experience
            </h3>
            <div className="space-y-3">
              {form.experience!.map((exp, i) => (
                <Card key={i} className="p-4 bg-slate-50 border-gray-200 transition-colors hover:bg-slate-100">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input value={exp.role} onChange={(e) => updateArrayItem('experience', i, 'role', e.target.value)} placeholder="Role" />
                        <Input value={exp.company} onChange={(e) => updateArrayItem('experience', i, 'company', e.target.value)} placeholder="Company" />
                        <Input type="date" value={exp.startDate || ''} onChange={(e) => updateArrayItem('experience', i, 'startDate', e.target.value)} />
                        <Input type="date" value={exp.endDate || ''} onChange={(e) => updateArrayItem('experience', i, 'endDate', e.target.value)} />
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={!!exp.isCurrent}
                          onChange={(e) => updateArrayItem('experience', i, 'isCurrent', e.target.checked)}
                        />
                        Current role
                      </label>
                      <TextArea
                        value={exp.description || ''}
                        onChange={(e) => updateArrayItem('experience', i, 'description', e.target.value)}
                        rows={2}
                        placeholder="Description"
                      />
                      <Input
                        value={(exp.technologies || []).join(', ')}
                        onChange={(e) => updateArrayItem('experience', i, 'technologies', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
                        placeholder="Technologies (comma separated)"
                      />
                      <Button size="sm" variant="ghost" onClick={() => removeArrayItem('experience', i)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove Experience
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{exp.role}</p>
                          <p className="text-xs text-gray-600">{exp.company}</p>
                        </div>
                        {exp.isCurrent && <Badge variant="success" size="sm">Current</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {exp.startDate} – {exp.isCurrent ? 'Present' : (exp.endDate || 'Present')}
                      </div>
                      {exp.description && (
                        <p className="text-xs text-gray-700 mt-2">{exp.description}</p>
                      )}
                      {(exp.technologies?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {exp.technologies!.map((t) => (
                            <Badge key={t} variant="neutral" size="sm">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </Card>
              ))}
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addArrayItem('experience', { company: '', role: '', startDate: '', endDate: '', isCurrent: false, description: '', technologies: [] })}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Experience
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Education */}
        {(form.education?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" /> Education
            </h3>
            <div className="space-y-3">
              {form.education!.map((edu, i) => (
                <Card key={i} className="p-4 bg-slate-50 border-gray-200 transition-colors hover:bg-slate-100">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input value={edu.degree} onChange={(e) => updateArrayItem('education', i, 'degree', e.target.value)} placeholder="Degree" />
                        <Input value={edu.institution} onChange={(e) => updateArrayItem('education', i, 'institution', e.target.value)} placeholder="Institution" />
                        <Input value={edu.fieldOfStudy || ''} onChange={(e) => updateArrayItem('education', i, 'fieldOfStudy', e.target.value)} placeholder="Field of study" />
                        <Input type="number" value={String(edu.startYear || '')} onChange={(e) => updateArrayItem('education', i, 'startYear', e.target.value ? Number(e.target.value) : undefined)} placeholder="Start year" />
                        <Input type="number" value={String(edu.endYear || '')} onChange={(e) => updateArrayItem('education', i, 'endYear', e.target.value ? Number(e.target.value) : undefined)} placeholder="End year" />
                        <Input type="number" step="0.01" value={String(edu.gpa || '')} onChange={(e) => updateArrayItem('education', i, 'gpa', e.target.value ? Number(e.target.value) : undefined)} placeholder="GPA" />
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeArrayItem('education', i)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove Education
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-900">{edu.degree}</p>
                      <p className="text-xs text-gray-600">{edu.institution}</p>
                      {edu.fieldOfStudy && (
                        <p className="text-xs text-gray-500 mt-0.5">{edu.fieldOfStudy}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {edu.startYear && (
                          <span>{edu.startYear} – {edu.endYear || 'Present'}</span>
                        )}
                        {edu.gpa && <span>GPA: {edu.gpa}</span>}
                      </div>
                    </>
                  )}
                </Card>
              ))}
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addArrayItem('education', { institution: '', degree: '', fieldOfStudy: '', startYear: undefined, endYear: undefined, gpa: undefined })}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Education
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Certifications */}
        {(form.certifications?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Certifications
            </h3>
            <div className="space-y-2">
              {form.certifications!.map((cert, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-800 bg-gray-50 rounded-lg p-3">
                  {isEditing ? (
                    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input value={cert.name} onChange={(e) => updateArrayItem('certifications', i, 'name', e.target.value)} placeholder="Certificate name" />
                      <Input value={cert.issuer || ''} onChange={(e) => updateArrayItem('certifications', i, 'issuer', e.target.value)} placeholder="Issuer" />
                      <Input type="date" value={cert.issueDate || ''} onChange={(e) => updateArrayItem('certifications', i, 'issueDate', e.target.value)} />
                      <div className="md:col-span-3">
                        <Button size="sm" variant="ghost" onClick={() => removeArrayItem('certifications', i)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove Certification
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{cert.name}</p>
                        {cert.issuer && <p className="text-xs text-gray-500">from {cert.issuer}</p>}
                        {cert.issueDate && <p className="text-xs text-gray-400">Issued: {cert.issueDate}</p>}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addArrayItem('certifications', { name: '', issuer: '', issueDate: '' })}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Certification
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Projects */}
        {(form.projects?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-3">
              Projects
            </h3>
            <div className="space-y-3">
              {form.projects!.map((project, i) => (
                <Card key={`${project.name}-${i}`} className="p-4 bg-slate-50 border-gray-200 transition-colors hover:bg-slate-100">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input value={project.name} onChange={(e) => updateArrayItem('projects', i, 'name', e.target.value)} placeholder="Project name" />
                        <Input value={project.role || ''} onChange={(e) => updateArrayItem('projects', i, 'role', e.target.value)} placeholder="Role" />
                        <Input value={project.link || ''} onChange={(e) => updateArrayItem('projects', i, 'link', e.target.value)} placeholder="Link" />
                        <Input value={project.impact || ''} onChange={(e) => updateArrayItem('projects', i, 'impact', e.target.value)} placeholder="Impact" />
                        <Input type="date" value={project.startDate || ''} onChange={(e) => updateArrayItem('projects', i, 'startDate', e.target.value)} />
                        <Input type="date" value={project.endDate || ''} onChange={(e) => updateArrayItem('projects', i, 'endDate', e.target.value)} />
                      </div>
                      <TextArea value={project.description || ''} onChange={(e) => updateArrayItem('projects', i, 'description', e.target.value)} rows={2} placeholder="Description" />
                      <Input
                        value={(project.technologies || []).join(', ')}
                        onChange={(e) => updateArrayItem('projects', i, 'technologies', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
                        placeholder="Technologies (comma separated)"
                      />
                      <Button size="sm" variant="ghost" onClick={() => removeArrayItem('projects', i)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove Project
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{project.name}</p>
                          {project.role && <p className="text-xs text-gray-600 mt-0.5">Role: {project.role}</p>}
                        </div>
                        {project.link && (
                          <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Open
                          </a>
                        )}
                      </div>
                      {project.description && <p className="text-xs text-gray-700 mt-2">{project.description}</p>}
                      {(project.technologies?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {project.technologies!.map((tech) => (
                            <Badge key={tech} variant="neutral" size="sm">{tech}</Badge>
                          ))}
                        </div>
                      )}
                      {(project.startDate || project.endDate) && (
                        <p className="text-[11px] text-gray-500 mt-2">
                          {project.startDate || '—'} - {project.endDate || 'Present'}
                        </p>
                      )}
                    </>
                  )}
                </Card>
              ))}
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addArrayItem('projects', { name: '', description: '', technologies: [], role: '', link: '', startDate: '', endDate: '', impact: '' })}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Project
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Social Links */}
        {form.socialLinks && Object.values(form.socialLinks).some(Boolean) && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-3">
              Links
            </h3>
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  value={form.socialLinks.linkedin || ''}
                  onChange={(e) => setNested('socialLinks', 'linkedin', e.target.value)}
                  placeholder="LinkedIn URL"
                />
                <Input
                  value={form.socialLinks.github || ''}
                  onChange={(e) => setNested('socialLinks', 'github', e.target.value)}
                  placeholder="GitHub URL"
                />
                <Input
                  value={form.socialLinks.portfolio || ''}
                  onChange={(e) => setNested('socialLinks', 'portfolio', e.target.value)}
                  placeholder="Portfolio URL"
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {form.socialLinks.linkedin && (
                  <a href={form.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline">
                    LinkedIn <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {form.socialLinks.github && (
                  <a href={form.socialLinks.github} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 hover:underline">
                    GitHub <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {form.socialLinks.portfolio && (
                  <a href={form.socialLinks.portfolio} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-800 hover:underline">
                    Portfolio <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </section>
        )}

        {/* Metadata */}
        <section className="border border-gray-200 bg-white rounded-xl px-4 py-3 flex items-center gap-4 text-xs text-gray-400">
          <span>Source: <span className="text-gray-600 capitalize font-medium">{form.source || 'platform'}</span></span>
          {form.createdAt && (
            <span>Added: <span className="text-gray-600 font-medium">{new Date(form.createdAt).toLocaleDateString()}</span></span>
          )}
        </section>
      </div>
    </Modal>
  );
}
