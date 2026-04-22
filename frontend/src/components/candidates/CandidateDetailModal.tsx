'use client';

import React, { useState } from 'react';
import { Candidate, Skill, WorkExperience, Education } from '@/types';
import {
  X,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  FileText,
  GraduationCap,
  Trophy,
  ExternalLink,
  Edit2,
  Save,
  X as XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

const SKILL_LEVEL_VARIANTS: Record<string, 'success' | 'primary' | 'warning' | 'neutral'> = {
  Expert: 'success',
  Advanced: 'primary',
  Intermediate: 'warning',
  Beginner: 'neutral',
};

interface CandidateDetailModalProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Candidate>) => Promise<any>;
  isLoading?: boolean;
}

export function CandidateDetailModal({
  candidate,
  isOpen,
  onClose,
  onUpdate,
  isLoading,
}: CandidateDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState<Partial<Candidate>>(candidate || {});

  React.useEffect(() => {
    if (candidate) {
      setFormData(candidate);
      setIsEditing(false);
    }
  }, [candidate]);

  if (!isOpen || !candidate) return null;

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const result = await onUpdate(candidate._id, formData);
      if (result.meta?.requestStatus === 'fulfilled') {
        toast.success('Candidate updated successfully');
        setIsEditing(false);
      } else {
        toast.error('Failed to update candidate');
      }
    } catch (error) {
      toast.error('Error updating candidate');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${formData.firstName} ${formData.lastName}`}
      subtitle={formData.headline || ''}
      size="2xl"
      headerAccent="violet"
      showCloseButton={true}
      className="p-0"
      panelClassName="bg-white"
    >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-violet-50 via-white to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-violet-500/20">
              {formData.firstName?.[0]}{formData.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {formData.firstName} {formData.lastName}
              </h2>
              {formData.headline && (
                <p className="text-xs text-gray-500">{formData.headline}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <Button
                size="sm"
                variant="primary"
                isLoading={isUpdating}
                onClick={handleSave}
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            )}
            <button
              onClick={() => (isEditing ? setIsEditing(false) : onClose())}
              className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600"
            >
              {isEditing ? <XIcon className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit2 className="w-4 h-4" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                {isEditing ? (
                  <Input
                    value={formData.firstName || ''}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                  />
                ) : (
                  <p className="text-gray-900">{formData.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                {isEditing ? (
                  <Input
                    value={formData.lastName || ''}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                  />
                ) : (
                  <p className="text-gray-900">{formData.lastName}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{formData.email}</p>
                </div>
              </div>

              {formData.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{formData.phone}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Headline
                </label>
                {isEditing ? (
                  <Input
                    value={formData.headline || ''}
                    onChange={(e) => handleInputChange('headline', e.target.value)}
                  />
                ) : (
                  <p className="text-gray-900">{formData.headline}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                {isEditing ? (
                  <Input
                    value={formData.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                  />
                ) : (
                  <div className="flex items-center gap-1 text-gray-900">
                    <MapPin className="w-4 h-4" />
                    {formData.location}
                  </div>
                )}
              </div>
            </div>

            {formData.bio && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                {isEditing ? (
                  <TextArea
                    value={formData.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-700 text-sm">{formData.bio}</p>
                )}
              </div>
            )}
          </section>

          {/* Availability */}
          {formData.availability && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Availability</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  {isEditing ? (
                    <Select
                      value={formData.availability?.status || 'Available'}
                      onChange={(e) =>
                        handleInputChange('availability', {
                          ...formData.availability,
                          status: e.target.value as any,
                        })
                      }
                      options={[
                        { value: 'Available', label: 'Available' },
                        { value: 'Open to Opportunities', label: 'Open to Opportunities' },
                        { value: 'Not Available', label: 'Not Available' },
                      ]}
                    />
                  ) : (
                    <Badge variant="primary">{formData.availability.status}</Badge>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  {isEditing ? (
                    <Select
                      value={formData.availability?.type || 'Full-time'}
                      onChange={(e) =>
                        handleInputChange('availability', {
                          ...formData.availability,
                          type: e.target.value as any,
                        })
                      }
                      options={[
                        { value: 'Full-time', label: 'Full-time' },
                        { value: 'Part-time', label: 'Part-time' },
                        { value: 'Contract', label: 'Contract' },
                        { value: 'Freelance', label: 'Freelance' },
                      ]}
                    />
                  ) : (
                    <Badge variant="warning">{formData.availability.type}</Badge>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Skills */}
          {formData.skills && formData.skills.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <Badge
                    key={skill.name}
                    variant={SKILL_LEVEL_VARIANTS[skill.level]}
                    size="lg"
                  >
                    {skill.name}
                    <span className="ml-2 text-xs opacity-75">
                      {skill.yearsOfExperience}y • {skill.level}
                    </span>
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Experience */}
          {formData.experience && formData.experience.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Work Experience</h3>
              </div>
              <div className="space-y-3">
                {formData.experience.map((exp, index) => (
                  <Card key={index} className="p-4 bg-gray-50">
                    <p className="font-semibold text-gray-900">{exp.role}</p>
                    <p className="text-sm text-gray-600">{exp.company}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {exp.startDate} - {exp.endDate || 'Present'}
                    </div>
                    {exp.description && (
                      <p className="text-sm text-gray-700 mt-2">{exp.description}</p>
                    )}
                    {exp.technologies && exp.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {exp.technologies.map((tech) => (
                          <Badge key={tech} variant="neutral" size="sm">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {formData.education && formData.education.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Education</h3>
              </div>
              <div className="space-y-3">
                {formData.education.map((edu, index) => (
                  <Card key={index} className="p-4 bg-gray-50">
                    <p className="font-semibold text-gray-900">{edu.degree}</p>
                    <p className="text-sm text-gray-600">{edu.institution}</p>
                    {edu.fieldOfStudy && (
                      <p className="text-sm text-gray-600">Field: {edu.fieldOfStudy}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {edu.startYear && (
                        <span>
                          {edu.startYear} - {edu.endYear || 'Present'}
                        </span>
                      )}
                      {edu.gpa && <span>GPA: {edu.gpa}</span>}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Certifications */}
          {formData.certifications && formData.certifications.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Certifications</h3>
              </div>
              <div className="space-y-2">
                {formData.certifications.map((cert, index) => (
                  <Card key={index} className="p-3 bg-gray-50">
                    <p className="font-medium text-gray-900">{cert.name}</p>
                    {cert.issuer && (
                      <p className="text-sm text-gray-600">from {cert.issuer}</p>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Social Links */}
          {formData.socialLinks && Object.values(formData.socialLinks).some(Boolean) && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Links</h3>
              <div className="flex flex-wrap gap-3">
                {formData.socialLinks.linkedin && (
                  <a
                    href={formData.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    LinkedIn
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {formData.socialLinks.github && (
                  <a
                    href={formData.socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  >
                    GitHub
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {formData.socialLinks.portfolio && (
                  <a
                    href={formData.socialLinks.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
                  >
                    Portfolio
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Metadata */}
          <section className="border-t border-gray-100 pt-4">
            <div className="text-sm text-gray-500 space-y-1">
              <p>Source: {formData.source || 'platform'}</p>
              {formData.createdAt && (
                <p>Added: {new Date(formData.createdAt).toLocaleDateString()}</p>
              )}
            </div>
          </section>
        </div>
    </Modal>
  );
}
