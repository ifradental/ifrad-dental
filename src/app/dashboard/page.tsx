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
  Edit3,
  Target,
  Store,
  Check,
  X,
  AlertCircle,
  Send,
  PhoneCall,
  MessageCircle,
  MapPin,
  RotateCcw,
  Trash2,
  ClipboardList,
  BarChart3,
  PieChart,
  FileCheck
} from 'lucide-react';
import { 
  db, 
  type Patient, 
  type Prescription, 
  type Appointment, 
  type PaymentRecord, 
  type MaterialItem, 
  type Employee,
  type MarketingTask,
  type MarketingReport,
  type VisitedDrugHouse
} from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { useAuth } from '@/context/AuthContext';
import ThermalTokenModal from '@/components/appointments/ThermalTokenModal';
import { DentalLoadingSpinner } from '@/components/DentalLoadingSpinner';

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

  if (rawRole.includes('receptionist') || rawRole.includes('cashier')) {
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

  if (rawRole.includes('marketing')) {
    return (
      <MarketingOfficerDashboard
        user={user}
        clinicSettings={clinicSettings}
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
   2. ADMIN DASHBOARD COMPONENT WITH MARKETING TASKS & APPROVAL
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
  const [marketingTasks, setMarketingTasks] = useState<MarketingTask[]>([]);
  const [showQuickTaskModal, setShowQuickTaskModal] = useState<boolean>(false);
  const [isSavingTask, setIsSavingTask] = useState<boolean>(false);

  // Toaster State
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }>({
    show: false,
    type: 'success',
    title: '',
    message: '',
  });

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, type, title, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4500);
  };

  const marketingOfficers = useMemo(() => {
    return employeesList.filter((e: any) => 
      e.role === 'Marketing Officer' || 
      (e.designation && e.designation.toLowerCase().includes('marketing')) ||
      (e.role && e.role.toLowerCase().includes('marketing'))
    );
  }, [employeesList]);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    area: '',
    officerId: '',
    officerName: '',
    officerMobile: '',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'High' as 'High' | 'Medium' | 'Normal',
    pharmacyName: '',
    targetPharmaciesCount: 5,
  });

  const loadMarketingTasks = async () => {
    try {
      const tasks = await db.marketingTasks.reverse().toArray();
      setMarketingTasks(tasks);
    } catch (err) {
      console.error('Failed to load marketing tasks for admin:', err);
    }
  };

  const triggerLiveSync = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('marketing_tasks_live_sync', Date.now().toString());
      window.dispatchEvent(new Event('marketing_tasks_data_changed'));
      try {
        const bc = new BroadcastChannel('dental_marketing_channel');
        bc.postMessage({ type: 'TASK_CHANGED', time: Date.now() });
        bc.close();
      } catch (e) {}
    }
  };

  useEffect(() => {
    loadMarketingTasks();
    const handleRefresh = () => {
      loadMarketingTasks();
    };
    window.addEventListener('storage', handleRefresh);
    window.addEventListener('marketing_tasks_data_changed', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('dental_marketing_channel');
      bc.onmessage = () => {
        loadMarketingTasks();
      };
    } catch (e) {}

    return () => {
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('marketing_tasks_data_changed', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
      if (bc) bc.close();
    };
  }, []);

  // Quick Open Assign Modal
  const handleOpenAssignModal = () => {
    const defaultOfficer = marketingOfficers[0] || employeesList[0];
    setTaskForm({
      title: '',
      description: '',
      area: '',
      officerId: defaultOfficer ? defaultOfficer.id : '',
      officerName: defaultOfficer ? defaultOfficer.name : 'মার্কেটিং অফিসার',
      officerMobile: defaultOfficer ? defaultOfficer.mobile : '',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'High',
      targetPharmaciesCount: 5,
    });
    setShowQuickTaskModal(true);
  };

  const handleSaveQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      alert('টাস্কের শিরোনাম আবশ্যক!');
      return;
    }
    if (!taskForm.area.trim()) {
      alert('টার্গেট এরিয়া/এলাকার নাম দিন!');
      return;
    }

    setIsSavingTask(true);
    try {
      const now = new Date().toISOString();
      const newTaskId = `task_${Date.now()}`;
      const newTask: MarketingTask = {
        id: newTaskId,
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        area: taskForm.area.trim(),
        officerId: taskForm.officerId,
        officerName: taskForm.officerName,
        officerMobile: taskForm.officerMobile,
        assignedBy: user?.name || 'Master Admin',
        assignedDate: new Date().toISOString().split('T')[0],
        dueDate: taskForm.dueDate,
        priority: taskForm.priority,
        pharmacyName: taskForm.pharmacyName?.trim() || undefined,
        targetPharmaciesCount: Number(taskForm.targetPharmaciesCount) || 1,
        status: 'Assigned',
        createdAt: now,
        updatedAt: now,
      };

      await db.marketingTasks.put(newTask);
      await syncEngine.logMutation('marketingTasks' as any, 'INSERT', newTask.id, newTask);
      triggerLiveSync();

      setShowQuickTaskModal(false);
      await loadMarketingTasks();
      showToast('টাস্ক অ্যাসাইন সফল হয়েছে! 🎯', `টাস্কটি "${newTask.officerName}"-কে সফলভাবে অ্যাসাইন করা হয়েছে।`, 'success');
    } catch (err) {
      console.error('Error saving marketing task:', err);
      showToast('ত্রুটি', 'টাস্ক তৈরিতে সমস্যা হয়েছে!', 'error');
    } finally {
      setIsSavingTask(false);
    }
  };

  // Admin Quick Approves Task
  const handleApproveTask = async (task: MarketingTask) => {
    try {
      const now = new Date().toISOString();
      const updated: MarketingTask = {
        ...task,
        status: 'Approved',
        approvedBy: user?.name || 'Admin',
        approvalDate: now.split('T')[0],
        adminRemarks: 'সফলভাবে যাচাই ও অনুমোদিত হয়েছে।',
        updatedAt: now,
      };

      await db.marketingTasks.put(updated);
      await syncEngine.logMutation('marketingTasks' as any, 'UPDATE', task.id, updated);
      triggerLiveSync();

      await loadMarketingTasks();
      showToast('টাস্ক সফলভাবে অনুমোদিত! 🎉', `টাস্ক "${task.title}" সফলভাবে সম্পন্ন ও অনুমোদিত হয়েছে।`, 'success');
    } catch (err) {
      console.error('Error approving task:', err);
      showToast('ত্রুটি', 'অনুমোদন করতে সমস্যা হয়েছে!', 'error');
    }
  };

  const pendingCount = marketingTasks.filter((t) => t.status === 'Submitted').length;
  const approvedCount = marketingTasks.filter((t) => t.status === 'Approved').length;

  return (
    <div className="p-3.5 max-w-[1550px] mx-auto text-slate-800 space-y-4 text-xs font-sans relative">
      {/* =========================================================================
          TOASTER NOTIFICATION POPUP
          ========================================================================= */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 min-w-[320px] max-w-md ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-white border-emerald-700 shadow-emerald-900/30'
              : toast.type === 'error'
              ? 'bg-rose-950 text-white border-rose-700 shadow-rose-900/30'
              : 'bg-indigo-950 text-white border-indigo-700 shadow-indigo-900/30'
          }`}>
            <div className={`p-2 rounded-xl shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'
            }`}>
              {toast.type === 'success' ? <Check className="w-5 h-5" /> : toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div className="flex-1 pr-2">
              <h4 className="font-bold text-sm leading-tight text-white">{toast.title}</h4>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
          <button
            type="button"
            onClick={handleOpenAssignModal}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Target className="w-4 h-4" />
            <span>+ মার্কেটিং টাস্ক অ্যাসাইন</span>
          </button>
          <Link
            href="/marketing-officer"
            className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center space-x-1.5"
          >
            <Store className="w-4 h-4" />
            <span>মার্কেটিং পোর্টাল</span>
          </Link>
          <Link
            href="/employees"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center space-x-1.5"
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
            <span className="font-semibold">সক্রিয় ক্লিনিক কর্মী ও মার্কেটিং</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-900">{employeesList.length} জন</div>
          <div className="text-[11px] text-indigo-700 font-medium mt-1">
            <Link href="/employees" className="hover:underline flex items-center gap-0.5">
              <span>মার্কেটিং ও কর্মী তালিকা</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MARKETING & FIELD TASKS MANAGEMENT WIDGET (ADMIN CONTROL)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-purple-200/80 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-sm text-slate-900">মার্কেটিং অফিসার টাস্ক ও ফিল্ড রিপোর্ট (Marketing Tasks)</h2>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full font-mono text-[10px] font-bold animate-pulse">
                    {pendingCount} পেন্ডিং অনুমোদন
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                অফিসারদের জন্য টাস্ক অ্যাসাইন, ড্রাগ হাউজ ভিজিট রিপোর্ট এবং অ্যাডমিন অনুমোদন ব্যবস্থা
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleOpenAssignModal}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ নতুন টাস্ক অ্যাসাইন</span>
            </button>
            <Link
              href="/marketing-officer"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-purple-900 font-bold text-xs rounded-xl border border-slate-300 flex items-center space-x-1 transition"
            >
              <span>সম্পূর্ণ পোর্টাল ও ডিরেক্টরি</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {marketingTasks.length === 0 ? (
          <div className="py-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Target className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-purple-600" />
            কোনো মার্কেটিং টাস্ক তৈরি করা হয়নি।{' '}
            <button
              type="button"
              onClick={handleOpenAssignModal}
              className="text-purple-600 underline font-bold cursor-pointer"
            >
              নতুন টাস্ক অ্যাসাইন করুন
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-purple-50/70 text-purple-950 font-bold border-b border-purple-100">
                <tr>
                  <th className="p-2.5">টাস্কের শিরোনাম ও এরিয়া</th>
                  <th className="p-2.5">অ্যাসাইনকৃত অফিসার</th>
                  <th className="p-2.5">টার্গেট ও ভিজিট</th>
                  <th className="p-2.5">ডেডলাইন</th>
                  <th className="p-2.5 text-center">স্ট্যাটাস</th>
                  <th className="p-2.5 text-right">অ্যাডমিন অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marketingTasks.slice(0, 5).map((task) => (
                  <tr key={task.id} className="hover:bg-purple-50/20">
                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className={`px-2 py-0.2 rounded-md font-bold text-[9px] border ${
                          task.category === 'Patient'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : task.category === 'Custom'
                            ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
                            : 'bg-purple-50 text-purple-900 border-purple-300'
                        }`}>
                          {task.category === 'Patient' ? '👤 রোগী' : task.category === 'Custom' ? '📝 কাস্টম' : '🏪 ফার্মেসি'}
                        </span>
                        <span className="font-bold text-slate-900">{task.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        📍 {task.area} {task.patientName && `• 👤 রোগী: ${task.patientName}`}
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-purple-900">{task.officerName}</div>
                      <div className="text-[11px] text-slate-500">{task.officerMobile || 'মার্কেটিং অফিসার'}</div>
                    </td>
                    <td className="p-2.5">
                      {task.category === 'Patient' ? (
                        <div className="text-[11px] text-emerald-800 font-medium">
                          {task.patientMobile ? `📱 ${task.patientMobile}` : 'ফলো-আপ টাস্ক'}
                          {task.patientOutcome && <div className="text-emerald-950 font-bold">✓ সম্পন্ন</div>}
                        </div>
                      ) : task.category === 'Custom' ? (
                        <div className="text-[11px] text-indigo-800 font-medium">
                          কাস্টম ফিল্ড ওয়ার্ক
                          {task.customOutcome && <div className="text-indigo-950 font-bold">✓ সম্পন্ন</div>}
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-slate-700">
                            টার্গেট: <span className="font-bold">{task.targetPharmaciesCount || 5}</span> টি
                          </div>
                          {task.visitedDrugHouses && task.visitedDrugHouses.length > 0 && (
                            <div className="text-[11px] text-emerald-700 font-bold">
                              ✓ সংগৃহীত: {task.visitedDrugHouses.length} টি ফার্মেসি
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-slate-600">{task.dueDate}</td>
                    <td className="p-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        task.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : task.status === 'Submitted'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                          : task.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {task.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                        {task.status === 'Submitted' && <Clock className="w-3 h-3" />}
                        {task.status === 'Approved' ? 'অনুমোদিত (Approved)' : task.status === 'Submitted' ? 'রিপোর্ট জমা (Submitted)' : task.status === 'Rejected' ? 'রিভিশন' : 'চলমান (Assigned)'}
                      </span>
                    </td>
                    <td className="p-2.5 text-right space-x-1.5">
                      {task.status === 'Submitted' && (
                        <button
                          type="button"
                          onClick={() => handleApproveTask(task)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-xs inline-flex items-center gap-1 cursor-pointer transition"
                        >
                          <Check className="w-3 h-3" />
                          <span>অনুমোদন করুন</span>
                        </button>
                      )}
                      <Link
                        href="/marketing-officer"
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 inline-flex items-center gap-1 transition"
                      >
                        <Eye className="w-3 h-3" />
                        <span>বিস্তারিত</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                          : emp.role === 'Marketing Officer'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : emp.role === 'Receptionist'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : emp.role === 'Cashier'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
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
            <Link href="/patients" className="text-xs text-blue-600 hover:underline font-semibold">
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
                        href={`/patients?regNo=${rx.regNo}`}
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

      {/* =========================================================================
          ADMIN QUICK ASSIGN TASK MODAL
          ========================================================================= */}
      {showQuickTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">নতুন মার্কেটিং টাস্ক অ্যাসাইন করুন</h3>
                  <p className="text-xs text-purple-200">মার্কেটিং অফিসারের জন্য এলাকা ও টার্গেট নির্ধারণ করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickTaskModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickTask} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">টাস্কের শিরোনাম *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="যেমন: মিরপুর-১০ এর ১০টি নতুন ফার্মেসি ভিজিট ও ড্রাগ প্রমোশন"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600 font-semibold text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">মার্কেটিং অফিসার নির্বাচন করুন *</label>
                  <select
                    value={taskForm.officerId}
                    onChange={(e) => {
                      const off = employeesList.find((emp: any) => emp.id === e.target.value);
                      if (off) {
                        setTaskForm({
                          ...taskForm,
                          officerId: off.id,
                          officerName: off.name,
                          officerMobile: off.mobile,
                        });
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-semibold text-xs"
                  >
                    {employeesList.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role} - {emp.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">টার্গেট এরিয়া / এলাকা *</label>
                  <input
                    type="text"
                    required
                    value={taskForm.area}
                    onChange={(e) => setTaskForm({ ...taskForm, area: e.target.value })}
                    placeholder="যেমন: উত্তরা সেক্টর ৩, ফার্মগেট, ধানমন্ডি"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600 font-semibold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ফার্মেসির নাম (টার্গেট ফার্মেসি)</label>
                  <input
                    type="text"
                    value={taskForm.pharmacyName}
                    onChange={(e) => setTaskForm({ ...taskForm, pharmacyName: e.target.value })}
                    placeholder="যেমন: মদিনা ফার্মেসি, লাজ ফার্মা"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600 font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ফার্মেসি টার্গেট সংখ্যা</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={taskForm.targetPharmaciesCount || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (Number(val) >= 1 && Number(val) <= 100)) {
                        setTaskForm({ ...taskForm, targetPharmaciesCount: val === '' ? ('' as any) : parseInt(val) });
                      }
                    }}
                    placeholder=""
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">সম্পন্নের শেষ তারিখ (Deadline)</label>
                  <input
                    type="date"
                    required
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">অগ্রাধিকার (Priority)</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-semibold text-xs"
                  >
                    <option value="High">🔴 জরুরি (High)</option>
                    <option value="Medium">🟡 সাধারণ (Medium)</option>
                    <option value="Normal">🟢 নরমাল (Normal)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">টাস্কের নির্দেশনা / বিবরণ</label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="অফিসার কোন কোন ড্রাগ প্রমোট করবেন বা কী তথ্য সংগ্রহ করবেন..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600 text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickTaskModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingTask}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingTask ? 'সংরক্ষণ হচ্ছে...' : 'টাস্ক অ্যাসাইন নিশ্চিত করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   3. DOCTOR DASHBOARD COMPONENT WITH DATE FILTERING
   ========================================================================= */
type DateFilterType = 'today' | 'yesterday' | 'last7days' | 'lastMonth' | 'lastYear' | 'custom';

function DoctorDashboard({
  user,
  clinicSettings,
  patientsCount,
  prescriptionsCount,
  todayAppointments,
  recentPrescriptions,
  lowStockMaterials,
  todayStr,
}: any) {
  const [queueScope, setQueueScope] = useState<'my' | 'all'>('my');
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

  // Filter appointments specifically assigned to this doctor or full clinic within date range
  const filteredDoctorAppointments = useMemo(() => {
    return allAppointments.filter((apnt) => {
      // Doctor check (if scope is 'my')
      if (queueScope === 'my' && user) {
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
  }, [allAppointments, user, queueScope, dateRange, statusFilter, searchQuery]);

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
        const mDx = rx.dx?.some((diag: string) => diag.toLowerCase().includes(q));
        if (!mName && !mReg && !mDx) return false;
      }
      return true;
    });
  }, [allPrescriptions, dateRange, searchQuery]);

  const waitingCount = filteredDoctorAppointments.filter((a) => a.status === 'Waiting').length;
  const inProgressCount = filteredDoctorAppointments.filter((a) => a.status === 'In-Progress').length;
  const sentToCashierCount = filteredDoctorAppointments.filter((a) => a.status === 'Sent to Cashier').length;
  const paymentDoneCount = filteredDoctorAppointments.filter((a) => a.status === 'Payment Done').length;
  const completedCount = filteredDoctorAppointments.filter((a) => a.status === 'Completed').length;

  // Find next waiting patient for quick call
  const nextWaitingPatient = filteredDoctorAppointments.find((a) => a.status === 'Waiting');

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
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="রোগীর নাম, মোবাইল নম্বর, রেজি নং, সিরিয়াল বা সমস্যা দিয়ে ফিল্টার..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="sm:col-span-4 flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setQueueScope('my')}
              className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold transition ${
                queueScope === 'my'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              আমার চেম্বার কিউ ({user?.name || 'My Queue'})
            </button>
            <button
              type="button"
              onClick={() => setQueueScope('all')}
              className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold transition ${
                queueScope === 'all'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              ক্লিনিকের সকল রোগী
            </button>
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
            >
              <option value="ALL">সকল অবস্থা (All Status)</option>
              <option value="Waiting">Waiting (অপেক্ষমান)</option>
              <option value="In-Progress">In-Progress (চিকিৎসাধীন)</option>
              <option value="Sent to Cashier">Sent to Cashier (ক্যাশিয়ারে)</option>
              <option value="Payment Done">Payment Done (বিল পরিশোধিত)</option>
              <option value="Completed">Completed (সম্পন্ন)</option>
              <option value="Absent">Absent (অনুপস্থিত)</option>
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
          href="/patients"
          className="p-3 bg-white hover:bg-sky-50 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center text-center space-y-1.5 transition group"
        >
          <div className="p-2.5 bg-sky-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-slate-800">রোগী ও প্রেসক্রিপশন হিস্ট্রি</span>
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
            <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-200 gap-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">
                  রোগী সিরিয়াল ও চেম্বার কিউ ({filteredDoctorAppointments.length} জন)
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                {nextWaitingPatient && (
                  <Link
                    href={`/prescription?regNo=${nextWaitingPatient.regNo || ''}&apntId=${nextWaitingPatient.id}&name=${encodeURIComponent(
                      nextWaitingPatient.name
                    )}&age=${encodeURIComponent(nextWaitingPatient.age || '')}&sex=${nextWaitingPatient.sex || 'M'}&mobile=${encodeURIComponent(
                      nextWaitingPatient.mobile || ''
                    )}&problem=${encodeURIComponent(nextWaitingPatient.problem || '')}&doctor=${encodeURIComponent(
                      nextWaitingPatient.doctorName || user?.name || ''
                    )}`}
                    className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-[11px] rounded-lg shadow-xs transition flex items-center space-x-1"
                    title={`পরবর্তী অপেক্ষমাণ রোগী ডাকুন (#${nextWaitingPatient.serial} - ${nextWaitingPatient.name})`}
                  >
                    <Stethoscope className="w-3 h-3 text-slate-950" />
                    <span>রোগী ডাকুন (#{nextWaitingPatient.serial})</span>
                  </Link>
                )}
                <Link href="/appointments" className="text-xs text-blue-600 hover:underline font-semibold">
                  সব দেখুন →
                </Link>
              </div>
            </div>

            {filteredDoctorAppointments.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                নির্বাচিত সময়কালের মধ্যে কোনো অ্যাপয়েন্টমেন্ট শিডিউল নেই।
              </div>
            ) : (
              <div className="space-y-2.5 text-xs max-h-[550px] overflow-y-auto pr-1">
                {filteredDoctorAppointments.map((apnt: any) => (
                  <div
                    key={apnt.id}
                    className={`p-3 rounded-xl border transition ${
                      apnt.status === 'Completed'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : apnt.status === 'Sent to Cashier'
                        ? 'bg-purple-50/50 border-purple-200'
                        : apnt.status === 'Payment Done'
                        ? 'bg-teal-50/50 border-teal-200'
                        : apnt.status === 'In-Progress'
                        ? 'bg-blue-50/50 border-blue-200'
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
                          {apnt.doctorName && (
                            <div className="text-[10px] text-indigo-700 mt-1 font-semibold flex items-center gap-1">
                              <Stethoscope className="w-3 h-3" />
                              <span>{apnt.doctorName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            apnt.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : apnt.status === 'Payment Done'
                              ? 'bg-teal-100 text-teal-800'
                              : apnt.status === 'Sent to Cashier'
                              ? 'bg-purple-100 text-purple-800'
                              : apnt.status === 'Waiting'
                              ? 'bg-amber-100 text-amber-800'
                              : apnt.status === 'In-Progress'
                              ? 'bg-blue-100 text-blue-800'
                              : apnt.status === 'Absent'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {apnt.status === 'Completed'
                            ? '✓ সম্পন্ন'
                            : apnt.status === 'Payment Done'
                            ? 'বিল পরিশোধিত'
                            : apnt.status === 'Sent to Cashier'
                            ? 'ক্যাশিয়ারে'
                            : apnt.status === 'Waiting'
                            ? 'অপেক্ষমাণ'
                            : apnt.status === 'In-Progress'
                            ? 'চিকিৎসাধীন'
                            : apnt.status === 'Absent'
                            ? 'অনুপস্থিত'
                            : apnt.status}
                        </span>

                        {apnt.status === 'Completed' || apnt.status === 'Payment Done' || apnt.status === 'Sent to Cashier' ? (
                          <div className="flex items-center space-x-1">
                            <Link
                              href={`/patients?regNo=${apnt.regNo || ''}`}
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
            <Link href="/patients" className="text-xs text-blue-600 hover:underline font-semibold">
              সকল রোগী ও প্রেসক্রিপশন দেখুন →
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
                          href={`/patients?regNo=${rx.regNo}`}
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
   4. RECEPTIONIST DASHBOARD COMPONENT WITH DATE FILTERING
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

  // Thermal Token Modal State
  const [selectedTokenApnt, setSelectedTokenApnt] = useState<Appointment | null>(null);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);

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

    const handleRefresh = () => {
      loadData();
    };

    window.addEventListener('storage', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    return () => {
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
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
      await syncEngine.logMutation('appointments', 'UPDATE', id, { status: newStatus });

      // Direct MongoDB patch
      fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      }).catch((err) => console.warn('Direct MongoDB patch notice:', err));

      // Broadcast storage event
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to change appointment status:', e);
    }
  };

  return (
    <div className="p-3.5 max-w-[1550px] mx-auto text-slate-800 space-y-4">
      {/* Receptionist & Cashier Top Banner */}
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
                <span>রিসেপশন ও ক্যাশ কাউন্টার ড্যাশবোর্ড</span>
              </span>
            </div>
            <p className="text-xs text-teal-100 mt-0.5">
              স্বাগতম, <span className="font-semibold text-white">{user?.name || 'রিসেপশনিস্ট ও ক্যাশিয়ার'}</span> | রোগী সিরিয়াল বুকিং, পেমেন্ট কালেকশন ও মনিটর
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/appointments"
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg shadow-md transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন সিরিয়াল এন্ট্রি</span>
          </Link>
          <Link
            href="/payments"
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center space-x-1.5"
          >
            <CreditCard className="w-4 h-4" />
            <span>পেমেন্ট ও কালেকশন</span>
          </Link>
          <Link
            href="/patients"
            className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-lg border border-white/20 transition flex items-center space-x-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>রোগী তালিকা</span>
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
              <option value="Sent to Cashier">Sent to Cashier (ক্যাশ কাউন্টারে)</option>
              <option value="Payment Done">Payment Done (বিল পরিশোধিত)</option>
              <option value="Completed">Completed (সম্পন্ন)</option>
              <option value="Absent">Absent (অনুপস্থিত)</option>
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
                        className={`px-2 py-0.5 rounded font-bold text-[10px] border cursor-pointer transition ${
                          apnt.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : apnt.status === 'Waiting'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : apnt.status === 'In-Progress'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : apnt.status === 'Sent to Cashier'
                            ? 'bg-purple-100 text-purple-900 border-purple-400 font-black ring-1 ring-purple-400'
                            : apnt.status === 'Payment Done'
                            ? 'bg-teal-100 text-teal-850 border-teal-300 font-bold'
                            : apnt.status === 'Absent'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : apnt.status === 'Cancelled'
                            ? 'bg-slate-200 text-slate-700 border-slate-400'
                            : 'bg-slate-100 text-slate-750 border-slate-300'
                        }`}
                      >
                        <option value="Waiting">Waiting (অপেক্ষমান)</option>
                        <option value="In-Progress">In-Progress (চিকিৎসাধীন)</option>
                        <option value="Sent to Cashier">Sent to Cashier (ক্যাশে প্রেরিত)</option>
                        <option value="Payment Done">Payment Done (বিল পরিশোধিত)</option>
                        <option value="Completed">Completed (সম্পন্ন)</option>
                        <option value="Absent">Absent (অনুপস্থিত)</option>
                        <option value="Scheduled">Scheduled (শিডিউল)</option>
                        <option value="Cancelled">Cancelled (বাতিল)</option>
                      </select>
                    </td>

                    {/* Action */}
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTokenApnt(apnt);
                            setIsTokenModalOpen(true);
                          }}
                          title="থার্মাল টোকেন রিসিট প্রিন্ট করুন"
                          className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[11px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>টোকেন</span>
                        </button>
                        <Link
                          href="/appointments"
                          title="অ্যাপয়েন্টমেন্ট ম্যানেজারে বিস্তারিত দেখুন"
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

      {/* Thermal Token Print Modal for Patient Serial Slip */}
      {selectedTokenApnt && (
        <ThermalTokenModal
          isOpen={isTokenModalOpen}
          onClose={() => {
            setIsTokenModalOpen(false);
            setSelectedTokenApnt(null);
          }}
          appointment={selectedTokenApnt}
          clinicSettings={clinicSettings}
        />
      )}
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
            href="/patients"
            className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-lg border border-white/20 transition flex items-center space-x-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>রোগী ও বিল তালিকা</span>
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

/* =========================================================================
   6. MARKETING OFFICER DASHBOARD COMPONENT (UNIQUE & FEATURE-RICH)
   ========================================================================= */
function MarketingOfficerDashboard({
  user,
  clinicSettings,
  todayStr,
}: any) {
  const [tasks, setTasks] = useState<MarketingTask[]>([]);
  const [reports, setReports] = useState<MarketingReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal: Submit Task Report
  const [taskToSubmit, setTaskToSubmit] = useState<MarketingTask | null>(null);
  const [submissionDrugHouses, setSubmissionDrugHouses] = useState<VisitedDrugHouse[]>([
    { name: '', proprietor: '', phone: '', address: '', drugPromoted: '', feedback: '' }
  ]);
  const [submissionNotes, setSubmissionNotes] = useState<string>('');
  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false);

  // Toaster State
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }>({
    show: false,
    type: 'success',
    title: '',
    message: '',
  });

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, type, title, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4500);
  };

  const triggerLiveSync = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('marketing_tasks_live_sync', Date.now().toString());
      window.dispatchEvent(new Event('marketing_tasks_data_changed'));
      try {
        const bc = new BroadcastChannel('dental_marketing_channel');
        bc.postMessage({ type: 'TASK_CHANGED', time: Date.now() });
        bc.close();
      } catch (e) {}
    }
  };

  const loadData = async (shouldPull: boolean = false) => {
    try {
      if (shouldPull && typeof navigator !== 'undefined' && navigator.onLine) {
        await syncEngine.pullUpdates().catch(() => {});
      }
      const [tsks, rpts] = await Promise.all([
        db.marketingTasks.reverse().toArray(),
        db.marketingReports.reverse().toArray(),
      ]);
      setTasks(tsks);
      setReports(rpts);
    } catch (err) {
      console.error('Failed to load marketing officer data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      loadData(true);
    }

    const handleSync = () => {
      loadData();
    };

    const unsubscribeData = syncEngine.onDataChange((collections) => {
      if (!collections || collections.includes('marketingTasks') || collections.includes('marketingReports')) {
        loadData();
      }
    });

    window.addEventListener('storage', handleSync);
    window.addEventListener('marketing_tasks_data_changed', handleSync);
    window.addEventListener('ifrad_data_changed', handleSync);
    window.addEventListener('focus', () => {
      if (navigator.onLine) loadData(true);
      else loadData();
    });

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('dental_marketing_channel');
      bc.onmessage = () => {
        loadData();
      };
    } catch (e) {}

    return () => {
      unsubscribeData();
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('marketing_tasks_data_changed', handleSync);
      window.removeEventListener('ifrad_data_changed', handleSync);
      window.removeEventListener('focus', handleSync);
      if (bc) bc.close();
    };
  }, []);

  // Filter tasks: Admin sees all tasks; Officers/Staff only see tasks assigned to them
  const myTasks = useMemo(() => {
    if (isAdmin) return tasks;
    if (!user) return [];

    const uName = (user.name || '').trim().toLowerCase();
    const uUsername = (user.username || '').trim().toLowerCase();
    const uEmpId = (user.employeeId || '').trim().toLowerCase();
    const uMobile = (user.mobile || '').replace(/[^0-9]/g, '');

    return tasks.filter((t) => {
      const tOfficerId = (t.officerId || '').trim().toLowerCase();
      const tOfficerName = (t.officerName || '').trim().toLowerCase();
      const tOfficerMobile = (t.officerMobile || '').replace(/[^0-9]/g, '');

      return (
        (uEmpId && tOfficerId === uEmpId) ||
        (uUsername && (tOfficerId === uUsername || tOfficerName === uUsername)) ||
        (uName && (tOfficerName === uName || tOfficerName.includes(uName) || uName.includes(tOfficerName))) ||
        (uMobile && tOfficerMobile && uMobile === tOfficerMobile)
      );
    });
  }, [tasks, user, isAdmin]);

  const displayTasks = isAdmin ? tasks : myTasks;

  // Compiled Pharmacy Directory
  const pharmaciesList = useMemo(() => {
    const map = new Map<string, { name: string; proprietor: string; phone: string; area: string; visits: number }>();
    reports.forEach((r) => {
      const key = r.phone?.trim() || r.drugHouseName?.toLowerCase().trim();
      if (!key) return;
      const cur = map.get(key) || { name: r.drugHouseName, proprietor: r.proprietorName || '', phone: r.phone || '', area: r.area || '', visits: 0 };
      cur.visits += 1;
      map.set(key, cur);
    });
    tasks.forEach((t) => {
      if (t.visitedDrugHouses) {
        t.visitedDrugHouses.forEach((d) => {
          const key = d.phone?.trim() || d.name?.toLowerCase().trim();
          if (!key) return;
          const cur = map.get(key) || { name: d.name, proprietor: d.proprietor || '', phone: d.phone || '', area: t.area || '', visits: 0 };
          cur.visits += 1;
          map.set(key, cur);
        });
      }
    });
    return Array.from(map.values());
  }, [reports, tasks]);

  // Submission Handlers
  const handleOpenSubmit = (task: MarketingTask) => {
    setTaskToSubmit(task);
    setSubmissionNotes(task.submittedNotes || '');
    if (task.visitedDrugHouses && task.visitedDrugHouses.length > 0) {
      setSubmissionDrugHouses(task.visitedDrugHouses);
    } else {
      setSubmissionDrugHouses([
        { name: '', proprietor: '', phone: '', address: '', drugPromoted: '', feedback: '' }
      ]);
    }
  };

  const handleAddDrugHouse = () => {
    setSubmissionDrugHouses((prev) => [
      ...prev,
      { name: '', proprietor: '', phone: '', address: '', drugPromoted: '', feedback: '' }
    ]);
  };

  const handleRemoveDrugHouse = (index: number) => {
    setSubmissionDrugHouses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrugHouseChange = (index: number, field: keyof VisitedDrugHouse, val: string) => {
    setSubmissionDrugHouses((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToSubmit) return;

    const validHouses = submissionDrugHouses.filter((h) => h.name.trim() !== '' && h.phone.trim() !== '');
    if (validHouses.length === 0) {
      alert('অনুগ্রহ করে অন্তত ১টি ফার্মেসির নাম ও ফোন নম্বর পূরণ করুন!');
      return;
    }

    setIsSubmittingTask(true);
    try {
      const now = new Date().toISOString();
      const updated: MarketingTask = {
        ...taskToSubmit,
        status: 'Submitted',
        submissionDate: new Date().toISOString().split('T')[0],
        submittedNotes: submissionNotes.trim(),
        visitedDrugHouses: validHouses,
        updatedAt: now,
      };

      await db.marketingTasks.put(updated);
      await syncEngine.logMutation('marketingTasks' as any, 'UPDATE', updated.id, updated);

      // Create reports entries
      for (const house of validHouses) {
        const repId = `mkt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const reportEntry: MarketingReport = {
          id: repId,
          officerId: taskToSubmit.officerId || user?.id || '',
          officerName: taskToSubmit.officerName || user?.name || 'মার্কেটিং অফিসার',
          officerMobile: taskToSubmit.officerMobile || '',
          date: updated.submissionDate || todayStr,
          area: taskToSubmit.area,
          drugHouseName: house.name,
          proprietorName: house.proprietor || '',
          phone: house.phone,
          address: house.address || '',
          drugName: house.drugPromoted || 'ডেন্টাল প্রোডাক্টস',
          quantitySold: 0,
          orderAmount: 0,
          paymentCollected: 0,
          dueAmount: 0,
          purpose: `টাস্ক ভিজিট: ${taskToSubmit.title}`,
          status: 'Completed',
          notes: house.feedback || '',
          createdAt: now,
          updatedAt: now,
        };
        await db.marketingReports.put(reportEntry);
        await syncEngine.logMutation('marketingReports' as any, 'INSERT', repId, reportEntry);
      }

      triggerLiveSync();
      setTaskToSubmit(null);
      await loadData();
      showToast('টাস্ক রিপোর্ট জমা হয়েছে! 🚀', 'অ্যাডমিনের অনুমোদনের জন্য পেন্ডিং রয়েছে। অনুমোদন সম্পন্ন হলে টাস্কটি কমপ্লিট হবে।', 'success');
    } catch (err) {
      console.error('Error submitting report:', err);
      showToast('ত্রুটি', 'রিপোর্ট জমা দিতে সমস্যা হয়েছে!', 'error');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const totalTasksCount = displayTasks.length;
  const activeMissionsCount = displayTasks.filter((t) => t.status === 'Assigned' || t.status === 'In_Progress').length;
  const pendingReviewCount = displayTasks.filter((t) => t.status === 'Submitted').length;
  const approvedCount = displayTasks.filter((t) => t.status === 'Approved').length;
  const rejectedCount = displayTasks.filter((t) => t.status === 'Rejected').length;
  const completedCount = pendingReviewCount + approvedCount;

  const totalTargetPharmacies = displayTasks.reduce((acc, t) => acc + (t.targetPharmaciesCount || 1), 0);
  const totalVisitedPharmacies = displayTasks.reduce((acc, t) => acc + (t.visitedDrugHouses ? t.visitedDrugHouses.length : 0), 0);

  const completionRate = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;
  const approvalRate = totalTasksCount > 0 ? Math.round((approvedCount / totalTasksCount) * 100) : 0;
  const pharmacyCoverageRate = totalTargetPharmacies > 0 ? Math.min(100, Math.round((totalVisitedPharmacies / totalTargetPharmacies) * 100)) : 0;

  return (
    <div className="p-3.5 sm:p-5 max-w-[1550px] mx-auto text-slate-800 space-y-4 text-xs font-sans relative">
      {/* =========================================================================
          TOASTER NOTIFICATION POPUP
          ========================================================================= */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 min-w-[320px] max-w-md ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-white border-emerald-700 shadow-emerald-900/40'
              : toast.type === 'error'
              ? 'bg-rose-950 text-white border-rose-700 shadow-rose-900/40'
              : 'bg-indigo-950 text-white border-indigo-700 shadow-indigo-900/40'
          }`}>
            <div className={`p-2 rounded-xl shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'
            }`}>
              {toast.type === 'success' ? <Check className="w-5 h-5" /> : toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div className="flex-1 pr-2">
              <h4 className="font-bold text-sm leading-tight text-white">{toast.title}</h4>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP MARKETING OFFICER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-4 border border-indigo-900/60 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center space-x-4 relative z-10">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-white/20">
            <Target className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                {clinicSettings?.clinicName || 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার'}
              </h1>
              <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3 h-3" />
                <span>মার্কেটিং অফিসার ড্যাশবোর্ড ও পারফরম্যান্স হাব</span>
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              স্বাগতম, <span className="font-bold text-white">{user?.name || 'মার্কেটিং অফিসার'}</span> | আপনার সকল ফিল্ড টাস্কের অগ্রগতি, কমপ্লিশন ও A to Z পারফরম্যান্স সামারি
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 relative z-10">
          <Link
            href="/all-tasks"
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center space-x-1.5 transition cursor-pointer"
          >
            <ClipboardList className="w-4 h-4" />
            <span>আমার সকল টাস্ক ও ফিল্ড রিপোর্ট (All Task)</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. STATS KPI GRID - 6 FOCUSED A TO Z CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Tasks */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3 hover:border-purple-300 transition">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[10px]">মোট নির্ধারিত টাস্ক</div>
            <div className="text-lg font-black font-mono text-purple-950">{totalTasksCount} টি</div>
          </div>
        </div>

        {/* Card 2: Completed / Approved */}
        <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-2xl border border-emerald-200 shadow-xs flex items-center space-x-3 hover:border-emerald-300 transition">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-emerald-800 font-bold text-[10px]">অনুমোদিত ও সম্পন্ন</div>
            <div className="text-lg font-black font-mono text-emerald-950">{approvedCount} টি</div>
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div className="bg-gradient-to-br from-amber-50 to-white p-4 rounded-2xl border border-amber-200 shadow-xs flex items-center space-x-3 hover:border-amber-300 transition">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-amber-800 font-bold text-[10px]">পেন্ডিং রিভিউ</div>
            <div className="text-lg font-black font-mono text-amber-950">{pendingReviewCount} টি</div>
          </div>
        </div>

        {/* Card 4: Active / In Progress */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3 hover:border-blue-300 transition">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[10px]">চলতি / বাকি টাস্ক</div>
            <div className="text-lg font-black font-mono text-blue-950">{activeMissionsCount} টি</div>
          </div>
        </div>

        {/* Card 5: Rejected / Revision */}
        <div className="bg-gradient-to-br from-rose-50 to-white p-4 rounded-2xl border border-rose-200 shadow-xs flex items-center space-x-3 hover:border-rose-300 transition">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-rose-800 font-bold text-[10px]">রিভিশন প্রয়োজন</div>
            <div className="text-lg font-black font-mono text-rose-950">{rejectedCount} টি</div>
          </div>
        </div>

        {/* Card 6: Visited Pharmacies */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3 hover:border-teal-300 transition">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[10px]">ফার্মেসি কাভারেজ</div>
            <div className="text-lg font-black font-mono text-teal-950">{totalVisitedPharmacies} / {totalTargetPharmacies} টি</div>
          </div>
        </div>
      </div>

      {/* 3. A TO Z PERFORMANCE & PROGRESS ANALYTICS HUB (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Detailed Task Completion & Status Analytics (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">টাস্ক কমপ্লিশন ও অগ্রগতি সারাংশ (Task Analytics)</h3>
                <p className="text-[11px] text-slate-500">আপনার ফিল্ড টাস্কের রিয়েল-টাইম কমপ্লিশন ও ভেরিফিকেশন রেট</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-purple-50 text-purple-900 border border-purple-200 rounded-full font-bold text-[11px]">
              সাকসেস রেট: {approvalRate}%
            </span>
          </div>

          {/* Progress Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Total Completion Bar */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">সাবমিশন ও সমাপ্তির হার:</span>
                <span className="font-mono font-black text-indigo-700">{completionRate}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>মোট সম্পন্ন: {completedCount} টি</span>
                <span>মোট টাস্ক: {totalTasksCount} টি</span>
              </div>
            </div>

            {/* Admin Approval Bar */}
            <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-emerald-900">অ্যাডমিন অনুমোদন হার:</span>
                <span className="font-mono font-black text-emerald-700">{approvalRate}%</span>
              </div>
              <div className="w-full h-3 bg-emerald-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                  style={{ width: `${approvalRate}%` }}
                />
              </div>
              <div className="text-[10px] text-emerald-700 flex justify-between">
                <span>অনুমোদিত: {approvedCount} টি</span>
                <span>অপেক্ষারত: {pendingReviewCount} টি</span>
              </div>
            </div>
          </div>

          {/* Status Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center space-y-0.5">
              <div className="text-[11px] font-bold text-emerald-800">অনুমোদিত</div>
              <div className="text-base font-black font-mono text-emerald-950">{approvedCount} টি</div>
              <div className="text-[10px] text-emerald-700 font-semibold">{totalTasksCount > 0 ? Math.round((approvedCount / totalTasksCount) * 100) : 0}%</div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-center space-y-0.5">
              <div className="text-[11px] font-bold text-amber-800">রিভিউ চলছে</div>
              <div className="text-base font-black font-mono text-amber-950">{pendingReviewCount} টি</div>
              <div className="text-[10px] text-amber-700 font-semibold">{totalTasksCount > 0 ? Math.round((pendingReviewCount / totalTasksCount) * 100) : 0}%</div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-center space-y-0.5">
              <div className="text-[11px] font-bold text-blue-800">চলতি ও বাকি</div>
              <div className="text-base font-black font-mono text-blue-950">{activeMissionsCount} টি</div>
              <div className="text-[10px] text-blue-700 font-semibold">{totalTasksCount > 0 ? Math.round((activeMissionsCount / totalTasksCount) * 100) : 0}%</div>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl text-center space-y-0.5">
              <div className="text-[11px] font-bold text-rose-800">সংশোধন প্রয়োজন</div>
              <div className="text-base font-black font-mono text-rose-950">{rejectedCount} টি</div>
              <div className="text-[10px] text-rose-700 font-semibold">{totalTasksCount > 0 ? Math.round((rejectedCount / totalTasksCount) * 100) : 0}%</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">টাস্কের বিবরণ দেখতে ও ফিল্ড রিপোর্ট সাবমিট করতে চান?</span>
            <Link
              href="/all-tasks"
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl font-bold text-xs flex items-center gap-1 transition"
            >
              <span>সকল টাস্ক ও রিপোর্ট জমা দিন</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: Field Coverage & Pharmacy Analytics (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">ফার্মেসি কাভারেজ ও ফিল্ড রিচ</h3>
                  <p className="text-[11px] text-slate-500">টার্গেট অনুযায়ী মোট ভিজিট ও ডাটাবেজ স্থিতি</p>
                </div>
              </div>
            </div>

            {/* Target vs Achieved Pharmacy Bar */}
            <div className="p-3.5 bg-teal-50/50 rounded-2xl border border-teal-200/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-teal-950">ফার্মেসি টার্গেট অর্জনের হার:</span>
                <span className="font-mono font-black text-teal-700">{pharmacyCoverageRate}%</span>
              </div>
              <div className="w-full h-3 bg-teal-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${pharmacyCoverageRate}%` }}
                />
              </div>
              <div className="text-[10px] text-teal-800 flex justify-between">
                <span>ভিজিট সম্পন্ন: {totalVisitedPharmacies} টি</span>
                <span>নির্ধারিত টার্গেট: {totalTargetPharmacies} টি</span>
              </div>
            </div>

            {/* Summary Highlights */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div className="text-[10px] text-slate-500 font-bold">সংগৃহীত ড্রাগ হাউজ</div>
                <div className="text-base font-black font-mono text-slate-900 mt-0.5">{pharmaciesList.length} টি</div>
                <div className="text-[10px] text-slate-500">ফোনবুকে সক্রিয়</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div className="text-[10px] text-slate-500 font-bold">গড় ফার্মেসি / টাস্ক</div>
                <div className="text-base font-black font-mono text-slate-900 mt-0.5">
                  {totalTasksCount > 0 ? (totalVisitedPharmacies / totalTasksCount).toFixed(1) : '0.0'} টি
                </div>
                <div className="text-[10px] text-slate-500">প্রতি টাস্কে অর্জিত</div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">মার্কেটিং অফিসার ফিল্ড স্ট্যাটাস:</span>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px] border border-emerald-300">
              সক্রিয় ও রেগুলার
            </span>
          </div>
        </div>
      </div>

      {/* 4. RECENT SUBMISSIONS & FIELD ACTIVITY SUMMARY TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">টাস্ক তালিকা ও রিসেন্ট সাবমিশন স্ট্যাটাস (A to Z Summary)</h3>
              <p className="text-[11px] text-slate-500">আপনার সাম্প্রতিক ফিল্ড টাস্কের ভেরিফিকেশন ও স্ট্যাটাস ওভারভিউ</p>
            </div>
          </div>

          <Link
            href="/all-tasks"
            className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs rounded-xl border border-purple-200 flex items-center gap-1 transition"
          >
            <span>সম্পূর্ণ টাস্ক লিস্ট (All Task)</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <DentalLoadingSpinner
            size="md"
            text="অফিসার ফিল্ড সামারি লোড হচ্ছে..."
            subtext="ক্লাউড সার্ভার থেকে ডেটা সংগ্রহ করা হচ্ছে..."
            cardMode={true}
          />
        ) : displayTasks.length === 0 ? (
          <div className="py-10 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Target className="w-10 h-10 mx-auto mb-2 opacity-40 text-purple-600" />
            <h4 className="text-sm font-bold text-slate-800">বর্তমানে কোনো টাস্ক অ্যাসাইন করা নেই</h4>
            <p className="text-xs text-slate-500 mt-0.5">অ্যাডমিন নতুন টাস্ক দিলে এখানে লাইভ সারাংশ দেখতে পাবেন।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-bold">
                  <th className="p-3">টাস্কের শিরোনাম</th>
                  <th className="p-3">টার্গেট এলাকা</th>
                  <th className="p-3 text-center">ফার্মেসি টার্গেট</th>
                  <th className="p-3">অ্যাসাইন তারিখ</th>
                  <th className="p-3">শেষ তারিখ (Deadline)</th>
                  <th className="p-3">সাবমিট তারিখ</th>
                  <th className="p-3 text-center">বর্তমান অবস্থা</th>
                  <th className="p-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayTasks.slice(0, 8).map((task) => {
                  const isPending = task.status === 'Submitted';
                  const isApproved = task.status === 'Approved';
                  const isRejected = task.status === 'Rejected';
                  const isAssigned = task.status === 'Assigned' || task.status === 'In_Progress';

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            isApproved ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : isRejected ? 'bg-rose-500' : 'bg-blue-500'
                          }`} />
                          <span className="truncate max-w-[220px]" title={task.title}>{task.title}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-900 rounded-md font-semibold text-[11px] border border-indigo-100 flex items-center gap-1 w-fit">
                          <MapPin className="w-3 h-3 text-indigo-600" />
                          <span>{task.area}</span>
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={task.visitedDrugHouses && task.visitedDrugHouses.length >= (task.targetPharmaciesCount || 1) ? 'text-emerald-700' : 'text-slate-700'}>
                          {task.visitedDrugHouses ? task.visitedDrugHouses.length : 0} / {task.targetPharmaciesCount || 1}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600 text-[11px]">{task.assignedDate || '-'}</td>
                      <td className="p-3 font-mono font-bold text-rose-700 text-[11px]">{task.dueDate || '-'}</td>
                      <td className="p-3 font-mono text-slate-600 text-[11px]">
                        {task.submissionDate ? (
                          <span className="text-emerald-800 font-bold">{task.submissionDate}</span>
                        ) : (
                          <span className="text-slate-400">সাবমিট হয়নি</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                          isPending
                            ? 'bg-amber-100 text-amber-950 border border-amber-300 animate-pulse'
                            : isApproved
                            ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                            : isRejected
                            ? 'bg-rose-100 text-rose-900 border border-rose-200'
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}>
                          {isPending && <Clock className="w-3 h-3" />}
                          {isApproved && <CheckCircle2 className="w-3 h-3" />}
                          {isRejected && <AlertCircle className="w-3 h-3" />}
                          <span>
                            {isPending ? 'পেন্ডিং রিভিউ' : isApproved ? 'অনুমোদিত' : isRejected ? 'রিভিশন প্রয়োজন' : 'চলমান'}
                          </span>
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {(isAssigned || isRejected) ? (
                          <button
                            type="button"
                            onClick={() => handleOpenSubmit(task)}
                            className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition shadow-2xs cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>রিপোর্ট জমা</span>
                          </button>
                        ) : (
                          <Link
                            href="/all-tasks"
                            className="px-2.5 py-1 text-indigo-700 hover:bg-indigo-50 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1"
                          >
                            <span>বিস্তারিত</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. SMART PHARMACY QUICK PHONEBOOK & MARKETING TIPS */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column: Smart Pharmacy Phonebook (7 cols) */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Store className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">স্মার্ট ফার্মেসি ফোনবুক (Quick Call & WhatsApp)</h3>
            </div>
            <span className="text-xs text-slate-500 font-bold">
              মোট: {pharmaciesList.length} টি
            </span>
          </div>

          {pharmaciesList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              কোনো ফার্মেসি তথ্য পাওয়া যায়নি। টাস্ক সাবমিটের পর এখানে প্রদর্শিত হবে।
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {pharmaciesList.slice(0, 6).map((pharmacy, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900">{pharmacy.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {pharmacy.proprietor || 'মালিক'} • <span className="text-indigo-700 font-medium">{pharmacy.area || 'এলাকা'}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {pharmacy.phone && (
                      <>
                        <a
                          href={`tel:${pharmacy.phone}`}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] flex items-center gap-1 transition shadow-2xs"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>কল</span>
                        </a>
                        <a
                          href={`https://wa.me/880${pharmacy.phone.replace(/[^0-9]/g, '').replace(/^0+/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-[11px] flex items-center gap-1 transition shadow-2xs"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Quick Marketing Tips & Shortcuts (5 cols) */}
        <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 rounded-3xl border border-indigo-100 p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-indigo-100">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-sm text-slate-900">মার্কেটিং ফিল্ড গাইড ও টিপস</h3>
            </div>

            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span>ভিজিটের সময় ড্রাগ হাউজের সঠিক প্রোপ্রাইটর ও মোবাইল নম্বর সংগ্রহ করুন।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>ইফরা ডেন্টালের সেবা, ডাক্তার অ্যাপয়েন্টমেন্ট ও প্রেসক্রিপশন সুবিধা তুলে ধরুন।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>টাস্ক সম্পন্ন হলে সাথে সাথে রিপোর্ট সাবমিট করুন যাতে অ্যাডমিন ভেরিফাই করতে পারে।</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 mt-4 border-t border-indigo-100">
            <Link
              href="/all-tasks"
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <ClipboardList className="w-4 h-4" />
              <span>সকল টাস্ক ও ফিল্ড রিপোর্ট ম্যানেজ করুন</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL: SUBMIT TASK REPORT
          ========================================================================= */}
      {taskToSubmit && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  ফিল্ড টাস্ক সাবমিশন
                </span>
                <h3 className="text-base font-bold mt-1">{taskToSubmit.title}</h3>
                <p className="text-xs text-blue-200">এরিয়া: {taskToSubmit.area} | টার্গেট: {taskToSubmit.targetPharmaciesCount} টি</p>
              </div>
              <button
                type="button"
                onClick={() => setTaskToSubmit(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-800 text-sm">ভিজিটকৃত ফার্মেসি ও ড্রাগ হাউজ সমূহ:</span>
                <button
                  type="button"
                  onClick={handleAddDrugHouse}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ আরো ফার্মেসি যোগ করুন</span>
                </button>
              </div>

              {submissionDrugHouses.map((house, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 font-mono text-xs">#{idx + 1} ফার্মেসি তথ্য</span>
                    {submissionDrugHouses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDrugHouse(idx)}
                        className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                        title="রিমুভ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">ফার্মেসির নাম *</label>
                      <input
                        type="text"
                        required
                        value={house.name}
                        onChange={(e) => handleDrugHouseChange(idx, 'name', e.target.value)}
                        placeholder="যেমন: তামান্না ড্রাগ হাউজ"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">মোবাইল নম্বর *</label>
                      <input
                        type="tel"
                        required
                        value={house.phone}
                        onChange={(e) => handleDrugHouseChange(idx, 'phone', e.target.value)}
                        placeholder="017XXXXXXXX"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">মালিকের নাম</label>
                      <input
                        type="text"
                        value={house.proprietor}
                        onChange={(e) => handleDrugHouseChange(idx, 'proprietor', e.target.value)}
                        placeholder="প্রোপ্রাইটর নাম"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">প্রচারিত ড্রাগ / প্রোডাক্ট</label>
                      <input
                        type="text"
                        value={house.drugPromoted}
                        onChange={(e) => handleDrugHouseChange(idx, 'drugPromoted', e.target.value)}
                        placeholder="যেমন: ডেন্টাল পেস্ট, মাউথওয়াশ"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div>
                <label className="block font-bold text-slate-700 mb-1">ভিজিট সামারি ও নোট</label>
                <textarea
                  rows={2}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="ফিল্ড ভিজিটের ফলাফল বা সামগ্রিক নোট..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTaskToSubmit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingTask ? 'সাবমিট হচ্ছে...' : 'অ্যাডমিন অনুমোদনের জন্য জমা দিন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

