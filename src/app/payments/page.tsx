'use client';

import React, { useState, useEffect } from 'react';
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
  UserCheck
} from 'lucide-react';
import { db, type PaymentRecord, type ExpenseRecord, type Prescription } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { useAuth } from '@/context/AuthContext';

export default function PaymentsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'payments' | 'expenses' | 'summary' | 'doctor_prescriptions'>('payments');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [pendingPrescriptions, setPendingPrescriptions] = useState<Prescription[]>([]);
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const payList = await db.payments.reverse().toArray();
    setPayments(payList);

    const expList = await db.expenses.reverse().toArray();
    setExpenses(expList);

    // Load prescriptions sent to cashier by doctor
    const allRx = await db.prescriptions.reverse().toArray();
    const pending = allRx.filter((rx) => rx.workflowStatus === 'sent_to_cashier');
    setPendingPrescriptions(pending);
  };

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

  const totalCollected = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalDueAmount = payments.reduce((sum, p) => sum + (p.dueAmount || 0), 0);
  const totalExpended = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netIncome = totalCollected - totalExpended;

  return (
    <div className="p-3 max-w-[1550px] mx-auto text-slate-800">
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-200 gap-2">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h1 className="text-base font-bold text-blue-950">Accounts, Payments & Clinic Expense</h1>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => setActiveTab('doctor_prescriptions')}
              className={`px-3 py-1.5 rounded font-bold flex items-center gap-1.5 ${
                activeTab === 'doctor_prescriptions'
                  ? 'bg-amber-600 text-white shadow'
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

            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-1.5 rounded font-bold ${
                activeTab === 'payments' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Patient Payments
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-1.5 rounded font-bold ${
                activeTab === 'expenses' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Add / View Expense
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded font-bold ${
                activeTab === 'summary' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Income & Expense Statement
            </button>
          </div>
        </div>

        {/* Financial KPI Widgets */}
        <div className="grid grid-cols-12 gap-3 mb-4 text-xs">
          <div className="col-span-6 md:col-span-3 bg-emerald-50 border border-emerald-200 rounded p-3">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="font-semibold">Total Collections</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-950 mt-1">৳ {totalCollected}</div>
          </div>

          <div
            onClick={() => setActiveTab('doctor_prescriptions')}
            className="col-span-6 md:col-span-3 bg-amber-50 border border-amber-300 rounded p-3 cursor-pointer hover:bg-amber-100/70 transition"
          >
            <div className="flex items-center justify-between text-amber-900">
              <span className="font-semibold">Pending from Doctor</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-950 mt-1 flex items-center justify-between">
              <span>{pendingPrescriptions.length} Patients</span>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                Collect Bill
              </span>
            </div>
          </div>

          <div className="col-span-6 md:col-span-3 bg-red-50 border border-red-200 rounded p-3">
            <div className="flex items-center justify-between text-red-800">
              <span className="font-semibold">Total Outstanding Dues</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold font-mono text-red-950 mt-1">৳ {totalDueAmount}</div>
          </div>

          <div className="col-span-6 md:col-span-3 bg-blue-50 border border-blue-200 rounded p-3">
            <div className="flex items-center justify-between text-blue-800">
              <span className="font-semibold">Total Expenses</span>
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold font-mono text-blue-950 mt-1">৳ {totalExpended}</div>
          </div>
        </div>

        {/* TAB 1: PAYMENTS LIST (Matching payment sub menu.png) */}
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

        {/* TAB 2: EXPENSES ENTRY (Matching expenditure entry.png) */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <form onSubmit={handleAddExpense} className="bg-sky-50 border border-sky-200 rounded p-3 text-xs">
              <div className="font-bold text-blue-900 mb-2">Daily Clinic Expense Voucher Entry</div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-slate-600 font-medium mb-0.5">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="Dental Materials">Dental Materials & Medicines</option>
                    <option value="Lab Bills">Dental Lab Bills (Crown/Denture)</option>
                    <option value="Clinic Rent & Utility">Clinic Rent & Electricity</option>
                    <option value="Staff Salary">Staff & Assistant Salary</option>
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

        {/* TAB 3: SUMMARY */}
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

        {/* TAB 4: DOCTOR PRESCRIPTIONS PENDING PAYMENT */}
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
                              <button
                                onClick={() => handleOpenCollectModal(rx)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shadow-xs flex items-center gap-1"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Collect &amp; Send</span>
                              </button>
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

        {/* QUICK COLLECT PAYMENT MODAL */}
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

