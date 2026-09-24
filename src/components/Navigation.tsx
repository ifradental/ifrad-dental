'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  FileText, 
  Files, 
  Pill, 
  LayoutTemplate, 
  Calendar, 
  CreditCard, 
  Heading1, 
  Package, 
  Settings, 
  Database, 
  MessageSquare,
  RefreshCw,
  Wifi,
  WifiOff,
  LogOut,
  UserCheck,
  Stethoscope
} from 'lucide-react';
import { syncEngine, type SyncStatus } from '@/lib/syncEngine';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { name: 'Patient Management', href: '/patients', icon: <UserCheck className="w-4 h-4" /> },
  { name: 'Prescription', href: '/', icon: <FileText className="w-4 h-4" /> },
  { name: 'Drug DB', href: '/drugs', icon: <Pill className="w-4 h-4" /> },
  { name: 'Template', href: '/templates', icon: <LayoutTemplate className="w-4 h-4" /> },
  { name: 'Appointment', href: '/appointments', icon: <Calendar className="w-4 h-4" /> },
  { name: 'Payment', href: '/payments', icon: <CreditCard className="w-4 h-4" /> },
  { name: 'Header Edit', href: '/header-edit', icon: <Heading1 className="w-4 h-4" /> },
  { name: 'Material', href: '/materials', icon: <Package className="w-4 h-4" /> },
  { name: 'Setup', href: '/setup', icon: <Settings className="w-4 h-4" /> },
  { name: 'Database', href: '/database', icon: <Database className="w-4 h-4" /> },
  { name: 'SMS', href: '/sms', icon: <MessageSquare className="w-4 h-4" /> },
];

export function Navigation() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  if (!isAuthenticated) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncEngine.triggerSync();
    setIsSyncing(false);
  };

  return (
    <header className="no-print bg-gradient-to-r from-blue-800 via-sky-700 to-blue-900 text-white shadow-md select-none sticky top-0 z-50">
      {/* Top Application Title Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-950/40 border-b border-blue-400/20 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-white text-blue-900 rounded font-bold flex items-center justify-center text-xs shadow">
            🦷
          </div>
          <span className="font-bold tracking-wide text-sky-100">
            Dentist PRO 7.0 (Desktop Edition)
          </span>
          <span className="bg-sky-500/20 text-sky-200 text-[10px] px-2 py-0.5 rounded-full border border-sky-400/30">
            Offline Storage Active
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          {/* User Profile Badge */}
          {user && (
            <div className="flex items-center space-x-1.5 bg-white/10 px-2 py-0.5 rounded border border-white/15">
              {user.role === 'doctor' ? (
                <Stethoscope className="w-3.5 h-3.5 text-yellow-300" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-sky-300" />
              )}
              <span className="font-semibold text-white truncate max-w-[160px]">{user.name}</span>
            </div>
          )}

          {/* Realtime Clock */}
          <span className="font-mono text-sky-200 hidden sm:inline">{currentTime}</span>

          {/* Sync Status Badge */}
          <div className="flex items-center space-x-1.5 bg-black/30 px-2 py-0.5 rounded-md border border-white/10">
            {syncStatus === 'online' ? (
              <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Online (Synced)</span>
              </span>
            ) : syncStatus === 'syncing' || isSyncing ? (
              <span className="flex items-center space-x-1 text-amber-300 animate-pulse font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing ({pendingCount})...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-sky-300 font-medium">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline ({pendingCount} pending)</span>
              </span>
            )}

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Manual Sync with MongoDB Cloud"
              className="ml-1 hover:bg-white/20 p-1 rounded transition text-sky-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              if (confirm('Are you sure you want to log out?')) {
                logout();
              }
            }}
            title="Log Out"
            className="flex items-center space-x-1 bg-red-600/80 hover:bg-red-600 px-2 py-0.5 rounded font-semibold text-white transition text-[11px]"
          >
            <LogOut className="w-3 h-3" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tab Bar */}
      <nav className="flex items-center space-x-0.5 px-2 bg-gradient-to-b from-sky-700 to-sky-800 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = 
            item.href === '/dashboard' 
              ? pathname === '/dashboard' 
              : item.href === '/' 
              ? pathname === '/' 
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold tracking-wide transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? 'bg-sky-950/70 text-white border-yellow-400 shadow-inner font-bold'
                  : 'text-sky-100 hover:bg-sky-800/60 hover:text-white border-transparent'
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
