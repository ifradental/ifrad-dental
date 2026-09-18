'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Plus, Search, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { db, type PaymentRecord, type ExpenseRecord } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'payments' | 'expenses' | 'summary'>('payments');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

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

          <div className="flex space-x-1.5 text-xs">
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3.5 py-1.5 rounded font-bold ${
                activeTab === 'payments' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Patient Payments
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3.5 py-1.5 rounded font-bold ${
                activeTab === 'expenses' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Add / View Expense
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3.5 py-1.5 rounded font-bold ${
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

          <div className="col-span-6 md:col-span-3 bg-red-50 border border-red-200 rounded p-3">
            <div className="flex items-center justify-between text-red-800">
              <span className="font-semibold">Total Outstanding Dues</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold font-mono text-red-950 mt-1">৳ {totalDueAmount}</div>
          </div>

          <div className="col-span-6 md:col-span-3 bg-amber-50 border border-amber-200 rounded p-3">
            <div className="flex items-center justify-between text-amber-800">
              <span className="font-semibold">Total Expenses</span>
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-950 mt-1">৳ {totalExpended}</div>
          </div>

          <div className="col-span-6 md:col-span-3 bg-blue-50 border border-blue-200 rounded p-3">
            <div className="flex items-center justify-between text-blue-800">
              <span className="font-semibold">Net Cash Flow</span>
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold font-mono text-blue-950 mt-1">৳ {netIncome}</div>
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
      </div>
    </div>
  );
}

