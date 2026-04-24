'use client';

import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { createCandidate } from '@/store/candidatesSlice';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { DraftRecoveryModal } from '@/components/ui/DraftRecoveryModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const createInitialCandidateForm = () => ({
  firstName: '',
  lastName: '',
  email: '',
  jobId: '',
  headline: '',
  bio: '',
  location: '',
  skills: [{ name: '', level: 'Intermediate', yearsOfExperience: 1 }] as Array<{ name: string; level: string; yearsOfExperience: number }>,
  languages: [] as Array<{ name: string; proficiency: string }>,
  experience: [{ company: '', role: '', startDate: '', endDate: '', isCurrent: false, description: '', technologies: '' }] as Array<{ company: string; role: string; startDate: string; endDate: string; isCurrent: boolean; description: string; technologies: string }>,
  education: [{ institution: '', degree: '', fieldOfStudy: '', startYear: 2020, endYear: 2024 }] as Array<{ institution: string; degree: string; fieldOfStudy: string; startYear: number; endYear: number }>,
  certifications: [] as Array<{ name: string; issuer: string; issueDate: string }>,
  projects: [{ name: '', description: '', technologies: '', role: '', link: '', startDate: '', endDate: '' }] as Array<{ name: string; description: string; technologies: string; role: string; link: string; startDate: string; endDate: string }>,
  availabilityStatus: 'Available' as 'Available' | 'Open to Opportunities' | 'Not Available',
  availabilityType: 'Full-time' as 'Full-time' | 'Part-time' | 'Contract' | 'Freelance',
  availabilityStartDate: '',
  linkedin: '',
  github: '',
  portfolio: '',
});

