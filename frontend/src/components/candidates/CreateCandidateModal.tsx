'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { createCandidate } from '@/store/candidatesSlice';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCandidateModal({ isOpen, onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { items: jobs } = useSelector((s: RootState) => s.jobs);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    jobId: '',
    phone: '',
    headline: '',
    location: '',
    availabilityType: 'Full-time' as 'Full-time' | 'Part-time' | 'Contract' | 'Freelance',
  });

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleClose = () => {
    setForm({ firstName: '', lastName: '', email: '', jobId: '', phone: '', headline: '', location: '', availabilityType: 'Full-time' });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.jobId) {
      toast.error('First name, last name, email, and job are required');
      return;
    }
    setSaving(true);
    try {
      const result = await dispatch(createCandidate({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        jobId: form.jobId,
        phone: form.phone.trim() || undefined,
        headline: form.headline.trim(),
        location: form.location.trim(),
        skills: [],
        experience: [],
        education: [],
        availability: { status: 'Available', type: form.availabilityType },
        source: 'platform',
      }));
      if (result.meta.requestStatus === 'fulfilled') {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Candidate"
      subtitle="Create a new candidate profile"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
            <Input
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              placeholder="Alice"
              className="text-xs"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
            <Input
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              placeholder="Uwimana"
              className="text-xs"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="alice@example.com"
            className="text-xs"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Job Position <span className="text-red-500">*</span></label>
          <select
            value={form.jobId}
            onChange={(e) => set('jobId', e.target.value)}
            required
            className={inputClass}
          >
            <option value="">— Select a job —</option>
            {jobs.map((j) => (
              <option key={j._id} value={j._id}>{j.title}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Phone</label>
            <Input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+1 555 000 0000"
              className="text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Availability</label>
            <select
              value={form.availabilityType}
              onChange={(e) => set('availabilityType', e.target.value as typeof form.availabilityType)}
              className={inputClass}
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Freelance">Freelance</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Headline</label>
          <Input
            value={form.headline}
            onChange={(e) => set('headline', e.target.value)}
            placeholder="Senior React Developer"
            className="text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Location</label>
          <Input
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="Kigali, Rwanda"
            className="text-xs"
          />
        </div>

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
  );
}
