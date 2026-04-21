import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { SidebarClientWrapper } from '@/components/layout/SidebarClientWrapper';
import { TopNavClientWrapper } from '@/components/layout/TopNavClientWrapper';

export const metadata: Metadata = {
  title: 'TalentAI — Intelligent Hiring Platform',
  description:
    'Streamline your hiring process with intelligent candidate screening and ranking.',
  authors: [{ name: 'TalentAI' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <AuthGuard>
            <div className="flex min-h-screen bg-white">
              <SidebarClientWrapper />
              <main className="flex-1 min-h-screen flex flex-col">
                <TopNavClientWrapper />
                <div className="py-4 px-6 flex-1">{children}</div>
              </main>
            </div>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
