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
  type MedicineItem,
  type Appointment, 
  type PaymentRecord, 
  type TreatmentSession, 
  type ClinicSettings 
} from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import { PrescriptionPrintSheet } from '@/components/prescription/PrescriptionPrintSheet';

export interface PatientWithStats extends Patient {
  totalVisits: number;
  lastVisitDate: string;
  nextFollowUpDate?: string;
  isFollowUp?: boolean;
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
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'NEW' | 'OLD' | 'FOLLOW_UP'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'visits' | 'due' | 'regNo'>('newest');

  // Selected Patient for Details & History Modal
  const [selectedPatient, setSelectedPatient] = useState<PatientWithStats | null>(null);
  const [patientDetailTab, setPatientDetailTab] = useState<'prescriptions' | 'appointments' | 'treatment' | 'billing' | 'medical'>('prescriptions');

  // Printable Prescription Modal State
  const [printableRx, setPrintableRx] = useState<Prescription | null>(null);
  const [printableRxPatient, setPrintableRxPatient] = useState<Patient | null>(null);

  // Follow-up (date-wise doctor suggestions & clinical entry) Modal State
  const [followUpPatient, setFollowUpPatient] = useState<PatientWithStats | null>(null);
  const [followUpTab, setFollowUpTab] = useState<'entry' | 'timeline' | 'schedule'>('entry');
  const [followUpForm, setFollowUpForm] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    doctorName: '',
    complaints: '',
    diagnosis: '',
    treatmentDone: 'RCT ২য় সিটিং ও ড্রেসিং পরিবর্তন',
    treatmentPlan: '',
    medicines: [
      { no: 1, brand: '', dose: '১+০+১', instruction: 'খাওয়ার পর', duration: '৫ দিন' }
    ] as MedicineItem[],
    advice: 'কুসুম গরম পানিতে লবণ দিয়ে কুলকুচি করবেন। শক্ত খাবার খাওয়া থেকে বিরত থাকুন।',
    nextVisitDate: '',
    nextVisitTime: '05:00 PM',
    notes: '',
  });
  const [isSavingFollowUp, setIsSavingFollowUp] = useState<boolean>(false);

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

  // Delete Confirmation Modal State
  const [patientToDelete, setPatientToDelete] = useState<PatientWithStats | null>(null);
  const [deleteCascadeHistory, setDeleteCascadeHistory] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const userRole = (user?.role || '').toLowerCase();
  const isReceptionistOrCashier = userRole.includes('receptionist') || userRole.includes('cashier');
  const isDoctorUser = userRole === 'doctor';
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin';

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
        const pSessions = sessions.filter((s) => s.regNo === p.regNo);
        const totalVisits = Math.max(pRxs.length, pApnts.length, p.totalVisits || 1);
        const totalDue = Math.max(0, (p.totalBilled || 0) - (p.totalPaid || 0));

        const latestRxWithNext = pRxs.find((r) => r.nextVisitDate && r.nextVisitDate.trim() !== '');
        const upcomingApnt = pApnts.find((a) => a.status === 'Scheduled' || a.status === 'Confirmed' || (a as any).type === 'Follow-up');
        const sessionWithNext = pSessions.find((s) => (s.nextDate && s.nextDate.trim() !== '') || s.followUpRequired);

        const nextFollowUpDate =
          latestRxWithNext?.nextVisitDate ||
          upcomingApnt?.date ||
          sessionWithNext?.nextDate ||
          '';

        const isFollowUp = Boolean(
          nextFollowUpDate ||
          (latestRxWithNext?.revisitText && latestRxWithNext.revisitText !== 'প্রয়োজন নেই') ||
          upcomingApnt ||
          sessionWithNext?.followUpRequired
        );

        return {
          ...p,
          totalVisits,
          prescriptionsCount: pRxs.length,
          appointmentsCount: pApnts.length,
          totalDue,
          nextFollowUpDate,
          isFollowUp,
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

        // Schedule filter (New Schedule / 1st Visit vs Old Schedule / Revisit vs Follow-up)
        if (scheduleFilter === 'NEW' && (p.totalVisits || 1) > 1) return false;
        if (scheduleFilter === 'OLD' && (p.totalVisits || 1) <= 1) return false;
        if (scheduleFilter === 'FOLLOW_UP' && !p.isFollowUp) return false;

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
  }, [patients, genderFilter, scheduleFilter, searchQuery, sortBy]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalCount = patients.length;
    const maleCount = patients.filter((p) => p.sex === 'M').length;
    const femaleCount = patients.filter((p) => p.sex === 'F').length;
    const newScheduleCount = patients.filter((p) => (p.totalVisits || 1) <= 1).length;
    const oldScheduleCount = patients.filter((p) => (p.totalVisits || 1) > 1).length;
    const followUpCount = patients.filter((p) => p.isFollowUp).length;
    const totalRx = patients.reduce((acc, p) => acc + (p.prescriptionsCount || 0), 0);
    const totalDue = patients.reduce((acc, p) => acc + (p.totalDue || 0), 0);
    return { totalCount, maleCount, femaleCount, newScheduleCount, oldScheduleCount, followUpCount, totalRx, totalDue };
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

        logActivity({
          action: 'UPDATE_PATIENT',
          module: 'Patient',
          description: `রোগীর তথ্য আপডেট করা হয়েছে: #${updated.regNo} (${updated.name})`,
          metadata: { regNo: updated.regNo, name: updated.name, mobile: updated.mobile },
          user: user || undefined,
        });

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

        logActivity({
          action: 'CREATE_PATIENT',
          module: 'Patient',
          description: `নতুন রোগী নিবন্ধন করা হয়েছে: #${newRegNo} (${newPatient.name})`,
          metadata: { regNo: newRegNo, name: newPatient.name, mobile: newPatient.mobile },
          user: user || undefined,
        });

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

  // Delete Patient Prompt / Open Modal
  const handleDeletePatient = (patient: PatientWithStats) => {
    if (isReceptionistOrCashier) {
      alert('রিসেপশনিস্ট / ক্যাশিয়ার রোল থেকে রোগীর রেকর্ড মুছে ফেলার অনুমতি নেই!');
      return;
    }
    setPatientToDelete(patient);
    setDeleteCascadeHistory(true);
  };

  // Perform Actual Delete
  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      const reg = Number(patientToDelete.regNo);
      const pId = patientToDelete.id;

      // 1. Delete from patients table
      if (pId) {
        await db.patients.delete(pId);
        await syncEngine.logMutation('patients', 'DELETE', pId, { id: pId });
      }
      if (reg) {
        const ptsWithReg = await db.patients.where('regNo').equals(reg).toArray();
        for (const p of ptsWithReg) {
          await db.patients.delete(p.id);
          await syncEngine.logMutation('patients', 'DELETE', p.id, { id: p.id });
        }
      }

      // 2. Cascade delete history if checked
      if (deleteCascadeHistory && reg) {
        // Prescriptions
        const rxs = await db.prescriptions.where('regNo').equals(reg).toArray();
        for (const rx of rxs) {
          await db.prescriptions.delete(rx.id);
          await syncEngine.logMutation('prescriptions', 'DELETE', rx.id, { id: rx.id });
        }

        // Appointments
        const apnts = await db.appointments.where('regNo').equals(reg).toArray();
        for (const ap of apnts) {
          await db.appointments.delete(ap.id);
          await syncEngine.logMutation('appointments', 'DELETE', ap.id, { id: ap.id });
        }

        // Payments
        const pmts = await db.payments.where('regNo').equals(reg).toArray();
        for (const pm of pmts) {
          await db.payments.delete(pm.id);
          await syncEngine.logMutation('payments', 'DELETE', pm.id, { id: pm.id });
        }

        // Treatment Sessions
        const sessions = await db.treatmentSessions.where('regNo').equals(reg).toArray();
        for (const s of sessions) {
          await db.treatmentSessions.delete(s.id);
          await syncEngine.logMutation('treatmentSessions' as any, 'DELETE', s.id, { id: s.id });
        }
      }

      logActivity({
        action: 'DELETE_PATIENT',
        module: 'Patient',
        description: `রোগীর ফাইল ও যাবতীয় রেকর্ড মুছে ফেলা হয়েছে: #${reg} (${patientToDelete.name})`,
        metadata: { regNo: reg, name: patientToDelete.name, cascade: deleteCascadeHistory },
        user: user || undefined,
      });

      // Trigger sync
      syncEngine.triggerSync().catch(console.warn);

      if (selectedPatient?.regNo === reg) {
        setSelectedPatient(null);
      }
      setPatientToDelete(null);
      await loadAllData();
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert('রোগী মুছতে সমস্যা হয়েছে!');
    } finally {
      setIsDeleting(false);
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

  // Open Follow-up Modal & Preload Form
  const handleOpenFollowUp = (pt: PatientWithStats, tab: 'entry' | 'timeline' | 'schedule' = 'entry') => {
    setFollowUpPatient(pt);
    setFollowUpTab(tab);

    const todayStr = new Date().toISOString().split('T')[0];
    const pRxs = allPrescriptions.filter((r) => r.regNo === pt.regNo);
    const latestRx = pRxs[0];
    const doctor = latestRx?.doctorName || clinicSettings?.doctor1?.name || user?.name || 'Dr. Ifrad';

    const nextD = new Date();
    nextD.setDate(nextD.getDate() + 7);
    const defNextDate = pt.nextFollowUpDate || nextD.toISOString().split('T')[0];

    // Pre-populate last medicines if available or fresh empty row
    const defaultMeds: MedicineItem[] = latestRx?.medicines && latestRx.medicines.length > 0
      ? latestRx.medicines.map((m, idx) => ({ ...m, no: idx + 1 }))
      : [{ no: 1, brand: '', dose: '১+০+১', instruction: 'খাওয়ার পর', duration: '৫ দিন' }];

    setFollowUpForm({
      visitDate: todayStr,
      doctorName: doctor,
      complaints: latestRx?.cc?.[0] || 'ফলো-আপ চেকআপ ও পরবর্তী সিটিং',
      diagnosis: latestRx?.dx?.[0] || '',
      treatmentDone: 'RCT ২য় সিটিং ও ড্রেসিং পরিবর্তন',
      treatmentPlan: latestRx?.treatmentPlan?.[0] || '',
      medicines: defaultMeds,
      advice: latestRx?.advice?.[0] || 'কুসুম গরম পানিতে লবণ দিয়ে কুলকুচি করবেন। শক্ত খাবার খাওয়া থেকে বিরত থাকুন।',
      nextVisitDate: defNextDate,
      nextVisitTime: latestRx?.timeSlot || '05:00 PM',
      notes: '',
    });
  };

  const handleAddMedicineRow = () => {
    setFollowUpForm((prev) => ({
      ...prev,
      medicines: [
        ...prev.medicines,
        { no: prev.medicines.length + 1, brand: '', dose: '১+০+১', instruction: 'খাওয়ার পর', duration: '৫ দিন' }
      ]
    }));
  };

  const handleRemoveMedicineRow = (index: number) => {
    setFollowUpForm((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index).map((m, i) => ({ ...m, no: i + 1 }))
    }));
  };

  const handleUpdateMedicineRow = (index: number, field: keyof MedicineItem, value: any) => {
    setFollowUpForm((prev) => {
      const updated = [...prev.medicines];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, medicines: updated };
    });
  };

  const handleAddPresetMedicine = (preset: { brand: string; dose: string; instruction: string; duration: string }) => {
    setFollowUpForm((prev) => {
      if (prev.medicines.length === 1 && !prev.medicines[0].brand.trim()) {
        return {
          ...prev,
          medicines: [{ no: 1, ...preset }]
        };
      }
      return {
        ...prev,
        medicines: [...prev.medicines, { no: prev.medicines.length + 1, ...preset }]
      };
    });
  };

  const handleSetQuickDate = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setFollowUpForm((prev) => ({ ...prev, nextVisitDate: d.toISOString().split('T')[0] }));
  };

  const handleSaveFollowUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!followUpPatient) return;
    if (!followUpForm.visitDate) {
      alert('অনুগ্রহ করে ফলো-আপ সম্পন্ন করার তারিখ নির্বাচন করুন!');
      return;
    }

    setIsSavingFollowUp(true);
    try {
      const pRxs = allPrescriptions.filter((r) => r.regNo === followUpPatient.regNo);
      const visitNo = pRxs.length + 1;
      const rxId = `rx_fu_${Date.now()}`;

      // Clean medicines
      const cleanMeds = (followUpForm.medicines || [])
        .filter((m) => m.brand && m.brand.trim() !== '')
        .map((m, i) => ({ ...m, no: i + 1 }));

      const newRx: Prescription = {
        id: rxId,
        regNo: followUpPatient.regNo,
        patientId: followUpPatient.id || `p_${followUpPatient.regNo}`,
        patientName: followUpPatient.name,
        age: followUpPatient.age || 'N/A',
        sex: followUpPatient.sex || 'M',
        mobile: followUpPatient.mobile || '',
        address: followUpPatient.address || '',
        occupation: followUpPatient.occupation || '',
        date: followUpForm.visitDate,
        visitNo: visitNo,
        cc: followUpForm.complaints ? [followUpForm.complaints.trim()] : ['ফলো-আপ ভিজিট'],
        ho: {},
        hoCustomText: '',
        oe: [],
        ix: [],
        dd: [],
        dx: followUpForm.diagnosis ? [followUpForm.diagnosis.trim()] : [],
        treatmentPlan: followUpForm.treatmentPlan ? [followUpForm.treatmentPlan.trim()] : [],
        treatmentDone: followUpForm.treatmentDone ? [followUpForm.treatmentDone.trim()] : ['ফলো-আপ চিকিৎসা সম্পন্ন'],
        specialNote: followUpForm.notes ? [followUpForm.notes.trim()] : [],
        drugHistory: [],
        medicines: cleanMeds,
        advice: followUpForm.advice ? [followUpForm.advice.trim()] : [],
        nextVisitDate: followUpForm.nextVisitDate || '',
        revisitText: followUpForm.nextVisitDate ? 'প্রয়োজন আছে' : 'প্রয়োজন নেই',
        timeSlot: followUpForm.nextVisitTime || '05:00 PM',
        doctorName: followUpForm.doctorName || clinicSettings?.doctor1?.name || 'Dr. Ifrad',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Save prescription in Dexie and sync
      await db.prescriptions.put(newRx);
      await syncEngine.logMutation('prescriptions', 'INSERT', newRx.id, newRx);

      // 2. If next follow-up date is provided, create/update scheduled appointment
      if (followUpForm.nextVisitDate && followUpForm.nextVisitDate.trim()) {
        const apntId = `apnt_${Date.now()}`;
        const newAppointment: Appointment = {
          id: apntId,
          regNo: followUpPatient.regNo,
          name: followUpPatient.name,
          age: followUpPatient.age || '',
          sex: followUpPatient.sex || 'M',
          mobile: followUpPatient.mobile || '',
          address: followUpPatient.address || '',
          problem: `পরবর্তী ফলো-আপ: ${followUpForm.treatmentDone || 'চেকআপ'}`,
          doctorName: followUpForm.doctorName || clinicSettings?.doctor1?.name || 'Doctor',
          date: followUpForm.nextVisitDate,
          time: followUpForm.nextVisitTime || '05:00 PM',
          paid: 0,
          visitFee: 0,
          status: 'Scheduled',
          serial: 1,
          apntNo: `AP-${followUpPatient.regNo}-${Date.now().toString().slice(-4)}`,
          createdAt: new Date().toISOString(),
          prescriptionId: newRx.id,
        };
        await db.appointments.put(newAppointment);
        await syncEngine.logMutation('appointments', 'INSERT', newAppointment.id, newAppointment);
      }

      logActivity({
        action: 'SCHEDULE_FOLLOW_UP',
        module: 'Appointment',
        description: `ফলো-আপ ও চিকিৎসার বিবরণ যুক্ত করা হয়েছে: #${followUpPatient.regNo} (${followUpPatient.name}) - তারিখ: ${followUpForm.visitDate} | ডাক্তার: ${followUpForm.doctorName}`,
        metadata: {
          regNo: followUpPatient.regNo,
          name: followUpPatient.name,
          date: followUpForm.visitDate,
          doctorName: followUpForm.doctorName,
          treatmentDone: followUpForm.treatmentDone,
          medicinesCount: cleanMeds.length,
          nextVisitDate: followUpForm.nextVisitDate,
        },
        user: user || undefined,
      });

      syncEngine.triggerSync().catch(console.warn);
      await loadAllData();
      alert(`রোগী #${followUpPatient.regNo} (${followUpPatient.name}) এর ফলো-আপ ও চিকিৎসার বিবরণ সফলভাবে সংরক্ষিত হয়েছে!\nতারিখ: ${followUpForm.visitDate}\nচিকিৎসা: ${followUpForm.treatmentDone || 'ফলো-আপ'}\nওষুধ: ${cleanMeds.length} টি`);
      setFollowUpTab('timeline');
    } catch (err) {
      console.error('Error saving follow-up:', err);
      alert('ফলো-আপ বিবরণ সংরক্ষণে সমস্যা হয়েছে!');
    } finally {
      setIsSavingFollowUp(false);
    }
  };

  const handleCancelFollowUpApnt = async (apnt: Appointment) => {
    if (!window.confirm('আপনি কি এই ফলো-আপ শিডিউলটি বাতিল করতে চান?')) return;
    try {
      const updated = { ...apnt, status: 'Cancelled' as const };
      await db.appointments.put(updated);
      await syncEngine.logMutation('appointments', 'UPDATE', updated.id, updated);
      syncEngine.triggerSync().catch(console.warn);
      await loadAllData();
    } catch (err) {
      console.error('Error cancelling follow-up:', err);
    }
  };

  const handleCompleteFollowUpApnt = async (apnt: Appointment) => {
    try {
      const updated = { ...apnt, status: 'Completed' as const };
      await db.appointments.put(updated);
      await syncEngine.logMutation('appointments', 'UPDATE', updated.id, updated);
      syncEngine.triggerSync().catch(console.warn);
      await loadAllData();
    } catch (err) {
      console.error('Error completing follow-up:', err);
    }
  };

  return (
    <>
      <div className={`p-3 sm:p-5 max-w-[1700px] mx-auto text-slate-800 space-y-4 ${printableRx ? 'no-print' : ''}`}>
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

        {/* Gender & Schedule Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => {
              setGenderFilter('ALL');
              setScheduleFilter('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              genderFilter === 'ALL' && scheduleFilter === 'ALL'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            সব ({patients.length})
          </button>
          <button
            onClick={() => setGenderFilter((prev) => (prev === 'M' ? 'ALL' : 'M'))}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center space-x-1 ${
              genderFilter === 'M'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>পুরুষ</span>
            <span className="text-[11px] font-mono opacity-80">({metrics.maleCount})</span>
          </button>
          <button
            onClick={() => setGenderFilter((prev) => (prev === 'F' ? 'ALL' : 'F'))}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center space-x-1 ${
              genderFilter === 'F'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>মহিলা</span>
            <span className="text-[11px] font-mono opacity-80">({metrics.femaleCount})</span>
          </button>

          <span className="w-[1px] h-4 bg-slate-300 mx-0.5"></span>

          <button
            onClick={() => setScheduleFilter((prev) => (prev === 'NEW' ? 'ALL' : 'NEW'))}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center space-x-1 ${
              scheduleFilter === 'NEW'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
            }`}
            title="নতুন রোগী / ১ম শিডিউল"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>নতুন শিডিউল</span>
            <span className="text-[11px] font-mono opacity-90">({metrics.newScheduleCount})</span>
          </button>
          <button
            onClick={() => setScheduleFilter((prev) => (prev === 'OLD' ? 'ALL' : 'OLD'))}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center space-x-1 ${
              scheduleFilter === 'OLD'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50'
            }`}
            title="পুরাতন রোগী / রি-ভিজিট শিডিউল"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>পুরাতন শিডিউল</span>
            <span className="text-[11px] font-mono opacity-90">({metrics.oldScheduleCount})</span>
          </button>
          <button
            onClick={() => setScheduleFilter((prev) => (prev === 'FOLLOW_UP' ? 'ALL' : 'FOLLOW_UP'))}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center space-x-1 ${
              scheduleFilter === 'FOLLOW_UP'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
            }`}
            title="ফলো-আপ শিডিউল / পরবর্তী সাক্ষাতের শিডিউলকৃত রোগী"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>ফলো-আপ শিডিউল</span>
            <span className="text-[11px] font-mono opacity-90">({metrics.followUpCount})</span>
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
                <th className="p-3.5 min-w-[300px] text-center whitespace-nowrap">অ্যাকশন ও ইতিহাস</th>
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
                        <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-full font-bold text-xs">
                          {pt.totalVisits} বার
                        </span>
                        {pt.totalVisits <= 1 ? (
                          <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-1.5 py-0.2 rounded mt-0.5 flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                            নতুন শিডিউল
                          </span>
                        ) : (
                          <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-1.5 py-0.2 rounded mt-0.5 flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                            পুরাতন শিডিউল
                          </span>
                        )}
                        {pt.isFollowUp && (
                          <span className="text-[9px] bg-purple-50 border border-purple-200 text-purple-700 font-bold px-1.5 py-0.2 rounded mt-0.5 flex items-center gap-0.5" title={`পরবর্তী ফলো-আপ: ${pt.nextFollowUpDate || 'শিডিউলড'}`}>
                            <CalendarCheck className="w-2.5 h-2.5 text-purple-600" />
                            ফলো-আপ
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400 mt-0.5">
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
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5 flex-nowrap whitespace-nowrap">
                        {/* Details & History Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(pt)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg font-bold text-xs transition inline-flex items-center space-x-1 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                          title="রোগীর বিস্তারিত ইতিহাস ও প্রেসক্রিপশন দেখুন"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="whitespace-nowrap">ইতিহাস</span>
                        </button>

                        {/* Follow-up View: schedule & date-wise doctor suggestions */}
                        <button
                          type="button"
                          onClick={() => handleOpenFollowUp(pt, 'entry')}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition inline-flex items-center space-x-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0 ${
                            pt.isFollowUp
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border border-purple-600 shadow-purple-200 ring-2 ring-purple-300'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 hover:border-purple-400'
                          }`}
                          title={pt.isFollowUp ? `ফলো-আপ নির্ধারিত: ${pt.nextFollowUpDate || 'শিডিউলড'} (ক্লিক করে বিস্তারিত দেখুন বা নতুন চিকিৎসা এন্ট্রি করুন)` : "নতুন ফলো-আপ শিডিউল নির্ধারণ বা ডাক্তারের পরামর্শ ও ওষুধ এন্ট্রি দেখুন"}
                        >
                          <CalendarCheck className={`w-3.5 h-3.5 shrink-0 ${pt.isFollowUp ? 'text-white' : 'text-purple-600'}`} />
                          <span className="whitespace-nowrap font-bold">ফলোআপ ভিউ</span>
                        </button>

                        {/* Make Prescription Link (Doctor & Admin only) */}
                        {!isReceptionistOrCashier && (
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
                        )}

                        {/* Edit Info */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(pt)}
                          className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          title="রোগীর তথ্য সংশোধন করুন"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Patient (Admin & Doctor only, hidden for Receptionist / Cashier) */}
                        {!isReceptionistOrCashier && (
                          <button
                            type="button"
                            onClick={() => handleDeletePatient(pt)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="রোগীর রেকর্ড মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
          FOLLOW-UP MODAL: CLINICAL ENTRY, MEDICINES, AND DATE-WISE DOCTOR SUGGESTIONS
          ========================================================================= */}
      {followUpPatient && (() => {
        const visits = allPrescriptions
          .filter((r) => r.regNo === followUpPatient.regNo)
          .sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
        const patientApnts = allAppointments
          .filter((a) => a.regNo === followUpPatient.regNo)
          .sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
        const activeApnts = patientApnts.filter((a) => a.status === 'Scheduled' || a.status === 'Waiting');
        
        const clean = (arr?: string[]) => (arr || []).map((s) => (s || '').trim()).filter(Boolean);
        const sections: { label: string; key: 'cc' | 'dx' | 'treatmentPlan' | 'treatmentDone' | 'specialNote' | 'advice' }[] = [
          { label: 'C/C (প্রধান সমস্যা)', key: 'cc' },
          { label: 'DX (রোগ নির্ণয়)', key: 'dx' },
          { label: 'Treatment Plan (চিকিৎসা পরিকল্পনা)', key: 'treatmentPlan' },
          { label: 'Treatment Done (সম্পাদিত কাজ)', key: 'treatmentDone' },
          { label: 'Special Note (বিশেষ নোট)', key: 'specialNote' },
          { label: 'উপদেশ (Advice)', key: 'advice' },
        ];

        const quickProcedures = [
          'RCT ২য় সিটিং ও ড্রেসিং পরিবর্তন',
          'RCT ৩য় সিটিং ও অবচুরেশন সম্পন্ন',
          'ক্রাউন / ক্যাপ ট্রায়াল সম্পন্ন',
          'স্থায়ী ক্যাপ সিমেন্টেশন ও ফিটিং',
          'সেলাই কাটা ও অ্যান্টিসেপটিক ওয়াশ',
          'ড্রেসিং পরিবর্তন ও মেডিসিন প্লেসমেন্ট',
          'লাইট কিউর ফিলিং ও পলিশিং',
          'আল্ট্রাসনিক স্কেলিং ও রুট প্ল্যানিং',
          'দাঁত তোলার পর পোস্ট-অপ চেক ও কেয়ার',
          'অর্থোডন্টিক তার অ্যাডজাস্টমেন্ট ও টাইট',
          'ইমপ্ল্যান্ট হিলিং ক্যাপ চেকিং',
          'জেনারেল ডেন্টাল চেকআপ ও কাউন্সেলিং',
        ];

        const commonDentalMeds = [
          { brand: 'Tab. Napa Extra 500+65mg', dose: '১+০+১', instruction: 'খাওয়ার পর', duration: '৩ দিন' },
          { brand: 'Tab. Maxpro 20mg', dose: '১+০+১', instruction: 'খাবারের ২০ মিনিট আগে', duration: '৭ দিন' },
          { brand: 'Tab. Flamyd 400mg', dose: '১+০+১', instruction: 'খাওয়ার পর', duration: '৫ দিন' },
          { brand: 'Cap. Moxacil 500mg', dose: '১+১+১', instruction: 'খাওয়ার পর', duration: '৫ দিন' },
          { brand: 'Tab. Ciprocin 500mg', dose: '১+০+১', instruction: 'খাওয়ার পর', duration: '৫ দিন' },
          { brand: 'Tab. Rolac 10mg', dose: '১+০+১', instruction: 'ব্যথা হলে ভরা পেটে', duration: '৩ দিন' },
          { brand: 'Clohex Mouthwash 0.2%', dose: '১০ মিলি দিনে ২ বার', instruction: 'খাওয়ার পর কুলকুচি', duration: '৭ দিন' },
          { brand: 'Tab. Fixim 200mg', dose: '১+০+১', instruction: 'খাওয়ার পর', duration: '৭ দিন' },
        ];

        const quickAdvices = [
          'কুসুম গরম পানিতে লবণ দিয়ে দিনে ৩-৪ বার কুলকুচি করবেন।',
          'চিকিৎসাকৃত দাঁতের দিকে শক্ত বা আঠালো খাবার চিবাবেন না।',
          'নরম ও স্বাভাবিক তাপমাত্রার খাবার গ্রহণ করুন।',
          'ধূমপান ও পান-জর্দা খাওয়া সম্পূর্ণরূপে পরিহার করুন।',
          'নিয়মিত দিনে দুইবার নরম ব্রাশ দিয়ে আলতোভাবে দাঁত পরিষ্কার করবেন।',
        ];

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                    <CalendarCheck className="w-5 h-5 text-purple-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-white">
                        ফলো-আপ ও ডাক্তারের পরামর্শ ব্যবস্থাপনা
                      </h3>
                      <span className="px-2 py-0.5 bg-yellow-400 text-slate-900 font-mono font-black text-xs rounded-md">
                        Reg #{followUpPatient.regNo}
                      </span>
                    </div>
                    <p className="text-xs text-purple-100 flex items-center gap-2 mt-0.5">
                      <span className="font-bold text-white">{followUpPatient.name}</span>
                      <span>•</span>
                      <span>{followUpPatient.mobile || 'মোবাইল নেই'}</span>
                      <span>•</span>
                      <span>{followUpPatient.age || 'বয়স N/A'} ({followUpPatient.sex === 'F' ? 'নারী' : 'পুরুষ'})</span>
                      <span>•</span>
                      <span className="bg-purple-950/60 px-2 py-0.5 rounded text-[11px] text-purple-200 border border-purple-500/30">
                        মোট পূর্ববর্তী ভিজিট: {visits.length} টি
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFollowUpPatient(null)}
                  className="p-2 hover:bg-white/20 rounded-xl text-purple-200 hover:text-white transition cursor-pointer"
                  title="বন্ধ করুন"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Tab Navigation */}
              <div className="flex items-center border-b border-slate-200 bg-slate-100/90 px-4 pt-2 shrink-0 gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFollowUpTab('entry')}
                  className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition flex items-center gap-2 cursor-pointer border-t-2 whitespace-nowrap ${
                    followUpTab === 'entry'
                      ? 'bg-white text-purple-700 border-purple-600 shadow-xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Edit3 className="w-4 h-4 text-purple-600" />
                  <span>ফলো-আপে কি কি হলো ও ওষুধ এন্ট্রি করুন (Log Details)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFollowUpTab('timeline')}
                  className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition flex items-center gap-2 cursor-pointer border-t-2 whitespace-nowrap ${
                    followUpTab === 'timeline'
                      ? 'bg-white text-purple-700 border-purple-600 shadow-xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>তারিখ অনুযায়ী ডাক্তারের পরামর্শ ও ইতিহাস ({visits.length})</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
                {followUpTab === 'entry' ? (
                  <form onSubmit={handleSaveFollowUp} className="space-y-5 max-w-4xl mx-auto">
                    {/* Active Follow-up Appointments notice if any */}
                    {activeApnts.length > 0 && (
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                          <div className="text-xs text-purple-950">
                            <span className="font-bold">শিডিউলড ফলো-আপ:</span>{' '}
                            <span>{activeApnts[0].date} ({activeApnts[0].time})</span> — {activeApnts[0].problem}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleCompleteFollowUpApnt(activeApnts[0])}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>সম্পন্ন চিহ্নিত করুন</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelFollowUpApnt(activeApnts[0])}
                            className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>বাতিল</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Section 1: Follow-up Date & Doctor */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span>১. ফলো-আপের তারিখ ও ডাক্তার নির্বাচন (Follow-Up Date & Doctor)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            কত তারিখে ফলো-আপ হয়েছে (Follow-Up Date) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={followUpForm.visitDate}
                            onChange={(e) => setFollowUpForm((prev) => ({ ...prev, visitDate: e.target.value }))}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 bg-purple-50/40 focus:bg-white focus:outline-none focus:border-purple-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            উপস্থিত ডাক্তার (Attending Doctor)
                          </label>
                          <input
                            type="text"
                            value={followUpForm.doctorName}
                            onChange={(e) => setFollowUpForm((prev) => ({ ...prev, doctorName: e.target.value }))}
                            placeholder="ডাক্তারের নাম..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Complaints & Treatment Performed */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Stethoscope className="w-4 h-4 text-purple-600" />
                        <span>২. কি কি সমস্যা ও কি চিকিৎসা করা হলো (Diagnosis & Treatment Done)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            রোগীর বর্তমান সমস্যা / অবস্থা (C/C)
                          </label>
                          <input
                            type="text"
                            value={followUpForm.complaints}
                            onChange={(e) => setFollowUpForm((prev) => ({ ...prev, complaints: e.target.value }))}
                            placeholder="যেমন: ফলো-আপ চেকআপ, ব্যথা কমেছে..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            রোগ নির্ণয় (Diagnosis / DX)
                          </label>
                          <input
                            type="text"
                            value={followUpForm.diagnosis}
                            onChange={(e) => setFollowUpForm((prev) => ({ ...prev, diagnosis: e.target.value }))}
                            placeholder="যেমন: Pulpitis (Under RCT), Post Crown..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600 font-medium"
                          />
                        </div>
                      </div>

                      {/* Treatment Done */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          কি কি চিকিৎসা করা হলো (Treatment Performed / Done) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={followUpForm.treatmentDone}
                          onChange={(e) => setFollowUpForm((prev) => ({ ...prev, treatmentDone: e.target.value }))}
                          placeholder="যেমন: RCT ২য় সিটিং ও ড্রেসিং পরিবর্তন, ক্রাউন ট্রায়াল সম্পন্ন..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-purple-50/30 focus:bg-white focus:outline-none focus:border-purple-600"
                        />
                        {/* Procedure Chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {quickProcedures.map((proc) => (
                            <button
                              key={proc}
                              type="button"
                              onClick={() => setFollowUpForm((prev) => ({ ...prev, treatmentDone: proc }))}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                followUpForm.treatmentDone === proc
                                  ? 'bg-purple-700 text-white border-purple-700 font-bold shadow-2xs'
                                  : 'bg-purple-50/60 hover:bg-purple-100 text-purple-900 border-purple-200'
                              }`}
                            >
                              + {proc}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Prescribed Medicines (A to Z) */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          <Pill className="w-4 h-4 text-purple-600" />
                          <span>৩. কি কি ওষুধ দেওয়া হলো (Prescribed Medicines - A to Z)</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddMedicineRow}
                          className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ নতুন ওষুধ যোগ করুন</span>
                        </button>
                      </div>

                      {/* Quick Dental Medicine Presets */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                          কুইক ডেন্টাল মেডিসিন চিপস (ক্লিক করে সরাসরি যোগ করুন):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {commonDentalMeds.map((med, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAddPresetMedicine(med)}
                              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-purple-100 hover:text-purple-900 text-slate-800 border border-slate-200 hover:border-purple-300 rounded-lg transition cursor-pointer font-medium"
                              title={`${med.brand} (${med.dose} - ${med.instruction} - ${med.duration})`}
                            >
                              + {med.brand}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic Medicine Rows */}
                      <div className="space-y-2 mt-2">
                        {followUpForm.medicines.map((med, index) => (
                          <div
                            key={index}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col md:flex-row items-stretch md:items-center gap-2 text-xs"
                          >
                            <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                              {index + 1}
                            </span>

                            {/* Brand Name */}
                            <div className="flex-1 min-w-[200px]">
                              <input
                                type="text"
                                value={med.brand}
                                onChange={(e) => handleUpdateMedicineRow(index, 'brand', e.target.value)}
                                placeholder="ওষুধের নাম (যেমন: Tab. Napa Extra)..."
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-purple-600 font-bold text-slate-900"
                              />
                            </div>

                            {/* Dose */}
                            <div className="w-full md:w-32">
                              <input
                                type="text"
                                value={med.dose}
                                onChange={(e) => handleUpdateMedicineRow(index, 'dose', e.target.value)}
                                placeholder="ডোজ (১+০+১)"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-purple-600 font-mono text-purple-700 font-bold"
                              />
                            </div>

                            {/* Instruction */}
                            <div className="w-full md:w-44">
                              <input
                                type="text"
                                value={med.instruction}
                                onChange={(e) => handleUpdateMedicineRow(index, 'instruction', e.target.value)}
                                placeholder="নির্দেশনা (খাওয়ার পর)"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-purple-600 font-medium text-slate-700"
                              />
                            </div>

                            {/* Duration */}
                            <div className="w-full md:w-28">
                              <input
                                type="text"
                                value={med.duration}
                                onChange={(e) => handleUpdateMedicineRow(index, 'duration', e.target.value)}
                                placeholder="মেয়াদ (৫ দিন)"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-purple-600 font-medium text-slate-700"
                              />
                            </div>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveMedicineRow(index)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition self-end md:self-center cursor-pointer"
                              title="ওষুধটি মুছুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 4: Advice & Next Visit Schedule */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Heart className="w-4 h-4 text-purple-600" />
                        <span>৪. ডাক্তারের পরামর্শ ও পরবর্তী সাক্ষাতের তারিখ (Advice & Next Follow-Up)</span>
                      </div>

                      {/* Advice */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ডাক্তারের পরামর্শ ও উপদেশ (Doctor's Advice)
                        </label>
                        <textarea
                          rows={2}
                          value={followUpForm.advice}
                          onChange={(e) => setFollowUpForm((prev) => ({ ...prev, advice: e.target.value }))}
                          placeholder="রোগীর করণীয় পরামর্শ..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600 font-medium"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {quickAdvices.map((adv, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setFollowUpForm((prev) => ({ ...prev, advice: adv }))}
                              className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-purple-100 text-slate-700 border border-slate-200 rounded-md transition cursor-pointer"
                            >
                              + {adv}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Next Visit Date & Time */}
                      <div className="pt-2 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          পরবর্তী ফলো-আপের তারিখ (Next Follow-Up / Revisit Date)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="date"
                            value={followUpForm.nextVisitDate}
                            onChange={(e) => setFollowUpForm((prev) => ({ ...prev, nextVisitDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 bg-purple-50/40 focus:bg-white focus:outline-none focus:border-purple-600"
                          />
                          <input
                            type="text"
                            value={followUpForm.nextVisitTime}
                            onChange={(e) => setFollowUpForm((prev) => ({ ...prev, nextVisitTime: e.target.value }))}
                            placeholder="সময় (যেমন: 05:00 PM)"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600 font-medium"
                          />
                        </div>

                        {/* Quick Date Chips */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[11px] font-semibold text-slate-500 mr-1">কুইক ডেট:</span>
                          {[
                            { label: '৩ দিন পর', days: 3 },
                            { label: '৭ দিন পর', days: 7 },
                            { label: '১০ দিন পর', days: 10 },
                            { label: '১৫ দিন পর', days: 15 },
                            { label: '১ মাস পর', days: 30 },
                          ].map((chip) => (
                            <button
                              key={chip.days}
                              type="button"
                              onClick={() => handleSetQuickDate(chip.days)}
                              className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-purple-100 hover:text-purple-800 text-slate-700 border border-slate-200 hover:border-purple-300 rounded-lg transition cursor-pointer"
                            >
                              {chip.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setFollowUpForm((prev) => ({ ...prev, nextVisitDate: '' }))}
                            className="px-2.5 py-1 text-[11px] font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition cursor-pointer"
                          >
                            প্রয়োজন নেই
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Footer Submit Buttons */}
                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 bg-slate-50 py-2">
                      <div className="flex items-center gap-2">
                        {!isReceptionistOrCashier && (
                          <Link
                            href={`/prescription?regNo=${followUpPatient.regNo}&name=${encodeURIComponent(
                              followUpPatient.name
                            )}&age=${encodeURIComponent(followUpPatient.age || '')}&sex=${
                              followUpPatient.sex || 'M'
                            }&mobile=${encodeURIComponent(followUpPatient.mobile || '')}`}
                            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
                          >
                            <FileText className="w-4 h-4 text-emerald-600" />
                            <span>প্রেসক্রিপশন এডিটরে যান</span>
                          </Link>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFollowUpPatient(null)}
                          className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                        >
                          বন্ধ করুন
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingFollowUp}
                          className="px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl font-bold text-xs transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <CalendarCheck className="w-4 h-4" />
                          <span>{isSavingFollowUp ? 'সংরক্ষণ হচ্ছে...' : '💾 ফলো-আপ ও চিকিৎসার বিবরণ সংরক্ষণ করুন'}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  /* Timeline Tab: Date-wise Doctor Suggestions */
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {visits.length === 0 ? (
                      <div className="text-center bg-white border border-slate-200 rounded-2xl p-10 shadow-xs">
                        <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center mx-auto mb-3">
                          <FileText className="w-7 h-7 text-purple-600" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-base mb-1">
                          কোনো পূর্ববর্তী প্রেসক্রিপশন বা ডাক্তারের পরামর্শ পাওয়া যায়নি
                        </h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                          উপরে &quot;ফলো-আপে কি কি হলো ও ওষুধ এন্ট্রি করুন&quot; ট্যাবে গিয়ে নতুন বিবরণ যুক্ত করুন।
                        </p>
                        <button
                          type="button"
                          onClick={() => setFollowUpTab('entry')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>নতুন ফলো-আপ বিবরণ যুক্ত করুন</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between bg-purple-50/80 border border-purple-200 rounded-xl px-4 py-2.5 text-xs text-purple-950 font-bold">
                          <span>
                            তারিখ অনুযায়ী রোগীর সকল চিকিৎসা, ডাক্তারের পরামর্শ ও ওষুধের তালিকা (মোট {visits.length} টি ভিজিট)
                          </span>
                          <button
                            type="button"
                            onClick={() => setFollowUpTab('entry')}
                            className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ নতুন ফলো-আপ যোগ করুন</span>
                          </button>
                        </div>

                        <ol className="relative border-l-2 border-purple-300 ml-3 space-y-6">
                          {visits.map((rx, idx) => {
                            const meds = (rx.medicines || []).filter((m) => (m.brand || '').trim());
                            return (
                              <li key={rx.id || idx} className="ml-5 relative">
                                <span className="absolute -left-[27px] top-2 w-3.5 h-3.5 rounded-full bg-purple-600 border-2 border-white ring-2 ring-purple-200" />
                                
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-purple-200 transition">
                                  {/* Visit Card Header */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                      <span className="px-2.5 py-1 bg-purple-100 text-purple-800 font-black text-xs rounded-lg border border-purple-200">
                                        ভিজিট #{rx.visitNo || visits.length - idx}
                                      </span>
                                      <span className="font-bold text-slate-900 text-sm">
                                        📅 {rx.date || (rx.createdAt || '').split('T')[0]}
                                      </span>
                                      {rx.timeSlot && (
                                        <span className="text-xs text-slate-500 font-mono">
                                          ({rx.timeSlot})
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {rx.doctorName && (
                                        <span className="text-xs text-slate-700 font-medium bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                                          <Stethoscope className="w-3.5 h-3.5 text-purple-600" />
                                          {rx.doctorName}
                                        </span>
                                      )}
                                      {rx.nextVisitDate && (
                                        <span className="text-xs text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                                          <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
                                          পরবর্তী ফলো-আপ: {rx.nextVisitDate}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenPrintRx(rx, followUpPatient)}
                                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                        title="প্রেসক্রিপশন প্রিন্ট বা প্রিভিউ দেখুন"
                                      >
                                        <Printer className="w-3 h-3 text-blue-600" />
                                        <span>প্রিন্ট</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Clinical Findings Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    {sections.map(({ label, key }) => {
                                      const items = clean(rx[key] as string[]);
                                      if (!items.length) return null;
                                      return (
                                        <div key={key} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                                          <span className="block font-bold text-slate-700 mb-1">{label}:</span>
                                          <ul className="list-disc list-inside space-y-0.5 text-slate-900 font-medium">
                                            {items.map((item, itemIdx) => (
                                              <li key={itemIdx}>{item}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Prescribed Medicines (Rx) */}
                                  {meds.length > 0 && (
                                    <div className="mt-3 bg-purple-50/40 p-3 rounded-xl border border-purple-100 text-xs">
                                      <span className="font-bold text-purple-900 flex items-center gap-1.5 mb-2">
                                        <Pill className="w-3.5 h-3.5 text-purple-600" />
                                        প্রেসক্রিপশনের ওষুধ (Prescribed Medicines):
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {meds.map((m, mi) => (
                                          <div
                                            key={mi}
                                            className="bg-white p-2.5 rounded-lg border border-purple-200/60 shadow-2xs text-xs"
                                          >
                                            <div className="font-bold text-slate-900">{m.brand}</div>
                                            <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap gap-x-2">
                                              {m.dose && <span className="font-mono text-purple-700 font-semibold">{m.dose}</span>}
                                              {m.instruction && <span>{m.instruction}</span>}
                                              {m.duration && <span className="text-slate-500 font-mono">({m.duration})</span>}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
                {!isReceptionistOrCashier && (
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
                )}

                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedPatient)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
                  title="প্রোফাইল এডিট"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {!isReceptionistOrCashier && (
                  <button
                    type="button"
                    onClick={() => handleDeletePatient(selectedPatient)}
                    className="p-2 text-rose-300 hover:text-white hover:bg-rose-600/30 rounded-xl transition"
                    title="রোগীর সম্পূর্ণ রেকর্ড মুছুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

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

      </div>

      {/* =========================================================================
          6. PRINTABLE PRESCRIPTION MODAL (HIGH RESOLUTION FOR PRINT & SAVE PDF)
          ========================================================================= */}
      {printableRx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto print-modal-overlay">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print-modal-container">
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
            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 flex justify-center">
              <PrescriptionPrintSheet
                prescription={{
                  ...printableRx,
                  address: printableRx.address || printableRxPatient?.address || '',
                  occupation: printableRxPatient?.occupation || '',
                  mobile: printableRx.mobile || printableRxPatient?.mobile || '',
                }}
                clinicSettings={clinicSettings}
                printMode="full"
              />
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

      {/* =========================================================================
          6. DELETE PATIENT CONFIRMATION MODAL
          ========================================================================= */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">রোগীর রেকর্ড মুছুন</h3>
                  <p className="text-[11px] text-red-100">Delete Patient Record</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPatientToDelete(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                <div className="flex items-center space-x-2 text-rose-900 font-bold text-sm mb-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>আপনি কি নিশ্চিত?</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  রোগী <strong className="text-slate-900 font-bold font-sans">"{patientToDelete.name}"</strong> (Reg #{patientToDelete.regNo})-এর ডাটা মুছে ফেলতে যাচ্ছেন।
                </p>
              </div>

              {/* Patient Info Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 font-medium text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">নাম:</span>
                  <span className="font-bold text-slate-900">{patientToDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">রেজিস্ট্রেশন নং:</span>
                  <span className="font-bold text-blue-900 font-mono">#{patientToDelete.regNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">মোবাইল:</span>
                  <span className="font-bold text-slate-800 font-mono">{patientToDelete.mobile || 'নেই'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">মোট প্রেসক্রিপশন:</span>
                  <span className="font-bold text-slate-800">{patientToDelete.prescriptionsCount || 0} টি</span>
                </div>
                {patientToDelete.totalDue > 0 && (
                  <div className="flex justify-between pt-1 border-t border-slate-200 text-rose-700 font-bold">
                    <span>বকেয়া (Due):</span>
                    <span className="font-mono">৳ {patientToDelete.totalDue}</span>
                  </div>
                )}
              </div>

              {/* Cascade Delete Checkbox */}
              <label className="flex items-start space-x-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteCascadeHistory}
                  onChange={(e) => setDeleteCascadeHistory(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-[11px] text-amber-900 font-semibold leading-snug">
                  এই রোগীর সাথে সম্পর্কিত সকল <strong>প্রেসক্রিপশন, অ্যাপয়েন্টমেন্ট, পেমেন্ট ও ট্রিটমেন্ট হিস্ট্রি</strong> একসাথে সম্পূর্ণ মুছে ফেলুন।
                </span>
              </label>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setPatientToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl transition shadow-sm flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
