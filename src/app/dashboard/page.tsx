'use client';

import React, { useState, useEffect } from 'react';
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
  HardDrive
} from 'lucide-react';
import { db, type Patient, type Prescription, type Appointment, type PaymentRecord, type MaterialItem } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [patientsCount, setPatientsCount] = useState<number>(0);
  const [prescriptionsCount, setPrescriptionsCount] = useState<number>(0);
  const [recentPrescriptions, setRecentPrescriptions] = useState<Prescription[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [lowStockMaterials, setLowStockMaterials] = useState<MaterialItem[]>([]);
  const [totalCollected, setTotalCollected] = useState<number>(0);
  const [totalDues, setTotalDues] = useState<number>(0);
  const [clinicSettings, setClinicSettings] = useState<any>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function loadDashboardData() {
      const pCount = await db.patients.count();
      setPatientsCount(pCount);

      const rxCount = await db.prescriptions.count();
      setPrescriptionsCount(rxCount);

      const recentRx = await db.prescriptions.reverse().limit(6).toArray();
      setRecentPrescriptions(recentRx);

      const apnts = await db.appointments.where('date').equals(todayStr).toArray();
      setTodayAppointments(apnts);

      const materials = await db.materials.toArray();
      const low = materials.filter((m) => (m.currentStock || 0) <= m.lowStockLimit);
      setLowStockMaterials(low);

      const payments = await db.payments.toArray();
      const collected = payments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
      const dues = payments.reduce((acc, p) => acc + (p.dueAmount || 0), 0);
      setTotalCollected(collected);
      setTotalDues(dues);

      const settings = await db.settings.get('default_settings');
      setClinicSettings(settings);
    }

    loadDashboardData();
  }, [todayStr]);

  return (
    <div className="p-3.5 max-w-[1550px] mx-auto text-slate-800 space-y-4">
      {/* Top Welcome & Clinic Header Banner */}
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
              <span className="bg-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                Dentist PRO 7.0
              </span>
            </div>
            <p className="text-xs text-sky-100 mt-0.5">
              স্বাগতম, <span className="font-semibold text-white">{user?.name || 'ডা. নাহিদ হাসান'}</span> | ডেন্টাল ওরাল হেলথ ড্যাশবোর্ড
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

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-12 gap-3 text-xs">
        {/* Total Patients */}
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
            <span>লোকাল ড্রাইভে সংরক্ষিত</span>
          </div>
        </div>

        {/* Total Prescriptions */}
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
            <span>১০০% রেডি প্রিন্ট ফরম্যাট</span>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">আজকের অ্যাপয়েন্টমেন্ট</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-900">{todayAppointments.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>তারিখ: {todayStr}</span>
          </div>
        </div>

        {/* Cash Collection */}
        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">মোট কালেকশন</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">৳ {totalCollected}</div>
          <div className="text-[11px] text-red-600 font-medium mt-1">
            মোট বকেয়া: ৳ {totalDues}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 text-xs font-semibold">
        <Link
          href="/prescription"
          className="p-3 bg-white hover:bg-sky-50 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center text-center space-y-1.5 transition group"
        >
          <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
            <Stethoscope className="w-5 h-5" />
          </div>
          <span className="text-slate-800">Prescription</span>
        </Link>

        <Link
          href="/prescriptions"
          className="p-3 bg-white hover:bg-sky-50 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center text-center space-y-1.5 transition group"
        >
          <div className="p-2.5 bg-sky-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-slate-800">EMR History</span>
        </Link>

        <Link
          href="/drugs"
          className="p-3 bg-white hover:bg-sky-50 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center text-center space-y-1.5 transition group"
        >
          <div className="p-2.5 bg-emerald-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
            <Pill className="w-5 h-5" />
          </div>
          <span className="text-slate-800">Drug DB</span>
        </Link>

        <Link
          href="/appointments"
          className="p-3 bg-white hover:bg-sky-50 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center text-center space-y-1.5 transition group"
        >
          <div className="p-2.5 bg-purple-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-slate-800">Appointments</span>
        </Link>

        <Link
          href="/payments"
          className="p-3 bg-white hover:bg-sky-50 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center text-center space-y-1.5 transition group"
        >
          <div className="p-2.5 bg-amber-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-slate-800">Accounts & Dues</span>
        </Link>

        <Link
          href="/materials"
          className="p-3 bg-white hover:bg-sky-50 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center text-center space-y-1.5 transition group"
        >
          <div className="p-2.5 bg-rose-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
            <Package className="w-5 h-5" />
          </div>
          <span className="text-slate-800">Materials Stock</span>
        </Link>
      </div>

      {/* Main Two Columns */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column: Today's Appointments & Queue (5 cols) */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">আজকের রোগী সিরিয়াল ও অ্যাপয়েন্টমেন্ট</h2>
              </div>
              <Link href="/appointments" className="text-xs text-blue-600 hover:underline font-semibold">
                সব দেখুন →
              </Link>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                আজকের জন্য কোনো অ্যাপয়েন্টমেন্ট শিডিউল করা নেই।
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {todayAppointments.map((apnt) => (
                  <div
                    key={apnt.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 bg-blue-100 text-blue-900 rounded-full font-bold font-mono flex items-center justify-center text-xs">
                        {apnt.serial}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{apnt.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {apnt.time} • Reg #{apnt.regNo || 'New'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          apnt.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apnt.status === 'Waiting'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {apnt.status}
                      </span>
                      <Link
                        href="/"
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold"
                      >
                        Rx
                      </Link>
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
                {lowStockMaterials.slice(0, 3).map((m) => (
                  <div key={m.id} className="flex justify-between text-[11px] text-slate-700">
                    <span className="font-medium">{m.name}</span>
                    <span className="font-bold text-red-600">স্টক: {m.currentStock || 0} {m.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Prescriptions Timeline (7 cols) */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-sm text-slate-900">সাম্প্রতিক প্রেসক্রিপশন ও রোগী রেকর্ড</h2>
            </div>
            <Link href="/prescriptions" className="text-xs text-blue-600 hover:underline font-semibold">
              সকল প্রেসক্রিপশন দেখুন →
            </Link>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-sky-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2 w-16 text-center">Reg No</th>
                  <th className="p-2">রোগীর নাম</th>
                  <th className="p-2 w-24">তারিখ</th>
                  <th className="p-2">রোগ নির্ণয় (Diagnosis)</th>
                  <th className="p-2 w-20 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPrescriptions.map((rx) => (
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
        </div>
      </div>
    </div>
  );
}

