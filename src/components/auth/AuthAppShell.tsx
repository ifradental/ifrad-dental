'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from './SplashScreen';
import { LoginScreen } from './LoginScreen';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';

export function AuthAppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoadingSplash } = useAuth();

  // 1. Show Splash Screen on initial startup
  if (isLoadingSplash) {
    return <SplashScreen />;
  }

  // 2. If not authenticated, show Doctor/Staff Login Screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // 3. If authenticated, show full Desktop Application with Left Sidebar, Top Bar & Main Content
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
