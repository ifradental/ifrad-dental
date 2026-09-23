'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Users, 
  FileText, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Plus, 
  Search, 
  Stethoscope, 
  Printer, 
  Clock, 
  ChevronRight,
  Package, 
  Pill, 
  CheckCircle2, 
  HardDrive,
  ShieldCheck,
  UserCheck,
  DollarSign,
  Phone,
  Settings,
  ArrowUpRight,
  RefreshCw,
  Activity,
  Layers,
  Sparkles,
  Award,
  Receipt,
  UserPlus,
  Filter,
  Eye,
  Edit3
} from 'lucide-react';
import { 
  db, 
  type Patient, 
  type Prescription, 
  type Appointment, 
  type PaymentRecord, 
  type MaterialItem, 
  type Employee 
} from '@/lib/db';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [patientsCount, setPatientsCount] = useState<number>(0);
  const [prescriptionsCount, setPrescriptionsCount] = useState<number>(0);
  const [recentPrescriptions, setRecentPrescriptions] = useState<Prescription[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [lowStockMaterials, setLowStockMaterials] = useState<MaterialItem[]>([]);
  const [allMaterials, setAllMaterials] = useState<MaterialItem[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);
  const [totalCollected, setTotalCollected] = useState<number>(0);
  const [todayCollected, setTodayCollected] = useState<number>(0);
  const [totalDues, setTotalDues] = useState<number>(0);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [clinicSettings, setClinicSettings] = useState<any>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const pCount = await db.patients.count();
        setPatientsCount(pCount);

        const rxCount = await db.prescriptions.count();
        setPrescriptionsCount(rxCount);

        const recentRx = await db.prescriptions.reverse().limit(6).toArray();
        setRecentPrescriptions(recentRx);

        const apnts = await db.appointments.where('date').equals(todayStr).toArray();
        setTodayAppointments(apnts);

        const materials = await db.materials.toArray();
        setAllMaterials(materials);
        const low = materials.filter((m) => (m.currentStock || 0) <= m.lowStockLimit);
        setLowStockMaterials(low);

        const payments = await db.payments.toArray();
        setPaymentsList(payments.reverse().slice(0, 8));

        const collected = payments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
        const dues = payments.reduce((acc, p) => acc + (p.dueAmount || 0), 0);
        setTotalCollected(collected);
        setTotalDues(dues);

        // Calculate today's collection
        const todayPayments = payments.filter((p) => {
          if (!p.createdAt && !p.date) return false;
          const dStr = p.createdAt ? p.createdAt.split('T')[0] : p.date;
          return dStr === todayStr;
        });
        const todayPaid = todayPayments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
        setTodayCollected(todayPaid);

        const emps = await db.employees.toArray();
        setEmployeesList(emps);

        const settings = await db.settings.get('default_settings');
        setClinicSettings(settings);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    }

    loadDashboardData();
  }, [todayStr]);

  const rawRole = (user?.role || 'doctor').toLowerCase();

  // Render role specific dashboard
  if (rawRole === 'admin') {
    return (
      <AdminDashboard
        user={user}
        clinicSettings={clinicSettings}
        patientsCount={patientsCount}
        prescriptionsCount={prescriptionsCount}
        totalCollected={totalCollected}
        totalDues={totalDues}
        employeesList={employeesList}
        todayAppointments={todayAppointments}
        recentPrescriptions={recentPrescriptions}
        lowStockMaterials={lowStockMaterials}
        todayStr={todayStr}
      />
    );
  }

  if (rawRole === 'receptionist') {
    return (
      <ReceptionistDashboard
        user={user}
        clinicSettings={clinicSettings}
        todayAppointments={todayAppointments}
        patientsCount={patientsCount}
        todayStr={todayStr}
      />
    );
  }

  if (rawRole === 'cashier') {
    return (
      <CashierDashboard
        user={user}
        clinicSettings={clinicSettings}
        totalCollected={totalCollected}
        todayCollected={todayCollected}
        totalDues={totalDues}
        paymentsList={paymentsList}
        todayStr={todayStr}
      />
    );
  }

  if (rawRole === 'staff') {
    return (
      <StaffDashboard
        user={user}
        clinicSettings={clinicSettings}
        allMaterials={allMaterials}
        lowStockMaterials={lowStockMaterials}
        todayAppointments={todayAppointments}
        todayStr={todayStr}
      />
    );
  }

  // Default: Doctor Dashboard
  return (
    <DoctorDashboard
      user={user}
      clinicSettings={clinicSettings}
      patientsCount={patientsCount}
      prescriptionsCount={prescriptionsCount}
      todayAppointments={todayAppointments}
      recentPrescriptions={recentPrescriptions}
      lowStockMaterials={lowStockMaterials}
      todayStr={todayStr}
    />
  );
}

/* =========================================================================
   1. DOCTOR DASHBOARD COMPONENT WITH DATE FILTERING
   ========================================================================= */
