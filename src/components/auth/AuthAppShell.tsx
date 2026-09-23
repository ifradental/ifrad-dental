'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from './SplashScreen';
import { LoginScreen } from './LoginScreen';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';

export function AuthAppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoadingSplash } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingSplash && isAuthenticated && pathname === '/login') {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoadingSplash, pathname, router]);

  // 1. Show Splash Screen on initial startup
  if (isLoadingSplash) {
    return <SplashScreen />;
  }

  // 2. If not authenticated, show Unified Login Screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // 3. If authenticated and still on /login, return null while redirecting
  if (pathname === '/login') {
    return null;
  }

  // 4. If authenticated, show full Desktop Application with Left Sidebar, Top Bar & Main Content
  return (
    <div className="flex h-screen overflow-hidden bg-[#eaf2fb] text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
