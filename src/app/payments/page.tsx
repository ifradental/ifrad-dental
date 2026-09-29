'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  DollarSign, 
  Plus, 
  Search, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Send, 
  CheckCircle2, 
  ExternalLink, 
  Lock, 
  X,
  UserCheck,
  Building2,
  ShieldCheck,
  Check,
  Printer,
  Receipt,
  Calendar,
  AlertCircle,
  Users,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  BadgeAlert
} from 'lucide-react';
import { 
  db, 
  type PaymentRecord, 
  type ExpenseRecord, 
  type Prescription, 
  type CashSubmission, 
  type ClinicSettings 
} from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import CashSubmissionVoucherModal from '@/components/payments/CashSubmissionVoucherModal';

export default function PaymentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isReceptionistOrCashier = 
    user?.role?.toLowerCase().includes('receptionist') || 
    user?.role?.toLowerCase().includes('cashier');

  const [activeTab, setActiveTab] = useState<'payments' | 'cash_submissions' | 'doctor_prescriptions' | 'expenses' | 'summary'>('payments');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [pendingPrescriptions, setPendingPrescriptions] = useState<Prescription[]>([]);
  const [cashSubmissions, setCashSubmissions] = useState<CashSubmission[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Collect Payment Modal State
  const [collectingRx, setCollectingRx] = useState<Prescription | null>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMethod, setCollectMethod] = useState<string>('Cash');
  const [collectNote, setCollectNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Add Expense Form State
  const [expenseCategory, setExpenseCategory] = useState<string>('Materials');
  const [expenseParticular, setExpenseParticular] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expenseNote, setExpenseNote] = useState<string>('');

  // Cash Submission Form State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [submitCashAmount, setSubmitCashAmount] = useState<number>(0);
  const [submitDigitalAmount, setSubmitDigitalAmount] = useState<number>(0);
  const [submitShiftPeriod, setSubmitShiftPeriod] = useState<string>('মর্নিং শিফট (Morning Shift)');
  const [submitDate, setSubmitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [submitNotes, setSubmitNotes] = useState<string>('');

  // Admin Approval & Voucher Modal States
  const [selectedSubmissionForVoucher, setSelectedSubmissionForVoucher] = useState<CashSubmission | null>(null);
  const [rejectingSubmission, setRejectingSubmission] = useState<CashSubmission | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState<string>('');
  const [submissionFilterStatus, setSubmissionFilterStatus] = useState<string>('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [payList, expList, allRx, subs, settingsList] = await Promise.all([
        db.payments.reverse().toArray(),
        db.expenses.reverse().toArray(),
        db.prescriptions.reverse().toArray(),
        db.cashSubmissions.reverse().toArray(),
        db.settings.toArray(),
      ]);

      setPayments(payList);
      setExpenses(expList);

      const pending = allRx.filter((rx) => rx.workflowStatus === 'sent_to_cashier');
      setPendingPrescriptions(pending);

      subs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCashSubmissions(subs);

      if (settingsList.length > 0) {
        setClinicSettings(settingsList[0]);
      }
    } catch (err) {
      console.error('Failed to load payments data:', err);
    }
  };

  // Totals and KPI calculations
  const totalCollected = useMemo(() => payments.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0), [payments]);
  const totalDueAmount = useMemo(() => payments.reduce((sum, p) => sum + (Number(p.dueAmount) || 0), 0), [payments]);
  const totalExpended = useMemo(() => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [expenses]);
  const netIncome = totalCollected - totalExpended;

  // Cash Submission calculations
  const approvedSubmissions = useMemo(() => cashSubmissions.filter((s) => s.status === 'Approved'), [cashSubmissions]);
  const pendingSubmissions = useMemo(() => cashSubmissions.filter((s) => s.status === 'Pending'), [cashSubmissions]);
  const totalApprovedAmount = useMemo(() => approvedSubmissions.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0), [approvedSubmissions]);
  const totalPendingAmount = useMemo(() => pendingSubmissions.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0), [pendingSubmissions]);

  // Unsubmitted cash balance (Total collected minus already approved and pending submissions)
  const unsubmittedCashBalance = useMemo(() => {
    return Math.max(0, totalCollected - totalApprovedAmount - totalPendingAmount);
  }, [totalCollected, totalApprovedAmount, totalPendingAmount]);

  // Today's specific collections
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayCollected = useMemo(() => {
    return payments
      .filter((p) => p.date === todayStr)
      .reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  }, [payments, todayStr]);

  // Open Cash Submission Modal
  const handleOpenSubmitCashModal = () => {
    setSubmitCashAmount(unsubmittedCashBalance > 0 ? unsubmittedCashBalance : 0);
    setSubmitDigitalAmount(0);
    setSubmitDate(new Date().toISOString().split('T')[0]);
    setSubmitNotes('');
    setIsSubmitModalOpen(true);
  };

  // Submit Cash Action
  const handleSubmitCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(submitCashAmount) + Number(submitDigitalAmount);
    if (total <= 0) {
      alert('অনুগ্রহ করে জমার পরিমাণ উল্লেখ করুন!');
      return;
    }

    const now = new Date();
    const subNo = `CS-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSubmission: CashSubmission = {
      id: `csub_${Date.now()}`,
      submissionNo: subNo,
      cashierId: user?.employeeId || user?.username,
      cashierName: user?.name || 'Receptionist / Cashier',
      cashierMobile: user?.mobile,
      submissionDate: submitDate,
      submissionTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      cashAmount: Number(submitCashAmount) || 0,
      digitalAmount: Number(submitDigitalAmount) || 0,
      totalAmount: total,
      shiftPeriod: submitShiftPeriod,
      notes: submitNotes.trim(),
      status: 'Pending',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await db.cashSubmissions.put(newSubmission);
    await syncEngine.logMutation('cashSubmissions', 'INSERT', newSubmission.id, newSubmission);

    logActivity({
      action: 'SUBMIT_CASH',
      module: 'Payment',
      description: `ক্যাশিয়ার "${newSubmission.cashierName}" অ্যাডমিনের নিকট ৳${total.toLocaleString()} ক্যাশ জমা পাঠিয়েছেন (Voucher #${subNo})`,
      metadata: {
        submissionNo: subNo,
        cashAmount: newSubmission.cashAmount,
        digitalAmount: newSubmission.digitalAmount,
        totalAmount: total,
        shiftPeriod: submitShiftPeriod,
      },
      user: user || undefined,
    });

    setIsSubmitModalOpen(false);
    await loadData();
    setSelectedSubmissionForVoucher(newSubmission);
    alert(`৳${total.toLocaleString()} ক্যাশ জমার আবেদন সফলভাবে অ্যাডমিনের নিকট পাঠানো হয়েছে! (ভাউচার #${subNo})`);
  };

  // Admin Approve Submission
  const handleApproveSubmission = async (sub: CashSubmission) => {
    if (!confirm(`আপনি কি নিশ্চিত যে ক্যাশিয়ার "${sub.cashierName}"-এর নিকট থেকে ৳${sub.totalAmount.toLocaleString()} ক্যাশ বুঝে পেয়েছেন এবং অনুমোদন করছেন?`)) {
      return;
    }

    const now = new Date().toISOString();
    const updated: CashSubmission = {
      ...sub,
      status: 'Approved',
      approvedBy: user?.name || 'Clinic Administrator',
      approvedById: user?.employeeId || user?.username || 'admin',
      approvedAt: now,
      updatedAt: now,
    };

    await db.cashSubmissions.update(sub.id, {
      status: 'Approved',
      approvedBy: updated.approvedBy,
      approvedById: updated.approvedById,
      approvedAt: now,
      updatedAt: now,
    });
    await syncEngine.logMutation('cashSubmissions', 'UPDATE', sub.id, updated);

    logActivity({
      action: 'APPROVE_CASH_SUBMISSION',
      module: 'Payment',
      description: `অ্যাডমিন "${user?.name}" ক্যাশিয়ার "${sub.cashierName}"-এর ৳${sub.totalAmount.toLocaleString()} ক্যাশ বুঝে নিয়ে অনুমোদন করেছেন (Voucher #${sub.submissionNo})`,
      metadata: {
        submissionNo: sub.submissionNo,
        cashierName: sub.cashierName,
        totalAmount: sub.totalAmount,
        approvedBy: updated.approvedBy,
      },
      user: user || undefined,
    });

    await loadData();
    alert(`ভাউচার #${sub.submissionNo} (৳${sub.totalAmount.toLocaleString()}) সফলভাবে অনুমোদিত ও সংগৃহীত হিসেবে চিহ্নিত হয়েছে!`);
  };

  // Admin Reject Submission
  const handleRejectSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingSubmission) return;

    const now = new Date().toISOString();
    const updated: CashSubmission = {
      ...rejectingSubmission,
      status: 'Rejected',
      adminRemarks: rejectRemarks.trim(),
      updatedAt: now,
    };

    await db.cashSubmissions.update(rejectingSubmission.id, {
      status: 'Rejected',
      adminRemarks: rejectRemarks.trim(),
      updatedAt: now,
    });
    await syncEngine.logMutation('cashSubmissions', 'UPDATE', rejectingSubmission.id, updated);

    logActivity({
      action: 'REJECT_CASH_SUBMISSION',
      module: 'Payment',
      description: `অ্যাডমিন "${user?.name}" ক্যাশিয়ার "${rejectingSubmission.cashierName}"-এর ক্যাশ জমার আবেদন বাতিল করেছেন (কারণ: ${rejectRemarks})`,
      metadata: {
        submissionNo: rejectingSubmission.submissionNo,
        remarks: rejectRemarks,
      },
      user: user || undefined,
    });

    setRejectingSubmission(null);
    setRejectRemarks('');
    await loadData();
    alert('ক্যাশ জমার আবেদন বাতিল করা হয়েছে।');
  };

  // Filtered Cash Submissions
  const filteredSubmissions = useMemo(() => {
    return cashSubmissions.filter((sub) => {
      if (submissionFilterStatus !== 'All' && sub.status !== submissionFilterStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNo = sub.submissionNo?.toLowerCase().includes(q);
        const matchName = sub.cashierName?.toLowerCase().includes(q);
        const matchDate = sub.submissionDate?.includes(q);
        const matchNotes = sub.notes?.toLowerCase().includes(q);
        if (!matchNo && !matchName && !matchDate && !matchNotes) return false;
      }
      return true;
    });
  }, [cashSubmissions, submissionFilterStatus, searchQuery]);

  // Handle Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseParticular.trim() || !expenseAmount) return;

    const expItem: ExpenseRecord = {
      id: `exp_${Date.now()}`,
      date: expenseDate,
      category: expenseCategory,
      particular: expenseParticular,
      amount: Number(expenseAmount),
      note: expenseNote,
      createdAt: new Date().toISOString(),
    };

    await db.expenses.put(expItem);
    await syncEngine.logMutation('expenses', 'INSERT', expItem.id, expItem);

    logActivity({
      action: 'ADD_EXPENSE',
      module: 'Payment',
      description: `ক্লিনিক খরচ এন্ট্রি: ৳${expItem.amount.toLocaleString()} (${expItem.category} - ${expItem.particular})`,
      metadata: expItem,
      user: user || undefined,
    });

    setExpenseParticular('');
    setExpenseAmount(0);
    setExpenseNote('');
    loadData();
    alert('খরচ সফলভাবে এন্ট্রি হয়েছে!');
  };

  const handleOpenCollectModal = async (rx: Prescription) => {
    const regNo = Number(rx.regNo);
    const existingPayments = await db.payments.where('regNo').equals(regNo).toArray();
    const ledgerPaid = existingPayments.reduce((acc, p) => acc + (Number(p.paidAmount) || 0), 0);
    const totalBill = rx.contract?.payableAmount || rx.payment?.totalBill || 0;
    const due = Math.max(0, totalBill - ledgerPaid);

    setCollectingRx(rx);
    setCollectAmount(due > 0 ? due : 500);
    setCollectMethod('Cash');
    setCollectNote(rx.contract?.particulars || 'Prescription & Treatment Fee');
  };

  const handleQuickCollectAndSendToDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingRx) return;
    const amount = Number(collectAmount) || 0;
    if (amount <= 0) {
      alert('অনুগ্রহ করে জমা টাকার পরিমাণ লিখুন!');
      return;
    }

    setIsSubmitting(true);
    try {
      const regNo = Number(collectingRx.regNo);
      const existingPayments = await db.payments.where('regNo').equals(regNo).toArray();
      const ledgerPaid = existingPayments.reduce((acc, p) => acc + (Number(p.paidAmount) || 0), 0);
      const totalBill = collectingRx.contract?.payableAmount || collectingRx.payment?.totalBill || 0;
      const newTotalPaid = ledgerPaid + amount;
      const newDue = Math.max(0, totalBill - newTotalPaid);

      // 1. Record payment
      const paymentRecord: PaymentRecord = {
        id: `pay_${regNo}_${Date.now()}`,
        regNo,
        name: collectingRx.patientName,
        mobile: collectingRx.mobile,
        date: new Date().toISOString().split('T')[0],
        particulars: collectNote.trim() || collectingRx.contract?.particulars || 'Treatment Payment',
        totalBill,
        discount: collectingRx.contract?.discountTk || 0,
        payableAmount: totalBill,
        paidAmount: amount,
        dueAmount: newDue,
        method: collectMethod,
        note: collectNote.trim(),
        addedBy: user?.name || 'Cashier',
        status: 'Paid',
        createdAt: new Date().toISOString(),
      };
      await db.payments.put(paymentRecord);
      await syncEngine.logMutation('payments', 'INSERT', paymentRecord.id, paymentRecord);

      // 2. Update Prescription status to sent_to_doctor
      const updatedRx: Prescription = {
        ...collectingRx,
        workflowStatus: 'sent_to_doctor',
        cashierName: user?.name || 'Cashier',
        sentToDoctorAt: new Date().toISOString(),
        payment: {
          paidToday: amount,
          totalBill,
          totalPaid: newTotalPaid,
          totalDue: newDue,
        },
      };
      await db.prescriptions.put(updatedRx);
      await syncEngine.logMutation('prescriptions', 'UPDATE', updatedRx.id, updatedRx);

      // 3. If matching appointment exists, update it
      const matchingApnt = await db.appointments.where('regNo').equals(regNo).last();
      if (matchingApnt) {
        await db.appointments.update(matchingApnt.id, { status: 'Payment Done' });
        await syncEngine.logMutation('appointments', 'UPDATE', matchingApnt.id, { status: 'Payment Done' });
      }

      logActivity({
        action: 'COLLECT_PAYMENT',
        module: 'Payment',
        description: `পেশেন্ট #${regNo} (${collectingRx.patientName}) এর জন্য ৳${amount.toLocaleString()} পেমেন্ট সংগ্রহ করা হয়েছে`,
        metadata: { regNo, amount, method: collectMethod },
        user: user || undefined,
      });

      alert('পেমেন্ট সফলভাবে সংগ্রহ করা হয়েছে এবং প্রেসক্রিপশনটি ডাক্তারের কাছে ফেরত পাঠানো হয়েছে!');
      setCollectingRx(null);
      setCollectAmount(0);
      setCollectNote('');
      await loadData();
    } catch (err) {
      console.error(err);
      alert('পেমেন্ট সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-3 sm:p-5 max-w-[1550px] mx-auto text-slate-800 font-sans text-xs space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between pb-3.5 mb-3.5 border-b border-slate-200 gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-700 to-sky-600 text-white flex items-center justify-center shadow-md">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Accounts &amp; Cash Management
                </h1>
                <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
                  পেমেন্ট, আয়-ব্যয় ও ক্যাশ জমাদান
                </span>
              </div>
              <p className="text-slate-500 text-xs">
                Patient billing, cashier daily collections, cash submission to admin, and clinic expense ledger
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {/* Tab: Doctor Prescriptions */}
            <button
              onClick={() => setActiveTab('doctor_prescriptions')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                activeTab === 'doctor_prescriptions'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>ডাক্তার থেকে প্রাপ্ত বিল</span>
              {pendingPrescriptions.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                  {pendingPrescriptions.length}
                </span>
              )}
            </button>

            {/* Tab: Cash Submissions (NEW) */}
            <button
              onClick={() => setActiveTab('cash_submissions')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                activeTab === 'cash_submissions'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>ক্যাশ জমাদান ও অনুমোদন</span>
              {pendingSubmissions.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                  {pendingSubmissions.length} Pending
                </span>
              )}
            </button>

            {/* Tab: Payments */}
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'payments' ? 'bg-blue-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Patient Payments
            </button>

            {/* Tab: Expenses */}
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'expenses' ? 'bg-blue-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Add / View Expense
            </button>

            {/* Tab: Summary */}
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'summary' ? 'bg-blue-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Income &amp; Expense Summary
            </button>
          </div>
        </div>

        {/* 5 Financial KPI Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-4 text-xs">
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 shadow-xs">
            <div className="flex items-center justify-between text-emerald-800 text-[10px] font-semibold uppercase">
              <span>Total Collections</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-emerald-950 mt-1">
              ৳ {totalCollected.toLocaleString()}
            </div>
            <span className="text-[9px] text-emerald-600 block mt-0.5">সর্বমোট সংগৃহীত বিল</span>
          </div>

          <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3 shadow-xs">
            <div className="flex items-center justify-between text-amber-900 text-[10px] font-semibold uppercase">
              <span>Unsubmitted Cash</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-amber-950 mt-1">
              ৳ {unsubmittedCashBalance.toLocaleString()}
            </div>
            <span className="text-[9px] text-amber-700 block mt-0.5">জমা দেওয়ার বাকি ক্যাশ</span>
          </div>

          <div
            onClick={() => setActiveTab('cash_submissions')}
            className="bg-indigo-50/90 border border-indigo-200 rounded-xl p-3 shadow-xs cursor-pointer hover:bg-indigo-100/70 transition"
          >
            <div className="flex items-center justify-between text-indigo-800 text-[10px] font-semibold uppercase">
              <span>Pending Handover</span>
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-indigo-950 mt-1 flex items-center justify-between">
              <span>৳ {totalPendingAmount.toLocaleString()}</span>
              {pendingSubmissions.length > 0 && (
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                  {pendingSubmissions.length} টি
                </span>
              )}
            </div>
            <span className="text-[9px] text-indigo-600 block mt-0.5">অনুমোদনের অপেক্ষায়</span>
          </div>

          <div
            onClick={() => setActiveTab('doctor_prescriptions')}
            className="bg-sky-50/90 border border-sky-200 rounded-xl p-3 shadow-xs cursor-pointer hover:bg-sky-100/70 transition"
          >
            <div className="flex items-center justify-between text-sky-800 text-[10px] font-semibold uppercase">
              <span>Doctor Queue</span>
              <UserCheck className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-sky-950 mt-1 flex items-center justify-between">
              <span>{pendingPrescriptions.length} Patients</span>
              <span className="text-[10px] bg-sky-200 text-sky-900 px-1.5 py-0.5 rounded font-bold">
                Collect Bill
              </span>
            </div>
            <span className="text-[9px] text-sky-600 block mt-0.5">ডাক্তার থেকে প্রাপ্ত প্রেসক্রিপশন</span>
          </div>

          <div className="bg-red-50/90 border border-red-200 rounded-xl p-3 shadow-xs">
            <div className="flex items-center justify-between text-red-800 text-[10px] font-semibold uppercase">
              <span>Total Expenses</span>
              <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-red-950 mt-1">
              ৳ {totalExpended.toLocaleString()}
            </div>
            <span className="text-[9px] text-red-600 block mt-0.5">ক্লিনিক খরচ ভাউচার</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB: CASH SUBMISSIONS & HANDOVER APPROVALS (NEW MODULE) */}
        {/* ========================================================================= */}
        {activeTab === 'cash_submissions' && (
          <div className="space-y-4">
            {/* Top Action & Summary Bar */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    ক্যাশিয়ার জমাদান ও অ্যাডমিন অনুমোদন (Daily Cash Handover Ledger)
                  </h3>
                  <p className="text-slate-600 text-xs mt-0.5">
                    রিসেপশনিস্ট/ক্যাশিয়ার সংগৃহীত ক্যাশ অ্যাডমিনের নিকট জমা প্রদান এবং ভাউচার প্রিন্ট
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleOpenSubmitCashModal}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center space-x-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Submit Cash to Admin (ক্যাশ জমা দিন)</span>
                </button>
              </div>
            </div>

            {/* Admin Alert for Pending Submissions */}
            {isAdmin && pendingSubmissions.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-400 p-3 rounded-xl flex items-center justify-between text-amber-950 text-xs animate-in fade-in">
                <div className="flex items-center space-x-2">
                  <BadgeAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">
                      {pendingSubmissions.length} টি ক্যাশ জমাদানের আবেদন আপনার অনুমোদনের অপেক্ষায় রয়েছে!
                    </span>
                    <p className="text-[11px] text-amber-800">
                      ক্যাশিয়ারের কাছ থেকে ক্যাশ বুঝে নিয়ে নিচে &quot;Approve &amp; Collect&quot; বাটনে চাপ দিন।
                    </p>
                  </div>
                </div>
                <span className="font-mono font-black text-amber-900 bg-amber-200 px-2 py-1 rounded">
                  মোট: ৳ {totalPendingAmount.toLocaleString()}
                </span>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-1">
                {['All', 'Pending', 'Approved', 'Rejected'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSubmissionFilterStatus(st)}
                    className={`px-3 py-1 rounded-md font-bold text-xs transition ${
                      submissionFilterStatus === st
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'All' ? 'All (সকল)' : st}
                    {st === 'Pending' && pendingSubmissions.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-slate-900 text-[10px] rounded-full font-black">
                        {pendingSubmissions.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search voucher, cashier, date..."
                  className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Submissions List Table */}
            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
                কোনো ক্যাশ জমাদানের রেকর্ড পাওয়া যায়নি।
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Voucher No</th>
                      <th className="py-2.5 px-3">Date &amp; Time</th>
                      <th className="py-2.5 px-3">Cashier Name</th>
                      <th className="py-2.5 px-3">Shift / Period</th>
                      <th className="py-2.5 px-3 text-right">Cash Amount</th>
                      <th className="py-2.5 px-3 text-right">Digital / MFS</th>
                      <th className="py-2.5 px-3 text-right">Total Submitted</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Approved By</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                          {sub.submissionNo}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-medium">
                          <div>{sub.submissionDate}</div>
                          <div className="text-[10px] text-slate-400">{sub.submissionTime}</div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-900">
                          {sub.cashierName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {sub.shiftPeriod || 'Regular'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                          ৳ {sub.cashAmount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {sub.digitalAmount > 0 ? `৳ ${sub.digitalAmount.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 text-sm whitespace-nowrap">
                          ৳ {sub.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              sub.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : sub.status === 'Rejected'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                            }`}
                          >
                            {sub.status === 'Approved' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : sub.status === 'Rejected' ? (
                              <XCircle className="w-3 h-3 text-red-600" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-600" />
                            )}
                            <span>{sub.status === 'Approved' ? 'গৃহীত (Approved)' : sub.status === 'Rejected' ? 'বাতিল' : 'অপেক্ষমান'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap text-slate-700">
                          {sub.approvedBy ? (
                            <div>
                              <span className="font-semibold text-emerald-900">{sub.approvedBy}</span>
                              {sub.approvedAt && (
                                <div className="text-[9px] text-slate-400">
                                  {new Date(sub.approvedAt).toLocaleDateString('bn-BD')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Pending</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* View Voucher Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedSubmissionForVoucher(sub)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] flex items-center gap-1 transition"
                              title="View & Print Voucher"
                            >
                              <Printer className="w-3 h-3 text-slate-600" />
                              <span>Voucher</span>
                            </button>

                            {/* Admin Approve Button */}
                            {isAdmin && sub.status === 'Pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveSubmission(sub)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shadow-xs flex items-center gap-1 transition"
                                  title="Approve & Acknowledge Cash Received"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectingSubmission(sub)}
                                  className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded font-bold text-[11px] transition"
                                  title="Reject Submission"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: PAYMENTS LIST (Matching payment sub menu.png) */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search payments by Patient Name, Reg No, Mobile..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded text-xs">
              <table className="w-full text-left">
                <thead className="bg-sky-50 text-slate-700 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="p-2 w-10 text-center">SI</th>
                    <th className="p-2 w-24">Date</th>
                    <th className="p-2 w-20">Reg. No</th>
                    <th className="p-2">Name</th>
                    <th className="p-2 w-28">Mobile</th>
                    <th className="p-2">Particulars</th>
                    <th className="p-2 w-24 text-right">Total Bill</th>
                    <th className="p-2 w-24 text-right">Paid (TK)</th>
                    <th className="p-2 w-24 text-right">Due (TK)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments
                    .filter(
                      (p) =>
                        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.regNo?.toString().includes(searchQuery)
                    )
                    .map((pay, i) => (
                      <tr key={pay.id} className="hover:bg-sky-50/40">
                        <td className="p-2 text-center text-slate-500 font-semibold">{i + 1}</td>
                        <td className="p-2 font-medium">{pay.date}</td>
                        <td className="p-2 font-mono font-bold text-blue-900">{pay.regNo}</td>
                        <td className="p-2 font-bold text-slate-900">{pay.name}</td>
                        <td className="p-2 font-mono text-slate-600">{pay.mobile}</td>
                        <td className="p-2 text-slate-700">{pay.particulars}</td>
                        <td className="p-2 text-right font-semibold">৳ {pay.totalBill}</td>
                        <td className="p-2 text-right font-bold text-emerald-700">৳ {pay.paidAmount}</td>
                        <td className="p-2 text-right font-bold text-red-600">৳ {pay.dueAmount}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: EXPENSES ENTRY (Matching expenditure entry.png) */}
        {/* ========================================================================= */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <form onSubmit={handleAddExpense} className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs">
              <div className="font-bold text-blue-900 mb-2">Daily Clinic Expense Voucher Entry</div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-slate-600 font-medium mb-0.5">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="Dental Materials">Dental Materials &amp; Medicines</option>
                    <option value="Lab Bills">Dental Lab Bills (Crown/Denture)</option>
                    <option value="Clinic Rent & Utility">Clinic Rent &amp; Electricity</option>
                    <option value="Staff Salary">Staff &amp; Assistant Salary</option>
                    <option value="Equipment Maintenance">Equipment Maintenance</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div className="col-span-12 md:col-span-4">
                  <label className="block text-slate-600 font-medium mb-0.5">Particulars / Description *</label>
                  <input
                    type="text"
                    required
                    value={expenseParticular}
                    onChange={(e) => setExpenseParticular(e.target.value)}
                    placeholder="e.g. Composite resin purchase / Ceramic crown bill"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="block text-slate-600 font-medium mb-0.5">Amount (TK) *</label>
                  <input
                    type="number"
                    required
                    value={expenseAmount || ''}
                    onChange={(e) => setExpenseAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-bold text-right"
                  />
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="block text-slate-600 font-medium mb-0.5">Date</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>

                <div className="col-span-12 md:col-span-1 flex items-end">
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold shadow"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>

            <div className="overflow-x-auto border border-slate-200 rounded text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="p-2 w-10 text-center">SI</th>
                    <th className="p-2 w-28">Date</th>
                    <th className="p-2 w-44">Category</th>
                    <th className="p-2">Particulars</th>
                    <th className="p-2 w-28 text-right">Amount (TK)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((exp, i) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="p-2 text-center text-slate-500">{i + 1}</td>
                      <td className="p-2 font-medium">{exp.date}</td>
                      <td className="p-2 font-semibold text-slate-800">{exp.category}</td>
                      <td className="p-2 text-slate-700">{exp.particular}</td>
                      <td className="p-2 text-right font-bold text-red-600">৳ {exp.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SUMMARY */}
        {/* ========================================================================= */}
        {activeTab === 'summary' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded text-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-800">Monthly Financial Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded border border-slate-200 space-y-2">
                <div className="font-bold text-emerald-800 border-b pb-1">Total Earnings (Cash Received)</div>
                <div className="text-2xl font-bold font-mono text-emerald-700">৳ {totalCollected}</div>
                <p className="text-slate-500 text-[11px]">From {payments.length} patient transactions</p>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200 space-y-2">
                <div className="font-bold text-red-800 border-b pb-1">Total Clinic Expenditure</div>
                <div className="text-2xl font-bold font-mono text-red-700">৳ {totalExpended}</div>
                <p className="text-slate-500 text-[11px]">From {expenses.length} expense vouchers</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: DOCTOR PRESCRIPTIONS PENDING PAYMENT */}
        {/* ========================================================================= */}
        {activeTab === 'doctor_prescriptions' && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-center justify-between">
              <div>
                <span className="font-bold">ডাক্তার থেকে ক্যাশিয়ারে পাঠানো প্রেসক্রিপশন সমূহ:</span>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  ডাক্তার প্রেসক্রিপশন তৈরির পর বিল সংগ্রহের জন্য এখানে পাঠিয়েছেন। পেমেন্ট সংগ্রহ করে &quot;Collect &amp; Send&quot; চাপলে তা আবার ডাক্তারের কাছে আপডেট হয়ে যাবে।
                </p>
              </div>
              <span className="font-black text-sm bg-amber-200 text-amber-950 px-2.5 py-1 rounded-full">
                {pendingPrescriptions.length} টি পেন্ডিং
              </span>
            </div>

            {pendingPrescriptions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded text-xs">
                বর্তমানে ডাক্তার থেকে কোনো প্রেসক্রিপশন পেন্ডিং নেই।
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded text-xs">
                <table className="w-full text-left">
                  <thead className="bg-amber-100/70 text-slate-800 border-b border-amber-200 font-semibold">
                    <tr>
                      <th className="p-2 w-10 text-center">SI</th>
                      <th className="p-2 w-24">Date</th>
                      <th className="p-2 w-20">Reg. No</th>
                      <th className="p-2">Patient Name</th>
                      <th className="p-2 w-28">Mobile</th>
                      <th className="p-2">Doctor Name</th>
                      <th className="p-2 w-24 text-right">Bill</th>
                      <th className="p-2 w-24 text-right">Paid</th>
                      <th className="p-2 w-24 text-right">Due</th>
                      <th className="p-2 text-center w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingPrescriptions.map((rx, idx) => {
                      const totalBill = rx.contract?.payableAmount || rx.payment?.totalBill || 0;
                      const paid = rx.payment?.totalPaid || 0;
                      const due = Math.max(0, totalBill - paid);
                      return (
                        <tr key={rx.id} className="hover:bg-amber-50/40">
                          <td className="p-2 text-center text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="p-2 font-medium">{rx.date}</td>
                          <td className="p-2 font-mono font-bold text-blue-900">{rx.regNo}</td>
                          <td className="p-2 font-bold text-slate-900">{rx.patientName}</td>
                          <td className="p-2 font-mono text-slate-600">{rx.mobile || '-'}</td>
                          <td className="p-2 text-slate-700 font-medium">{rx.doctorName || 'Doctor'}</td>
                          <td className="p-2 text-right font-semibold">৳ {totalBill}</td>
                          <td className="p-2 text-right font-bold text-emerald-700">৳ {paid}</td>
                          <td className="p-2 text-right font-bold text-red-600">৳ {due}</td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <Link
                                href={`/prescription?regNo=${rx.regNo}&rxId=${rx.id}&focus=payment`}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shadow-xs flex items-center gap-1"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Collect &amp; Send</span>
                              </Link>
                              <Link
                                href={`/prescription?regNo=${rx.regNo}&rxId=${rx.id}`}
                                className="p-1 text-slate-600 hover:text-blue-600 border border-slate-300 rounded hover:bg-slate-100"
                                title="Open Full Prescription"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: SUBMIT CASH TO ADMIN (FOR RECEPTIONIST / CASHIER) */}
        {/* ========================================================================= */}
        {isSubmitModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-300 text-xs">
              <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white px-5 py-3.5 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-emerald-200" />
                  <div>
                    <h3 className="font-extrabold text-sm">Submit Cash to Admin / ক্যাশ জমা দিন</h3>
                    <span className="text-[10px] text-emerald-100">ক্যাশিয়ার হ্যান্ডওভার ও জমার আবেদন</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="hover:bg-white/20 p-1 rounded-lg text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitCash} className="p-5 space-y-3.5">
                {/* Cashier Info Card */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Cashier</span>
                    <span className="font-bold text-slate-900">{user?.name || 'Cashier'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Unsubmitted Balance</span>
                    <span className="font-bold text-amber-800 font-mono">৳ {unsubmittedCashBalance.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      নগদ টাকা (Cash Amount - ৳) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={submitCashAmount || ''}
                      onChange={(e) => setSubmitCashAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 border-2 border-emerald-500 rounded-lg text-sm font-bold text-right text-emerald-950 bg-emerald-50/30 focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      বিকাশ / ডিজিটাল (Digital MFS - ৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={submitDigitalAmount || ''}
                      onChange={(e) => setSubmitDigitalAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-right text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">শিফট / সময়কাল</label>
                    <select
                      value={submitShiftPeriod}
                      onChange={(e) => setSubmitShiftPeriod(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="মর্নিং শিফট (Morning Shift)">মর্নিং শিফট (Morning Shift)</option>
                      <option value="সান্ধ্যকালীন শিফট (Evening Shift)">সান্ধ্যকালীন শিফট (Evening Shift)</option>
                      <option value="সারাদিনের কালেকশন (Full Day)">সারাদিনের কালেকশন (Full Day)</option>
                      <option value="বিশেষ কালেকশন (Special Collection)">বিশেষ কালেকশন</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">জমার তারিখ</label>
                    <input
                      type="date"
                      value={submitDate}
                      onChange={(e) => setSubmitDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">বিশেষ মন্তব্য / নোট (ঐচ্ছিক)</label>
                  <textarea
                    rows={2}
                    value={submitNotes}
                    onChange={(e) => setSubmitNotes(e.target.value)}
                    placeholder="নোট বা ব্যাংক ট্রানজেকশন রেফারেন্স লিখুন..."
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between items-center text-emerald-950 font-bold">
                  <span>সর্বমোট জমা হওয়ার পরিমাণ:</span>
                  <span className="text-base font-black text-emerald-800">
                    ৳ {(Number(submitCashAmount) + Number(submitDigitalAmount)).toLocaleString()}
                  </span>
                </div>

                <div className="pt-2 flex justify-between items-center border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow flex items-center space-x-1.5 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>জমা দিন (Submit to Admin)</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: ADMIN REJECT REMARKS */}
        {/* ========================================================================= */}
        {rejectingSubmission && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 text-xs">
              <h3 className="font-bold text-sm text-red-900 mb-1 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>ক্যাশ জমার আবেদন বাতিল করুন</span>
              </h3>
              <p className="text-slate-500 mb-3">
                ভাউচার #{rejectingSubmission.submissionNo} (৳{rejectingSubmission.totalAmount.toLocaleString()})
              </p>

              <form onSubmit={handleRejectSubmission} className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">বাতিল করার কারণ / মন্তব্য *</label>
                  <textarea
                    required
                    rows={3}
                    value={rejectRemarks}
                    onChange={(e) => setRejectRemarks(e.target.value)}
                    placeholder="হিসাবের অমিল বা কারণ লিখুন..."
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setRejectingSubmission(null)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow"
                  >
                    Confirm Reject
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CASH HANDOVER VOUCHER PRINT SLIP */}
        {/* ========================================================================= */}
        {selectedSubmissionForVoucher && (
          <CashSubmissionVoucherModal
            submission={selectedSubmissionForVoucher}
            clinicSettings={clinicSettings}
            onClose={() => setSelectedSubmissionForVoucher(null)}
          />
        )}

        {/* ========================================================================= */}
        {/* QUICK COLLECT PAYMENT MODAL */}
        {/* ========================================================================= */}
        {collectingRx && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
            <div className="bg-white rounded-lg border border-slate-300 shadow-xl max-w-md w-full p-4 text-xs animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    পেমেন্ট সংগ্রহ ও ডাক্তারের কাছে ফেরত পাঠান
                  </span>
                </div>
                <button
                  onClick={() => setCollectingRx(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-3 bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">রোগীর নাম:</span>
                  <span className="font-bold text-slate-900">{collectingRx.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">রেজিস্ট্রেশন নং:</span>
                  <span className="font-mono font-bold text-blue-900">{collectingRx.regNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">রেফারকারী ডাক্তার:</span>
                  <span className="font-medium text-slate-800">{collectingRx.doctorName || 'Doctor'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">মোট বিল:</span>
                  <span className="font-bold text-slate-900">
                    ৳ {collectingRx.contract?.payableAmount || collectingRx.payment?.totalBill || 0}
                  </span>
                </div>
              </div>

              <form onSubmit={handleQuickCollectAndSendToDoctor} className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    আজকের জমা টাকা (Paid Amount) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 font-bold text-slate-400">৳</span>
                    <input
                      type="number"
                      required
                      value={collectAmount || ''}
                      onChange={(e) => setCollectAmount(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-1.5 border-2 border-emerald-500 rounded font-bold text-emerald-950 text-sm text-right focus:outline-none focus:bg-white bg-emerald-50/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">পেমেন্ট মেথড</label>
                    <select
                      value={collectMethod}
                      onChange={(e) => setCollectMethod(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="Cash">Cash (নগদ)</option>
                      <option value="bKash">bKash (বিকাশ)</option>
                      <option value="Nagad">Nagad (নগদ অ্যাপ)</option>
                      <option value="Card">Card (কার্ড)</option>
                      <option value="Bank Transfer">Bank Transfer (ব্যাংক)</option>
                      <option value="Other">Other (অন্যান্য)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">রেফারেন্স / TrxID</label>
                    <input
                      type="text"
                      value={collectNote}
                      onChange={(e) => setCollectNote(e.target.value)}
                      placeholder="Receipt / TrxID..."
                      className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setCollectingRx(null)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Processing...' : 'Collect & Send to Doctor'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
