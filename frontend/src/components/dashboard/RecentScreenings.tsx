'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, ArrowRight, Users, Clock, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ScreeningResult } from '@/types';

interface RecentScreeningsProps {
  screenings: ScreeningResult[];
  delay?: number;
}

export function RecentScreenings({ screenings, delay = 0 }: RecentScreeningsProps) {
  if (!screenings || screenings.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Zap}
          title="No screenings yet"
          description="Run your first screening to evaluate candidates"
          action={{
            label: 'Run Screening',
            onClick: () => {},
            href: '/screening',
          }}
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Card.Header className="px-6 pt-6">
        <Card.Title>Recent Screenings</Card.Title>
        <Link
          href="/results"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors font-medium"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </Card.Header>
      <Card.Content className="px-6 pb-6">
        <div className="space-y-1">
          {screenings.slice(0, 5).map((screening, index) => (
            <Link
              key={screening._id || index}
              href={screening._id ? `/results/${screening._id}` : '/results'}
              className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-gray-50 group"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors block truncate">
                  {screening.jobTitle}
                </span>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {screening.totalApplicants} screened
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {screening.shortlistSize} shortlisted
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {screening.processingTimeMs
                    ? `${(screening.processingTimeMs / 1000).toFixed(1)}s`
                    : '—'}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
