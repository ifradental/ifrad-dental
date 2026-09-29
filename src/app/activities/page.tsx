'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  Search,
  Filter,
  Calendar,
  User,
  Users,
  Clock,
  Download,
  RefreshCw,
  Trash2,
  Stethoscope,
  UserCheck,
  CreditCard,
  FileText,
  Package,
  ShieldCheck,
  Lock,
  ChevronRight,
  Eye,
  X,
  Sparkles,
  ArrowUpRight,
  Layers,
  FileBadge,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import { db, type ActivityLog, type Employee } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { useAuth } from '@/context/AuthContext';

export default function ActivitiesPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('All');
  const [selectedUser, setSelectedUser] = useState<string>('All');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7days' | 'month' | 'all' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  // Modal State
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allLogs, allEmployees] = await Promise.all([
        db.activityLogs.toArray(),
        db.employees.toArray(),
      ]);

      // Sort logs newest first
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(allLogs);
      setEmployees(allEmployees);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Date helpers
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, []);

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }, []);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Module filter
      if (selectedModule !== 'All' && log.module !== selectedModule) {
        return false;
      }

      // 2. User filter
      if (selectedUser !== 'All' && log.userName !== selectedUser && log.userId !== selectedUser) {
        return false;
      }

      // 3. Role filter
      if (selectedRole !== 'All') {
        const logRole = (log.userRole || '').toLowerCase();
        const sel = selectedRole.toLowerCase();
        if (sel === 'receptionist / cashier') {
          if (!logRole.includes('receptionist') && !logRole.includes('cashier')) return false;
        } else if (!logRole.includes(sel)) {
          return false;
        }
      }

      // 4. Date filter
      const logDate = log.timestamp ? log.timestamp.split('T')[0] : '';
      if (dateFilter === 'today' && logDate !== todayStr) return false;
      if (dateFilter === 'yesterday' && logDate !== yesterdayStr) return false;
      if (dateFilter === '7days' && log.timestamp < sevenDaysAgo) return false;
      if (dateFilter === 'month' && log.timestamp < thirtyDaysAgo) return false;
      if (dateFilter === 'custom' && logDate !== customDate) return false;

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchUser = log.userName?.toLowerCase().includes(q);
        const matchRole = log.userRole?.toLowerCase().includes(q);
        const matchAction = log.action?.toLowerCase().includes(q);
        const matchModule = log.module?.toLowerCase().includes(q);
        const matchDesc = log.description?.toLowerCase().includes(q);
        const matchMeta = JSON.stringify(log.metadata || {}).toLowerCase().includes(q);

        if (!matchUser && !matchRole && !matchAction && !matchModule && !matchDesc && !matchMeta) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedModule, selectedUser, selectedRole, dateFilter, customDate, searchQuery, todayStr, yesterdayStr, sevenDaysAgo, thirtyDaysAgo]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = logs.length;
    const todayLogs = logs.filter((l) => l.timestamp && l.timestamp.startsWith(todayStr));
    const todayCount = todayLogs.length;

    // Unique active users today
    const uniqueUsersToday = new Set(todayLogs.map((l) => l.userName)).size;

    // Clinical vs Financial
    const clinicalCount = logs.filter((l) => l.module === 'Prescription' || l.module === 'Patient' || l.module === 'Appointment').length;
    const financialCount = logs.filter((l) => l.module === 'Payment').length;
    const materialCount = logs.filter((l) => l.module === 'Material').length;

    return {
      total,
      todayCount,
      uniqueUsersToday,
      clinicalCount,
      financialCount,
      materialCount,
    };
  }, [logs, todayStr]);

  // Clear Logs (Admin only)
  const handleClearLogs = async () => {
    if (user?.role !== 'admin') {
      alert('শুধুমাত্র অ্যাডমিন অডিট লগ মুছে ফেলতে পারেন!');
      return;
    }
    if (confirm('আপনি কি নিশ্চিত যে সকল একটিভিটি লগ মুছে ফেলতে চান? এটি অপরিবর্তনীয়!')) {
      await db.activityLogs.clear();
      await loadData();
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('এক্সপোর্ট করার জন্য কোনো লগ নেই!');
      return;
    }

    const headers = ['Time', 'User Name', 'Role', 'Module', 'Action', 'Description'];
    const rows = filteredLogs.map((l) => [
      new Date(l.timestamp).toLocaleString('bn-BD'),
      `"${l.userName || ''}"`,
      `"${l.userRole || ''}"`,
      `"${l.module || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Activity_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper styles for Modules
  const getModuleBadge = (module: ActivityLog['module']) => {
    switch (module) {
      case 'Auth':
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: <Lock className="w-3.5 h-3.5 text-slate-600" />,
          label: 'Auth & Login',
        };
      case 'Prescription':
        return {
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          icon: <FileText className="w-3.5 h-3.5 text-indigo-600" />,
          label: 'Prescription',
        };
      case 'Payment':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Payment & Cash',
        };
      case 'Appointment':
        return {
          bg: 'bg-sky-100 text-sky-800 border-sky-300',
          icon: <CalendarCheck className="w-3.5 h-3.5 text-sky-600" />,
          label: 'Appointment',
        };
      case 'Patient':
        return {
          bg: 'bg-purple-100 text-purple-800 border-purple-300',
          icon: <User className="w-3.5 h-3.5 text-purple-600" />,
          label: 'Patient Record',
        };
      case 'Material':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: <Package className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Material & Stock',
        };
      case 'Employee':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <Users className="w-3.5 h-3.5 text-blue-600" />,
          label: 'Employee Access',
        };
      default:
        return {
          bg: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: <Activity className="w-3.5 h-3.5 text-gray-600" />,
          label: module,
        };
    }
  };

  // Helper styles for Roles
  const getRoleStyle = (role: string) => {
    const r = (role || '').toLowerCase();
    if (r.includes('admin')) {
      return {
        bg: 'bg-red-50 text-red-800 border-red-200',
        avatar: 'bg-red-600 text-white',
        icon: <ShieldCheck className="w-3 h-3 text-red-600" />,
      };
    }
    if (r.includes('doctor')) {
      return {
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        avatar: 'bg-indigo-600 text-white',
        icon: <Stethoscope className="w-3 h-3 text-indigo-600" />,
      };
    }
    if (r.includes('receptionist') || r.includes('cashier')) {
      return {
        bg: 'bg-purple-50 text-purple-800 border-purple-200',
        avatar: 'bg-purple-600 text-white',
        icon: <UserCheck className="w-3 h-3 text-purple-600" />,
      };
    }
    return {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      avatar: 'bg-amber-600 text-white',
      icon: <User className="w-3 h-3 text-amber-600" />,
    };
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 font-sans text-xs">
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-900 to-blue-700 text-white flex items-center justify-center shadow-md">
            <Activity className="w-6 h-6 text-sky-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Employee Activity & Audit Trail
              </h1>
              <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-[11px]">
                অডিট ও কাজের ইতিহাস
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Live chronological log of all actions performed by Doctors, Receptionists, Cashiers & Admins
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/employees"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span>Employee List</span>
          </Link>

          <button
            type="button"
            onClick={loadData}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={handleClearLogs}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-lg border border-red-200 flex items-center space-x-1 transition-all"
              title="Clear all activity logs (Admin only)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. STATS & KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold uppercase">
            <span>Total Log Entries</span>
            <Activity className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-slate-900">{metrics.total}</span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-0.5">সর্বমোট কার্যাবলী</span>
        </div>

        <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-700 text-[10px] font-semibold uppercase">
            <span>Today&apos;s Actions</span>
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-blue-950">{metrics.todayCount}</span>
          </div>
          <span className="text-[9px] text-blue-500 block mt-0.5">আজকের এন্ট্রি সংখ্যা</span>
        </div>

        <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-[10px] font-semibold uppercase">
            <span>Active Users Today</span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-emerald-950">{metrics.uniqueUsersToday}</span>
          </div>
          <span className="text-[9px] text-emerald-600 block mt-0.5">আজকে সক্রিয় কর্মী</span>
        </div>

        <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-200 shadow-xs">
          <div className="flex items-center justify-between text-indigo-700 text-[10px] font-semibold uppercase">
            <span>Clinical Events</span>
            <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-indigo-950">{metrics.clinicalCount}</span>
          </div>
          <span className="text-[9px] text-indigo-500 block mt-0.5">চিকিৎসা ও প্রেসক্রিপশন</span>
        </div>

        <div className="bg-purple-50/80 p-3 rounded-xl border border-purple-200 shadow-xs">
          <div className="flex items-center justify-between text-purple-700 text-[10px] font-semibold uppercase">
            <span>Billing Events</span>
            <CreditCard className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-purple-950">{metrics.financialCount}</span>
          </div>
          <span className="text-[9px] text-purple-500 block mt-0.5">পেমেন্ট ও কালেকশন</span>
        </div>

        <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-[10px] font-semibold uppercase">
            <span>Material Actions</span>
            <Package className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-amber-950">{metrics.materialCount}</span>
          </div>
          <span className="text-[9px] text-amber-600 block mt-0.5">উপকরণ ও স্টক হিসাব</span>
        </div>
      </div>

      {/* 3. FILTER & SEARCH CONTROL BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3">
        {/* TOP ROW: MODULE TABS */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
          {[
            { id: 'All', label: 'All Modules (সব)' },
            { id: 'Auth', label: 'Auth / Login (লগইন)' },
            { id: 'Prescription', label: 'Prescriptions (প্রেসক্রিপশন)' },
            { id: 'Payment', label: 'Payments (পেমেন্ট)' },
            { id: 'Appointment', label: 'Appointments (সিরিয়াল)' },
            { id: 'Patient', label: 'Patients (রোগী)' },
            { id: 'Material', label: 'Materials (উপকরণ)' },
            { id: 'Employee', label: 'Employees (কর্মী)' },
          ].map((tab) => {
            const isSelected = selectedModule === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedModule(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* BOTTOM ROW: ADVANCED CONTROLS */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          {/* SEARCH INPUT */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, action, patient name, description..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* USER DROPDOWN */}
          <div className="sm:col-span-2">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Users (সকল কর্মী)</option>
              {Array.from(new Set(logs.map((l) => l.userName).filter(Boolean))).map((uName) => (
                <option key={uName} value={uName}>
                  {uName}
                </option>
              ))}
            </select>
          </div>

          {/* ROLE DROPDOWN */}
          <div className="sm:col-span-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Roles (সব রোল)</option>
              <option value="Admin">Admin</option>
              <option value="Doctor">Doctor</option>
              <option value="Receptionist / Cashier">Receptionist / Cashier</option>
              <option value="Staff">Staff</option>
            </select>
          </div>

          {/* DATE FILTER */}
          <div className="sm:col-span-2">
            <select
              value={dateFilter}
              onChange={(e: any) => setDateFilter(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Time (সব সময়)</option>
              <option value="today">Today (আজকে)</option>
              <option value="yesterday">Yesterday (গতকাল)</option>
              <option value="7days">Last 7 Days (গত ৭ দিন)</option>
              <option value="month">Last 30 Days (গত ৩০ দিন)</option>
              <option value="custom">Custom Date (নির্দিষ্ট দিন)</option>
            </select>
          </div>

          {/* CUSTOM DATE PICKER OR VIEW TOGGLE */}
          <div className="sm:col-span-2 flex items-center justify-end space-x-2">
            {dateFilter === 'custom' ? (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
              />
            ) : (
              <div className="border border-slate-200 rounded-lg p-0.5 bg-slate-100 flex items-center">
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                    viewMode === 'timeline' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                    viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Table
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. ACTIVITY LIST (TIMELINE OR TABLE) */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-2"></div>
          <p className="font-semibold text-xs">অ্যাক্টিভিটি হিস্ট্রি লোড হচ্ছে...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">কোনো অ্যাক্টিভিটি পাওয়া যায়নি</h3>
          <p className="text-slate-500 text-xs mt-1">
            নির্বাচিত ফিল্টার বা সার্চ দিয়ে কোনো লগ এন্ট্রি খুঁজে পাওয়া যায়নি।
          </p>
        </div>
      ) : viewMode === 'timeline' ? (
        /* TIMELINE FEED VIEW */
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-6">
            {filteredLogs.map((log) => {
              const moduleStyle = getModuleBadge(log.module);
              const roleStyle = getRoleStyle(log.userRole);
              const timeDisplay = new Date(log.timestamp).toLocaleTimeString('bn-BD', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              });
              const dateDisplay = new Date(log.timestamp).toLocaleDateString('bn-BD', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-6 h-6 rounded-full border-2 border-white shadow-xs flex items-center justify-center ${
                      moduleStyle.bg.split(' ')[0]
                    }`}
                  >
                    {moduleStyle.icon}
                  </div>

                  {/* Activity Card */}
                  <div className="bg-slate-50/80 hover:bg-blue-50/40 p-3.5 rounded-xl border border-slate-200 transition-all">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-full ${roleStyle.avatar} flex items-center justify-center font-bold text-xs shadow-xs`}
                        >
                          {log.userName ? log.userName.charAt(0) : 'U'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-xs">{log.userName}</span>
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${roleStyle.bg}`}
                            >
                              {roleStyle.icon}
                              <span>{log.userRole}</span>
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {dateDisplay} • {timeDisplay}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${moduleStyle.bg}`}
                        >
                          {moduleStyle.icon}
                          <span>{moduleStyle.label}</span>
                        </span>
                        <span className="bg-slate-200 text-slate-700 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {log.action}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                          title="View Details / Metadata"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-800 font-medium pl-9 leading-relaxed">
                      {log.description}
                    </div>

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 pl-9 flex flex-wrap items-center gap-1.5">
                        {Object.entries(log.metadata)
                          .filter(([k, v]) => v !== undefined && v !== null && typeof v !== 'object')
                          .slice(0, 4)
                          .map(([key, val]) => (
                            <span
                              key={key}
                              className="inline-block bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px] text-slate-600 font-mono"
                            >
                              <strong className="text-slate-700">{key}:</strong> {String(val)}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">User & Role</th>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const moduleStyle = getModuleBadge(log.module);
                  const roleStyle = getRoleStyle(log.userRole);

                  return (
                    <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        <div>{new Date(log.timestamp).toLocaleDateString('bn-BD')}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString('bn-BD')}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{log.userName}</div>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${roleStyle.bg} mt-0.5`}
                        >
                          {roleStyle.icon}
                          <span>{log.userRole}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${moduleStyle.bg}`}
                        >
                          {moduleStyle.icon}
                          <span>{moduleStyle.label}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-700 text-[11px]">
                        {log.action}
                      </td>

                      <td className="py-2.5 px-3 text-slate-800 font-medium max-w-md">
                        <div className="line-clamp-2">{log.description}</div>
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. METADATA DETAILS MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-300 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-sky-300" />
                <h3 className="font-extrabold text-sm">Activity Log Detail</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">User</span>
                  <span className="font-bold text-slate-900">{selectedLog.userName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Role</span>
                  <span className="font-bold text-indigo-700">{selectedLog.userRole}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Module</span>
                  <span className="font-bold text-slate-800">{selectedLog.module}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Action</span>
                  <span className="font-mono font-bold text-blue-700">{selectedLog.action}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Timestamp</span>
                  <span className="font-mono text-slate-700">
                    {new Date(selectedLog.timestamp).toLocaleString('bn-BD')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold mb-1">Description</span>
                <p className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-950 font-medium leading-relaxed">
                  {selectedLog.description}
                </p>
              </div>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold mb-1">
                    Metadata & Payload (প্যারামিটার)
                  </span>
                  <pre className="p-3 bg-slate-950 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-56">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold rounded-lg text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
