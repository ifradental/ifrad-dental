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
  BadgeAlert,
  Activity,
  Stethoscope,
  Zap,
  Phone,
  User
} from 'lucide-react';
import { 
  db, 
  type PaymentRecord, 
  type ExpenseRecord, 
  type Prescription, 
  type CashSubmission, 
  type ClinicSettings,
  type Patient 
} from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import CashSubmissionVoucherModal from '@/components/payments/CashSubmissionVoucherModal';
import PaymentReceiptModal from '@/components/payments/PaymentReceiptModal';
import ExpenseVoucherModal from '@/components/payments/ExpenseVoucherModal';

export default function PaymentsPage() {
  const { user, activeDepartment } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isReceptionistOrCashier = 
    user?.role?.toLowerCase().includes('receptionist') || 
    user?.role?.toLowerCase().includes('cashier');

  // Department Filter: 'all' | 'dental' | 'physiotherapy'
  const [departmentFilter, setDepartmentFilter] = useState<'all' | 'dental' | 'physiotherapy'>(
    activeDepartment === 'physiotherapy' ? 'physiotherapy' : 'all'
  );

  const [activeTab, setActiveTab] = useState<'payments' | 'cash_submissions' | 'doctor_prescriptions' | 'expenses' | 'summary'>('payments');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [pendingPrescriptions, setPendingPrescriptions] = useState<Prescription[]>([]);
  const [cashSubmissions, setCashSubmissions] = useState<CashSubmission[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Collect Payment Modal State (From Doctor Queue)
  const [collectingRx, setCollectingRx] = useState<Prescription | null>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMethod, setCollectMethod] = useState<string>('Cash');
  const [collectNote, setCollectNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Direct Payment / Receipt Collection Modal (Receptionist counter)
  const [isDirectModalOpen, setIsDirectModalOpen] = useState<boolean>(false);
  const [directDept, setDirectDept] = useState<'dental' | 'physiotherapy'>('dental');
  const [directRegNo, setDirectRegNo] = useState<string>('');
  const [directName, setDirectName] = useState<string>('');
  const [directMobile, setDirectMobile] = useState<string>('');
  const [directParticulars, setDirectParticulars] = useState<string>('');
  const [directTotalBill, setDirectTotalBill] = useState<number>(500);
  const [directPaidAmount, setDirectPaidAmount] = useState<number>(500);
  const [directDiscount, setDirectDiscount] = useState<number>(0);
  const [directMethod, setDirectMethod] = useState<string>('Cash');
  const [directNote, setDirectNote] = useState<string>('');
  const [directDoctorName, setDirectDoctorName] = useState<string>('');

  // Receipt Modal State for instant print
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentRecord | null>(null);
  const [selectedExpenseForVoucher, setSelectedExpenseForVoucher] = useState<ExpenseRecord | null>(null);

  // Add Expense Form State
  const [expenseDepartment, setExpenseDepartment] = useState<'dental' | 'physiotherapy' | 'general'>('general');
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

  // Synchronize department filter if user changes global context
  useEffect(() => {
    if (activeDepartment === 'physiotherapy') {
      setDepartmentFilter('physiotherapy');
    }
  }, [activeDepartment]);

  const loadData = async () => {
    try {
      const [payList, expList, allRx, subs, settingsList, ptList] = await Promise.all([
        db.payments.reverse().toArray(),
        db.expenses.reverse().toArray(),
        db.prescriptions.reverse().toArray(),
        db.cashSubmissions.reverse().toArray(),
        db.settings.toArray(),
        db.patients.toArray(),
      ]);

      setPayments(payList);
      setExpenses(expList);
      setPatients(ptList);

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

  // Helper classification functions
  const isPhysioPayment = (p: PaymentRecord) => {
    if (p.department === 'physiotherapy') return true;
    if (p.department === 'dental') return false;
    const txt = `${p.particulars || ''} ${p.note || ''}`.toLowerCase();
    return (
      txt.includes('physio') ||
      txt.includes('ফিজিওথেরাপি') ||
      txt.includes('therapy') ||
      txt.includes('থেরাপি') ||
      txt.includes('ust') ||
      txt.includes('ift') ||
      txt.includes('traction') ||
      txt.includes('tens') ||
      txt.includes('stroke') ||
      txt.includes('rehab') ||
      txt.includes('paraffin') ||
      txt.includes('সেশন') ||
      txt.includes('মডালিটি')
    );
  };

  const isDentalPayment = (p: PaymentRecord) => {
    if (p.department === 'dental') return true;
    if (p.department === 'physiotherapy') return false;
    return !isPhysioPayment(p);
  };

  const isPhysioRx = (rx: Prescription) => {
    if (rx.department === 'physiotherapy') return true;
    const txt = `${rx.doctorName || ''} ${rx.contract?.particulars || ''}`.toLowerCase();
    return (
      txt.includes('physio') ||
      txt.includes('ফিজিওথেরাপি') ||
      txt.includes('therapy') ||
      txt.includes('থেরাপিস্ট')
    );
  };

  // Filtered Payments based on Department and Search
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (departmentFilter === 'dental' && !isDentalPayment(p)) return false;
      if (departmentFilter === 'physiotherapy' && !isPhysioPayment(p)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchReg = p.regNo?.toString().includes(q);
        const matchMobile = p.mobile?.includes(q);
        const matchParticulars = p.particulars?.toLowerCase().includes(q);
        if (!matchName && !matchReg && !matchMobile && !matchParticulars) return false;
      }
      return true;
    });
  }, [payments, departmentFilter, searchQuery]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (departmentFilter === 'dental' && e.department === 'physiotherapy') return false;
      if (departmentFilter === 'physiotherapy' && e.department === 'dental') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchParticular = e.particular?.toLowerCase().includes(q);
        const matchCategory = e.category?.toLowerCase().includes(q);
        if (!matchParticular && !matchCategory) return false;
      }
      return true;
    });
  }, [expenses, departmentFilter, searchQuery]);

  // Filtered Pending Prescriptions
  const filteredPendingPrescriptions = useMemo(() => {
    return pendingPrescriptions.filter((rx) => {
      if (departmentFilter === 'dental' && isPhysioRx(rx)) return false;
      if (departmentFilter === 'physiotherapy' && !isPhysioRx(rx)) return false;
      return true;
    });
  }, [pendingPrescriptions, departmentFilter]);

  // Totals and KPI calculations based on selected department filter
  const totalCollected = useMemo(() => {
    const list = departmentFilter === 'all' 
      ? payments 
      : departmentFilter === 'dental' 
        ? payments.filter(isDentalPayment) 
        : payments.filter(isPhysioPayment);
    return list.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  }, [payments, departmentFilter]);

  const totalDueAmount = useMemo(() => {
    const list = departmentFilter === 'all' 
      ? payments 
      : departmentFilter === 'dental' 
        ? payments.filter(isDentalPayment) 
        : payments.filter(isPhysioPayment);
    return list.reduce((sum, p) => sum + (Number(p.dueAmount) || 0), 0);
  }, [payments, departmentFilter]);

  const totalExpended = useMemo(() => {
    const list = departmentFilter === 'all'
      ? expenses
      : departmentFilter === 'dental'
        ? expenses.filter(e => e.department !== 'physiotherapy')
        : expenses.filter(e => e.department === 'physiotherapy');
    return list.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses, departmentFilter]);

  const netIncome = totalCollected - totalExpended;

  // Department wise breakdown stats
  const dentalTotalCollected = useMemo(() => payments.filter(isDentalPayment).reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0), [payments]);
  const physioTotalCollected = useMemo(() => payments.filter(isPhysioPayment).reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0), [payments]);
  const dentalTotalExpended = useMemo(() => expenses.filter(e => e.department !== 'physiotherapy').reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [expenses]);
  const physioTotalExpended = useMemo(() => expenses.filter(e => e.department === 'physiotherapy').reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [expenses]);

  // Cash Submission calculations
  const approvedSubmissions = useMemo(() => cashSubmissions.filter((s) => s.status === 'Approved'), [cashSubmissions]);
  const pendingSubmissions = useMemo(() => cashSubmissions.filter((s) => s.status === 'Pending'), [cashSubmissions]);
  const totalApprovedAmount = useMemo(() => approvedSubmissions.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0), [approvedSubmissions]);
  const totalPendingAmount = useMemo(() => pendingSubmissions.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0), [pendingSubmissions]);

  // Unsubmitted cash balance
  const unsubmittedCashBalance = useMemo(() => {
    const allCol = payments.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
    return Math.max(0, allCol - totalApprovedAmount - totalPendingAmount);
  }, [payments, totalApprovedAmount, totalPendingAmount]);

  // Today's specific collections
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayCollected = useMemo(() => {
    return payments
      .filter((p) => p.date === todayStr)
      .reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  }, [payments, todayStr]);

  // Open Direct Payment Collection Modal
  const handleOpenDirectPaymentModal = (dept?: 'dental' | 'physiotherapy') => {
    const targetDept = dept || (departmentFilter === 'physiotherapy' ? 'physiotherapy' : 'dental');
    setDirectDept(targetDept);
    setDirectRegNo('');
    setDirectName('');
    setDirectMobile('');
    if (targetDept === 'physiotherapy') {
      setDirectParticulars('Physiotherapy Session & Modality Fee');
      setDirectTotalBill(500);
      setDirectPaidAmount(500);
      setDirectDoctorName('ফিজিওথেরাপিস্ট');
    } else {
      setDirectParticulars('Dental Consultation & Treatment');
      setDirectTotalBill(500);
      setDirectPaidAmount(500);
      setDirectDoctorName('ডা. নাহিদ হাসান');
    }
    setDirectDiscount(0);
    setDirectMethod('Cash');
    setDirectNote('');
    setIsDirectModalOpen(true);
  };

  // Handle Reg No or Mobile change to autofill patient info
  const handleRegNoLookup = (val: string) => {
    setDirectRegNo(val);
    const regNum = Number(val);
    if (!isNaN(regNum) && regNum > 0) {
      const match = patients.find((p) => p.regNo === regNum);
      if (match) {
        setDirectName(match.name || '');
        setDirectMobile(match.mobile || '');
      }
    }
  };

  // Submit Direct Payment
  const handleSubmitDirectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const paid = Number(directPaidAmount) || 0;
    const total = Number(directTotalBill) || paid;
    const disc = Number(directDiscount) || 0;
    const payable = Math.max(0, total - disc);
    const due = Math.max(0, payable - paid);

    if (paid <= 0 && payable <= 0) {
      alert('অনুগ্রহ করে বিল বা জমা টাকার পরিমাণ লিখুন!');
      return;
    }

    setIsSubmitting(true);
    try {
      let regNo = Number(directRegNo);
      if (!regNo || isNaN(regNo)) {
        regNo = Math.floor(10000 + Math.random() * 90000);
      }

      const paymentRecord: PaymentRecord = {
        id: `pay_${regNo}_${Date.now()}`,
        regNo,
        name: directName.trim() || 'Walk-in Patient',
        mobile: directMobile.trim(),
        date: new Date().toISOString().split('T')[0],
        particulars: directParticulars.trim() || (directDept === 'physiotherapy' ? 'Physiotherapy Treatment' : 'Dental Treatment'),
        totalBill: total,
        discount: disc,
        payableAmount: payable,
        paidAmount: paid,
        dueAmount: due,
        method: directMethod,
        department: directDept,
        note: directNote.trim() || (directDoctorName ? `Dr: ${directDoctorName}` : undefined),
        addedBy: user?.name || (isReceptionistOrCashier ? 'Receptionist' : 'Cashier'),
        status: due > 0 ? 'Partial' : 'Paid',
        createdAt: new Date().toISOString(),
      };

      await db.payments.put(paymentRecord);
      await syncEngine.logMutation('payments', 'INSERT', paymentRecord.id, paymentRecord);

      logActivity({
        action: 'COLLECT_DIRECT_PAYMENT',
        module: 'Payment',
        description: `রিসেপশনে ${directDept === 'physiotherapy' ? 'ফিজিওথেরাপি' : 'ডেন্টাল'} ফি ৳${paid.toLocaleString()} জমা নেয়া হয়েছে (পেশেন্ট: ${paymentRecord.name}, Reg: #${regNo})`,
        metadata: paymentRecord,
        user: user || undefined,
      });

      setIsDirectModalOpen(false);
      await loadData();
      setSelectedPaymentForReceipt(paymentRecord);
    } catch (err) {
      console.error(err);
      alert('পেমেন্ট সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    if (!expenseParticular.trim() || !expenseAmount || Number(expenseAmount) <= 0) {
      alert('অনুগ্রহ করে খরচের বিবরণ ও টাকার পরিমাণ দিন!');
      return;
    }

    const deptVal = expenseDepartment === 'general' ? 'all' : expenseDepartment;
    const expItem: ExpenseRecord = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: expenseDate,
      category: expenseCategory,
      department: deptVal as any,
      title: expenseParticular.trim(),
      amount: Number(expenseAmount),
      paymentMethod: 'Cash',
      spentBy: user?.name || 'Receptionist',
      voucherNo: `EXP-${Date.now().toString().slice(-6)}`,
      note: expenseNote.trim(),
      createdAt: new Date().toISOString(),
    };

    await db.expenses.put(expItem);
    await syncEngine.logMutation('expenses', 'INSERT', expItem.id, expItem);

    logActivity({
      action: 'ADD_EXPENSE',
      module: 'Payment',
      description: `ক্লিনিক খরচ এন্ট্রি: ৳${expItem.amount.toLocaleString()} (${expItem.category} - ${expItem.title})`,
      metadata: expItem,
      user: user || undefined,
    });

    setExpenseParticular('');
    setExpenseAmount(0);
    setExpenseNote('');
    await loadData();
    setSelectedExpenseForVoucher(expItem);
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
                {departmentFilter !== 'all' && (
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    departmentFilter === 'physiotherapy' ? 'bg-teal-100 text-teal-800 border border-teal-300' : 'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}>
                    {departmentFilter === 'physiotherapy' ? '⚡ ফিজিওথেরাপি ফিল্টার' : '🦷 ডেন্টাল ফিল্টার'}
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs">
                Patient billing, cashier daily collections, cash submission to admin, and clinic expense ledger
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {/* Direct Collection Button for Receptionist */}
            <button
              type="button"
              onClick={() => handleOpenDirectPaymentModal()}
              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ রসিদ সংগ্রহ (Direct Bill)</span>
            </button>

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
              {filteredPendingPrescriptions.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                  {filteredPendingPrescriptions.length}
                </span>
              )}
            </button>

            {/* Tab: Cash Submissions */}
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

        {/* DEPARTMENT SWITCHER BAR (DENTAL vs PHYSIOTHERAPY vs ALL) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-3.5 flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>ডিপার্টমেন্ট অ্যাকাউন্টস নির্বাচন:</span>
            </span>

            <div className="inline-flex bg-white p-1 rounded-lg border border-slate-200 shadow-2xs gap-1">
              {/* All Clinic */}
              <button
                type="button"
                onClick={() => setDepartmentFilter('all')}
                className={`px-3 py-1 rounded-md font-bold text-xs transition-all flex items-center gap-1.5 ${
                  departmentFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>🏥 সার্বিক ক্লিনিক (All)</span>
                <span className="text-[10px] font-mono opacity-80">
                  (৳{(dentalTotalCollected + physioTotalCollected).toLocaleString()})
                </span>
              </button>

              {/* Dental Accounts */}
              <button
                type="button"
                onClick={() => setDepartmentFilter('dental')}
                className={`px-3 py-1 rounded-md font-bold text-xs transition-all flex items-center gap-1.5 ${
                  departmentFilter === 'dental'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-900 hover:bg-blue-50'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>🦷 ডেন্টাল অ্যাকাউন্টস (Dental)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-100 text-blue-900 rounded font-bold">
                  ৳{dentalTotalCollected.toLocaleString()}
                </span>
              </button>

              {/* Physiotherapy Accounts */}
              <button
                type="button"
                onClick={() => setDepartmentFilter('physiotherapy')}
                className={`px-3 py-1 rounded-md font-bold text-xs transition-all flex items-center gap-1.5 ${
                  departmentFilter === 'physiotherapy'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-teal-900 hover:bg-teal-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>⚡ ফিজিওথেরাপি অ্যাকাউন্টস (Physio)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-teal-100 text-teal-900 rounded font-bold">
                  ৳{physioTotalCollected.toLocaleString()}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleOpenDirectPaymentModal('dental')}
              className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 font-bold rounded-lg text-xs flex items-center gap-1 transition"
            >
              <span>🦷 + ডেন্টাল পেমেন্ট</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenDirectPaymentModal('physiotherapy')}
              className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 font-bold rounded-lg text-xs flex items-center gap-1 transition"
            >
              <span>⚡ + ফিজিওথেরাপি পেমেন্ট</span>
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
            <span className="text-[9px] text-emerald-600 block mt-0.5">
              {departmentFilter === 'physiotherapy' ? 'ফিজিওথেরাপি সংগৃহীত বিল' : departmentFilter === 'dental' ? 'ডেন্টাল সংগৃহীত বিল' : 'সর্বমোট সংগৃহীত বিল'}
            </span>
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
              <span>{filteredPendingPrescriptions.length} Patients</span>
              <span className="text-[10px] bg-sky-200 text-sky-900 px-1.5 py-0.5 rounded font-bold">
                Collect Bill
              </span>
            </div>
            <span className="text-[9px] text-sky-600 block mt-0.5">
              {departmentFilter === 'physiotherapy' ? 'ফিজিওথেরাপি প্রেসক্রিপশন' : departmentFilter === 'dental' ? 'ডেন্টাল প্রেসক্রিপশন' : 'ডাক্তার থেকে প্রাপ্ত প্রেসক্রিপশন'}
            </span>
          </div>

          <div className="bg-red-50/90 border border-red-200 rounded-xl p-3 shadow-xs">
            <div className="flex items-center justify-between text-red-800 text-[10px] font-semibold uppercase">
              <span>Total Expenses</span>
              <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-red-950 mt-1">
              ৳ {totalExpended.toLocaleString()}
            </div>
            <span className="text-[9px] text-red-600 block mt-0.5">
              {departmentFilter === 'physiotherapy' ? 'ফিজিওথেরাপি খরচ' : departmentFilter === 'dental' ? 'ডেন্টাল ক্লিনিক খরচ' : 'মোট ক্লিনিক খরচ'}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB: CASH SUBMISSIONS & HANDOVER APPROVALS */}
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
        {/* TAB 1: PAYMENTS LIST (WITH DENTAL VS PHYSIOTHERAPY BADGES & RECEIPT PRINT) */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search payments by Patient Name, Reg No, Mobile, Particulars..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  মোট ট্রানজেকশন: <strong className="text-slate-800">{filteredPayments.length}</strong> টি
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenDirectPaymentModal()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>পেমেন্ট এন্ট্রি</span>
                </button>
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
                কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs bg-white text-xs">
                <table className="w-full text-left">
                  <thead className="bg-sky-50 text-slate-700 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-2.5 w-10 text-center">SI</th>
                      <th className="p-2.5 w-24">Date</th>
                      <th className="p-2.5 w-28 text-center">Department</th>
                      <th className="p-2.5 w-20">Reg. No</th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5 w-28">Mobile</th>
                      <th className="p-2.5">Particulars</th>
                      <th className="p-2.5 w-24 text-right">Total Bill</th>
                      <th className="p-2.5 w-24 text-right">Paid (TK)</th>
                      <th className="p-2.5 w-24 text-right">Due (TK)</th>
                      <th className="p-2.5 w-28 text-center">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((pay, i) => {
                      const isPhysio = isPhysioPayment(pay);
                      return (
                        <tr key={pay.id} className="hover:bg-sky-50/40 transition-colors">
                          <td className="p-2.5 text-center text-slate-500 font-semibold">{i + 1}</td>
                          <td className="p-2.5 font-medium whitespace-nowrap">{pay.date}</td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                isPhysio
                                  ? 'bg-teal-100 text-teal-800 border border-teal-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}
                            >
                              {isPhysio ? (
                                <>
                                  <Zap className="w-3 h-3 text-amber-500" />
                                  <span>ফিজিওথেরাপি</span>
                                </>
                              ) : (
                                <>
                                  <Stethoscope className="w-3 h-3 text-blue-600" />
                                  <span>ডেন্টাল</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-blue-900">{pay.regNo}</td>
                          <td className="p-2.5 font-bold text-slate-900">{pay.name}</td>
                          <td className="p-2.5 font-mono text-slate-600">{pay.mobile || '-'}</td>
                          <td className="p-2.5 text-slate-700">
                            <div>{pay.particulars}</div>
                            {pay.note && <div className="text-[10px] text-slate-400">{pay.note}</div>}
                          </td>
                          <td className="p-2.5 text-right font-semibold">৳ {pay.totalBill}</td>
                          <td className="p-2.5 text-right font-black text-emerald-700 font-mono">৳ {pay.paidAmount}</td>
                          <td className="p-2.5 text-right font-bold text-red-600 font-mono">
                            {pay.dueAmount > 0 ? `৳ ${pay.dueAmount}` : '-'}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedPaymentForReceipt(pay)}
                              className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded font-semibold text-[11px] flex items-center justify-center gap-1 mx-auto transition"
                              title="Print Money Receipt"
                            >
                              <Printer className="w-3 h-3 text-slate-500" />
                              <span>রসিদ</span>
                            </button>
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
        {/* TAB 2: EXPENSES ENTRY (WITH DENTAL / PHYSIOTHERAPY / GENERAL SELECTOR) */}
        {/* ========================================================================= */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <form onSubmit={handleAddExpense} className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs">
              <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-blue-900">Daily Clinic Expense Voucher Entry</div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-600 font-medium">বিভাগ (Department):</span>
                  <div className="inline-flex bg-white rounded border border-slate-300 p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setExpenseDepartment('general')}
                      className={`px-2 py-0.5 rounded font-bold ${expenseDepartment === 'general' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
                    >
                      🏢 সার্বিক/সাধারণ
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseDepartment('dental')}
                      className={`px-2 py-0.5 rounded font-bold ${expenseDepartment === 'dental' ? 'bg-blue-600 text-white' : 'text-blue-800'}`}
                    >
                      🦷 ডেন্টাল
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseDepartment('physiotherapy')}
                      className={`px-2 py-0.5 rounded font-bold ${expenseDepartment === 'physiotherapy' ? 'bg-teal-600 text-white' : 'text-teal-800'}`}
                    >
                      ⚡ ফিজিওথেরাপি
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-slate-600 font-medium mb-0.5">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    {expenseDepartment === 'physiotherapy' ? (
                      <>
                        <option value="Physio Gel & Consumables">Therapy Gel, Electrodes &amp; Straps</option>
                        <option value="Physio Equipment Maintenance">Machine Maintenance (UST, IFT, Traction)</option>
                        <option value="Therapist Honorarium">Physiotherapist Honorarium / Commission</option>
                        <option value="Clinic Rent & Utility">Clinic Rent &amp; Electricity</option>
                        <option value="Staff Salary">Staff &amp; Assistant Salary</option>
                        <option value="Others">Others</option>
                      </>
                    ) : (
                      <>
                        <option value="Dental Materials">Dental Materials &amp; Medicines</option>
                        <option value="Lab Bills">Dental Lab Bills (Crown/Denture)</option>
                        <option value="Clinic Rent & Utility">Clinic Rent &amp; Electricity</option>
                        <option value="Staff Salary">Staff &amp; Assistant Salary</option>
                        <option value="Equipment Maintenance">Equipment Maintenance</option>
                        <option value="Others">Others</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="col-span-12 md:col-span-4">
                  <label className="block text-slate-600 font-medium mb-0.5">Particulars / Description *</label>
                  <input
                    type="text"
                    required
                    value={expenseParticular}
                    onChange={(e) => setExpenseParticular(e.target.value)}
                    placeholder={expenseDepartment === 'physiotherapy' ? 'e.g. Ultrasound conductive gel / TENS pad' : 'e.g. Composite resin / Ceramic crown bill'}
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

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs bg-white text-xs">
              <table className="w-full text-left">
                <thead className="bg-rose-50/70 text-slate-700 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="p-2.5 w-10 text-center">SI</th>
                    <th className="p-2.5 w-24">তারিখ</th>
                    <th className="p-2.5 w-24 font-mono">ভাউচার নং</th>
                    <th className="p-2.5 w-24 text-center">বিভাগ</th>
                    <th className="p-2.5 w-40">ক্যাটাগরি</th>
                    <th className="p-2.5">খরচের বিবরণ</th>
                    <th className="p-2.5 w-24 text-right">পরিমাণ (টাকা)</th>
                    <th className="p-2.5 w-28 text-center">ভাউচার রসিদ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp: any, i) => (
                    <tr key={exp.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="p-2.5 text-center text-slate-500 font-semibold">{i + 1}</td>
                      <td className="p-2.5 font-medium whitespace-nowrap">{exp.date}</td>
                      <td className="p-2.5 font-mono font-bold text-rose-700">{exp.voucherNo || '-'}</td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          exp.department === 'physiotherapy' ? 'bg-teal-100 text-teal-800 border border-teal-300' : exp.department === 'dental' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          {exp.department === 'physiotherapy' ? '⚡ ফিজিও' : exp.department === 'dental' ? '🦷 ডেন্টাল' : '🏢 সার্বিক'}
                        </span>
                      </td>
                      <td className="p-2.5 font-semibold text-slate-800">{exp.category}</td>
                      <td className="p-2.5 text-slate-700 font-medium">
                        <div>{exp.title || exp.particular}</div>
                        {exp.note && <div className="text-[10px] text-slate-400">{exp.note}</div>}
                      </td>
                      <td className="p-2.5 text-right font-black text-rose-700 font-mono">৳ {(exp.amount || 0).toLocaleString()}</td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedExpenseForVoucher(exp)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer shadow-2xs"
                        >
                          <Printer className="w-3 h-3 text-rose-600" />
                          <span>ভাউচার</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SUMMARY (WITH DENTAL VS PHYSIOTHERAPY COMPARISON) */}
        {/* ========================================================================= */}
        {activeTab === 'summary' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>ডিপার্টমেন্ট ভিত্তিক আয়-ব্যয় ও লাভ-ক্ষতির পূর্ণাঙ্গ চিত্র (Financial Overview)</span>
            </h3>

            {/* Department Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dental Unit Card */}
              <div className="p-4 bg-white rounded-xl border-2 border-blue-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">🦷</span>
                    <div>
                      <h4 className="font-extrabold text-blue-900 text-sm">ডেন্টাল বিভাগ (Dental Unit)</h4>
                      <span className="text-[10px] text-slate-500">ডেন্টাল কনসালটেশন, ওপিজি ও সকল ট্রিটমেন্ট</span>
                    </div>
                  </div>
                  <span className="text-[11px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded">
                    {payments.filter(isDentalPayment).length} Patients
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-bold block uppercase">মোট আয় (Income)</span>
                    <span className="text-lg font-black font-mono text-emerald-950">৳ {dentalTotalCollected.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-red-50 rounded-lg border border-red-100">
                    <span className="text-[10px] text-red-700 font-bold block uppercase">মোট খরচ (Expense)</span>
                    <span className="text-lg font-black font-mono text-red-950">৳ {dentalTotalExpended.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-200 flex justify-between items-center font-bold">
                  <span className="text-blue-900">ডেন্টাল নিট ক্যাশ প্রফিট:</span>
                  <span className="font-mono text-base font-black text-blue-950">
                    ৳ {(dentalTotalCollected - dentalTotalExpended).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Physiotherapy Unit Card */}
              <div className="p-4 bg-white rounded-xl border-2 border-teal-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">⚡</span>
                    <div>
                      <h4 className="font-extrabold text-teal-900 text-sm">ফিজিওথেরাপি বিভাগ (Physiotherapy Unit)</h4>
                      <span className="text-[10px] text-slate-500">ইলেক্ট্রোথেরাপি, ট্র্যাকশন ও রিহ্যাব সেশন</span>
                    </div>
                  </div>
                  <span className="text-[11px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded">
                    {payments.filter(isPhysioPayment).length} Patients
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-bold block uppercase">মোট আয় (Income)</span>
                    <span className="text-lg font-black font-mono text-emerald-950">৳ {physioTotalCollected.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-red-50 rounded-lg border border-red-100">
                    <span className="text-[10px] text-red-700 font-bold block uppercase">মোট খরচ (Expense)</span>
                    <span className="text-lg font-black font-mono text-red-950">৳ {physioTotalExpended.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-teal-50/70 rounded-lg border border-teal-200 flex justify-between items-center font-bold">
                  <span className="text-teal-900">ফিজিওথেরাপি নিট ক্যাশ প্রফিট:</span>
                  <span className="font-mono text-base font-black text-teal-950">
                    ৳ {(physioTotalCollected - physioTotalExpended).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Summary Bar */}
            <div className="p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-xl shadow flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-300 block uppercase font-bold">সার্বিক ক্লিনিক ব্যালেন্স (All Total)</span>
                <span className="text-xl font-black font-mono">৳ {(dentalTotalCollected + physioTotalCollected).toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-300 block uppercase font-bold">মোট ব্যয় বাদ দিয়ে নিট উদ্বৃত্ত</span>
                <span className="text-xl font-black font-mono text-emerald-300">
                  ৳ {(dentalTotalCollected + physioTotalCollected - dentalTotalExpended - physioTotalExpended).toLocaleString()}
                </span>
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
                {filteredPendingPrescriptions.length} টি পেন্ডিং
              </span>
            </div>

            {filteredPendingPrescriptions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded text-xs">
                বর্তমানে কোনো প্রেসক্রিপশন পেন্ডিং নেই।
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded text-xs">
                <table className="w-full text-left">
                  <thead className="bg-amber-100/70 text-slate-800 border-b border-amber-200 font-semibold">
                    <tr>
                      <th className="p-2 w-10 text-center">SI</th>
                      <th className="p-2 w-24">Date</th>
                      <th className="p-2 w-24 text-center">Department</th>
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
                    {filteredPendingPrescriptions.map((rx, idx) => {
                      const totalBill = rx.contract?.payableAmount || rx.payment?.totalBill || 0;
                      const paid = rx.payment?.totalPaid || 0;
                      const due = Math.max(0, totalBill - paid);
                      const isPhysio = isPhysioRx(rx);
                      return (
                        <tr key={rx.id} className="hover:bg-amber-50/40">
                          <td className="p-2 text-center text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="p-2 font-medium">{rx.date}</td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPhysio ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isPhysio ? '⚡ ফিজিওথেরাপি' : '🦷 ডেন্টাল'}
                            </span>
                          </td>
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
        {/* MODAL: DIRECT PAYMENT & RECEIPT COLLECTION (RECEPTIONIST COUNTER) */}
        {/* ========================================================================= */}
        {isDirectModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-300 text-xs">
              <div className={`px-5 py-3.5 flex justify-between items-center text-white ${
                directDept === 'physiotherapy'
                  ? 'bg-gradient-to-r from-teal-700 via-teal-800 to-cyan-800'
                  : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700'
              }`}>
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                    {directDept === 'physiotherapy' ? '⚡' : '🦷'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">
                      {directDept === 'physiotherapy' ? 'ফিজিওথেরাপি ফি আদায় ও রসিদ (Physiotherapy Billing)' : 'ডেন্টাল পেমেন্ট আদায় ও রসিদ (Dental Billing)'}
                    </h3>
                    <span className="text-[10px] text-white/80">রিসেপশন কাউন্টারে সরাসরি ফি সংগ্রহ ও মানি রসিদ প্রিন্ট</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDirectModalOpen(false)}
                  className="hover:bg-white/20 p-1 rounded-lg text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitDirectPayment} className="p-5 space-y-3.5 max-h-[85vh] overflow-y-auto">
                {/* Department Toggle */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">বিভাগ নির্বাচন করুন (Select Department):</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDirectDept('dental');
                        setDirectParticulars('Dental Consultation & Treatment');
                        setDirectDoctorName('ডা. নাহিদ হাসান');
                      }}
                      className={`p-2.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition ${
                        directDept === 'dental'
                          ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Stethoscope className="w-4 h-4 text-blue-600" />
                      <span>🦷 ডেন্টাল বিভাগ (Dental)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDirectDept('physiotherapy');
                        setDirectParticulars('Physiotherapy Session & Modality Fee');
                        setDirectDoctorName('ফিজিওথেরাপিস্ট');
                      }}
                      className={`p-2.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition ${
                        directDept === 'physiotherapy'
                          ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Zap className="w-4 h-4 text-teal-600" />
                      <span>⚡ ফিজিওথেরাপি বিভাগ (Physio)</span>
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block text-slate-500 font-semibold mb-1 text-[11px]">
                    কুইক সার্ভিস প্রিসেট (Quick Preset Buttons):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {directDept === 'dental' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectParticulars('Dental Consultation Fee');
                            setDirectTotalBill(500);
                            setDirectPaidAmount(500);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-100 text-blue-900 rounded font-semibold text-[11px] border border-slate-200"
                        >
                          কনসালটেশন (৳৫০০)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectParticulars('Scaling & Polishing');
                            setDirectTotalBill(1500);
                            setDirectPaidAmount(1500);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-100 text-blue-900 rounded font-semibold text-[11px] border border-slate-200"
                        >
                          স্কেলিং ও পলিশিং (৳১,৫০০)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectParticulars('Tooth Extraction / দাঁত তোলা');
                            setDirectTotalBill(1000);
                            setDirectPaidAmount(1000);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-100 text-blue-900 rounded font-semibold text-[11px] border border-slate-200"
                        >
                          দাঁত তোলা (৳১,০০০)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectParticulars('Root Canal Treatment (RCT)');
                            setDirectTotalBill(3500);
                            setDirectPaidAmount(1500);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-100 text-blue-900 rounded font-semibold text-[11px] border border-slate-200"
                        >
                          রুট ক্যানেল (৳৩,৫০০)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectParticulars('Composite Tooth Filling');
                            setDirectTotalBill(1200);
                            setDirectPaidAmount(1200);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-100 text-blue-900 rounded font-semibold text-[11px] border border-slate-200"
                        >
                          কম্পোজিট ফিলিং (৳১,২০০)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectParticulars('Ceramic Crown / Cap');
                            setDirectTotalBill(4000);
                            setDirectPaidAmount(2000);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-100 text-blue-900 rounded font-semibold text-[11px] border border-slate-200"
                        >
                          ক্যাপ/ক্রাউন (৳৪,০০০)
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectParticulars('Physiotherapy Single Session Fee');
                            setDirectTotalBill(500);
                            setDirectPaidAmount(500);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-teal-100 text-teal-900 rounded font-semibold text-[11px] border border-slate-200"
                        >
                          সেশন ফি (৳৫০০)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectParticulars('UST + IFT Combo Electrotherapy');
                            setDirectTotalBill(800);
                            setDirectPaidAmount(800);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-teal-100 text-teal-900 rounded font-semibold text-[11px] border border-slate-200"
                        >
                          UST+IFT কম্বো (৳৮০০)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectParticulars('Cervical / Lumbar Traction Therapy');
                            setDirectTotalBill(700);
                            setDirectPaidAmount(700);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-teal-100 text-teal-900 rounded font-semibold text-[11px] border border-slate-200"
                        >
                          ট্র্যাকশন থেরাপি (৳৭০০)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectParticulars('Stroke & Neuro Rehabilitation Session');
                            setDirectTotalBill(1200);
                            setDirectPaidAmount(1200);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-teal-100 text-teal-900 rounded font-semibold text-[11px] border border-slate-200"
                        >
                          স্ট্রোক রিহ্যাব (৳১,২০০)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectParticulars('10-Session Full Physio Package');
                            setDirectTotalBill(4500);
                            setDirectPaidAmount(4500);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-teal-100 text-teal-900 rounded font-semibold text-[11px] border border-slate-200 font-bold"
                        >
                          ১০-সেশন প্যাকেজ (৳৪,৫০০)
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Patient Information */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 sm:col-span-4">
                      <label className="block font-bold text-slate-700 mb-0.5">রেজিস্ট্রেশন নং (Reg No)</label>
                      <input
                        type="text"
                        value={directRegNo}
                        onChange={(e) => handleRegNoLookup(e.target.value)}
                        placeholder="e.g. 1001"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-8">
                      <label className="block font-bold text-slate-700 mb-0.5">রোগীর নাম (Patient Name) *</label>
                      <input
                        type="text"
                        required
                        value={directName}
                        onChange={(e) => setDirectName(e.target.value)}
                        placeholder="রোগীর নাম লিখুন..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-bold bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 sm:col-span-6">
                      <label className="block text-slate-600 font-medium mb-0.5">মোবাইল নম্বর (Mobile)</label>
                      <input
                        type="text"
                        value={directMobile}
                        onChange={(e) => setDirectMobile(e.target.value)}
                        placeholder="017XXXXXXXX"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white focus:outline-none"
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <label className="block text-slate-600 font-medium mb-0.5">ডাক্তার / থেরাপিস্ট নাম</label>
                      <input
                        type="text"
                        value={directDoctorName}
                        onChange={(e) => setDirectDoctorName(e.target.value)}
                        placeholder="ডা. নাহিদ হাসান / থেরাপিস্ট"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Particulars */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ট্রিটমেন্ট / সেবার বিবরণ (Particulars) *</label>
                  <input
                    type="text"
                    required
                    value={directParticulars}
                    onChange={(e) => setDirectParticulars(e.target.value)}
                    placeholder="সেবার বিবরণ লিখুন..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Financials & Calculation */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">মোট বিল (Total Bill - ৳)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={directTotalBill || ''}
                      onChange={(e) => setDirectTotalBill(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-right text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-800 mb-1">আজকের জমা (Paid - ৳) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={directPaidAmount || ''}
                      onChange={(e) => setDirectPaidAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border-2 border-emerald-500 rounded-lg font-mono font-black text-right text-emerald-950 bg-emerald-50/40"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-red-700 mb-1">বকেয়া (Due - ৳)</label>
                    <div className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-100 rounded-lg font-mono font-bold text-right text-red-600">
                      ৳ {Math.max(0, directTotalBill - directDiscount - directPaidAmount)}
                    </div>
                  </div>
                </div>

                {/* Payment Method & Trx */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">পেমেন্ট মেথড</label>
                    <select
                      value={directMethod}
                      onChange={(e) => setDirectMethod(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Cash">Cash (নগদ)</option>
                      <option value="bKash">bKash (বিকাশ)</option>
                      <option value="Nagad">Nagad (নগদ)</option>
                      <option value="Card">Card (কার্ড)</option>
                      <option value="Bank Transfer">Bank Transfer (ব্যাংক)</option>
                      <option value="Other">Other (অন্যান্য)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">নোট / TrxID</label>
                    <input
                      type="text"
                      value={directNote}
                      onChange={(e) => setDirectNote(e.target.value)}
                      placeholder="Transaction Reference / Note..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsDirectModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-5 py-2 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition ${
                      directDept === 'physiotherapy'
                        ? 'bg-teal-600 hover:bg-teal-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'জমা সংরক্ষণ ও মানি রসিদ প্রিন্ট'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: MONEY RECEIPT PRINT MODAL (THERMAL 80MM / 58MM & A4) */}
        {/* ========================================================================= */}
        {selectedPaymentForReceipt && (
          <PaymentReceiptModal
            isOpen={true}
            payment={selectedPaymentForReceipt}
            clinicSettings={clinicSettings}
            onClose={() => setSelectedPaymentForReceipt(null)}
          />
        )}

        {/* ========================================================================= */}
        {/* MODAL: EXPENSE VOUCHER PRINT MODAL (THERMAL 80MM / 58MM & A4) */}
        {/* ========================================================================= */}
        {selectedExpenseForVoucher && (
          <ExpenseVoucherModal
            isOpen={true}
            expense={selectedExpenseForVoucher}
            clinicSettings={clinicSettings}
            onClose={() => setSelectedExpenseForVoucher(null)}
          />
        )}
      </div>
    </div>
  );
}
