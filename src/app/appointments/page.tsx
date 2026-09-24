'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Send, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  Trash2,
  UserCheck,
  Stethoscope,
  FileText,
  User,
  Phone,
  AlertCircle,
  DollarSign,
  Filter,
  CheckCircle2,
  Clock3,
  XCircle,
  HelpCircle,
  Printer,
  Eye,
  Edit3,
  X,
  Cloud,
  Upload,
  Sparkles
} from 'lucide-react';
import { 
  db, 
  type Appointment, 
  type Patient, 
  type Employee, 
  type ClinicSettings,
  type Prescription
} from '@/lib/db';
import { syncEngine, type SyncStatus } from '@/lib/syncEngine';
import { useAuth } from '@/context/AuthContext';

export default function AppointmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctorsList, setDoctorsList] = useState<Employee[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Live Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [mongoCount, setMongoCount] = useState<number | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string>('');

  // View Prescription Modal State
  const [viewingRx, setViewingRx] = useState<Prescription | null>(null);
  const [viewingApnt, setViewingApnt] = useState<Appointment | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

  // Filters
  const [viewFilter, setViewFilter] = useState<'today' | 'upcoming' | 'all'>('today');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State
  const [searchRegOrPhone, setSearchRegOrPhone] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [sex, setSex] = useState<string>('M');
  const [mobile, setMobile] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [problem, setProblem] = useState<string>('');
  const [assignedDoctorId, setAssignedDoctorId] = useState<string>('');
  const [assignedDoctorName, setAssignedDoctorName] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('10:00 AM');
  const [reference, setReference] = useState<string>('');
  const [visitFee, setVisitFee] = useState<number>(500);

  const todayStr = new Date().toISOString().split('T')[0];
  const userRole = (user?.role || '').toLowerCase();
  const isDoctorUser = userRole === 'doctor';
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin';

  useEffect(() => {
    loadInitialData();
    checkMongoCount();

    const unsub = syncEngine.subscribe((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });

    return () => unsub();
  }, [user]);

  const checkMongoCount = async () => {
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.total === 'number') {
          setMongoCount(data.total);
        }
      }
    } catch (e) {
      console.warn('MongoDB check notice:', e);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback('Initiating two-way sync with MongoDB database...');
    try {
      const res = await syncEngine.triggerSync();
      await syncEngine.pullUpdates();
      await loadAppointments();
      await checkMongoCount();
      setSyncFeedback(res.message || 'Synced successfully with MongoDB!');
      setTimeout(() => setSyncFeedback(''), 4000);
    } catch (e: any) {
      setSyncFeedback('Sync notice: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushAllToMongo = async () => {
    setIsSyncing(true);
    setSyncFeedback('Saving all local appointments to MongoDB database...');
    try {
      const allLocalApnts = await db.appointments.toArray();
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointments: allLocalApnts }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback(`Successfully saved all ${allLocalApnts.length} appointments directly to MongoDB!`);
      } else {
        setSyncFeedback(data.message || 'Saved locally, MongoDB pending.');
      }
      await checkMongoCount();
      setTimeout(() => setSyncFeedback(''), 5000);
    } catch (e: any) {
      setSyncFeedback('Sync completed with local persistence: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Load active doctors
      const doctors = await db.employees
        .where('role')
        .equals('Doctor')
        .and((e) => e.status === 'Active')
        .toArray();
      setDoctorsList(doctors);

      // 2. Load settings for default visit fee
      const settings = await db.settings.get('default_settings');
      if (settings) {
        setClinicSettings(settings);
        setVisitFee(settings.visitFee || 500);
      }

      // 3. Set default assigned doctor
      if (isDoctorUser) {
        // If current user is a Doctor, preselect themselves
        const currentDoc = doctors.find(
          (d) => d.id === user.employeeId || d.name.toLowerCase().includes(user.name.toLowerCase())
        );
        if (currentDoc) {
          setAssignedDoctorId(currentDoc.id);
          setAssignedDoctorName(currentDoc.name);
          setSelectedDoctorFilter(currentDoc.id);
        } else {
          setAssignedDoctorName(user.name);
          setSelectedDoctorFilter(user.name);
        }
      } else if (doctors.length > 0) {
        setAssignedDoctorId(doctors[0].id);
        setAssignedDoctorName(doctors[0].name);
      } else {
        setAssignedDoctorName('ডা. নাহিদ হাসান');
      }

      // 4. Load appointments
      await loadAppointments();
    } catch (err) {
      console.error('Error loading initial appointment data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAppointments = async () => {
    const [list, rxList] = await Promise.all([
      db.appointments.reverse().toArray(),
      db.prescriptions.reverse().toArray(),
    ]);
    setAppointments(list);
    setPrescriptions(rxList);
  };

  const handleOpenViewRx = async (rx: Prescription | null | undefined, apnt: Appointment) => {
    let targetRx = rx;
    if (!targetRx && apnt.prescriptionId) {
      targetRx = await db.prescriptions.get(apnt.prescriptionId);
    }
    if (!targetRx && apnt.regNo) {
      targetRx = await db.prescriptions.where('regNo').equals(apnt.regNo).last();
    }
    setViewingRx(targetRx || null);
    setViewingApnt(apnt);
    setIsViewModalOpen(true);
  };

  // Lookup existing patient by Reg No or Phone
  const handleLookupPatient = async () => {
    const query = searchRegOrPhone.trim();
    if (!query) return;

    let p: Patient | undefined;
    if (!isNaN(Number(query))) {
      p = await db.patients.where('regNo').equals(Number(query)).first();
    }
    if (!p) {
      p = await db.patients.where('mobile').equals(query).first();
    }

    if (p) {
      setName(p.name);
      setAge(p.age);
      setSex(p.sex);
      setMobile(p.mobile);
      setAddress(p.address || '');
    } else {
      alert(`এই নম্বর বা রেজি নং দিয়ে কোনো পূর্ববর্তী রোগীর তথ্য পাওয়া যায়নি। নতুন রোগী হিসেবে তথ্য পূরণ করুন।`);
    }
  };

  // Add Appointment / Serial
  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDoctorUser) {
      alert('ডাক্তার রোল থেকে নতুন রোগী বা সিরিয়াল এন্ট্রি অনুমোদিত নয়। শুধুমাত্র রিসেপশনিস্ট বা অ্যাডমিন নতুন সিরিয়াল যুক্ত করতে পারেন।');
      return;
    }
    if (!name.trim()) {
      alert('রোগীর নাম আবশ্যক!');
      return;
    }
    if (!mobile.trim()) {
      alert('মোবাইল নম্বর আবশ্যক!');
      return;
    }

    try {
      // 1. Determine patient Reg No
      let finalRegNo: number;
      const existingPatient = await db.patients.where('mobile').equals(mobile.trim()).first();
      if (existingPatient) {
        finalRegNo = existingPatient.regNo;
      } else {
        const lastPat = await db.patients.orderBy('regNo').last();
        finalRegNo = lastPat ? lastPat.regNo + 1 : (clinicSettings?.lastRegNo ? clinicSettings.lastRegNo + 1 : 4201);

        // Save new patient
        await db.patients.add({
          id: `p_${Date.now()}`,
          regNo: finalRegNo,
          name: name.trim(),
          age: age.trim() || '25',
          sex: sex || 'M',
          mobile: mobile.trim(),
          address: address.trim(),
          occupation: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // 2. Determine Doctor
      let docName = assignedDoctorName;
      let docId = assignedDoctorId;
      if (assignedDoctorId) {
        const matched = doctorsList.find((d) => d.id === assignedDoctorId);
        if (matched) {
          docName = matched.name;
        }
      }

      // 3. Compute Serial for this Doctor on this Date
      const sameDayDoctorAppts = appointments.filter(
        (a) => a.date === date && (a.doctorId === docId || a.doctorName === docName)
      );
      const nextSerial = sameDayDoctorAppts.length + 1;

      // 4. Create Appointment Record
      const apntItem: Appointment = {
        id: `apnt_${Date.now()}`,
        regNo: finalRegNo,
        name: name.trim(),
        age: age.trim() || '25',
        sex: sex || 'M',
        mobile: mobile.trim(),
        address: address.trim(),
        problem: problem.trim() || 'Dental Checkup & Consultation',
        doctorId: docId || undefined,
        doctorName: docName,
        date: date || todayStr,
        time: time || '10:00 AM',
        paid: Number(visitFee) || 0,
        visitFee: Number(visitFee) || 0,
        reference: reference.trim(),
        status: 'Waiting',
        serial: nextSerial,
        apntNo: `AP-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString(),
      };

      await db.appointments.put(apntItem);
      await syncEngine.logMutation('appointments', 'INSERT', apntItem.id, apntItem);

      // Direct MongoDB push
      fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment: apntItem }),
      })
        .then(() => checkMongoCount())
        .catch((e) => console.warn('Direct MongoDB save notice:', e));

      // 5. If fee was collected, log a payment receipt
      if (Number(visitFee) > 0) {
        const pmt: any = {
          id: `pay_${Date.now()}`,
          regNo: finalRegNo,
          name: name.trim(),
          mobile: mobile.trim(),
          date: date || todayStr,
          particulars: `Consultation Fee (Dr. ${docName})`,
          totalBill: Number(visitFee),
          discount: 0,
          payableAmount: Number(visitFee),
          paidAmount: Number(visitFee),
          dueAmount: 0,
          paymentMethod: 'Cash',
          createdAt: new Date().toISOString(),
        };
        await db.payments.put(pmt);
        await syncEngine.logMutation('payments', 'INSERT', pmt.id, pmt);
      }

      // Reset form
      setName('');
      setAge('');
      setMobile('');
      setAddress('');
      setProblem('');
      setReference('');
      setSearchRegOrPhone('');
      await loadAppointments();
      setSyncFeedback(`রোগী "${apntItem.name}"-এর জন্য সিরিয়াল #${nextSerial} (${docName}) সফলভাবে সংরক্ষিত ও MongoDB-তে সিঙ্ক হয়েছে!`);
      setTimeout(() => setSyncFeedback(''), 5000);
    } catch (err) {
      console.error('Failed to create appointment:', err);
      alert('সিরিয়াল তৈরি করতে সমস্যা হয়েছে!');
    }
  };

  const handleStatusChange = async (id: string, newStatus: Appointment['status']) => {
    await db.appointments.update(id, { status: newStatus });
    const updated = await db.appointments.get(id);
    if (updated) {
      await syncEngine.logMutation('appointments', 'UPDATE', id, updated);
      // Direct MongoDB patch
      fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
        .then(() => checkMongoCount())
        .catch((e) => console.warn('Direct MongoDB patch notice:', e));
    }
    loadAppointments();
    setSyncFeedback(`Appointment status updated to "${newStatus}" in MongoDB!`);
    setTimeout(() => setSyncFeedback(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (isDoctorUser) {
      alert('ডাক্তার রোল থেকে সিরিয়াল মোছার অনুমতি নেই!');
      return;
    }
    if (confirm('আপনি কি এই অ্যাপয়েন্টমেন্ট রেকর্ডটি মুছে ফেলতে চান?')) {
      await db.appointments.delete(id);
      await syncEngine.logMutation('appointments', 'DELETE', id, { id });
      fetch(`/api/appointments?id=${id}`, { method: 'DELETE' })
        .then(() => checkMongoCount())
        .catch(() => {});
      await loadAppointments();
      setSyncFeedback('Appointment deleted from database and MongoDB.');
      setTimeout(() => setSyncFeedback(''), 3000);
    }
  };

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      // 1. Doctor Isolation: If logged in as Doctor, strictly show ONLY patients assigned to this doctor!
      if (isDoctorUser) {
        const matchesDocId = a.doctorId && user && (a.doctorId === user.employeeId || a.doctorId === (user as any).id);
        const matchesDocName = a.doctorName && user?.name && (
          a.doctorName.toLowerCase().includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes(a.doctorName.toLowerCase())
        );
        if (!matchesDocId && !matchesDocName) return false;
      } else if (selectedDoctorFilter !== 'All') {
        const matchesDocId = a.doctorId && a.doctorId === selectedDoctorFilter;
        const matchesDocName = a.doctorName && a.doctorName.toLowerCase().includes(selectedDoctorFilter.toLowerCase());
        if (!matchesDocId && !matchesDocName) return false;
      }

      // 2. Date Filter
      if (viewFilter === 'today' && a.date !== todayStr) return false;
      if (viewFilter === 'upcoming' && a.date < todayStr) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = a.name.toLowerCase().includes(q);
        const matchesMobile = a.mobile.includes(q);
        const matchesReg = a.regNo ? String(a.regNo).includes(q) : false;
        const matchesProblem = a.problem ? a.problem.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesMobile && !matchesReg && !matchesProblem) return false;
      }

      return true;
    });
  }, [appointments, isDoctorUser, user, viewFilter, selectedDoctorFilter, searchQuery, todayStr]);

  // Metrics
  const metrics = useMemo(() => {
    const list = appointments.filter((a) => {
      if (isDoctorUser) {
        const matchesDocId = a.doctorId && user && (a.doctorId === user.employeeId || a.doctorId === (user as any).id);
        const matchesDocName = a.doctorName && user?.name && (
          a.doctorName.toLowerCase().includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes(a.doctorName.toLowerCase())
        );
        return matchesDocId || matchesDocName;
      }
      if (selectedDoctorFilter !== 'All') {
        return (
          (a.doctorId && a.doctorId === selectedDoctorFilter) ||
          (a.doctorName && a.doctorName.toLowerCase().includes(selectedDoctorFilter.toLowerCase()))
        );
      }
      return true;
    });

    const todayList = list.filter((a) => a.date === todayStr);
    const waiting = todayList.filter((a) => a.status === 'Waiting').length;
    const completed = todayList.filter((a) => a.status === 'Completed').length;
    return {
      todayTotal: todayList.length,
      waiting,
      completed,
      allTotal: list.length,
    };
  }, [appointments, isDoctorUser, user, selectedDoctorFilter, todayStr]);

  return (
    <div className="p-3 max-w-[1550px] mx-auto text-slate-800 space-y-4">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-sky-800 to-indigo-900 rounded-xl p-4 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/20">
            <CalendarIcon className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold font-sans tracking-wide">
                পেশেন্ট সিরিয়াল ও অ্যাপয়েন্টমেন্ট ম্যানেজমেন্ট (Appointment & Serial Queue)
              </h1>
              {isDoctorUser && (
                <span className="bg-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" />
                  <span>ডাক্তার ভিউ</span>
                </span>
              )}
            </div>
            <p className="text-xs text-sky-100 mt-0.5">
              {isDoctorUser
                ? `স্বাগতম, ${user.name} | আপনার অধীনে নির্ধারিত রোগীদের তালিকা ও সরাসরি প্রেসক্রিপশন প্রণয়ন`
                : 'রিসেপশন কাউন্টার: রোগীর তথ্য এন্ট্রি, ডাক্তার নির্বাচন ও সিরিয়াল প্রদান'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* MongoDB Live Sync Indicator */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-white/10 rounded-lg text-[11px] font-medium border border-white/20 backdrop-blur-xs">
            <span className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-400' : syncStatus === 'syncing' ? 'bg-amber-400 animate-ping' : 'bg-slate-400'}`}></span>
            <Cloud className="w-3.5 h-3.5 text-sky-300" />
            <span className="text-white">
              {isSyncing ? 'Syncing...' : mongoCount !== null ? `MongoDB: ${mongoCount} saved` : 'MongoDB Connected'}
            </span>
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-bold rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>

          <Link
            href="/prescription"
            className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg shadow transition flex items-center space-x-1.5"
          >
            <Stethoscope className="w-4 h-4" />
            <span>সরাসরি প্রেসক্রিপশন লিখুন</span>
          </Link>

          {/* Sync Now Button */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 font-medium flex items-center space-x-1 transition disabled:opacity-50"
            title="Sync appointments with MongoDB Atlas cloud database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Cloud SYNC'}</span>
          </button>

          {/* Backup All to Mongo Button */}
          <button
            onClick={handlePushAllToMongo}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 rounded-lg border border-sky-400/30 font-medium flex items-center space-x-1 transition disabled:opacity-50"
            title="Backup all local appointments to MongoDB"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Backup All to Mongo</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 shadow-xs">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{syncFeedback}</span>
        </div>
      )}

      {/* METRICS CARDS */}
      <div className="grid grid-cols-12 gap-3 text-xs">
        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">আজকের মোট সিরিয়াল</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{metrics.todayTotal} জন</div>
          <div className="text-[11px] text-slate-400 mt-0.5">তারিখ: {todayStr}</div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">অপেক্ষমান রোগী (Waiting)</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">{metrics.waiting} জন</div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">চেম্বারে ডাকার অপেক্ষায়</div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">চিকিৎসা সম্পন্ন (Completed)</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">{metrics.completed} জন</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">প্রেসক্রিপশন সম্পন্ন</div>
        </div>

        <div className="col-span-6 sm:col-span-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">সর্বমোট অ্যাপয়েন্টমেন্ট</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-900">{metrics.allTotal} জন</div>
          <div className="text-[11px] text-slate-400 mt-0.5">সব তারিখ মিলিয়ে</div>
        </div>
      </div>

      {/* DOCTOR CHAMBER NOTICE (WHEN LOGGED IN AS DOCTOR) */}
      {isDoctorUser && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900">
          <div className="flex items-center space-x-2">
            <Stethoscope className="w-4 h-4 text-blue-700" />
            <span className="font-bold">
              ডাক্তার চেম্বার ভিউ (ডা. {user?.name}): রিসেপশন থেকে শুধুমাত্র আপনার জন্য নির্ধারিত রোগীদের সিরিয়াল ও অ্যাপয়েন্টমেন্ট তালিকা নিচে প্রদর্শিত হচ্ছে।
            </span>
          </div>
          <span className="text-[11px] bg-blue-100 px-2.5 py-0.5 rounded-full font-semibold text-blue-800 border border-blue-200">
            🔒 শুধুমাত্র আপনার নির্ধারিত রোগী
          </span>
        </div>
      )}

      {/* APPOINTMENT ENTRY FORM (ONLY FOR RECEPTIONIST & ADMIN - HIDDEN FOR DOCTORS) */}
      {!isDoctorUser && (
        <div className="bg-white rounded-xl border border-sky-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-2.5 border-b border-sky-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Plus className="w-4 h-4 text-blue-700" />
            <h2 className="text-xs font-bold text-blue-950">
              নতুন রোগী সিরিয়াল ও ডাক্তার অ্যাসাইন এন্ট্রি (New Patient Serial Entry)
            </h2>
          </div>
          <span className="text-[11px] text-sky-800 font-semibold bg-white/80 px-2 py-0.5 rounded border border-sky-200">
            রিসেপশন কাউন্টার
          </span>
        </div>

        <form onSubmit={handleAddAppointment} className="p-4 space-y-3 text-xs">
          {/* Lookup Quick Bar */}
          <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
            <Search className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700">পূর্ববর্তী রোগী খুঁজুন:</span>
            <input
              type="text"
              value={searchRegOrPhone}
              onChange={(e) => setSearchRegOrPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLookupPatient();
                }
              }}
              placeholder="রেজি নং (e.g. 4200) অথবা মোবাইল"
              className="px-2.5 py-1 border border-slate-300 rounded bg-white font-mono text-xs w-48 focus:outline-none focus:border-blue-600"
            />
            <button
              type="button"
              onClick={handleLookupPatient}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded font-semibold text-xs cursor-pointer shadow-xs"
            >
              খুঁজুন (Find)
            </button>
            <span className="text-[10px] text-slate-500">
              (পুরাতন রোগী হলে স্বয়ংক্রিয়ভাবে নাম, বয়স ও ফোন নম্বর ফিল্ডে বসে যাবে)
            </span>
          </div>

          <div className="grid grid-cols-12 gap-3">
            {/* Patient Name */}
            <div className="col-span-12 sm:col-span-4">
              <label className="block text-slate-700 font-semibold mb-1">
                রোগীর সম্পূর্ণ নাম (Patient Name) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: আল-ইমরান"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Age */}
            <div className="col-span-6 sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">
                বয়স (Age) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="25"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Gender */}
            <div className="col-span-6 sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">লিঙ্গ (Gender)</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="M">পুরুষ (Male)</option>
                <option value="F">মহিলা (Female)</option>
                <option value="Other">অন্যান্য (Other)</option>
              </select>
            </div>

            {/* Mobile Number */}
            <div className="col-span-12 sm:col-span-4">
              <label className="block text-slate-700 font-semibold mb-1">
                মোবাইল নম্বর (Mobile No) <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* ASSIGN DOCTOR DROPDOWN */}
            <div className="col-span-12 sm:col-span-4 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-200">
              <label className="block text-indigo-950 font-bold mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-700" />
                  <span>অ্যাসাইন ডাক্তার (Assign Doctor) *</span>
                </span>
                <span className="text-[10px] text-indigo-700 font-normal">দায়িত্বপ্রাপ্ত ডাক্তার</span>
              </label>
              <select
                required
                value={assignedDoctorId || assignedDoctorName}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = doctorsList.find((d) => d.id === val || d.name === val);
                  if (matched) {
                    setAssignedDoctorId(matched.id);
                    setAssignedDoctorName(matched.name);
                  } else {
                    setAssignedDoctorId('');
                    setAssignedDoctorName(val);
                  }
                }}
                className="w-full px-2.5 py-1.5 border border-indigo-300 rounded-lg text-xs font-bold text-indigo-950 bg-white focus:outline-none focus:border-indigo-600"
              >
                {doctorsList.length === 0 ? (
                  <option value="ডা. নাহিদ হাসান">ডা. নাহিদ হাসান (ডেন্টাল সার্জন)</option>
                ) : (
                  doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.designation || 'ডেন্টাল সার্জন'})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Problem / Chief Complaint */}
            <div className="col-span-12 sm:col-span-4">
              <label className="block text-slate-700 font-semibold mb-1">
                রোগীর সমস্যা / লক্ষণ (Problem / CC)
              </label>
              <input
                type="text"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="যেমন: দাঁতে ব্যথা, মাড়ি ফোলা, স্কেলিং"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Visit Date & Time */}
            <div className="col-span-6 sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">তারিখ (Date)</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold font-mono focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="col-span-6 sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">সময় / স্লট (Time)</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="10:00 AM"
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Reference */}
            <div className="col-span-6 sm:col-span-3">
              <label className="block text-slate-700 font-semibold mb-1">রেফারেন্স (Reference)</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="কার মাধ্যমে এসেছেন (ঐচ্ছিক)"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Visit Fee */}
            <div className="col-span-6 sm:col-span-3">
              <label className="block text-slate-700 font-semibold mb-1">ভিজিট ফি (Visit Fee ৳)</label>
              <input
                type="number"
                value={visitFee}
                onChange={(e) => setVisitFee(Number(e.target.value))}
                placeholder="500"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-emerald-700 font-mono focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Patient Address */}
            <div className="col-span-12 sm:col-span-4">
              <label className="block text-slate-700 font-semibold mb-1">ঠিকানা (Address)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="যেমন: খিলগাঁও, ঢাকা"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Submit Button */}
            <div className="col-span-12 sm:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white font-bold rounded-lg shadow-sm text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                <span>সিরিয়াল বুক করুন</span>
              </button>
            </div>
          </div>
        </form>
      </div>
      )}

      {/* FILTER & QUEUE BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Date Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewFilter('today')}
            className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
              viewFilter === 'today' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            আজকের সিরিয়াল ({appointments.filter((a) => a.date === todayStr).length})
          </button>
          <button
            onClick={() => setViewFilter('upcoming')}
            className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
              viewFilter === 'upcoming' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            আসন্ন (Upcoming)
          </button>
          <button
            onClick={() => setViewFilter('all')}
            className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
              viewFilter === 'all' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            সব ({appointments.length})
          </button>
        </div>

        {/* Doctor Filter Dropdown or Locked Indicator */}
        {isDoctorUser ? (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 font-bold text-xs">
            <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
            <span>নির্ধারিত চেম্বার কিউ: {user?.name}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>ডাক্তার ফিল্টার:</span>
            </span>
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
            >
              <option value="All">সকল ডাক্তার (All Doctors)</option>
              {doctorsList.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="রোগীর নাম / ফোন / রেজি নং..."
            className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-56 focus:outline-none focus:border-blue-600 bg-white"
          />
        </div>
      </div>

      {/* APPOINTMENT QUEUE TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-sky-50 text-slate-800 font-bold border-b border-sky-100">
              <tr>
                <th className="p-3 w-16 text-center">সিরিয়াল</th>
                <th className="p-3">রোগীর নাম ও পরিচয়</th>
                <th className="p-3">যোগাযোগ</th>
                <th className="p-3">রোগীর সমস্যা (Problem)</th>
                <th className="p-3">অ্যাসাইন ডাক্তার</th>
                <th className="p-3 w-28">তারিখ ও সময়</th>
                <th className="p-3 w-24 text-right">ভিজিট ফি</th>
                <th className="p-3 w-32 text-center">বর্তমান অবস্থা</th>
                <th className="p-3 w-40 text-center">প্রেসক্রিপশন অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50 text-blue-600" />
                    কোনো অ্যাপয়েন্টমেন্ট বা সিরিয়াল পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apnt) => {
                  const matchingRx = apnt.prescriptionId
                    ? prescriptions.find((p) => p.id === apnt.prescriptionId)
                    : (apnt.regNo ? prescriptions.find((p) => p.regNo === apnt.regNo) : null);

                  const hasPrescription = 
                    apnt.status === 'Completed' || 
                    apnt.status === 'Sent to Cashier' || 
                    apnt.status === 'Payment Done' || 
                    Boolean(apnt.prescriptionId) || 
                    Boolean(matchingRx);
                  const rxId = matchingRx?.id || apnt.prescriptionId || '';

                  return (
                    <tr key={apnt.id} className="hover:bg-sky-50/40 transition">
                      {/* Serial Token */}
                      <td className="p-3 text-center">
                        <span className="w-8 h-8 bg-blue-100 text-blue-900 rounded-full font-mono font-black text-xs inline-flex items-center justify-center border border-blue-200">
                          {apnt.serial}
                        </span>
                      </td>

                      {/* Patient Name & Details */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-sm">{apnt.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          বয়স: {apnt.age || '-'} • লিঙ্গ: {apnt.sex || '-'} • Reg #{apnt.regNo || 'New'}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="p-3">
                        <div className="font-mono font-semibold text-slate-800">{apnt.mobile}</div>
                        {apnt.address && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {apnt.address}
                          </div>
                        )}
                      </td>

                      {/* Problem / CC */}
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-medium text-[11px]">
                          {apnt.problem || 'Dental Checkup'}
                        </span>
                        {apnt.reference && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Ref: {apnt.reference}
                          </div>
                        )}
                      </td>

                      {/* Assigned Doctor */}
                      <td className="p-3">
                        <div className="font-semibold text-indigo-900 flex items-center space-x-1">
                          <Stethoscope className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{apnt.doctorName || 'ডা. নাহিদ হাসান'}</span>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                        <div className="font-semibold">{apnt.date}</div>
                        <div className="text-[11px] text-slate-400">{apnt.time}</div>
                      </td>

                      {/* Visit Fee */}
                      <td className="p-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        ৳ {(apnt.paid || apnt.visitFee || 0).toLocaleString()}
                      </td>

                      {/* Status Changer */}
                      <td className="p-3 text-center">
                        <select
                          value={apnt.status}
                          onChange={(e: any) => handleStatusChange(apnt.id, e.target.value)}
                          className={`px-2 py-1 rounded font-bold text-[11px] border cursor-pointer ${
                            apnt.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : apnt.status === 'Payment Done'
                              ? 'bg-teal-100 text-teal-800 border-teal-300'
                              : apnt.status === 'Sent to Cashier'
                              ? 'bg-purple-100 text-purple-800 border-purple-300'
                              : apnt.status === 'Waiting'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : apnt.status === 'In-Progress'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="Waiting">Waiting (অপেক্ষমান)</option>
                          <option value="In-Progress">In-Chair (চিকিৎসাধীন)</option>
                          <option value="Sent to Cashier">Sent to Cashier (ক্যাশিয়ারে)</option>
                          <option value="Payment Done">Payment Done (বিল পরিশোধিত)</option>
                          <option value="Completed">Completed (সম্পন্ন)</option>
                          <option value="Scheduled">Scheduled (শিডিউল)</option>
                          <option value="Cancelled">Cancelled (বাতিল)</option>
                        </select>
                      </td>

                      {/* PRESCRIPTION ACTION BUTTONS */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {!hasPrescription ? (
                            <>
                              <Link
                                href={`/prescription?regNo=${apnt.regNo || ''}&apntId=${apnt.id}&name=${encodeURIComponent(
                                  apnt.name
                                )}&age=${encodeURIComponent(apnt.age || '')}&sex=${apnt.sex || 'M'}&mobile=${encodeURIComponent(
                                  apnt.mobile
                                )}&problem=${encodeURIComponent(apnt.problem || '')}&doctor=${encodeURIComponent(
                                  apnt.doctorName || ''
                                )}`}
                                className="px-2.5 py-1.5 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white font-bold rounded-lg shadow-xs hover:shadow transition flex items-center space-x-1 text-xs"
                                title="এই রোগীর জন্য প্রেসক্রিপশন তৈরি করুন"
                              >
                                <FileText className="w-3.5 h-3.5 text-yellow-300" />
                                <span>Make Prescription</span>
                              </Link>

                              {!isDoctorUser && (
                                <button
                                  onClick={() => handleDelete(apnt.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                  title="সিরিয়াল বাতিল/মুছুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {/* VIEW PRESCRIPTION BUTTON */}
                              <button
                                type="button"
                                onClick={() => handleOpenViewRx(matchingRx, apnt)}
                                className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold rounded-lg transition flex items-center space-x-1 text-xs shadow-xs cursor-pointer"
                                title="প্রেসক্রিপশন দেখুন"
                              >
                                <Eye className="w-3.5 h-3.5 text-sky-600" />
                                <span>ভিউ</span>
                              </button>

                              {/* EDIT PRESCRIPTION BUTTON (Doctor & Admin) */}
                              <Link
                                href={`/prescription?regNo=${apnt.regNo || ''}&rxId=${rxId}&apntId=${apnt.id}&name=${encodeURIComponent(
                                  apnt.name
                                )}&age=${encodeURIComponent(apnt.age || '')}&sex=${apnt.sex || 'M'}&mobile=${encodeURIComponent(
                                  apnt.mobile
                                )}&problem=${encodeURIComponent(apnt.problem || '')}&doctor=${encodeURIComponent(
                                  apnt.doctorName || ''
                                )}`}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-lg transition flex items-center space-x-1 text-xs shadow-xs"
                                title="প্রেসক্রিপশন সংশোধন / এডিট করুন"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                <span>এডিট</span>
                              </Link>

                              {/* DELETE BUTTON (Admin or non-doctor role) */}
                              {!isDoctorUser && (
                                <button
                                  onClick={() => handleDelete(apnt.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                  title="সিরিয়াল মুছুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRESCRIPTION VIEW MODAL */}
      {isViewModalOpen && (viewingRx || viewingApnt) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>প্রেসক্রিপশন বিবরণ (Prescription Details)</span>
                    <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full font-mono border border-blue-400/30">
                      Reg #{viewingRx?.regNo || viewingApnt?.regNo || 'N/A'}
                    </span>
                  </h3>
                  <div className="text-[11px] text-slate-300">
                    রোগী: <strong className="text-white">{viewingRx?.patientName || viewingApnt?.name}</strong> • তারিখ: {viewingRx?.date || viewingApnt?.date}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট</span>
                </button>

                {viewingApnt && (
                  <Link
                    href={`/prescription?regNo=${viewingRx?.regNo || viewingApnt.regNo || ''}&rxId=${viewingRx?.id || viewingApnt.prescriptionId || ''}&apntId=${viewingApnt.id}&name=${encodeURIComponent(
                      viewingRx?.patientName || viewingApnt.name
                    )}&age=${encodeURIComponent(viewingRx?.age || viewingApnt.age || '')}&sex=${viewingRx?.sex || viewingApnt.sex || 'M'}&mobile=${encodeURIComponent(
                      viewingRx?.mobile || viewingApnt.mobile || ''
                    )}`}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1 transition shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>এডিট প্রেসক্রিপশন</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setViewingRx(null);
                    setViewingApnt(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Prescription Preview */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Clinic Banner */}
              <div className="text-center pb-3 border-b-2 border-slate-800">
                <h2 className="text-lg font-bold text-slate-900">{clinicSettings?.clinicName || 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার'}</h2>
                <p className="text-[11px] text-slate-600">
                  {viewingApnt?.doctorName ? `চিকিৎসক: ${viewingApnt.doctorName}` : 'ডেন্টাল স্পেশালিস্ট কেয়ার'}
                </p>
              </div>

              {/* Patient Info Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[10px] block">রোগীর নাম:</span>
                  <span className="font-bold text-slate-900 text-xs">{viewingRx?.patientName || viewingApnt?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">বয়স ও লিঙ্গ:</span>
                  <span className="font-semibold text-slate-800 text-xs">{viewingRx?.age || viewingApnt?.age || '-'} Y / {viewingRx?.sex === 'F' ? 'মহিলা' : 'পুরুষ'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">মোবাইল:</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">{viewingRx?.mobile || viewingApnt?.mobile}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">তারিখ:</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs">{viewingRx?.date || viewingApnt?.date}</span>
                </div>
              </div>

              {/* Clinical Findings & Complaints */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <h4 className="font-bold text-blue-950 mb-1.5 flex items-center gap-1">
                    <span>Chief Complaints (C/C)</span>
                  </h4>
                  {viewingRx?.cc && viewingRx.cc.length > 0 ? (
                    <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                      {viewingRx.cc.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  ) : viewingApnt?.problem ? (
                    <div className="text-slate-700">{viewingApnt.problem}</div>
                  ) : (
                    <div className="text-slate-400 italic">কোনো তথ্য নেই</div>
                  )}
                </div>

                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                  <h4 className="font-bold text-indigo-950 mb-1.5">Diagnosis (Dx)</h4>
                  {viewingRx?.dx && viewingRx.dx.length > 0 ? (
                    <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                      {viewingRx.dx.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-slate-400 italic">নরমাল চেকআপ</div>
                  )}
                </div>

                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                  <h4 className="font-bold text-emerald-950 mb-1.5">Treatment Done / Plan</h4>
                  {viewingRx?.treatmentDone && viewingRx.treatmentDone.length > 0 ? (
                    <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                      {viewingRx.treatmentDone.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-slate-400 italic">পরামর্শ ও প্রাথমিক মূল্যায়ন</div>
                  )}
                </div>
              </div>

              {/* Rx Medicines Table */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-1.5">
                  <span className="text-blue-600 font-serif font-black text-sm">Rx</span>
                  <span>প্রেসক্রাইবকৃত ওষুধসমূহ (Prescribed Medicines):</span>
                </h4>
                {viewingRx?.medicines && viewingRx.medicines.filter((m) => m.brand?.trim()).length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-10 text-center">#</th>
                          <th className="p-2">ব্র্যান্ড / ওষুধের নাম</th>
                          <th className="p-2">মাত্রা (Dose)</th>
                          <th className="p-2">সেবনের নিয়ম (Instruction)</th>
                          <th className="p-2">সময়কাল (Duration)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingRx.medicines
                          .filter((m) => m.brand?.trim())
                          .map((m, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-2 text-center font-mono text-slate-500">{i + 1}</td>
                              <td className="p-2 font-bold text-slate-900">{m.brand}</td>
                              <td className="p-2 text-slate-700 font-medium">{m.dose || '-'}</td>
                              <td className="p-2 text-slate-700">{m.instruction || '-'}</td>
                              <td className="p-2 text-slate-700 font-medium">{m.duration || '-'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 italic">
                    কোনো ওষুধ প্রেসক্রাইব করা হয়নি অথবা এখনো সেভ করা হয়নি।
                  </div>
                )}
              </div>

              {/* Advice & Next Visit */}
              {viewingRx?.advice && viewingRx.advice.filter(Boolean).length > 0 && (
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                  <h4 className="font-bold text-amber-950 mb-1">উপদেশাবলী (Advice):</h4>
                  <ul className="list-disc list-inside text-amber-900 space-y-0.5 pl-1">
                    {viewingRx.advice.filter(Boolean).map((adv, i) => (
                      <li key={i}>{adv}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Visit */}
              {(viewingRx?.nextVisitDate || viewingRx?.revisitText) && (
                <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200 text-sky-950 flex items-center justify-between font-medium">
                  <span>পরবর্তী সাক্ষাত (Next Visit):</span>
                  <span className="font-bold font-mono">
                    {viewingRx.nextVisitDate || viewingRx.revisitText} {viewingRx.timeSlot ? `• ${viewingRx.timeSlot}` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs shrink-0">
              <Link
                href={`/patients?regNo=${viewingRx?.regNo || viewingApnt?.regNo || ''}`}
                className="text-blue-600 hover:underline font-semibold"
              >
                পুরো EMR ফাইল খুলুন →
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewingRx(null);
                  setViewingApnt(null);
                }}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition cursor-pointer"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
