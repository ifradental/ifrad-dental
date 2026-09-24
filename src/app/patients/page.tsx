'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Search, 
  Filter, 
  Calendar, 
  FileText, 
  Printer, 
  Download, 
  Eye, 
  Edit3, 
  Trash2, 
  Plus, 
  Phone, 
  MapPin, 
  Briefcase, 
  Clock, 
  Activity, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Heart, 
  Stethoscope, 
  X, 
  ChevronRight, 
  ArrowUpDown, 
  Receipt, 
  ShieldAlert,
  CalendarCheck,
  CreditCard,
  Pill,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  db, 
  type Patient, 
  type Prescription, 
  type Appointment, 
  type PaymentRecord, 
  type TreatmentSession, 
  type ClinicSettings 
} from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { useAuth } from '@/context/AuthContext';

export interface PatientWithStats extends Patient {
  totalVisits: number;
  lastVisitDate: string;
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
  prescriptionsCount: number;
  appointmentsCount: number;
}

function PatientManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightRegNoParam = searchParams.get('regNo');

  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientWithStats[]>([]);
  const [allPrescriptions, setAllPrescriptions] = useState<Prescription[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentRecord[]>([]);
  const [allTreatmentSessions, setAllTreatmentSessions] = useState<TreatmentSession[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'visits' | 'due' | 'regNo'>('newest');

  // Selected Patient for Details & History Modal
  const [selectedPatient, setSelectedPatient] = useState<PatientWithStats | null>(null);
  const [patientDetailTab, setPatientDetailTab] = useState<'prescriptions' | 'appointments' | 'treatment' | 'billing' | 'medical'>('prescriptions');

  // Printable Prescription Modal State
  const [printableRx, setPrintableRx] = useState<Prescription | null>(null);
  const [printableRxPatient, setPrintableRxPatient] = useState<Patient | null>(null);

  // Add / Edit Patient Modal State
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState<boolean>(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientForm, setPatientForm] = useState({
    name: '',
    age: '',
    sex: 'M',
    mobile: '',
    address: '',
    occupation: '',
  });

  useEffect(() => {
    loadAllData();
  }, []);

  // If URL has regNo param, auto-select that patient
  useEffect(() => {
    if (highlightRegNoParam && patients.length > 0) {
      const match = patients.find((p) => p.regNo.toString() === highlightRegNoParam);
      if (match) {
        setSelectedPatient(match);
      }
    }
  }, [highlightRegNoParam, patients]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [
        pts,
        rxs,
        apnts,
        pmts,
        sessions,
        settings
      ] = await Promise.all([
        db.patients.toArray(),
        db.prescriptions.reverse().toArray(),
        db.appointments.reverse().toArray(),
        db.payments.reverse().toArray(),
        db.treatmentSessions.reverse().toArray(),
        db.settings.get('default_settings'),
      ]);

      setAllPrescriptions(rxs);
      setAllAppointments(apnts);
      setAllPayments(pmts);
      setAllTreatmentSessions(sessions);
      if (settings) setClinicSettings(settings);

      // Aggregate all patients including any mentioned in prescriptions/appointments
      const patientMap = new Map<number, PatientWithStats>();

      // 1. Seed from explicit patients table
      for (const p of pts) {
        patientMap.set(p.regNo, {
          ...p,
          totalVisits: 0,
          lastVisitDate: '',
          totalBilled: 0,
          totalPaid: 0,
          totalDue: 0,
          prescriptionsCount: 0,
          appointmentsCount: 0,
        });
      }

      // 2. Discover from prescriptions
      for (const rx of rxs) {
        if (!rx.regNo) continue;
        const existing = patientMap.get(rx.regNo);
        if (existing) {
          existing.prescriptionsCount++;
          if (!existing.lastVisitDate || rx.date > existing.lastVisitDate) {
            existing.lastVisitDate = rx.date;
          }
          if (rx.contract?.totalBill) existing.totalBilled += rx.contract.totalBill;
          if (rx.payment?.totalPaid) existing.totalPaid += rx.payment.totalPaid;
        } else {
          patientMap.set(rx.regNo, {
            id: rx.patientId || `p_${rx.regNo}`,
            regNo: rx.regNo,
            name: rx.patientName || 'Unknown Patient',
            age: rx.age || '',
            sex: rx.sex || 'M',
            mobile: rx.mobile || '',
            address: rx.address || '',
            occupation: rx.occupation || '',
            createdAt: rx.createdAt || new Date().toISOString(),
            updatedAt: rx.updatedAt || new Date().toISOString(),
            totalVisits: 1,
            lastVisitDate: rx.date || '',
            totalBilled: rx.contract?.totalBill || 0,
            totalPaid: rx.payment?.totalPaid || 0,
            totalDue: (rx.contract?.totalBill || 0) - (rx.payment?.totalPaid || 0),
            prescriptionsCount: 1,
            appointmentsCount: 0,
          });
        }
      }

      // 3. Discover from appointments
      for (const ap of apnts) {
        if (!ap.regNo) continue;
        const existing = patientMap.get(ap.regNo);
        if (existing) {
          existing.appointmentsCount++;
          if (!existing.lastVisitDate || ap.date > existing.lastVisitDate) {
            existing.lastVisitDate = ap.date;
          }
          if (ap.paid) {
            existing.totalPaid += ap.paid;
          }
        } else {
          patientMap.set(ap.regNo, {
            id: `p_${ap.regNo}`,
            regNo: ap.regNo,
            name: ap.name,
            age: ap.age || '',
            sex: ap.sex || 'M',
            mobile: ap.mobile || '',
            address: ap.address || '',
            occupation: '',
            createdAt: ap.createdAt || new Date().toISOString(),
            updatedAt: ap.createdAt || new Date().toISOString(),
            totalVisits: 1,
            lastVisitDate: ap.date || '',
            totalBilled: ap.visitFee || ap.paid || 0,
            totalPaid: ap.paid || 0,
            totalDue: (ap.visitFee || ap.paid || 0) - (ap.paid || 0),
            prescriptionsCount: 0,
            appointmentsCount: 1,
          });
        }
      }

      // 4. Incorporate payments
      for (const pmt of pmts) {
        if (!pmmtOrNull(pmt)) continue;
        const existing = patientMap.get(pmt.regNo);
        if (existing) {
          if (pmt.payableAmount) existing.totalBilled = Math.max(existing.totalBilled, pmt.payableAmount);
          if (pmt.paidAmount) existing.totalPaid += pmt.paidAmount;
          if (pmt.dueAmount !== undefined) existing.totalDue = pmt.dueAmount;
        }
      }

      // Finalize stats
      const compiled = Array.from(patientMap.values()).map((p) => {
        const pRxs = rxs.filter((r) => r.regNo === p.regNo);
        const pApnts = apnts.filter((a) => a.regNo === p.regNo);
        const totalVisits = Math.max(pRxs.length, pApnts.length, p.totalVisits || 1);
        const totalDue = Math.max(0, (p.totalBilled || 0) - (p.totalPaid || 0));

        return {
          ...p,
          totalVisits,
          prescriptionsCount: pRxs.length,
          appointmentsCount: pApnts.length,
          totalDue,
        };
      });

      setPatients(compiled);
    } catch (err) {
      console.error('Error loading patient management data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const pmmtOrNull = (pmt: any) => pmt && pmt.regNo;

  // Filtered & Sorted Patients
  const filteredPatients = useMemo(() => {
    return patients
      .filter((p) => {
        // Gender filter
        if (genderFilter !== 'ALL' && p.sex !== genderFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name?.toLowerCase().includes(q);
          const matchReg = p.regNo?.toString().includes(q);
          const matchPhone = p.mobile?.includes(q);
          const matchAddress = p.address?.toLowerCase().includes(q);
          if (!matchName && !matchReg && !matchPhone && !matchAddress) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return (b.lastVisitDate || b.createdAt || '').localeCompare(a.lastVisitDate || a.createdAt || '');
        }
        if (sortBy === 'visits') {
          return b.totalVisits - a.totalVisits;
        }
        if (sortBy === 'due') {
          return b.totalDue - a.totalDue;
        }
        if (sortBy === 'regNo') {
          return b.regNo - a.regNo;
        }
        return 0;
      });
  }, [patients, genderFilter, searchQuery, sortBy]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalCount = patients.length;
    const maleCount = patients.filter((p) => p.sex === 'M').length;
    const femaleCount = patients.filter((p) => p.sex === 'F').length;
    const totalRx = patients.reduce((acc, p) => acc + (p.prescriptionsCount || 0), 0);
    const totalDue = patients.reduce((acc, p) => acc + (p.totalDue || 0), 0);
    return { totalCount, maleCount, femaleCount, totalRx, totalDue };
  }, [patients]);

  // Handle Save / Edit Patient Form
  const handleSavePatientForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForm.name.trim()) {
      alert('অনুগ্রহ করে রোগীর নাম প্রদান করুন!');
      return;
    }

    try {
      if (editingPatient) {
        // Update existing patient
        const updated: Patient = {
          ...editingPatient,
          name: patientForm.name.trim(),
          age: patientForm.age.trim() || 'N/A',
          sex: patientForm.sex,
          mobile: patientForm.mobile.trim(),
          address: patientForm.address.trim(),
          occupation: patientForm.occupation.trim(),
          updatedAt: new Date().toISOString(),
        };

        await db.patients.put(updated);
        await syncEngine.logMutation('patients', 'UPDATE', updated.id, updated);
        alert('রোগীর তথ্য সফলভাবে আপডেট হয়েছে!');
      } else {
        // Add new patient
        const maxReg = patients.reduce((max, p) => Math.max(max, p.regNo || 0), 4200);
        const newRegNo = maxReg + 1;
        const newPatient: Patient = {
          id: `p_${newRegNo}`,
          regNo: newRegNo,
          name: patientForm.name.trim(),
          age: patientForm.age.trim() || 'N/A',
          sex: patientForm.sex,
          mobile: patientForm.mobile.trim(),
          address: patientForm.address.trim(),
          occupation: patientForm.occupation.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await db.patients.put(newPatient);
        await syncEngine.logMutation('patients', 'INSERT', newPatient.id, newPatient);
        alert(`নতুন রোগী সফলভাবে নিবন্ধিত হয়েছে! রেজি নং: ${newRegNo}`);
      }

      setIsAddPatientModalOpen(false);
      setEditingPatient(null);
      setPatientForm({ name: '', age: '', sex: 'M', mobile: '', address: '', occupation: '' });
      await loadAllData();
    } catch (err) {
      console.error('Error saving patient:', err);
      alert('রোগীর তথ্য সংরক্ষণে সমস্যা হয়েছে!');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (p: Patient) => {
    setEditingPatient(p);
    setPatientForm({
      name: p.name || '',
      age: p.age || '',
      sex: p.sex || 'M',
      mobile: p.mobile || '',
      address: p.address || '',
      occupation: p.occupation || '',
    });
    setIsAddPatientModalOpen(true);
  };

  // Delete Patient
  const handleDeletePatient = async (patient: PatientWithStats) => {
    if (confirm(`আপনি কি নিশ্চিত যে রোগী "${patient.name}" (Reg #${patient.regNo}) এর রেকর্ড মুছে ফেলতে চান?`)) {
      try {
        await db.patients.delete(patient.id);
        await syncEngine.logMutation('patients', 'DELETE', patient.id, { id: patient.id });
        if (selectedPatient?.regNo === patient.regNo) {
          setSelectedPatient(null);
        }
        await loadAllData();
      } catch (err) {
        console.error('Error deleting patient:', err);
      }
    }
  };

  // Open Printable Prescription
  const handleOpenPrintRx = (rx: Prescription, pt: Patient) => {
    setPrintableRx(rx);
    setPrintableRxPatient(pt);
  };

  // Filtered sub-data for active selected patient
  const selectedPatientPrescriptions = useMemo(() => {
    if (!selectedPatient) return [];
    return allPrescriptions.filter((r) => r.regNo === selectedPatient.regNo);
  }, [selectedPatient, allPrescriptions]);

  const selectedPatientAppointments = useMemo(() => {
    if (!selectedPatient) return [];
    return allAppointments.filter((a) => a.regNo === selectedPatient.regNo);
  }, [selectedPatient, allAppointments]);

  const selectedPatientPayments = useMemo(() => {
    if (!selectedPatient) return [];
    return allPayments.filter((p) => p.regNo === selectedPatient.regNo);
  }, [selectedPatient, allPayments]);

  const selectedPatientSessions = useMemo(() => {
    if (!selectedPatient) return [];
    return allTreatmentSessions.filter((s) => s.regNo === selectedPatient.regNo);
  }, [selectedPatient, allTreatmentSessions]);

  // Extract medical history alerts from patient prescriptions
  const medicalAlerts = useMemo(() => {
    if (!selectedPatientPrescriptions.length) return [];
    const alerts: string[] = [];
    const hoMap: Record<string, boolean> = {};

    for (const rx of selectedPatientPrescriptions) {
      if (rx.ho) {
        Object.entries(rx.ho).forEach(([key, val]) => {
          if (val) hoMap[key] = true;
        });
      }
      if (rx.hoCustomText && rx.hoCustomText.trim()) {
        alerts.push(rx.hoCustomText.trim());
      }
    }

    Object.keys(hoMap).forEach((k) => alerts.push(k));
    return Array.from(new Set(alerts));
  }, [selectedPatientPrescriptions]);

  return (
    <div className="p-3 sm:p-5 max-w-[1700px] mx-auto text-slate-800 space-y-4">
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Users className="w-5 h-5" />
            </span>
            <span>রোগী ব্যবস্থাপনা (Patient Management)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            রোগীদের তালিকা, চিকিৎসা ও প্রেসক্রিপশন ইতিহাস, পূর্ণাঙ্গ প্রোফাইল ও পিডিএফ প্রেসক্রিপশন ডাউনলোড
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setEditingPatient(null);
              setPatientForm({ name: '', age: '', sex: 'M', mobile: '', address: '', occupation: '' });
              setIsAddPatientModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition flex items-center space-x-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>নতুন রোগী নিবন্ধন (+ Add Patient)</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-500 font-medium text-[11px]">মোট রোগী</div>
            <div className="text-xl font-bold font-mono text-slate-900">{metrics.totalCount} জন</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-500 font-medium text-[11px]">পুরুষ রোগী (Male)</div>
            <div className="text-xl font-bold font-mono text-sky-900">{metrics.maleCount} জন</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-500 font-medium text-[11px]">মহিলা রোগী (Female)</div>
            <div className="text-xl font-bold font-mono text-rose-900">{metrics.femaleCount} জন</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-500 font-medium text-[11px]">মোট প্রেসক্রিপশন</div>
            <div className="text-xl font-bold font-mono text-emerald-900">{metrics.totalRx} টি</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-500 font-medium text-[11px]">মোট বকেয়া (Dues)</div>
            <div className="text-xl font-bold font-mono text-amber-700">৳ {metrics.totalDue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER CONTROLS */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="রোগীর নাম, ফোন নম্বর, রেজি নং (#), বা ঠিকানা দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
          />
        </div>

        {/* Gender Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setGenderFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              genderFilter === 'ALL' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            সব ({patients.length})
          </button>
          <button
            onClick={() => setGenderFilter('M')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              genderFilter === 'M' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            পুরুষ ({metrics.maleCount})
          </button>
          <button
            onClick={() => setGenderFilter('F')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              genderFilter === 'F' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            মহিলা ({metrics.femaleCount})
          </button>
        </div>

        {/* Sort Select */}
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-600 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
            <span>সাজান:</span>
          </span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-xl bg-white font-bold text-xs focus:outline-none focus:border-blue-600"
          >
            <option value="newest">সর্বশেষ ভিজিট / নতুন রোগী</option>
            <option value="visits">সর্বাধিক ভিজিট সংখ্যা</option>
            <option value="due">বকেয়া অনুসারে (Highest Due)</option>
            <option value="regNo">রেজিস্ট্রেশন নম্বর (Reg No)</option>
          </select>
        </div>
      </div>

      {/* 4. PATIENT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-sky-50 text-slate-800 font-bold border-b border-sky-100">
              <tr>
                <th className="p-3.5 w-24 text-center">রেজি নং</th>
                <th className="p-3.5">রোগীর নাম ও পরিচয়</th>
                <th className="p-3.5">মোবাইল ও যোগাযোগ</th>
                <th className="p-3.5 w-28 text-center">মোট ভিজিট</th>
                <th className="p-3.5 w-32 text-center">সর্বশেষ চিকিৎসা</th>
                <th className="p-3.5 w-40 text-right">আর্থিক স্থিতি (Bill / Due)</th>
                <th className="p-3.5 w-48 text-center">অ্যাকশন ও ইতিহাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50 text-blue-600" />
                    কোনো রোগীর তথ্য পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredPatients.map((pt) => (
                  <tr key={pt.regNo} className="hover:bg-sky-50/40 transition">
                    {/* Reg No */}
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-lg font-mono font-black text-xs inline-flex items-center justify-center border border-blue-200">
                        #{pt.regNo}
                      </span>
                    </td>

                    {/* Patient Name & Details */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 text-sm hover:text-blue-600 transition cursor-pointer"
                        onClick={() => setSelectedPatient(pt)}
                      >
                        {pt.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                        <span>বয়স: {pt.age || '-'} বছর</span>
                        <span>•</span>
                        <span>{pt.sex === 'F' ? 'মহিলা (Female)' : 'পুরুষ (Male)'}</span>
                        {pt.occupation && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400 truncate max-w-[120px]">{pt.occupation}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-800 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{pt.mobile || 'No Mobile'}</span>
                      </div>
                      {pt.address && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[160px] flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span>{pt.address}</span>
                        </div>
                      )}
                    </td>

                    {/* Visits Badge */}
                    <td className="p-3.5 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-full font-bold text-xs">
                          {pt.totalVisits} বার
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Rx: {pt.prescriptionsCount} | Apnt: {pt.appointmentsCount}
                        </span>
                      </div>
                    </td>

                    {/* Last Visit */}
                    <td className="p-3.5 text-center font-mono text-slate-700 whitespace-nowrap">
                      {pt.lastVisitDate ? (
                        <>
                          <div className="font-bold text-slate-900">{pt.lastVisitDate}</div>
                          <div className="text-[10px] text-emerald-600 font-medium">উপস্থিত হয়েছেন</div>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">নতুন রোগী</span>
                      )}
                    </td>

                    {/* Financial Status */}
                    <td className="p-3.5 text-right font-mono">
                      <div className="font-bold text-slate-900">
                        ৳ {pt.totalPaid.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">পরিশোধ</span>
                      </div>
                      {pt.totalDue > 0 ? (
                        <div className="text-[11px] font-bold text-amber-600 mt-0.5">
                          বকেয়া: ৳ {pt.totalDue.toLocaleString()}
                        </div>
                      ) : (
                        <div className="text-[10px] font-medium text-emerald-600 mt-0.5">
                          ✓ পরিশোধিত
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {/* Details & History Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(pt)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg font-bold text-xs transition flex items-center space-x-1 shadow-xs cursor-pointer"
                          title="রোগীর বিস্তারিত ইতিহাস ও প্রেসক্রিপশন দেখুন"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>ইতিহাস</span>
                        </button>

                        {/* Make Prescription Link */}
                        <Link
                          href={`/prescription?regNo=${pt.regNo}&name=${encodeURIComponent(pt.name)}&age=${encodeURIComponent(
                            pt.age || ''
                          )}&sex=${pt.sex || 'M'}&mobile=${encodeURIComponent(pt.mobile || '')}`}
                          className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-xs transition flex items-center space-x-1 shadow-xs"
                          title="এই রোগীর জন্য প্রেসক্রিপশন তৈরি করুন"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Rx</span>
                        </Link>

                        {/* Edit Info */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(pt)}
                          className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          title="রোগীর তথ্য সংশোধন করুন"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Patient */}
                        <button
                          type="button"
                          onClick={() => handleDeletePatient(pt)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="রোগীর রেকর্ড মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          5. PATIENT DETAILS & FULL HISTORY MODAL
          ========================================================================= */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header Banner */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl border border-blue-400 shadow-md">
                  {selectedPatient.sex === 'F' ? '👩' : '👨'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-black tracking-tight text-white">{selectedPatient.name}</h2>
                    <span className="px-2 py-0.5 bg-yellow-400 text-slate-950 font-mono font-black text-xs rounded-full">
                      Reg #{selectedPatient.regNo}
                    </span>
                    <span className="text-xs text-sky-200 bg-white/10 px-2 py-0.5 rounded-full">
                      {selectedPatient.age} Y • {selectedPatient.sex === 'F' ? 'মহিলা' : 'পুরুষ'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-sky-400" />
                      <span>{selectedPatient.mobile || 'No Phone'}</span>
                    </span>
                    {selectedPatient.address && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="w-3 h-3 text-sky-400" />
                        <span>{selectedPatient.address}</span>
                      </span>
                    )}
                    {selectedPatient.occupation && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Briefcase className="w-3 h-3 text-sky-400" />
                        <span>{selectedPatient.occupation}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center space-x-2">
                <Link
                  href={`/prescription?regNo=${selectedPatient.regNo}&name=${encodeURIComponent(
                    selectedPatient.name
                  )}&age=${encodeURIComponent(selectedPatient.age || '')}&sex=${
                    selectedPatient.sex || 'M'
                  }&mobile=${encodeURIComponent(selectedPatient.mobile || '')}`}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>নতুন প্রেসক্রিপশন</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedPatient)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
                  title="প্রোফাইল এডিট"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Medical Alerts Bar (If Any) */}
            {medicalAlerts.length > 0 && (
              <div className="bg-rose-50 px-5 py-2.5 border-b border-rose-200 flex items-center space-x-2 text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-bold text-rose-950">মেডিকেল হিস্ট্রি ও স্বাস্থ্য ঝুঁকি:</span>
                <div className="flex flex-wrap gap-1">
                  {medicalAlerts.map((alertItem, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-bold text-[11px]">
                      {alertItem}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Tabs Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-5 text-xs font-bold shrink-0">
              <button
                onClick={() => setPatientDetailTab('prescriptions')}
                className={`py-3 px-4 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                  patientDetailTab === 'prescriptions'
                    ? 'border-blue-600 text-blue-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>প্রেসক্রিপশন ও ডাউনলোড ({selectedPatientPrescriptions.length})</span>
              </button>

              <button
                onClick={() => setPatientDetailTab('appointments')}
                className={`py-3 px-4 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                  patientDetailTab === 'appointments'
                    ? 'border-blue-600 text-blue-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                <span>অ্যাপয়েন্টমেন্ট ({selectedPatientAppointments.length})</span>
              </button>

              <button
                onClick={() => setPatientDetailTab('treatment')}
                className={`py-3 px-4 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                  patientDetailTab === 'treatment'
                    ? 'border-blue-600 text-blue-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                <span>চিকিৎসা সেশন ও জার্নি ({selectedPatientSessions.length})</span>
              </button>

              <button
                onClick={() => setPatientDetailTab('billing')}
                className={`py-3 px-4 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                  patientDetailTab === 'billing'
                    ? 'border-blue-600 text-blue-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>বিলিং ও পেমেন্ট হিস্ট্রি ({selectedPatientPayments.length})</span>
              </button>
            </div>

            {/* Modal Tab Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* TAB 1: PRESCRIPTION HISTORY & DOWNLOAD */}
              {patientDetailTab === 'prescriptions' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>পূর্ববর্তী সকল প্রেসক্রিপশনের তালিকা ও প্রিন্ট/ডাউনলোড</span>
                    </h3>
                    <span className="text-slate-500 text-[11px]">
                      মোট প্রেসক্রিপশন: {selectedPatientPrescriptions.length} টি
                    </span>
                  </div>

                  {selectedPatientPrescriptions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-40 text-blue-600" />
                      <p>এই রোগীর জন্য এখনো কোনো প্রেসক্রিপশন তৈরি করা হয়নি।</p>
                      <Link
                        href={`/prescription?regNo=${selectedPatient.regNo}&name=${encodeURIComponent(
                          selectedPatient.name
                        )}&age=${encodeURIComponent(selectedPatient.age || '')}&sex=${
                          selectedPatient.sex || 'M'
                        }&mobile=${encodeURIComponent(selectedPatient.mobile || '')}`}
                        className="mt-3 inline-flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>প্রথম প্রেসক্রিপশন তৈরি করুন</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {selectedPatientPrescriptions.map((rx) => {
                        const medicineCount = rx.medicines?.filter((m) => m.brand?.trim()).length || 0;
                        return (
                          <div
                            key={rx.id}
                            className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 p-4 shadow-xs transition hover:shadow-sm"
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                              <div className="flex items-center space-x-3">
                                <span className="w-9 h-9 bg-blue-50 text-blue-800 rounded-xl font-mono font-bold flex items-center justify-center border border-blue-200 text-xs">
                                  #{rx.visitNo || 1}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                    <span>প্রেসক্রিপশন তারিখ: {rx.date}</span>
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                                      Visit #{rx.visitNo || 1}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    চিকিৎসক: <strong className="text-slate-800">{clinicSettings?.doctor1?.name || 'ডা. নাহিদ হাসান'}</strong>
                                    {rx.nextVisitDate && (
                                      <span className="ml-2 text-indigo-700 font-medium">
                                        • পরবর্তী সাক্ষাত: {rx.nextVisitDate}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Prescriptions Actions: Download, Print, View, Edit */}
                              <div className="flex items-center space-x-1.5 w-full sm:w-auto justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPrintRx(rx, selectedPatient)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center space-x-1 text-xs shadow-xs cursor-pointer"
                                  title="প্রেসক্রিপশন প্রিন্ট অথবা PDF হিসেবে ডাউনলোড করুন"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>প্রিন্ট / ডাউনলোড PDF</span>
                                </button>

                                <Link
                                  href={`/prescription?regNo=${rx.regNo}&rxId=${rx.id}&name=${encodeURIComponent(
                                    selectedPatient.name
                                  )}&age=${encodeURIComponent(selectedPatient.age || '')}&sex=${
                                    selectedPatient.sex || 'M'
                                  }&mobile=${encodeURIComponent(selectedPatient.mobile || '')}`}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-lg transition flex items-center space-x-1 text-xs shadow-xs"
                                  title="প্রেসক্রিপশন সংশোধন করুন"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                  <span>এডিট</span>
                                </Link>
                              </div>
                            </div>

                            {/* Clinical Findings & Medicines Preview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                              {/* Clinical Left */}
                              <div className="space-y-1.5 text-slate-700">
                                {rx.cc && rx.cc.length > 0 && (
                                  <div>
                                    <strong className="text-slate-900">C/C (প্রধান সমস্যা):</strong>{' '}
                                    <span>{rx.cc.join(', ')}</span>
                                  </div>
                                )}
                                {rx.dx && rx.dx.length > 0 && (
                                  <div>
                                    <strong className="text-blue-900">Dx (রোগ নির্ণয়):</strong>{' '}
                                    <span className="font-semibold text-blue-950">{rx.dx.join(', ')}</span>
                                  </div>
                                )}
                                {rx.treatmentDone && rx.treatmentDone.length > 0 && (
                                  <div>
                                    <strong className="text-emerald-900">চিকিৎসা সম্পন্ন:</strong>{' '}
                                    <span>{rx.treatmentDone.join(', ')}</span>
                                  </div>
                                )}
                              </div>

                              {/* Medicines Preview */}
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                <div className="font-bold text-slate-900 text-xs mb-1 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Pill className="w-3.5 h-3.5 text-blue-600" />
                                    <span>প্রেসক্রাইবকৃত ওষুধ ({medicineCount} টি)</span>
                                  </span>
                                </div>
                                {medicineCount > 0 ? (
                                  <ul className="space-y-1 text-[11px] text-slate-800">
                                    {rx.medicines
                                      .filter((m) => m.brand?.trim())
                                      .slice(0, 3)
                                      .map((m, idx) => (
                                        <li key={idx} className="flex justify-between items-center">
                                          <span className="font-bold text-slate-900">{m.brand}</span>
                                          <span className="text-slate-500 font-mono">
                                            {m.dose} • {m.duration}
                                          </span>
                                        </li>
                                      ))}
                                    {medicineCount > 3 && (
                                      <li className="text-[10px] text-blue-600 font-semibold italic">
                                        + আরও {medicineCount - 3} টি ওষুধ রয়েছে...
                                      </li>
                                    )}
                                  </ul>
                                ) : (
                                  <div className="text-slate-400 italic">কোনো ওষুধ তালিকাভুক্ত নেই</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: APPOINTMENT HISTORY */}
              {patientDetailTab === 'appointments' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-indigo-600" />
                    <span>রোগীর চেম্বার সিরিয়াল ও অ্যাপয়েন্টমেন্ট ইতিহাস</span>
                  </h3>

                  {selectedPatientAppointments.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      কোনো অ্যাপয়েন্টমেন্ট হিস্ট্রি পাওয়া যায়নি।
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5 w-16 text-center">সিরিয়াল</th>
                            <th className="p-2.5">তারিখ ও সময়</th>
                            <th className="p-2.5">অ্যাসাইন ডাক্তার</th>
                            <th className="p-2.5">সমস্যা (Problem)</th>
                            <th className="p-2.5 w-24 text-right">ভিজিট ফি</th>
                            <th className="p-2.5 w-28 text-center">অবস্থা</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedPatientAppointments.map((ap) => (
                            <tr key={ap.id} className="hover:bg-slate-50">
                              <td className="p-2.5 text-center font-mono font-bold text-blue-900">
                                #{ap.serial}
                              </td>
                              <td className="p-2.5 font-mono">
                                <div className="font-bold text-slate-900">{ap.date}</div>
                                <div className="text-[10px] text-slate-400">{ap.time}</div>
                              </td>
                              <td className="p-2.5 font-medium text-slate-800">
                                {ap.doctorName || 'ডা. নাহিদ হাসান'}
                              </td>
                              <td className="p-2.5 text-slate-700">{ap.problem || 'Dental Checkup'}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                                ৳ {(ap.paid || ap.visitFee || 0).toLocaleString()}
                              </td>
                              <td className="p-2.5 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    ap.status === 'Completed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : ap.status === 'Waiting'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {ap.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TREATMENT JOURNEY */}
              {patientDetailTab === 'treatment' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-emerald-600" />
                    <span>চিকিৎসা সেশন ও ক্লিনিক্যাল জার্নি</span>
                  </h3>

                  {selectedPatientSessions.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      কোনো চিকিৎসা সেশন এন্ট্রি করা হয়নি।
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedPatientSessions.map((session) => (
                        <div
                          key={session.id}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs"
                        >
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="font-bold text-slate-900 text-xs">
                              সেশন #{session.sessionNo}: {session.treatmentType}
                            </span>
                            <span className="font-mono text-slate-500 text-[11px]">{session.date}</span>
                          </div>
                          {(session.procedureDetails || session.treatmentDoctorNotes) && (
                            <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded">
                              {session.procedureDetails || session.treatmentDoctorNotes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: BILLING & PAYMENT HISTORY */}
              {patientDetailTab === 'billing' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">মোট বিলকৃত</div>
                      <div className="text-base font-bold font-mono text-slate-900">
                        ৳ {selectedPatient.totalBilled.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      <div className="text-[11px] text-emerald-700 font-medium">মোট পরিশোধ</div>
                      <div className="text-base font-bold font-mono text-emerald-800">
                        ৳ {selectedPatient.totalPaid.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                      <div className="text-[11px] text-amber-700 font-medium">অবশিষ্ট বকেয়া</div>
                      <div className="text-base font-bold font-mono text-amber-800">
                        ৳ {selectedPatient.totalDue.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {selectedPatientPayments.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">তারিখ</th>
                            <th className="p-2.5">বিবরণ (Particulars)</th>
                            <th className="p-2.5 text-right">মোট বিল</th>
                            <th className="p-2.5 text-right">ডিসকাউন্ট</th>
                            <th className="p-2.5 text-right">পরিশোধ</th>
                            <th className="p-2.5 text-right">বকেয়া</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedPatientPayments.map((pmt) => (
                            <tr key={pmt.id} className="hover:bg-slate-50 font-mono">
                              <td className="p-2.5 font-bold text-slate-900">{pmt.date}</td>
                              <td className="p-2.5 font-sans font-medium text-slate-800">
                                {pmt.particulars || 'Dental Consultation / Treatment'}
                              </td>
                              <td className="p-2.5 text-right font-bold text-slate-900">
                                ৳ {pmt.totalBill?.toLocaleString() || 0}
                              </td>
                              <td className="p-2.5 text-right text-rose-600">
                                ৳ {pmt.discount?.toLocaleString() || 0}
                              </td>
                              <td className="p-2.5 text-right font-bold text-emerald-700">
                                ৳ {pmt.paidAmount?.toLocaleString() || 0}
                              </td>
                              <td className="p-2.5 text-right font-bold text-amber-700">
                                ৳ {pmt.dueAmount?.toLocaleString() || 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs shrink-0">
              <span className="text-slate-500 font-mono">
                Patient Reg #{selectedPatient.regNo} • Registered: {selectedPatient.createdAt?.split('T')[0] || 'N/A'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition cursor-pointer"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. PRINTABLE PRESCRIPTION MODAL (HIGH RESOLUTION FOR PRINT & SAVE PDF)
          ========================================================================= */}
      {printableRx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Top Toolbar (No-Print) */}
            <div className="no-print px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2">
                <Printer className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-sm">
                  প্রেসক্রিপশন প্রিন্ট ও ডাউনলোড প্রিভিউ (Print / Save as PDF)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট / PDF সেভ করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrintableRx(null);
                    setPrintableRxPatient(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Letterhead & Medical Record Preview */}
            <div className="p-6 overflow-y-auto font-serif bg-white text-slate-900" id="printable-prescription-sheet">
              {/* Clinic Header */}
              {clinicSettings && (
                <div className="text-center border-b-2 border-slate-800 pb-3 mb-3">
                  <h1 className="text-2xl font-bold font-sans text-slate-900">
                    {clinicSettings.clinicName}
                  </h1>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-sans mt-2 divide-x divide-slate-300">
                    <div>
                      <div className="font-bold text-blue-950">{clinicSettings.doctor1.name}</div>
                      <div className="text-[11px] text-slate-600">{clinicSettings.doctor1.degrees}</div>
                      <div className="text-[10px] text-slate-500">{clinicSettings.doctor1.designation}</div>
                      <div className="text-[10px] text-slate-500">বিএমডিসি নং- {clinicSettings.doctor1.bmdcReg}</div>
                    </div>
                    <div>
                      <div className="font-bold text-blue-950">{clinicSettings.doctor2.name}</div>
                      <div className="text-[11px] text-slate-600">{clinicSettings.doctor2.degrees}</div>
                      <div className="text-[10px] text-slate-500">{clinicSettings.doctor2.designation}</div>
                      <div className="text-[10px] text-slate-500">বিএমডিসি নং- {clinicSettings.doctor2.bmdcReg}</div>
                    </div>
                    <div>
                      <div className="font-bold text-blue-950">{clinicSettings.doctor3.name}</div>
                      <div className="text-[11px] text-slate-600">{clinicSettings.doctor3.degrees}</div>
                      <div className="text-[10px] text-slate-500">{clinicSettings.doctor3.designation}</div>
                      <div className="text-[10px] text-slate-500">বিএমডিসি নং- {clinicSettings.doctor3.bmdcReg}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Patient Banner */}
              <div className="border-b border-slate-300 pb-2 mb-4 text-xs font-sans">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <span className="font-semibold text-slate-600">Name:</span>{' '}
                    <span className="font-bold text-slate-900">{printableRx.patientName}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-600">Age:</span>{' '}
                    <span>{printableRx.age}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-600">Sex:</span>{' '}
                    <span>{printableRx.sex}</span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="font-semibold text-slate-600">Date:</span>{' '}
                    <span className="font-bold">{printableRx.date}</span>
                  </div>
                  <div className="col-span-5">
                    <span className="font-semibold text-slate-600">Address:</span>{' '}
                    <span>{printableRx.address || 'Dhaka'}</span>
                  </div>
                  <div className="col-span-4">
                    <span className="font-semibold text-slate-600">Reg No:</span>{' '}
                    <span className="font-bold font-mono text-blue-900">{printableRx.regNo}</span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="font-semibold text-slate-600">Mobile:</span>{' '}
                    <span>{printableRx.mobile}</span>
                  </div>
                </div>
              </div>

              {/* Clinical Two-Column Layout */}
              <div className="grid grid-cols-12 gap-5 min-h-[420px]">
                {/* Left Column: Complaints, O/E, Dx */}
                <div className="col-span-4 border-r border-slate-300 pr-3 space-y-4 text-xs font-sans">
                  {printableRx.cc && printableRx.cc.length > 0 && (
                    <div>
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
                        Chief Complaints (C/C):
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                        {printableRx.cc.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {printableRx.oe && printableRx.oe.length > 0 && (
                    <div>
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
                        On Examination (O/E):
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                        {printableRx.oe.map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {printableRx.dx && printableRx.dx.length > 0 && (
                    <div>
                      <div className="font-bold text-blue-900 border-b border-slate-200 pb-0.5 mb-1">
                        Diagnosis (Dx):
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 font-bold text-blue-950">
                        {printableRx.dx.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {printableRx.ix && printableRx.ix.length > 0 && (
                    <div>
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
                        Investigation (Ix):
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                        {printableRx.ix.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Right Column: Rx Medications & Advices */}
                <div className="col-span-8 pl-1 font-sans">
                  <div className="text-xl font-bold font-serif mb-2 text-slate-900">Rx</div>

                  {printableRx.medicines && printableRx.medicines.filter((m) => m.brand?.trim()).length > 0 ? (
                    <div className="space-y-3">
                      {printableRx.medicines
                        .filter((m) => m.brand?.trim())
                        .map((m, idx) => (
                          <div key={idx} className="pb-2 border-b border-slate-100">
                            <div className="font-bold text-slate-900 text-xs">
                              {idx + 1}. {m.brand}
                            </div>
                            <div className="text-[11px] text-slate-600 pl-4">
                              {m.dose} • {m.instruction} • {m.duration}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-xs">কোনো ওষুধ তালিকাভুক্ত নেই</div>
                  )}

                  {/* Advices */}
                  {printableRx.advice && printableRx.advice.filter(Boolean).length > 0 && (
                    <div className="mt-5 pt-3 border-t border-slate-200">
                      <div className="font-bold text-slate-900 text-xs mb-1">উপদেশাবলী (Advice):</div>
                      <ul className="list-disc list-inside text-xs text-slate-700 space-y-0.5">
                        {printableRx.advice.filter(Boolean).map((adv, idx) => (
                          <li key={idx}>{adv}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Next Visit */}
                  {(printableRx.nextVisitDate || printableRx.revisitText) && (
                    <div className="mt-4 pt-2 text-xs font-semibold text-blue-900">
                      পরবর্তী সাক্ষাত: {printableRx.nextVisitDate || printableRx.revisitText}{' '}
                      {printableRx.timeSlot ? `• ${printableRx.timeSlot}` : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer & Signature */}
              <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-end text-xs font-sans">
                <div className="text-[10px] text-slate-500 max-w-md">
                  {clinicSettings?.footerText ||
                    'নন্দীপাড়া ব্রিজ সংলগ্ন (২য় তলা), খিলগাঁও, ঢাকা। রোগী দেখার সময়: সকাল ১০টা থেকে দুপুর ২টা, বিকাল ৪টা থেকে রাত ১০টা।'}
                </div>
                <div className="text-center">
                  <div className="border-t border-slate-400 w-36 mb-1"></div>
                  <div className="text-[11px] font-bold text-slate-800">চিকিৎসকের স্বাক্ষর</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. ADD / EDIT PATIENT MODAL
          ========================================================================= */}
      {isAddPatientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">
                  {editingPatient ? 'রোগীর তথ্য সংশোধন করুন' : 'নতুন রোগী নিবন্ধন (Register New Patient)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddPatientModalOpen(false);
                  setEditingPatient(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePatientForm} className="p-5 space-y-3.5 text-xs">
              {/* Name */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  রোগীর নাম (Patient Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={patientForm.name}
                  onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                  placeholder="যেমন: মো. রফিকুল ইসলাম"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Age & Sex */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">বয়স (Age)</label>
                  <input
                    type="text"
                    value={patientForm.age}
                    onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                    placeholder="যেমন: 32"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">লিঙ্গ (Gender)</label>
                  <select
                    value={patientForm.sex}
                    onChange={(e) => setPatientForm({ ...patientForm, sex: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="M">পুরুষ (Male)</option>
                    <option value="F">মহিলা (Female)</option>
                    <option value="Other">অন্যান্য (Other)</option>
                  </select>
                </div>
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  মোবাইল নম্বর (Mobile No) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={patientForm.mobile}
                  onChange={(e) => setPatientForm({ ...patientForm, mobile: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">ঠিকানা (Address)</label>
                <input
                  type="text"
                  value={patientForm.address}
                  onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                  placeholder="যেমন: খিলগাঁও, ঢাকা"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Occupation */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">পেশা (Occupation)</label>
                <input
                  type="text"
                  value={patientForm.occupation}
                  onChange={(e) => setPatientForm({ ...patientForm, occupation: e.target.value })}
                  placeholder="যেমন: সার্ভিস, ব্যবস্যা, গৃহিণী"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPatientModalOpen(false);
                    setEditingPatient(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-sm cursor-pointer"
                >
                  {editingPatient ? 'আপডেট করুন' : 'সংরক্ষণ করুন (Save)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm font-semibold text-slate-600">
          রোগী ব্যবস্থাপনা লোড হচ্ছে...
        </div>
      }
    >
      <PatientManagementContent />
    </Suspense>
  );
}
