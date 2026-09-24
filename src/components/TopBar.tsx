'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Bell, 
  User, 
  Plus, 
  Stethoscope, 
  ShieldCheck, 
  ChevronDown, 
  LogOut, 
  Settings, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  FileText,
  Clock,
  ExternalLink,
  X
} from 'lucide-react';
import { db, type Patient, type MaterialItem, type Appointment } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { syncEngine, type SyncStatus } from '@/lib/syncEngine';

export function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<{ patients: Patient[]; drugs: any[] }>({
    patients: [],
    drugs: [],
  });
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);

  // Notification State
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<
    { id: string; type: 'stock' | 'appointment' | 'sync'; title: string; message: string; time: string; link?: string }[]
  >([]);

  // Profile Menu State
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  // Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = syncEngine.subscribe((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });

    loadNotifications();

    // Click outside handler to close dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      unsub();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadNotifications = async () => {
    const notifs: typeof notifications = [];

    // 1. Low stock materials alert
    const materials = await db.materials.toArray();
    const low = materials.filter((m) => (m.currentStock || 0) <= m.lowStockLimit);
    if (low.length > 0) {
      notifs.push({
        id: 'low_stock',
        type: 'stock',
        title: 'লো-স্টক সতর্কতা',
        message: `${low.length} টি ডেন্টাল ম্যাটেরিয়ালের স্টক শেষ পর্যায়ে আছে (যেমন: ${low[0].name})।`,
        time: 'Just now',
        link: '/materials',
      });
    }

    // 2. Today's appointments
    const todayStr = new Date().toISOString().split('T')[0];
    const todayApnts = await db.appointments.where('date').equals(todayStr).toArray();
    if (todayApnts.length > 0) {
      notifs.push({
        id: 'today_apnts',
        type: 'appointment',
        title: 'আজকের সিরিয়াল তালিকা',
        message: `আজকের জন্য মোট ${todayApnts.length} জন রোগীর অ্যাপয়েন্টমেন্ট শিডিউল করা রয়েছে।`,
        time: 'Today',
        link: '/appointments',
      });
    }

    // 3. Offline database status
    notifs.push({
      id: 'db_ready',
      type: 'sync',
      title: 'লোকাল ডাটাবেজ সক্রিয়',
      message: 'সফটওয়্যারটি সম্পূর্ণ অফলাইনে কাজ করার জন্য প্রস্তুত।',
      time: 'Active',
      link: '/database',
    });

    setNotifications(notifs);
  };

  // Live Search handler
  useEffect(() => {
    async function executeSearch() {
      if (searchQuery.trim().length < 2) {
        setSearchResults({ patients: [], drugs: [] });
        setShowSearchDropdown(false);
        return;
      }

      setIsSearching(true);
      const query = searchQuery.toLowerCase();

      // Search patients by Name, Reg No, or Mobile
      const allPatients = await db.patients.toArray();
      const matchedPatients = allPatients
        .filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.regNo.toString().includes(query) ||
            p.mobile.includes(query)
        )
        .slice(0, 5);

      // Search drugs
      const allDrugs = await db.drugs.toArray();
      const matchedDrugs = allDrugs
        .filter((d) => d.name.toLowerCase().includes(query) || d.generic.toLowerCase().includes(query))
        .slice(0, 4);

      setSearchResults({ patients: matchedPatients, drugs: matchedDrugs });
      setShowSearchDropdown(true);
      setIsSearching(false);
    }

    executeSearch();
  }, [searchQuery]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncEngine.triggerSync();
    setIsSyncing(false);
  };

  return (
    <header className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm sticky top-0 z-40 px-4 py-2.5 flex items-center justify-between gap-3 select-none">
      {/* 1. GLOBAL SEARCH BAR */}
      <div ref={searchRef} className="relative flex-1 max-w-xl">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.length >= 2) setShowSearchDropdown(true);
            }}
            placeholder="রোগীর নাম, Reg No (#4198), মোবাইল অথবা ঔষধের নাম খুঁজুন..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearchDropdown(false);
              }}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {/* Patients Section */}
            {searchResults.patients.length > 0 && (
              <div className="p-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                  <span>রোগীর রেকর্ড (Patients)</span>
                  <span>{searchResults.patients.length} results</span>
                </div>
                {searchResults.patients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setShowSearchDropdown(false);
                      setSearchQuery('');
                      router.push(`/patients?regNo=${p.regNo}`);
                    }}
                    className="p-2 hover:bg-sky-50 rounded-lg cursor-pointer flex items-center justify-between text-xs transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Mobile: {p.mobile || 'N/A'} • {p.address}
                        </div>
                      </div>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Reg #{p.regNo}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Drugs Section */}
            {searchResults.drugs.length > 0 && (
              <div className="p-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                  <span>ড্রাগ ডাটাবেজ (Medicines)</span>
                  <span>{searchResults.drugs.length} results</span>
                </div>
                {searchResults.drugs.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => {
                      setShowSearchDropdown(false);
                      setSearchQuery('');
                      router.push(`/drugs`);
                    }}
                    className="p-2 hover:bg-sky-50 rounded-lg cursor-pointer flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <div className="font-bold text-blue-900">{d.prescriptionName}</div>
                      <div className="text-[11px] text-slate-500">
                        Generic: {d.generic} • {d.company}
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                      {d.form}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {searchResults.patients.length === 0 && searchResults.drugs.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">
                "{searchQuery}" দিয়ে কোনো রোগী বা ঔষধ খুঁজে পাওয়া যায়নি।
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. RIGHT SIDE UTILITIES & ACTIONS */}
      <div className="flex items-center space-x-3">
        {/* Quick New Prescription Action Button */}
        <Link
          href="/prescription"
          className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>নতুন প্রেসক্রিপশন</span>
        </Link>

        {/* Sync Status Mini Indicator */}
        <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-medium">
          {syncStatus === 'online' ? (
            <span className="flex items-center space-x-1 text-emerald-600">
              <Wifi className="w-3.5 h-3.5" />
              <span className="text-[11px]">Synced</span>
            </span>
          ) : syncStatus === 'syncing' || isSyncing ? (
            <span className="flex items-center space-x-1 text-amber-600 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="text-[11px]">Syncing...</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-slate-600">
              <WifiOff className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px]">Offline ({pendingCount})</span>
            </span>
          )}

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            title="Sync with MongoDB"
            className="p-0.5 hover:bg-slate-200 rounded text-slate-600 transition"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 3. NOTIFICATIONS BELL POPOVER */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="p-3 bg-gradient-to-r from-blue-700 to-sky-600 text-white font-bold flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Bell className="w-4 h-4" />
                  <span>নোটিফিকেশন ও অ্যালার্ট</span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-normal">
                  {notifications.length} New
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link || '#'}
                    onClick={() => setShowNotifications(false)}
                    className="p-3 hover:bg-sky-50 flex items-start space-x-2.5 transition block"
                  >
                    <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg mt-0.5 flex-shrink-0">
                      {n.type === 'stock' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      ) : n.type === 'appointment' ? (
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-xs flex justify-between">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="p-2 bg-slate-50 text-center border-t border-slate-100">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-blue-600 font-semibold hover:underline"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. PROFILE AVATAR & DROPDOWN MENU */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2 p-1.5 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-700 to-sky-500 text-white font-bold flex items-center justify-center text-xs shadow-sm overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name ? user.name.charAt(0) : 'D'
              )}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-none">
                {user?.name || (user?.role === 'admin' ? 'Clinic Administrator' : 'User')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 capitalize">
                {user?.role || 'Doctor'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 text-xs py-1.5 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <div className="font-bold text-slate-900">
                  {user?.name || (user?.role === 'admin' ? 'Clinic Administrator' : 'User')}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">Role: {user?.role || 'Doctor'}</div>
                <div className="mt-1 flex items-center space-x-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded w-fit">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Offline Ready</span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center space-x-2 px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium transition"
                >
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>My Profile & Settings</span>
                </Link>

                <Link
                  href="/header-edit"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center space-x-2 px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium transition"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                  <span>Doctor Pad & Degrees</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center space-x-2 px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium transition"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Print & App Settings</span>
                </Link>

                <Link
                  href="/database"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center space-x-2 px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cloud MongoDB Sync</span>
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (confirm('Are you sure you want to log out?')) {
                      logout();
                    }
                  }}
                  className="w-full flex items-center space-x-2 px-3.5 py-2 text-red-600 hover:bg-red-50 font-semibold transition text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

