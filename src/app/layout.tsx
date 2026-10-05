import type { Metadata } from 'next';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';
import { AuthProvider } from '@/context/AuthContext';
import { AuthAppShell } from '@/components/auth/AuthAppShell';

export const metadata: Metadata = {
  title: 'ইফরা ডেন্টাল সেন্টার - Dental Management System',
  description: 'ইফরা ডেন্টাল সেন্টার - আধুনিক ওয়েব ভিত্তিক ডেন্টাল ম্যানেজমেন্ট ও প্রেসক্রিপশন সফটওয়্যার',
  icons: {
    icon: [
      { url: '/favicon.ico?v=3', sizes: 'any' },
      { url: '/logo.png?v=3', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=3',
    apple: '/logo.png?v=3',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico?v=3" sizes="any" />
        <link rel="icon" href="/logo.png?v=3" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png?v=3" />
      </head>
      <body suppressHydrationWarning>
        <ClientInit />
        <AuthProvider>
          <AuthAppShell>{children}</AuthAppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
