import type { Metadata } from 'next';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';
import { AuthProvider } from '@/context/AuthContext';
import { AuthAppShell } from '@/components/auth/AuthAppShell';

export const metadata: Metadata = {
  title: 'ইফরা ডেন্টাল সেন্টার - Dental Management System',
  description: 'ইফরা ডেন্টাল সেন্টার - আধুনিক ওয়েব ভিত্তিক ডেন্টাল ম্যানেজমেন্ট ও প্রেসক্রিপশন সফটওয়্যার',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn">
      <body>
        <ClientInit />
        <AuthProvider>
          <AuthAppShell>{children}</AuthAppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