export function CreateCandidateModal({ isOpen, onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { items: jobs } = useSelector((s: RootState) => s.jobs);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [section, setSection] = useState<'basic' | 'skills' | 'experience' | 'education' | 'projects' | 'extras'>('basic');
  const [form, setForm] = useState(createInitialCandidateForm);

  const { getDraft, clearDraft, save } = useAutoSave({
    key: 'candidate-draft',
    data: form as unknown as Record<string, any>,
    interval: 2000,
    enabled: isOpen,
    onSave: () => {
      setAutoSaveStatus('saving');
      setTimeout(() => setAutoSaveStatus('saved'), 400);
      setTimeout(() => setAutoSaveStatus('idle'), 1800);
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    const draft = getDraft();
    if (draft?.data) {
      setShowDraftRecovery(true);
    }
  }, [isOpen, getDraft]);

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const splitCsv = (value: string) => value.split(',').map((v) => v.trim()).filter(Boolean);

  const addSkill = () => setForm((p) => ({ ...p, skills: [...p.skills, { name: '', level: 'Intermediate', yearsOfExperience: 1 }] }));
  const updateSkill = (i: number, field: string, value: any) => setForm((p) => ({ ...p, skills: p.skills.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)) }));
  const removeSkill = (i: number) => setForm((p) => ({ ...p, skills: p.skills.filter((_, idx) => idx !== i) }));

  const addLang = () => setForm((p) => ({ ...p, languages: [...p.languages, { name: '', proficiency: 'Fluent' }] }));
  const updateLang = (i: number, field: string, value: any) => setForm((p) => ({ ...p, languages: p.languages.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)) }));
  const removeLang = (i: number) => setForm((p) => ({ ...p, languages: p.languages.filter((_, idx) => idx !== i) }));

  const addExp = () => setForm((p) => ({ ...p, experience: [...p.experience, { company: '', role: '', startDate: '', endDate: '', isCurrent: false, description: '', technologies: '' }] }));
  const updateExp = (i: number, field: string, value: any) => setForm((p) => ({ ...p, experience: p.experience.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)) }));
  const removeExp = (i: number) => setForm((p) => ({ ...p, experience: p.experience.filter((_, idx) => idx !== i) }));

  const addEdu = () => setForm((p) => ({ ...p, education: [...p.education, { institution: '', degree: '', fieldOfStudy: '', startYear: 2020, endYear: 2024 }] }));
  const updateEdu = (i: number, field: string, value: any) => setForm((p) => ({ ...p, education: p.education.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)) }));
  const removeEdu = (i: number) => setForm((p) => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }));

  const addCert = () => setForm((p) => ({ ...p, certifications: [...p.certifications, { name: '', issuer: '', issueDate: '' }] }));
  const updateCert = (i: number, field: string, value: any) => setForm((p) => ({ ...p, certifications: p.certifications.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)) }));
  const removeCert = (i: number) => setForm((p) => ({ ...p, certifications: p.certifications.filter((_, idx) => idx !== i) }));

  const addProj = () => setForm((p) => ({ ...p, projects: [...p.projects, { name: '', description: '', technologies: '', role: '', link: '', startDate: '', endDate: '' }] }));
  const updateProj = (i: number, field: string, value: any) => setForm((p) => ({ ...p, projects: p.projects.map((pr, idx) => (idx === i ? { ...pr, [field]: value } : pr)) }));
  const removeProj = (i: number) => setForm((p) => ({ ...p, projects: p.projects.filter((_, idx) => idx !== i) }));

  const handleClose = () => {
    setForm(createInitialCandidateForm());
    setSection('basic');
    onClose();
  };

  const validate = () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.jobId || !form.headline.trim() || !form.location.trim()) {
      toast.error('Basic info is incomplete');
      return false;
    }
    if (!form.skills.some((s) => s.name.trim())) {
      toast.error('Add at least one skill');
      return false;
    }
    if (!form.experience.some((e) => e.company.trim() && e.role.trim() && e.startDate.trim())) {
      toast.error('Add at least one experience entry');
      return false;
    }
    if (!form.education.some((e) => e.institution.trim() && e.degree.trim())) {
      toast.error('Add at least one education entry');
      return false;
    }
    if (!form.projects.some((p) => p.name.trim())) {
      toast.error('Add at least one project');
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const isMod = event.ctrlKey || event.metaKey;
      if (!isMod) return;

      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        save();
        toast.success('Draft saved');
      }

      if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault();
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, save]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }
    setSaving(true);
    try {
      const result = await dispatch(createCandidate({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        jobId: form.jobId,
        headline: form.headline.trim(),
        bio: form.bio.trim() || undefined,
        location: form.location.trim(),
        skills: form.skills.filter((s) => s.name.trim()).map((s) => ({
          name: s.name.trim(),
          level: s.level as 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert',
          yearsOfExperience: Number.isFinite(s.yearsOfExperience) ? s.yearsOfExperience : 0,
        })),
        languages: form.languages.filter((l) => l.name.trim()).map((l) => ({
          name: l.name.trim(),
          proficiency: l.proficiency as 'Basic' | 'Conversational' | 'Fluent' | 'Native',
        })),
        experience: form.experience.filter((e) => e.company.trim() && e.role.trim() && e.startDate.trim()).map((e) => ({
          company: e.company.trim(),
          role: e.role.trim(),
          startDate: e.startDate,
          endDate: e.isCurrent ? undefined : (e.endDate || undefined),
          isCurrent: e.isCurrent,
          description: e.description.trim(),
          technologies: splitCsv(e.technologies),
        })),
        education: form.education.filter((e) => e.institution.trim() && e.degree.trim()).map((e) => ({
          institution: e.institution.trim(),
          degree: e.degree.trim(),
          fieldOfStudy: e.fieldOfStudy.trim(),
          startYear: e.startYear || undefined,
          endYear: e.endYear || undefined,
        })),
        certifications: form.certifications.filter((c) => c.name.trim()).map((c) => ({
          name: c.name.trim(),
          issuer: c.issuer.trim() || undefined,
          issueDate: c.issueDate || undefined,
        })),
        projects: form.projects.filter((p) => p.name.trim()).map((p) => ({
          name: p.name.trim(),
          description: p.description.trim() || undefined,
          technologies: splitCsv(p.technologies),
          role: p.role.trim() || undefined,
          link: p.link.trim() || undefined,
          startDate: p.startDate || undefined,
          endDate: p.endDate || undefined,
        })),
        availability: {
          status: form.availabilityStatus,
          type: form.availabilityType,
          startDate: form.availabilityStartDate || undefined,
        },
        socialLinks: {
          linkedin: form.linkedin.trim() || undefined,
          github: form.github.trim() || undefined,
          portfolio: form.portfolio.trim() || undefined,
        },
        source: 'platform',
      }));
      if (result.meta.requestStatus === 'fulfilled') {
        clearDraft();
        toast.success('Candidate created');
        handleClose();
      } else {
        toast.error((result.payload as string) || 'Failed to create candidate');
      }
    } catch {
      toast.error('Failed to create candidate');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white';
  const sectionBtn = (id: typeof section, label: string) => (
    <button
      type="button"
      onClick={() => setSection(id)}
      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
        section === id ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:text-gray-800'
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <DraftRecoveryModal
        draftKey="candidate-draft"
        onRestore={(data) => {
          setForm(data as typeof form);
          setShowDraftRecovery(false);
          toast.success('Candidate draft restored');
        }}
        onDiscard={() => setShowDraftRecovery(false)}
        isOpen={showDraftRecovery}
      />

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Add Candidate"
        subtitle="For JSON/CSV/Resume import, use Upload Candidates."
        size="xl"
      >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-gray-500">
            Shortcuts: <span className="font-medium">Ctrl/Cmd+S</span> save draft, <span className="font-medium">Ctrl/Cmd+Shift+Enter</span> submit
          </div>
          {autoSaveStatus !== 'idle' && (
            <div className={`text-[11px] font-medium ${autoSaveStatus === 'saved' ? 'text-green-600' : 'text-blue-600'}`}>
              {autoSaveStatus === 'saved' ? 'Draft saved' : 'Saving draft...'}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {sectionBtn('basic', 'Basic')}
          {sectionBtn('skills', 'Skills')}
          {sectionBtn('experience', 'Experience')}
          {sectionBtn('education', 'Education')}
          {sectionBtn('projects', 'Projects')}
          {sectionBtn('extras', 'Extras')}
        </div>

        {section === 'basic' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Alice" className="text-xs" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
                <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Uwimana" className="text-xs" required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="alice@example.com" className="text-xs" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Job Position <span className="text-red-500">*</span></label>
              <select value={form.jobId} onChange={(e) => set('jobId', e.target.value)} required className={inputClass}>
                <option value="">— Select a job —</option>
                {jobs.map((j) => (
                  <option key={j._id} value={j._id}>{j.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Headline <span className="text-red-500">*</span></label>
              <Input value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="Backend Engineer - Node.js & AI Systems" className="text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Location <span className="text-red-500">*</span></label>
              <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Kigali, Rwanda" className="text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Bio</label>
              <textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} rows={3} className={`${inputClass} resize-none`} />
            </div>
          </div>
        )}

        {section === 'skills' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-800">Skills</p>
              <button type="button" onClick={addSkill} className="text-xs text-blue-700 font-medium">+ Add Skill</button>
            </div>
            {form.skills.map((skill, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
                <input className={inputClass} placeholder="Skill name" value={skill.name} onChange={(e) => updateSkill(i, 'name', e.target.value)} />
                <select className={inputClass} value={skill.level} onChange={(e) => updateSkill(i, 'level', e.target.value)}>
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Expert</option>
                </select>
                <input type="number" min={0} className="w-20 px-2 py-2 text-xs border border-gray-200 rounded-lg" value={skill.yearsOfExperience} onChange={(e) => updateSkill(i, 'yearsOfExperience', Number(e.target.value))} />
                <button type="button" onClick={() => removeSkill(i)} className="px-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Remove</button>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs font-semibold text-gray-800">Languages</p>
              <button type="button" onClick={addLang} className="text-xs text-blue-700 font-medium">+ Add Language</button>
            </div>
            {form.languages.map((lang, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2">
                <input className={inputClass} placeholder="Language" value={lang.name} onChange={(e) => updateLang(i, 'name', e.target.value)} />
                <select className={inputClass} value={lang.proficiency} onChange={(e) => updateLang(i, 'proficiency', e.target.value)}>
                  <option>Basic</option><option>Conversational</option><option>Fluent</option><option>Native</option>
                </select>
                <button type="button" onClick={() => removeLang(i)} className="px-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Remove</button>
              </div>
            ))}
          </div>
        )}

        {section === 'experience' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-800">Work Experience</p>
              <button type="button" onClick={addExp} className="text-xs text-blue-700 font-medium">+ Add Experience</button>
            </div>
            {form.experience.map((exp, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputClass} placeholder="Company" value={exp.company} onChange={(e) => updateExp(i, 'company', e.target.value)} />
                  <input className={inputClass} placeholder="Role" value={exp.role} onChange={(e) => updateExp(i, 'role', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="month" className={inputClass} value={exp.startDate} onChange={(e) => updateExp(i, 'startDate', e.target.value)} />
                  <input type="month" className={inputClass} disabled={exp.isCurrent} value={exp.endDate} onChange={(e) => updateExp(i, 'endDate', e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" checked={exp.isCurrent} onChange={(e) => updateExp(i, 'isCurrent', e.target.checked)} />
                  Current role
                </label>
                <textarea rows={2} className={`${inputClass} resize-none`} placeholder="Description" value={exp.description} onChange={(e) => updateExp(i, 'description', e.target.value)} />
                <input className={inputClass} placeholder="Technologies (comma-separated)" value={exp.technologies} onChange={(e) => updateExp(i, 'technologies', e.target.value)} />
                <button type="button" onClick={() => removeExp(i)} className="text-xs text-gray-600 hover:text-red-600">Remove experience</button>
              </div>
            ))}
          </div>
        )}

        {section === 'education' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-800">Education</p>
              <button type="button" onClick={addEdu} className="text-xs text-blue-700 font-medium">+ Add Education</button>
            </div>
            {form.education.map((edu, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2">
                <input className={inputClass} placeholder="Institution" value={edu.institution} onChange={(e) => updateEdu(i, 'institution', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputClass} placeholder="Degree" value={edu.degree} onChange={(e) => updateEdu(i, 'degree', e.target.value)} />
                  <input className={inputClass} placeholder="Field of Study" value={edu.fieldOfStudy} onChange={(e) => updateEdu(i, 'fieldOfStudy', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className={inputClass} value={edu.startYear} onChange={(e) => updateEdu(i, 'startYear', Number(e.target.value))} />
                  <input type="number" className={inputClass} value={edu.endYear} onChange={(e) => updateEdu(i, 'endYear', Number(e.target.value))} />
                </div>
                <button type="button" onClick={() => removeEdu(i)} className="text-xs text-gray-600 hover:text-red-600">Remove education</button>
              </div>
            ))}
          </div>
        )}

        {section === 'projects' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-800">Projects</p>
              <button type="button" onClick={addProj} className="text-xs text-blue-700 font-medium">+ Add Project</button>
            </div>
            {form.projects.map((proj, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputClass} placeholder="Project Name" value={proj.name} onChange={(e) => updateProj(i, 'name', e.target.value)} />
                  <input className={inputClass} placeholder="Role" value={proj.role} onChange={(e) => updateProj(i, 'role', e.target.value)} />
                </div>
                <textarea rows={2} className={`${inputClass} resize-none`} placeholder="Description" value={proj.description} onChange={(e) => updateProj(i, 'description', e.target.value)} />
                <input className={inputClass} placeholder="Technologies (comma-separated)" value={proj.technologies} onChange={(e) => updateProj(i, 'technologies', e.target.value)} />
                <input className={inputClass} placeholder="Project link" value={proj.link} onChange={(e) => updateProj(i, 'link', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="month" className={inputClass} value={proj.startDate} onChange={(e) => updateProj(i, 'startDate', e.target.value)} />
                  <input type="month" className={inputClass} value={proj.endDate} onChange={(e) => updateProj(i, 'endDate', e.target.value)} />
                </div>
                <button type="button" onClick={() => removeProj(i)} className="text-xs text-gray-600 hover:text-red-600">Remove project</button>
              </div>
            ))}
          </div>
        )}

        {section === 'extras' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-800">Availability</p>
              <div className="grid grid-cols-3 gap-2">
                <select value={form.availabilityStatus} onChange={(e) => set('availabilityStatus', e.target.value as any)} className={inputClass}>
                  <option>Available</option><option>Open to Opportunities</option><option>Not Available</option>
                </select>
                <select value={form.availabilityType} onChange={(e) => set('availabilityType', e.target.value as any)} className={inputClass}>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                </select>
                <input type="date" value={form.availabilityStartDate} onChange={(e) => set('availabilityStartDate', e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-800">Certifications</p>
                <button type="button" onClick={addCert} className="text-xs text-blue-700 font-medium">+ Add Certification</button>
              </div>
              {form.certifications.map((cert, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <input className={inputClass} placeholder="Name" value={cert.name} onChange={(e) => updateCert(i, 'name', e.target.value)} />
                  <input className={inputClass} placeholder="Issuer" value={cert.issuer} onChange={(e) => updateCert(i, 'issuer', e.target.value)} />
                  <input type="month" className={inputClass} value={cert.issueDate} onChange={(e) => updateCert(i, 'issueDate', e.target.value)} />
                  <button type="button" onClick={() => removeCert(i)} className="col-span-3 text-left text-xs text-gray-600 hover:text-red-600">Remove certification</button>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-800">Social Links</p>
              <input className={inputClass} placeholder="LinkedIn URL" value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} />
              <input className={inputClass} placeholder="GitHub URL" value={form.github} onChange={(e) => set('github', e.target.value)} />
              <input className={inputClass} placeholder="Portfolio URL" value={form.portfolio} onChange={(e) => set('portfolio', e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose} className="flex-1" size="sm">
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={saving} className="flex-1" size="sm">
            Create Candidate
          </Button>
        </div>
      </form>
      </Modal>
    </>
  );
}
