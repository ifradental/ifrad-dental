'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  FileText, 
  Pill, 
  LayoutTemplate, 
  Calendar, 
  CreditCard, 
  Heading1, 
  Package, 
  Settings, 
  MessageSquare,
  LogOut,
  UserCheck,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Users,
  ClipboardList,
  UserCog,
  Shield
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  allowedRoles?: string[];
}

const allNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { name: 'Patient Management', href: '/patients', icon: <UserCheck className="w-4 h-4" />, allowedRoles: ['admin', 'receptionist', 'cashier'] },
  { name: 'Prescription', href: '/prescription', icon: <FileText className="w-4 h-4" />, allowedRoles: ['admin', 'doctor'] },
  { name: 'Drug DB', href: '/drugs', icon: <Pill className="w-4 h-4" />, allowedRoles: ['admin'] },
  { name: 'Template', href: '/templates', icon: <LayoutTemplate className="w-4 h-4" />, allowedRoles: ['admin'] },
  { name: 'Appointment', href: '/appointments', icon: <Calendar className="w-4 h-4" />, allowedRoles: ['admin', 'doctor', 'receptionist', 'cashier'] },
  { name: 'Payment & Accounts', href: '/payments', icon: <CreditCard className="w-4 h-4" />, allowedRoles: ['admin', 'receptionist', 'cashier'] },
  { name: 'Employee Management', href: '/employees', icon: <Users className="w-4 h-4" />, allowedRoles: ['admin'] },
  { name: 'Material & Stock', href: '/materials', icon: <Package className="w-4 h-4" />, allowedRoles: ['admin', 'staff', 'receptionist', 'cashier'] },
  { name: 'Header Edit', href: '/header-edit', icon: <Heading1 className="w-4 h-4" />, allowedRoles: ['admin'] },
  { name: 'Settings', href: '/settings', icon: <Settings className="w-4 h-4" />, allowedRoles: ['admin', 'doctor'] },
  { name: 'SMS Gateway', href: '/sms', icon: <MessageSquare className="w-4 h-4" />, allowedRoles: ['admin'] },
  { name: 'Marketing Officer', href: '/marketing-officer', icon: <UserCog className="w-4 h-4" />, allowedRoles: ['admin'] },
  { name: 'All Task', href: '/all-tasks', icon: <ClipboardList className="w-4 h-4" /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [clinicLogo, setClinicLogo] = useState<string>('');
  const [clinicName, setClinicName] = useState<string>('ইফরা ডেন্টাল সেন্টার');

  const loadBranding = async () => {
    try {
      const s = await db.settings.get('default_settings');
      if (s) {
        if (s.logoUrl) setClinicLogo(s.logoUrl);
        if (s.clinicName) setClinicName(s.clinicName);
      }
    } catch (e) {
      console.warn('Failed to load branding in sidebar:', e);
    }
  };

  useEffect(() => {
    loadBranding();

    const handleRefresh = () => loadBranding();
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('storage', handleRefresh);

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
      clearInterval(timer);
    };
  }, []);

  const userRole = (user?.role || 'doctor').toLowerCase();
  const isReceptionistOrCashier = userRole.includes('receptionist') || userRole.includes('cashier');
  const isMarketingOrEmployee = userRole.includes('marketing') || userRole.includes('employee') || userRole === 'staff';

  const filteredNavItems = useMemo(() => {
    return allNavItems.filter((item) => {
      // Doctor user sees Dashboard, Appointment, Prescription, Settings, and All Task
      if (userRole === 'doctor') {
        return (
          item.href === '/dashboard' ||
          item.href === '/appointments' ||
          item.href === '/prescription' ||
          item.href === '/settings' ||
          item.href === '/all-tasks'
        );
      }

      if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin') {
        return true;
      }

      // Marketing / Employee role sees Dashboard and All Task only
      if (isMarketingOrEmployee) {
        return item.href === '/dashboard' || item.href === '/all-tasks';
      }

      if (!item.allowedRoles) return true;
      if (isReceptionistOrCashier) {
        return item.allowedRoles.includes('receptionist') || item.allowedRoles.includes('cashier');
      }
      return item.allowedRoles.includes(userRole);
    });
  }, [userRole, isReceptionistOrCashier, isMarketingOrEmployee]);

  if (!isAuthenticated) return null;

  const getRoleLabel = (role: string) => {
    const r = (role || '').toLowerCase();
    if (r === 'admin' || r === 'super_admin') return 'অ্যাডমিনিস্ট্রেটর';
    if (r === 'doctor') return 'ডাক্তার';
    if (r.includes('receptionist') || r.includes('cashier')) return 'রিসেপশনিস্ট';
    if (r === 'staff') return 'ক্লিনিক স্টাফ';
    if (r.includes('marketing')) return 'মার্কেটিং অফিসার';
    return role;
  };

  return (
    <aside
      className={`no-print select-none bg-slate-950 text-slate-200 flex flex-col justify-between transition-all duration-300 z-50 border-r border-slate-800/80 shadow-2xl h-screen sticky top-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* 1. TOP BRANDING & LOGO */}
      <div>
        <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center p-1 shadow-sm flex-shrink-0 border border-slate-800 overflow-hidden">
              {clinicLogo ? (
                <img
                  src={clinicLogo}
                  alt={clinicName}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center text-base">
                  🦷
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span
                  className="font-bold text-xs tracking-tight text-white font-sans truncate max-w-[145px]"
                  title={clinicName}
                >
                  {clinicName}
                </span>
                <span className="text-[10px] text-slate-400 truncate">ডেন্টাল ম্যানেজমেন্ট</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition cursor-pointer"
            title={isCollapsed ? 'সাইডবার প্রসারিত করুন' : 'সাইডবার সংকুচিত করুন'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. LOGGED IN USER PROFILE BANNER */}
        {!isCollapsed && user && (
          <div className="p-2.5 mx-2.5 my-2 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center space-x-2.5 shadow-xs">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 flex-shrink-0 overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt="User Avatar" className="w-full h-full object-cover" />
              ) : userRole === 'doctor' ? (
                <Stethoscope className="w-4 h-4" />
              ) : userRole === 'admin' ? (
                <Shield className="w-4 h-4 text-amber-400" />
              ) : (
                <UserCheck className="w-4 h-4 text-cyan-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{user.name}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-medium text-cyan-300 border border-slate-700/60">
                  {getRoleLabel(userRole)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. VERTICAL NAVIGATION MENU */}
        <nav className="p-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-270px)]">
          {filteredNavItems.map((item) => {
            const isSettingsMatch =
              (item.href === '/settings' || item.href === '/setup') &&
              (pathname === '/settings' || pathname === '/setup');
            const isActive =
              isSettingsMatch ||
              (item.href === '/dashboard'
                ? pathname === '/dashboard' || pathname === '/'
                : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href !== '/dashboard'));

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium tracking-wide transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-900/20'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
              >
                <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 4. BOTTOM SYSTEM STATUS & LOGOUT */}
      <div className="p-2.5 border-t border-slate-800/80 bg-slate-950 space-y-2">
        {/* System Online Status */}
        {!isCollapsed ? (
          <div className="px-2.5 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-medium">সিস্টেম অনলাইন</span>
            </div>
            <span className="font-mono text-slate-400 text-[10px]">{currentTime}</span>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block animate-pulse" title="সিস্টেম অনলাইন"></span>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={() => {
            if (confirm('আপনি কি নিশ্চিত যে আপনি লগআউট করতে চান?')) {
              logout();
            }
          }}
          className={`w-full py-2 px-3 bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-900/40 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2 cursor-pointer ${
            isCollapsed ? 'p-2' : ''
          }`}
          title="লগআউট"
        >
          <LogOut className="w-3.5 h-3.5" />
          {!isCollapsed && <span>লগআউট</span>}
        </button>
      </div>
    </aside>
  );
}
