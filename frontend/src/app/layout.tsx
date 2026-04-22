import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { LayoutWrapper } from '@/components/layout/LayoutWrapper';

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
              <LayoutWrapper>{children}</LayoutWrapper>
            </div>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
