import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import Script from 'next/script';

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
      <head>
        {/* Material Symbols Icons - Design System V2 */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
