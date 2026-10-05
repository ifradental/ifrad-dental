'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  MapPin, 
  Phone, 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Filter, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Eye,
  Trash2,
  Edit3,
  Send,
  Users,
  Store,
  Pill,
  ChevronRight,
  Sparkles,
  Award,
  Layers,
  Check,
  X,
  Target,
  UserCheck,
  RotateCcw,
  ClipboardList,
  PhoneCall,
  MessageCircle,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { db, type MarketingReport, type MarketingTask, type VisitedDrugHouse, type Employee, type Patient, type TaskCategory } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import { DentalLoadingSpinner } from '@/components/DentalLoadingSpinner';

interface ToastState {
  show: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export default function MarketingOfficerClient() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'tasks' | 'reports' | 'officers'>('tasks');
  const [reports, setReports] = useState<MarketingReport[]>([]);
  const [tasks, setTasks] = useState<MarketingTask[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin';

  // Toaster State
  const [toast, setToast] = useState<ToastState>({
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

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'Pharmacy' | 'Patient' | 'Custom'>('ALL');

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'TOMORROW' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Date Helpers
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getThisWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(new Date().setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dt = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dt}`;
    };
    return { start: fmt(monday), end: fmt(sunday) };
  };

  const getThisMonthRange = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    return {
      start: `${y}-${m}-01`,
      end: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
    };
  };

  const isTaskInDateRange = (task: MarketingTask, sDate?: string, eDate?: string) => {
    if (!sDate && !eDate) return true;
    const dates: string[] = [];
    if (task.dueDate) dates.push(task.dueDate.substring(0, 10));
    if (task.assignedDate) dates.push(task.assignedDate.substring(0, 10));
    if (task.submissionDate) dates.push(task.submissionDate.substring(0, 10));
    if (task.createdAt) dates.push(task.createdAt.substring(0, 10));

    return dates.some((d) => {
      if (sDate && eDate) return d >= sDate && d <= eDate;
      if (sDate) return d >= sDate;
      if (eDate) return d <= eDate;
      return true;
    });
  };

  // Modal 1: Assign Multiple Tasks Modal
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [isSavingTask, setIsSavingTask] = useState<boolean>(false);

  // 3 Task Categories: Pharmacy | Patient | Custom
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('Pharmacy');

  // Common Header Assignment Settings (Top Header)
  const [batchOfficerId, setBatchOfficerId] = useState<string>('');
  const [batchOfficerName, setBatchOfficerName] = useState<string>('');
  const [batchOfficerMobile, setBatchOfficerMobile] = useState<string>('');
  const [batchArea, setBatchArea] = useState<string>('');
  const [batchAssignedDate, setBatchAssignedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [batchDueDate, setBatchDueDate] = useState<string>(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [batchPriority, setBatchPriority] = useState<'High' | 'Medium' | 'Normal'>('High');
  const [batchTargetPharmaciesCount, setBatchTargetPharmaciesCount] = useState<string>('');
  const [targetDrugName, setTargetDrugName] = useState<string>('');
  const [batchPharmacyName, setBatchPharmacyName] = useState<string>('');

  // Patient-specific state
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [patientMobile, setPatientMobile] = useState<string>('');
  const [patientAddress, setPatientAddress] = useState<string>('');
  const [patientNotes, setPatientNotes] = useState<string>('');

  interface TaskItem {
    id: string;
    title: string;
    description: string;
  }

  const createEmptyTaskItem = (): TaskItem => ({
    id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: '',
    description: '',
  });

  const [taskItems, setTaskItems] = useState<TaskItem[]>([createEmptyTaskItem()]);
  const [modalSuccessNotice, setModalSuccessNotice] = useState<string | null>(null);

  // Modal 2: Submit Report Modal
  const [taskToSubmit, setTaskToSubmit] = useState<MarketingTask | null>(null);
  const [submissionDrugHouses, setSubmissionDrugHouses] = useState<VisitedDrugHouse[]>([
    { name: '', proprietor: '', phone: '', address: '', drugPromoted: '', feedback: '' }
  ]);
  const [submissionNotes, setSubmissionNotes] = useState<string>('');
  const [submissionTargetPharmaciesCount, setSubmissionTargetPharmaciesCount] = useState<string>('1');
  const [submissionPharmacyName, setSubmissionPharmacyName] = useState<string>('');
  const [submissionTargetDrugName, setSubmissionTargetDrugName] = useState<string>('');
  const [submissionArea, setSubmissionArea] = useState<string>('');
  const [submissionPatientId, setSubmissionPatientId] = useState<string>('');
  const [submissionPatientName, setSubmissionPatientName] = useState<string>('');
  const [submissionPatientMobile, setSubmissionPatientMobile] = useState<string>('');
  const [submissionPatientAddress, setSubmissionPatientAddress] = useState<string>('');
  const [submissionPatientNotes, setSubmissionPatientNotes] = useState<string>('');
  const [patientOutcome, setPatientOutcome] = useState<string>('');
  const [customOutcome, setCustomOutcome] = useState<string>('');
  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false);

  const handleSelectSubmissionPatient = (pId: string) => {
    setSubmissionPatientId(pId);
    const p = patientsList.find((pt) => pt.id === pId);
    if (p) {
      setSubmissionPatientName(p.name || '');
      setSubmissionPatientMobile(p.mobile || '');
      setSubmissionPatientAddress(p.address || '');
    }
  };

  // Modal 3: View Details
  const [viewingTask, setViewingTask] = useState<MarketingTask | null>(null);

  // Live Sync Trigger
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

  const [isSyncingData, setIsSyncingData] = useState<boolean>(false);

  const loadData = async (shouldPull: boolean = false) => {
    try {
      if (shouldPull && typeof navigator !== 'undefined' && navigator.onLine) {
        setIsSyncingData(true);
        await syncEngine.pullUpdates().catch(() => {});
        setIsSyncingData(false);
      }
      const [allReports, allTasks, allEmployees, allPatients] = await Promise.all([
        db.marketingReports.reverse().toArray(),
        db.marketingTasks.reverse().toArray(),
        db.employees.toArray(),
        db.patients.toArray(),
      ]);
      setReports(allReports);
      setTasks(allTasks);
      setEmployees(allEmployees);
      setPatientsList(allPatients);
    } catch (err) {
      console.error('Failed to load marketing officer data:', err);
    } finally {
      setIsLoading(false);
      setIsSyncingData(false);
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
      if (!collections || collections.includes('marketingTasks') || collections.includes('marketingReports') || collections.includes('employees') || collections.includes('patients')) {
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

  // Role-based visibility: Admins see all tasks & reports; Officers only see their own
  const visibleTasks = useMemo(() => {
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

  const visibleReports = useMemo(() => {
    if (isAdmin) return reports;
    if (!user) return [];

    const uName = (user.name || '').trim().toLowerCase();
    const uUsername = (user.username || '').trim().toLowerCase();
    const uEmpId = (user.employeeId || '').trim().toLowerCase();
    const uMobile = (user.mobile || '').replace(/[^0-9]/g, '');

    return reports.filter((r) => {
      const rOfficerId = (r.officerId || '').trim().toLowerCase();
      const rOfficerName = (r.officerName || '').trim().toLowerCase();
      const rOfficerMobile = (r.officerMobile || '').replace(/[^0-9]/g, '');

      return (
        (uEmpId && rOfficerId === uEmpId) ||
        (uUsername && (rOfficerId === uUsername || rOfficerName === uUsername)) ||
        (uName && (rOfficerName === uName || rOfficerName.includes(uName) || uName.includes(rOfficerName))) ||
        (uMobile && rOfficerMobile && uMobile === rOfficerMobile)
      );
    });
  }, [reports, user, isAdmin]);

  // Filter Marketing Tasks
  const filteredTasks = useMemo(() => {
    const todayStr = getTodayStr();
    const tomorrowStr = getTomorrowStr();
    const weekRange = getThisWeekRange();
    const monthRange = getThisMonthRange();

    return visibleTasks.filter((task) => {
      if (selectedCategory !== 'ALL') {
        const cat = task.category || 'Pharmacy';
        if (cat !== selectedCategory) return false;
      }
      if (selectedStatus !== 'ALL' && task.status !== selectedStatus) return false;
      if (isAdmin && selectedOfficer !== 'ALL') {
        if (task.officerId !== selectedOfficer && task.officerName !== selectedOfficer) return false;
      }
      if (selectedArea !== 'ALL' && task.area !== selectedArea) return false;

      // Date filtering
      if (dateFilter === 'TODAY') {
        if (!isTaskInDateRange(task, todayStr, todayStr)) return false;
      } else if (dateFilter === 'TOMORROW') {
        if (!isTaskInDateRange(task, tomorrowStr, tomorrowStr)) return false;
      } else if (dateFilter === 'THIS_WEEK') {
        if (!isTaskInDateRange(task, weekRange.start, weekRange.end)) return false;
      } else if (dateFilter === 'THIS_MONTH') {
        if (!isTaskInDateRange(task, monthRange.start, monthRange.end)) return false;
      } else if (dateFilter === 'CUSTOM' || startDate || endDate) {
        if (!isTaskInDateRange(task, startDate, endDate)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mTitle = task.title.toLowerCase().includes(q);
        const mArea = task.area.toLowerCase().includes(q);
        const mOfficer = task.officerName.toLowerCase().includes(q);
        const mDesc = task.description?.toLowerCase().includes(q);
        if (!mTitle && !mArea && !mOfficer && !mDesc) return false;
      }
      return true;
    });
  }, [visibleTasks, selectedCategory, selectedStatus, selectedOfficer, selectedArea, dateFilter, startDate, endDate, searchQuery, isAdmin]);

  // Category Counts
  const pharmacyTasksCount = useMemo(() => visibleTasks.filter((t) => !t.category || t.category === 'Pharmacy').length, [visibleTasks]);
  const patientTasksCount = useMemo(() => visibleTasks.filter((t) => t.category === 'Patient').length, [visibleTasks]);
  const customTasksCount = useMemo(() => visibleTasks.filter((t) => t.category === 'Custom').length, [visibleTasks]);

  // Unique Areas
  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    visibleTasks.forEach((t) => t.area && set.add(t.area));
    visibleReports.forEach((r) => r.area && set.add(r.area));
    return Array.from(set);
  }, [visibleTasks, visibleReports]);

  // KPI Metrics
  const totalTasksCount = visibleTasks.length;
  const inProgressTasksCount = visibleTasks.filter((t) => t.status === 'Assigned' || t.status === 'In_Progress').length;
  const pendingApprovalCount = visibleTasks.filter((t) => t.status === 'Submitted').length;
  const approvedTasksCount = visibleTasks.filter((t) => t.status === 'Approved').length;

  const totalCollectedAmount = useMemo(() => {
    return visibleReports.reduce((acc, curr) => acc + (Number(curr.paymentCollected) || 0), 0);
  }, [visibleReports]);

  // Date Counts
  const todayTasksCount = useMemo(() => {
    const td = getTodayStr();
    return visibleTasks.filter((t) => isTaskInDateRange(t, td, td)).length;
  }, [visibleTasks]);

  const tomorrowTasksCount = useMemo(() => {
    const tm = getTomorrowStr();
    return visibleTasks.filter((t) => isTaskInDateRange(t, tm, tm)).length;
  }, [visibleTasks]);

  const thisWeekTasksCount = useMemo(() => {
    const wr = getThisWeekRange();
    return visibleTasks.filter((t) => isTaskInDateRange(t, wr.start, wr.end)).length;
  }, [visibleTasks]);

  const thisMonthTasksCount = useMemo(() => {
    const mr = getThisMonthRange();
    return visibleTasks.filter((t) => isTaskInDateRange(t, mr.start, mr.end)).length;
  }, [visibleTasks]);

  // Actions
  const handleOpenAssignModal = () => {
    setTaskCategory('Pharmacy');
    setSelectedPatientId('');
    setPatientName('');
    setPatientMobile('');
    setPatientAddress('');
    setPatientNotes('');
    setTargetDrugName('');
    setBatchPharmacyName('');
    setBatchOfficerId('');
    setBatchOfficerName('');
    setBatchOfficerMobile('');
    setBatchArea('');
    setBatchAssignedDate(new Date().toISOString().split('T')[0]);
    setBatchDueDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setBatchPriority('High');
    setBatchTargetPharmaciesCount('');
    setTaskItems([createEmptyTaskItem()]);
    setModalSuccessNotice(null);
    setShowAssignModal(true);
  };

  const handleSelectPatient = (pId: string) => {
    setSelectedPatientId(pId);
    if (!pId) return;
    const p = patientsList.find((pat) => pat.id === pId || String(pat.regNo) === pId);
    if (p) {
      setPatientName(p.name);
      setPatientMobile(p.mobile || '');
      setPatientAddress(p.address || '');
      if (p.address) {
        setBatchArea(p.address);
      }
      setTaskItems([{
        id: `temp_${Date.now()}`,
        title: `${p.name} - ফলো-আপ ও পেশেন্ট ভিজিট`,
        description: `রোগীর মোবাইল: ${p.mobile || 'নেই'} | ঠিকানা: ${p.address || 'ক্লিনিক এরিয়া'}`
      }]);
    }
  };

  const handleAddTaskRow = () => {
    setTaskItems((prev) => [...prev, createEmptyTaskItem()]);
  };

  const handleRemoveTaskRow = (index: number) => {
    if (taskItems.length <= 1) return;
    setTaskItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTaskFieldChange = (index: number, field: keyof TaskItem, value: any) => {
    setModalSuccessNotice(null);
    setTaskItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveAssignedTask = async (e?: React.FormEvent, andAddMore: boolean = false) => {
    if (e) e.preventDefault();

    // Validate Common Batch Header
    if (!batchOfficerId && !batchOfficerName) {
      alert('অনুগ্রহ করে একজন অফিসার বা কর্মী নির্বাচন করুন!');
      return;
    }
    if (!batchArea.trim() && taskCategory !== 'Patient') {
      alert('টার্গেট এরিয়া / এলাকার নাম দিন!');
      return;
    }

    // Validate each task in batch
    for (let i = 0; i < taskItems.length; i++) {
      const item = taskItems[i];
      if (!item.title.trim()) {
        alert(`টাস্ক #${i + 1} এর শিরোনাম দিন!`);
        return;
      }
    }

    setIsSavingTask(true);
    try {
      const now = new Date().toISOString();
      const savedTasks: MarketingTask[] = [];

      for (let i = 0; i < taskItems.length; i++) {
        const item = taskItems[i];
        const newTaskId = `task_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
        const newTask: MarketingTask = {
          id: newTaskId,
          category: taskCategory,
          title: item.title.trim(),
          description: item.description.trim(),
          area: batchArea.trim() || patientAddress.trim() || 'সাধারণ এলাকা',
          officerId: batchOfficerId,
          officerName: batchOfficerName,
          officerMobile: batchOfficerMobile,
          assignedBy: user?.name || 'Master Admin',
          assignedDate: batchAssignedDate || new Date().toISOString().split('T')[0],
          dueDate: batchDueDate || new Date().toISOString().split('T')[0],
          priority: batchPriority,
          targetPharmaciesCount: taskCategory === 'Pharmacy' ? (Number(batchTargetPharmaciesCount) || 1) : undefined,
          targetDrugName: taskCategory === 'Pharmacy' ? targetDrugName.trim() : undefined,
          pharmacyName: taskCategory === 'Pharmacy' ? (batchPharmacyName.trim() || undefined) : undefined,
          status: 'Assigned',
          createdAt: now,
          updatedAt: now,
        };

        await db.marketingTasks.put(newTask);
        await syncEngine.logMutation('marketingTasks' as any, 'INSERT', newTask.id, newTask);
        savedTasks.push(newTask);

        logActivity({
          action: 'ASSIGN_MARKETING_TASK',
          module: 'Employee',
          description: `নতুন ${taskCategory === 'Patient' ? 'রোগী' : taskCategory === 'Pharmacy' ? 'ফার্মেসি' : 'কাস্টম'} টাস্ক তৈরি: "${newTask.title}" -> ${newTask.officerName}`,
          metadata: { taskId: newTask.id, officer: newTask.officerName, category: taskCategory },
          user: user || undefined,
        });
      }

      triggerLiveSync();
      await loadData();

      if (andAddMore) {
        setTaskItems([createEmptyTaskItem()]);
        setModalSuccessNotice(`✓ পূর্ববর্তী টাস্কটি (${savedTasks.length}টি) সফলভাবে তৈরি হয়েছে! এখন এখান থেকেই পরবর্তী টাস্ক যোগ করুন:`);
        showToast(
          'টাস্ক সংরক্ষিত হয়েছে! 🎯',
          `${savedTasks.length}টি টাস্ক তৈরি হয়েছে। এই কর্মীর জন্য আরও টাস্ক যোগ করতে পারেন বা নতুন কর্মী নির্বাচন করুন।`,
          'success'
        );
      } else {
        setShowAssignModal(false);
        handleOpenAssignModal();
        showToast(
          'টাস্ক অ্যাসাইন সফল হয়েছে! 🎯',
          `${savedTasks.length}টি টাস্ক সফলভাবে তৈরি ও অ্যাসাইন করা হয়েছে।`,
          'success'
        );
      }
    } catch (err) {
      console.error('Error saving tasks:', err);
      showToast('ত্রুটি', 'টাস্ক তৈরিতে সমস্যা হয়েছে!', 'error');
    } finally {
      setIsSavingTask(false);
    }
  };

  // Submit Report
  const handleOpenSubmitTask = (task: MarketingTask) => {
    setTaskToSubmit(task);
    setSubmissionNotes(task.submittedNotes || '');
    setPatientOutcome(task.patientOutcome || '');
    setCustomOutcome(task.customOutcome || '');
    setSubmissionArea(task.area || '');
    setSubmissionPharmacyName(task.pharmacyName || '');
    setSubmissionTargetDrugName(task.targetDrugName || '');
    setSubmissionTargetPharmaciesCount(task.targetPharmaciesCount ? String(task.targetPharmaciesCount) : '1');
    setSubmissionPatientId(task.patientId || '');
    setSubmissionPatientName(task.patientName || '');
    setSubmissionPatientMobile(task.patientMobile || '');
    setSubmissionPatientAddress(task.patientAddress || '');
    setSubmissionPatientNotes(task.patientNotes || '');
    if (task.visitedDrugHouses && task.visitedDrugHouses.length > 0) {
      setSubmissionDrugHouses(task.visitedDrugHouses);
    } else {
      setSubmissionDrugHouses([
        { name: task.pharmacyName || '', proprietor: '', phone: '', address: '', drugPromoted: task.targetDrugName || '', feedback: '' }
      ]);
    }
  };

  const handleAddDrugHouseRow = () => {
    setSubmissionDrugHouses((prev) => [
      ...prev,
      { name: '', proprietor: '', phone: '', address: '', drugPromoted: '', feedback: '' }
    ]);
  };

  const handleRemoveDrugHouseRow = (index: number) => {
    setSubmissionDrugHouses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrugHouseChange = (index: number, field: keyof VisitedDrugHouse, val: string) => {
    setSubmissionDrugHouses((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmitTaskReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToSubmit) return;

    const taskCat = taskToSubmit.category || 'Pharmacy';

    if (taskCat === 'Pharmacy') {
      const validHouses = submissionDrugHouses.filter((h) => h.name.trim() !== '' && h.phone.trim() !== '');
      if (validHouses.length === 0) {
        alert('অনুগ্রহ করে অন্তত ১টি ফার্মেসির নাম ও ফোন নম্বর পূরণ করুন!');
        return;
      }
    } else if (taskCat === 'Patient') {
      if (!submissionPatientName.trim()) {
        alert('অনুগ্রহ করে রোগীর নাম লিখুন!');
        return;
      }
      if (!submissionPatientMobile.trim()) {
        alert('অনুগ্রহ করে রোগীর মোবাইল নম্বর লিখুন!');
        return;
      }
      if (!patientOutcome.trim()) {
        alert('রোগীর সাথে কথা বা ভিজিটের ফলাফল ও প্রতিক্রিয়া লিখুন!');
        return;
      }
    } else if (taskCat === 'Custom') {
      if (!customOutcome.trim()) {
        alert('কাস্টম কাজের বিবরণ ও ফলাফল লিখুন!');
        return;
      }
    }

    setIsSubmittingTask(true);
    try {
      const now = new Date().toISOString();
      const validHouses = submissionDrugHouses.filter((h) => h.name.trim() !== '' && h.phone.trim() !== '');

      const updatedTask: MarketingTask = {
        ...taskToSubmit,
        area: submissionArea.trim() || taskToSubmit.area,
        pharmacyName: taskCat === 'Pharmacy' ? (submissionPharmacyName.trim() || undefined) : taskToSubmit.pharmacyName,
        targetDrugName: taskCat === 'Pharmacy' ? (submissionTargetDrugName.trim() || undefined) : taskToSubmit.targetDrugName,
        targetPharmaciesCount: taskCat === 'Pharmacy' ? (Number(submissionTargetPharmaciesCount) || taskToSubmit.targetPharmaciesCount || 1) : taskToSubmit.targetPharmaciesCount,
        patientId: taskCat === 'Patient' ? (submissionPatientId || undefined) : taskToSubmit.patientId,
        patientName: taskCat === 'Patient' ? (submissionPatientName.trim() || undefined) : taskToSubmit.patientName,
        patientMobile: taskCat === 'Patient' ? (submissionPatientMobile.trim() || undefined) : taskToSubmit.patientMobile,
        patientAddress: taskCat === 'Patient' ? (submissionPatientAddress.trim() || undefined) : taskToSubmit.patientAddress,
        patientNotes: taskCat === 'Patient' ? (submissionPatientNotes.trim() || undefined) : taskToSubmit.patientNotes,
        status: 'Submitted',
        submissionDate: new Date().toISOString().split('T')[0],
        submittedNotes: submissionNotes.trim(),
        visitedDrugHouses: taskCat === 'Pharmacy' ? validHouses : undefined,
        patientOutcome: taskCat === 'Patient' ? patientOutcome.trim() : undefined,
        customOutcome: taskCat === 'Custom' ? customOutcome.trim() : undefined,
        updatedAt: now,
      };

      await db.marketingTasks.put(updatedTask);
      await syncEngine.logMutation('marketingTasks' as any, 'UPDATE', updatedTask.id, updatedTask);

      if (taskCat === 'Pharmacy' && validHouses.length > 0) {
        for (const house of validHouses) {
          const repId = `mkt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          const reportEntry: MarketingReport = {
            id: repId,
            officerId: taskToSubmit.officerId,
            officerName: taskToSubmit.officerName,
            officerMobile: taskToSubmit.officerMobile,
            date: updatedTask.submissionDate || new Date().toISOString().split('T')[0],
            area: taskToSubmit.area,
            drugHouseName: house.name,
            proprietorName: house.proprietor || '',
            phone: house.phone,
            address: house.address || '',
            drugName: house.drugPromoted || taskToSubmit.targetDrugName || 'ডেন্টাল প্রোডাক্টস',
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
      }

      triggerLiveSync();
      setTaskToSubmit(null);
      await loadData();
      showToast('টাস্ক রিপোর্ট জমা হয়েছে! 🚀', 'অ্যাডমিন অনুমোদনের জন্য পেন্ডিং রয়েছে।', 'info');
    } catch (err) {
      console.error('Error submitting task:', err);
      showToast('ত্রুটি', 'রিপোর্ট জমা দিতে সমস্যা হয়েছে!', 'error');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Admin Approve
  const handleApproveTask = async (task: MarketingTask) => {
    try {
      const now = new Date().toISOString();
      const updated: MarketingTask = {
        ...task,
        status: 'Approved',
        approvedBy: user?.name || 'Admin',
        approvedAt: now,
        updatedAt: now,
      };

      await db.marketingTasks.put(updated);
      await syncEngine.logMutation('marketingTasks' as any, 'UPDATE', task.id, updated);
      triggerLiveSync();

      if (viewingTask?.id === task.id) {
        setViewingTask(updated);
      }

      await loadData();
      showToast('টাস্ক সফলভাবে অনুমোদিত! 🎉', `টাস্ক "${task.title}" সফলভাবে সম্পন্ন ও অনুমোদিত হয়েছে।`, 'success');
    } catch (err) {
      console.error('Error approving task:', err);
      showToast('ত্রুটি', 'অনুমোদন করতে সমস্যা হয়েছে!', 'error');
    }
  };

  // Admin Reject
  const handleRejectTask = async (task: MarketingTask) => {
    const reason = prompt('টাস্ক রিভিশন বা বাতিলের কারণ লিখুন:', 'তথ্য অসম্পূর্ণ / পুনরায় ভিজিট করুন');
    if (reason === null) return;

    try {
      const now = new Date().toISOString();
      const updated: MarketingTask = {
        ...task,
        status: 'Rejected',
        adminRemarks: reason,
        updatedAt: now,
      };

      await db.marketingTasks.put(updated);
      await syncEngine.logMutation('marketingTasks' as any, 'UPDATE', task.id, updated);
      triggerLiveSync();

      if (viewingTask?.id === task.id) {
        setViewingTask(updated);
      }

      await loadData();
      showToast('টাস্ক স্ট্যাটাস পরিবর্তন', 'টাস্কটি রিভিশন হিসেবে মার্ক করা হয়েছে।', 'info');
    } catch (err) {
      console.error('Error rejecting task:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (task: MarketingTask) => {
    if (!confirm(`আপনি কি "${task.title}" টাস্কটি মুছে ফেলতে চান?`)) return;
    try {
      await db.marketingTasks.delete(task.id);
      await syncEngine.logMutation('marketingTasks' as any, 'DELETE', task.id, { id: task.id });
      triggerLiveSync();
      if (viewingTask?.id === task.id) setViewingTask(null);
      await loadData();
      showToast('মুছে ফেলা হয়েছে', 'টাস্কটি সফলভাবে মুছে ফেলা হয়েছে।', 'info');
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-[1700px] mx-auto text-slate-800 space-y-4 font-sans text-xs relative">
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

      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl border border-indigo-900/50 p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center space-x-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-emerald-950/30 border border-white/25 shrink-0 relative group">
            <Store className="w-7 h-7 text-white" />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-600 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-xs">
              <Pill className="w-2.5 h-2.5 text-white" />
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>ফার্মেসি মার্কেটিং ও ফিল্ড পোর্টাল</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                🏪 ফার্মেসি নেটওয়ার্ক
              </span>
            </div>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              ইফরা ডেন্টাল সেন্টার • ফার্মেসি ভিজিট ও ড্রাগ প্রমোশন, এরিয়াভিত্তিক ফিল্ড টাস্ক এবং প্রেসক্রিপশন ফলো-আপ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isSyncingData}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center space-x-1.5 transition backdrop-blur-sm cursor-pointer"
            title="ক্লাউড থেকে তাৎক্ষণিক ডেটা সিঙ্ক করুন"
          >
            <RotateCcw className={`w-4 h-4 text-cyan-300 ${isSyncingData ? 'animate-spin' : ''}`} />
            <span>{isSyncingData ? 'সিঙ্ক হচ্ছে...' : 'রিফ্রেশ ও সিঙ্ক'}</span>
          </button>

          <Link
            href="/all-tasks"
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center space-x-1.5 transition backdrop-blur-sm"
          >
            <ClipboardList className="w-4 h-4 text-purple-300" />
            <span>অল টাস্ক ভিউ</span>
          </Link>

          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAssignModal}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ নতুন টাস্ক অ্যাসাইন করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. STATS KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5 hover:border-indigo-300 transition">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-500 font-medium text-[11px]">সংগৃহীত ফার্মেসি ডিরেক্টরি</div>
            <div className="text-xl font-black font-mono text-indigo-950">{reports.length} টি</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5 hover:border-blue-300 transition">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-500 font-medium text-[11px]">চলমান মিশন ও পেন্ডিং</div>
            <div className="text-xl font-black font-mono text-blue-950">{inProgressTasksCount + pendingApprovalCount} টি</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5 hover:border-emerald-300 transition">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-500 font-medium text-[11px]">অনুমোদিত ও সফল টাস্ক</div>
            <div className="text-xl font-black font-mono text-emerald-950">{approvedTasksCount} টি</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5 hover:border-amber-300 transition">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-500 font-medium text-[11px]">আদায়কৃত ফিল্ড বিল</div>
            <div className="text-xl font-black font-mono text-amber-950">৳ {totalCollectedAmount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>ফিল্ড মিশন ও টাস্ক ({tasks.length})</span>
            {pendingApprovalCount > 0 && (
              <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                {pendingApprovalCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>স্মার্ট ফার্মেসি ডিরেক্টরি ({reports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('officers')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'officers'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>অফিসার তালিকা ({employees.length})</span>
          </button>
        </div>

        {activeTab === 'tasks' && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold text-[11px]">স্ট্যাটাস:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedStatus('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  selectedStatus === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                সকল ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('Submitted')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 ${
                  selectedStatus === 'Submitted' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>পেন্ডিং ({pendingApprovalCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('Approved')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  selectedStatus === 'Approved' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                অনুমোদিত ({approvedTasksCount})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. DATE FILTER AND SEARCH BAR (WHEN TASKS TAB IS ACTIVE) */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3.5">
          {/* Category Filter Tabs: ALL, Pharmacy, Patient, Custom */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>ক্যাটাগরি ফিল্টার:</span>
              </span>

              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                সকল ক্যাটাগরি ({visibleTasks.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('Pharmacy')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === 'Pharmacy'
                    ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-300'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>ফার্মেসি মার্কেটিং</span>
                <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${selectedCategory === 'Pharmacy' ? 'bg-white/20 text-white' : 'bg-purple-200 text-purple-900'}`}>
                  {pharmacyTasksCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('Patient')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === 'Patient'
                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>রোগী সার্ভে ও ফলো-আপ</span>
                <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${selectedCategory === 'Patient' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                  {patientTasksCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('Custom')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === 'Custom'
                    ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>কাস্টম মিশন</span>
                <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${selectedCategory === 'Custom' ? 'bg-white/20 text-white' : 'bg-indigo-200 text-indigo-900'}`}>
                  {customTasksCount}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <span>তারিখ ফিল্টার:</span>
              </span>

              {/* All Dates Button */}
              <button
                type="button"
                onClick={() => {
                  setDateFilter('ALL');
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  dateFilter === 'ALL' && !startDate && !endDate
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                সকল তারিখ ({visibleTasks.length})
              </button>

              {/* Today Tasks Button */}
              <button
                type="button"
                onClick={() => {
                  setDateFilter('TODAY');
                  setStartDate(getTodayStr());
                  setEndDate(getTodayStr());
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  dateFilter === 'TODAY'
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>আজকের টাস্ক (Today)</span>
                <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${dateFilter === 'TODAY' ? 'bg-white/20 text-white' : 'bg-blue-200/80 text-blue-900'}`}>
                  {todayTasksCount}
                </span>
              </button>

              {/* Tomorrow Tasks Button */}
              <button
                type="button"
                onClick={() => {
                  setDateFilter('TOMORROW');
                  setStartDate(getTomorrowStr());
                  setEndDate(getTomorrowStr());
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  dateFilter === 'TOMORROW'
                    ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                <span>আগামীকাল (Tomorrow)</span>
                <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${dateFilter === 'TOMORROW' ? 'bg-white/20 text-white' : 'bg-indigo-200/80 text-indigo-900'}`}>
                  {tomorrowTasksCount}
                </span>
              </button>

              {/* This Week Button */}
              <button
                type="button"
                onClick={() => {
                  setDateFilter('THIS_WEEK');
                  const wr = getThisWeekRange();
                  setStartDate(wr.start);
                  setEndDate(wr.end);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  dateFilter === 'THIS_WEEK'
                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span>চলতি সপ্তাহ</span>
                <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${dateFilter === 'THIS_WEEK' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-900'}`}>
                  {thisWeekTasksCount}
                </span>
              </button>

              {/* This Month Button */}
              <button
                type="button"
                onClick={() => {
                  setDateFilter('THIS_MONTH');
                  const mr = getThisMonthRange();
                  setStartDate(mr.start);
                  setEndDate(mr.end);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  dateFilter === 'THIS_MONTH'
                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span>চলতি মাস</span>
                <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${dateFilter === 'THIS_MONTH' ? 'bg-white/20 text-white' : 'bg-amber-200/80 text-amber-900'}`}>
                  {thisMonthTasksCount}
                </span>
              </button>
            </div>

            {/* Dynamic Date Range Picker: কত তারিখ থেকে কত তারিখ */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-300 rounded-2xl px-3 py-1.5 focus-within:border-purple-600 focus-within:bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <span>তারিখ নির্বাচন (হতে - পর্যন্ত):</span>
              </span>

              {/* Start Date */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500">হতে:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartDate(val);
                    setDateFilter(val || endDate ? 'CUSTOM' : 'ALL');
                  }}
                  className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500">পর্যন্ত:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEndDate(val);
                    setDateFilter(startDate || val ? 'CUSTOM' : 'ALL');
                  }}
                  className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
                />
              </div>

              {/* Clear button if any date filter active */}
              {(startDate || endDate || dateFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setDateFilter('ALL');
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="তারিখ ফিল্টার মুছুন"
                >
                  <X className="w-3 h-3" />
                  <span>রিসেট</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <div className="flex-1 relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="টাস্ক, ফার্মেসি, রোগী বা কর্মকর্তার নাম দিয়ে খুঁজুন..."
                className="w-full pl-10 pr-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>

            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none font-semibold cursor-pointer"
            >
              <option value="ALL">সকল এরিয়া ({uniqueAreas.length})</option>
              {uniqueAreas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            {isAdmin ? (
              <select
                value={selectedOfficer}
                onChange={(e) => setSelectedOfficer(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none font-semibold cursor-pointer"
              >
                <option value="ALL">সকল মার্কেটিং অফিসার</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            ) : (
              <span className="px-3 py-2 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{user?.name || 'আমার টাস্ক'}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* 5. TAB 1 CONTENT: FIELD TASKS & MISSIONS */}
      {activeTab === 'tasks' && (
        <>
          {isLoading ? (
            <DentalLoadingSpinner 
              size="md" 
              text="টাস্ক লোড হচ্ছে..." 
              subtext="ফিল্ড কমান্ড সেন্টারে ডেটা আপডেট হচ্ছে..." 
              cardMode={true} 
            />
          ) : filteredTasks.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              <Target className="w-12 h-12 mx-auto mb-2 opacity-40 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-800">কোনো ফিল্ড টাস্ক পাওয়া যায়নি</h3>
              {isAdmin && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleOpenAssignModal}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ নতুন টাস্ক তৈরি করুন</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const isPending = task.status === 'Submitted';
                const isApproved = task.status === 'Approved';
                const isRejected = task.status === 'Rejected';
                const isAssigned = task.status === 'Assigned' || task.status === 'In_Progress';

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl border transition duration-150 p-4 sm:p-5 shadow-xs hover:shadow-md ${
                      isPending
                        ? 'border-amber-300 ring-2 ring-amber-100/80 bg-gradient-to-r from-amber-50/40 via-white to-white'
                        : isApproved
                        ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/20 via-white to-white'
                        : isRejected
                        ? 'border-rose-200 bg-gradient-to-r from-rose-50/20 via-white to-white'
                        : 'border-slate-200/90 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left Column: Badges, Title, Subtitle / Pharmacy / Patient notes */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Top Row: Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Category Badge */}
                          <span className={`px-2.5 py-0.5 rounded-lg font-bold text-[10px] flex items-center gap-1 border ${
                            task.category === 'Patient'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : task.category === 'Custom'
                              ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
                              : 'bg-purple-50 text-purple-900 border-purple-300'
                          }`}>
                            {task.category === 'Patient' ? '👤 রোগী ফলো-আপ' : task.category === 'Custom' ? '📝 কাস্টম মিশন' : '🏪 ফার্মেসি ভিজিট'}
                          </span>

                          {/* Priority Badge */}
                          <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider ${
                            task.priority === 'High' ? 'bg-rose-100 text-rose-800' : task.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {task.priority === 'High' ? '🔴 High' : task.priority === 'Medium' ? '🟡 Medium' : '🟢 Normal'}
                          </span>

                          {/* Area */}
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-[11px] flex items-center gap-1 border border-slate-200">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{task.area}</span>
                          </span>

                          {/* Status Badge */}
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1 shrink-0 ${
                            isPending
                              ? 'bg-amber-100 text-amber-950 border border-amber-300'
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
                              {isPending ? 'পেন্ডিং অনুমোদন' : isApproved ? 'অনুমোদিত' : isRejected ? 'রিভিশন' : 'চলমান'}
                            </span>
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 leading-snug">{task.title}</h3>
                          {task.description && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-1">{task.description}</p>
                          )}
                        </div>

                        {/* Extra details (Pharmacy name / Patient details / Custom Outcome / Admin Remarks) */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                          {task.pharmacyName && (
                            <span className="inline-flex items-center gap-1 font-semibold text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                              <Store className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span>ফার্মেসি: {task.pharmacyName}</span>
                            </span>
                          )}

                          {task.category === 'Patient' && task.patientName && (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <span>👤 রোগী: <strong>{task.patientName}</strong></span>
                              {task.patientMobile && <span className="font-mono text-emerald-700 font-normal">({task.patientMobile})</span>}
                            </span>
                          )}

                          {task.category === 'Patient' && task.patientMobile && (
                            <div className="inline-flex items-center gap-1">
                              <a
                                href={`tel:${task.patientMobile}`}
                                className="py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 transition text-[10px]"
                              >
                                <PhoneCall className="w-3 h-3" />
                                <span>কল</span>
                              </a>
                              <a
                                href={`https://wa.me/880${task.patientMobile.replace(/[^0-9]/g, '').replace(/^0+/, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-1 px-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-1 transition text-[10px]"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          )}

                          {task.category === 'Custom' && task.customOutcome && (
                            <span className="text-[11px] text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                              <strong>ফলাফল:</strong> {task.customOutcome}
                            </span>
                          )}

                          {task.adminRemarks && isRejected && (
                            <span className="text-[11px] text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 font-medium">
                              <strong>রিভিশন নোট:</strong> {task.adminRemarks}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Meta Column: Officer, Target, Deadline & Action Buttons */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-5 shrink-0">
                        {/* Meta tags */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="font-semibold">{task.officerName}</span>
                          </div>

                          {(!task.category || task.category === 'Pharmacy') && (
                            <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                              <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-mono font-bold text-slate-900">
                                {task.visitedDrugHouses ? task.visitedDrugHouses.length : 0} / {task.targetPharmaciesCount || 1} টি
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-rose-700 font-mono font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                            <Calendar className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{task.dueDate}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                          <button
                            type="button"
                            onClick={() => setViewingTask(task)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>বিস্তারিত</span>
                          </button>

                          {(isAssigned || isRejected) && (
                            <button
                              type="button"
                              onClick={() => handleOpenSubmitTask(task)}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>রিপোর্ট জমা দিন</span>
                            </button>
                          )}

                          {isAdmin && isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveTask(task)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                                title="অনুমোদন করুন"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>অনুমোদন</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectTask(task)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                title="রিভিশন"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                              title="টাস্ক মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 6. TAB 2 CONTENT: PHARMACY DIRECTORY */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Store className="w-4 h-4 text-purple-600" />
              <span>ভিজিটকৃত ফার্মেসি ও কালেকশন হিস্ট্রি ({reports.length}টি)</span>
            </h3>
          </div>
          {reports.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Store className="w-10 h-10 mx-auto mb-2 opacity-30 text-purple-600" />
              <p>এখনো কোনো ফার্মেসি ভিজিট রেকর্ড নেই</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="p-3.5">তারিখ</th>
                    <th className="p-3.5">ফার্মেসির নাম</th>
                    <th className="p-3.5">মালিক / প্রোপ্রাইটর</th>
                    <th className="p-3.5">মোবাইল</th>
                    <th className="p-3.5">এরিয়া</th>
                    <th className="p-3.5">প্রচারিত ড্রাগ</th>
                    <th className="p-3.5">অফিসার</th>
                    <th className="p-3.5">ফিডব্যাক</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">{rep.date}</td>
                      <td className="p-3.5 font-bold text-slate-900">{rep.drugHouseName}</td>
                      <td className="p-3.5 text-slate-700">{rep.proprietorName || '—'}</td>
                      <td className="p-3.5 font-mono text-slate-600">{rep.phone || '—'}</td>
                      <td className="p-3.5 text-slate-600">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-semibold">{rep.area}</span>
                      </td>
                      <td className="p-3.5 text-purple-700 font-bold">{rep.drugName || '—'}</td>
                      <td className="p-3.5 text-slate-800 font-semibold">{rep.officerName}</td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{rep.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 7. TAB 3 CONTENT: OFFICER LIST */}
      {activeTab === 'officers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => {
            const empTasks = tasks.filter((t) => t.officerId === emp.id || t.officerName === emp.name);
            const empApproved = empTasks.filter((t) => t.status === 'Approved').length;
            const empPending = empTasks.filter((t) => t.status === 'Submitted').length;

            return (
              <div key={emp.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-base shrink-0">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{emp.name}</h3>
                    <p className="text-xs text-slate-500">{emp.role} • 📱 {emp.mobile || 'নেই'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">মোট টাস্ক</div>
                    <div className="text-sm font-bold font-mono text-purple-900">{empTasks.length} টি</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">পেন্ডিং</div>
                    <div className="text-sm font-bold font-mono text-amber-900">{empPending} টি</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">সম্পন্ন</div>
                    <div className="text-sm font-bold font-mono text-emerald-900">{empApproved} টি</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ASSIGN TASK MODAL (PHARMACY / PATIENT / CUSTOM)
          ========================================================================= */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">নতুন মার্কেটিং টাস্ক অ্যাসাইন করুন</h3>
                  <p className="text-xs text-purple-200">মার্কেটিং অফিসারের জন্য এরিয়া ও টার্গেট নির্ধারণ করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => handleSaveAssignedTask(e, false)} className="p-5 space-y-4 text-xs">
              <div className="max-h-[65vh] overflow-y-auto pr-1 space-y-4">
                {/* 3 TASK CATEGORY TABS: Pharmacy | Patient | Custom */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setTaskCategory('Pharmacy');
                      setModalSuccessNotice(null);
                    }}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      taskCategory === 'Pharmacy'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>🏪 ফার্মেসি</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTaskCategory('Patient');
                      setModalSuccessNotice(null);
                    }}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      taskCategory === 'Patient'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>👤 রোগী (Patient)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTaskCategory('Custom');
                      setModalSuccessNotice(null);
                    }}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      taskCategory === 'Custom'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>📝 কাস্টম</span>
                  </button>
                </div>

                {/* 1. COMMON ASSIGNMENT SETTINGS (TOP HEADER) */}
                <div className={`p-4 rounded-2xl border space-y-3.5 shadow-2xs transition ${
                  taskCategory === 'Patient'
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : taskCategory === 'Custom'
                    ? 'border-indigo-200 bg-indigo-50/50'
                    : 'border-purple-200 bg-purple-50/50'
                }`}>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 font-bold text-xs">
                    <span className="flex items-center gap-2 text-slate-800">
                      {taskCategory === 'Patient' ? <UserCheck className="w-4 h-4 text-emerald-600" /> : taskCategory === 'Custom' ? <FileText className="w-4 h-4 text-indigo-600" /> : <Store className="w-4 h-4 text-purple-600" />}
                      <span>
                        {taskCategory === 'Patient'
                          ? 'রোগী ফলো-আপ ও অ্যাসাইনমেন্ট সেটিংস'
                          : taskCategory === 'Custom'
                          ? 'কাস্টম মিশন ও এলাকা সেটিংস'
                          : 'ফার্মেসি মার্কেটিং ও এলাকা সেটিংস'}
                      </span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      taskCategory === 'Patient' ? 'bg-emerald-100 text-emerald-800' : taskCategory === 'Custom' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {taskCategory === 'Patient' ? 'Patient Mission' : taskCategory === 'Custom' ? 'Custom Mission' : 'Pharmacy Target'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">মার্কেটিং অফিসার নির্বাচন করুন *</label>
                      <select
                        required
                        value={batchOfficerId}
                        onChange={(e) => {
                          const off = employees.find((emp) => emp.id === e.target.value);
                          setBatchOfficerId(e.target.value);
                          setBatchOfficerName(off ? off.name : '');
                          setBatchOfficerMobile(off ? (off.mobile || '') : '');
                        }}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-purple-600 font-semibold text-xs cursor-pointer shadow-xs"
                      >
                        <option value="">-- অফিসার নির্বাচন করুন --</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.role} - {emp.mobile})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">টার্গেট এরিয়া / এলাকা {taskCategory !== 'Patient' && '*'}</label>
                      <input
                        type="text"
                        required={taskCategory !== 'Patient'}
                        value={batchArea}
                        onChange={(e) => setBatchArea(e.target.value)}
                        placeholder="যেমন: উত্তরা, ফার্মগেট, ধানমন্ডি"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-purple-600 font-semibold text-xs shadow-xs"
                      />
                    </div>
                  </div>

                  {/* IF PHARMACY CATEGORY: Target Drug & Pharmacy Name */}
                  {taskCategory === 'Pharmacy' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">ফার্মেসির নাম (টার্গেট ফার্মেসি)</label>
                        <input
                          type="text"
                          value={batchPharmacyName}
                          onChange={(e) => setBatchPharmacyName(e.target.value)}
                          placeholder="যেমন: মদিনা ফার্মেসি, লাজ ফার্মা"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-purple-600 text-xs shadow-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">প্রচারিত ড্রাগ / প্রমোশনাল প্রোডাক্ট</label>
                        <input
                          type="text"
                          value={targetDrugName}
                          onChange={(e) => setTargetDrugName(e.target.value)}
                          placeholder="যেমন: ইফরা ডেন্টাল টুথপেস্ট, মাউথওয়াশ"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-purple-600 text-xs shadow-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">ফার্মেসি টার্গেট সংখ্যা</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={batchTargetPharmaciesCount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (Number(val) >= 1 && Number(val) <= 100)) {
                              setBatchTargetPharmaciesCount(val);
                            }
                          }}
                          placeholder=""
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-purple-600 font-bold text-xs shadow-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Row 2: Today's Task Date, Deadline, Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">টাস্কের তারিখ (আজকের তারিখ)</label>
                      <input
                        type="date"
                        required
                        value={batchAssignedDate}
                        onChange={(e) => setBatchAssignedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-purple-600 font-semibold text-xs shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">সম্পন্নের শেষ তারিখ (Deadline)</label>
                      <input
                        type="date"
                        required
                        value={batchDueDate}
                        onChange={(e) => setBatchDueDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-purple-600 font-semibold text-xs shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">অগ্রাধিকার (Priority)</label>
                      <select
                        value={batchPriority}
                        onChange={(e) => setBatchPriority(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold text-xs cursor-pointer shadow-xs"
                      >
                        <option value="High">🔴 জরুরি (High)</option>
                        <option value="Medium">🟡 সাধারণ (Medium)</option>
                        <option value="Normal">🟢 নরমাল (Normal)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. TASKS LIST SECTION */}
                <div className="space-y-3 pt-1">
                  {modalSuccessNotice && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-2.5 text-xs font-bold">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>{modalSuccessNotice}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalSuccessNotice(null)}
                        className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700 text-xs font-bold cursor-pointer"
                        title="বন্ধ করুন"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>অ্যাসাইনকৃত টাস্কসমূহ ({taskItems.length}টি):</span>
                    </span>
                    <span className="text-slate-400 font-normal text-[11px]">প্রতিটি টাস্কের বিবরণ আলাদা করে লিখুন</span>
                  </div>

                  {taskItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 transition space-y-2.5 relative"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono font-bold flex items-center justify-center text-[11px] shadow-xs">
                            {index + 1}
                          </span>
                          <span className="font-bold text-slate-800 text-xs">
                            টাস্ক #{index + 1}
                          </span>
                        </div>

                        {taskItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTaskRow(index)}
                            className="px-2 py-0.5 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-rose-200"
                            title="এই টাস্কটি বাদ দিন"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>বাদ দিন</span>
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">টাস্কের শিরোনাম *</label>
                        <input
                          type="text"
                          required
                          value={item.title}
                          onChange={(e) => handleTaskFieldChange(index, 'title', e.target.value)}
                          placeholder={
                            taskCategory === 'Patient'
                              ? 'যেমন: আব্দুর রহিম সাহেবের ফলো-আপ ও হোম ভিজিট...'
                              : taskCategory === 'Custom'
                              ? 'যেমন: স্যাম্পল ডেলিভারি ও কালেকশন মিশন...'
                              : 'যেমন: উত্তরা ফার্মেসি ভিজিট ও প্রমোশন...'
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-indigo-600 font-semibold text-xs shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">টাস্কের নির্দেশনা / বিবরণ (ঐচ্ছিক)</label>
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) => handleTaskFieldChange(index, 'description', e.target.value)}
                          placeholder="টাস্কের বিস্তারিত নির্দেশনা..."
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-indigo-600 text-xs shadow-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Another Task Button - Appears/pops up after entering a task title, otherwise hidden */}
              {taskItems.some((t) => t.title.trim() !== '') && (
                <button
                  type="button"
                  onClick={handleAddTaskRow}
                  className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/60 text-indigo-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ আরও টাস্ক যোগ করুন (Add Another Task)</span>
                </button>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <span className="text-slate-500 font-semibold text-xs">
                  মোট টাস্ক: <strong className="text-purple-900 font-mono">{taskItems.length} টি</strong>
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer text-xs"
                  >
                    বাতিল
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSaveAssignedTask(e, true)}
                    disabled={isSavingTask}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl font-bold transition cursor-pointer text-xs disabled:opacity-50"
                  >
                    + সেভ করে আরও যোগ করুন
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingTask}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md transition flex items-center space-x-1.5 cursor-pointer text-xs disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSavingTask ? 'সংরক্ষণ হচ্ছে...' : `টাস্ক অ্যাসাইন নিশ্চিত করুন (${taskItems.length}টি)`}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: SUBMIT REPORT MODAL (PHARMACY / PATIENT / CUSTOM)
          ========================================================================= */}
      {taskToSubmit && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header Banner */}
            <div className={`p-5 text-white flex items-center justify-between ${
              taskToSubmit.category === 'Patient'
                ? 'bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900'
                : taskToSubmit.category === 'Custom'
                ? 'bg-gradient-to-r from-indigo-700 via-slate-800 to-slate-900'
                : 'bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shadow-xs shrink-0">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">টাস্ক রিপোর্ট জমা দিন</h3>
                  <p className="text-xs text-white/80">ফিল্ড ভিজিট ও টাস্ক সম্পন্ন সংক্রান্ত তথ্য অ্যাডমিন অনুমোদনের জন্য দাখিল করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTaskToSubmit(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTaskReport} className="p-5 space-y-4 text-xs">
              <div className="max-h-[65vh] overflow-y-auto pr-1 space-y-4">
                {/* 1. TOP SETTINGS / INFO CARD */}
                <div className={`p-4 rounded-2xl border space-y-3.5 shadow-2xs transition ${
                  taskToSubmit.category === 'Patient'
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : taskToSubmit.category === 'Custom'
                    ? 'border-indigo-200 bg-indigo-50/50'
                    : 'border-purple-200 bg-purple-50/50'
                }`}>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 font-bold text-xs">
                    <span className="flex items-center gap-2 text-slate-800">
                      {taskToSubmit.category === 'Patient' ? (
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                      ) : taskToSubmit.category === 'Custom' ? (
                        <FileText className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Store className="w-4 h-4 text-purple-600" />
                      )}
                      <span>
                        {taskToSubmit.category === 'Patient'
                          ? 'রোগী ফলো-আপ রিপোর্ট বিবরণ'
                          : taskToSubmit.category === 'Custom'
                          ? 'কাস্টম মিশন সমাপ্তি বিবরণ'
                          : 'ফার্মেসি মার্কেটিং রিপোর্ট বিবরণ'}
                      </span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      taskToSubmit.category === 'Patient'
                        ? 'bg-emerald-100 text-emerald-800'
                        : taskToSubmit.category === 'Custom'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {taskToSubmit.category === 'Patient'
                        ? 'Patient Report'
                        : taskToSubmit.category === 'Custom'
                        ? 'Custom Report'
                        : 'Pharmacy Report'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">অ্যাসাইনকৃত অফিসার</label>
                      <div className="font-bold text-slate-900 bg-white/90 px-3.5 py-2 border border-slate-300 rounded-xl shadow-xs">
                        {taskToSubmit.officerName} {taskToSubmit.officerMobile && <span className="font-normal font-mono text-slate-500 text-[11px]">({taskToSubmit.officerMobile})</span>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">টার্গেট এরিয়া / এলাকা</label>
                      <input
                        type="text"
                        value={submissionArea}
                        onChange={(e) => setSubmissionArea(e.target.value)}
                        placeholder="যেমন: উত্তরা, ধানমন্ডি"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-purple-600 font-semibold text-xs shadow-xs"
                      />
                    </div>
                  </div>

                  {/* If Pharmacy Category Summary */}
                  {(!taskToSubmit.category || taskToSubmit.category === 'Pharmacy') && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">টার্গেট ফার্মেসি</label>
                        <input
                          type="text"
                          value={submissionPharmacyName}
                          onChange={(e) => setSubmissionPharmacyName(e.target.value)}
                          placeholder="যেমন: মদিনা ফার্মেসি"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-purple-600 text-xs shadow-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">প্রচারিত ড্রাগ / প্রোডাক্ট</label>
                        <input
                          type="text"
                          value={submissionTargetDrugName}
                          onChange={(e) => setSubmissionTargetDrugName(e.target.value)}
                          placeholder="যেমন: ডেন্টাল পেস্ট, মাউথওয়াশ"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-purple-600 text-xs shadow-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">ফার্মেসি টার্গেট সংখ্যা *</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={submissionTargetPharmaciesCount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (Number(val) >= 1 && Number(val) <= 100)) {
                              setSubmissionTargetPharmaciesCount(val);
                            }
                          }}
                          placeholder=""
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-purple-600 font-bold text-xs shadow-xs text-purple-950"
                        />
                      </div>
                    </div>
                  )}

                  {/* If Custom Category Summary */}
                  {taskToSubmit.category === 'Custom' && (
                    <div className="p-3.5 bg-white rounded-2xl border border-indigo-200 space-y-1">
                      <div className="font-bold text-indigo-950 text-xs">মিশন: {taskToSubmit.title}</div>
                      {taskToSubmit.description && (
                        <p className="text-[11px] text-slate-600 leading-relaxed">{taskToSubmit.description}</p>
                      )}
                    </div>
                  )}

                  {/* Row: Assigned Date, Deadline, Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="block text-slate-500 font-semibold mb-1">টাস্কের তারিখ (অ্যাসাইন)</span>
                      <div className="font-bold text-slate-700 bg-white px-3 py-2 border border-slate-300 rounded-xl font-mono shadow-xs">
                        {taskToSubmit.assignedDate}
                      </div>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-semibold mb-1">সম্পন্নের শেষ তারিখ (Deadline)</span>
                      <div className="font-bold text-rose-700 bg-white px-3 py-2 border border-slate-300 rounded-xl font-mono shadow-xs">
                        {taskToSubmit.dueDate}
                      </div>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-semibold mb-1">অগ্রাধিকার (Priority)</span>
                      <div className="font-bold text-slate-800 bg-white px-3 py-2 border border-slate-300 rounded-xl shadow-xs">
                        {taskToSubmit.priority === 'High' ? '🔴 জরুরি (High)' : taskToSubmit.priority === 'Medium' ? '🟡 সাধারণ (Medium)' : '🟢 নরমাল (Normal)'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SUBMISSION INPUTS SECTION */}
                {/* Pharmacy Category Items */}
                {(!taskToSubmit.category || taskToSubmit.category === 'Pharmacy') && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-indigo-600" />
                        <span>ভিজিটকৃত ফার্মেসি ও ড্রাগ হাউজ সমূহ ({submissionDrugHouses.length}টি):</span>
                      </span>
                      <span className="text-slate-400 font-normal text-[11px]">প্রতিটি ফার্মেসির তথ্য আলাদা করে লিখুন</span>
                    </div>

                    {submissionDrugHouses.map((house, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 transition space-y-2.5 relative"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono font-bold flex items-center justify-center text-[11px] shadow-xs">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              ফার্মেসি #{idx + 1}
                            </span>
                          </div>

                          {submissionDrugHouses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDrugHouseRow(idx)}
                              className="px-2 py-0.5 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-rose-200"
                              title="এই ফার্মেসি বাদ দিন"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>বাদ দিন</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">ফার্মেসির নাম *</label>
                            <input
                              type="text"
                              required
                              value={house.name}
                              onChange={(e) => handleDrugHouseChange(idx, 'name', e.target.value)}
                              placeholder="যেমন: তামান্না ড্রাগ হাউজ"
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-indigo-600 font-semibold text-xs shadow-xs"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">মোবাইল নম্বর *</label>
                            <input
                              type="tel"
                              required
                              value={house.phone}
                              onChange={(e) => handleDrugHouseChange(idx, 'phone', e.target.value)}
                              placeholder="যেমন: 017xxxxxxxx"
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-indigo-600 font-mono font-semibold text-xs shadow-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">মালিকের নাম / প্রোপ্রাইটর</label>
                            <input
                              type="text"
                              value={house.proprietor}
                              onChange={(e) => handleDrugHouseChange(idx, 'proprietor', e.target.value)}
                              placeholder="যেমন: মো: রফিকুল ইসলাম"
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-indigo-600 text-xs shadow-xs"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">প্রচারিত ড্রাগ / প্রোডাক্ট</label>
                            <input
                              type="text"
                              value={house.drugPromoted}
                              onChange={(e) => handleDrugHouseChange(idx, 'drugPromoted', e.target.value)}
                              placeholder={taskToSubmit.targetDrugName || 'যেমন: ইফরা ডেন্টাল পেস্ট, মাউথওয়াশ'}
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-indigo-600 text-xs shadow-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">ফার্মেসি ফিডব্যাক / বিশেষ নোট (ঐচ্ছিক)</label>
                          <input
                            type="text"
                            value={house.feedback}
                            onChange={(e) => handleDrugHouseChange(idx, 'feedback', e.target.value)}
                            placeholder="অর্ডারের সম্ভাবনা, স্টক বা ডাক্তারের প্রেসক্রিপশন সংক্রান্ত মন্তব্য..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-indigo-600 text-xs shadow-xs"
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddDrugHouseRow}
                      className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/60 text-indigo-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ আরও ফার্মেসি যোগ করুন (Add Another Pharmacy)</span>
                    </button>
                  </div>
                )}

                {/* Patient Category Submission Form */}
                {taskToSubmit.category === 'Patient' && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>রোগী ও সার্ভে সংক্রান্ত তথ্য (Patient Survey Data):</span>
                      </span>
                      <span className="text-slate-400 font-normal text-[11px]">ফিল্ডে সংগৃহীত রোগীর তথ্য পূরণ করুন</span>
                    </div>

                    <div className="p-4 rounded-2xl border border-emerald-300 bg-white space-y-3 shadow-xs">
                      {/* Registered patient select if any */}
                      <div>
                        <label className="block font-bold text-emerald-950 mb-1">নিবন্ধিত রোগী সিলেক্ট করুন (বা নিচে সরাসরি লিখুন)</label>
                        <select
                          value={submissionPatientId}
                          onChange={(e) => handleSelectSubmissionPatient(e.target.value)}
                          className="w-full px-3 py-2 border border-emerald-300 rounded-xl bg-emerald-50/40 text-emerald-950 font-semibold text-xs cursor-pointer focus:outline-none focus:border-emerald-600"
                        >
                          <option value="">-- রোগী তালিকা থেকে নির্বাচন করুন (ঐচ্ছিক) --</option>
                          {patientsList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} | 📱 {p.mobile || 'মোবাইল নেই'} {p.address ? `| 📍 ${p.address}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">রোগীর নাম *</label>
                          <input
                            type="text"
                            required
                            value={submissionPatientName}
                            onChange={(e) => setSubmissionPatientName(e.target.value)}
                            placeholder="যেমন: আব্দুর রহিম"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600 text-xs font-semibold shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">রোগীর মোবাইল নম্বর *</label>
                          <input
                            type="text"
                            required
                            value={submissionPatientMobile}
                            onChange={(e) => setSubmissionPatientMobile(e.target.value)}
                            placeholder="যেমন: 017xxxxxxxx"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono font-semibold shadow-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">রোগীর বাসা / ঠিকানা</label>
                          <input
                            type="text"
                            value={submissionPatientAddress}
                            onChange={(e) => setSubmissionPatientAddress(e.target.value)}
                            placeholder="যেমন: হাউজ ১২, রোড ৪, উত্তরা"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600 text-xs shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">দাঁতের সমস্যা / চিকিৎসা সংক্রান্ত নোট</label>
                          <input
                            type="text"
                            value={submissionPatientNotes}
                            onChange={(e) => setSubmissionPatientNotes(e.target.value)}
                            placeholder="যেমন: দাঁতে ব্যথা, ফিলিং বা স্কেলিং প্রয়োজন"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600 text-xs shadow-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Patient Outcome */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-800 text-xs">
                        রোগীর সাথে যোগাযোগ / সার্ভে ফলাফল ও ফিডব্যাক *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={patientOutcome}
                        onChange={(e) => setPatientOutcome(e.target.value)}
                        placeholder="রোগীর বর্তমান দাঁত বা চিকিৎসার অবস্থা কেমন, পরবর্তী ফলো-আপ বা ভিজিটে তিনি কী বলেছেন বিস্তারিত লিখুন..."
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl bg-white focus:outline-none focus:border-emerald-600 text-xs shadow-xs font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Custom Outcome */}
                {taskToSubmit.category === 'Custom' && (
                  <div className="space-y-2 pt-1">
                    <label className="block font-bold text-slate-800 text-xs">
                      কাস্টম মিশন সমাপ্তির বিবরণ ও ফলাফল (Custom Outcome) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={customOutcome}
                      onChange={(e) => setCustomOutcome(e.target.value)}
                      placeholder="কাজের ফলাফল, সংগৃহীত তথ্য বা ডেলিভারি/কালেকশন সংক্রান্ত বিস্তারিত লিখুন..."
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl bg-white focus:outline-none focus:border-indigo-600 text-xs shadow-xs font-medium"
                    />
                  </div>
                )}

                {/* Overall Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">সার্বিক মন্তব্য / অতিরিক্ত নোট (ঐচ্ছিক)</label>
                  <textarea
                    rows={2}
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    placeholder="সামগ্রিক মন্তব্য বা ফলো-আপ পরামর্শ..."
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-2xl bg-white focus:outline-none focus:border-indigo-600 text-xs shadow-xs"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <span className="text-slate-500 font-semibold text-xs">
                  {(!taskToSubmit.category || taskToSubmit.category === 'Pharmacy') ? (
                    <>মোট ফার্মেসি: <strong className="text-purple-900 font-mono">{submissionDrugHouses.length} টি</strong></>
                  ) : (
                    <>ক্যাটাগরি: <strong className="text-indigo-900">{taskToSubmit.category === 'Patient' ? '👤 রোগী ফলো-আপ' : '📝 কাস্টম মিশন'}</strong></>
                  )}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskToSubmit(null)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer text-xs"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTask}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingTask ? 'জমা হচ্ছে...' : 'অ্যাডমিন অনুমোদনের জন্য জমা দিন'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: VIEW TASK DETAILS
          ========================================================================= */}
      {viewingTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    viewingTask.category === 'Patient' ? 'bg-emerald-500/30 text-emerald-200' : viewingTask.category === 'Custom' ? 'bg-indigo-500/30 text-indigo-200' : 'bg-purple-500/30 text-purple-200'
                  }`}>
                    {viewingTask.category === 'Patient' ? '👤 রোগী ফলো-আপ' : viewingTask.category === 'Custom' ? '📝 কাস্টম মিশন' : '🏪 ফার্মেসি ভিজিট'}
                  </span>
                </div>
                <h3 className="text-base font-bold">{viewingTask.title}</h3>
                <p className="text-xs text-slate-300">এরিয়া: {viewingTask.area} • অফিসার: {viewingTask.officerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingTask(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-500">স্ট্যাটাস:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{viewingTask.status}</div>
                </div>
                <div>
                  <span className="text-slate-500">ডেডলাইন:</span>
                  <div className="font-bold text-rose-700 font-mono mt-0.5">{viewingTask.dueDate}</div>
                </div>
              </div>

              {/* Patient Details if Patient Category */}
              {viewingTask.category === 'Patient' && (
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                  <span className="font-bold text-emerald-950 text-xs">👤 রোগীর তথ্য:</span>
                  <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-800">
                    <div>নাম: <strong>{viewingTask.patientName}</strong></div>
                    <div>মোবাইল: <strong className="font-mono">{viewingTask.patientMobile}</strong></div>
                    {viewingTask.patientAddress && <div className="col-span-2">ঠিকানা: {viewingTask.patientAddress}</div>}
                    {viewingTask.patientNotes && <div className="col-span-2 text-emerald-900 bg-white/60 p-2 rounded-lg">নোট: {viewingTask.patientNotes}</div>}
                  </div>
                  {viewingTask.patientOutcome && (
                    <div className="mt-2 p-2.5 bg-white rounded-xl border border-emerald-300">
                      <span className="font-bold text-emerald-950">✓ রোগীর সাথে যোগাযোগের ফলাফল:</span>
                      <p className="mt-1 text-slate-800">{viewingTask.patientOutcome}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pharmacy Details if Pharmacy Category */}
              {(!viewingTask.category || viewingTask.category === 'Pharmacy') && (
                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
                  <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-purple-600" /> ফার্মেসি টার্গেট তথ্য:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-800">
                    {viewingTask.pharmacyName && (
                      <div className="col-span-2 sm:col-span-1 bg-white/80 p-2 rounded-xl border border-purple-100">
                        <span className="text-slate-500 block text-[11px]">টার্গেট ফার্মেসির নাম:</span>
                        <strong className="text-purple-950">{viewingTask.pharmacyName}</strong>
                      </div>
                    )}
                    {viewingTask.targetDrugName && (
                      <div className="col-span-2 sm:col-span-1 bg-white/80 p-2 rounded-xl border border-purple-100">
                        <span className="text-slate-500 block text-[11px]">প্রোডাক্ট / ড্রাগ:</span>
                        <strong className="text-purple-950">{viewingTask.targetDrugName}</strong>
                      </div>
                    )}
                    <div className="bg-white/80 p-2 rounded-xl border border-purple-100">
                      <span className="text-slate-500 block text-[11px]">টার্গেট সংখ্যা:</span>
                      <strong className="text-purple-950 font-mono">{viewingTask.targetPharmaciesCount || 1} টি</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Pharmacy Houses if Pharmacy Category */}
              {viewingTask.visitedDrugHouses && viewingTask.visitedDrugHouses.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">সংগৃহীত ফার্মেসি তালিকা ({viewingTask.visitedDrugHouses.length}টি):</h4>
                  <div className="space-y-2">
                    {viewingTask.visitedDrugHouses.map((d, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{d.name}</div>
                          <div className="text-[11px] text-slate-500">{d.proprietor || 'মালিক'} • {d.drugPromoted || 'প্রোডাক্ট'}</div>
                        </div>
                        {d.phone && (
                          <a href={`tel:${d.phone}`} className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-mono font-bold">
                            {d.phone}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingTask.submittedNotes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700">সার্বিক মন্তব্য:</span>
                  <p className="mt-1 text-slate-800">{viewingTask.submittedNotes}</p>
                </div>
              )}

              {isAdmin && viewingTask.status === 'Submitted' && (
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => handleRejectTask(viewingTask)}
                    className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-bold transition cursor-pointer"
                  >
                    রিভিশন পাঠান
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveTask(viewingTask)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>✓ অনুমোদন করুন</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
