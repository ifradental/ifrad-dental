'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Printer, 
  Save, 
  Eye, 
  FileCheck, 
  Search, 
  RotateCcw,
  Sparkles,
  ChevronDown,
  X,
  ShieldAlert,
  Info,
  Calendar,
  DollarSign,
  User,
  Clock,
  Phone,
  MapPin,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Trash2,
  Edit3,
  ChevronRight,
  Activity,
  Stethoscope,
  FileText,
  Check,
  ShieldCheck,
  CreditCard,
  Layers,
  ChevronLeft
} from 'lucide-react';
import { db, type Patient, type Prescription, type Drug, type TemplateItem, type PaymentRecord, type TreatmentSession } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { convertEnglishToBanglaDigits, convertPhoneticToBangla } from '@/lib/banglaPhonetic';
import { checkMedXDrugInteractions } from '@/lib/medxDrugs';

interface PrescriptionEditorProps {
  initialRegNo?: number;
  initialPrescriptionId?: string;
  initialName?: string;
  initialAge?: string;
  initialSex?: string;
  initialMobile?: string;
  initialProblem?: string;
  initialDoctorName?: string;
  initialAppointmentId?: string;
  onSaved?: (prescriptionId: string) => void;
}

export interface ToothQuadrant {
  ur: string;
  ul: string;
  lr: string;
  ll: string;
}

export const defaultQuadrant = (): ToothQuadrant => ({ ur: '', ul: '', lr: '', ll: '' });

export const countQuadrantTeeth = (quad: ToothQuadrant): number => {
  if (!quad) return 0;
  const countInStr = (str: string): number => {
    if (!str) return 0;
    let count = 0;
    for (let i = 1; i <= 8; i++) {
      if (new RegExp(`(^|[^0-9])${i}([^0-9]|$)`).test(str) || str.includes(i.toString())) {
        count++;
      }
    }
    return count;
  };
  return countInStr(quad.ur) + countInStr(quad.ul) + countInStr(quad.lr) + countInStr(quad.ll);
};

