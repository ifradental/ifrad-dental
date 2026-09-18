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
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  HardDrive
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
  { name: 'Prescription', href: '/prescription', icon: <FileText className="w-4 h-4" /> },
  { name: 'View All Prescription', href: '/prescriptions', icon: <Files className="w-4 h-4" /> },
  { name: 'Drug DB', href: '/drugs', icon: <Pill className="w-4 h-4" /> },
  { name: 'Template', href: '/templates', icon: <LayoutTemplate className="w-4 h-4" /> },
  { name: 'Appointment', href: '/appointments', icon: <Calendar className="w-4 h-4" /> },
  { name: 'Payment & Accounts', href: '/payments', icon: <CreditCard className="w-4 h-4" /> },
  { name: 'Header Edit', href: '/header-edit', icon: <Heading1 className="w-4 h-4" /> },
  { name: 'Material & Stock', href: '/materials', icon: <Package className="w-4 h-4" /> },
  { name: 'Setup', href: '/setup', icon: <Settings className="w-4 h-4" /> },
  { name: 'Database & Sync', href: '/database', icon: <Database className="w-4 h-4" /> },
  { name: 'SMS Gateway', href: '/sms', icon: <MessageSquare className="w-4 h-4" /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
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
    <aside
      className={`no-print select-none bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 text-white flex flex-col justify-between transition-all duration-300 z-50 border-r border-sky-900/40 shadow-xl h-screen sticky top-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* 1. TOP BRANDING & LOGO */}
      <div>
        <div className="p-3.5 border-b border-sky-800/30 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-9 h-9 bg-gradient-to-tr from-sky-400 to-blue-600 rounded-xl flex items-center justify-center text-xl shadow-md flex-shrink-0 border border-sky-300/40">
              🦷
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-sm tracking-wide text-white font-sans">
                    Dentist <span className="text-sky-400">PRO</span>
                  </span>
                  <span className="bg-yellow-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded">
                    7.0
                  </span>
                </div>
                <span className="text-[10px] text-sky-200/70 truncate">Desktop Edition</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-sky-300 hover:text-white hover:bg-white/10 rounded transition"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. LOGGED IN DOCTOR PROFILE BANNER */}
        {!isCollapsed && user && (
          <div className="p-3 mx-2 my-2 bg-blue-900/30 rounded-lg border border-sky-500/20 flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-700 border border-sky-400 flex items-center justify-center text-yellow-300 flex-shrink-0">
              {user.role === 'doctor' ? (
                <Stethoscope className="w-4 h-4" />
              ) : (
                <UserCheck className="w-4 h-4 text-sky-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{user.name}</div>
              <div className="text-[10px] text-sky-300 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Offline Authorized</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. VERTICAL NAVIGATION MENU */}
        <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard' || pathname === '/'
                : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href !== '/dashboard');

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md font-bold shadow-sky-900/40 border-l-4 border-yellow-400'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
              >
                <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-sky-300'}`}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 4. BOTTOM STATUS, CLOUD SYNC & LOGOUT */}
      <div className="p-2.5 border-t border-sky-800/30 bg-slate-950/60 space-y-2">
        {/* Sync Status Badge */}
        {!isCollapsed ? (
          <div className="p-2 bg-slate-900/80 rounded-lg border border-white/10 text-xs">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-1.5">
                {syncStatus === 'online' ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                ) : syncStatus === 'syncing' || isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span className="font-bold text-[11px] text-white">
                  {syncStatus === 'online'
                    ? 'Cloud Synced'
                    : syncStatus === 'syncing' || isSyncing
                    ? 'Syncing...'
                    : 'Offline Mode'}
                </span>
              </div>

              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                title="Sync with MongoDB"
                className="p-1 hover:bg-white/20 rounded transition text-sky-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="text-[10px] text-slate-400 flex justify-between font-mono">
              <span>{pendingCount > 0 ? `${pendingCount} queue` : 'PC DB Ready'}</span>
              <span>{currentTime}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Sync with Cloud"
              className="p-2 bg-slate-900 rounded-lg border border-white/10 text-sky-300"
            >
              {syncStatus === 'online' ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-sky-400" />
              )}
            </button>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={() => {
            if (confirm('Are you sure you want to log out?')) {
              logout();
            }
          }}
          className={`w-full py-1.5 px-3 bg-red-700/80 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
            isCollapsed ? 'p-2' : ''
          }`}
          title="Log Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
