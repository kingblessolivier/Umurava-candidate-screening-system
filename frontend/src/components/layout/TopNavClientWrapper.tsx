'use client';

import { usePathname } from 'next/navigation';
import { TopNav } from './TopNav';

const NO_TOPNAV = ['/login', '/signup'];

export function TopNavClientWrapper() {
  const pathname = usePathname();

  if (NO_TOPNAV.some((p) => pathname === p)) {
    return null;
  }

  return <TopNav />;
}