export function PrescriptionEditor({
  initialRegNo,
  initialPrescriptionId,
  initialName,
  initialAge,
  initialSex,
  initialMobile,
  initialProblem,
  initialDoctorName,
  initialAppointmentId,
  onSaved,
}: PrescriptionEditorProps) {
  // Patient Details
  const [regNo, setRegNo] = useState<number>(4201);
  const [patientName, setPatientName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [sex, setSex] = useState<string>('M');
  const [mobile, setMobile] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [occupation, setOccupation] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [visitNo, setVisitNo] = useState<number>(1);
  const [referredBy, setReferredBy] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');

  // Patient Info Modal
  const [showPatientInfoModal, setShowPatientInfoModal] = useState<boolean>(false);
  const [patientPastPrescriptions, setPatientPastPrescriptions] = useState<Prescription[]>([]);

  // Clinical Left Tabs & Quadrants
  const [ccList, setCcList] = useState<string[]>(['']);
  const [ccQuadrants, setCcQuadrants] = useState<ToothQuadrant[]>([defaultQuadrant()]);

  const [ho, setHo] = useState<Record<string, boolean>>({
    HTN: false,
    DM: false,
    Asthma: false,
    COPD: false,
    IHD: false,
    CKD: false,
    CLD: false,
    CVD: false,
    Smoking: false,
    'Tobacco Chewing': false,
    Malignancy: false,
    Allergy: false,
    'Psychiatric disorder': false,
    Depression: false,
    'Drug Abuse': false,
  });
  const [hoCustomText, setHoCustomText] = useState<string>('');

  const [oeList, setOeList] = useState<string[]>(['']);
  const [oeQuadrants, setOeQuadrants] = useState<ToothQuadrant[]>([defaultQuadrant()]);

  const [ixList, setIxList] = useState<string[]>(['']);
  const [ixQuadrants, setIxQuadrants] = useState<ToothQuadrant[]>([defaultQuadrant()]);

  const [ddList, setDdList] = useState<string[]>(['']);
  const [ddQuadrants, setDdQuadrants] = useState<ToothQuadrant[]>([defaultQuadrant()]);

  const [dxList, setDxList] = useState<string[]>(['']);
  const [dxQuadrants, setDxQuadrants] = useState<ToothQuadrant[]>([defaultQuadrant()]);

  const [treatmentPlanList, setTreatmentPlanList] = useState<string[]>(['']);
  const [treatmentPlanQuadrants, setTreatmentPlanQuadrants] = useState<ToothQuadrant[]>([defaultQuadrant()]);

  const [treatmentDoneList, setTreatmentDoneList] = useState<string[]>(['']);
  const [treatmentDoneQuadrants, setTreatmentDoneQuadrants] = useState<ToothQuadrant[]>([defaultQuadrant()]);

  const [specialNoteList, setSpecialNoteList] = useState<string[]>(['']);
  const [specialNoteQuadrants, setSpecialNoteQuadrants] = useState<ToothQuadrant[]>([defaultQuadrant()]);

  const [drugHistoryList, setDrugHistoryList] = useState<string[]>(['', '', '', '', '']);
  const [banglaInput, setBanglaInput] = useState<string>('');
  const [banglaEnabled, setBanglaEnabled] = useState<boolean>(true);
  const [openDropdownSection, setOpenDropdownSection] = useState<string | null>(null);

  // Right Side Rx Medications (Default 9 rows matching Desktop UI)
  const [medicines, setMedicines] = useState<
    { no: number; brand: string; dose: string; instruction: string; duration: string }[]
  >([
    { no: 1, brand: '', dose: '', instruction: '', duration: '' },
    { no: 2, brand: '', dose: '', instruction: '', duration: '' },
    { no: 3, brand: '', dose: '', instruction: '', duration: '' },
    { no: 4, brand: '', dose: '', instruction: '', duration: '' },
    { no: 5, brand: '', dose: '', instruction: '', duration: '' },
    { no: 6, brand: '', dose: '', instruction: '', duration: '' },
    { no: 7, brand: '', dose: '', instruction: '', duration: '' },
    { no: 8, brand: '', dose: '', instruction: '', duration: '' },
    { no: 9, brand: '', dose: '', instruction: '', duration: '' },
  ]);

  // Advice (Default 5 rows)
  const [adviceList, setAdviceList] = useState<string[]>(['', '', '', '', '']);

  // Next Visit
  const [revisitOption, setRevisitOption] = useState<string>('প্রয়োজন নেই');
  const [nextVisitDate, setNextVisitDate] = useState<string>('');
  const [nextVisitTime, setNextVisitTime] = useState<string>('');

  // Contract Entry (3 rows default)
  const [contractRows, setContractRows] = useState<
    { particulars: string; quadrant: ToothQuadrant; price: number; unitPrice?: number }[]
  >([
    { particulars: '', quadrant: defaultQuadrant(), price: 0, unitPrice: 0 },
    { particulars: '', quadrant: defaultQuadrant(), price: 0, unitPrice: 0 },
    { particulars: '', quadrant: defaultQuadrant(), price: 0, unitPrice: 0 },
  ]);
  const [contractNo, setContractNo] = useState<string>('1');
  const [totalBill, setTotalBill] = useState<number>(0);
  const [discountTk, setDiscountTk] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [payableAmount, setPayableAmount] = useState<number>(0);
  const [contractStatus, setContractStatus] = useState<'Open' | 'Closed' | 'In-Progress'>('Open');

  // Payment Entry & Ledger
  const [paidToday, setPaidToday] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [patientPayments, setPatientPayments] = useState<PaymentRecord[]>([]);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [totalDue, setTotalDue] = useState<number>(0);

  // Treatment Journey & Timeline State
  const [treatmentSessions, setTreatmentSessions] = useState<TreatmentSession[]>([]);
  const [showAddSessionModal, setShowAddSessionModal] = useState<boolean>(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [viewingSession, setViewingSession] = useState<TreatmentSession | null>(null);
  const [sessionStep, setSessionStep] = useState<number>(1);
  const [sessionForm, setSessionForm] = useState<{
    sessionNo: number;
    date: string;
    time: string;
    doctor: string;
    assistant: string;
    treatmentType: string;
    teeth: string[];
    status: 'Completed' | 'In Progress' | 'Scheduled' | 'Planned' | 'Cancelled' | 'Follow-up Required';
    beforeCondition: string;
    symptoms: string;
    diagnosis: string;
    toothCondition: string;
    painLevelBefore: number;
    clinicalFindings: string;
    xrayScanNote: string;
    beforePhotos: string[];
    beforeDoctorNotes: string;
    procedureName: string;
    procedureDetails: string;
    materialsUsed: string;
    medicationUsed: string;
    duration: string;
    treatmentDoctorNotes: string;
    afterCondition: string;
    painLevelAfter: number;
    treatmentResult: string;
    clinicalObservation: string;
    postInstructions: string;
    followUpRequired: boolean;
    afterPhotos: string[];
    afterDoctorNotes: string;
    nextDate: string;
    nextTreatment: string;
    nextTeeth: string[];
    nextPurpose: string;
    nextInstructions: string;
    attachments: string[];
  }>({
    sessionNo: 1,
    date: new Date().toISOString().split('T')[0],
    time: '11:00 AM',
    doctor: 'ডা. নাহিদ হাসান',
    assistant: 'স্টাফ নার্স',
    treatmentType: 'Root Canal Treatment (RCT)',
    teeth: ['#16'],
    status: 'Completed',
    beforeCondition: '',
    symptoms: '',
    diagnosis: '',
    toothCondition: '',
    painLevelBefore: 6,
    clinicalFindings: '',
    xrayScanNote: '',
    beforePhotos: [],
    beforeDoctorNotes: '',
    procedureName: 'Root Canal Treatment (RCT)',
    procedureDetails: '',
    materialsUsed: '',
    medicationUsed: '',
    duration: '45 mins',
    treatmentDoctorNotes: '',
    afterCondition: '',
    painLevelAfter: 1,
    treatmentResult: '',
    clinicalObservation: '',
    postInstructions: '',
    followUpRequired: false,
    afterPhotos: [],
    afterDoctorNotes: '',
    nextDate: '',
    nextTreatment: '',
    nextTeeth: [],
    nextPurpose: '',
    nextInstructions: '',
    attachments: [],
  });

  // Report Entry (3 rows)
  const [reportRows, setReportRows] = useState<
    { date: string; reportName: string; resultValue: string; unit: string }[]
  >([
    { date: '', reportName: '', resultValue: '', unit: '' },
    { date: '', reportName: '', resultValue: '', unit: '' },
    { date: '', reportName: '', resultValue: '', unit: '' },
  ]);

  // Clinical Extras Tabs: OT Notes, Salient Feature, History, Medical Certificate, Others
  const [activeExtraTab, setActiveExtraTab] = useState<'OT' | 'Salient' | 'History' | 'Cert' | 'Others'>('OT');
  const [otNotesRows, setOtNotesRows] = useState<{ particularis: string; value: string }[]>([
    { particularis: 'Date', value: '' },
    { particularis: 'Time', value: '' },
    { particularis: 'Indication', value: '' },
    { particularis: 'Name of the operation', value: '' },
    { particularis: 'Procedure', value: '' },
    { particularis: 'Pre Operative Dx', value: '' },
    { particularis: 'Post Operative Finding', value: '' },
    { particularis: 'Type of Anesthesia', value: '' },
    { particularis: 'Name of the Surgeon', value: '' },
    { particularis: 'Name of the Anesthesiol', value: '' },
    { particularis: 'Name of the assistant', value: '' },
    { particularis: 'Hospital Stay Time', value: '' },
    { particularis: 'Special Note', value: '' },
    { particularis: '', value: '' },
    { particularis: '', value: '' },
    { particularis: '', value: '' },
  ]);
  const [printOtNote, setPrintOtNote] = useState<boolean>(true);
  const [salientText, setSalientText] = useState<string>('');
  const [historyText, setHistoryText] = useState<string>('');
  const [certData, setCertData] = useState({
    diagnosis: '',
    restDays: '7',
    restFrom: new Date().toISOString().split('T')[0],
    restTo: '',
    fitnessStatus: 'Fit to resume duties',
  });
  const [othersText, setOthersText] = useState<string>('');

  // Bottom Text Pad
  const [textPadMode, setTextPadMode] = useState<'print' | 'no_print'>('print');
  const [textPadTab, setTextPadTab] = useState<'refer' | 'drug' | 'treatment' | 'advice' | 'prescription'>('refer');
  const [textPadNotes, setTextPadNotes] = useState<Record<string, string>>({
    refer: '',
    drug: '',
    treatment: '',
    advice: '',
    prescription: '',
  });

  // Autocomplete and Template Search State
  const [allDrugs, setAllDrugs] = useState<Drug[]>([]);
  const [allTemplates, setAllTemplates] = useState<TemplateItem[]>([]);
  const [activeClinicalSuggest, setActiveClinicalSuggest] = useState<{
    sectionKey: string;
    index: number;
    query: string;
  } | null>(null);
  const [drugSearchQuery, setDrugSearchQuery] = useState<string>('');
  const [activeDrugIndex, setActiveDrugIndex] = useState<number | null>(null);
  const [drugHistoryQuery, setDrugHistoryQuery] = useState<string>('');
  const [activeDrugHistoryIndex, setActiveDrugHistoryIndex] = useState<number | null>(null);
  const [activeContractIndex, setActiveContractIndex] = useState<number | null>(null);
  const [contractSearchQuery, setContractSearchQuery] = useState<string>('');
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [templateModalType, setTemplateModalType] = useState<string>('drug');
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [toothModalData, setToothModalData] = useState<{
    sectionKey: string;
    sectionTitle: string;
    index: number;
    activeQuad: 'ur' | 'ul' | 'lr' | 'll';
    workingQuadrant: ToothQuadrant;
    onSave: (savedQuadrant: ToothQuadrant) => void;
  } | null>(null);

  const openToothPicker = (
    sectionKey: string,
    sectionTitle: string,
    index: number,
    quadKey: 'ur' | 'ul' | 'lr' | 'll',
    currentQuadrant: ToothQuadrant,
    onSave: (saved: ToothQuadrant) => void
  ) => {
    setToothModalData({
      sectionKey,
      sectionTitle,
      index,
      activeQuad: quadKey,
      workingQuadrant: { ...currentQuadrant },
      onSave,
    });
  };

  // Calculate contract row price: treatment cost is for 1 single tooth * number of selected teeth
  const calculateContractRowPrice = (
    row: { particulars: string; quadrant: ToothQuadrant; price: number; unitPrice?: number },
    newQuadrant?: ToothQuadrant,
    newUnitPrice?: number
  ) => {
    const quad = newQuadrant || row.quadrant;
    const teethCount = countQuadrantTeeth(quad);
    const multiplier = teethCount > 0 ? teethCount : 1;

    // Treatment cost is strictly for 1 tooth (no division)
    let singleToothCost = newUnitPrice !== undefined && newUnitPrice > 0 ? newUnitPrice : row.unitPrice;
    if (!singleToothCost || singleToothCost <= 0) {
      if (row.particulars) {
        const tmpl = allTemplates.find(
          (t) =>
            (t.type === 'cost' || t.type === 'cost_auto' || t.type === 'treatment' || t.type === 'treatment_auto') &&
            t.name.trim().toLowerCase() === row.particulars.trim().toLowerCase()
        );
        if (tmpl && tmpl.price && tmpl.price > 0) {
          singleToothCost = tmpl.price;
        } else {
          singleToothCost = row.price || 0;
        }
      } else {
        singleToothCost = row.price || 0;
      }
    }

    const finalPrice = (singleToothCost || 0) * multiplier;
    return {
      price: finalPrice,
      unitPrice: singleToothCost || 0,
      teethCount,
    };
  };
  const [printMode, setPrintMode] = useState<'full' | 'without_header'>('full');
  const [clinicSettings, setClinicSettings] = useState<any>(null);
  const [printHeaderMarginCm, setPrintHeaderMarginCm] = useState<number>(5.6);
  const [printIncludeQuadrant, setPrintIncludeQuadrant] = useState<boolean>(true);
  const [printIncludeHo, setPrintIncludeHo] = useState<boolean>(true);
  const [printIncludeAdvice, setPrintIncludeAdvice] = useState<boolean>(true);
  const [printIncludeSignature, setPrintIncludeSignature] = useState<boolean>(true);
  const [printIncludeFooter, setPrintIncludeFooter] = useState<boolean>(true);
  const [printIncludeNextVisit, setPrintIncludeNextVisit] = useState<boolean>(true);
  const [printIncludeWatermark, setPrintIncludeWatermark] = useState<boolean>(true);

  const defaultClinicSettings = {
    clinicName: 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার',
    doctor1: {
      name: 'ডা. নাহিদ হাসান',
      degrees: 'বিডিএস, বিসিএস (স্বাস্থ্য)',
      designation: 'ডেন্টাল সার্জন',
      hospital: 'ঢাকা ডেন্টাল কলেজ ও হাসপাতাল',
      bmdcReg: '৯৩২৭',
      mobile: '০১৮৩৩-৩৩৭৮৮৮',
    },
    doctor2: {
      name: 'ডা. আমেনা হোসেন নিদ্রা',
      degrees: 'বিডিএস (ডিইউ)',
      designation: 'ডেন্টাল সার্জন',
      hospital: 'সাফেনা উইমেন্স ডেন্টাল কলেজ হাসপাতাল',
      bmdcReg: '১৫৯৪৮',
    },
    doctor3: {
      name: 'ডা. মাহবুব আজাদ',
      degrees: 'বিডিএস (ডিইউ), পিজিটি',
      designation: 'ডেন্টাল সার্জন',
      hospital: 'ঢাকা ডেন্টাল কলেজ ও হাসপাতাল',
      bmdcReg: '৬১৭৯',
    },
    displayLogo: true,
    logoUrl: '',
    backgroundColor: '#FFFFFF',
    footerText: 'নন্দীপাড়া ব্রিজ সংলগ্ন (২য় তলা), খিলগাঁও, ঢাকা। রোগী দেখার সময়: সকাল ১০টা থেকে দুপুর ২টা, বিকাল ৪টা থেকে রাত ১০টা। যোগাযোগ: 01833-337888',
    printSettings: {
      headerHeightCm: 5.6,
    },
    watermarkSettings: {
      showWatermark: true,
      type: 'logo',
      text: 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার',
      opacity: 0.07,
    },
  };

  const renderToothQuadrantPrint = (quad?: ToothQuadrant) => {
    if (!quad || (!quad.ur && !quad.ul && !quad.lr && !quad.ll)) return null;
    return (
      <span className="inline-block align-middle ml-1.5 font-mono text-[9px] border border-slate-400 bg-slate-50 rounded leading-none">
        <span className="flex border-b border-slate-300">
          <span className="w-4 h-3 flex items-center justify-center border-r border-slate-300 font-bold text-blue-950">
            {quad.ur || '-'}
          </span>
          <span className="w-4 h-3 flex items-center justify-center font-bold text-blue-950">
            {quad.ul || '-'}
          </span>
        </span>
        <span className="flex">
          <span className="w-4 h-3 flex items-center justify-center border-r border-slate-300 font-bold text-blue-950">
            {quad.lr || '-'}
          </span>
          <span className="w-4 h-3 flex items-center justify-center font-bold text-blue-950">
            {quad.ll || '-'}
          </span>
        </span>
      </span>
    );
  };

  // Load Initial Settings & High Reg No
  useEffect(() => {
    async function loadData() {
      const settings = await db.settings.get('default_settings');
      if (settings) {
        setClinicSettings(settings);
        if (settings.printSettings?.headerHeightCm) {
          setPrintHeaderMarginCm(settings.printSettings.headerHeightCm);
        }
        if (settings.watermarkSettings?.showWatermark !== undefined) {
          setPrintIncludeWatermark(settings.watermarkSettings.showWatermark);
        }
      }

      const drugs = await db.drugs.toArray();
      setAllDrugs(drugs);

      const templates = await db.templates.toArray();
      setAllTemplates(templates);

      let loadedRx: Prescription | undefined = undefined;
      if (initialPrescriptionId) {
        loadedRx = await db.prescriptions.get(initialPrescriptionId);
      } else if (initialRegNo) {
        const existingRx = await db.prescriptions.where('regNo').equals(initialRegNo).last();
        if (existingRx && initialAppointmentId) {
          const ap = await db.appointments.get(initialAppointmentId);
          if (ap?.prescriptionId || ap?.status === 'Completed') {
            loadedRx = existingRx;
          }
        }
      }

      if (loadedRx) {
        if (loadedRx.regNo) setRegNo(loadedRx.regNo);
        if (loadedRx.patientName) setPatientName(loadedRx.patientName);
        if (loadedRx.age) setAge(loadedRx.age);
        if (loadedRx.sex) setSex(loadedRx.sex);
        if (loadedRx.mobile) setMobile(loadedRx.mobile);
        if (loadedRx.address) setAddress(loadedRx.address);
        if (loadedRx.occupation) setOccupation(loadedRx.occupation);
        if (loadedRx.date) setDate(loadedRx.date);
        if (loadedRx.visitNo) setVisitNo(loadedRx.visitNo);
        if (loadedRx.referredBy) setReferredBy(loadedRx.referredBy);
        if (loadedRx.cc && loadedRx.cc.length > 0) setCcList(loadedRx.cc);
        if (loadedRx.ho) setHo(loadedRx.ho);
        if (loadedRx.hoCustomText) setHoCustomText(loadedRx.hoCustomText);
        if (loadedRx.oe && loadedRx.oe.length > 0) setOeList(loadedRx.oe);
        if (loadedRx.ix && loadedRx.ix.length > 0) setIxList(loadedRx.ix);
        if (loadedRx.dd && loadedRx.dd.length > 0) setDdList(loadedRx.dd);
        if (loadedRx.dx && loadedRx.dx.length > 0) setDxList(loadedRx.dx);
        if (loadedRx.treatmentPlan && loadedRx.treatmentPlan.length > 0) setTreatmentPlanList(loadedRx.treatmentPlan);
        if (loadedRx.treatmentDone && loadedRx.treatmentDone.length > 0) setTreatmentDoneList(loadedRx.treatmentDone);
        if (loadedRx.specialNote && loadedRx.specialNote.length > 0) setSpecialNoteList(loadedRx.specialNote);
        if (loadedRx.drugHistory && loadedRx.drugHistory.length > 0) setDrugHistoryList(loadedRx.drugHistory);
        if (loadedRx.medicines && loadedRx.medicines.length > 0) setMedicines(loadedRx.medicines);
        if (loadedRx.advice && loadedRx.advice.length > 0) setAdviceList(loadedRx.advice);
        if (loadedRx.nextVisitDate) setNextVisitDate(loadedRx.nextVisitDate);
        if (loadedRx.revisitText) setRevisitOption(loadedRx.revisitText);
        if (loadedRx.timeSlot) setNextVisitTime(loadedRx.timeSlot);
        await loadPatientFinancialsAndJourney(loadedRx.regNo);
      } else {
        if (initialRegNo) {
          setRegNo(initialRegNo);
          await loadPatientByRegNo(initialRegNo);
        } else {
          const lastPrescription = await db.prescriptions.orderBy('regNo').last();
          if (lastPrescription) {
            setRegNo(lastPrescription.regNo + 1);
          }
        }

        // Pre-fill patient details from appointment if provided
        if (initialName) setPatientName(initialName);
        if (initialAge) setAge(initialAge);
        if (initialSex) setSex(initialSex);
        if (initialMobile) setMobile(initialMobile);
        if (initialProblem && initialProblem.trim()) {
          setCcList([initialProblem.trim()]);
        }
      }
    }
    loadData();
  }, [initialRegNo, initialPrescriptionId, initialAppointmentId, initialName, initialAge, initialSex, initialMobile, initialProblem]);

  // Load Payments and Treatment Sessions for active RegNo
  const loadPatientFinancialsAndJourney = async (searchReg: number) => {
    try {
      const pmts = await db.payments.where('regNo').equals(Number(searchReg)).toArray();
      setPatientPayments(pmts);
      const sessions = await db.treatmentSessions.where('regNo').equals(Number(searchReg)).sortBy('sessionNo');
      setTreatmentSessions(sessions);
    } catch (e) {
      console.warn('Error loading patient financials and journey:', e);
    }
  };

  useEffect(() => {
    if (regNo) {
      loadPatientFinancialsAndJourney(regNo);
    }
  }, [regNo]);

  // Recalculate Financials from Contract and Ledger
  useEffect(() => {
    const sumPrice = contractRows.reduce((acc, row) => acc + (Number(row.price) || 0), 0);
    setTotalBill(sumPrice);

    let payable = sumPrice;
    if (discountTk > 0) {
      payable = Math.max(0, sumPrice - discountTk);
    } else if (discountPercent > 0) {
      payable = Math.max(0, sumPrice - (sumPrice * discountPercent) / 100);
    }
    setPayableAmount(payable);

    // Calculate Total Paid strictly from actual stored payment transactions in the database
    const ledgerPaid = patientPayments.reduce((acc, p) => acc + (Number(p.paidAmount) || 0), 0);
    setTotalPaid(ledgerPaid);
    setTotalDue(Math.max(0, payable - ledgerPaid));
  }, [contractRows, discountTk, discountPercent, patientPayments]);

  const loadPatientByRegNo = async (searchReg: number) => {
    const patient = await db.patients.where('regNo').equals(Number(searchReg)).first();
    if (patient) {
      setRegNo(patient.regNo);
      setPatientName(patient.name);
      setAge(patient.age);
      setSex(patient.sex);
      setMobile(patient.mobile);
      setAddress(patient.address);
      setOccupation(patient.occupation);

      const pastPrescriptions = await db.prescriptions.where('regNo').equals(Number(searchReg)).toArray();
      setPatientPastPrescriptions(pastPrescriptions);
      setVisitNo(pastPrescriptions.length + 1);

      await loadPatientFinancialsAndJourney(patient.regNo);
    }
  };

  // Add Payment Transaction to Database immediately
  const handleAddPayment = async () => {
    const amount = Number(paidToday) || 0;
    if (amount <= 0) {
      alert('অনুগ্রহ করে জমা টাকার পরিমাণ (Paid Amount) লিখুন!');
      return;
    }

    const currentLedgerPaid = patientPayments.reduce((acc, p) => acc + (Number(p.paidAmount) || 0), 0);
    const newTotalPaid = currentLedgerPaid + amount;
    const newDue = Math.max(0, payableAmount - newTotalPaid);

    const paymentRecord: PaymentRecord = {
      id: `pay_${regNo}_${Date.now()}`,
      regNo: Number(regNo),
      name: patientName || 'Patient',
      mobile: mobile || '',
      date: paymentDate || new Date().toISOString().split('T')[0],
      particulars: paymentNote.trim() || contractRows[0]?.particulars || 'Treatment Payment',
      totalBill: payableAmount,
      discount: discountTk,
      payableAmount: payableAmount,
      paidAmount: amount,
      dueAmount: newDue,
      method: paymentMethod || 'Cash',
      note: paymentNote.trim(),
      addedBy: clinicSettings?.doctor1?.name ? clinicSettings.doctor1.name.split(' ')[0] : 'Admin',
      status: 'Paid',
      createdAt: new Date().toISOString(),
    };

    await db.payments.put(paymentRecord);
    await syncEngine.logMutation('payments', 'INSERT', paymentRecord.id, paymentRecord);

    const updatedPmts = await db.payments.where('regNo').equals(Number(regNo)).toArray();
    setPatientPayments(updatedPmts);
    setPaidToday(0);
    setPaymentNote('');
  };

  // Delete Payment Transaction
  const handleDeletePayment = async (paymentId: string) => {
    if (confirm('আপনি কি এই পেমেন্ট ট্রানজ্যাকশনটি মুছে ফেলতে চান?')) {
      await db.payments.delete(paymentId);
      await syncEngine.logMutation('payments', 'DELETE', paymentId, { id: paymentId });
      const updatedPmts = await db.payments.where('regNo').equals(Number(regNo)).toArray();
      setPatientPayments(updatedPmts);
    }
  };

  // Treatment Journey Modal Openers
  const handleOpenAddSessionModal = () => {
    setEditingSessionId(null);
    setSessionStep(1);
    setSessionForm({
      sessionNo: treatmentSessions.length + 1,
      date: new Date().toISOString().split('T')[0],
      time: '11:00 AM',
      doctor: clinicSettings?.doctor1?.name || 'ডা. নাহিদ হাসান',
      assistant: 'স্টাফ নার্স',
      treatmentType: contractRows.find((r) => r.particulars)?.particulars || 'Root Canal Treatment (RCT)',
      teeth: ['#16'],
      status: 'Completed',
      beforeCondition: 'Severe deep caries, tender on percussion, cold sensitivity.',
      symptoms: 'Throbbing pain, night pain',
      diagnosis: 'Acute Irreversible Pulpitis',
      toothCondition: 'Carious pulp exposure',
      painLevelBefore: 7,
      clinicalFindings: 'Deep occlusion cavity with tenderness',
      xrayScanNote: 'IOPA shows radiolucency reaching pulp with PDL widening',
      beforePhotos: [],
      beforeDoctorNotes: '',
      procedureName: contractRows.find((r) => r.particulars)?.particulars || 'Root Canal Treatment (RCT)',
      procedureDetails: 'Access opening done under local anesthesia, pulp extirpation completed, biomechanical preparation done, Ca(OH)2 dressing placed with Cavit.',
      materialsUsed: 'Lignox 2%, K-Files, NaOCl 3%, EDTA, Ca(OH)2, Cavit G',
      medicationUsed: 'Tab. Axicef Plus, Tab. Rolac',
      duration: '45 mins',
      treatmentDoctorNotes: 'Canals located successfully. Working length established.',
      afterCondition: 'Patient comfortable, symptoms subsided',
      painLevelAfter: 1,
      treatmentResult: 'Access cavity prepared and dressed successfully',
      clinicalObservation: 'No bleeding or swelling observed post-op',
      postInstructions: 'Do not chew hard foods on this side for 1 hour. Take prescribed painkillers if mild pain occurs.',
      followUpRequired: true,
      afterPhotos: [],
      afterDoctorNotes: 'Next appointment scheduled for obturation.',
      nextDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      nextTreatment: 'Biomechanical Preparation & Obturation',
      nextTeeth: ['#16'],
      nextPurpose: 'Canal obturation with Gutta-Percha points',
      nextInstructions: 'Eat food before coming to next session',
      attachments: [],
    });
    setShowAddSessionModal(true);
  };

  const handleOpenEditSessionModal = (session: TreatmentSession) => {
    setEditingSessionId(session.id);
    setSessionStep(1);
    setSessionForm({
      sessionNo: session.sessionNo,
      date: session.date,
      time: session.time || '',
      doctor: session.doctor || '',
      assistant: session.assistant || '',
      treatmentType: session.treatmentType,
      teeth: session.teeth || [],
      status: session.status,
      beforeCondition: session.beforeCondition || '',
      symptoms: session.symptoms || '',
      diagnosis: session.diagnosis || '',
      toothCondition: session.toothCondition || '',
      painLevelBefore: session.painLevelBefore ?? 5,
      clinicalFindings: session.clinicalFindings || '',
      xrayScanNote: session.xrayScanNote || '',
      beforePhotos: session.beforePhotos || [],
      beforeDoctorNotes: session.beforeDoctorNotes || '',
      procedureName: session.procedureName || session.treatmentType,
      procedureDetails: session.procedureDetails || '',
      materialsUsed: session.materialsUsed || '',
      medicationUsed: session.medicationUsed || '',
      duration: session.duration || '',
      treatmentDoctorNotes: session.treatmentDoctorNotes || '',
      afterCondition: session.afterCondition || '',
      painLevelAfter: session.painLevelAfter ?? 0,
      treatmentResult: session.treatmentResult || '',
      clinicalObservation: session.clinicalObservation || '',
      postInstructions: session.postInstructions || '',
      followUpRequired: !!session.followUpRequired,
      afterPhotos: session.afterPhotos || [],
      afterDoctorNotes: session.afterDoctorNotes || '',
      nextDate: session.nextDate || '',
      nextTreatment: session.nextTreatment || '',
      nextTeeth: session.nextTeeth || [],
      nextPurpose: session.nextPurpose || '',
      nextInstructions: session.nextInstructions || '',
      attachments: session.attachments || [],
    });
    setShowAddSessionModal(true);
  };

  const handleToggleToothInSession = (toothNumber: string) => {
    const currentTeeth = sessionForm.teeth || [];
    if (currentTeeth.includes(toothNumber)) {
      setSessionForm({
        ...sessionForm,
        teeth: currentTeeth.filter((t) => t !== toothNumber),
      });
    } else {
      setSessionForm({
        ...sessionForm,
        teeth: [...currentTeeth, toothNumber],
      });
    }
  };

  const handleSaveTreatmentSession = async () => {
    if (!sessionForm.treatmentType.trim()) {
      alert('চিকিৎসার ধরণ (Treatment Type / Procedure) লিখুন!');
      return;
    }

    const sessionId = editingSessionId || `session_${regNo}_${Date.now()}`;
    const newSession: TreatmentSession = {
      id: sessionId,
      regNo: Number(regNo),
      sessionNo: Number(sessionForm.sessionNo) || treatmentSessions.length + 1,
      date: sessionForm.date || new Date().toISOString().split('T')[0],
      time: sessionForm.time || '',
      doctor: sessionForm.doctor || '',
      assistant: sessionForm.assistant || '',
      treatmentType: sessionForm.treatmentType.trim(),
      teeth: sessionForm.teeth || [],
      status: sessionForm.status || 'Completed',
      beforeCondition: sessionForm.beforeCondition,
      symptoms: sessionForm.symptoms,
      diagnosis: sessionForm.diagnosis,
      toothCondition: sessionForm.toothCondition,
      painLevelBefore: sessionForm.painLevelBefore,
      clinicalFindings: sessionForm.clinicalFindings,
      xrayScanNote: sessionForm.xrayScanNote,
      beforePhotos: sessionForm.beforePhotos,
      beforeDoctorNotes: sessionForm.beforeDoctorNotes,
      procedureName: sessionForm.procedureName || sessionForm.treatmentType,
      procedureDetails: sessionForm.procedureDetails,
      materialsUsed: sessionForm.materialsUsed,
      medicationUsed: sessionForm.medicationUsed,
      duration: sessionForm.duration,
      treatmentDoctorNotes: sessionForm.treatmentDoctorNotes,
      afterCondition: sessionForm.afterCondition,
      painLevelAfter: sessionForm.painLevelAfter,
      treatmentResult: sessionForm.treatmentResult,
      clinicalObservation: sessionForm.clinicalObservation,
      postInstructions: sessionForm.postInstructions,
      followUpRequired: sessionForm.followUpRequired,
      afterPhotos: sessionForm.afterPhotos,
      afterDoctorNotes: sessionForm.afterDoctorNotes,
      nextDate: sessionForm.nextDate,
      nextTreatment: sessionForm.nextTreatment,
      nextTeeth: sessionForm.nextTeeth,
      nextPurpose: sessionForm.nextPurpose,
      nextInstructions: sessionForm.nextInstructions,
      attachments: sessionForm.attachments,
      createdAt: new Date().toISOString(),
    };

    await db.treatmentSessions.put(newSession);
    await syncEngine.logMutation('treatmentSessions' as any, editingSessionId ? 'UPDATE' : 'INSERT', newSession.id, newSession);

    const updatedSessions = await db.treatmentSessions.where('regNo').equals(Number(regNo)).sortBy('sessionNo');
    setTreatmentSessions(updatedSessions);
    setShowAddSessionModal(false);
    setEditingSessionId(null);
  };

  const handleDeleteTreatmentSession = async (sessionId: string) => {
    if (confirm('আপনি কি এই চিকিৎসা সেশনটি মুছে ফেলতে চান?')) {
      await db.treatmentSessions.delete(sessionId);
      await syncEngine.logMutation('treatmentSessions' as any, 'DELETE', sessionId, { id: sessionId });
      const updatedSessions = await db.treatmentSessions.where('regNo').equals(Number(regNo)).sortBy('sessionNo');
      setTreatmentSessions(updatedSessions);
      if (viewingSession?.id === sessionId) {
        setViewingSession(null);
      }
    }
  };

  // Medicine Grid Actions
  const handleAddMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      { no: prev.length + 1, brand: '', dose: '', instruction: '', duration: '' },
    ]);
  };

  const handleRemoveMedicineRow = (index: number) => {
    const updated = medicines.filter((_, i) => i !== index).map((m, i) => ({ ...m, no: i + 1 }));
    setMedicines(updated);
  };

  const handleMedicineChange = (index: number, field: keyof (typeof medicines)[0], value: string) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  const handleSelectDrug = (
    index: number,
    drug: Drug | { id?: string; name: string; prescriptionName?: string; generic?: string; form?: string; strength?: string; company?: string; dose?: string; instruction?: string; duration?: string }
  ) => {
    const brandName =
      drug.prescriptionName ||
      (('form' in drug && drug.form) ? `${drug.form} ${drug.name} ${drug.strength}` : drug.name);

    // Look up remembered template for this medicine brand
    const matchedTemplate = allTemplates.find((t) => {
      if (t.type !== 'drug_auto' && t.type !== 'drug') return false;
      const tName = t.name.toLowerCase().trim();
      const bName = brandName.toLowerCase().trim();
      return tName === bName || tName.includes(drug.name.toLowerCase().trim()) || bName.includes(tName);
    });

    let autoDose = '১+০+১';
    let autoInstruction = 'খাবারের পর';
    let autoDuration = '০৫ দিন';

    if (matchedTemplate?.content) {
      try {
        const parsed = JSON.parse(matchedTemplate.content);
        if (parsed.dose) autoDose = parsed.dose;
        if (parsed.instruction) autoInstruction = parsed.instruction;
        if (parsed.duration) autoDuration = parsed.duration;
      } catch (e) {
        const parts = matchedTemplate.content.split(',');
        if (parts[0]) autoDose = parts[0].trim();
        if (parts[1]) autoInstruction = parts[1].trim();
        if (parts[2]) autoDuration = parts[2].trim();
      }
    }

    if ('dose' in drug && drug.dose) autoDose = drug.dose;
    if ('instruction' in drug && drug.instruction) autoInstruction = drug.instruction;
    if ('duration' in drug && drug.duration) autoDuration = drug.duration;

    const updated = [...medicines];
    const newMed = {
      ...updated[index],
      brand: brandName,
      dose: autoDose || updated[index].dose || '১+০+১',
      instruction: autoInstruction || updated[index].instruction || 'খাবারের পর',
      duration: autoDuration || updated[index].duration || '০৫ দিন',
    };
    updated[index] = newMed;
    setMedicines(updated);
    setActiveDrugIndex(null);
    autoSaveSingleMedicine(newMed);
  };

  // Auto-save a medicine entry to templates immediately (like C/C auto-saves)
  const autoSaveSingleMedicine = async (med: {
    brand: string;
    dose?: string;
    instruction?: string;
    duration?: string;
  }) => {
    const brandName = med.brand.trim();
    if (!brandName || brandName.length < 2) return;

    const content = JSON.stringify({
      dose: med.dose?.trim() || '১+০+১',
      instruction: med.instruction?.trim() || 'খাবারের পর',
      duration: med.duration?.trim() || '০৫ দিন',
    });

    try {
      const currentTemplates = await db.templates.toArray();
      const existing = currentTemplates.find(
        (t) =>
          (t.type === 'drug_auto' || t.type === 'drug') &&
          t.name.trim().toLowerCase() === brandName.toLowerCase()
      );

      if (existing) {
        const newCount = (existing.count || 1) + 1;
        await db.templates.update(existing.id, { count: newCount, content });
        await syncEngine.logMutation('templates', 'UPDATE', existing.id, { ...existing, count: newCount, content });
      } else {
        const newItem: TemplateItem = {
          id: `tmpl_drug_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'drug_auto',
          name: brandName,
          content,
          count: 1,
        };
        await db.templates.put(newItem);
        await syncEngine.logMutation('templates', 'INSERT', newItem.id, newItem);
      }

      const freshTemplates = await db.templates.toArray();
      setAllTemplates(freshTemplates);
    } catch (err) {
      console.error('Error auto-saving medicine template:', err);
    }
  };

  // Auto-save a single advice entry to templates immediately (like C/C auto-saves)
  const autoSaveSingleAdvice = async (adviceText: string) => {
    const trimmed = adviceText.trim();
    if (!trimmed || trimmed.length < 2) return;

    try {
      const currentTemplates = await db.templates.toArray();
      const existing = currentTemplates.find(
        (t) =>
          (t.type === 'advice_auto' || t.type === 'advice') &&
          (t.name.trim().toLowerCase() === trimmed.toLowerCase() ||
           (t.content && t.content.trim().toLowerCase() === trimmed.toLowerCase()))
      );

      if (existing) {
        const newCount = (existing.count || 1) + 1;
        await db.templates.update(existing.id, { count: newCount });
        await syncEngine.logMutation('templates', 'UPDATE', existing.id, { ...existing, count: newCount });
      } else {
        const newItem: TemplateItem = {
          id: `tmpl_advice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'advice_auto',
          name: trimmed,
          content: trimmed,
          count: 1,
        };
        await db.templates.put(newItem);
        await syncEngine.logMutation('templates', 'INSERT', newItem.id, newItem);
      }

      const freshTemplates = await db.templates.toArray();
      setAllTemplates(freshTemplates);
    } catch (err) {
      console.error('Error auto-saving advice template:', err);
    }
  };

  // Auto-save a procedure and cost to templates immediately (like C/C auto-saves)
  const autoSaveContractProcedure = async (procedureName: string, price?: number) => {
    const trimmed = procedureName.trim();
    if (!trimmed || trimmed.length < 2) return;

    try {
      const currentTemplates = await db.templates.toArray();
      const existing = currentTemplates.find(
        (t) =>
          (t.type === 'cost' || t.type === 'cost_auto' || t.type === 'treatment' || t.type === 'treatment_auto') &&
          t.name.trim().toLowerCase() === trimmed.toLowerCase()
      );

      if (existing) {
        const newCount = (existing.count || 1) + 1;
        const updatedItem = {
          ...existing,
          count: newCount,
          price: price !== undefined && price > 0 ? price : existing.price,
        };
        await db.templates.update(existing.id, updatedItem);
        await syncEngine.logMutation('templates', 'UPDATE', existing.id, updatedItem);
      } else {
        const newItem: TemplateItem = {
          id: `tmpl_cost_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'cost',
          name: trimmed,
          price: price && price > 0 ? price : 0,
          count: 1,
        };
        await db.templates.put(newItem);
        await syncEngine.logMutation('templates', 'INSERT', newItem.id, newItem);
      }

      const freshTemplates = await db.templates.toArray();
      setAllTemplates(freshTemplates);
    } catch (err) {
      console.error('Error auto-saving contract procedure template:', err);
    }
  };

  // Auto-save Drug History immediately (like C/C & Advice auto-saves)
  const autoSaveSingleDrugHistory = async (drugHistoryText: string) => {
    const trimmed = drugHistoryText.trim();
    if (!trimmed || trimmed.length < 2) return;

    try {
      const currentTemplates = await db.templates.toArray();
      const existing = currentTemplates.find(
        (t) =>
          (t.type === 'drughistory_auto' || t.type === 'drughistory') &&
          (t.name.trim().toLowerCase() === trimmed.toLowerCase() ||
            (t.content && t.content.trim().toLowerCase() === trimmed.toLowerCase()))
      );

      if (existing) {
        const newCount = (existing.count || 1) + 1;
        await db.templates.update(existing.id, { count: newCount });
        await syncEngine.logMutation('templates', 'UPDATE', existing.id, { ...existing, count: newCount });
      } else {
        const newItem: TemplateItem = {
          id: `tmpl_dh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'drughistory_auto',
          name: trimmed,
          count: 1,
        };
        await db.templates.put(newItem);
        await syncEngine.logMutation('templates', 'INSERT', newItem.id, newItem);
      }

      const freshTemplates = await db.templates.toArray();
      setAllTemplates(freshTemplates);
    } catch (err) {
      console.error('Error auto-saving drug history template:', err);
    }
  };

  // Save Prescription (Offline + Auto-Sync)
  const handleSave = async (andPrint: boolean = false, withoutHeader: boolean = false) => {
    if (!patientName.trim()) {
      alert('অনুগ্রহ করে রোগীর নাম লিখুন!');
      return;
    }

    const prescriptionId = initialPrescriptionId || `rx_${regNo}_${visitNo}_${Date.now()}`;

    // 1. Save or Update Patient Record in local DB
    const patientId = `p_${regNo}`;
    const patientData: Patient = {
      id: patientId,
      regNo: Number(regNo),
      name: patientName,
      age: age || 'N/A',
      sex,
      mobile,
      address,
      occupation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.patients.put(patientData);
    await syncEngine.logMutation('patients', 'UPDATE', patientId, patientData);

    // 2. Build Prescription Object
    const filteredMedicines = medicines.filter((m) => m.brand.trim() !== '');
    const filteredAdvice = adviceList.filter((a) => a.trim() !== '');

    const prescriptionData: Prescription = {
      id: prescriptionId,
      regNo: Number(regNo),
      patientId,
      patientName,
      age,
      sex,
      mobile,
      address,
      occupation,
      date,
      visitNo,
      cc: ccList.filter((c) => c.trim() !== ''),
      ho,
      hoCustomText,
      oe: oeList.filter((o) => o.trim() !== ''),
      ix: ixList.filter((i) => i.trim() !== ''),
      dd: ddList.filter((d) => d.trim() !== ''),
      dx: dxList.filter((d) => d.trim() !== ''),
      treatmentPlan: treatmentPlanList.filter((t) => t.trim() !== ''),
      treatmentDone: treatmentDoneList.filter((t) => t.trim() !== ''),
      specialNote: specialNoteList.filter((s) => s.trim() !== ''),
      drugHistory: drugHistoryList.filter((dh) => dh.trim() !== ''),
      medicines: filteredMedicines,
      advice: filteredAdvice,
      nextVisitDate,
      revisitText: revisitOption,
      timeSlot: nextVisitTime,
      referredBy,
      contract: {
        contractNo,
        particulars: contractRows.map((r) => r.particulars).filter(Boolean).join(', '),
        quadrant: '',
        price: totalBill,
        totalBill,
        discountTk,
        discountPercent,
        payableAmount,
        status: contractStatus,
      },
      payment: {
        paidToday,
        totalBill: payableAmount,
        totalPaid,
        totalDue,
      },
      otNotes: {
        date: otNotesRows.find((r) => r.particularis === 'Date')?.value || '',
        time: otNotesRows.find((r) => r.particularis === 'Time')?.value || '',
        indication: otNotesRows.find((r) => r.particularis === 'Indication')?.value || '',
        operationName: otNotesRows.find((r) => r.particularis === 'Name of the operation')?.value || '',
        procedure: otNotesRows.find((r) => r.particularis === 'Procedure')?.value || '',
        preOpDx: otNotesRows.find((r) => r.particularis === 'Pre Operative Dx')?.value || '',
        postOpFinding: otNotesRows.find((r) => r.particularis === 'Post Operative Finding')?.value || '',
        anesthesiaType: otNotesRows.find((r) => r.particularis === 'Type of Anesthesia')?.value || '',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    // Save to Local IndexedDB
    await db.prescriptions.put(prescriptionData);
    await syncEngine.logMutation('prescriptions', initialPrescriptionId ? 'UPDATE' : 'INSERT', prescriptionId, prescriptionData);

    // If payment made, record in Payments table
    if (paidToday > 0) {
      const paymentRecord = {
        id: `pay_${Date.now()}`,
        regNo: Number(regNo),
        name: patientName,
        mobile,
        date,
        particulars: contractRows[0]?.particulars || 'Prescription Fee',
        totalBill: payableAmount,
        discount: discountTk,
        payableAmount,
        paidAmount: paidToday,
        dueAmount: totalDue,
        createdAt: new Date().toISOString(),
      };
      await db.payments.put(paymentRecord);
      await syncEngine.logMutation('payments', 'INSERT', paymentRecord.id, paymentRecord);
    }

    // 3. Auto-save & Learn Custom Clinical Inputs into Templates Hub
    const autoSaveItemsToTemplates = async (items: string[], type: TemplateItem['type']) => {
      const currentTemplates = await db.templates.toArray();
      for (const raw of items) {
        const trimmed = raw.trim();
        if (!trimmed || trimmed.length < 2) continue;

        const baseType = type.replace('_auto', '') as TemplateItem['type'];
        const existing = currentTemplates.find(
          (t) => (t.type === type || t.type === baseType) && t.name.trim().toLowerCase() === trimmed.toLowerCase()
        );

        if (existing) {
          const newCount = (existing.count || 1) + 1;
          await db.templates.update(existing.id, { count: newCount });
          await syncEngine.logMutation('templates', 'UPDATE', existing.id, { ...existing, count: newCount });
        } else {
          const newItem: TemplateItem = {
            id: `tmpl_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type,
            name: trimmed,
            count: 1,
          };
          await db.templates.put(newItem);
          await syncEngine.logMutation('templates', 'INSERT', newItem.id, newItem);
        }
      }
    };

    // Auto-save C/C, DX, IX, Plan, Done, Note, Advice
    // Auto-save prescribed medicines with dose, instruction and duration into drug templates
    const autoSaveMedicinesToTemplates = async (medList: typeof medicines) => {
      const currentTemplates = await db.templates.toArray();
      for (const med of medList) {
        const brandName = med.brand.trim();
        if (!brandName || brandName.length < 2) continue;

        const content = JSON.stringify({
          dose: med.dose.trim() || '১+০+১',
          instruction: med.instruction.trim() || 'খাবারের পর',
          duration: med.duration.trim() || '০৫ দিন',
        });

        const existing = currentTemplates.find(
          (t) =>
            (t.type === 'drug_auto' || t.type === 'drug') &&
            t.name.trim().toLowerCase() === brandName.toLowerCase()
        );

        if (existing) {
          const newCount = (existing.count || 1) + 1;
          await db.templates.update(existing.id, { count: newCount, content });
          await syncEngine.logMutation('templates', 'UPDATE', existing.id, { ...existing, count: newCount, content });
        } else {
          const newItem: TemplateItem = {
            id: `tmpl_drug_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'drug_auto',
            name: brandName,
            content,
            count: 1,
          };
          await db.templates.put(newItem);
          await syncEngine.logMutation('templates', 'INSERT', newItem.id, newItem);
        }
      }
    };

    // Auto-save C/C, DX, IX, Plan, Done, Note, Advice & Medicines
    await autoSaveItemsToTemplates(ccList, 'cc_auto');
    await autoSaveItemsToTemplates(dxList, 'dx_auto');
    await autoSaveItemsToTemplates(ixList, 'ix_auto');
    await autoSaveItemsToTemplates(ddList, 'treatment');
    await autoSaveItemsToTemplates(oeList, 'treatment');
    await autoSaveItemsToTemplates(treatmentPlanList, 'plan_auto');
    await autoSaveItemsToTemplates(treatmentDoneList, 'treatment');
    await autoSaveItemsToTemplates(specialNoteList, 'note_auto');
    await autoSaveItemsToTemplates(adviceList, 'advice_auto');
    await autoSaveItemsToTemplates(drugHistoryList, 'drughistory_auto');
    await autoSaveMedicinesToTemplates(medicines.filter((m) => m.brand.trim() !== ''));

    // Auto-save Contract Entry procedures & costs into treatment cost templates
    for (const cRow of contractRows) {
      if (cRow.particulars && cRow.particulars.trim().length >= 2) {
        await autoSaveContractProcedure(cRow.particulars, cRow.price);
      }
    }

    // Refresh active templates in memory for immediate suggestion availability
    const refreshedTemplates = await db.templates.toArray();
    setAllTemplates(refreshedTemplates);

    // If initiated from an appointment, mark appointment as Completed and link prescriptionId
    if (initialAppointmentId) {
      try {
        await db.appointments.update(initialAppointmentId, { status: 'Completed', prescriptionId });
        await syncEngine.logMutation('appointments', 'UPDATE', initialAppointmentId, { status: 'Completed', prescriptionId });
      } catch (err) {
        console.warn('Could not mark appointment completed:', err);
      }
    }

    if (onSaved) {
      onSaved(prescriptionId);
    }

    if (andPrint) {
      setPrintMode(withoutHeader ? 'without_header' : 'full');
      setPreviewModalOpen(true);
      setTimeout(() => {
        window.print();
      }, 500);
    } else {
      alert(initialPrescriptionId ? 'প্রেসক্রিপশন সফলভাবে আপডেট করা হয়েছে!' : 'প্রেসক্রিপশন সফলভাবে অফলাইনে সেভ হয়েছে! ইন্টারনেট থাকলে লাইভ ডাটাবেজে অটো সিঙ্ক হবে।');
    }
  };

  const handleResetForm = async () => {
    const freshTemplates = await db.templates.toArray();
    setAllTemplates(freshTemplates);
    setRegNo((prev) => prev + 1);
    setPatientName('');
    setAge('');
    setSex('M');
    setMobile('');
    setAddress('');
    setOccupation('');
    setVisitNo(1);
    setBirthYear('');
    setReferredBy('');
    setCcList(['']);
    setCcQuadrants([defaultQuadrant()]);
    setOeList(['']);
    setOeQuadrants([defaultQuadrant()]);
    setIxList(['']);
    setIxQuadrants([defaultQuadrant()]);
    setDdList(['']);
    setDdQuadrants([defaultQuadrant()]);
    setDxList(['']);
    setDxQuadrants([defaultQuadrant()]);
    setTreatmentPlanList(['']);
    setTreatmentPlanQuadrants([defaultQuadrant()]);
    setTreatmentDoneList(['']);
    setTreatmentDoneQuadrants([defaultQuadrant()]);
    setSpecialNoteList(['']);
    setSpecialNoteQuadrants([defaultQuadrant()]);
    setDrugHistoryList(['', '', '', '', '']);
    setMedicines([
      { no: 1, brand: '', dose: '', instruction: '', duration: '' },
      { no: 2, brand: '', dose: '', instruction: '', duration: '' },
      { no: 3, brand: '', dose: '', instruction: '', duration: '' },
      { no: 4, brand: '', dose: '', instruction: '', duration: '' },
      { no: 5, brand: '', dose: '', instruction: '', duration: '' },
      { no: 6, brand: '', dose: '', instruction: '', duration: '' },
      { no: 7, brand: '', dose: '', instruction: '', duration: '' },
      { no: 8, brand: '', dose: '', instruction: '', duration: '' },
      { no: 9, brand: '', dose: '', instruction: '', duration: '' },
    ]);
    setAdviceList(['', '', '', '', '']);
    setContractRows([
      { particulars: '', quadrant: defaultQuadrant(), price: 0, unitPrice: 0 },
      { particulars: '', quadrant: defaultQuadrant(), price: 0, unitPrice: 0 },
      { particulars: '', quadrant: defaultQuadrant(), price: 0, unitPrice: 0 },
    ]);
    setPaidToday(0);
    setDiscountTk(0);
    setDiscountPercent(0);
  };

  // Reusable Left Clinical Box Component
  const renderClinicalSection = (
    title: string,
    list: string[],
    setList: (val: string[]) => void,
    quadrants: ToothQuadrant[],
    setQuadrants: (val: ToothQuadrant[]) => void,
    sectionKey: string,
    templateFilterType: string,
    placeholder: string
  ) => {
    return (
      <div className="relative mb-3">
        <div className="bg-white rounded border border-blue-400 shadow-sm relative">
          <div className="bg-[#0088cc] text-white px-3 py-1 font-bold text-xs flex justify-between items-center select-none rounded-t">
            <span>{title}</span>
            <button
              type="button"
              onClick={() => {
                setList([...list, '']);
                setQuadrants([...quadrants, defaultQuadrant()]);
              }}
              className="hover:bg-white/20 p-0.5 rounded text-white font-bold"
              title="Add Row"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-1.5 space-y-1.5 bg-[#f0f4f9]">
            {list.map((item, i) => {
              const quad = quadrants[i] || defaultQuadrant();
              const isFocused =
                activeClinicalSuggest?.sectionKey === sectionKey &&
                activeClinicalSuggest?.index === i;

              const currentQuery = (activeClinicalSuggest?.query ?? item ?? '').trim().toLowerCase();

              const matchedTemplates = isFocused
                ? allTemplates
                    .filter((t) => {
                      const matchesCategory =
                        sectionKey === 'cc'
                          ? t.type === 'cc_auto' || t.type === 'cc'
                          : sectionKey === 'dx'
                          ? t.type === 'dx_auto' || t.type === 'treatment' || t.type === 'dx'
                          : sectionKey === 'ix'
                          ? t.type === 'ix_auto' || t.type === 'investigation' || t.type === 'ix'
                          : sectionKey === 'plan'
                          ? t.type === 'plan_auto' || t.type === 'treatment'
                          : sectionKey === 'done'
                          ? t.type === 'treatment' || t.type === 'plan_auto'
                          : sectionKey === 'note'
                          ? t.type === 'note_auto' || t.type === 'advice'
                          : t.type === templateFilterType || t.type === `${templateFilterType}_auto`;

                      if (!matchesCategory) return false;
                      if (!currentQuery) return true;
                      return (
                        t.name.toLowerCase().includes(currentQuery) ||
                        (t.content && t.content.toLowerCase().includes(currentQuery))
                      );
                    })
                    .sort((a, b) => (b.count || 0) - (a.count || 0))
                    .slice(0, 8)
                : [];

              return (
                <div key={i} className="flex items-stretch gap-1 relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (list.length > 1) {
                        setList(list.filter((_, idx) => idx !== i));
                        setQuadrants(quadrants.filter((_, idx) => idx !== i));
                      } else {
                        setList(['']);
                        setQuadrants([defaultQuadrant()]);
                      }
                    }}
                    className="w-6 border border-slate-300 bg-slate-100 hover:bg-red-50 hover:border-red-300 text-slate-500 hover:text-red-600 rounded flex items-center justify-center font-bold text-xs flex-shrink-0 transition"
                    title="Clear / Delete"
                  >
                    x
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      rows={2}
                      value={item}
                      onFocus={() => {
                        setActiveClinicalSuggest({
                          sectionKey,
                          index: i,
                          query: item,
                        });
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = [...list];
                        updated[i] = val;
                        setList(updated);
                        setActiveClinicalSuggest({
                          sectionKey,
                          index: i,
                          query: val,
                        });
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setActiveClinicalSuggest((prev) =>
                            prev?.sectionKey === sectionKey && prev?.index === i ? null : prev
                          );
                        }, 250);
                      }}
                      placeholder={placeholder}
                      className="w-full h-full p-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-blue-500 font-sans resize-y leading-tight"
                    />

                    {/* Live Autocomplete Suggestion Dropdown */}
                    {isFocused && matchedTemplates.length > 0 && (
                      <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] bg-white border-2 border-blue-500 rounded-md shadow-2xl z-[999] max-h-56 overflow-y-auto divide-y divide-slate-100">
                        <div className="bg-blue-600 text-white px-2.5 py-1 text-[11px] font-bold flex justify-between items-center sticky top-0 z-10">
                          <span>💡 {title} Autosave Suggestions ({matchedTemplates.length})</span>
                          <span className="text-blue-100 text-[9px]">Click to insert</span>
                        </div>
                        {matchedTemplates.map((tmpl) => (
                          <div
                            key={tmpl.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const updated = [...list];
                              updated[i] = tmpl.name;
                              setList(updated);
                              setActiveClinicalSuggest(null);
                            }}
                            className="p-2 hover:bg-sky-100 cursor-pointer text-xs flex justify-between items-center text-slate-800 transition"
                          >
                            <span className="font-semibold text-blue-950">{tmpl.name}</span>
                            {tmpl.count && tmpl.count > 0 ? (
                              <span className="text-[10px] bg-sky-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ml-2">
                                {tmpl.count}x
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-24 flex-shrink-0 border border-slate-300 bg-[#eef3f8] rounded overflow-hidden flex flex-col justify-between shadow-xs">
                    <div className="flex border-b border-slate-300 flex-1">
                      <input
                        type="text"
                        value={quad.ur}
                        onChange={(e) => {
                          const q = [...quadrants];
                          q[i] = { ...quad, ur: e.target.value };
                          setQuadrants(q);
                        }}
                        onClick={() =>
                          openToothPicker(sectionKey, title, i, 'ur', quad, (newQ) => {
                            const updated = [...quadrants];
                            updated[i] = newQ;
                            setQuadrants(updated);
                          })
                        }
                        title="ক্লিক করে দাঁতের ছবি ও ১-৮ নম্বর নির্বাচন করুন (UR - Upper Right)"
                        placeholder="UR"
                        className="w-1/2 text-center text-[10px] font-mono border-r border-slate-300 bg-transparent hover:bg-sky-100 hover:text-blue-900 cursor-pointer font-bold focus:bg-white focus:outline-none transition"
                      />
                      <input
                        type="text"
                        value={quad.ul}
                        onChange={(e) => {
                          const q = [...quadrants];
                          q[i] = { ...quad, ul: e.target.value };
                          setQuadrants(q);
                        }}
                        onClick={() =>
                          openToothPicker(sectionKey, title, i, 'ul', quad, (newQ) => {
                            const updated = [...quadrants];
                            updated[i] = newQ;
                            setQuadrants(updated);
                          })
                        }
                        title="ক্লিক করে দাঁতের ছবি ও ১-৮ নম্বর নির্বাচন করুন (UL - Upper Left)"
                        placeholder="UL"
                        className="w-1/2 text-center text-[10px] font-mono bg-transparent hover:bg-sky-100 hover:text-blue-900 cursor-pointer font-bold focus:bg-white focus:outline-none transition"
                      />
                    </div>
                    <div className="flex flex-1">
                      <input
                        type="text"
                        value={quad.lr}
                        onChange={(e) => {
                          const q = [...quadrants];
                          q[i] = { ...quad, lr: e.target.value };
                          setQuadrants(q);
                        }}
                        onClick={() =>
                          openToothPicker(sectionKey, title, i, 'lr', quad, (newQ) => {
                            const updated = [...quadrants];
                            updated[i] = newQ;
                            setQuadrants(updated);
                          })
                        }
                        title="ক্লিক করে দাঁতের ছবি ও ১-৮ নম্বর নির্বাচন করুন (LR - Lower Right)"
                        placeholder="LR"
                        className="w-1/2 text-center text-[10px] font-mono border-r border-slate-300 bg-transparent hover:bg-sky-100 hover:text-blue-900 cursor-pointer font-bold focus:bg-white focus:outline-none transition"
                      />
                      <input
                        type="text"
                        value={quad.ll}
                        onChange={(e) => {
                          const q = [...quadrants];
                          q[i] = { ...quad, ll: e.target.value };
                          setQuadrants(q);
                        }}
                        onClick={() =>
                          openToothPicker(sectionKey, title, i, 'll', quad, (newQ) => {
                            const updated = [...quadrants];
                            updated[i] = newQ;
                            setQuadrants(updated);
                          })
                        }
                        title="ক্লিক করে দাঁতের ছবি ও ১-৮ নম্বর নির্বাচন করুন (LL - Lower Left)"
                        placeholder="LL"
                        className="w-1/2 text-center text-[10px] font-mono bg-transparent hover:bg-sky-100 hover:text-blue-900 cursor-pointer font-bold focus:bg-white focus:outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {openDropdownSection === sectionKey && (
            <div className="border-t border-blue-200 bg-sky-50 p-2 max-h-48 overflow-y-auto divide-y divide-sky-100">
              <div className="text-[10px] font-bold text-sky-800 uppercase mb-1">{title} Presets & Autosaves</div>
              {allTemplates
                .filter((t) => {
                  if (sectionKey === 'cc') return t.type === 'cc_auto' || t.type === 'cc';
                  if (sectionKey === 'dx') return t.type === 'dx_auto' || t.type === 'treatment' || t.type === 'dx';
                  if (sectionKey === 'ix') return t.type === 'ix_auto' || t.type === 'investigation' || t.type === 'ix';
                  if (sectionKey === 'plan') return t.type === 'plan_auto' || t.type === 'treatment';
                  if (sectionKey === 'done') return t.type === 'treatment' || t.type === 'plan_auto';
                  if (sectionKey === 'note') return t.type === 'note_auto' || t.type === 'advice';
                  return t.type === templateFilterType || t.type === `${templateFilterType}_auto`;
                })
                .sort((a, b) => (b.count || 0) - (a.count || 0))
                .slice(0, 15)
                .map((t, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      const emptyIdx = list.findIndex((x) => !x.trim());
                      if (emptyIdx !== -1) {
                        const updated = [...list];
                        updated[emptyIdx] = t.name;
                        setList(updated);
                      } else {
                        setList([...list.filter(Boolean), t.name]);
                        setQuadrants([...quadrants, defaultQuadrant()]);
                      }
                      setOpenDropdownSection(null);
                    }}
                    className="py-1 px-1.5 hover:bg-white rounded cursor-pointer text-xs flex justify-between items-center"
                  >
                    <span className="font-medium text-slate-800">{t.name}</span>
                    <span className="text-blue-600 font-bold text-[10px] ml-2 shrink-0">+ Insert</span>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="flex justify-center -mt-1 relative z-10">
          <button
            type="button"
            onClick={() => setOpenDropdownSection(openDropdownSection === sectionKey ? null : sectionKey)}
            className="w-12 h-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-b-md flex items-center justify-center shadow transition cursor-pointer"
            title="Quick Suggestions"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdownSection === sectionKey ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`p-2 max-w-[1550px] mx-auto text-slate-800 ${previewModalOpen ? 'no-print' : ''}`}>
      {/* TOP PATIENT BAR & ACTION BUTTONS */}
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-2.5 mb-2 shadow-sm no-print">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Patient Details Inputs Matching Desktop Screenshot */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <div className="flex items-center space-x-1">
              <span className="text-slate-700">Name :</span>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Patient Full Name"
                className="px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 w-44 bg-white font-normal"
              />
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-slate-700">Age :</span>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                className="px-2 py-1 border border-slate-300 rounded w-14 bg-white font-normal text-center"
              />
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-slate-700">Sex :</span>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="px-1.5 py-1 border border-slate-300 rounded bg-white font-normal"
              >
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-slate-700">Address :</span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address"
                className="px-2 py-1 border border-slate-300 rounded w-36 bg-white font-normal"
              />
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-slate-700">Mobile :</span>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="px-2 py-1 border border-slate-300 rounded w-28 bg-white font-normal"
              />
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-slate-700 font-bold text-blue-900">Reg No. :</span>
              <input
                type="number"
                value={regNo}
                onChange={(e) => setRegNo(Number(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadPatientByRegNo(regNo);
                }}
                className="px-2 py-1 border border-emerald-500 bg-[#c8e6c9] text-emerald-950 font-bold rounded w-20 text-center"
              />
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-slate-700">Occ. :</span>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Occ"
                className="px-2 py-1 border border-slate-300 rounded w-20 bg-white font-normal"
              />
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-slate-700">Date :</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded bg-white font-normal text-xs"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                loadPatientByRegNo(regNo);
                setShowPatientInfoModal(true);
              }}
              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-400 rounded font-semibold text-xs shadow-sm transition"
            >
              Information
            </button>
          </div>

          {/* Action Buttons Matching Screenshot Toolbar */}
          <div className="flex items-center space-x-1.5 text-xs">
            <button
              onClick={() => {
                setPrintMode('full');
                setPreviewModalOpen(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 rounded font-medium shadow-sm transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>

            <button
              onClick={() => handleSave(true, false)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Save & Print</span>
            </button>

            <button
              onClick={() => handleSave(true, true)}
              title="Prints only medicines & findings directly on pre-printed doctor pad"
              className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium shadow transition"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Save & Print Without header</span>
            </button>

            <button
              onClick={() => handleSave(false, false)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium shadow transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Only</span>
            </button>

            <button
              onClick={handleResetForm}
              title="New Prescription"
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-12 gap-2">
        {/* LEFT COLUMN: CLINICAL FINDINGS (4 Columns) */}
        <div className="col-span-12 lg:col-span-4 space-y-1 text-xs">
          {/* 1. C/C */}
          {renderClinicalSection('C/C', ccList, setCcList, ccQuadrants, setCcQuadrants, 'cc', 'cc', 'Chief complaint details...')}

          {/* 2. H/O (Medical History Grid Matching 3 Columns) */}
          <div className="bg-white rounded border border-blue-400 overflow-hidden shadow-sm mb-3">
            <div className="bg-[#0088cc] text-white px-3 py-1 font-bold text-xs">
              <span>H/O</span>
            </div>
            <div className="p-2 bg-[#f0f4f9]">
              <div className="grid grid-cols-3 gap-1 text-[11px] bg-white p-2 rounded border border-slate-300">
                {/* Column 1 */}
                <div className="space-y-1">
                  {['HTN', 'COPD', 'CLD', 'Tobacco Chewing', 'Psychiatric disorder', 'Drug Abuse'].map((item) => (
                    <label key={item} className="flex items-center space-x-1.5 cursor-pointer hover:bg-sky-50 p-0.5 rounded select-none">
                      <input
                        type="checkbox"
                        checked={!!ho[item]}
                        onChange={(e) => setHo({ ...ho, [item]: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="truncate">{item}</span>
                    </label>
                  ))}
                </div>

                {/* Column 2 */}
                <div className="space-y-1">
                  {['DM', 'IHD', 'CVD'].map((item) => (
                    <label key={item} className="flex items-center space-x-1.5 cursor-pointer hover:bg-sky-50 p-0.5 rounded select-none">
                      <input
                        type="checkbox"
                        checked={!!ho[item]}
                        onChange={(e) => setHo({ ...ho, [item]: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="truncate">{item}</span>
                    </label>
                  ))}
                </div>

                {/* Column 3 */}
                <div className="space-y-1">
                  {['Asthma', 'CKD', 'Smoking', 'Malignancy', 'Allergy', 'Depression'].map((item) => (
                    <label key={item} className="flex items-center space-x-1.5 cursor-pointer hover:bg-sky-50 p-0.5 rounded select-none">
                      <input
                        type="checkbox"
                        checked={!!ho[item]}
                        onChange={(e) => setHo({ ...ho, [item]: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="truncate">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <textarea
                rows={2}
                value={hoCustomText}
                onChange={(e) => setHoCustomText(e.target.value)}
                placeholder="Other medical history / drug allergies..."
                className="mt-1.5 w-full p-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-blue-500 font-sans resize-y"
              />
            </div>
          </div>

          {/* 3. O/E */}
          {renderClinicalSection('O/E', oeList, setOeList, oeQuadrants, setOeQuadrants, 'oe', 'treatment', 'Tooth 46 deep caries / tender on percussion...')}

          {/* 4. I/X (Investigation) */}
          {renderClinicalSection('I/X (Investigation)', ixList, setIxList, ixQuadrants, setIxQuadrants, 'ix', 'investigation', 'IOPA X-Ray of 46 / OPG...')}

          {/* 5. D/D */}
          {renderClinicalSection('D/D', ddList, setDdList, ddQuadrants, setDdQuadrants, 'dd', 'treatment', 'Differential diagnosis...')}

          {/* 6. DX / Diagnosis */}
          {renderClinicalSection('DX / Diagnosis', dxList, setDxList, dxQuadrants, setDxQuadrants, 'dx', 'treatment', 'Acute irreversible pulpitis with apical periodontitis...')}

          {/* 7. Treatment Plan */}
          {renderClinicalSection('Treatment Plan', treatmentPlanList, setTreatmentPlanList, treatmentPlanQuadrants, setTreatmentPlanQuadrants, 'plan', 'treatment', 'Root Canal Treatment (RCT) -> Crown...')}

          {/* 8. Treatment Done */}
          {renderClinicalSection('Treatment Done', treatmentDoneList, setTreatmentDoneList, treatmentDoneQuadrants, setTreatmentDoneQuadrants, 'done', 'treatment', 'Access cavity done under LA / Ca(OH)2 dressing...')}

          {/* 9. Special Note */}
          {renderClinicalSection('Special Note', specialNoteList, setSpecialNoteList, specialNoteQuadrants, setSpecialNoteQuadrants, 'note', 'note_auto', 'Patient advised to maintain oral hygiene...')}

          {/* 10. Drug History */}
          <div className="relative mb-3">
            <div className="bg-white rounded border border-blue-400 shadow-sm relative">
              <div className="bg-[#0088cc] text-white px-3 py-1 font-bold text-xs flex justify-between items-center select-none rounded-t">
                <span>Drug History</span>
                <button
                  type="button"
                  onClick={() => setDrugHistoryList([...drugHistoryList, ''])}
                  className="hover:bg-white/20 p-0.5 rounded text-white font-bold"
                  title="Add Row"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-1.5 space-y-1.5 bg-[#f0f4f9]">
                {drugHistoryList.map((dh, i) => {
                  const isFocused = activeDrugHistoryIndex === i;
                  const q = (drugHistoryQuery ?? dh ?? '').trim().toLowerCase();

                  const matchedHistoryTemplates = isFocused
                    ? allTemplates
                        .filter((t) => t.type === 'drughistory_auto' || t.type === 'drughistory')
                        .filter((t) => {
                          if (!q) return true;
                          return (
                            t.name.toLowerCase().includes(q) ||
                            (t.content && t.content.toLowerCase().includes(q))
                          );
                        })
                        .sort((a, b) => (b.count || 0) - (a.count || 0))
                    : [];

                  const matchedDrugs = isFocused && q.length > 0
                    ? allDrugs
                        .filter(
                          (d) =>
                            d.name.toLowerCase().includes(q) ||
                            d.generic.toLowerCase().includes(q) ||
                            (d.prescriptionName && d.prescriptionName.toLowerCase().includes(q))
                        )
                        .slice(0, 10)
                    : [];

                  const totalMatches = matchedHistoryTemplates.length + matchedDrugs.length;

                  return (
                    <div key={i} className="flex items-center gap-1 relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (drugHistoryList.length > 1) {
                            setDrugHistoryList(drugHistoryList.filter((_, idx) => idx !== i));
                          } else {
                            setDrugHistoryList(['']);
                          }
                        }}
                        className="w-5 h-5 border border-slate-300 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded flex items-center justify-center font-bold text-xs flex-shrink-0"
                        title="Clear / Delete"
                      >
                        x
                      </button>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={dh}
                          onFocus={() => {
                            setActiveDrugHistoryIndex(i);
                            setDrugHistoryQuery(dh);
                          }}
                          onClick={() => {
                            setActiveDrugHistoryIndex(i);
                            setDrugHistoryQuery(dh);
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...drugHistoryList];
                            updated[i] = val;
                            setDrugHistoryList(updated);
                            setActiveDrugHistoryIndex(i);
                            setDrugHistoryQuery(val);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (dh.trim().length >= 2) {
                                autoSaveSingleDrugHistory(dh.trim());
                              }
                              setActiveDrugHistoryIndex(null);
                            }
                          }}
                          onBlur={() => {
                            if (dh.trim().length >= 2) {
                              autoSaveSingleDrugHistory(dh.trim());
                            }
                            setTimeout(() => {
                              setActiveDrugHistoryIndex((prev) => (prev === i ? null : prev));
                            }, 250);
                          }}
                          placeholder="e.g. Tab. Metformin 500mg, Tab. Losartan 50mg..."
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-blue-500 font-semibold text-blue-950"
                        />

                        {/* Live Drug History & Database Autocomplete Suggestion Dropdown */}
                        {isFocused && (
                          <div className="absolute z-[999] left-0 top-full mt-1 w-full min-w-[320px] bg-white border-2 border-blue-500 rounded-md shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                            <div className="bg-blue-600 text-white px-2.5 py-1 text-[11px] font-bold flex justify-between items-center sticky top-0 z-10">
                              <span>💡 Drug History Suggestions ({totalMatches})</span>
                              <span className="text-blue-100 text-[9px]">Click to insert</span>
                            </div>

                            {/* Instant Custom Auto-save Option if user typed new drug history text */}
                            {q.length >= 2 &&
                              !matchedHistoryTemplates.some(
                                (t) =>
                                  t.name.toLowerCase().trim() === q ||
                                  (t.content && t.content.toLowerCase().trim() === q)
                              ) && (
                                <div
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    const updated = [...drugHistoryList];
                                    updated[i] = dh.trim();
                                    setDrugHistoryList(updated);
                                    setActiveDrugHistoryIndex(null);
                                    autoSaveSingleDrugHistory(dh.trim());
                                  }}
                                  className="p-2 bg-amber-50 hover:bg-amber-100 border-b border-amber-200 cursor-pointer text-xs flex items-center justify-between transition"
                                >
                                  <div className="flex items-center space-x-1.5 text-amber-900 font-semibold">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>নতুন ড্রাগ হিস্ট্রি হিসেবে অটো-সেভ করুন: <strong>{dh}</strong></span>
                                  </div>
                                  <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-bold shrink-0">
                                    + Auto-save
                                  </span>
                                </div>
                              )}

                            {/* Saved Drug History Templates */}
                            {matchedHistoryTemplates.slice(0, 10).map((tmpl) => {
                              const textVal = tmpl.name;
                              return (
                                <div
                                  key={tmpl.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    const updated = [...drugHistoryList];
                                    updated[i] = textVal;
                                    setDrugHistoryList(updated);
                                    setActiveDrugHistoryIndex(null);
                                    autoSaveSingleDrugHistory(textVal);
                                  }}
                                  className="p-2 hover:bg-sky-100 cursor-pointer text-xs flex justify-between items-center text-slate-800 transition"
                                >
                                  <span className="font-semibold text-blue-950">{textVal}</span>
                                  {tmpl.count && tmpl.count > 0 ? (
                                    <span className="text-[10px] bg-sky-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ml-2">
                                      {tmpl.count}x
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })}

                            {/* Matched Drugs from Drugs Database */}
                            {matchedDrugs.length > 0 && (
                              <>
                                <div className="bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider sticky top-0">
                                  💊 ঔষধ ডাটাবেস ({matchedDrugs.length})
                                </div>
                                {matchedDrugs.map((drug) => {
                                  const brandVal = drug.prescriptionName || `${drug.form} ${drug.name} ${drug.strength}`;
                                  return (
                                    <div
                                      key={drug.id}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        const updated = [...drugHistoryList];
                                        updated[i] = brandVal;
                                        setDrugHistoryList(updated);
                                        setActiveDrugHistoryIndex(null);
                                        autoSaveSingleDrugHistory(brandVal);
                                      }}
                                      className="p-1.5 hover:bg-sky-100 cursor-pointer text-xs transition"
                                    >
                                      <div className="font-bold text-blue-900 text-[11px]">{brandVal}</div>
                                      <div className="text-[10px] text-slate-500 flex justify-between mt-0.5">
                                        <span>Generic: {drug.generic}</span>
                                        <span className="text-slate-400">{drug.company}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </>
                            )}

                            {totalMatches === 0 && (
                              <div className="p-3 text-center text-slate-400 text-xs">
                                কোনো ড্রাগ হিস্ট্রি পাওয়া যায়নি। নাম লিখলে স্বয়ংক্রিয়ভাবে সেভ হয়ে যাবে।
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {openDropdownSection === 'drughistory' && (
                <div className="border-t border-blue-200 bg-sky-50 p-2 max-h-56 overflow-y-auto divide-y divide-sky-100">
                  <div className="text-[10px] font-bold text-sky-800 uppercase mb-1">Drug History Presets & Autosaves</div>
                  {allTemplates
                    .filter((t) => t.type === 'drughistory_auto' || t.type === 'drughistory')
                    .sort((a, b) => (b.count || 0) - (a.count || 0))
                    .slice(0, 10)
                    .map((t, idx) => (
                      <div
                        key={t.id || idx}
                        onClick={() => {
                          const emptyIndex = drugHistoryList.findIndex((d) => !d.trim());
                          if (emptyIndex !== -1) {
                            const updated = [...drugHistoryList];
                            updated[emptyIndex] = t.name;
                            setDrugHistoryList(updated);
                          } else {
                            setDrugHistoryList([...drugHistoryList, t.name]);
                          }
                          autoSaveSingleDrugHistory(t.name);
                          setOpenDropdownSection(null);
                        }}
                        className="py-1 px-1.5 hover:bg-white rounded cursor-pointer text-xs flex justify-between items-center"
                      >
                        <span className="font-semibold text-slate-800">{t.name}</span>
                        <span className="text-blue-600 font-bold text-[10px]">+ Insert</span>
                      </div>
                    ))}
                  {['Antihypertensive drugs', 'Oral Hypoglycemic Agents (OHA)', 'Anticoagulant / Antiplatelet (Aspirin/Clopidogrel)', 'Steroid therapy', 'Bisphosphonates', 'Anti-epileptic drugs'].map((preset, idx) => (
                    <div
                      key={`preset_${idx}`}
                      onClick={() => {
                        const emptyIndex = drugHistoryList.findIndex((d) => !d.trim());
                        if (emptyIndex !== -1) {
                          const updated = [...drugHistoryList];
                          updated[emptyIndex] = preset;
                          setDrugHistoryList(updated);
                        } else {
                          setDrugHistoryList([...drugHistoryList, preset]);
                        }
                        autoSaveSingleDrugHistory(preset);
                        setOpenDropdownSection(null);
                      }}
                      className="py-1 px-1.5 hover:bg-white rounded cursor-pointer text-xs flex justify-between items-center text-slate-600"
                    >
                      <span>{preset}</span>
                      <span className="text-blue-600 font-bold text-[10px]">+ Insert</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-center -mt-1 relative z-10">
              <button
                type="button"
                onClick={() => setOpenDropdownSection(openDropdownSection === 'drughistory' ? null : 'drughistory')}
                className="w-12 h-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-b-md flex items-center justify-center shadow transition cursor-pointer"
                title="Quick Suggestions"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdownSection === 'drughistory' ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* 11. Bangla Converter */}
          <div className="bg-white rounded border border-blue-300 p-2 shadow-sm mb-2 text-xs">
            <div className="font-bold text-slate-700 mb-1 flex justify-between items-center">
              <span>Bangla Converter [ press Ctrl+M to disable bangla ]</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${banglaEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                {banglaEnabled ? 'Bangla ON' : 'Bangla OFF'}
              </span>
            </div>
            <textarea
              rows={3}
              value={banglaInput}
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key.toLowerCase() === 'm') {
                  e.preventDefault();
                  setBanglaEnabled(!banglaEnabled);
                }
              }}
              onChange={(e) => {
                const val = e.target.value;
                setBanglaInput(banglaEnabled ? convertPhoneticToBangla(val) : val);
              }}
              placeholder="এখানে বাংলা লিখুন (যেমন: khabar por, 1+0+1, 5 din)..."
              className="w-full p-1.5 border border-slate-300 rounded text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-sans resize-y"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: RX MEDICATIONS, ADVICE, CONTRACT, PAYMENT & CLINICAL EXTRAS (8 Columns) */}
        <div className="col-span-12 lg:col-span-8 space-y-2">
          {/* Rx TABLE & TEMPLATES BAR */}
          <div className="bg-white rounded border border-blue-300 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-3 py-1.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-serif italic font-bold text-lg text-yellow-300">Rx</span>
                <span className="text-xs font-semibold text-slate-200">Prescription Medicines</span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Drug Template"
                    onClick={() => {
                      setTemplateModalType('drug');
                      setShowTemplateModal(true);
                    }}
                    readOnly
                    className="px-3 py-1 bg-white text-slate-800 rounded-full text-xs font-medium cursor-pointer shadow-inner w-36 text-center"
                  />
                </div>
              </div>
            </div>

            {/* Medicine Grid Table (9 Rows Default) */}
            <div className="p-1.5 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#e4eff9] text-slate-800 border-b border-slate-300 font-bold">
                  <tr>
                    <th className="p-1.5 w-6 text-center">✥</th>
                    <th className="p-1.5 w-6 text-center">X</th>
                    <th className="p-1.5 w-8 text-center">No.</th>
                    <th className="p-1.5">Brand</th>
                    <th className="p-1.5 w-32">Dose</th>
                    <th className="p-1.5 w-44">Instruction</th>
                    <th className="p-1.5 w-24">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {medicines.map((med, index) => (
                    <tr key={index} className="hover:bg-sky-50/50">
                      <td className="p-1 text-center text-slate-400 cursor-move">✥</td>
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicineRow(index)}
                          className="w-5 h-5 border border-slate-300 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded flex items-center justify-center font-bold text-xs"
                        >
                          X
                        </button>
                      </td>
                      <td className="p-1 text-center font-bold text-slate-700">{med.no}</td>
                      <td className="p-1 relative">
                        <input
                          type="text"
                          value={med.brand}
                          onChange={(e) => {
                            handleMedicineChange(index, 'brand', e.target.value);
                            setDrugSearchQuery(e.target.value);
                            setActiveDrugIndex(index);
                          }}
                          onFocus={() => {
                            setActiveDrugIndex(index);
                            setDrugSearchQuery(med.brand || '');
                          }}
                          onBlur={() => {
                            if (med.brand.trim().length >= 2) {
                              autoSaveSingleMedicine(med);
                            }
                            setTimeout(() => {
                              setActiveDrugIndex((prev) => (prev === index ? null : prev));
                            }, 250);
                          }}
                          placeholder="Type brand/generic name..."
                          className="w-full px-2 py-1 border border-slate-300 rounded font-semibold text-blue-900 focus:outline-none focus:border-blue-500 bg-white"
                        />

                        {/* C/C-Style Live Autocomplete & Autosaved Suggestions Dropdown */}
                        {activeDrugIndex === index && (() => {
                          const q = (drugSearchQuery ?? med.brand ?? '').trim().toLowerCase();

                          // 1. Matched templates (drug_auto & drug) sorted by frequency count (descending)
                          const matchedTemplates = allTemplates
                            .filter((t) => t.type === 'drug_auto' || t.type === 'drug')
                            .filter((t) => {
                              if (!q) return true;
                              return (
                                t.name.toLowerCase().includes(q) ||
                                (t.content && t.content.toLowerCase().includes(q))
                              );
                            })
                            .sort((a, b) => (b.count || 0) - (a.count || 0));

                          // 2. Matched drugs from allDrugs (when user types)
                          const matchedDrugs = q.length > 0
                            ? allDrugs
                                .filter(
                                  (d) =>
                                    d.name.toLowerCase().includes(q) ||
                                    d.generic.toLowerCase().includes(q) ||
                                    (d.prescriptionName && d.prescriptionName.toLowerCase().includes(q))
                                )
                                .slice(0, 10)
                            : [];

                          const totalCount = matchedTemplates.length + (q.length > 0 ? matchedDrugs.length : 0);

                          return (
                            <div className="absolute z-[999] left-0 top-full mt-1 w-96 bg-white border-2 border-blue-500 rounded-lg shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                              <div className="bg-blue-600 text-white px-2.5 py-1 text-[11px] font-bold flex justify-between items-center sticky top-0 z-10">
                                <span>💡 Rx Autosave Suggestions ({totalCount})</span>
                                <span className="text-blue-100 text-[9px]">Click to insert</span>
                              </div>

                              {/* Instant Custom Auto-save Option if user typed a new brand name */}
                              {q.length >= 2 && !matchedTemplates.some((t) => t.name.toLowerCase().trim() === q) && (
                                <div
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    const updated = [...medicines];
                                    const newMed = {
                                      ...updated[index],
                                      brand: med.brand.trim(),
                                      dose: updated[index].dose || '১+০+১',
                                      instruction: updated[index].instruction || 'খাবারের পর',
                                      duration: updated[index].duration || '০৫ দিন',
                                    };
                                    updated[index] = newMed;
                                    setMedicines(updated);
                                    setActiveDrugIndex(null);
                                    autoSaveSingleMedicine(newMed);
                                  }}
                                  className="p-2 bg-amber-50 hover:bg-amber-100 border-b border-amber-200 cursor-pointer text-xs flex items-center justify-between transition"
                                >
                                  <div className="flex items-center space-x-1.5 text-amber-900 font-semibold">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>নতুন ওষুধ হিসেবে অটো-সেভ করুন: <strong>{med.brand}</strong></span>
                                  </div>
                                  <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-bold shrink-0">
                                    + Auto-save
                                  </span>
                                </div>
                              )}

                              {/* Autosaved Templates (C/C Style with Frequency Badges) */}
                              {matchedTemplates.slice(0, 10).map((tmpl) => {
                                let parsedDose = '১+০+১';
                                let parsedInst = 'খাবারের পর';
                                let parsedDur = '০৫ দিন';
                                if (tmpl.content) {
                                  try {
                                    const p = JSON.parse(tmpl.content);
                                    if (p.dose) parsedDose = p.dose;
                                    if (p.instruction) parsedInst = p.instruction;
                                    if (p.duration) parsedDur = p.duration;
                                  } catch (e) {
                                    const parts = tmpl.content.split(',');
                                    if (parts[0]) parsedDose = parts[0].trim();
                                    if (parts[1]) parsedInst = parts[1].trim();
                                    if (parts[2]) parsedDur = parts[2].trim();
                                  }
                                }
                                return (
                                  <div
                                    key={tmpl.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      const updated = [...medicines];
                                      const newMed = {
                                        ...updated[index],
                                        brand: tmpl.name,
                                        dose: parsedDose,
                                        instruction: parsedInst,
                                        duration: parsedDur,
                                      };
                                      updated[index] = newMed;
                                      setMedicines(updated);
                                      setActiveDrugIndex(null);
                                      autoSaveSingleMedicine(newMed);
                                    }}
                                    className="p-2 hover:bg-sky-100 cursor-pointer text-xs flex justify-between items-center text-slate-800 transition"
                                  >
                                    <div>
                                      <div className="font-semibold text-blue-950 flex items-center space-x-1.5">
                                        <span>{tmpl.name}</span>
                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                          ⭐ Autosaved
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-2">
                                        <span className="font-mono text-emerald-700 font-semibold">{parsedDose}</span>
                                        <span>•</span>
                                        <span>{parsedInst}</span>
                                        <span>•</span>
                                        <span className="text-purple-700">{parsedDur}</span>
                                      </div>
                                    </div>
                                    {tmpl.count && tmpl.count > 0 ? (
                                      <span className="text-[10px] bg-sky-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ml-2">
                                        {tmpl.count}x
                                      </span>
                                    ) : null}
                                  </div>
                                );
                              })}

                              {/* More matches from Drug Database */}
                              {matchedDrugs.length > 0 && (
                                <div className="bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase sticky top-7 z-10 border-y border-slate-200">
                                  💊 Drug Database Matches
                                </div>
                              )}
                              {matchedDrugs
                                .filter(
                                  (d) =>
                                    !matchedTemplates.some(
                                      (t) =>
                                        t.name.toLowerCase().trim() ===
                                        (d.prescriptionName || d.name).toLowerCase().trim()
                                    )
                                )
                                .slice(0, 8)
                                .map((drug) => {
                                  const brandName =
                                    drug.prescriptionName || `${drug.form} ${drug.name} ${drug.strength}`;
                                  return (
                                    <div
                                      key={drug.id}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectDrug(index, drug);
                                      }}
                                      className="p-2 hover:bg-sky-50 cursor-pointer border-b border-slate-100 text-xs transition"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-blue-900">{brandName}</span>
                                        <span className="text-[10px] text-slate-400">{drug.company}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 flex justify-between mt-0.5">
                                        <span>Generic: {drug.generic}</span>
                                        <span className="text-blue-600 font-semibold text-[9px]">+ Click to Auto-save</span>
                                      </div>
                                    </div>
                                  );
                                })}

                              {totalCount === 0 && (
                                <div className="p-3 text-center text-slate-400 text-xs">
                                  কোনো সংরক্ষিত বা ড্রাগ ডাটাবেজ পাওয়া যায়নি। টাইপ করে লিখলে স্বয়ংক্রিয়ভাবে সেভ হয়ে যাবে।
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={med.dose}
                          onChange={(e) =>
                            handleMedicineChange(index, 'dose', convertEnglishToBanglaDigits(e.target.value))
                          }
                          onBlur={() => {
                            if (med.brand.trim().length >= 2) {
                              autoSaveSingleMedicine(med);
                            }
                          }}
                          placeholder="১+০+১"
                          className="w-full px-2 py-1 border border-slate-300 rounded font-medium text-slate-700 bg-white"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={med.instruction}
                          onChange={(e) =>
                            handleMedicineChange(index, 'instruction', convertPhoneticToBangla(e.target.value))
                          }
                          onBlur={() => {
                            if (med.brand.trim().length >= 2) {
                              autoSaveSingleMedicine(med);
                            }
                          }}
                          placeholder="খাবারের পর"
                          className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) =>
                            handleMedicineChange(index, 'duration', convertPhoneticToBangla(e.target.value))
                          }
                          onBlur={() => {
                            if (med.brand.trim().length >= 2) {
                              autoSaveSingleMedicine(med);
                            }
                          }}
                          placeholder="০৫ দিন"
                          className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleAddMedicineRow}
                  className="px-4 py-1 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded font-bold text-xs shadow"
                >
                  Add More (+)
                </button>
              </div>

              {/* MedX Real-time Clinical Drug Interaction Alert */}
              {(() => {
                const interactions = checkMedXDrugInteractions(medicines.map((m) => m.brand).filter(Boolean));
                if (interactions.length === 0) return null;

                return (
                  <div className="mt-3 bg-red-50 border-2 border-red-400 rounded-lg p-3 text-red-900 shadow-sm">
                    <div className="flex items-center space-x-2 font-bold text-xs text-red-800 mb-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                      <span>MedX Clinical Safety Alert: {interactions.length} Drug Interaction(s) Detected!</span>
                    </div>
                    <div className="space-y-2">
                      {interactions.map((alert, idx) => (
                        <div key={idx} className="bg-white/80 border border-red-200 rounded p-2 text-[11px] leading-relaxed">
                          <div className="flex items-center justify-between font-bold text-red-900">
                            <span>⚠️ {alert.drugA} + {alert.drugB}</span>
                            <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px]">{alert.severityText}</span>
                          </div>
                          <p className="mt-1 text-red-800 font-semibold">{alert.clinicalEffect}</p>
                          <p className="text-slate-600 mt-0.5 text-[10px]">
                            <span className="font-semibold text-slate-700">Mechanism:</span> {alert.mechanism}
                          </p>
                          <p className="text-emerald-800 mt-1 font-semibold text-[10px] bg-emerald-50 p-1 rounded border border-emerald-200">
                            💡 Recommendation: {alert.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ADVICE & NEXT VISIT (Side by Side Matching Screenshot) */}
          <div className="grid grid-cols-12 gap-2 text-xs">
            {/* Advice Section */}
            <div className="col-span-12 md:col-span-7 relative">
              <div className="bg-white rounded border border-blue-300 p-2 shadow-sm">
                <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-200">
                  <span className="font-bold text-slate-800 text-xs">উপদেশঃ</span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setAdviceList([...adviceList, ''])}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold flex items-center space-x-1 transition"
                      title="Add Line"
                    >
                      <Plus className="w-3 h-3" />
                      <span>যোগ করুন</span>
                    </button>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="🔍 Advice Template"
                        onClick={() => {
                          setTemplateModalType('advice');
                          setShowTemplateModal(true);
                        }}
                        readOnly
                        className="px-3 py-0.5 bg-white border border-slate-300 text-slate-800 rounded-full text-xs font-medium cursor-pointer shadow-inner w-36 text-center"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  {adviceList.map((adv, idx) => {
                    const isFocused =
                      activeClinicalSuggest?.sectionKey === 'advice' &&
                      activeClinicalSuggest?.index === idx;

                    const q = (activeClinicalSuggest?.query ?? adv ?? '').trim().toLowerCase();

                    const matchedAdviceTemplates = isFocused
                      ? allTemplates
                          .filter((t) => t.type === 'advice_auto' || t.type === 'advice')
                          .filter((t) => {
                            if (!q) return true;
                            return (
                              t.name.toLowerCase().includes(q) ||
                              (t.content && t.content.toLowerCase().includes(q))
                            );
                          })
                          .sort((a, b) => (b.count || 0) - (a.count || 0))
                      : [];

                    return (
                      <div key={idx} className="flex items-center space-x-1 relative">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...adviceList];
                            if (adviceList.length > 1) {
                              updated.splice(idx, 1);
                            } else {
                              updated[0] = '';
                            }
                            setAdviceList(updated);
                          }}
                          className="w-5 h-5 border border-slate-300 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded flex items-center justify-center font-bold text-xs shrink-0"
                          title="Clear / Delete"
                        >
                          x
                        </button>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={adv}
                            onFocus={() => {
                              setActiveClinicalSuggest({
                                sectionKey: 'advice',
                                index: idx,
                                query: adv,
                              });
                            }}
                            onChange={(e) => {
                              const converted = convertPhoneticToBangla(e.target.value);
                              const updated = [...adviceList];
                              updated[idx] = converted;
                              setAdviceList(updated);
                              setActiveClinicalSuggest({
                                sectionKey: 'advice',
                                index: idx,
                                query: converted,
                              });
                            }}
                            onBlur={() => {
                              if (adv.trim().length >= 2) {
                                autoSaveSingleAdvice(adv);
                              }
                              setTimeout(() => {
                                setActiveClinicalSuggest((prev) =>
                                  prev?.sectionKey === 'advice' && prev?.index === idx ? null : prev
                                );
                              }, 250);
                            }}
                            placeholder="নরম ও ঠান্ডা খাবার খাবেন..."
                            className="w-full px-2 py-0.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-blue-500 font-medium"
                          />

                          {/* C/C-Style Live Autocomplete & Autosaved Suggestions Dropdown */}
                          {isFocused && (
                            <div className="absolute left-0 top-full mt-1 w-full min-w-[300px] bg-white border-2 border-blue-500 rounded-md shadow-2xl z-[999] max-h-56 overflow-y-auto divide-y divide-slate-100">
                              <div className="bg-blue-600 text-white px-2.5 py-1 text-[11px] font-bold flex justify-between items-center sticky top-0 z-10">
                                <span>💡 উপদেশ Autosave Suggestions ({matchedAdviceTemplates.length})</span>
                                <span className="text-blue-100 text-[9px]">Click to insert</span>
                              </div>

                              {/* Instant Custom Auto-save Option if user typed new advice text */}
                              {q.length >= 2 &&
                                !matchedAdviceTemplates.some(
                                  (t) =>
                                    t.name.toLowerCase().trim() === q ||
                                    (t.content && t.content.toLowerCase().trim() === q)
                                ) && (
                                  <div
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      const updated = [...adviceList];
                                      updated[idx] = adv.trim();
                                      setAdviceList(updated);
                                      setActiveClinicalSuggest(null);
                                      autoSaveSingleAdvice(adv.trim());
                                    }}
                                    className="p-2 bg-amber-50 hover:bg-amber-100 border-b border-amber-200 cursor-pointer text-xs flex items-center justify-between transition"
                                  >
                                    <div className="flex items-center space-x-1.5 text-amber-900 font-semibold">
                                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span>নতুন উপদেশ হিসেবে অটো-সেভ করুন: <strong>{adv}</strong></span>
                                    </div>
                                    <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-bold shrink-0">
                                      + Auto-save
                                    </span>
                                  </div>
                                )}

                              {/* Saved Advice Templates */}
                              {matchedAdviceTemplates.slice(0, 10).map((tmpl) => {
                                const textVal = tmpl.content || tmpl.name;
                                return (
                                  <div
                                    key={tmpl.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      const updated = [...adviceList];
                                      updated[idx] = textVal;
                                      setAdviceList(updated);
                                      setActiveClinicalSuggest(null);
                                      autoSaveSingleAdvice(textVal);
                                    }}
                                    className="p-2 hover:bg-sky-100 cursor-pointer text-xs flex justify-between items-center text-slate-800 transition"
                                  >
                                    <span className="font-semibold text-blue-950">{textVal}</span>
                                    {tmpl.count && tmpl.count > 0 ? (
                                      <span className="text-[10px] bg-sky-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ml-2">
                                        {tmpl.count}x
                                      </span>
                                    ) : null}
                                  </div>
                                );
                              })}

                              {matchedAdviceTemplates.length === 0 && (
                                <div className="p-3 text-center text-slate-400 text-xs">
                                  কোনো সংরক্ষিত উপদেশ পাওয়া যায়নি। টাইপ করে লিখলে স্বয়ংক্রিয়ভাবে সেভ হয়ে যাবে।
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Collapsible Drawer for Presets & Autosaves matching C/C style */}
                {openDropdownSection === 'advice' && (
                  <div className="border-t border-blue-200 bg-sky-50 p-2 max-h-48 overflow-y-auto divide-y divide-sky-100 mt-2 rounded">
                    <div className="text-[10px] font-bold text-sky-800 uppercase mb-1">উপদেশ Presets & Autosaves</div>
                    {allTemplates
                      .filter((t) => t.type === 'advice_auto' || t.type === 'advice')
                      .sort((a, b) => (b.count || 0) - (a.count || 0))
                      .slice(0, 15)
                      .map((t, i) => {
                        const textVal = t.content || t.name;
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              const emptyIdx = adviceList.findIndex((x) => !x.trim());
                              if (emptyIdx !== -1) {
                                const updated = [...adviceList];
                                updated[emptyIdx] = textVal;
                                setAdviceList(updated);
                              } else {
                                setAdviceList([...adviceList.filter(Boolean), textVal]);
                              }
                              autoSaveSingleAdvice(textVal);
                              setOpenDropdownSection(null);
                            }}
                            className="py-1 px-1.5 hover:bg-white rounded cursor-pointer text-xs flex justify-between items-center"
                          >
                            <span className="font-medium text-slate-800">{textVal}</span>
                            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                              {t.count && t.count > 0 && (
                                <span className="text-[10px] bg-white border border-sky-200 text-blue-700 px-1.5 py-0.2 rounded font-mono font-bold">
                                  {t.count}x
                                </span>
                              )}
                              <span className="text-blue-600 font-bold text-[10px]">+ Insert</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="flex justify-center -mt-1 relative z-10">
                <button
                  type="button"
                  onClick={() => setOpenDropdownSection(openDropdownSection === 'advice' ? null : 'advice')}
                  className="w-12 h-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-b-md flex items-center justify-center shadow transition cursor-pointer"
                  title="Quick Advice Presets"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdownSection === 'advice' ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Next Visit Section Matching Screenshot */}
            <div className="col-span-12 md:col-span-5 bg-white rounded border border-blue-300 p-2 shadow-sm space-y-1">
              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-4 text-slate-700 font-semibold text-right pr-1">পরবর্তী সাক্ষাৎ</span>
                <select
                  value={revisitOption}
                  onChange={(e) => setRevisitOption(e.target.value)}
                  className="col-span-8 px-2 py-0.5 border border-slate-300 rounded bg-white text-xs font-semibold text-slate-800"
                >
                  <option value="প্রয়োজন নেই">প্রয়োজন নেই</option>
                  <option value="০৩ দিন পর">০৩ দিন পর</option>
                  <option value="০৫ দিন পর">০৫ দিন পর</option>
                  <option value="০৭ দিন পর">০৭ দিন পর</option>
                  <option value="১০ দিন পর">১০ দিন পর</option>
                  <option value="১৫ দিন পর">১৫ দিন পর</option>
                  <option value="০১ মাস পর">০১ মাস পর</option>
                </select>
              </div>

              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-4 text-slate-700 font-semibold text-right pr-1">তারিখ</span>
                <input
                  type="date"
                  value={nextVisitDate}
                  onChange={(e) => setNextVisitDate(e.target.value)}
                  className="col-span-8 px-2 py-0.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>

              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-4 text-slate-700 font-semibold text-right pr-1">সময়</span>
                <input
                  type="text"
                  value={nextVisitTime}
                  onChange={(e) => setNextVisitTime(e.target.value)}
                  placeholder="e.g. 05:00 PM"
                  className="col-span-8 px-2 py-0.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>

              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-4 text-slate-700 font-semibold text-right pr-1">জন্মসাল</span>
                <input
                  type="text"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="e.g. 1995"
                  className="col-span-8 px-2 py-0.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>

              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-4 text-slate-700 font-semibold text-right pr-1">রেফার্ড বাই</span>
                <input
                  type="text"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value)}
                  placeholder="Referred Doctor"
                  className="col-span-8 px-2 py-0.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>

              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-4 text-slate-700 font-semibold text-right pr-1">ভিজিট নং</span>
                <input
                  type="number"
                  value={visitNo}
                  onChange={(e) => setVisitNo(Number(e.target.value))}
                  className="col-span-8 px-2 py-0.5 border border-slate-300 rounded text-xs text-center font-bold bg-white"
                />
              </div>
            </div>
          </div>

          {/* CONTRACT ENTRY SECTION (Matching Screenshot 2 & 3) */}
          <div className="bg-[#d5e4f2] border border-[#a2c2e2] rounded p-2 shadow-sm text-xs mb-2">
            <div className="font-bold text-slate-900 text-sm mb-1.5 text-center">Contract Entry</div>
            <div className="grid grid-cols-12 gap-3">
              {/* Left Contract Table */}
              <div className="col-span-12 md:col-span-7">
                <div className="border border-slate-400 bg-white rounded relative">
                  <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-300 text-center font-bold text-[11px] py-1 text-slate-700">
                    <div className="col-span-1">X</div>
                    <div className="col-span-5">Particularis</div>
                    <div className="col-span-3">Quadrant</div>
                    <div className="col-span-3">Price/ TK.</div>
                  </div>
                  <div className="divide-y divide-slate-200 bg-[#f7f9fc]">
                    {contractRows.map((row, idx) => {
                      const isFocused = activeContractIndex === idx;
                      const q = (contractSearchQuery ?? row.particulars ?? '').trim().toLowerCase();

                      const matchedCostTemplates = isFocused
                        ? allTemplates
                            .filter((t) => {
                              const isCost =
                                t.type === 'cost' ||
                                t.type === 'cost_auto' ||
                                t.type === 'treatment' ||
                                t.type === 'treatment_auto';
                              if (!isCost) return false;
                              if (!q) return true;
                              return (
                                t.name.toLowerCase().includes(q) ||
                                (t.content && t.content.toLowerCase().includes(q)) ||
                                (t.price !== undefined && t.price.toString().includes(q))
                              );
                            })
                            .sort((a, b) => {
                              if ((b.count || 0) !== (a.count || 0)) {
                                return (b.count || 0) - (a.count || 0);
                              }
                              return a.name.localeCompare(b.name);
                            })
                            .slice(0, 15)
                        : [];

                      return (
                        <div
                          key={idx}
                          className={`grid grid-cols-12 items-center gap-1 p-1 ${
                            isFocused ? 'relative z-30' : 'relative z-10'
                          }`}
                        >
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...contractRows];
                                updated[idx] = { particulars: '', quadrant: defaultQuadrant(), price: 0, unitPrice: 0 };
                                setContractRows(updated);
                              }}
                              className="w-5 h-5 border border-slate-300 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded flex items-center justify-center font-bold text-xs"
                            >
                              x
                            </button>
                          </div>
                          <div className="col-span-5 relative">
                            <input
                              type="text"
                              value={row.particulars}
                              onFocus={() => {
                                setActiveContractIndex(idx);
                                setContractSearchQuery(row.particulars);
                              }}
                              onClick={() => {
                                setActiveContractIndex(idx);
                                setContractSearchQuery(row.particulars);
                              }}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = [...contractRows];
                                updated[idx] = { ...row, particulars: val };
                                setContractRows(updated);
                                setContractSearchQuery(val);
                                setActiveContractIndex(idx);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (row.particulars.trim().length >= 2) {
                                    autoSaveContractProcedure(row.particulars, row.unitPrice || row.price);
                                  }
                                  setActiveContractIndex(null);
                                }
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  setActiveContractIndex((prev) => (prev === idx ? null : prev));
                                }, 250);
                                if (row.particulars.trim().length >= 2) {
                                  autoSaveContractProcedure(row.particulars, row.unitPrice || row.price);
                                }
                              }}
                              placeholder="e.g. RCT + Zirconia Crown"
                              className="w-full px-1.5 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-blue-500 font-medium"
                            />

                            {/* Live Cost Template Suggestions Dropdown */}
                            {isFocused && (
                              <div className="absolute left-0 top-full mt-1 w-full min-w-[320px] sm:min-w-[380px] bg-white border-2 border-blue-500 rounded-lg shadow-2xl z-[9999] max-h-64 overflow-y-auto divide-y divide-slate-100">
                                <div className="bg-blue-600 text-white px-2.5 py-1 text-[11px] font-bold flex justify-between items-center sticky top-0 z-10">
                                  <span>💡 ট্রিটমেন্ট কস্ট সাজেশন ({matchedCostTemplates.length})</span>
                                  <span className="text-blue-100 text-[9px]">দাঁতের সংখ্যা অনুযায়ী গুণ হবে</span>
                                </div>

                                {/* Auto-save New Procedure Option if user typed custom name */}
                                {q.length >= 2 && !matchedCostTemplates.some((t) => t.name.toLowerCase().trim() === q) && (
                                  <div
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      const updated = [...contractRows];
                                      const unitPrice = row.unitPrice || row.price;
                                      updated[idx] = { ...row, particulars: row.particulars.trim(), unitPrice };
                                      setContractRows(updated);
                                      setActiveContractIndex(null);
                                      autoSaveContractProcedure(row.particulars.trim(), unitPrice);
                                    }}
                                    className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border-b border-emerald-200 cursor-pointer text-xs flex items-center justify-between transition group"
                                  >
                                    <div className="flex items-center space-x-1.5 text-emerald-900 font-semibold">
                                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
                                      <span>ট্রিটমেন্ট কস্ট টেমপ্লেটে নতুন সেভ করুন: <strong className="text-emerald-950 underline">{row.particulars}</strong></span>
                                    </div>
                                    <span className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded-md font-bold shadow-xs">
                                      + অটো-সেভ করুন
                                    </span>
                                  </div>
                                )}

                                {/* Suggestions List */}
                                {matchedCostTemplates.map((tmpl) => (
                                  <div
                                    key={tmpl.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      const unitPrice = tmpl.price !== undefined && tmpl.price > 0 ? tmpl.price : 0;
                                      const { price } = calculateContractRowPrice(row, row.quadrant, unitPrice);
                                      const updated = [...contractRows];
                                      updated[idx] = {
                                        ...row,
                                        particulars: tmpl.name,
                                        unitPrice,
                                        price,
                                      };
                                      setContractRows(updated);
                                      setActiveContractIndex(null);
                                      autoSaveContractProcedure(tmpl.name, unitPrice);
                                    }}
                                    className="p-2 hover:bg-sky-50 cursor-pointer text-xs flex justify-between items-center text-slate-800 transition"
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <span className="font-semibold text-blue-950">{tmpl.name}</span>
                                      {tmpl.count && tmpl.count > 0 ? (
                                        <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-mono font-bold">
                                          {tmpl.count}x
                                        </span>
                                      ) : null}
                                    </div>
                                    {tmpl.price !== undefined && tmpl.price > 0 ? (
                                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono shrink-0 ml-2">
                                        ৳ {tmpl.price} / দাঁত
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">মূল্য নেই</span>
                                    )}
                                  </div>
                                ))}

                                {matchedCostTemplates.length === 0 && (
                                  <div className="p-3 text-center text-slate-400 text-xs">
                                    কোনো ট্রিটমেন্ট কস্ট টেমপ্লেট মেলেনি। টাইপ করে নতুন চিকিৎসা যোগ করতে পারেন।
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="col-span-3">
                            <div className="border border-slate-300 bg-white rounded flex flex-col justify-between h-8">
                              <div className="flex border-b border-slate-300 flex-1">
                                <input
                                  type="text"
                                  value={row.quadrant.ur}
                                  onChange={(e) => {
                                    const newQuad = { ...row.quadrant, ur: e.target.value };
                                    const { price, unitPrice } = calculateContractRowPrice(row, newQuad);
                                    const updated = [...contractRows];
                                    updated[idx] = { ...row, quadrant: newQuad, price, unitPrice };
                                    setContractRows(updated);
                                  }}
                                  onClick={() =>
                                    openToothPicker('contract', row.particulars || 'Treatment Contract', idx, 'ur', row.quadrant, (saved) => {
                                      const { price, unitPrice } = calculateContractRowPrice(row, saved);
                                      const updated = [...contractRows];
                                      updated[idx] = { ...row, quadrant: saved, price, unitPrice };
                                      setContractRows(updated);
                                    })
                                  }
                                  title="ক্লিক করে দাঁতের ছবি ও ১-৮ নম্বর নির্বাচন করুন (UR)"
                                  className="w-1/2 text-center text-[9px] font-mono border-r border-slate-300 hover:bg-sky-100 hover:text-blue-900 cursor-pointer font-bold transition"
                                  placeholder="UR"
                                />
                                <input
                                  type="text"
                                  value={row.quadrant.ul}
                                  onChange={(e) => {
                                    const newQuad = { ...row.quadrant, ul: e.target.value };
                                    const { price, unitPrice } = calculateContractRowPrice(row, newQuad);
                                    const updated = [...contractRows];
                                    updated[idx] = { ...row, quadrant: newQuad, price, unitPrice };
                                    setContractRows(updated);
                                  }}
                                  onClick={() =>
                                    openToothPicker('contract', row.particulars || 'Treatment Contract', idx, 'ul', row.quadrant, (saved) => {
                                      const { price, unitPrice } = calculateContractRowPrice(row, saved);
                                      const updated = [...contractRows];
                                      updated[idx] = { ...row, quadrant: saved, price, unitPrice };
                                      setContractRows(updated);
                                    })
                                  }
                                  title="ক্লিক করে দাঁতের ছবি ও ১-৮ নম্বর নির্বাচন করুন (UL)"
                                  className="w-1/2 text-center text-[9px] font-mono hover:bg-sky-100 hover:text-blue-900 cursor-pointer font-bold transition"
                                  placeholder="UL"
                                />
                              </div>
                              <div className="flex flex-1">
                                <input
                                  type="text"
                                  value={row.quadrant.lr}
                                  onChange={(e) => {
                                    const newQuad = { ...row.quadrant, lr: e.target.value };
                                    const { price, unitPrice } = calculateContractRowPrice(row, newQuad);
                                    const updated = [...contractRows];
                                    updated[idx] = { ...row, quadrant: newQuad, price, unitPrice };
                                    setContractRows(updated);
                                  }}
                                  onClick={() =>
                                    openToothPicker('contract', row.particulars || 'Treatment Contract', idx, 'lr', row.quadrant, (saved) => {
                                      const { price, unitPrice } = calculateContractRowPrice(row, saved);
                                      const updated = [...contractRows];
                                      updated[idx] = { ...row, quadrant: saved, price, unitPrice };
                                      setContractRows(updated);
                                    })
                                  }
                                  title="ক্লিক করে দাঁতের ছবি ও ১-৮ নম্বর নির্বাচন করুন (LR)"
                                  className="w-1/2 text-center text-[9px] font-mono border-r border-slate-300 hover:bg-sky-100 hover:text-blue-900 cursor-pointer font-bold transition"
                                  placeholder="LR"
                                />
                                <input
                                  type="text"
                                  value={row.quadrant.ll}
                                  onChange={(e) => {
                                    const newQuad = { ...row.quadrant, ll: e.target.value };
                                    const { price, unitPrice } = calculateContractRowPrice(row, newQuad);
                                    const updated = [...contractRows];
                                    updated[idx] = { ...row, quadrant: newQuad, price, unitPrice };
                                    setContractRows(updated);
                                  }}
                                  onClick={() =>
                                    openToothPicker('contract', row.particulars || 'Treatment Contract', idx, 'll', row.quadrant, (saved) => {
                                      const { price, unitPrice } = calculateContractRowPrice(row, saved);
                                      const updated = [...contractRows];
                                      updated[idx] = { ...row, quadrant: saved, price, unitPrice };
                                      setContractRows(updated);
                                    })
                                  }
                                  title="ক্লিক করে দাঁতের ছবি ও ১-৮ নম্বর নির্বাচন করুন (LL)"
                                  className="w-1/2 text-center text-[9px] font-mono hover:bg-sky-100 hover:text-blue-900 cursor-pointer font-bold transition"
                                  placeholder="LL"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="col-span-3 flex flex-col justify-center">
                            <input
                              type="number"
                              value={row.price || ''}
                              onChange={(e) => {
                                const newPrice = Number(e.target.value);
                                const updated = [...contractRows];
                                updated[idx] = { ...row, price: newPrice, unitPrice: newPrice };
                                setContractRows(updated);
                              }}
                              onBlur={() => {
                                if (row.particulars.trim().length >= 2 && row.price > 0) {
                                  autoSaveContractProcedure(row.particulars, row.unitPrice || row.price);
                                }
                              }}
                              placeholder="0"
                              className="w-full px-1.5 py-1 border border-slate-300 rounded text-xs bg-white text-right font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                            {countQuadrantTeeth(row.quadrant) > 1 && (row.unitPrice || row.price > 0) ? (
                              <div
                                className="text-[9px] text-blue-700 font-mono text-right font-semibold truncate mt-0.5"
                                title={`${countQuadrantTeeth(row.quadrant)}টি দাঁত × ৳${row.unitPrice || row.price}`}
                              >
                                {countQuadrantTeeth(row.quadrant)}টি দাঁত × ৳{row.unitPrice || row.price}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-center -mt-1 relative z-10">
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateModalType('cost');
                      setShowTemplateModal(true);
                    }}
                    className="w-12 h-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-b-md flex items-center justify-center shadow transition cursor-pointer"
                    title="Load Cost Template"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Contract Calculation Fields */}
              <div className="col-span-12 md:col-span-5 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-700 font-semibold w-28">Contract No</span>
                  <input
                    type="text"
                    value={contractNo}
                    onChange={(e) => setContractNo(e.target.value)}
                    className="w-full px-2 py-0.5 border border-slate-300 rounded bg-white text-center font-bold"
                  />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-700 font-semibold w-28">Total Bill</span>
                  <input
                    type="number"
                    value={totalBill || ''}
                    readOnly
                    className="w-full px-2 py-0.5 border border-slate-300 rounded bg-slate-100 text-right font-bold text-slate-900"
                  />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-700 font-semibold w-28">Discount (TK)</span>
                  <input
                    type="number"
                    step="any"
                    value={discountTk || ''}
                    onChange={(e) => {
                      const rawVal = e.target.value;
                      if (rawVal === '') {
                        setDiscountTk(0);
                        setDiscountPercent(0);
                        return;
                      }
                      const valTk = Math.max(0, Number(rawVal) || 0);
                      setDiscountTk(valTk);
                      if (totalBill > 0 && valTk > 0) {
                        const pct = Math.round(((valTk / totalBill) * 100) * 100) / 100;
                        setDiscountPercent(pct);
                      } else {
                        setDiscountPercent(0);
                      }
                    }}
                    placeholder="0"
                    className="w-full px-2 py-0.5 border border-slate-300 rounded bg-white text-right font-medium"
                  />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-700 font-semibold w-28">Discount (%)</span>
                  <input
                    type="number"
                    step="any"
                    value={discountPercent || ''}
                    onChange={(e) => {
                      const rawVal = e.target.value;
                      if (rawVal === '') {
                        setDiscountPercent(0);
                        setDiscountTk(0);
                        return;
                      }
                      const valPct = Math.max(0, Number(rawVal) || 0);
                      setDiscountPercent(valPct);
                      if (totalBill > 0 && valPct > 0) {
                        const tk = Math.round((totalBill * valPct) / 100);
                        setDiscountTk(tk);
                      } else {
                        setDiscountTk(0);
                      }
                    }}
                    placeholder="0"
                    className="w-full px-2 py-0.5 border border-slate-300 rounded bg-white text-right font-medium"
                  />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-700 font-semibold w-28">Payable Amount</span>
                  <input
                    type="number"
                    value={payableAmount || ''}
                    readOnly
                    className="w-full px-2 py-0.5 border border-emerald-400 rounded bg-emerald-50 text-right font-bold text-emerald-900"
                  />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-700 font-semibold w-28">Contact Status</span>
                  <select
                    value={contractStatus}
                    onChange={(e: any) => setContractStatus(e.target.value)}
                    className="w-full px-2 py-0.5 border border-yellow-400 rounded bg-[#fffc80] font-bold text-yellow-950 text-xs text-center"
                  >
                    <option value="Open">Open</option>
                    <option value="In-Progress">In-Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1 — PAYMENT ENTRY (পেমেন্ট ও লেজার) */}
          <div className="bg-gradient-to-b from-[#f0f6fc] to-[#e4eff9] border border-[#b2d2ec] rounded-lg p-3 shadow-sm text-xs mb-3">
            <div className="flex flex-wrap justify-between items-center pb-2 mb-2.5 border-b border-[#c8ddf0]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-baseline space-x-1.5">
                    <h3 className="font-bold text-slate-900 text-sm">Payment Entry</h3>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded">
                      পেমেন্ট ও লেজার
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">Record patient payments, track billing & live ledger</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 mt-1 sm:mt-0">
                <span className="text-slate-600 font-semibold text-[11px]">Contract Status:</span>
                <select
                  value={contractStatus}
                  onChange={(e: any) => setContractStatus(e.target.value)}
                  className="px-2 py-0.5 border border-yellow-400 rounded bg-[#fffc80] font-bold text-yellow-950 text-xs shadow-xs focus:outline-none"
                >
                  <option value="Open">Open</option>
                  <option value="In-Progress">In-Progress</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            {/* REAL-TIME CURRENT BILL INFO CARDS */}
            <div className="grid grid-cols-3 gap-2.5 mb-3">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Total Bill</span>
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                </div>
                <div className="mt-1">
                  <span className="text-base sm:text-lg font-black text-slate-800">৳ {payableAmount.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 block">মোট চুক্তি বিল</span>
                </div>
              </div>

              <div className="bg-emerald-50/90 p-2.5 rounded-lg border border-emerald-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700 text-[10px] font-semibold uppercase tracking-wider">Total Paid</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <div className="mt-1">
                  <span className="text-base sm:text-lg font-black text-emerald-800">৳ {totalPaid.toLocaleString()}</span>
                  <span className="text-[10px] text-emerald-600 block">মোট জমা ({patientPayments.length} কিস্তি)</span>
                </div>
              </div>

              <div className="bg-rose-50/90 p-2.5 rounded-lg border border-rose-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-rose-700 text-[10px] font-semibold uppercase tracking-wider">Total Due</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                </div>
                <div className="mt-1">
                  <span className="text-base sm:text-lg font-black text-rose-800">৳ {totalDue.toLocaleString()}</span>
                  <span className="text-[10px] text-rose-600 block">বর্তমান বকেয়া</span>
                </div>
              </div>
            </div>

            {/* PAYMENT INPUT FIELDS FORM */}
            <div className="bg-white p-2.5 rounded-lg border border-[#b8d5ed] shadow-xs mb-3">
              <div className="text-[11px] font-bold text-blue-900 mb-2 flex items-center justify-between">
                <span>নতুন পেমেন্ট যোগ করুন / Record Collection</span>
                {totalDue === 0 && payableAmount > 0 && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Fully Paid
                  </span>
                )}
              </div>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                    PAID TODAY (আজকের জমা) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 font-bold text-slate-400">৳</span>
                    <input
                      type="number"
                      value={paidToday || ''}
                      onChange={(e) => setPaidToday(Number(e.target.value))}
                      placeholder="0"
                      className="w-full pl-6 pr-2 py-1 border-2 border-blue-400 rounded bg-blue-50/30 text-right font-bold text-blue-950 text-sm focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">তারিখ (Date)</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-slate-50 font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">পেমেন্ট মেথড</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-slate-50 font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Cash">Cash (নগদ)</option>
                    <option value="bKash">bKash (বিকাশ)</option>
                    <option value="Nagad">Nagad (নগদ অ্যাপ)</option>
                    <option value="Card">Card (কার্ড)</option>
                    <option value="Bank Transfer">Bank Transfer (ব্যাংক)</option>
                    <option value="Other">Other (অন্যান্য)</option>
                  </select>
                </div>

                <div className="col-span-8 sm:col-span-3">
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">রেফারেন্স / নোট</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="TrxID / Receipt / Note..."
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddPayment}
                    className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded shadow-xs transition-colors flex items-center justify-center space-x-1"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Add Payment</span>
                  </button>
                </div>
              </div>
            </div>

            {/* PAYMENT LEDGER TABLE */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-2.5 py-1.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Payment Ledger (পেমেন্ট ট্রানজেকশন হিস্ট্রি)
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Total Transactions: {patientPayments.length}
                </span>
              </div>

              {patientPayments.length === 0 ? (
                <div className="py-4 text-center text-slate-400 italic text-[11px]">
                  কোন পূর্ববর্তী পেমেন্ট রেকর্ড পাওয়া যায়নি। উপরের ফর্ম থেকে পেমেন্ট যোগ করুন।
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="py-1 px-2.5">Date</th>
                        <th className="py-1 px-2.5 text-right">Amount</th>
                        <th className="py-1 px-2.5">Method</th>
                        <th className="py-1 px-2.5">Reference / Note</th>
                        <th className="py-1 px-2.5">Added By</th>
                        <th className="py-1 px-2.5 text-center">Status</th>
                        <th className="py-1 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patientPayments.map((p, idx) => (
                        <tr key={p.id || idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-1 px-2.5 font-medium text-slate-800 whitespace-nowrap">
                            {p.date}
                          </td>
                          <td className="py-1 px-2.5 text-right font-bold text-emerald-800 whitespace-nowrap">
                            ৳ {(Number(p.paidAmount) || 0).toLocaleString()}
                          </td>
                          <td className="py-1 px-2.5 whitespace-nowrap">
                            <span className="inline-block bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                              {p.method || 'Cash'}
                            </span>
                          </td>
                          <td className="py-1 px-2.5 text-slate-600 truncate max-w-[150px]">
                            {p.note || '-'}
                          </td>
                          <td className="py-1 px-2.5 text-slate-500 text-[10px]">
                            {p.addedBy || 'Staff'}
                          </td>
                          <td className="py-1 px-2.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                              <Check className="w-2.5 h-2.5" /> {p.status || 'Paid'}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(p.id)}
                              className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors"
                              title="Delete Payment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2 — TREATMENT JOURNEY (Patient Treatment Timeline & Progress) */}
          <div className="bg-gradient-to-b from-indigo-50/70 to-slate-50 border border-indigo-200 rounded-lg p-3 shadow-sm text-xs mb-3">
            <div className="flex flex-wrap justify-between items-center pb-2.5 mb-2.5 border-b border-indigo-200">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-baseline space-x-1.5">
                    <h3 className="font-bold text-slate-900 text-sm">Treatment Journey</h3>
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                      Patient Treatment Timeline & Progress
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Comprehensive multi-appointment dental treatment tracker across dates
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenAddSessionModal}
                className="mt-1 sm:mt-0 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded font-bold text-xs shadow-xs transition-colors flex items-center space-x-1"
              >
                <span>+ Add Treatment Session</span>
              </button>
            </div>

            {/* TREATMENT OVERVIEW METRICS */}
            {(() => {
              const totalSessionsCount = treatmentSessions.length;
              const completedCount = treatmentSessions.filter(
                (s) => (s.status || '').toLowerCase() === 'completed'
              ).length;
              const upcomingCount = treatmentSessions.filter(
                (s) =>
                  (s.status || '').toLowerCase() !== 'completed' &&
                  (s.status || '').toLowerCase() !== 'cancelled'
              ).length;
              const progressPct =
                totalSessionsCount > 0
                  ? Math.round((completedCount / totalSessionsCount) * 100)
                  : 0;

              // Find earliest and latest dates
              const sortedSessions = [...treatmentSessions].sort((a, b) =>
                (a.date || '').localeCompare(b.date || '')
              );
              const startDate =
                sortedSessions.length > 0 && sortedSessions[0].date
                  ? sortedSessions[0].date
                  : date || 'N/A';
              const latestNextDate = sortedSessions.find((s) => s.nextDate)?.nextDate;
              const expectedCompletion =
                latestNextDate ||
                (sortedSessions.length > 0 ? sortedSessions[sortedSessions.length - 1].date : 'TBD');

              return (
                <div className="bg-white rounded-lg border border-indigo-100 p-2.5 shadow-xs mb-3">
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block">Treatment Start</span>
                      <span className="text-xs font-bold text-slate-800">{startDate}</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block">Expected End</span>
                      <span className="text-xs font-bold text-indigo-900">{expectedCompletion}</span>
                    </div>

                    <div className="bg-blue-50/70 p-2 rounded border border-blue-100">
                      <span className="text-[10px] text-blue-700 font-semibold uppercase block">Total Sessions</span>
                      <span className="text-sm font-extrabold text-blue-900">{totalSessionsCount}</span>
                    </div>

                    <div className="bg-emerald-50/70 p-2 rounded border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 font-semibold uppercase block">Completed</span>
                      <span className="text-sm font-extrabold text-emerald-800">{completedCount}</span>
                    </div>

                    <div className="bg-amber-50/70 p-2 rounded border border-amber-100">
                      <span className="text-[10px] text-amber-700 font-semibold uppercase block">Upcoming</span>
                      <span className="text-sm font-extrabold text-amber-900">{upcomingCount}</span>
                    </div>

                    <div className="bg-indigo-50/70 p-2 rounded border border-indigo-100 flex flex-col justify-center">
                      <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-indigo-900">
                        <span>Progress</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TREATMENT TIMELINE */}
            <div className="bg-white rounded-lg border border-indigo-100 p-3 shadow-xs">
              <div className="text-[11px] font-bold text-slate-800 mb-3 flex items-center justify-between">
                <span>Treatment Sessions & Timeline (ক্রমানুসারে সকল সেশন)</span>
                <span className="text-[10px] text-slate-500">Chronological Order</span>
              </div>

              {treatmentSessions.length === 0 ? (
                <div className="py-6 text-center text-slate-400 italic text-[11px] border border-dashed border-slate-200 rounded-lg">
                  <Activity className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                  এখনও কোন চিকিৎসা সেশন (Treatment Session) যুক্ত করা হয়নি।
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleOpenAddSessionModal}
                      className="px-3 py-1 bg-indigo-600 text-white rounded text-[11px] font-bold hover:bg-indigo-700 transition-colors"
                    >
                      + প্রথম সেশন যুক্ত করুন
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200 space-y-4">
                  {[...treatmentSessions]
                    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                    .map((sess, idx) => {
                      const statusColor =
                        sess.status === 'Completed'
                          ? 'bg-emerald-500 ring-emerald-100'
                          : sess.status === 'In Progress'
                          ? 'bg-amber-500 ring-amber-100'
                          : sess.status === 'Scheduled'
                          ? 'bg-blue-500 ring-blue-100'
                          : sess.status === 'Planned'
                          ? 'bg-purple-500 ring-purple-100'
                          : sess.status === 'Follow-up Required'
                          ? 'bg-orange-500 ring-orange-100'
                          : 'bg-slate-400 ring-slate-100';

                      const badgeStyle =
                        sess.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : sess.status === 'In Progress'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : sess.status === 'Scheduled'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : sess.status === 'Planned'
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : sess.status === 'Follow-up Required'
                          ? 'bg-orange-100 text-orange-800 border-orange-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300';

                      return (
                        <div key={sess.id || idx} className="relative group">
                          {/* TIMELINE BULLET */}
                          <div
                            className={`absolute -left-[23px] top-3 w-3.5 h-3.5 rounded-full ${statusColor} ring-4 border-2 border-white shadow-xs`}
                          ></div>

                          {/* COMPACT TREATMENT SESSION CARD */}
                          <div className="bg-slate-50/70 hover:bg-indigo-50/40 transition-colors border border-slate-200 hover:border-indigo-300 rounded-lg p-2.5 shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-indigo-900 text-xs tracking-wide uppercase">
                                  Session {sess.sessionNo < 10 ? `0${sess.sessionNo}` : sess.sessionNo}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="font-bold text-slate-800 text-[11px]">{sess.date}</span>
                                {sess.time && (
                                  <span className="text-slate-500 text-[10px]">({sess.time})</span>
                                )}
                              </div>

                              <div className="flex items-center space-x-1.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeStyle}`}>
                                  {sess.status}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-12 gap-2 text-[11px] mb-2">
                              <div className="col-span-12 sm:col-span-6 font-bold text-blue-900 flex items-center gap-1.5">
                                <Stethoscope className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>{sess.treatmentType || sess.procedureName || 'Dental Procedure'}</span>
                              </div>

                              <div className="col-span-12 sm:col-span-6 text-slate-700 flex items-center sm:justify-end gap-1">
                                <span className="font-semibold text-slate-500">Tooth:</span>
                                {sess.teeth && sess.teeth.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {sess.teeth.map((t) => (
                                      <span
                                        key={t}
                                        className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-mono font-bold text-[10px] border border-blue-200"
                                      >
                                        #{t}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">None specified</span>
                                )}
                              </div>
                            </div>

                            {/* COMPACT BEFORE / TREATMENT / AFTER HIGHLIGHTS */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-white p-2 rounded border border-slate-100 text-[10px] mb-2">
                              <div>
                                <span className="font-bold text-slate-500 block uppercase">Before:</span>
                                <p className="text-slate-700 line-clamp-1">
                                  {sess.beforeCondition || sess.symptoms || sess.diagnosis || 'Initial status recorded'}
                                </p>
                              </div>
                              <div>
                                <span className="font-bold text-blue-600 block uppercase">Treatment:</span>
                                <p className="text-slate-800 line-clamp-1">
                                  {sess.procedureDetails || sess.procedureName || 'Procedure performed'}
                                </p>
                              </div>
                              <div>
                                <span className="font-bold text-emerald-600 block uppercase">After:</span>
                                <p className="text-slate-700 line-clamp-1">
                                  {sess.afterCondition || sess.treatmentResult || 'Tolerated procedure well'}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                              <div className="text-slate-500">
                                <span>Doctor: <strong className="text-slate-700">{sess.doctor || 'Staff Doctor'}</strong></span>
                                {sess.nextTreatment && (
                                  <span className="ml-2 text-indigo-700">
                                    Next: <strong>{sess.nextTreatment}</strong> ({sess.nextDate || 'TBD'})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-1.5 mt-1 sm:mt-0">
                                <button
                                  type="button"
                                  onClick={() => setViewingSession(sess)}
                                  className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-bold border border-indigo-200 transition-colors"
                                >
                                  [ View Details ]
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSessionModal(sess)}
                                  className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors"
                                  title="Edit Session"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTreatmentSession(sess.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                  title="Delete Session"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* REPORT ENTRY SECTION (Matching Screenshot 2) */}
          <div className="relative mb-2">
            <div className="bg-white rounded border border-blue-400 overflow-hidden shadow-sm text-xs">
              <div className="text-center font-bold text-slate-900 py-1 bg-[#d5e4f2] border-b border-slate-300">
                Report Entry
              </div>
              <div className="grid grid-cols-12 bg-[#0088cc] text-white font-bold text-[11px] py-1 px-1 text-center">
                <div className="col-span-1">X</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-4">Report Name</div>
                <div className="col-span-3">Result / Value</div>
                <div className="col-span-2">Unit</div>
              </div>
              <div className="divide-y divide-slate-200 bg-[#f7f9fc]">
                {reportRows.map((rep, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-center gap-1 p-1">
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...reportRows];
                          updated[idx] = { date: '', reportName: '', resultValue: '', unit: '' };
                          setReportRows(updated);
                        }}
                        className="w-5 h-5 border border-slate-300 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded flex items-center justify-center font-bold text-xs"
                      >
                        x
                      </button>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="date"
                        value={rep.date}
                        onChange={(e) => {
                          const updated = [...reportRows];
                          updated[idx] = { ...rep, date: e.target.value };
                          setReportRows(updated);
                        }}
                        className="w-full px-1 py-0.5 border border-slate-300 rounded text-[11px] bg-white"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={rep.reportName}
                        onChange={(e) => {
                          const updated = [...reportRows];
                          updated[idx] = { ...rep, reportName: e.target.value };
                          setReportRows(updated);
                        }}
                        placeholder="e.g. Blood Sugar / HbA1c"
                        className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={rep.resultValue}
                        onChange={(e) => {
                          const updated = [...reportRows];
                          updated[idx] = { ...rep, resultValue: e.target.value };
                          setReportRows(updated);
                        }}
                        placeholder="e.g. 6.8"
                        className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={rep.unit}
                        onChange={(e) => {
                          const updated = [...reportRows];
                          updated[idx] = { ...rep, unit: e.target.value };
                          setReportRows(updated);
                        }}
                        placeholder="mmol/L"
                        className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center -mt-1 relative z-10">
              <button
                type="button"
                className="w-12 h-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-b-md flex items-center justify-center shadow transition cursor-pointer"
                title="Quick Suggestions"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* TABBED CLINICAL PROCEDURE SECTION (Matching Screenshot 2 & 4) */}
          <div className="bg-white rounded border border-blue-400 overflow-hidden shadow-sm text-xs mb-2">
            {/* Tab Header with Yellow Highlight */}
            <div className="flex items-center bg-slate-200 border-b border-slate-300">
              <button
                type="button"
                onClick={() => setActiveExtraTab('OT')}
                className={`px-4 py-1.5 font-bold rounded-t text-xs transition select-none ${
                  activeExtraTab === 'OT'
                    ? 'bg-[#ffc107] text-slate-950 shadow-sm border-t-2 border-amber-600'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                OT Notes
              </button>
              <button
                type="button"
                onClick={() => setActiveExtraTab('Salient')}
                className={`px-4 py-1.5 font-bold rounded-t text-xs transition select-none ${
                  activeExtraTab === 'Salient'
                    ? 'bg-[#ffc107] text-slate-950 shadow-sm border-t-2 border-amber-600'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Salient Feature
              </button>
              <button
                type="button"
                onClick={() => setActiveExtraTab('History')}
                className={`px-4 py-1.5 font-bold rounded-t text-xs transition select-none ${
                  activeExtraTab === 'History'
                    ? 'bg-[#ffc107] text-slate-950 shadow-sm border-t-2 border-amber-600'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                History
              </button>
              <button
                type="button"
                onClick={() => setActiveExtraTab('Cert')}
                className={`px-4 py-1.5 font-bold rounded-t text-xs transition select-none ${
                  activeExtraTab === 'Cert'
                    ? 'bg-[#ffc107] text-slate-950 shadow-sm border-t-2 border-amber-600'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Medical Certificate
              </button>
              <button
                type="button"
                onClick={() => setActiveExtraTab('Others')}
                className={`px-4 py-1.5 font-bold rounded-t text-xs transition select-none ${
                  activeExtraTab === 'Others'
                    ? 'bg-[#ffc107] text-slate-950 shadow-sm border-t-2 border-amber-600'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Others
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-2 bg-[#f0f4f9]">
              {activeExtraTab === 'OT' && (
                <div>
                  <div className="border border-slate-300 rounded overflow-hidden bg-white">
                    <div className="grid grid-cols-12 bg-[#0088cc] text-white font-bold text-[11px] py-1 px-2">
                      <div className="col-span-1 text-center">X</div>
                      <div className="col-span-4">Particularis</div>
                      <div className="col-span-7">Value</div>
                    </div>
                    <div className="divide-y divide-slate-200 max-h-72 overflow-y-auto">
                      {otNotesRows.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-12 items-center gap-1 p-1 hover:bg-sky-50/50">
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...otNotesRows];
                                updated[idx].value = '';
                                setOtNotesRows(updated);
                              }}
                              className="w-4 h-4 border border-slate-300 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded flex items-center justify-center font-bold text-[10px]"
                            >
                              x
                            </button>
                          </div>
                          <div className="col-span-4">
                            {idx < 13 ? (
                              <span className="font-semibold text-slate-700 text-xs">{row.particularis}</span>
                            ) : (
                              <input
                                type="text"
                                value={row.particularis}
                                onChange={(e) => {
                                  const updated = [...otNotesRows];
                                  updated[idx].particularis = e.target.value;
                                  setOtNotesRows(updated);
                                }}
                                placeholder="Custom note title..."
                                className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs"
                              />
                            )}
                          </div>
                          <div className="col-span-7">
                            {row.particularis === 'Post Operative Finding' ? (
                              <textarea
                                rows={2}
                                value={row.value}
                                onChange={(e) => {
                                  const updated = [...otNotesRows];
                                  updated[idx].value = e.target.value;
                                  setOtNotesRows(updated);
                                }}
                                placeholder="Post-op observations..."
                                className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs bg-white font-sans resize-y"
                              />
                            ) : (
                              <input
                                type={row.particularis === 'Date' ? 'date' : row.particularis === 'Time' ? 'time' : 'text'}
                                value={row.value}
                                onChange={(e) => {
                                  const updated = [...otNotesRows];
                                  updated[idx].value = e.target.value;
                                  setOtNotesRows(updated);
                                }}
                                placeholder={`Enter ${row.particularis || 'value'}...`}
                                className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-2">
                    <label className="flex items-center space-x-1.5 cursor-pointer font-semibold text-slate-800 text-xs">
                      <input
                        type="checkbox"
                        checked={printOtNote}
                        onChange={(e) => setPrintOtNote(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-0 w-4 h-4"
                      />
                      <span>Print OT Note</span>
                    </label>
                  </div>
                </div>
              )}

              {activeExtraTab === 'Salient' && (
                <div className="space-y-2">
                  <textarea
                    rows={6}
                    value={salientText}
                    onChange={(e) => setSalientText(e.target.value)}
                    placeholder="Salient features / clinical highlights..."
                    className="w-full p-2 border border-slate-300 rounded text-xs bg-white font-sans resize-y"
                  />
                </div>
              )}

              {activeExtraTab === 'History' && (
                <div className="space-y-2">
                  <textarea
                    rows={6}
                    value={historyText}
                    onChange={(e) => setHistoryText(e.target.value)}
                    placeholder="Comprehensive dental and systemic history..."
                    className="w-full p-2 border border-slate-300 rounded text-xs bg-white font-sans resize-y"
                  />
                </div>
              )}

              {activeExtraTab === 'Cert' && (
                <div className="bg-white p-3 rounded border border-slate-300 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 border-b pb-1">Medical Fitness & Rest Certificate Generator</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-600">Diagnosis / Cause:</span>
                      <input
                        type="text"
                        value={certData.diagnosis}
                        onChange={(e) => setCertData({ ...certData, diagnosis: e.target.value })}
                        placeholder="e.g. Acute Alveolar Abscess"
                        className="w-full px-2 py-1 border border-slate-300 rounded mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-slate-600">Recommended Rest (Days):</span>
                      <input
                        type="text"
                        value={certData.restDays}
                        onChange={(e) => setCertData({ ...certData, restDays: e.target.value })}
                        placeholder="e.g. 7 Days"
                        className="w-full px-2 py-1 border border-slate-300 rounded mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-slate-600">Rest Effective From:</span>
                      <input
                        type="date"
                        value={certData.restFrom}
                        onChange={(e) => setCertData({ ...certData, restFrom: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 rounded mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-slate-600">Status / Recommendation:</span>
                      <input
                        type="text"
                        value={certData.fitnessStatus}
                        onChange={(e) => setCertData({ ...certData, fitnessStatus: e.target.value })}
                        placeholder="Fit to resume duties on..."
                        className="w-full px-2 py-1 border border-slate-300 rounded mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeExtraTab === 'Others' && (
                <div className="space-y-2">
                  <textarea
                    rows={6}
                    value={othersText}
                    onChange={(e) => setOthersText(e.target.value)}
                    placeholder="Other clinical / discharge notes..."
                    className="w-full p-2 border border-slate-300 rounded text-xs bg-white font-sans resize-y"
                  />
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM TEXT PAD SECTION (Matching Screenshot 4) */}
          <div className="bg-white rounded border border-blue-400 overflow-hidden shadow-sm text-xs">
            <div className="bg-[#0088cc] text-white px-3 py-1 flex items-center justify-between font-bold">
              <span>Text Pad</span>
              <div className="flex items-center space-x-3 text-[11px]">
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="radio"
                    name="textpadprint"
                    checked={textPadMode === 'print'}
                    onChange={() => setTextPadMode('print')}
                    className="text-white"
                  />
                  <span>Print</span>
                </label>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="radio"
                    name="textpadprint"
                    checked={textPadMode === 'no_print'}
                    onChange={() => setTextPadMode('no_print')}
                    className="text-white"
                  />
                  <span>Do Not Print</span>
                </label>
              </div>
            </div>

            {/* Subtabs: Refer, Drug, Treatment, Advice, Prescription */}
            <div className="flex border-b border-slate-300 bg-slate-100 text-[11px] font-semibold">
              {(['refer', 'drug', 'treatment', 'advice', 'prescription'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTextPadTab(tab)}
                  className={`flex-1 py-1 text-center capitalize border-r border-slate-300 transition ${
                    textPadTab === tab ? 'bg-white text-blue-900 font-bold border-b-2 border-b-blue-600' : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-1.5 bg-[#f0f4f9]">
              <textarea
                rows={3}
                value={textPadNotes[textPadTab]}
                onChange={(e) => setTextPadNotes({ ...textPadNotes, [textPadTab]: e.target.value })}
                placeholder={`Type or paste quick ${textPadTab} notes here...`}
                className="w-full p-2 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-blue-500 font-sans resize-y"
              />
            </div>
          </div>
        </div>
      </div>

      {/* VIEW TREATMENT SESSION DETAILS MODAL */}
      {viewingSession && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-300 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-blue-800 text-white px-5 py-3 flex justify-between items-center font-bold shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-extrabold">
                      Session {viewingSession.sessionNo < 10 ? `0${viewingSession.sessionNo}` : viewingSession.sessionNo}
                    </span>
                    <span className="text-indigo-200">•</span>
                    <span className="text-sm font-semibold">{viewingSession.treatmentType || viewingSession.procedureName}</span>
                  </div>
                  <span className="text-xs text-indigo-200 font-normal">
                    Date: {viewingSession.date} {viewingSession.time ? `• Time: ${viewingSession.time}` : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30">
                  {viewingSession.status}
                </span>
                <button
                  type="button"
                  onClick={() => setViewingSession(null)}
                  className="hover:bg-white/20 p-1.5 rounded-lg transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
              {/* META INFO BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Doctor</span>
                  <span className="font-bold text-slate-800">{viewingSession.doctor || 'Staff Doctor'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Assistant</span>
                  <span className="font-bold text-slate-800">{viewingSession.assistant || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Duration</span>
                  <span className="font-bold text-slate-800">{viewingSession.duration || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Patient Reg</span>
                  <span className="font-bold text-blue-900 font-mono">#{viewingSession.regNo}</span>
                </div>
              </div>

              {/* TEETH TREATED */}
              <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                <span className="font-bold text-blue-900">চিকিৎসাকৃত দাঁতের নম্বর (Teeth Involved):</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingSession.teeth && viewingSession.teeth.length > 0 ? (
                    viewingSession.teeth.map((tooth) => (
                      <span
                        key={tooth}
                        className="bg-blue-600 text-white font-mono font-bold px-2 py-0.5 rounded text-xs shadow-xs"
                      >
                        #{tooth}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">কোন দাঁত নির্বাচন করা হয়নি</span>
                  )}
                </div>
              </div>

              {/* BEFORE TREATMENT */}
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                <div className="bg-amber-500/10 px-3 py-1.5 border-b border-amber-200 text-amber-900 font-bold flex items-center justify-between">
                  <span>1. Before Treatment (চিকিৎসার পূর্বাবস্থা ও ডায়াগনোসিস)</span>
                  {viewingSession.painLevelBefore !== undefined && (
                    <span className="text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-semibold border border-amber-300">
                      Pain Scale: <strong>{viewingSession.painLevelBefore}/10</strong>
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-2 bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Patient Condition:</span>
                      <p className="text-slate-800 font-medium">{viewingSession.beforeCondition || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Symptoms:</span>
                      <p className="text-slate-800 font-medium">{viewingSession.symptoms || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Diagnosis:</span>
                      <p className="text-slate-800 font-medium">{viewingSession.diagnosis || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Tooth Condition:</span>
                      <p className="text-slate-800 font-medium">{viewingSession.toothCondition || 'N/A'}</p>
                    </div>
                  </div>
                  {viewingSession.clinicalFindings && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-semibold block text-[11px]">Clinical Findings:</span>
                      <p className="text-slate-700">{viewingSession.clinicalFindings}</p>
                    </div>
                  )}
                  {viewingSession.xrayScanNote && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-semibold block text-[11px]">X-Ray / Scan Findings:</span>
                      <p className="text-slate-700">{viewingSession.xrayScanNote}</p>
                    </div>
                  )}
                  {viewingSession.beforeDoctorNotes && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-semibold block text-[11px]">Doctor Notes:</span>
                      <p className="text-slate-700 italic">{viewingSession.beforeDoctorNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* TREATMENT PERFORMED */}
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                <div className="bg-blue-600/10 px-3 py-1.5 border-b border-blue-200 text-blue-900 font-bold flex items-center justify-between">
                  <span>2. Treatment Performed (প্রদত্ত চিকিৎসা কার্যপদ্ধতি)</span>
                  <span className="text-[11px] text-blue-800 font-semibold">
                    {viewingSession.procedureName}
                  </span>
                </div>
                <div className="p-3 space-y-2 bg-white">
                  <div>
                    <span className="text-slate-500 font-semibold block text-[11px]">Procedure Details:</span>
                    <p className="text-slate-800 leading-relaxed font-sans whitespace-pre-line">
                      {viewingSession.procedureDetails || 'Procedure completed as planned.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Materials Used:</span>
                      <p className="text-slate-800">{viewingSession.materialsUsed || 'Standard dental materials'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Medication / Anesthesia Used:</span>
                      <p className="text-slate-800">{viewingSession.medicationUsed || 'N/A'}</p>
                    </div>
                  </div>
                  {viewingSession.treatmentDoctorNotes && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-semibold block text-[11px]">Treatment Notes:</span>
                      <p className="text-slate-700 italic">{viewingSession.treatmentDoctorNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* AFTER TREATMENT */}
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                <div className="bg-emerald-600/10 px-3 py-1.5 border-b border-emerald-200 text-emerald-900 font-bold flex items-center justify-between">
                  <span>3. After Treatment (চিকিৎসা পরবর্তী ফলাফল ও পরামর্শ)</span>
                  {viewingSession.painLevelAfter !== undefined && (
                    <span className="text-[11px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-semibold border border-emerald-300">
                      Pain Scale: <strong>{viewingSession.painLevelAfter}/10</strong>
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-2 bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Patient Condition After:</span>
                      <p className="text-slate-800">{viewingSession.afterCondition || 'Stable'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Treatment Result:</span>
                      <p className="text-slate-800">{viewingSession.treatmentResult || 'Satisfactory'}</p>
                    </div>
                  </div>
                  {viewingSession.clinicalObservation && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-semibold block text-[11px]">Clinical Observation:</span>
                      <p className="text-slate-700">{viewingSession.clinicalObservation}</p>
                    </div>
                  )}
                  {viewingSession.postInstructions && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-semibold block text-[11px]">Post-Treatment Instructions:</span>
                      <p className="text-slate-800 font-medium whitespace-pre-line">{viewingSession.postInstructions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* NEXT TREATMENT */}
              {viewingSession.nextTreatment && (
                <div className="border border-indigo-200 rounded-lg overflow-hidden shadow-xs bg-indigo-50/40">
                  <div className="bg-indigo-600 text-white px-3 py-1.5 font-bold flex items-center justify-between">
                    <span>4. Next Planned Treatment (পরবর্তী চিকিৎসা ও সাক্ষাত)</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono">
                      {viewingSession.nextDate || 'Date TBD'}
                    </span>
                  </div>
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Next Treatment:</span>
                      <p className="font-bold text-indigo-900">{viewingSession.nextTreatment}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Next Tooth:</span>
                      <p className="font-bold text-slate-800">
                        {viewingSession.nextTeeth && viewingSession.nextTeeth.length > 0
                          ? viewingSession.nextTeeth.join(', ')
                          : 'Same as current'}
                      </p>
                    </div>
                    {viewingSession.nextPurpose && (
                      <div className="col-span-2">
                        <span className="text-slate-500 font-semibold block text-[11px]">Purpose / Goal:</span>
                        <p className="text-slate-800">{viewingSession.nextPurpose}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const s = viewingSession;
                  setViewingSession(null);
                  handleOpenEditSessionModal(s);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit This Session</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingSession(null)}
                className="px-4 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold rounded-lg text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7-STEP ADD / EDIT TREATMENT SESSION MODAL */}
      {showAddSessionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-300 max-h-[92vh] flex flex-col">
            {/* MODAL HEADER */}
            <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-blue-800 text-white px-5 py-3 flex justify-between items-center font-bold shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">
                    {editingSessionId ? 'Edit Treatment Session' : '+ Add Treatment Session'}
                  </h3>
                  <span className="text-xs text-indigo-200 font-normal">
                    Patient Reg #{regNo} • {patientName || 'Patient'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSessionModal(false)}
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 7-STEP WIZARD PROGRESS BAR */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 overflow-x-auto">
              <div className="flex items-center justify-between min-w-[620px] text-[11px] font-semibold">
                {[
                  { step: 1, label: '1. Session Info' },
                  { step: 2, label: '2. Tooth Selection' },
                  { step: 3, label: '3. Before Treatment' },
                  { step: 4, label: '4. Performed' },
                  { step: 5, label: '5. After Treatment' },
                  { step: 6, label: '6. Next Plan' },
                  { step: 7, label: '7. Attachments' },
                ].map((st) => (
                  <button
                    key={st.step}
                    type="button"
                    onClick={() => setSessionStep(st.step)}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all ${
                      sessionStep === st.step
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : sessionStep > st.step
                        ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                        : 'text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <span>{st.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* MODAL STEP BODY */}
            <div className="p-5 overflow-y-auto flex-1 text-xs font-sans">
              {/* STEP 1: SESSION INFORMATION */}
              {sessionStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100">
                    <h4 className="font-bold text-indigo-950 text-sm mb-1">Step 1: Session Information (সেশন সাধারণ তথ্য)</h4>
                    <p className="text-slate-600 text-[11px]">
                      চিকিৎসা সেশনের ক্রমিক নম্বর, তারিখ, সময়, সংশ্লিষ্ট ডাক্তার ও বর্তমান অবস্থা নির্ধারণ করুন।
                    </p>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-6 sm:col-span-3">
                      <label className="font-bold text-slate-700 block mb-1">Session Number</label>
                      <input
                        type="number"
                        min="1"
                        value={sessionForm.sessionNo}
                        onChange={(e) => setSessionForm({ ...sessionForm, sessionNo: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-4">
                      <label className="font-bold text-slate-700 block mb-1">Treatment Date</label>
                      <input
                        type="date"
                        value={sessionForm.date}
                        onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-5">
                      <label className="font-bold text-slate-700 block mb-1">Appointment Time</label>
                      <input
                        type="text"
                        value={sessionForm.time}
                        onChange={(e) => setSessionForm({ ...sessionForm, time: e.target.value })}
                        placeholder="e.g. 10:30 AM or 04:00 PM"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Doctor Name</label>
                      <input
                        type="text"
                        value={sessionForm.doctor}
                        onChange={(e) => setSessionForm({ ...sessionForm, doctor: e.target.value })}
                        placeholder="Attending Dental Surgeon"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Dental Assistant</label>
                      <input
                        type="text"
                        value={sessionForm.assistant}
                        onChange={(e) => setSessionForm({ ...sessionForm, assistant: e.target.value })}
                        placeholder="Assisting Nurse / Tech"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Treatment Type</label>
                      <input
                        type="text"
                        value={sessionForm.treatmentType}
                        onChange={(e) => setSessionForm({ ...sessionForm, treatmentType: e.target.value })}
                        placeholder="e.g. Root Canal Treatment, Crown Preparation, Extraction, Scaling"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-blue-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Session Status</label>
                      <select
                        value={sessionForm.status}
                        onChange={(e: any) => setSessionForm({ ...sessionForm, status: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-600"
                      >
                        <option value="Completed">Completed (সম্পন্ন)</option>
                        <option value="In Progress">In Progress (চলমান)</option>
                        <option value="Scheduled">Scheduled (নির্ধারিত)</option>
                        <option value="Planned">Planned (পরিকল্পিত)</option>
                        <option value="Follow-up Required">Follow-up Required (ফলো-আপ প্রয়োজন)</option>
                        <option value="Cancelled">Cancelled (বাতিল)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: TOOTH SELECTION */}
              {sessionStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-indigo-950 text-sm mb-1">Step 2: Tooth Selection (দাঁত নির্বাচন)</h4>
                      <p className="text-slate-600 text-[11px]">
                        এই সেশনে চিকিৎসাকৃত দাঁতগুলো ক্লিক করে সিলেক্ট করুন (FDI Notation #11 to #48)।
                      </p>
                    </div>
                    {sessionForm.teeth.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSessionForm({ ...sessionForm, teeth: [] })}
                        className="text-[11px] text-red-600 hover:underline font-semibold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* SELECTED TEETH DISPLAY */}
                  <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="font-bold text-slate-700">নির্বাচিত দাঁত (Selected Teeth):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {sessionForm.teeth.length === 0 ? (
                        <span className="text-slate-400 italic">এখনও কোন দাঁত সিলেক্ট করা হয়নি</span>
                      ) : (
                        sessionForm.teeth.map((tooth) => (
                          <span
                            key={tooth}
                            className="bg-indigo-600 text-white font-mono font-bold px-2 py-0.5 rounded text-xs flex items-center gap-1 shadow-xs"
                          >
                            <span>#{tooth}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleToothInSession(tooth)}
                              className="hover:text-red-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* DENTAL CHART QUADRANTS FOR QUICK SELECTION */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <div className="text-center font-bold text-slate-700 text-xs uppercase tracking-wider">
                      Adult Dentition Quadrants (FDI Chart)
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* UPPER RIGHT (UR 18..11) */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                        <div className="text-[11px] font-bold text-blue-900 mb-1.5 flex justify-between">
                          <span>Upper Right (UR / Q1)</span>
                          <span className="text-slate-400">18 - 11</span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                          {['18', '17', '16', '15', '14', '13', '12', '11'].map((t) => {
                            const isSelected = sessionForm.teeth.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => handleToggleToothInSession(t)}
                                className={`py-1.5 font-mono font-bold rounded text-xs border transition-all ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                    : 'bg-slate-50 hover:bg-indigo-50 text-slate-800 border-slate-200'
                                }`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* UPPER LEFT (UL 21..28) */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                        <div className="text-[11px] font-bold text-blue-900 mb-1.5 flex justify-between">
                          <span>Upper Left (UL / Q2)</span>
                          <span className="text-slate-400">21 - 28</span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                          {['21', '22', '23', '24', '25', '26', '27', '28'].map((t) => {
                            const isSelected = sessionForm.teeth.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => handleToggleToothInSession(t)}
                                className={`py-1.5 font-mono font-bold rounded text-xs border transition-all ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                    : 'bg-slate-50 hover:bg-indigo-50 text-slate-800 border-slate-200'
                                }`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* LOWER RIGHT (LR 48..41) */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                        <div className="text-[11px] font-bold text-blue-900 mb-1.5 flex justify-between">
                          <span>Lower Right (LR / Q4)</span>
                          <span className="text-slate-400">48 - 41</span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                          {['48', '47', '46', '45', '44', '43', '42', '41'].map((t) => {
                            const isSelected = sessionForm.teeth.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => handleToggleToothInSession(t)}
                                className={`py-1.5 font-mono font-bold rounded text-xs border transition-all ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                    : 'bg-slate-50 hover:bg-indigo-50 text-slate-800 border-slate-200'
                                }`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* LOWER LEFT (LL 31..38) */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                        <div className="text-[11px] font-bold text-blue-900 mb-1.5 flex justify-between">
                          <span>Lower Left (LL / Q3)</span>
                          <span className="text-slate-400">31 - 38</span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                          {['31', '32', '33', '34', '35', '36', '37', '38'].map((t) => {
                            const isSelected = sessionForm.teeth.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => handleToggleToothInSession(t)}
                                className={`py-1.5 font-mono font-bold rounded text-xs border transition-all ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                    : 'bg-slate-50 hover:bg-indigo-50 text-slate-800 border-slate-200'
                                }`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: BEFORE TREATMENT */}
              {sessionStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-200">
                    <h4 className="font-bold text-amber-950 text-sm mb-1">Step 3: Before Treatment (রোগীর পূর্বাবস্থা ও পরীক্ষা)</h4>
                    <p className="text-slate-600 text-[11px]">
                      চিকিৎসার শুরুতে রোগীর শারীরিক অবস্থা, লক্ষণ, ডায়াগনোসিস ও পেইন স্কেল নথিভুক্ত করুন।
                    </p>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Patient Condition (রোগীর শারীরিক অবস্থা)</label>
                      <input
                        type="text"
                        value={sessionForm.beforeCondition}
                        onChange={(e) => setSessionForm({ ...sessionForm, beforeCondition: e.target.value })}
                        placeholder="e.g. Mild anxiety, spontaneous severe throbbing pain"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Diagnosis (রোগনির্ণয়)</label>
                      <input
                        type="text"
                        value={sessionForm.diagnosis}
                        onChange={(e) => setSessionForm({ ...sessionForm, diagnosis: e.target.value })}
                        placeholder="e.g. Irreversible Pulpitis, Periapical Abscess"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Symptoms (রোগের লক্ষণাবলী)</label>
                      <textarea
                        rows={2}
                        value={sessionForm.symptoms}
                        onChange={(e) => setSessionForm({ ...sessionForm, symptoms: e.target.value })}
                        placeholder="Pain on chewing, sensitivity to cold/hot, swelling..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600 font-sans"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Tooth Condition (দাঁতের অবস্থা)</label>
                      <textarea
                        rows={2}
                        value={sessionForm.toothCondition}
                        onChange={(e) => setSessionForm({ ...sessionForm, toothCondition: e.target.value })}
                        placeholder="Deep occlusal caries, fractured cusp, mobile..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600 font-sans"
                      />
                    </div>

                    {/* PAIN LEVEL SLIDER */}
                    <div className="col-span-12 bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700">Pain Level (ব্যথার মাত্রা: 0 - 10)</label>
                        <span className="font-black text-sm px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          {sessionForm.painLevelBefore} / 10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={sessionForm.painLevelBefore}
                        onChange={(e) => setSessionForm({ ...sessionForm, painLevelBefore: Number(e.target.value) })}
                        className="w-full accent-amber-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1 mt-1">
                        <span>0: No Pain</span>
                        <span>3: Mild</span>
                        <span>5: Moderate</span>
                        <span>8: Severe</span>
                        <span>10: Worst Possible</span>
                      </div>
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Clinical Findings</label>
                      <input
                        type="text"
                        value={sessionForm.clinicalFindings}
                        onChange={(e) => setSessionForm({ ...sessionForm, clinicalFindings: e.target.value })}
                        placeholder="Tender to percussion, probing depth 3mm..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">X-Ray / Scan Details</label>
                      <input
                        type="text"
                        value={sessionForm.xrayScanNote}
                        onChange={(e) => setSessionForm({ ...sessionForm, xrayScanNote: e.target.value })}
                        placeholder="IOPA shows radiolucency around apex of #16..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12">
                      <label className="font-bold text-slate-700 block mb-1">Doctor Pre-treatment Notes</label>
                      <textarea
                        rows={2}
                        value={sessionForm.beforeDoctorNotes}
                        onChange={(e) => setSessionForm({ ...sessionForm, beforeDoctorNotes: e.target.value })}
                        placeholder="Special clinical observations or precautions prior to starting procedure..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600 font-sans"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: TREATMENT PERFORMED */}
              {sessionStep === 4 && (
                <div className="space-y-4">
                  <div className="bg-blue-600/10 p-3 rounded-lg border border-blue-200">
                    <h4 className="font-bold text-blue-950 text-sm mb-1">Step 4: Treatment Performed (প্রদত্ত চিকিৎসা বিবরণ)</h4>
                    <p className="text-slate-600 text-[11px]">
                      এই সেশনে সম্পন্নকৃত চিকিৎসা পদ্ধতি, ব্যবহৃত ম্যাটেরিয়ালস এবং মেডিসিনের তথ্য লিখুন।
                    </p>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-8">
                      <label className="font-bold text-slate-700 block mb-1">Procedure Name (চিকিৎসার নাম)</label>
                      <input
                        type="text"
                        value={sessionForm.procedureName}
                        onChange={(e) => setSessionForm({ ...sessionForm, procedureName: e.target.value })}
                        placeholder="e.g. Root Canal Treatment, Crown Prep, Light Cure Composite Filling"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-blue-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-4">
                      <label className="font-bold text-slate-700 block mb-1">Procedure Duration</label>
                      <input
                        type="text"
                        value={sessionForm.duration}
                        onChange={(e) => setSessionForm({ ...sessionForm, duration: e.target.value })}
                        placeholder="e.g. 45 mins"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12">
                      <label className="font-bold text-slate-700 block mb-1">
                        Procedure Details (সম্পূর্ণ কার্যপদ্ধতি / কি কি কাজ করা হয়েছে)
                      </label>
                      <textarea
                        rows={4}
                        value={sessionForm.procedureDetails}
                        onChange={(e) => setSessionForm({ ...sessionForm, procedureDetails: e.target.value })}
                        placeholder="Access opening, cleaning and shaping, irrigation with 3% NaOCl, working length MB:20mm, DB:20mm, P:21mm, calcium hydroxide placed..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600 font-sans"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Materials Used (ব্যবহৃত সামগ্রী)</label>
                      <input
                        type="text"
                        value={sessionForm.materialsUsed}
                        onChange={(e) => setSessionForm({ ...sessionForm, materialsUsed: e.target.value })}
                        placeholder="Rotary files, Cavit temporary restoration, EDTA gel..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Medication / Anesthesia Used</label>
                      <input
                        type="text"
                        value={sessionForm.medicationUsed}
                        onChange={(e) => setSessionForm({ ...sessionForm, medicationUsed: e.target.value })}
                        placeholder="Lignocaine 2% with 1:80000 adrenaline (1.8ml)..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12">
                      <label className="font-bold text-slate-700 block mb-1">Doctor Procedure Notes</label>
                      <textarea
                        rows={2}
                        value={sessionForm.treatmentDoctorNotes}
                        onChange={(e) => setSessionForm({ ...sessionForm, treatmentDoctorNotes: e.target.value })}
                        placeholder="Any procedural observations or notes during surgery/treatment..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600 font-sans"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: AFTER TREATMENT */}
              {sessionStep === 5 && (
                <div className="space-y-4">
                  <div className="bg-emerald-600/10 p-3 rounded-lg border border-emerald-200">
                    <h4 className="font-bold text-emerald-950 text-sm mb-1">Step 5: After Treatment (চিকিৎসা পরবর্তী অবস্থা ও পরামর্শ)</h4>
                    <p className="text-slate-600 text-[11px]">
                      চিকিৎসার পর রোগীর অবস্থা, ব্যথার পরিবর্তন, তাৎক্ষণিক ফলাফল ও রোগীকে দেওয়া দিকনির্দেশনা লিখুন।
                    </p>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Patient Condition After (চিকিৎসা পরবর্তী অবস্থা)</label>
                      <input
                        type="text"
                        value={sessionForm.afterCondition}
                        onChange={(e) => setSessionForm({ ...sessionForm, afterCondition: e.target.value })}
                        placeholder="Patient tolerated procedure well, calm, vitals stable"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Treatment Result (তাৎক্ষণিক ফলাফল)</label>
                      <input
                        type="text"
                        value={sessionForm.treatmentResult}
                        onChange={(e) => setSessionForm({ ...sessionForm, treatmentResult: e.target.value })}
                        placeholder="Temporary filling placed, bleeding arrested"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    {/* PAIN LEVEL AFTER SLIDER */}
                    <div className="col-span-12 bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700">Pain Level After Treatment (চিকিৎসার পর ব্যথার মাত্রা: 0 - 10)</label>
                        <span className="font-black text-sm px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {sessionForm.painLevelAfter} / 10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={sessionForm.painLevelAfter}
                        onChange={(e) => setSessionForm({ ...sessionForm, painLevelAfter: Number(e.target.value) })}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1 mt-1">
                        <span>0: No Pain</span>
                        <span>2: Minimal soreness</span>
                        <span>5: Moderate</span>
                        <span>8: High</span>
                        <span>10: Extreme</span>
                      </div>
                    </div>

                    <div className="col-span-12">
                      <label className="font-bold text-slate-700 block mb-1">Clinical Observation (ক্লিনিক্যাল পর্যবেক্ষণ)</label>
                      <textarea
                        rows={2}
                        value={sessionForm.clinicalObservation}
                        onChange={(e) => setSessionForm({ ...sessionForm, clinicalObservation: e.target.value })}
                        placeholder="Good seal achieved, no high spot on occlusion, no bleeding..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600 font-sans"
                      />
                    </div>

                    <div className="col-span-12">
                      <label className="font-bold text-slate-700 block mb-1">Post-treatment Instructions (রোগীর জন্য পরামর্শ)</label>
                      <textarea
                        rows={3}
                        value={sessionForm.postInstructions}
                        onChange={(e) => setSessionForm({ ...sessionForm, postInstructions: e.target.value })}
                        placeholder="Do not chew hard foods on treated tooth for 24 hours. Take pain medication if needed..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600 font-sans"
                      />
                    </div>

                    <div className="col-span-12">
                      <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={sessionForm.followUpRequired}
                          onChange={(e) => setSessionForm({ ...sessionForm, followUpRequired: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <span>এই রোগীর জন্য পরবর্তী ফলো-আপ বা পরবর্তী সেশন আবশ্যক (Follow-up Required)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: NEXT TREATMENT / FOLLOW-UP */}
              {sessionStep === 6 && (
                <div className="space-y-4">
                  <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100">
                    <h4 className="font-bold text-indigo-950 text-sm mb-1">Step 6: Next Treatment / Follow-up (পরবর্তী চিকিৎসা পরিকল্পনা)</h4>
                    <p className="text-slate-600 text-[11px]">
                      পরবর্তী সাক্ষাতের সম্ভাব্য তারিখ এবং কি চিকিৎসা দেওয়া হবে তা পূর্বপরিকল্পনা করুন।
                    </p>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Next Treatment Date (পরবর্তী তারিখ)</label>
                      <input
                        type="date"
                        value={sessionForm.nextDate}
                        onChange={(e) => setSessionForm({ ...sessionForm, nextDate: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Next Treatment (পরবর্তী চিকিৎসা)</label>
                      <input
                        type="text"
                        value={sessionForm.nextTreatment}
                        onChange={(e) => setSessionForm({ ...sessionForm, nextTreatment: e.target.value })}
                        placeholder="e.g. Obturation & Permanent Core Build-up, Crown Prep"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-bold text-indigo-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-4">
                      <label className="font-bold text-slate-700 block mb-1">Tooth Number(s)</label>
                      <input
                        type="text"
                        value={sessionForm.nextTeeth ? sessionForm.nextTeeth.join(', ') : ''}
                        onChange={(e) =>
                          setSessionForm({
                            ...sessionForm,
                            nextTeeth: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="e.g. #16, #17"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-8">
                      <label className="font-bold text-slate-700 block mb-1">Purpose of Next Session (উদ্দেশ্য)</label>
                      <input
                        type="text"
                        value={sessionForm.nextPurpose}
                        onChange={(e) => setSessionForm({ ...sessionForm, nextPurpose: e.target.value })}
                        placeholder="e.g. Complete root canal obturation, crown shade selection"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12">
                      <label className="font-bold text-slate-700 block mb-1">Special Follow-up Instructions</label>
                      <textarea
                        rows={3}
                        value={sessionForm.nextInstructions}
                        onChange={(e) => setSessionForm({ ...sessionForm, nextInstructions: e.target.value })}
                        placeholder="Return earlier if swelling occurs or if temporary restoration chips off..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600 font-sans"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 7: ATTACHMENTS & CONFIRMATION */}
              {sessionStep === 7 && (
                <div className="space-y-4">
                  <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100">
                    <h4 className="font-bold text-indigo-950 text-sm mb-1">Step 7: Attachments & Review (সংযুক্তি ও নিশ্চিতকরণ)</h4>
                    <p className="text-slate-600 text-[11px]">
                      এক্স-রে বা ক্লিনিক্যাল ছবি এবং অতিরিক্ত নোট পর্যালোচনা করে সেশনটি সেভ করুন।
                    </p>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">Before Treatment Photo / X-Ray Notes</label>
                      <textarea
                        rows={2}
                        value={sessionForm.beforePhotos ? sessionForm.beforePhotos.join(', ') : ''}
                        onChange={(e) =>
                          setSessionForm({
                            ...sessionForm,
                            beforePhotos: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Pre-op intraoral photograph file reference or notes..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600 font-sans"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">After Treatment Photo / X-Ray Notes</label>
                      <textarea
                        rows={2}
                        value={sessionForm.afterPhotos ? sessionForm.afterPhotos.join(', ') : ''}
                        onChange={(e) =>
                          setSessionForm({
                            ...sessionForm,
                            afterPhotos: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Post-op intraoral photograph file reference or notes..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-600 font-sans"
                      />
                    </div>

                    {/* CONFIRMATION SUMMARY CARD */}
                    <div className="col-span-12 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 text-xs block mb-1">Session Summary Checklist:</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-400 block font-semibold">Session</span>
                          <span className="font-bold text-indigo-900">#{sessionForm.sessionNo}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-400 block font-semibold">Date</span>
                          <span className="font-bold text-slate-800">{sessionForm.date}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-400 block font-semibold">Status</span>
                          <span className="font-bold text-emerald-700">{sessionForm.status}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-400 block font-semibold">Teeth</span>
                          <span className="font-bold text-blue-900">
                            {sessionForm.teeth.length > 0 ? sessionForm.teeth.map((t) => `#${t}`).join(', ') : 'None'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                        সেশনটি সেভ করলে এটি স্বয়ংক্রিয়ভাবে রোগীর টাইমলাইনে ক্রমানুসারে যুক্ত হবে এবং ডাটাবেজে স্থায়ীভাবে সংরক্ষিত থাকবে।
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER BUTTONS */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
              <div>
                {sessionStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setSessionStep(sessionStep - 1)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs flex items-center space-x-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddSessionModal(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                >
                  Cancel
                </button>

                {sessionStep < 7 ? (
                  <button
                    type="button"
                    onClick={() => setSessionStep(sessionStep + 1)}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 transition-colors shadow-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveTreatmentSession}
                    className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Treatment Session</span>
                  </button>
                )}

                {sessionStep < 7 && (
                  <button
                    type="button"
                    onClick={handleSaveTreatmentSession}
                    className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white font-semibold rounded-lg text-xs transition-colors"
                    title="Save now without going through remaining steps"
                  >
                    Save Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PATIENT INFORMATION MODAL */}
      {showPatientInfoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-300">
            <div className="bg-blue-700 text-white px-4 py-2.5 flex justify-between items-center font-bold">
              <span>Patient EMR Information - Reg #{regNo}</span>
              <button onClick={() => setShowPatientInfoModal(false)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[500px] overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-200">
                <div><span className="text-slate-500">Name:</span> <span className="font-bold text-slate-800">{patientName || 'N/A'}</span></div>
                <div><span className="text-slate-500">Mobile:</span> <span className="font-bold text-slate-800">{mobile || 'N/A'}</span></div>
                <div><span className="text-slate-500">Age:</span> <span className="font-bold text-slate-800">{age || 'N/A'}</span></div>
                <div><span className="text-slate-500">Sex:</span> <span className="font-bold text-slate-800">{sex}</span></div>
                <div><span className="text-slate-500">Address:</span> <span className="font-bold text-slate-800">{address || 'N/A'}</span></div>
                <div><span className="text-slate-500">Occupation:</span> <span className="font-bold text-slate-800">{occupation || 'N/A'}</span></div>
              </div>

              <div>
                <h4 className="font-bold text-blue-900 mb-1">Previous Prescriptions & Visits ({patientPastPrescriptions.length})</h4>
                {patientPastPrescriptions.length === 0 ? (
                  <p className="text-slate-500 italic">No past prescriptions found for Reg #{regNo}.</p>
                ) : (
                  <div className="divide-y divide-slate-200 border rounded overflow-hidden">
                    {patientPastPrescriptions.map((rx) => (
                      <div key={rx.id} className="p-2 hover:bg-sky-50 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-800">{rx.date}</span>
                          <span className="text-slate-500 ml-2">(Visit #{rx.visitNo})</span>
                          {rx.dx && rx.dx.length > 0 && <div className="text-[11px] text-blue-700">Dx: {rx.dx.join(', ')}</div>}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (rx.medicines) setMedicines(rx.medicines);
                            if (rx.advice) setAdviceList(rx.advice);
                            setShowPatientInfoModal(false);
                          }}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold"
                        >
                          Load Meds
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE PICKER MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-slate-300">
            <div className="bg-blue-700 text-white px-4 py-2.5 flex justify-between items-center font-bold">
              <span>
                {templateModalType === 'drug' && 'Select Drug Template'}
                {templateModalType === 'treatment' && 'Select Treatment Template'}
                {templateModalType === 'advice' && 'Select Advice Template'}
                {templateModalType === 'cost' && 'Select Procedure Cost'}
              </span>
              <button onClick={() => setShowTemplateModal(false)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
              {allTemplates
                .filter((t) => {
                  if (templateModalType === 'cost') return t.type === 'cost' || t.type === 'cost_auto';
                  if (templateModalType === 'advice') return t.type === 'advice' || t.type === 'advice_auto';
                  if (templateModalType === 'drug') return t.type === 'drug' || t.type === 'drug_auto';
                  if (templateModalType === 'treatment') return t.type === 'treatment' || t.type === 'treatment_auto';
                  return true;
                })
                .map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      if (templateModalType === 'advice' && (tmpl.content || tmpl.name)) {
                        const emptyIdx = adviceList.findIndex((a) => !a.trim());
                        const text = tmpl.content || tmpl.name;
                        if (emptyIdx !== -1) {
                          const updated = [...adviceList];
                          updated[emptyIdx] = text;
                          setAdviceList(updated);
                        } else {
                          setAdviceList((prev) => [...prev, text]);
                        }
                      } else if (templateModalType === 'cost') {
                        const emptyIdx = contractRows.findIndex((c) => !c.particulars.trim());
                        const unitPrice = tmpl.price !== undefined && tmpl.price > 0 ? tmpl.price : 0;
                        if (emptyIdx !== -1) {
                          const targetRow = contractRows[emptyIdx];
                          const { price } = calculateContractRowPrice(targetRow, targetRow.quadrant, unitPrice);
                          const updated = [...contractRows];
                          updated[emptyIdx] = {
                            ...targetRow,
                            particulars: tmpl.name,
                            unitPrice,
                            price,
                          };
                          setContractRows(updated);
                        } else {
                          setContractRows([
                            ...contractRows,
                            { particulars: tmpl.name, quadrant: defaultQuadrant(), price: unitPrice, unitPrice },
                          ]);
                        }
                      }
                      setShowTemplateModal(false);
                    }}
                    className="p-2 hover:bg-sky-50 cursor-pointer flex justify-between items-center transition"
                  >
                    <div>
                      <div className="font-bold text-blue-900">{tmpl.name}</div>
                      {tmpl.content && <div className="text-slate-600 text-[11px]">{tmpl.content}</div>}
                    </div>
                    {tmpl.price && (
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ৳ {tmpl.price}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TOOTH SELECTION POPUP MODAL (1-8 with teeth.png, checkbox, & SL) */}
      {toothModalData && (() => {
        const parseTeethString = (str: string): number[] => {
          if (!str) return [];
          const found: number[] = [];
          for (let i = 1; i <= 8; i++) {
            if (new RegExp(`(^|[^0-9])${i}([^0-9]|$)`).test(str) || str.includes(i.toString())) {
              found.push(i);
            }
          }
          return found;
        };

        const activeQuadStr = toothModalData.workingQuadrant[toothModalData.activeQuad] || '';
        const selectedTeeth = parseTeethString(activeQuadStr);

        const toggleTooth = (num: number) => {
          const nextSelected = selectedTeeth.includes(num)
            ? selectedTeeth.filter((n) => n !== num)
            : [...selectedTeeth, num].sort((a, b) => a - b);
          const nextStr = nextSelected.join(', ');
          setToothModalData({
            ...toothModalData,
            workingQuadrant: {
              ...toothModalData.workingQuadrant,
              [toothModalData.activeQuad]: nextStr,
            },
          });
        };

        const selectAll = () => {
          setToothModalData({
            ...toothModalData,
            workingQuadrant: {
              ...toothModalData.workingQuadrant,
              [toothModalData.activeQuad]: '1, 2, 3, 4, 5, 6, 7, 8',
            },
          });
        };

        const clearCurrent = () => {
          setToothModalData({
            ...toothModalData,
            workingQuadrant: {
              ...toothModalData.workingQuadrant,
              [toothModalData.activeQuad]: '',
            },
          });
        };

        const quadLabels: Record<'ur' | 'ul' | 'lr' | 'll', { title: string; subtitle: string }> = {
          ur: { title: 'UR (Upper Right)', subtitle: 'উপরের ডান চোয়াল' },
          ul: { title: 'UL (Upper Left)', subtitle: 'উপরের বাম চোয়াল' },
          lr: { title: 'LR (Lower Right)', subtitle: 'নিচের ডান চোয়াল' },
          ll: { title: 'LL (Lower Left)', subtitle: 'নিচের বাম চোয়াল' },
        };

        const toothNames = [
          'Central Incisor',
          'Lateral Incisor',
          'Canine',
          '1st Premolar',
          '2nd Premolar',
          '1st Molar',
          '2nd Molar',
          '3rd Molar (Wisdom)',
        ];

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-3 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-900 via-sky-900 to-indigo-950 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center p-1 border border-white/20 shadow-inner">
                    <img src="/teeth.png" alt="Teeth" className="w-7 h-7 object-contain drop-shadow" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      দাঁত নির্বাচন (Tooth Selector - Palmer Notation)
                      <span className="text-xs font-normal text-sky-200 bg-white/10 px-2 py-0.5 rounded-full border border-white/15">
                        ১ থেকে ৮
                      </span>
                    </h3>
                    <p className="text-xs text-sky-200">
                      {toothModalData.sectionTitle ? `${toothModalData.sectionTitle} • ` : ''}
                      বর্তমান সক্রিয় কোয়ারড্র্যান্ট:{' '}
                      <span className="font-bold text-white underline decoration-sky-400">
                        {quadLabels[toothModalData.activeQuad].title}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setToothModalData(null)}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quadrant Selector Tabs */}
              <div className="bg-slate-100/90 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Quadrant:</span>
                  {(['ur', 'ul', 'lr', 'll'] as const).map((qKey) => {
                    const isActive = toothModalData.activeQuad === qKey;
                    const qVal = toothModalData.workingQuadrant[qKey];
                    return (
                      <button
                        key={qKey}
                        type="button"
                        onClick={() => setToothModalData({ ...toothModalData, activeQuad: qKey })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border ${
                          isActive
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="uppercase">{qKey}</span>
                        {qVal ? (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {qVal}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {/* Quick actions for active quadrant */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                  >
                    সব সিলেক্ট করুন (1-8)
                  </button>
                  <button
                    type="button"
                    onClick={clearCurrent}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                  >
                    ক্লিয়ার করুন
                  </button>
                </div>
              </div>

              {/* Active Quadrant Details Bar */}
              <div className="px-5 py-2 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between text-xs text-sky-900">
                <div className="flex items-center space-x-2">
                  <span className="font-bold">{quadLabels[toothModalData.activeQuad].title}</span>
                  <span className="text-sky-700">({quadLabels[toothModalData.activeQuad].subtitle})</span>
                </div>
                <div>
                  নির্বাচিত দাঁত:{' '}
                  <span className="font-mono font-bold text-blue-900">
                    {activeQuadStr || '(কোনো দাঁত নির্বাচিত নেই)'}
                  </span>
                </div>
              </div>

              {/* Teeth 1 to 8 Cards Grid */}
              <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50">
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                    const isChecked = selectedTeeth.includes(num);
                    return (
                      <div
                        key={num}
                        onClick={() => toggleTooth(num)}
                        className={`group cursor-pointer rounded-xl border-2 p-2 flex flex-col items-center justify-between transition-all select-none ${
                          isChecked
                            ? 'bg-blue-50/90 border-blue-600 shadow-md ring-2 ring-blue-400/30'
                            : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-sm'
                        }`}
                      >
                        {/* 1. TOP: Tooth Image teeth.png */}
                        <div className="w-full flex items-center justify-center py-2 relative">
                          <img
                            src="/teeth.png"
                            alt={`Tooth ${num}`}
                            className={`w-14 h-14 sm:w-16 sm:h-16 object-contain transition-transform duration-200 group-hover:scale-105 drop-shadow-sm ${
                              isChecked ? 'scale-105 drop-shadow' : 'opacity-85 group-hover:opacity-100'
                            }`}
                          />
                        </div>

                        {/* 2. MIDDLE: Checkbox */}
                        <div className="py-1 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleTooth(num);
                            }}
                            className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          />
                        </div>

                        {/* 3. BOTTOM: Serial Number (1 to 8) & Label */}
                        <div className="w-full text-center pt-1 border-t border-slate-100 mt-1">
                          <div
                            className={`font-black text-base sm:text-lg leading-none ${
                              isChecked ? 'text-blue-700' : 'text-slate-700'
                            }`}
                          >
                            {num}
                          </div>
                          <div
                            className="text-[9px] text-slate-500 font-medium truncate mt-0.5"
                            title={toothNames[num - 1]}
                          >
                            {toothNames[num - 1]}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 4 Quadrants Summary Panel */}
                <div className="mt-5 p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>৪টি কোয়ারড্র্যান্টের সম্পূর্ণ চিত্র (Overview):</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      যেকোনো কোয়ারড্র্যান্টে ক্লিক করে সুইচ করুন
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(['ur', 'ul', 'lr', 'll'] as const).map((qKey) => (
                      <div
                        key={qKey}
                        onClick={() => setToothModalData({ ...toothModalData, activeQuad: qKey })}
                        className={`p-2 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                          toothModalData.activeQuad === qKey
                            ? 'bg-blue-50 border-blue-400 font-bold text-blue-900 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="uppercase font-mono">{qKey}:</span>
                        <span className="font-mono text-slate-800">
                          {toothModalData.workingQuadrant[qKey] || (
                            <span className="text-slate-400 font-normal">খালি</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setToothModalData({
                        ...toothModalData,
                        workingQuadrant: { ur: '', ul: '', lr: '', ll: '' },
                      });
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
                  >
                    সব কোয়ারড্র্যান্ট ক্লিয়ার
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setToothModalData(null)}
                    className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition"
                  >
                    বাতিল (Cancel)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toothModalData.onSave(toothModalData.workingQuadrant);
                      setToothModalData(null);
                    }}
                    className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
                  >
                    <span>সংরক্ষণ করুন (Save & Apply)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {previewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] overflow-y-auto p-2 sm:p-4 flex flex-col items-center print-modal-overlay">
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-300 print-modal-container overflow-hidden my-auto">
            {/* MODAL TOOLBAR & PRINT SETTINGS (HIDDEN IN PRINT) */}
            <div className="no-print bg-slate-800 text-white px-4 py-3 border-b border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Printer className="w-5 h-5 text-sky-400" />
                  <div>
                    <h2 className="font-bold text-sm text-white">প্রেসক্রিপশন প্রিন্ট প্রিভিউ (A4 Print Setup)</h2>
                    <p className="text-[11px] text-slate-300">A4 সাইজ পেপারে নিখুঁত প্রিন্ট নিশ্চিত করুন</p>
                  </div>
                </div>

                {/* Print Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-lg hover:shadow-blue-500/30 flex items-center space-x-1.5 transition active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>প্রিন্ট করুন (Print)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(false)}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Print Modes & Quick Options Bar */}
              <div className="mt-3 pt-3 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                {/* Print Mode Selector */}
                <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPrintMode('full')}
                    className={`px-3 py-1 rounded font-semibold transition ${
                      printMode === 'full'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    🖨️ ফুল প্যাড (হেডার সহ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode('without_header')}
                    className={`px-3 py-1 rounded font-semibold transition ${
                      printMode === 'without_header'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    📄 নিজস্ব প্যাডে (হেডার ছাড়া)
                  </button>
                </div>

                {/* Header Height Adjustment for Pre-printed Pad */}
                {printMode === 'without_header' && (
                  <div className="flex items-center space-x-1.5 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-700 text-indigo-100">
                    <span className="text-[11px] font-medium">প্যাডের ফাঁকা জায়গা:</span>
                    <input
                      type="number"
                      step="0.2"
                      min="2"
                      max="12"
                      value={printHeaderMarginCm}
                      onChange={(e) => setPrintHeaderMarginCm(Number(e.target.value) || 5.6)}
                      className="w-14 px-1 py-0.5 bg-slate-900 border border-indigo-500 rounded text-center text-white font-bold"
                    />
                    <span className="text-[11px]">সেমি (cm)</span>
                  </div>
                )}

                {/* Quick Inclusion Checkboxes */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-200">
                  <label className="flex items-center space-x-1 cursor-pointer hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={printIncludeQuadrant}
                      onChange={(e) => setPrintIncludeQuadrant(e.target.checked)}
                      className="rounded text-blue-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>দাঁতের চার্ট</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={printIncludeHo}
                      onChange={(e) => setPrintIncludeHo(e.target.checked)}
                      className="rounded text-blue-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>হিস্ট্রি (H/O)</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={printIncludeAdvice}
                      onChange={(e) => setPrintIncludeAdvice(e.target.checked)}
                      className="rounded text-blue-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>উপদেশ</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={printIncludeNextVisit}
                      onChange={(e) => setPrintIncludeNextVisit(e.target.checked)}
                      className="rounded text-blue-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>পরবর্তী সাক্ষাত</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={printIncludeSignature}
                      onChange={(e) => setPrintIncludeSignature(e.target.checked)}
                      className="rounded text-blue-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>স্বাক্ষর</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={printIncludeFooter}
                      onChange={(e) => setPrintIncludeFooter(e.target.checked)}
                      className="rounded text-blue-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>ফুটার</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={printIncludeWatermark}
                      onChange={(e) => setPrintIncludeWatermark(e.target.checked)}
                      className="rounded text-blue-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>ওয়াটারমার্ক</span>
                  </label>
                </div>
              </div>
            </div>

            {/* A4 PRINTABLE PRESCRIPTION SHEET CONTAINER */}
            <div className="bg-slate-100 p-2 sm:p-6 overflow-y-auto max-h-[calc(88vh-130px)] flex justify-center">
              <div
                id="printable-prescription"
                className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 font-sans p-6 sm:p-8 shadow-2xl border border-slate-300 relative flex flex-col justify-between overflow-hidden"
                style={{
                  paddingTop: printMode === 'without_header' ? `${printHeaderMarginCm}cm` : undefined,
                }}
              >
                <div className="relative z-10 flex-1 flex flex-col justify-between">
                  {/* CLINIC HEADER (FULL MODE ONLY) */}
                  {printMode === 'full' && (() => {
                    const activeClinic = clinicSettings || defaultClinicSettings;
                    const activeDocs = [
                      activeClinic.doctor1,
                      activeClinic.doctor2,
                      activeClinic.doctor3,
                    ].filter((doc: any) => doc && doc.name && doc.name.trim() !== '');

                    return (
                      <div className="border-b-2 border-slate-800 pb-3 mb-3 bg-white">
                        {/* Clinic Title & Logo (Borderless) */}
                        <div className="flex items-center justify-center space-x-3 mb-2">
                          {activeClinic.displayLogo !== false && (
                            activeClinic.logoUrl ? (
                              <img
                                src={activeClinic.logoUrl}
                                alt="Clinic Logo"
                                className="max-h-16 max-w-[140px] object-contain"
                              />
                            ) : (
                              <div className="w-10 h-10 flex items-center justify-center text-2xl text-blue-900 font-bold">
                                🦷
                              </div>
                            )
                          )}
                          <div className="text-center">
                            <h1 className="text-2xl font-bold text-blue-950 tracking-wide font-serif">
                              {activeClinic.clinicName}
                            </h1>
                            <p className="text-[11px] text-slate-600 font-sans font-medium">
                              একটি আধুনিক ও নির্ভরযোগ্য ডেন্টাল চিকিৎসা কেন্দ্র
                            </p>
                          </div>
                        </div>

                        {/* Doctors Grid */}
                        <div
                          className={`grid gap-2 text-center text-xs font-sans mt-2 divide-x divide-slate-300 ${
                            activeDocs.length === 1
                              ? 'grid-cols-1 max-w-sm mx-auto'
                              : activeDocs.length === 2
                              ? 'grid-cols-2 max-w-2xl mx-auto'
                              : 'grid-cols-3'
                          }`}
                        >
                          {activeDocs.map((doc: any, i: number) => (
                            <div key={i} className="px-2">
                              <div className="font-bold text-blue-950 text-[13px]">{doc.name}</div>
                              {doc.degrees && <div className="text-[11px] text-slate-700">{doc.degrees}</div>}
                              {doc.designation && <div className="text-[11px] font-semibold text-slate-800">{doc.designation}</div>}
                              {doc.hospital && <div className="text-[10px] text-slate-600">{doc.hospital}</div>}
                              {doc.bmdcReg && (
                                <div className="text-[10px] font-mono text-slate-600">
                                  বিএমডিসি রেজি: {doc.bmdcReg}
                                </div>
                              )}
                              {doc.mobile && (
                                <div className="text-[10px] font-semibold text-blue-900 mt-0.5">
                                  মোবাইল: {doc.mobile}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* PATIENT DETAILS BANNER */}
                  <div className="border border-slate-300 bg-slate-50/60 rounded-md p-2.5 mb-4 text-xs font-sans">
                    <div className="grid grid-cols-12 gap-y-1.5 gap-x-2 items-center">
                      <div className="col-span-5">
                        <span className="text-slate-500 font-semibold">নাম / Name:</span>{' '}
                        <span className="font-bold text-slate-900 text-[13px]">
                          {patientName || '...........................................'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 font-semibold">বয়স / Age:</span>{' '}
                        <span className="font-semibold text-slate-900">{age || '...'} Y</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 font-semibold">লিঙ্গ / Sex:</span>{' '}
                        <span className="font-semibold text-slate-900">{sex}</span>
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="text-slate-500 font-semibold">তারিখ / Date:</span>{' '}
                        <span className="font-bold text-slate-900">{date}</span>
                      </div>
                      <div className="col-span-5 truncate">
                        <span className="text-slate-500 font-semibold">ঠিকানা / Address:</span>{' '}
                        <span className="text-slate-800">{address || 'N/A'}</span>
                      </div>
                      <div className="col-span-4">
                        <span className="text-slate-500 font-semibold">রেজি / Reg No:</span>{' '}
                        <span className="font-bold font-mono text-blue-950 bg-blue-100/80 px-1.5 py-0.5 rounded border border-blue-200">
                          #{regNo}
                        </span>
                        <span className="text-slate-500 ml-2 font-medium">ভিজিট: #{visitNo}</span>
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="text-slate-500 font-semibold">মোবাইল:</span>{' '}
                        <span className="font-semibold text-slate-900">{mobile || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* PRESCRIPTION 2-COLUMN MEDICAL SHEET (WATERMARK STRICTLY IN BODY) */}
                  <div className="grid grid-cols-12 gap-5 min-h-[520px] relative">
                    {/* WATERMARK BACKGROUND LAYER (STRICTLY IN BODY, NEVER IN HEADER) */}
                    {printIncludeWatermark && (() => {
                      const activeClinic = clinicSettings || defaultClinicSettings;
                      const ws = activeClinic.watermarkSettings || {
                        showWatermark: true,
                        type: 'logo',
                        text: activeClinic.clinicName || 'DENTAL CLINIC',
                        opacity: 0.07,
                      };
                      const opacity = ws.opacity ?? 0.07;
                      const logo = activeClinic.logoUrl;

                      return (
                        <div
                          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
                          style={{ opacity }}
                        >
                          {ws.type === 'logo' && (
                            logo ? (
                              <img src={logo} alt="Watermark" className="w-80 h-80 object-contain" />
                            ) : (
                              <div className="w-64 h-64 rounded-full border-[8px] border-blue-950 flex items-center justify-center text-8xl font-bold text-blue-950">
                                🦷
                              </div>
                            )
                          )}

                          {ws.type === 'custom_image' && ws.customImageUrl && (
                            <img src={ws.customImageUrl} alt="Watermark" className="w-80 h-80 object-contain" />
                          )}

                          {ws.type === 'text' && (
                            <div className="text-6xl font-extrabold uppercase font-serif tracking-widest text-blue-950 -rotate-12 whitespace-nowrap">
                              {ws.text || activeClinic.clinicName}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* LEFT CLINICAL RECORDS COLUMN (38%) */}
                    <div className="col-span-5 border-r border-slate-300 pr-4 space-y-3 text-xs font-sans relative z-10">
                      {/* C/C (Chief Complaints) */}
                      {ccList.filter(Boolean).length > 0 && (
                        <div>
                          <div className="font-bold text-blue-950 uppercase border-b border-blue-900/30 pb-0.5 mb-1 text-[11px] flex justify-between items-center">
                            <span>C/C (Chief Complaints)</span>
                          </div>
                          <div className="space-y-1 pl-1">
                            {ccList.map((c, i) => {
                              if (!c.trim()) return null;
                              const quad = ccQuadrants[i];
                              return (
                                <div key={i} className="flex items-start justify-between text-xs text-slate-800">
                                  <span className="flex-1 font-medium">• {c}</span>
                                  {printIncludeQuadrant && renderToothQuadrantPrint(quad)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* H/O (Medical History) */}
                      {printIncludeHo &&
                        (Object.entries(ho).some(([_, val]) => val) || hoCustomText) && (
                          <div>
                            <div className="font-bold text-blue-950 uppercase border-b border-blue-900/30 pb-0.5 mb-1 text-[11px]">
                              H/O (Medical History)
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1 pl-1">
                              {Object.entries(ho)
                                .filter(([_, val]) => val)
                                .map(([key]) => (
                                  <span
                                    key={key}
                                    className="text-[10px] bg-amber-50 text-amber-900 font-semibold px-1.5 py-0.5 rounded border border-amber-200"
                                  >
                                    {key}
                                  </span>
                                ))}
                            </div>
                            {hoCustomText && (
                              <div className="mt-1 pl-1 text-[11px] text-slate-700 italic">
                                {hoCustomText}
                              </div>
                            )}
                          </div>
                        )}

                      {/* O/E (On Examination) */}
                      {oeList.filter(Boolean).length > 0 && (
                        <div>
                          <div className="font-bold text-blue-950 uppercase border-b border-blue-900/30 pb-0.5 mb-1 text-[11px] flex justify-between items-center">
                            <span>O/E (On Examination)</span>
                          </div>
                          <div className="space-y-1 pl-1">
                            {oeList.map((o, i) => {
                              if (!o.trim()) return null;
                              const quad = oeQuadrants[i];
                              return (
                                <div key={i} className="flex items-start justify-between text-xs text-slate-800">
                                  <span className="flex-1 font-medium">• {o}</span>
                                  {printIncludeQuadrant && renderToothQuadrantPrint(quad)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* I/X (Investigation) */}
                      {ixList.filter(Boolean).length > 0 && (
                        <div>
                          <div className="font-bold text-blue-950 uppercase border-b border-blue-900/30 pb-0.5 mb-1 text-[11px]">
                            I/X (Investigation)
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-800 pl-1">
                            {ixList.filter(Boolean).map((ix, i) => (
                              <li key={i}>{ix}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Diagnosis (Dx) */}
                      {dxList.filter(Boolean).length > 0 && (
                        <div className="bg-sky-50/70 border border-sky-200 rounded p-2">
                          <div className="font-bold text-blue-950 uppercase border-b border-sky-300 pb-0.5 mb-1 text-[11px]">
                            Diagnosis (Dx)
                          </div>
                          <div className="space-y-1">
                            {dxList.map((d, i) => {
                              if (!d.trim()) return null;
                              const quad = dxQuadrants[i];
                              return (
                                <div key={i} className="flex items-start justify-between text-xs text-blue-950 font-bold">
                                  <span className="flex-1">• {d}</span>
                                  {printIncludeQuadrant && renderToothQuadrantPrint(quad)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Treatment Plan */}
                      {treatmentPlanList.filter(Boolean).length > 0 && (
                        <div>
                          <div className="font-bold text-blue-950 uppercase border-b border-blue-900/30 pb-0.5 mb-1 text-[11px]">
                            Treatment Plan
                          </div>
                          <div className="space-y-1 pl-1">
                            {treatmentPlanList.map((tp, i) => {
                              if (!tp.trim()) return null;
                              const quad = treatmentPlanQuadrants[i];
                              return (
                                <div key={i} className="flex items-start justify-between text-xs text-slate-800">
                                  <span className="flex-1">• {tp}</span>
                                  {printIncludeQuadrant && renderToothQuadrantPrint(quad)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Treatment Done */}
                      {treatmentDoneList.filter(Boolean).length > 0 && (
                        <div>
                          <div className="font-bold text-blue-950 uppercase border-b border-blue-900/30 pb-0.5 mb-1 text-[11px]">
                            Treatment Done
                          </div>
                          <div className="space-y-1 pl-1">
                            {treatmentDoneList.map((td, i) => {
                              if (!td.trim()) return null;
                              const quad = treatmentDoneQuadrants[i];
                              return (
                                <div key={i} className="flex items-start justify-between text-xs text-slate-800">
                                  <span className="flex-1">• {td}</span>
                                  {printIncludeQuadrant && renderToothQuadrantPrint(quad)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Special Note */}
                      {specialNoteList.filter(Boolean).length > 0 && (
                        <div>
                          <div className="font-bold text-blue-950 uppercase border-b border-blue-900/30 pb-0.5 mb-1 text-[11px]">
                            Special Note
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-700 pl-1">
                            {specialNoteList.filter(Boolean).map((sn, i) => (
                              <li key={i}>{sn}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* RIGHT MEDICATIONS (Rx) COLUMN (62%) */}
                    <div className="col-span-7 space-y-4 relative z-10">
                      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1">
                        <span className="font-serif italic text-3xl font-bold text-blue-950 leading-none">
                          ℞
                        </span>
                        <span className="text-[11px] font-sans text-slate-500 font-medium">
                          Prescribed Medicines ({medicines.filter((m) => m.brand.trim()).length})
                        </span>
                      </div>

                      {/* Medicines List */}
                      <div className="space-y-3.5 pl-1">
                        {medicines
                          .filter((m) => m.brand.trim() !== '')
                          .map((med, idx) => (
                            <div key={idx} className="text-xs font-sans leading-relaxed">
                              <div className="font-bold text-[13px] text-blue-950">
                                {idx + 1}. {med.brand}
                              </div>
                              <div className="pl-4 text-slate-800 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[11px]">
                                {med.dose && (
                                  <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    {med.dose}
                                  </span>
                                )}
                                {med.instruction && (
                                  <span className="text-slate-700">({med.instruction})</span>
                                )}
                                {med.duration && (
                                  <span className="font-semibold text-purple-900">
                                    -- {med.duration}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}

                        {medicines.filter((m) => m.brand.trim() !== '').length === 0 && (
                          <div className="py-6 text-center text-slate-400 text-xs italic">
                            কোন ওষুধ প্রেসক্রাইব করা হয়নি
                          </div>
                        )}
                      </div>

                      {/* ADVICES */}
                      {printIncludeAdvice && adviceList.filter(Boolean).length > 0 && (
                        <div className="pt-3 border-t border-slate-300 text-xs font-sans">
                          <div className="font-bold text-slate-900 mb-1 flex items-center space-x-1">
                            <span>উপদেশাবলী (Advice):</span>
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-800 pl-1">
                            {adviceList.filter(Boolean).map((adv, idx) => (
                              <li key={idx} className="leading-snug">{adv}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* NEXT VISIT / REVISIT */}
                      {printIncludeNextVisit && revisitOption !== 'প্রয়োজন নেই' && (
                        <div className="pt-2 text-xs font-sans">
                          <div className="inline-block bg-sky-50 border border-sky-300 text-blue-950 px-3 py-1.5 rounded-md font-semibold">
                            <span>পরবর্তী সাক্ষাত / Next Visit:</span>{' '}
                            <span className="text-blue-700 font-bold">{revisitOption}</span>{' '}
                            {nextVisitDate && <span className="font-mono text-slate-700">({nextVisitDate})</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* FOOTER AREA (SIGNATURE & CLINIC DETAILS) */}
                <div className="mt-8 pt-4 border-t border-slate-300">
                  {/* DOCTOR SIGNATURE */}
                  {printIncludeSignature && (
                    <div className="flex justify-between items-end mb-4 text-xs font-sans">
                      <div className="text-slate-400 text-[9px]">
                        Generated by Dentist PRO EMR System • Certified Electronic Record
                      </div>
                      <div className="text-center">
                        <div className="w-48 border-b-2 border-slate-800 mb-1"></div>
                        <div className="font-bold text-slate-900 text-xs">ডাক্তারের স্বাক্ষর / Doctor's Signature</div>
                      </div>
                    </div>
                  )}

                  {/* CLINIC FOOTER BANNER */}
                  {printIncludeFooter && printMode === 'full' && (() => {
                    const activeClinic = clinicSettings || defaultClinicSettings;
                    return (
                      <div className="border-t border-slate-200 pt-2 text-center text-[10px] text-slate-600 font-sans leading-tight">
                        <p>{activeClinic.footerText}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
