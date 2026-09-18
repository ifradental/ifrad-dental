import type { Metadata } from 'next';
import './globals.css';
import { ClientInit } from '@/components/ClientInit';
import { AuthProvider } from '@/context/AuthContext';
import { AuthAppShell } from '@/components/auth/AuthAppShell';

export const metadata: Metadata = {
  title: 'Dentist PRO 7.0 - Dental Management System',
  description: 'Modern Offline-First Dental Management & Prescription Software (Desktop Edition)',
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
