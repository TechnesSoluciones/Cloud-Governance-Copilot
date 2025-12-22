import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cloud Governance Copilot',
  description: 'Multi-Cloud Governance and Security Platform',
};

// NOTE: Do NOT force dynamic rendering at root level
// This prevents pages from being built and causes 404 errors
// Instead, use `export const dynamic = 'force-dynamic'` in individual
// pages/layouts that require authentication or dynamic data

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