function DoctorDashboard({
  user,
  clinicSettings,
  patientsCount,
  prescriptionsCount,
  lowStockMaterials,
  todayStr,
}: any) {
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allPrescriptions, setAllPrescriptions] = useState<Prescription[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadDoctorData = async () => {
    setIsLoading(true);
    try {
      const [apnts, rxList] = await Promise.all([
        db.appointments.reverse().toArray(),
        db.prescriptions.reverse().toArray(),
      ]);
      setAllAppointments(apnts);
      setAllPrescriptions(rxList);
    } catch (err) {
      console.error('Failed to load doctor dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, []);

  // Compute active date boundaries
  const dateRange = useMemo(() => {
    const now = new Date();
    const format = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (dateFilter === 'today') {
      const td = format(now);
      return { start: td, end: td, label: 'আজকের তথ্য (Today)' };
    }
    if (dateFilter === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = format(y);
      return { start: yStr, end: yStr, label: 'গতকালের তথ্য (Yesterday)' };
    }
    if (dateFilter === 'last7days') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 6);
      return { start: format(past7), end: format(now), label: 'গত ৭ দিন (Last 7 Days)' };
    }
    if (dateFilter === 'lastMonth') {
      const past30 = new Date();
      past30.setDate(past30.getDate() - 29);
      return { start: format(past30), end: format(now), label: 'গত মাস / ৩০ দিন (Last Month)' };
    }
    if (dateFilter === 'lastYear') {
      const pastYear = new Date();
      pastYear.setFullYear(pastYear.getFullYear() - 1);
      return { start: format(pastYear), end: format(now), label: 'গত ১ বছর (Last Year)' };
    }
    return {
      start: customStartDate || format(now),
      end: customEndDate || format(now),
      label: 'কাস্টম সময়কাল (Custom Range)',
    };
  }, [dateFilter, customStartDate, customEndDate]);

  // Filter appointments specifically assigned to this doctor within date range
  const filteredDoctorAppointments = useMemo(() => {
    return allAppointments.filter((apnt) => {
      // Doctor check
      if (user) {
        const matchId = apnt.doctorId && (apnt.doctorId === user.employeeId || apnt.doctorId === user.id);
        const matchName = apnt.doctorName && user.name && (
          apnt.doctorName.toLowerCase().includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes(apnt.doctorName.toLowerCase())
        );
        if (!matchId && !matchName && apnt.doctorId) {
          return false;
        }
      }

      // Date check
      const d = apnt.date || (apnt.createdAt ? apnt.createdAt.split('T')[0] : '');
      if (d) {
        if (d < dateRange.start || d > dateRange.end) return false;
      }

      // Status check
      if (statusFilter !== 'ALL' && apnt.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mName = apnt.name?.toLowerCase().includes(q);
        const mMobile = apnt.mobile?.includes(q);
        const mReg = apnt.regNo?.toString().includes(q);
        const mSerial = apnt.serial?.toString().includes(q);
        const mProblem = apnt.problem?.toLowerCase().includes(q);
        if (!mName && !mMobile && !mReg && !mSerial && !mProblem) return false;
      }

      return true;
    });
  }, [allAppointments, user, dateRange, statusFilter, searchQuery]);

  // Filter prescriptions in that date range
  const filteredPrescriptions = useMemo(() => {
    return allPrescriptions.filter((rx) => {
      const d = rx.date || (rx.createdAt ? rx.createdAt.split('T')[0] : '');
      if (d) {
        if (d < dateRange.start || d > dateRange.end) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mName = rx.patientName?.toLowerCase().includes(q);
        const mReg = rx.regNo?.toString().includes(q);
        const mDx = rx.dx?.some((diag) => diag.toLowerCase().includes(q));
        if (!mName && !mReg && !mDx) return false;
      }
      return true;
    });
  }, [allPrescriptions, dateRange, searchQuery]);

  const waitingCount = filteredDoctorAppointments.filter((a) => a.status === 'Waiting').length;
  const inProgressCount = filteredDoctorAppointments.filter((a) => a.status === 'In-Progress').length;
  const completedCount = filteredDoctorAppointments.filter((a) => a.status === 'Completed').length;

  return (
    <div className="p-3.5 max-w-[1550px] mx-auto text-slate-800 space-y-4">
      {/* Top Welcome & Doctor Banner */}
      <div className="bg-gradient-to-r from-blue-800 via-sky-700 to-blue-900 rounded-xl p-5 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl shadow-inner border border-sky-200">
            🦷
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold font-sans tracking-wide">
                {clinicSettings?.clinicName || 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার'}
              </h1>
              <span className="bg-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                <Stethoscope className="w-3 h-3" />
                <span>ডাক্তার ড্যাশবোর্ড</span>
              </span>
            </div>
            <p className="text-xs text-sky-100 mt-0.5">
              স্বাগতম, <span className="font-semibold text-white">{user?.name || 'ডাক্তার'}</span> | পদবি: {user?.designation || 'ডেন্টাল সার্জন'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/prescription"
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg shadow-md transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন প্রেসক্রিপশন লিখুন</span>
          </Link>
          <Link
            href="/appointments"
            className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-lg border border-white/20 transition flex items-center space-x-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span>সিরিয়াল তালিকা</span>
          </Link>
        </div>
      </div>

      {/* Date Filter & Control Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>তারিখ ফিল্টার:</span>
            </span>

            {[
              { id: 'today', label: 'আজ (Today)' },
              { id: 'yesterday', label: 'গতকাল (Yesterday)' },
              { id: 'last7days', label: 'গত ৭ দিন (Last 7 Days)' },
              { id: 'lastMonth', label: 'গত মাস (Last Month)' },
              { id: 'lastYear', label: 'গত বছর (Last Year)' },
              { id: 'custom', label: 'কাস্টম রেঞ্জ (Custom)' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setDateFilter(btn.id as DateFilterType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  dateFilter === btn.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-[11px] font-semibold text-blue-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-blue-700" />
              <span>
                {dateRange.label}: {dateRange.start} {dateRange.start !== dateRange.end ? `থেকে ${dateRange.end}` : ''}
              </span>
            </div>

            <button
              type="button"
              onClick={loadDoctorData}
              title="তথ্য রিফ্রেশ করুন"
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Custom Date Pickers (Shown when dateFilter === 'custom') */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs">
            <div className="flex items-center space-x-2">
              <label className="font-bold text-blue-950">শুরু তারিখ (From):</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 border border-blue-300 rounded bg-white text-xs font-mono font-semibold focus:outline-none focus:border-blue-600"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="font-bold text-blue-950">শেষ তারিখ (To):</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 border border-blue-300 rounded bg-white text-xs font-mono font-semibold focus:outline-none focus:border-blue-600"
              />
            </div>
            <span className="text-[11px] text-blue-800">
              (উভয় তারিখের মধ্যবর্তী চেম্বার সিরিয়াল ও প্রেসক্রিপশন ডেটা প্রদর্শিত হচ্ছে)
            </span>
          </div>
        )}

        {/* Search & Status Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="রোগীর নাম, মোবাইল নম্বর, রেজি নং, সিরিয়াল বা সমস্যা দিয়ে ফিল্টার..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
            >
              <option value="ALL">সকল অবস্থা (All Status)</option>
              <option value="Waiting">Waiting (অপেক্ষমান)</option>
              <option value="In-Progress">In-Progress (চিকিৎসাধীন)</option>
              <option value="Completed">Completed (সম্পন্ন)</option>
              <option value="Scheduled">Scheduled (শিডিউল)</option>
              <option value="Cancelled">Cancelled (বাতিল)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid Matching Selected Filter */}
      <div className="grid grid-cols-12 gap-3 text-xs">
        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">সিরিয়াল রোগী</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-900">{filteredDoctorAppointments.length} জন</div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">{dateRange.label}</div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">লবিতে অপেক্ষমান</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">{waitingCount} জন</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">চেম্বার কিউ</div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">চিকিৎসা সম্পন্ন</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">{completedCount} জন</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">সেশন কমপ্লিট</div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">সময়কালের প্রেসক্রিপশন</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{filteredPrescriptions.length} টি</div>
          <div className="text-[11px] text-slate-500 mt-1">মোট রোগী: {patientsCount} জন</div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 text-xs font-semibold">
        <Link
          href="/prescription"
          className="p-3 bg-white hover:bg-sky-50 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center text-center space-y-1.5 transition group"
        >
          <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
            <Stethoscope className="w-5 h-5" />
          </div>
          <span className="text-slate-800">প্রেসক্রিপশন লিখুন</span>
        </Link>

        <Link
          href="/prescriptions"
          className="p-3 bg-white hover:bg-sky-50 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center text-center space-y-1.5 transition group"
        >
          <div className="p-2.5 bg-sky-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-slate-800">প্রেসক্রিপশন EMR হিস্ট্রি</span>
        </Link>

        <Link
          href="/drugs"
          className="p-3 bg-white hover:bg-sky-50 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center text-center space-y-1.5 transition group"
        >
          <div className="p-2.5 bg-emerald-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
            <Pill className="w-5 h-5" />
          </div>
          <span className="text-slate-800">ড্রাগ ডাটাবেজ (Drug DB)</span>
        </Link>

        <Link
          href="/templates"
          className="p-3 bg-white hover:bg-sky-50 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center text-center space-y-1.5 transition group"
        >
          <div className="p-2.5 bg-indigo-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
            <Layers className="w-5 h-5" />
          </div>
          <span className="text-slate-800">স্মার্ট টেমপ্লেট</span>
        </Link>

        <Link
          href="/appointments"
          className="p-3 bg-white hover:bg-sky-50 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center text-center space-y-1.5 transition group"
        >
          <div className="p-2.5 bg-purple-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-slate-800">অ্যাপয়েন্টমেন্ট ও সিরিয়াল</span>
        </Link>
      </div>

      {/* Main Two Columns */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column: Doctor's Queue Matching Filter (5 cols) */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">
                  রোগী সিরিয়াল ও চেম্বার কিউ ({filteredDoctorAppointments.length} জন)
                </h2>
              </div>
              <Link href="/appointments" className="text-xs text-blue-600 hover:underline font-semibold">
                সব দেখুন →
              </Link>
            </div>

            {filteredDoctorAppointments.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                নির্বাচিত সময়কালের মধ্যে আপনার কোনো অ্যাপয়েন্টমেন্ট শিডিউল নেই।
              </div>
            ) : (
              <div className="space-y-2.5 text-xs max-h-[550px] overflow-y-auto pr-1">
                {filteredDoctorAppointments.map((apnt: any) => (
                  <div
                    key={apnt.id}
                    className={`p-3 rounded-xl border transition ${
                      apnt.status === 'Completed'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-700 text-white font-bold font-mono flex items-center justify-center text-xs shadow-xs shrink-0 mt-0.5">
                          #{apnt.serial}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs truncate">{apnt.name}</span>
                            {apnt.age && (
                              <span className="text-[10px] text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded font-medium">
                                {apnt.age} Y / {apnt.sex === 'F' ? 'মহিলা' : 'পুরুষ'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span>📅 {apnt.date}</span>
                            <span>•</span>
                            <span>🕒 {apnt.time || 'Schedule'}</span>
                            <span>•</span>
                            <span>Reg #{apnt.regNo || 'New'}</span>
                            {apnt.mobile && (
                              <>
                                <span>•</span>
                                <span>📞 {apnt.mobile}</span>
                              </>
                            )}
                          </div>
                          {apnt.problem && (
                            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px] font-medium max-w-full">
                              <span className="font-bold shrink-0">সমস্যা:</span>
                              <span className="truncate">{apnt.problem}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            apnt.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : apnt.status === 'Waiting'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {apnt.status === 'Completed' ? '✓ সম্পন্ন' : apnt.status === 'Waiting' ? 'অপেক্ষমাণ' : apnt.status}
                        </span>

                        {apnt.status === 'Completed' ? (
                          <div className="flex items-center space-x-1">
                            <Link
                              href={`/prescriptions?regNo=${apnt.regNo || ''}`}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 shadow-xs"
                              title="প্রেসক্রিপশন দেখুন"
                            >
                              <Eye className="w-3 h-3 text-sky-600" />
                              <span>ভিউ</span>
                            </Link>
                            <Link
                              href={`/prescription?regNo=${apnt.regNo || ''}&rxId=${apnt.prescriptionId || ''}&apntId=${apnt.id}&name=${encodeURIComponent(
                                apnt.name
                              )}&age=${encodeURIComponent(apnt.age || '')}&sex=${apnt.sex || 'M'}&mobile=${encodeURIComponent(
                                apnt.mobile || ''
                              )}&problem=${encodeURIComponent(apnt.problem || '')}&doctor=${encodeURIComponent(
                                apnt.doctorName || user?.name || ''
                              )}`}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-xs"
                              title="প্রেসক্রিপশন সংশোধন করুন"
                            >
                              <Edit3 className="w-3 h-3 text-amber-700" />
                              <span>এডিট</span>
                            </Link>
                          </div>
                        ) : (
                          <Link
                            href={`/prescription?regNo=${apnt.regNo || ''}&apntId=${apnt.id}&name=${encodeURIComponent(
                              apnt.name
                            )}&age=${encodeURIComponent(apnt.age || '')}&sex=${apnt.sex || 'M'}&mobile=${encodeURIComponent(
                              apnt.mobile || ''
                            )}&problem=${encodeURIComponent(apnt.problem || '')}&doctor=${encodeURIComponent(
                              apnt.doctorName || user?.name || ''
                            )}`}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 shadow-xs bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>Make Rx</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Notification Widget */}
          {lowStockMaterials.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
              <div className="flex items-center space-x-1.5 font-bold text-amber-900 mb-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>লো-স্টক অ্যালার্ট ({lowStockMaterials.length} টি আইটেম)</span>
              </div>
              <div className="space-y-1">
                {lowStockMaterials.slice(0, 3).map((m: any) => (
                  <div key={m.id} className="flex justify-between text-[11px] text-slate-700">
                    <span className="font-medium">{m.name}</span>
                    <span className="font-bold text-red-600">স্টক: {m.currentStock || 0} {m.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Prescriptions Matching Filter (7 cols) */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-sm text-slate-900">
                প্রেসক্রিপশন ও রোগী রেকর্ড ({filteredPrescriptions.length} টি)
              </h2>
            </div>
            <Link href="/prescriptions" className="text-xs text-blue-600 hover:underline font-semibold">
              সকল প্রেসক্রিপশন দেখুন →
            </Link>
          </div>

          {filteredPrescriptions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50 text-blue-600" />
              নির্বাচিত সময়কালের মধ্যে কোনো প্রেসক্রিপশন তৈরি করা হয়নি।
            </div>
          ) : (
            <div className="overflow-x-auto text-xs max-h-[550px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-sky-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-2 w-16 text-center">Reg No</th>
                    <th className="p-2">রোগীর নাম</th>
                    <th className="p-2 w-24">তারিখ</th>
                    <th className="p-2">রোগ নির্ণয় (Diagnosis)</th>
                    <th className="p-2 w-20 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPrescriptions.slice(0, 15).map((rx: any) => (
                    <tr key={rx.id} className="hover:bg-sky-50/40">
                      <td className="p-2 text-center font-bold font-mono text-blue-900">#{rx.regNo}</td>
                      <td className="p-2 font-bold text-slate-900">{rx.patientName}</td>
                      <td className="p-2 font-mono text-slate-500">{rx.date}</td>
                      <td className="p-2 text-slate-700">
                        {rx.dx && rx.dx.length > 0 ? rx.dx.join(', ') : 'Dental Consultation'}
                      </td>
                      <td className="p-2 text-center">
                        <Link
                          href="/prescriptions"
                          className="inline-flex items-center space-x-1 px-2 py-0.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded font-semibold text-[11px]"
                        >
                          <Printer className="w-3 h-3" />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   2. ADMIN DASHBOARD COMPONENT
   ========================================================================= */
function AdminDashboard({
  user,
  clinicSettings,
  patientsCount,
  prescriptionsCount,
  totalCollected,
  totalDues,
  employeesList,
  todayAppointments,
  recentPrescriptions,
  lowStockMaterials,
  todayStr,
}: any) {
  return (
    <div className="p-3.5 max-w-[1550px] mx-auto text-slate-800 space-y-4">
      {/* Top Admin Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-xl p-5 text-white shadow-md flex flex-wrap items-center justify-between gap-4 border border-blue-900/50">
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center text-3xl shadow-lg border border-amber-200 text-slate-950">
            👑
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold font-sans tracking-wide">
                {clinicSettings?.clinicName || 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার'}
              </h1>
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3 h-3" />
                <span>মাস্টার অ্যাডমিন কন্ট্রোল প্যানেল</span>
              </span>
            </div>
            <p className="text-xs text-sky-200 mt-0.5">
              স্বাগতম, <span className="font-semibold text-white">{user?.name || 'Administrator'}</span> | সম্পূর্ণ ক্লিনিক প্রশাসন, কর্মী ও আর্থিক ব্যবস্থাপনা
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/employees"
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center space-x-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>কর্মী ব্যবস্থাপনা</span>
          </Link>
          <Link
            href="/payments"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center space-x-1.5"
          >
            <CreditCard className="w-4 h-4" />
            <span>আয় ও বকেয়া লেজার</span>
          </Link>
          <Link
            href="/settings"
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg border border-white/20 transition flex items-center space-x-1"
          >
            <Settings className="w-4 h-4" />
            <span>সেটিংস</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid - 4 Columns */}
      <div className="grid grid-cols-12 gap-3 text-xs">
        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">মোট রেজিস্টার্ড রোগী</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{patientsCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <HardDrive className="w-3 h-3 text-slate-400" />
            <span>লোকাল ডাটাবেজে সংরক্ষিত</span>
          </div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">মোট প্রেসক্রিপশন</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{prescriptionsCount}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>চিকিৎসা সম্পন্ন ও রানিং</span>
          </div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">মোট আদায়কৃত পেমেন্ট</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">৳ {totalCollected.toLocaleString()}</div>
          <div className="text-[11px] text-red-600 font-semibold mt-1">
            মোট বকেয়া: ৳ {totalDues.toLocaleString()}
          </div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">সক্রিয় ক্লিনিক স্টাফ ও ডাক্তার</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-900">{employeesList.length} জন</div>
          <div className="text-[11px] text-indigo-700 font-medium mt-1">
            <Link href="/employees" className="hover:underline flex items-center gap-0.5">
              <span>তালিকা পরিচালনা করুন</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Staff Overview & Recent Prescriptions */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column: Staff Roster Summary (5 cols) */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">ক্লিনিক কর্মী তালিকা ও ভূমিকা (Staff Roster)</h2>
              </div>
              <Link href="/employees" className="text-xs text-blue-600 hover:underline font-semibold">
                ম্যানেজ করুন →
              </Link>
            </div>

            {employeesList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                কোনো কর্মচারী যোগ করা হয়নি।{' '}
                <Link href="/employees" className="text-blue-600 underline font-semibold">
                  নতুন কর্মী যোগ করুন
                </Link>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {employeesList.slice(0, 5).map((emp: any) => (
                  <div
                    key={emp.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 bg-blue-100 text-blue-900 rounded-full font-bold flex items-center justify-center text-xs">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{emp.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {emp.designation || emp.role} • {emp.mobile}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        emp.role === 'Doctor'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : emp.role === 'Receptionist'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : emp.role === 'Cashier'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {emp.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Admin Actions Box */}
          <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/database"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>ডাটাবেজ ব্যাকআপ</span>
            </Link>
            <Link
              href="/settings"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              <span>ক্লিনিক প্রোফাইল</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Prescriptions & Billing Summary (7 cols) */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-sm text-slate-900">সাম্প্রতিক প্রেসক্রিপশন ও চিকিৎসা কার্যক্রম</h2>
            </div>
            <Link href="/prescriptions" className="text-xs text-blue-600 hover:underline font-semibold">
              সকল রেকর্ডস →
            </Link>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-sky-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2 w-16 text-center">Reg No</th>
                  <th className="p-2">রোগীর নাম</th>
                  <th className="p-2 w-24">তারিখ</th>
                  <th className="p-2">রোগ নির্ণয়</th>
                  <th className="p-2 w-20 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPrescriptions.map((rx: any) => (
                  <tr key={rx.id} className="hover:bg-sky-50/40">
                    <td className="p-2 text-center font-bold font-mono text-blue-900">#{rx.regNo}</td>
                    <td className="p-2 font-bold text-slate-900">{rx.patientName}</td>
                    <td className="p-2 font-mono text-slate-500">{rx.date}</td>
                    <td className="p-2 text-slate-700">
                      {rx.dx && rx.dx.length > 0 ? rx.dx.join(', ') : 'Dental Treatment'}
                    </td>
                    <td className="p-2 text-center">
                      <Link
                        href="/prescriptions"
                        className="inline-flex items-center space-x-1 px-2 py-0.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded font-semibold text-[11px]"
                      >
                        <Printer className="w-3 h-3" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   3. RECEPTIONIST DASHBOARD COMPONENT WITH DATE FILTERING
   ========================================================================= */
type DateFilterType = 'today' | 'yesterday' | 'last7days' | 'lastMonth' | 'lastYear' | 'custom';

function ReceptionistDashboard({
  user,
  clinicSettings,
  patientsCount,
  todayStr,
}: any) {
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [doctorsList, setDoctorsList] = useState<Employee[]>([]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [apnts, docs] = await Promise.all([
        db.appointments.reverse().toArray(),
        db.employees.where('role').equals('Doctor').and((e) => e.status === 'Active').toArray(),
      ]);
      setAllAppointments(apnts);
      setDoctorsList(docs);
    } catch (err) {
      console.error('Failed to load appointments for receptionist:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute active date boundaries
  const dateRange = useMemo(() => {
    const now = new Date();
    const format = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (dateFilter === 'today') {
      const td = format(now);
      return { start: td, end: td, label: 'আজকের তথ্য (Today)' };
    }
    if (dateFilter === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = format(y);
      return { start: yStr, end: yStr, label: 'গতকালের তথ্য (Yesterday)' };
    }
    if (dateFilter === 'last7days') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 6);
      return { start: format(past7), end: format(now), label: 'গত ৭ দিন (Last 7 Days)' };
    }
    if (dateFilter === 'lastMonth') {
      const past30 = new Date();
      past30.setDate(past30.getDate() - 29);
      return { start: format(past30), end: format(now), label: 'গত মাস / ৩০ দিন (Last Month)' };
    }
    if (dateFilter === 'lastYear') {
      const pastYear = new Date();
      pastYear.setFullYear(pastYear.getFullYear() - 1);
      return { start: format(pastYear), end: format(now), label: 'গত ১ বছর (Last Year)' };
    }
    // custom
    return {
      start: customStartDate || format(now),
      end: customEndDate || format(now),
      label: 'কাস্টম সময়কাল (Custom Range)',
    };
  }, [dateFilter, customStartDate, customEndDate]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return allAppointments.filter((apnt) => {
      // Date Check
      const d = apnt.date || (apnt.createdAt ? apnt.createdAt.split('T')[0] : '');
      if (d) {
        if (d < dateRange.start || d > dateRange.end) return false;
      }

      // Doctor Check
      if (selectedDoctorFilter !== 'ALL') {
        const match =
          apnt.doctorId === selectedDoctorFilter ||
          (apnt.doctorName && apnt.doctorName.toLowerCase().includes(selectedDoctorFilter.toLowerCase()));
        if (!match) return false;
      }

      // Status Check
      if (statusFilter !== 'ALL') {
        if (apnt.status !== statusFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mName = apnt.name?.toLowerCase().includes(q);
        const mMobile = apnt.mobile?.includes(q);
        const mReg = apnt.regNo?.toString().includes(q);
        const mSerial = apnt.serial?.toString().includes(q);
        const mProblem = apnt.problem?.toLowerCase().includes(q);
        if (!mName && !mMobile && !mReg && !mSerial && !mProblem) return false;
      }

      return true;
    });
  }, [allAppointments, dateRange, selectedDoctorFilter, statusFilter, searchQuery]);

  const waitingList = filteredAppointments.filter((a) => a.status === 'Waiting');
  const inProgressList = filteredAppointments.filter((a) => a.status === 'In-Progress');
  const completedList = filteredAppointments.filter((a) => a.status === 'Completed');
  const totalFees = filteredAppointments.reduce((acc, a) => acc + (a.visitFee || a.paid || 0), 0);

  const handleQuickStatusChange = async (id: string, newStatus: Appointment['status']) => {
    try {
      await db.appointments.update(id, { status: newStatus });
      setAllAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
    } catch (e) {
      console.error('Failed to change appointment status:', e);
    }
  };

  return (
    <div className="p-3.5 max-w-[1550px] mx-auto text-slate-800 space-y-4">
      {/* Receptionist Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-cyan-900 rounded-xl p-5 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl shadow-inner border border-teal-200">
            💁‍♀️
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold font-sans tracking-wide">
                {clinicSettings?.clinicName || 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার'}
              </h1>
              <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <UserCheck className="w-3 h-3" />
                <span>রিসেপশন ও ফ্রন্ট ডেস্ক ড্যাশবোর্ড</span>
              </span>
            </div>
            <p className="text-xs text-teal-100 mt-0.5">
              স্বাগতম, <span className="font-semibold text-white">{user?.name || 'রিসেপশনিস্ট'}</span> | রোগী সিরিয়াল বুকিং, তারিখ ফিল্টারিং ও রিসেপশন মনিটর
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/appointments"
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg shadow-md transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন সিরিয়াল এন্ট্রি করুন</span>
          </Link>
          <Link
            href="/prescriptions"
            className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-lg border border-white/20 transition flex items-center space-x-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>রোগী ও প্রেসক্রিপশন তালিকা</span>
          </Link>
        </div>
      </div>

      {/* Date Filter & Quick Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>তারিখ ফিল্টার:</span>
            </span>

            {[
              { id: 'today', label: 'আজ (Today)' },
              { id: 'yesterday', label: 'গতকাল (Yesterday)' },
              { id: 'last7days', label: 'গত ৭ দিন (Last 7 Days)' },
              { id: 'lastMonth', label: 'গত মাস (Last Month)' },
              { id: 'lastYear', label: 'গত বছর (Last Year)' },
              { id: 'custom', label: 'কাস্টম রেঞ্জ (Custom)' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setDateFilter(btn.id as DateFilterType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  dateFilter === btn.id
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-[11px] font-semibold text-teal-900 bg-teal-50 px-3 py-1 rounded-full border border-teal-200 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-teal-700" />
              <span>
                {dateRange.label}: {dateRange.start} {dateRange.start !== dateRange.end ? `থেকে ${dateRange.end}` : ''}
              </span>
            </div>

            <button
              type="button"
              onClick={loadData}
              title="তথ্য রিফ্রেশ করুন"
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Custom Date Pickers (Active when dateFilter === 'custom') */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-teal-50/70 border border-teal-200 rounded-lg text-xs">
            <div className="flex items-center space-x-2">
              <label className="font-bold text-teal-950">শুরু তারিখ (From):</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 border border-teal-300 rounded bg-white text-xs font-mono font-semibold focus:outline-none focus:border-teal-600"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="font-bold text-teal-950">শেষ তারিখ (To):</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 border border-teal-300 rounded bg-white text-xs font-mono font-semibold focus:outline-none focus:border-teal-600"
              />
            </div>
            <span className="text-[11px] text-teal-800">
              (উভয় তারিখের মধ্যকার সকল সিরিয়াল ও তথ্য প্রদর্শিত হচ্ছে)
            </span>
          </div>
        )}

        {/* Search & Doctor / Status Dropdown Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="রোগীর নাম, মোবাইল নম্বর, রেজি নং, সিরিয়াল বা সমস্যা দিয়ে ফিল্টার..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="w-full py-1.5 px-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
            >
              <option value="ALL">সকল ডাক্তার (All Doctors)</option>
              {doctorsList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
            >
              <option value="ALL">সকল অবস্থা (All Status)</option>
              <option value="Waiting">Waiting (অপেক্ষমান)</option>
              <option value="In-Progress">In-Progress (চিকিৎসাধীন)</option>
              <option value="Completed">Completed (সম্পন্ন)</option>
              <option value="Scheduled">Scheduled (শিডিউল)</option>
              <option value="Cancelled">Cancelled (বাতিল)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dynamic KPI Cards Matching Selected Filter */}
      <div className="grid grid-cols-12 gap-3 text-xs">
        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">মোট সিরিয়াল রোগী</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-teal-900">{filteredAppointments.length} জন</div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">{dateRange.label}</div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">লবিতে অপেক্ষমান</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">{waitingList.length} জন</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">চিকিৎসার জন্য ডাকুন</div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">চিকিৎসা সম্পন্ন</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">{completedList.length} জন</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">সেশন কমপ্লিট</div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">ভিজিট ফি সংগ্রহ</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-900">৳ {totalFees.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">মোট রোগী: {patientsCount} জন</div>
        </div>
      </div>

      {/* Main Section: Patient Serial Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-2">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            <h2 className="font-bold text-sm text-slate-900">
              রোগী সিরিয়াল ও রিসেপশন কিউ ({filteredAppointments.length} জন)
            </h2>
            <span className="text-[11px] text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 font-semibold">
              {dateRange.label}
            </span>
          </div>
          <Link
            href="/appointments"
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>নতুন সিরিয়াল এন্ট্রি</span>
          </Link>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-xs">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40 text-teal-600" />
            <p className="font-medium text-slate-600 text-sm">
              নির্বাচিত সময়কালের মধ্যে কোনো অ্যাপয়েন্টমেন্ট বা সিরিয়াল পাওয়া যায়নি।
            </p>
            <p className="text-slate-400 mt-1">
              অন্য কোনো তারিখ ফিল্টার বেছে নিন অথবা নতুন রোগী সিরিয়াল যুক্ত করুন।
            </p>
            <Link
              href="/appointments"
              className="inline-block mt-3 px-3.5 py-1.5 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition"
            >
              + এখনই সিরিয়াল যোগ করুন
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-teal-50 text-teal-900 font-semibold border-b border-teal-100">
                <tr>
                  <th className="p-2.5 w-16 text-center">সিরিয়াল</th>
                  <th className="p-2.5 w-24">তারিখ</th>
                  <th className="p-2.5">রোগীর তথ্য (Patient)</th>
                  <th className="p-2.5">মোবাইল</th>
                  <th className="p-2.5">লক্ষণ / সমস্যা (Problem)</th>
                  <th className="p-2.5">অ্যাসাইন ডাক্তার</th>
                  <th className="p-2.5 w-20 text-center">ভিজিট ফি</th>
                  <th className="p-2.5 text-center">বর্তমান অবস্থা</th>
                  <th className="p-2.5 text-center w-28">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((apnt: any) => (
                  <tr key={apnt.id} className="hover:bg-teal-50/30 transition">
                    {/* Serial */}
                    <td className="p-2.5 text-center font-bold font-mono text-teal-900">
                      <span className="w-7 h-7 bg-teal-100 rounded-full inline-flex items-center justify-center font-bold">
                        #{apnt.serial}
                      </span>
                    </td>

                    {/* Date & Time */}
                    <td className="p-2.5">
                      <div className="font-mono font-medium text-slate-800">{apnt.date}</div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{apnt.time || 'Schedule'}</span>
                      </div>
                    </td>

                    {/* Patient Name & Details */}
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900 text-xs">{apnt.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                        <span className="bg-slate-100 px-1 py-0.2 rounded font-medium text-slate-600">
                          {apnt.age ? `${apnt.age} Y` : 'N/A'} • {apnt.sex === 'F' ? 'মহিলা' : 'পুরুষ'}
                        </span>
                        <span>Reg #{apnt.regNo || 'New'}</span>
                      </div>
                    </td>

                    {/* Mobile */}
                    <td className="p-2.5 font-mono text-slate-700">
                      {apnt.mobile ? (
                        <a href={`tel:${apnt.mobile}`} className="hover:text-teal-700 hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{apnt.mobile}</span>
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Problem */}
                    <td className="p-2.5">
                      {apnt.problem ? (
                        <span className="inline-block px-2 py-0.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px] font-medium max-w-[200px] truncate" title={apnt.problem}>
                          {apnt.problem}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Assigned Doctor */}
                    <td className="p-2.5 font-medium text-slate-800">
                      <div className="flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{apnt.doctorName || 'ডা. নাহিদ হাসান'}</span>
                      </div>
                    </td>

                    {/* Visit Fee */}
                    <td className="p-2.5 text-center font-mono font-bold text-slate-900">
                      ৳ {apnt.visitFee || apnt.paid || 0}
                    </td>

                    {/* Status Select */}
                    <td className="p-2.5 text-center">
                      <select
                        value={apnt.status}
                        onChange={(e) => handleQuickStatusChange(apnt.id, e.target.value as any)}
                        className={`px-2 py-0.5 rounded font-bold text-[10px] border cursor-pointer ${
                          apnt.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : apnt.status === 'Waiting'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : apnt.status === 'In-Progress'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="Waiting">Waiting</option>
                        <option value="In-Progress">In-Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* Action */}
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Link
                          href={`/prescription?regNo=${apnt.regNo || ''}&apntId=${apnt.id}&name=${encodeURIComponent(
                            apnt.name
                          )}&age=${encodeURIComponent(apnt.age || '')}&sex=${apnt.sex || 'M'}&mobile=${encodeURIComponent(
                            apnt.mobile || ''
                          )}&problem=${encodeURIComponent(apnt.problem || '')}&doctor=${encodeURIComponent(
                            apnt.doctorName || ''
                          )}`}
                          title="প্রেসক্রিপশন পেজে যান"
                          className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[11px] font-semibold transition"
                        >
                          Rx
                        </Link>
                        <Link
                          href="/appointments"
                          title="অ্যাপয়েন্টমেন্ট ম্যানেজারে দেখুন"
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold border border-slate-200 transition"
                        >
                          ডিটেইলস
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   4. CASHIER DASHBOARD COMPONENT
   ========================================================================= */
function CashierDashboard({
  user,
  clinicSettings,
  totalCollected,
  todayCollected,
  totalDues,
  paymentsList,
  todayStr,
}: any) {
  return (
    <div className="p-3.5 max-w-[1550px] mx-auto text-slate-800 space-y-4">
      {/* Cashier Top Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-orange-700 to-amber-900 rounded-xl p-5 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl shadow-inner border border-amber-200">
            💵
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold font-sans tracking-wide">
                {clinicSettings?.clinicName || 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার'}
              </h1>
              <span className="bg-yellow-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <Receipt className="w-3 h-3" />
                <span>ক্যাশিয়ার ও বিলিং কাউন্টার</span>
              </span>
            </div>
            <p className="text-xs text-amber-100 mt-0.5">
              স্বাগতম, <span className="font-semibold text-white">{user?.name || 'ক্যাশিয়ার'}</span> | পেমেন্ট কালেকশন, মানি রিসিট ও বকেয়া লেজার
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/payments"
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg shadow-md transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন পেমেন্ট এন্ট্রি</span>
          </Link>
          <Link
            href="/prescriptions"
            className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-lg border border-white/20 transition flex items-center space-x-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>প্রেসক্রিপশন ও বিল তালিকা</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-12 gap-3 text-xs">
        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">আজকের মোট কালেকশন</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">৳ {todayCollected.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">আজকের জমা ক্যাশ/ডিজিটাল</div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">বর্তমান মোট বকেয়া</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-red-600">৳ {totalDues.toLocaleString()}</div>
          <div className="text-[11px] text-red-500 font-medium mt-1">বকেয়া রিকভারি প্রয়োজন</div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">সর্বমোট আদায় (All-time)</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-900">৳ {totalCollected.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">সফটওয়্যারের সর্বমোট কালেকশন</div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">আজকের তারিখ</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{todayStr}</div>
          <div className="text-[11px] text-slate-500 mt-1">বিলিং কাউন্টার সেশন চালু</div>
        </div>
      </div>

      {/* Main Section: Recent Payment Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-amber-600" />
            <h2 className="font-bold text-sm text-slate-900">সাম্প্রতিক পেমেন্ট লেনদেন ও রসিদ (Recent Transactions)</h2>
          </div>
          <Link href="/payments" className="text-xs text-amber-700 hover:underline font-semibold">
            সকল পেমেন্ট লেজার →
          </Link>
        </div>

        {paymentsList.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
            কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-amber-50/70 text-slate-800 font-semibold border-b border-amber-100">
                <tr>
                  <th className="p-2.5 w-16 text-center">Reg #</th>
                  <th className="p-2.5">রোগীর নাম</th>
                  <th className="p-2.5">মোবাইল</th>
                  <th className="p-2.5">তারিখ</th>
                  <th className="p-2.5">বিবরণ</th>
                  <th className="p-2.5 text-right">জমা (Paid)</th>
                  <th className="p-2.5 text-right">বকেয়া (Due)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentsList.map((p: any) => (
                  <tr key={p.id} className="hover:bg-amber-50/30">
                    <td className="p-2.5 text-center font-bold font-mono text-blue-900">#{p.regNo}</td>
                    <td className="p-2.5 font-bold text-slate-900">{p.name}</td>
                    <td className="p-2.5 font-mono text-slate-600">{p.mobile || 'N/A'}</td>
                    <td className="p-2.5 font-mono text-slate-500">{p.date}</td>
                    <td className="p-2.5 text-slate-700">{p.particulars}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                      ৳ {(p.paidAmount || 0).toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-red-600">
                      ৳ {(p.dueAmount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   5. STAFF DASHBOARD COMPONENT
   ========================================================================= */
function StaffDashboard({
  user,
  clinicSettings,
  allMaterials,
  lowStockMaterials,
  todayAppointments,
  todayStr,
}: any) {
  return (
    <div className="p-3.5 max-w-[1550px] mx-auto text-slate-800 space-y-4">
      {/* Staff Top Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 rounded-xl p-5 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl shadow-inner border border-purple-200">
            🛠️
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold font-sans tracking-wide">
                {clinicSettings?.clinicName || 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার'}
              </h1>
              <span className="bg-purple-300 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <Package className="w-3 h-3" />
                <span>ক্লিনিক অ্যাসিস্ট্যান্ট ও ইনভেন্টরি সাপোর্ট</span>
              </span>
            </div>
            <p className="text-xs text-purple-100 mt-0.5">
              স্বাগতম, <span className="font-semibold text-white">{user?.name || 'স্টাফ'}</span> | ডেন্টাল ম্যাটেরিয়াল স্টক, ইকুইপমেন্ট ও চেম্বার অ্যাসিস্ট্যান্ট
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/materials"
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg shadow-md transition flex items-center space-x-1.5"
          >
            <Package className="w-4 h-4" />
            <span>ম্যাটেরিয়াল স্টক দেখুন</span>
          </Link>
          <Link
            href="/appointments"
            className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-lg border border-white/20 transition flex items-center space-x-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span>আজকের সিরিয়াল শিডিউল</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-12 gap-3 text-xs">
        <div className="col-span-6 sm:col-span-4 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">মোট ডেন্টাল ম্যাটেরিয়াল আইটেম</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-900">{allMaterials.length} টি</div>
          <div className="text-[11px] text-slate-500 mt-1">ইনভেন্টরি লিস্ট</div>
        </div>

        <div className="col-span-6 sm:col-span-4 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">লো-স্টক সতর্কতা আইটেম</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">{lowStockMaterials.length} টি</div>
          <div className="text-[11px] text-rose-500 font-medium mt-1">অনতিবিলম্বে রিস্টক প্রয়োজন</div>
        </div>

        <div className="col-span-12 sm:col-span-4 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">আজকের অ্যাপয়েন্টমেন্ট শিডিউল</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-900">{todayAppointments.length} জন রোগী</div>
          <div className="text-[11px] text-slate-500 mt-1">তারিখ: {todayStr}</div>
        </div>
      </div>

      {/* Main Section: Low Stock Items List */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h2 className="font-bold text-sm text-slate-900">জরুরি লো-স্টক ও রিস্টক প্রয়োজন সামগ্রী (Low Stock Items)</h2>
          </div>
          <Link href="/materials" className="text-xs text-purple-700 hover:underline font-semibold">
            সকল ম্যাটেরিয়াল দেখুন →
          </Link>
        </div>

        {lowStockMaterials.length === 0 ? (
          <div className="py-8 text-center text-emerald-600 text-xs font-semibold">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            সকল ডেন্টাল সামগ্রী ও ওষুধের স্টক পর্যাপ্ত রয়েছে।
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-rose-50 text-slate-800 font-semibold border-b border-rose-100">
                <tr>
                  <th className="p-2.5">আইটেমের নাম</th>
                  <th className="p-2.5">কোম্পানি</th>
                  <th className="p-2.5">সাপ্লায়ার</th>
                  <th className="p-2.5">মোবাইল</th>
                  <th className="p-2.5 text-center">বর্তমান স্টক</th>
                  <th className="p-2.5 text-center">সর্বনিম্ন লিমিট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockMaterials.map((m: any) => (
                  <tr key={m.id} className="hover:bg-rose-50/20">
                    <td className="p-2.5 font-bold text-slate-900">{m.name}</td>
                    <td className="p-2.5 text-slate-600">{m.manufacturer || 'N/A'}</td>
                    <td className="p-2.5 text-slate-700 font-medium">{m.supplier || 'N/A'}</td>
                    <td className="p-2.5 font-mono text-slate-600">{m.supplierMobile || 'N/A'}</td>
                    <td className="p-2.5 text-center font-bold font-mono text-rose-600">
                      {m.currentStock || 0} {m.unit}
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-500">
                      {m.lowStockLimit} {m.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
