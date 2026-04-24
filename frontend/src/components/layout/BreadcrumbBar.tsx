'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ChevronRight } from 'lucide-react';

const SEGMENT_LABELS: Record<string, string> = {
  jobs: 'Jobs',
  candidates: 'Candidates',
  screening: 'Screening',
  results: 'Evaluation Results',
  profile: 'My Profile',
  settings: 'Settings',
  analytics: 'Analytics',
};

const PARENT_SINGULAR: Record<string, string> = {
  jobs: 'Job',
  candidates: 'Candidate',
  results: 'Result',
  screening: 'Screening Run',
};

function isObjectId(segment: string): boolean {
  return /^[a-f0-9]{24}$/i.test(segment) || /^[0-9a-f-]{36}$/i.test(segment);
}

interface Crumb {
  label: string;
  href: string;
  isLast: boolean;
}

export function BreadcrumbBar() {
  const pathname = usePathname();

  if (pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);

  const crumbs: Crumb[] = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const isLast = i === segments.length - 1;
    let label: string;

    if (isObjectId(seg)) {
      const parentSeg = segments[i - 1];
      label = PARENT_SINGULAR[parentSeg] ?? 'Detail';
    } else {
      label = SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
    }

    return { label, href, isLast };
  });

  return (
    <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-1 text-[11px] select-none">
      <Link
        href="/"
        className="flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors"
      >
        <Home className="w-3 h-3" />
        <span>Home</span>
      </Link>

      {crumbs.map((crumb) => (
        <React.Fragment key={crumb.href}>
          <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
          {crumb.isLast ? (
            <span className="font-semibold text-gray-700">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
