'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { BreadcrumbBar } from './BreadcrumbBar';
import { cn } from '@/lib/utils';
import { NotificationsProvider } from '@/contexts/NotificationsContext';

const NO_LAYOUT = ['/login', '/signup'];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable;
    if (isTyping) return;

    if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (pathname === '/jobs') {
        window.dispatchEvent(new CustomEvent('open-new-job'));
      } else {
        router.push('/jobs?new=1');
      }
    }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const searchInput = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]');
      searchInput?.focus();
    }
    if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      router.push('/screening');
    }
  }, [router]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (NO_LAYOUT.some((p) => pathname === p)) {
    return <>{children}</>;
  }

  return (
    <NotificationsProvider>
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      {isMobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          aria-label="Close sidebar overlay"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      <main
        className={cn(
          'flex-1 min-h-screen flex flex-col pt-[56px] transition-all duration-300 ease-out overflow-x-hidden',
          isSidebarCollapsed ? 'ml-0 lg:ml-[72px]' : 'ml-0 lg:ml-[240px]'
        )}
      >
        <TopNav
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />
        <BreadcrumbBar />
        <div className="py-4 px-4 sm:px-6 flex-1">{children}</div>
      </main>
    </NotificationsProvider>
  );
}
