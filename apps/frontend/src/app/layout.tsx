import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Cloud Governance Copilot - CloudNexus',
  description: 'Multi-Cloud Governance and Security Platform',
  icons: {
    icon: '/favicon.svg',
  },
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
        {children}
      </body>
    </html>
  );
}
