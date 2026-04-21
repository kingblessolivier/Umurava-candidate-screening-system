'use client';

import React from 'react';
import Link from 'next/link';
import { Briefcase, ArrowRight, MapPin, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Job } from '@/types';

interface RecentJobsProps {
  jobs: Job[];
  delay?: number;
}

const levelColors: Record<string, string> = {
  Junior: 'text-green-600 bg-green-50',
  'Mid-level': 'text-blue-600 bg-blue-50',
  Senior: 'text-purple-600 bg-purple-50',
  Lead: 'text-amber-600 bg-amber-50',
  Executive: 'text-pink-600 bg-pink-50',
};

export function RecentJobs({ jobs, delay = 0 }: RecentJobsProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description="Create your first job to get started"
          action={{
            label: 'Create Job',
            onClick: () => {},
            href: '/jobs/new',
          }}
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Card.Header className="px-6 pt-6">
        <Card.Title>Recent Jobs</Card.Title>
        <Link
          href="/jobs"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors font-medium"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </Card.Header>
      <Card.Content className="px-6 pb-6">
        <div className="space-y-1">
          {jobs.slice(0, 5).map((job, index) => (
            <Link
              key={job._id}
              href={`/jobs/${job._id}`}
              className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-gray-50 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {job.title}
                  </span>
                  <Badge
                    variant="outline"
                    size="sm"
                    className={levelColors[job.experienceLevel] || 'text-gray-600 bg-gray-50'}
                  >
                    {job.experienceLevel}
                  </Badge>
                  <Badge
                    variant={job.isActive ? 'success' : 'neutral'}
                    size="sm"
                    dot={job.isActive}
                  >
                    {job.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {job.type}
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </Link>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
