'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { cn } from '@/lib/utils';
import { NotificationsProvider } from '@/contexts/NotificationsContext';

const NO_LAYOUT = ['/login', '/signup'];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (NO_LAYOUT.some((p) => pathname === p)) {
    return <>{children}</>;
  }

  return (
    <NotificationsProvider>
      <Sidebar isCollapsed={isSidebarCollapsed} />
      <main
        className={cn(
          'flex-1 min-h-screen flex flex-col transition-all duration-300 ease-out',
          isSidebarCollapsed ? 'ml-[72px]' : 'ml-[240px]'
        )}
      >
        <TopNav
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <div className="py-4 px-6 flex-1">{children}</div>
      </main>
    </NotificationsProvider>
  );
}
