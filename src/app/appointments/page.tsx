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
  Sparkles,
  ChevronDown,
  Check,
  Hash
} from 'lucide-react';
import { 
  db, 
  type Appointment, 
  type AppointmentSerialType,
  type Patient, 
  type Employee, 
  type ClinicSettings,
  type Prescription
} from '@/lib/db';
import { syncEngine, type SyncStatus } from '@/lib/syncEngine';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import ThermalTokenModal, { printThermalReceipt, getSerialTypeMeta } from '@/components/appointments/ThermalTokenModal';

const STANDARD_TIME_SLOTS_30MIN = [
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
  '05:30 PM',
  '06:00 PM',
  '06:30 PM',
  '07:00 PM',
  '07:30 PM',
  '08:00 PM',
  '08:30 PM',
  '09:00 PM',
  '09:30 PM',
  '10:00 PM',
  '10:30 PM',
];

function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 9999;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 9999;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = (match[3] || '').toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function TimeSlotPicker({
  value,
  onChange,
  className = '',
  placeholder = '10:30 AM',
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white hover:border-blue-500 focus:outline-none focus:border-blue-600 cursor-pointer flex items-center justify-between shadow-xs transition"
      >
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">{value || placeholder}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[150px] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 divide-y divide-slate-100 py-1">
          {STANDARD_TIME_SLOTS_30MIN.map((slot) => {
            const isSelected = value === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  onChange(slot);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white font-black'
                    : 'text-slate-700 hover:bg-blue-50 hover:text-blue-800'
                }`}
              >
                <span>{slot}</span>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

  // Thermal Token Modal State
  const [tokenModalApnt, setTokenModalApnt] = useState<Appointment | null>(null);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);

  // Reschedule Modal State
  const [rescheduleApnt, setRescheduleApnt] = useState<Appointment | null>(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState<boolean>(false);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('10:30 AM');
  const [rescheduleDoctorId, setRescheduleDoctorId] = useState<string>('');
  const [rescheduleDoctorName, setRescheduleDoctorName] = useState<string>('');

  // Filters
  const [viewFilter, setViewFilter] = useState<'today' | 'upcoming' | 'absent' | 'all'>('today');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('All');
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | AppointmentSerialType>('ALL');
  const [sortBy, setSortBy] = useState<'serial' | 'time_asc' | 'time_desc'>('serial');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State
  const [serialType, setSerialType] = useState<AppointmentSerialType>('NEW');
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
  const [time, setTime] = useState<string>('10:30 AM');
  const [reference, setReference] = useState<string>('');
  const [visitFee, setVisitFee] = useState<number>(500);

  const todayStr = new Date().toISOString().split('T')[0];
  const userRole = (user?.role || '').toLowerCase();
  const isDoctorUser = userRole === 'doctor';
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin';
  const isReceptionistOrCashier = userRole.includes('receptionist') || userRole.includes('cashier');

  useEffect(() => {
    loadInitialData();
    checkMongoCount();

    const handleRefresh = () => {
      loadAppointments();
      checkMongoCount();
    };

    window.addEventListener('storage', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    const unsub = syncEngine.subscribe((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
      if (status === 'online' && count === 0) {
        loadAppointments();
        checkMongoCount();
      }
    });

    return () => {
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
      unsub();
    };
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

      // 2. Load settings for dynamic clinic header & default visit fee
      let settings = await db.settings.get('default_settings');
      if (!settings) {
        try {
          const res = await fetch('/api/settings');
          const data = await res.json();
          if (data.success && data.settings) {
            settings = data.settings;
            await db.settings.put(settings);
          }
        } catch (e) {
          console.warn('Notice: fallback settings fetch', e);
        }
      }
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
      if (!targetRx) {
        try {
          const res = await fetch(`/api/prescriptions?id=${encodeURIComponent(apnt.prescriptionId)}`);
          const data = await res.json();
          if (data.success && data.prescription) {
            targetRx = data.prescription;
            await db.prescriptions.put(targetRx);
          }
        } catch (e) {
          console.warn('Could not fetch prescription from cloud for view:', e);
        }
      }
    }
    if (!targetRx && apnt.regNo) {
      targetRx = await db.prescriptions.where('regNo').equals(apnt.regNo).last();
      if (!targetRx) {
        try {
          const res = await fetch(`/api/prescriptions?regNo=${apnt.regNo}`);
          const data = await res.json();
          if (data.success && data.prescriptions && data.prescriptions.length > 0) {
            targetRx = data.prescriptions[0];
            await db.prescriptions.put(targetRx);
          }
        } catch (e) {
          console.warn('Could not fetch prescription from cloud for view by regNo:', e);
        }
      }
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
      setSerialType('OLD');
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

      // 3. Compute Serial for this Doctor on this Date per Serial Category
      const sameCategoryDoctorAppts = appointments.filter(
        (a) => a.date === date && 
               (a.doctorId === docId || a.doctorName === docName) &&
               (a.serialType || 'NEW') === serialType
      );
      const nextSerial = sameCategoryDoctorAppts.length + 1;

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
        serialType: serialType,
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
        .catch(() => {});

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

      // Log Appointment Creation Activity
      logActivity({
        action: 'CREATE_APPOINTMENT',
        module: 'Appointment',
        description: `নতুন অ্যাপয়েন্টমেন্ট/সিরিয়াল তৈরি: #${nextSerial} - ${name.trim()} (${docName}, তারিখ: ${date || todayStr})`,
        metadata: {
          apntId: apntItem.id,
          regNo: finalRegNo,
          patientName: name.trim(),
          doctorName: docName,
          serial: nextSerial,
          date: date || todayStr,
          visitFee: Number(visitFee) || 0,
        },
        user: user || undefined,
      });

      // Reset form
      setName('');
      setAge('');
      setMobile('');
      setAddress('');
      setProblem('');
      setTime('10:30 AM');
      setReference('');
      setSearchRegOrPhone('');
      setSerialType('NEW');
      await loadAppointments();

      // Automatically open Thermal Token Receipt preview & trigger print for patient
      setTokenModalApnt(apntItem);
      setIsTokenModalOpen(true);
      setTimeout(() => {
        printThermalReceipt(apntItem, clinicSettings, '80mm');
      }, 350);

      setSyncFeedback(`রোগী "${apntItem.name}"-এর জন্য সিরিয়াল ${serialType}-#${nextSerial} (${docName}) সফলভাবে সংরক্ষিত হয়েছে এবং টোকেন স্লিপ প্রস্তুত!`);
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
        .catch(() => {});

      logActivity({
        action: 'STATUS_CHANGE',
        module: 'Appointment',
        description: `সিরিয়াল #${updated.serial} (${updated.name}) এর স্ট্যাটাস '${newStatus}' করা হয়েছে`,
        metadata: { apntId: id, name: updated.name, serial: updated.serial, newStatus },
        user: user || undefined,
      });
    }
    loadAppointments();
    setSyncFeedback(`Appointment status updated to "${newStatus}" in MongoDB!`);
    setTimeout(() => setSyncFeedback(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (isReceptionistOrCashier) {
      alert('রিসেপশনিস্ট / ক্যাশিয়ার রোল থেকে অ্যাপয়েন্টমেন্ট মুছে ফেলার অনুমতি নেই!');
      return;
    }
    if (isDoctorUser) {
      alert('ডাক্তার রোল থেকে সিরিয়াল মোছার অনুমতি নেই!');
      return;
    }
    const target = await db.appointments.get(id);
    if (confirm('আপনি কি এই অ্যাপয়েন্টমেন্ট রেকর্ডটি মুছে ফেলতে চান?')) {
      await db.appointments.delete(id);
      await syncEngine.logMutation('appointments', 'DELETE', id, { id });
      fetch(`/api/appointments?id=${id}`, { method: 'DELETE' })
        .then(() => checkMongoCount())
        .catch(() => {});

      if (target) {
        logActivity({
          action: 'DELETE_APPOINTMENT',
          module: 'Appointment',
          description: `অ্যাপয়েন্টমেন্ট মুছে ফেলা হয়েছে: #${target.serial} (${target.name}, তারিখ: ${target.date})`,
          metadata: { id, name: target.name, date: target.date },
          user: user || undefined,
        });
      }

      await loadAppointments();
      setSyncFeedback('Appointment deleted from database and MongoDB.');
      setTimeout(() => setSyncFeedback(''), 3000);
    }
  };

  // Open Reschedule Modal
  const handleOpenReschedule = (apnt: Appointment) => {
    setRescheduleApnt(apnt);
    // Suggest tomorrow or today as default reschedule date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    setRescheduleDate(apnt.date < todayStr ? todayStr : tomorrowStr);
    setRescheduleTime(apnt.time || '10:30 AM');
    setRescheduleDoctorId(apnt.doctorId || '');
    setRescheduleDoctorName(apnt.doctorName || '');
    setIsRescheduleModalOpen(true);
  };

  // Confirm Reschedule
  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleApnt) return;
    if (!rescheduleDate) {
      alert('অনুগ্রহ করে নতুন অ্যাপয়েন্টমেন্ট তারিখ নির্বাচন করুন!');
      return;
    }

    try {
      let docName = rescheduleDoctorName || rescheduleApnt.doctorName;
      let docId = rescheduleDoctorId || rescheduleApnt.doctorId;
      if (rescheduleDoctorId) {
        const matched = doctorsList.find((d) => d.id === rescheduleDoctorId);
        if (matched) {
          docName = matched.name;
        }
      }

      // Compute next serial number for this doctor on this new date for this category
      const targetCategory = (rescheduleApnt.serialType || 'NEW') as AppointmentSerialType;
      const sameCategoryDoctorAppts = appointments.filter(
        (a) => a.id !== rescheduleApnt.id && 
               a.date === rescheduleDate && 
               (a.doctorId === docId || a.doctorName === docName) &&
               (a.serialType || 'NEW') === targetCategory
      );
      const nextSerial = sameCategoryDoctorAppts.length + 1;
      const newStatus: Appointment['status'] = rescheduleDate > todayStr ? 'Scheduled' : 'Waiting';

      const updated: Appointment = {
        ...rescheduleApnt,
        date: rescheduleDate,
        time: rescheduleTime || '10:00 AM',
        serial: nextSerial,
        serialType: targetCategory,
        doctorId: docId,
        doctorName: docName,
        status: newStatus,
      };

      await db.appointments.put(updated);
      await syncEngine.logMutation('appointments', 'UPDATE', updated.id, updated);

      // Direct MongoDB patch
      fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: updated.id,
          date: updated.date,
          time: updated.time,
          serial: updated.serial,
          serialType: updated.serialType,
          doctorId: updated.doctorId,
          doctorName: updated.doctorName,
          status: updated.status,
        }),
      }).catch((err) => console.warn('Direct MongoDB patch notice on reschedule:', err));

      logActivity({
        action: 'RESCHEDULE_APPOINTMENT',
        module: 'Appointment',
        description: `অ্যাপয়েন্টমেন্ট পুনর্নির্ধারণ: ${rescheduleApnt.name} (${rescheduleApnt.date} থেকে নতুন তারিখ ${rescheduleDate}, সিরিয়াল ${targetCategory}-#${nextSerial})`,
        metadata: {
          apntId: updated.id,
          name: updated.name,
          oldDate: rescheduleApnt.date,
          newDate: rescheduleDate,
          newSerial: nextSerial,
          serialType: targetCategory,
          doctorName: docName,
        },
        user: user || undefined,
      });

      setIsRescheduleModalOpen(false);
      setRescheduleApnt(null);
      await loadAppointments();
      await checkMongoCount();

      const targetTabLabel = rescheduleDate > todayStr ? 'আসন্ন (Upcoming) তালিকায়' : 'আজকের সিরিয়াল তালিকায়';
      setSyncFeedback(`রোগী "${updated.name}"-এর সিরিয়াল ${rescheduleDate} তারিখে নতুন সিরিয়াল ${targetCategory}-#${nextSerial} (${docName}) সহ সফলভাবে রিশিডিউল করা হয়েছে এবং ${targetTabLabel} যুক্ত হয়েছে!`);
      setTimeout(() => setSyncFeedback(''), 5000);
    } catch (err) {
      console.error('Failed to reschedule appointment:', err);
      alert('সিরিয়াল রিশিডিউল করতে সমস্যা হয়েছে!');
    }
  };

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    let result = appointments.filter((a) => {
      // 1. Doctor Filter
      if (selectedDoctorFilter !== 'All') {
        const matchesDocId = a.doctorId && (a.doctorId === selectedDoctorFilter || (user && a.doctorId === user.employeeId));
        const matchesDocName = a.doctorName && (
          a.doctorName.toLowerCase().includes(selectedDoctorFilter.toLowerCase()) ||
          selectedDoctorFilter.toLowerCase().includes(a.doctorName.toLowerCase())
        );
        if (!matchesDocId && !matchesDocName) return false;
      }

      // 2. Date & Status Filter
      if (viewFilter === 'today') {
        if (a.date !== todayStr) return false;
      }
      
      if (viewFilter === 'upcoming') {
        // Strictly future dates (excluding today)
        if (a.date <= todayStr) return false;
      }
      
      if (viewFilter === 'absent') {
        // Appointments explicitly marked as Absent, or past dates without completed prescription
        const isPastUnattended = a.date < todayStr && a.status !== 'Completed' && !a.prescriptionId;
        const isExplicitAbsent = a.status === 'Absent';
        if (!isPastUnattended && !isExplicitAbsent) return false;
      }

      // 3. Time Slot Filter
      if (selectedSlotFilter !== 'ALL') {
        const itemTime = (a.time || '').trim().toUpperCase();
        if (!itemTime.includes(selectedSlotFilter.toUpperCase())) {
          return false;
        }
      }

      // 4. Serial Category Filter
      if (selectedCategoryFilter !== 'ALL') {
        const itemCategory = (a.serialType || 'NEW').toUpperCase();
        if (itemCategory !== selectedCategoryFilter) {
          return false;
        }
      }

      // 5. Search Query
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

    // 6. Sorting
    if (sortBy === 'time_asc') {
      result.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
    } else if (sortBy === 'time_desc') {
      result.sort((a, b) => parseTimeToMinutes(b.time) - parseTimeToMinutes(a.time));
    } else if (sortBy === 'serial') {
      result.sort((a, b) => {
        const catA = (a.serialType || 'NEW').toUpperCase();
        const catB = (b.serialType || 'NEW').toUpperCase();
        if (catA !== catB) return catA.localeCompare(catB);
        return (a.serial || 0) - (b.serial || 0);
      });
    }

    return result;
  }, [appointments, user, viewFilter, selectedDoctorFilter, selectedSlotFilter, selectedCategoryFilter, sortBy, searchQuery, todayStr]);

  // Metrics
  const metrics = useMemo(() => {
    const list = appointments.filter((a) => {
      if (selectedDoctorFilter !== 'All') {
        const matchesDocId = a.doctorId && (a.doctorId === selectedDoctorFilter || (user && a.doctorId === user.employeeId));
        const matchesDocName = a.doctorName && (
          a.doctorName.toLowerCase().includes(selectedDoctorFilter.toLowerCase()) ||
          selectedDoctorFilter.toLowerCase().includes(a.doctorName.toLowerCase())
        );
        return matchesDocId || matchesDocName;
      }
      return true;
    });

    const todayList = list.filter((a) => a.date === todayStr);
    const waiting = todayList.filter((a) => a.status === 'Waiting').length;
    const completed = todayList.filter((a) => a.status === 'Completed').length;
    const absentToday = todayList.filter((a) => a.status === 'Absent').length;
    // Absent Total includes past unattended appointments + explicitly Absent appointments
    const absentTotal = list.filter((a) => a.status === 'Absent' || (a.date < todayStr && a.status !== 'Completed' && !a.prescriptionId)).length;
    const upcomingTotal = list.filter((a) => a.date > todayStr).length;

    return {
      todayTotal: todayList.length,
      waiting,
      completed,
      absentToday,
      absentTotal,
      upcomingTotal,
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

        {!isReceptionistOrCashier && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href="/prescription"
              className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg shadow transition flex items-center space-x-1.5"
            >
              <Stethoscope className="w-4 h-4" />
              <span>সরাসরি প্রেসক্রিপশন লিখুন</span>
            </Link>
          </div>
        )}
      </div>

      {syncFeedback && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 shadow-xs">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{syncFeedback}</span>
        </div>
      )}

      {/* METRICS CARDS (5 RESPONSIVE CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        {/* 1. Today Total */}
        <div 
          onClick={() => setViewFilter('today')}
          className={`bg-white border rounded-xl p-3 shadow-xs transition cursor-pointer hover:border-blue-400 ${
            viewFilter === 'today' ? 'border-blue-500 ring-1 ring-blue-400' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">আজকের মোট সিরিয়াল</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{metrics.todayTotal} জন</div>
          <div className="text-[11px] text-slate-400 mt-0.5">তারিখ: {todayStr}</div>
        </div>

        {/* 2. Waiting */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">অপেক্ষমান রোগী (Waiting)</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">{metrics.waiting} জন</div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">চেম্বারে ডাকার অপেক্ষায়</div>
        </div>

        {/* 3. Completed */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold">চিকিৎসা সম্পন্ন (Completed)</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">{metrics.completed} জন</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">প্রেসক্রিপশন সম্পন্ন</div>
        </div>

        {/* 4. Absent Patients (NEW CARD) */}
        <div 
          onClick={() => setViewFilter('absent')}
          className={`bg-white border rounded-xl p-3 shadow-xs transition cursor-pointer hover:border-rose-400 ${
            viewFilter === 'absent' ? 'border-rose-500 ring-1 ring-rose-400 bg-rose-50/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold text-rose-950">অনুপস্থিত রোগী (Absent)</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">{metrics.absentToday} জন</div>
          <div className="text-[11px] text-rose-500 font-medium mt-0.5">
            মোট অনুপস্থিত: {metrics.absentTotal} জন
          </div>
        </div>

        {/* 5. All Total */}
        <div 
          onClick={() => setViewFilter('all')}
          className={`bg-white border rounded-xl p-3 shadow-xs transition cursor-pointer hover:border-purple-400 ${
            viewFilter === 'all' ? 'border-purple-500 ring-1 ring-purple-400' : 'border-slate-200'
          }`}
        >
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
        <div className="bg-white rounded-xl border border-sky-200 shadow-sm">
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-t-xl px-4 py-2.5 border-b border-sky-200 flex items-center justify-between">
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

          {/* SERIAL TYPE SELECTION (4 DYNAMIC TYPES: NEW, OLD, LAB, PHYSIO) */}
          <div className="p-3 bg-gradient-to-r from-slate-50 via-sky-50/40 to-blue-50/50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-800 font-bold flex items-center gap-1.5 text-xs">
                <Hash className="w-4 h-4 text-blue-600" />
                <span>সিরিয়ালের ধরণ (Serial Type) <span className="text-red-500">*</span></span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                নির্বাচিত ধরণের জন্য ডাইনামিক সিরিয়াল নম্বর নির্ধারিত হবে
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { 
                  type: 'NEW' as const, 
                  label: 'নতুন রোগী', 
                  desc: 'New Patient', 
                  activeBorder: 'border-emerald-500 ring-2 ring-emerald-400 bg-emerald-50/50',
                  badge: 'bg-emerald-600 text-white'
                },
                { 
                  type: 'OLD' as const, 
                  label: 'পুরাতন রোগী', 
                  desc: 'Old / Follow-up', 
                  activeBorder: 'border-indigo-500 ring-2 ring-indigo-400 bg-indigo-50/50',
                  badge: 'bg-indigo-600 text-white'
                },
                { 
                  type: 'LAB' as const, 
                  label: 'ল্যাব সার্ভিস', 
                  desc: 'Dental Lab Work', 
                  activeBorder: 'border-amber-500 ring-2 ring-amber-400 bg-amber-50/50',
                  badge: 'bg-amber-600 text-white'
                },
                { 
                  type: 'PHYSIO' as const, 
                  label: 'ফিজিওথেরাপি', 
                  desc: 'Physiotherapy', 
                  activeBorder: 'border-teal-500 ring-2 ring-teal-400 bg-teal-50/50',
                  badge: 'bg-teal-600 text-white'
                },
              ].map((item) => {
                const isSelected = serialType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setSerialType(item.type)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${item.activeBorder} shadow-xs`
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-0.5 rounded font-mono font-black text-xs ${isSelected ? item.badge : 'bg-slate-100 text-slate-700'}`}>
                        {item.type}
                      </span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{item.label}</div>
                      <div className="text-[10px] text-slate-400">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
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
              <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                <span>সময় / স্লট (Time)</span>
                <span className="text-[10px] text-blue-600 font-bold">১০:৩০ AM - ১০:৩০ PM</span>
              </label>
              <TimeSlotPicker value={time} onChange={setTime} />
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
            আজকের সিরিয়াল ({metrics.todayTotal})
          </button>
          <button
            onClick={() => setViewFilter('upcoming')}
            className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
              viewFilter === 'upcoming' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            আসন্ন (Upcoming) ({metrics.upcomingTotal})
          </button>
          <button
            onClick={() => setViewFilter('absent')}
            className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              viewFilter === 'absent'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-rose-700 hover:text-rose-900 hover:bg-rose-50'
            }`}
          >
            <span>অনুপস্থিত (Absent)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                viewFilter === 'absent' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {metrics.absentTotal}
            </span>
          </button>
          <button
            onClick={() => setViewFilter('all')}
            className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
              viewFilter === 'all' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            সব ({metrics.allTotal})
          </button>
        </div>

        {/* Doctor Filter Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>ডাক্তার ফিল্টার:</span>
          </span>
          <select
            value={selectedDoctorFilter}
            onChange={(e) => setSelectedDoctorFilter(e.target.value)}
            className={`px-2.5 py-1.5 border rounded-lg font-bold text-xs focus:outline-none focus:border-blue-600 ${
              isDoctorUser ? 'border-blue-300 bg-blue-50/80 text-blue-950' : 'border-slate-300 bg-white text-slate-900'
            }`}
          >
            {isDoctorUser && (
              <option value={user?.employeeId || user?.name}>আমার চেম্বার কিউ (ডা. {user?.name})</option>
            )}
            <option value="All">সকল ডাক্তার (All Doctors Queue)</option>
            {doctorsList
              .filter((doc) => !isDoctorUser || (doc.name !== user?.name && doc.id !== user?.employeeId))
              .map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
          </select>
        </div>

        {/* Time Slot Filter Dropdown */}
        <div className="flex items-center space-x-1.5">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>স্লট ফিল্টার:</span>
          </span>
          <select
            value={selectedSlotFilter}
            onChange={(e) => setSelectedSlotFilter(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-xs bg-white text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="ALL">সকল স্লট (All Time Slots)</option>
            {STANDARD_TIME_SLOTS_30MIN.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>

        {/* Serial Category Filter Dropdown */}
        <div className="flex items-center space-x-1.5">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-blue-600" />
            <span>সিরিয়াল ধরণ:</span>
          </span>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value as any)}
            className="px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-xs bg-white text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="ALL">সকল ধরণ (All Types)</option>
            <option value="NEW">NEW (নতুন রোগী)</option>
            <option value="OLD">OLD (পুরাতন রোগী)</option>
            <option value="LAB">LAB (ল্যাব সার্ভিস)</option>
            <option value="PHYSIO">PHYSIO (ফিজিওথেরাপি)</option>
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div className="flex items-center space-x-1.5">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-sky-600" />
            <span>সাজান (Sort):</span>
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-xs bg-white text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="serial">সিরিয়াল নং (Serial)</option>
            <option value="time_asc">সময় আগে-পরে (Time: 10:30 AM → Night)</option>
            <option value="time_desc">সময় পরে-আগে (Time: Night → 10:30 AM)</option>
          </select>
        </div>
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
                <th className="p-3 w-28 text-center">সিরিয়াল</th>
                <th className="p-3 w-28 text-center font-mono">রেজি. নং</th>
                <th className="p-3">রোগীর নাম ও পরিচয়</th>
                <th className="p-3">যোগাযোগ</th>
                <th className="p-3">রোগীর সমস্যা (Problem)</th>
                <th className="p-3">অ্যাসাইন ডাক্তার</th>
                <th className="p-3 w-28">তারিখ ও সময়</th>
                <th className="p-3 w-24 text-right">ভিজিট ফি</th>
                <th className="p-3 w-32 text-center">বর্তমান অবস্থা</th>
                <th className="p-3 w-48 text-center">প্রেসক্রিপশন ও রিশিডিউল</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
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
                        {(() => {
                          const catMeta = getSerialTypeMeta(apnt.serialType);
                          return (
                            <span 
                              className={`px-2 py-0.5 rounded-lg font-mono font-black text-xs inline-flex items-center justify-center border shadow-2xs ${catMeta.bg} ${catMeta.text} ${catMeta.border}`}
                              title={`${catMeta.label} (${catMeta.code})`}
                            >
                              {catMeta.code}-#{apnt.serial}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Registration Number */}
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 bg-slate-100 text-blue-950 font-mono font-bold text-xs rounded-lg border border-slate-200 inline-block shadow-2xs">
                          #{apnt.regNo || 'New'}
                        </span>
                      </td>

                      {/* Patient Name & Details */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-sm">{apnt.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          বয়স: {apnt.age || '-'} • লিঙ্গ: {apnt.sex || '-'}
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
                              : apnt.status === 'Absent'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : apnt.status === 'Cancelled'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="Waiting">Waiting (অপেক্ষমান)</option>
                          <option value="In-Progress">In-Chair (চিকিৎসাধীন)</option>
                          <option value="Sent to Cashier">Sent to Cashier (ক্যাশিয়ারে)</option>
                          <option value="Payment Done">Payment Done (বিল পরিশোধিত)</option>
                          <option value="Completed">Completed (সম্পন্ন)</option>
                          <option value="Absent">Absent (অনুপস্থিত)</option>
                          <option value="Scheduled">Scheduled (শিডিউল)</option>
                          <option value="Cancelled">Cancelled (বাতিল)</option>
                        </select>
                      </td>

                      {/* PRESCRIPTION & TOKEN ACTION BUTTONS */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5 flex-wrap gap-y-1">
                          {/* THERMAL TOKEN PRINT BUTTON */}
                          <button
                            type="button"
                            onClick={() => {
                              setTokenModalApnt(apnt);
                              setIsTokenModalOpen(true);
                            }}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg transition flex items-center space-x-1 text-[11px] shadow-2xs cursor-pointer"
                            title="রোগীর সিরিয়াল টোকেন স্লিপ প্রিন্ট করুন"
                          >
                            <Printer className="w-3 h-3 text-emerald-600" />
                            <span>টোকেন</span>
                          </button>

                          {/* RESCHEDULE BUTTON (Available for all, especially Absent/Upcoming) */}
                          <button
                            type="button"
                            onClick={() => handleOpenReschedule(apnt)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold rounded-lg transition flex items-center space-x-1 text-[11px] shadow-2xs cursor-pointer"
                            title="নতুন তারিখে সিরিয়াল রিশিডিউল করুন"
                          >
                            <CalendarIcon className="w-3 h-3 text-indigo-600" />
                            <span>রিশিডিউল</span>
                          </button>

                          {!hasPrescription ? (
                            <>
                              {!isReceptionistOrCashier && (
                                <Link
                                  href={`/prescription?regNo=${apnt.regNo || ''}&apntId=${apnt.id}&name=${encodeURIComponent(
                                    apnt.name
                                  )}&age=${encodeURIComponent(apnt.age || '')}&sex=${apnt.sex || 'M'}&mobile=${encodeURIComponent(
                                    apnt.mobile
                                  )}&problem=${encodeURIComponent(apnt.problem || '')}&doctor=${encodeURIComponent(
                                    apnt.doctorName || ''
                                  )}`}
                                  className="px-2.5 py-1 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white font-bold rounded-lg shadow-xs hover:shadow transition flex items-center space-x-1 text-[11px]"
                                  title="এই রোগীর জন্য প্রেসক্রিপশন তৈরি করুন"
                                >
                                  <FileText className="w-3 h-3 text-yellow-300" />
                                  <span>Make Rx</span>
                                </Link>
                              )}

                              {!isDoctorUser && !isReceptionistOrCashier && (
                                <button
                                  onClick={() => handleDelete(apnt.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
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
                                className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold rounded-lg transition flex items-center space-x-1 text-[11px] shadow-xs cursor-pointer"
                                title="প্রেসক্রিপশন দেখুন"
                              >
                                <Eye className="w-3 h-3 text-sky-600" />
                                <span>ভিউ</span>
                              </button>

                              {/* EDIT PRESCRIPTION BUTTON (Doctor & Admin) */}
                              {!isReceptionistOrCashier && (
                                <Link
                                  href={`/prescription?regNo=${apnt.regNo || ''}&rxId=${rxId}&apntId=${apnt.id}&name=${encodeURIComponent(
                                    apnt.name
                                  )}&age=${encodeURIComponent(apnt.age || '')}&sex=${apnt.sex || 'M'}&mobile=${encodeURIComponent(
                                    apnt.mobile
                                  )}&problem=${encodeURIComponent(apnt.problem || '')}&doctor=${encodeURIComponent(
                                    apnt.doctorName || ''
                                  )}`}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-lg transition flex items-center space-x-1 text-[11px] shadow-xs"
                                  title="প্রেসক্রিপশন সংশোধন / এডিট করুন"
                                >
                                  <Edit3 className="w-3 h-3 text-amber-700" />
                                  <span>এডিট</span>
                                </Link>
                              )}

                              {/* DELETE BUTTON (Admin or non-doctor role) */}
                              {!isDoctorUser && !isReceptionistOrCashier && (
                                <button
                                  onClick={() => handleDelete(apnt.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
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

      {/* RESCHEDULE APPOINTMENT MODAL */}
      {isRescheduleModalOpen && rescheduleApnt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-indigo-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">সিরিয়াল রিশিডিউল করুন</h3>
                  <p className="text-[11px] text-indigo-200">Reschedule Patient Appointment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRescheduleModalOpen(false);
                  setRescheduleApnt(null);
                }}
                className="p-1.5 text-indigo-300 hover:text-white hover:bg-indigo-800/50 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmReschedule} className="p-5 space-y-3.5 text-xs">
              {/* Patient Quick Info Card */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">{rescheduleApnt.name}</span>
                  <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-indigo-200">
                    Reg #{rescheduleApnt.regNo || 'New'}
                  </span>
                </div>
                <div className="text-slate-600 flex justify-between text-[11px]">
                  <span>পূর্ববর্তী তারিখ: <strong className="font-mono text-slate-800">{rescheduleApnt.date}</strong></span>
                  <span>মোবাইল: <strong className="font-mono text-slate-800">{rescheduleApnt.mobile}</strong></span>
                </div>
              </div>

              {/* New Date Picker */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  নতুন অ্যাপয়েন্টমেন্ট তারিখ (New Date) <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-indigo-600 bg-white"
                />
              </div>

              {/* New Time Slot */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                  <span>নতুন সময় / স্লট (Time Slot) <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-indigo-600 font-bold">১০:৩০ AM - ১০:৩০ PM</span>
                </label>
                <TimeSlotPicker
                  value={rescheduleTime}
                  onChange={setRescheduleTime}
                  placeholder="10:30 AM"
                />
              </div>

              {/* Doctor Selection */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ডাক্তার নির্বাচন (Assign Doctor)
                </label>
                <select
                  value={rescheduleDoctorId || rescheduleDoctorName}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = doctorsList.find((d) => d.id === val || d.name === val);
                    if (matched) {
                      setRescheduleDoctorId(matched.id);
                      setRescheduleDoctorName(matched.name);
                    } else {
                      setRescheduleDoctorId('');
                      setRescheduleDoctorName(val);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-indigo-600"
                >
                  {doctorsList.length === 0 ? (
                    <option value={rescheduleApnt.doctorName || 'ডা. নাহিদ হাসান'}>
                      {rescheduleApnt.doctorName || 'ডা. নাহিদ হাসান'}
                    </option>
                  ) : (
                    doctorsList.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({doc.designation || 'ডেন্টাল সার্জন'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Smart Auto Serial Note */}
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                💡 <strong>স্বয়ংক্রিয় সিরিয়াল ব্যবস্থাপনা:</strong> নির্বাচিত তারিখে ওই ডাক্তারের জন্য পরবর্তী ক্রমিক সিরিয়াল নম্বর স্বয়ংক্রিয়ভাবে নির্ধারণ করা হবে। ভবিষ্যৎ তারিখের ক্ষেত্রে এটি স্বয়ংক্রিয়ভাবে <strong>"আসন্ন (Upcoming)"</strong> ট্যাবে চলে যাবে।
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRescheduleModalOpen(false);
                    setRescheduleApnt(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-700 to-blue-600 hover:from-indigo-800 hover:to-blue-700 text-white rounded-xl font-bold transition shadow-sm cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>রিশিডিউল নিশ্চিত করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

                {viewingApnt && !isReceptionistOrCashier && (
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

      {/* THERMAL TOKEN MODAL & PRINT PREVIEW */}
      <ThermalTokenModal
        isOpen={isTokenModalOpen}
        onClose={() => {
          setIsTokenModalOpen(false);
          setTokenModalApnt(null);
        }}
        appointment={tokenModalApnt}
        clinicSettings={clinicSettings}
      />
    </div>
  );
}
