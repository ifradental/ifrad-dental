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
  Briefcase
} from 'lucide-react';
import { db, type Patient, type Prescription, type Drug, type TemplateItem } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { convertEnglishToBanglaDigits, convertPhoneticToBangla } from '@/lib/banglaPhonetic';
import { checkMedXDrugInteractions } from '@/lib/medxDrugs';

interface PrescriptionEditorProps {
  initialRegNo?: number;
  initialPrescriptionId?: string;
  onSaved?: (prescriptionId: string) => void;
}

export interface ToothQuadrant {
  ur: string;
  ul: string;
  lr: string;
  ll: string;
}

export const defaultQuadrant = (): ToothQuadrant => ({ ur: '', ul: '', lr: '', ll: '' });

export function PrescriptionEditor({ initialRegNo, initialPrescriptionId, onSaved }: PrescriptionEditorProps) {
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
    { particulars: string; quadrant: ToothQuadrant; price: number }[]
  >([
    { particulars: '', quadrant: defaultQuadrant(), price: 0 },
    { particulars: '', quadrant: defaultQuadrant(), price: 0 },
    { particulars: '', quadrant: defaultQuadrant(), price: 0 },
  ]);
  const [contractNo, setContractNo] = useState<string>('1');
  const [totalBill, setTotalBill] = useState<number>(0);
  const [discountTk, setDiscountTk] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [payableAmount, setPayableAmount] = useState<number>(0);
  const [contractStatus, setContractStatus] = useState<'Open' | 'Closed' | 'In-Progress'>('Open');

  // Payment Entry
  const [paidToday, setPaidToday] = useState<number>(0);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [totalDue, setTotalDue] = useState<number>(0);

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
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [templateModalType, setTemplateModalType] = useState<string>('drug');
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
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

      if (initialRegNo) {
        loadPatientByRegNo(initialRegNo);
      } else {
        const lastPrescription = await db.prescriptions.orderBy('regNo').last();
        if (lastPrescription) {
          setRegNo(lastPrescription.regNo + 1);
        }
      }
    }
    loadData();
  }, [initialRegNo]);

  // Recalculate Financials
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

    const paid = Number(paidToday) || 0;
    setTotalPaid(paid);
    setTotalDue(Math.max(0, payable - paid));
  }, [contractRows, discountTk, discountPercent, paidToday]);

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
    updated[index] = {
      ...updated[index],
      brand: brandName,
      dose: autoDose || updated[index].dose || '১+০+১',
      instruction: autoInstruction || updated[index].instruction || 'খাবারের পর',
      duration: autoDuration || updated[index].duration || '০৫ দিন',
    };
    setMedicines(updated);
    setActiveDrugIndex(null);
  };

  // Save Prescription (Offline + Auto-Sync)
  const handleSave = async (andPrint: boolean = false, withoutHeader: boolean = false) => {
    if (!patientName.trim()) {
      alert('অনুগ্রহ করে রোগীর নাম লিখুন!');
      return;
    }

    const prescriptionId = `rx_${regNo}_${visitNo}_${Date.now()}`;

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
    await syncEngine.logMutation('prescriptions', 'INSERT', prescriptionId, prescriptionData);

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
    await autoSaveMedicinesToTemplates(medicines.filter((m) => m.brand.trim() !== ''));

    // Refresh active templates in memory for immediate suggestion availability
    const refreshedTemplates = await db.templates.toArray();
    setAllTemplates(refreshedTemplates);

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
      alert('প্রেসক্রিপশন সফলভাবে অফলাইনে সেভ হয়েছে! ইন্টারনেট থাকলে লাইভ ডাটাবেজে অটো সিঙ্ক হবে।');
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
      { particulars: '', quadrant: defaultQuadrant(), price: 0 },
      { particulars: '', quadrant: defaultQuadrant(), price: 0 },
      { particulars: '', quadrant: defaultQuadrant(), price: 0 },
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

                  <div className="w-24 flex-shrink-0 border border-slate-300 bg-[#eef3f8] rounded overflow-hidden flex flex-col justify-between">
                    <div className="flex border-b border-slate-300 flex-1">
                      <input
                        type="text"
                        value={quad.ur}
                        onChange={(e) => {
                          const q = [...quadrants];
                          q[i] = { ...quad, ur: e.target.value };
                          setQuadrants(q);
                        }}
                        title="Upper Right (UR)"
                        placeholder="UR"
                        className="w-1/2 text-center text-[10px] font-mono border-r border-slate-300 bg-transparent focus:bg-white focus:outline-none"
                      />
                      <input
                        type="text"
                        value={quad.ul}
                        onChange={(e) => {
                          const q = [...quadrants];
                          q[i] = { ...quad, ul: e.target.value };
                          setQuadrants(q);
                        }}
                        title="Upper Left (UL)"
                        placeholder="UL"
                        className="w-1/2 text-center text-[10px] font-mono bg-transparent focus:bg-white focus:outline-none"
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
                        title="Lower Right (LR)"
                        placeholder="LR"
                        className="w-1/2 text-center text-[10px] font-mono border-r border-slate-300 bg-transparent focus:bg-white focus:outline-none"
                      />
                      <input
                        type="text"
                        value={quad.ll}
                        onChange={(e) => {
                          const q = [...quadrants];
                          q[i] = { ...quad, ll: e.target.value };
                          setQuadrants(q);
                        }}
                        title="Lower Left (LL)"
                        placeholder="LL"
                        className="w-1/2 text-center text-[10px] font-mono bg-transparent focus:bg-white focus:outline-none"
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
                {drugHistoryList.map((dh, i) => (
                  <div key={i} className="flex items-center gap-1 relative">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...drugHistoryList];
                        updated[i] = '';
                        setDrugHistoryList(updated);
                      }}
                      className="w-5 h-5 border border-slate-300 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded flex items-center justify-center font-bold text-xs flex-shrink-0"
                      title="Clear"
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
                        onChange={(e) => {
                          const val = e.target.value;
                          const updated = [...drugHistoryList];
                          updated[i] = val;
                          setDrugHistoryList(updated);
                          setActiveDrugHistoryIndex(i);
                          setDrugHistoryQuery(val);
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setActiveDrugHistoryIndex((prev) => (prev === i ? null : prev));
                          }, 250);
                        }}
                        placeholder="e.g. Tab. Metformin 500mg, Tab. Losartan 50mg..."
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-blue-500 font-semibold text-blue-950"
                      />

                      {/* Live Drug Database Autocomplete Suggestion */}
                      {activeDrugHistoryIndex === i && drugHistoryQuery.trim().length > 1 && (
                        <div className="absolute z-[999] left-0 top-full mt-1 w-full min-w-[280px] bg-white border-2 border-blue-500 rounded-md shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                          <div className="bg-blue-600 text-white px-2 py-0.5 text-[10px] font-bold flex justify-between items-center sticky top-0 z-10">
                            <span>💊 Medicine Suggestions ({allDrugs.filter((d) => d.name.toLowerCase().includes(drugHistoryQuery.toLowerCase()) || d.generic.toLowerCase().includes(drugHistoryQuery.toLowerCase())).length})</span>
                            <span className="text-blue-100 text-[9px]">From /drugs Database</span>
                          </div>
                          {allDrugs
                            .filter(
                              (d) =>
                                d.name.toLowerCase().includes(drugHistoryQuery.toLowerCase()) ||
                                d.generic.toLowerCase().includes(drugHistoryQuery.toLowerCase())
                            )
                            .slice(0, 10)
                            .map((drug) => (
                              <div
                                key={drug.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const updated = [...drugHistoryList];
                                  updated[i] = drug.prescriptionName || `${drug.form} ${drug.name} ${drug.strength}`;
                                  setDrugHistoryList(updated);
                                  setActiveDrugHistoryIndex(null);
                                }}
                                className="p-1.5 hover:bg-sky-100 cursor-pointer text-xs transition"
                              >
                                <div className="font-bold text-blue-900 text-[11px]">
                                  {drug.prescriptionName || `${drug.form} ${drug.name} ${drug.strength}`}
                                </div>
                                <div className="text-[10px] text-slate-500 flex justify-between mt-0.5">
                                  <span>Generic: {drug.generic}</span>
                                  <span className="text-slate-400">{drug.company}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {openDropdownSection === 'drughistory' && (
                <div className="border-t border-blue-200 bg-sky-50 p-2 max-h-48 overflow-y-auto divide-y divide-sky-100">
                  <div className="text-[10px] font-bold text-sky-800 uppercase mb-1">Drug History Presets</div>
                  {['Antihypertensive drugs', 'Oral Hypoglycemic Agents (OHA)', 'Anticoagulant / Antiplatelet (Aspirin/Clopidogrel)', 'Steroid therapy', 'Bisphosphonates', 'Anti-epileptic drugs'].map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        const emptyIndex = drugHistoryList.findIndex((d) => !d.trim());
                        if (emptyIndex !== -1) {
                          const updated = [...drugHistoryList];
                          updated[emptyIndex] = preset;
                          setDrugHistoryList(updated);
                        } else {
                          setDrugHistoryList([...drugHistoryList, preset]);
                        }
                        setOpenDropdownSection(null);
                      }}
                      className="py-1 px-1.5 hover:bg-white rounded cursor-pointer text-xs flex justify-between items-center"
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

                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Treatment Template"
                    onClick={() => {
                      setTemplateModalType('treatment');
                      setShowTemplateModal(true);
                    }}
                    readOnly
                    className="px-3 py-1 bg-white text-slate-800 rounded-full text-xs font-medium cursor-pointer shadow-inner w-44 text-center"
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
                            setDrugSearchQuery(med.brand);
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              setActiveDrugIndex((prev) => (prev === index ? null : prev));
                            }, 250);
                          }}
                          placeholder="Type brand/generic name..."
                          className="w-full px-2 py-1 border border-slate-300 rounded font-semibold text-blue-900 focus:outline-none focus:border-blue-500 bg-white"
                        />

                        {/* Instant Drug DB & Template Search Dropdown */}
                        {activeDrugIndex === index && drugSearchQuery.trim().length > 0 && (
                          <div className="absolute z-[999] left-0 top-full mt-1 w-96 bg-white border-2 border-blue-500 rounded-lg shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                            <div className="bg-blue-600 text-white px-3 py-1 text-[11px] font-bold flex justify-between items-center sticky top-0 z-10">
                              <span>💊 Medicines ({allDrugs.filter((d) => d.name.toLowerCase().includes(drugSearchQuery.toLowerCase()) || d.generic.toLowerCase().includes(drugSearchQuery.toLowerCase())).length})</span>
                              <span className="text-blue-100 text-[9px]">Auto-fills Dose, Instruction & Duration</span>
                            </div>
                            {(() => {
                              const q = drugSearchQuery.toLowerCase().trim();
                              // 1. Matched templates (drug_auto & drug)
                              const matchedTemplates = allTemplates.filter(
                                (t) =>
                                  (t.type === 'drug_auto' || t.type === 'drug') &&
                                  t.name.toLowerCase().includes(q)
                              );

                              // 2. Matched drugs from allDrugs
                              const matchedDrugs = allDrugs.filter(
                                (d) =>
                                  d.name.toLowerCase().includes(q) ||
                                  d.generic.toLowerCase().includes(q) ||
                                  (d.prescriptionName && d.prescriptionName.toLowerCase().includes(q))
                              );

                              // Combine items
                              const combinedList = [
                                ...matchedTemplates.map((t) => {
                                  let parsedDose = '১+০+১';
                                  let parsedInst = 'খাবারের পর';
                                  let parsedDur = '০৫ দিন';
                                  if (t.content) {
                                    try {
                                      const p = JSON.parse(t.content);
                                      if (p.dose) parsedDose = p.dose;
                                      if (p.instruction) parsedInst = p.instruction;
                                      if (p.duration) parsedDur = p.duration;
                                    } catch (e) {
                                      const parts = t.content.split(',');
                                      if (parts[0]) parsedDose = parts[0].trim();
                                      if (parts[1]) parsedInst = parts[1].trim();
                                      if (parts[2]) parsedDur = parts[2].trim();
                                    }
                                  }
                                  return {
                                    id: t.id,
                                    name: t.name,
                                    prescriptionName: t.name,
                                    generic: 'Remembered Prescription',
                                    company: 'Auto-saved Template',
                                    dose: parsedDose,
                                    instruction: parsedInst,
                                    duration: parsedDur,
                                    isTemplate: true,
                                  };
                                }),
                                ...matchedDrugs.map((d) => {
                                  const t = allTemplates.find(
                                    (tmpl) =>
                                      (tmpl.type === 'drug_auto' || tmpl.type === 'drug') &&
                                      tmpl.name.toLowerCase().trim() ===
                                        (d.prescriptionName || `${d.form} ${d.name} ${d.strength}`).toLowerCase().trim()
                                  );
                                  let parsedDose = '১+০+১';
                                  let parsedInst = 'খাবারের পর';
                                  let parsedDur = '০৫ দিন';
                                  if (t?.content) {
                                    try {
                                      const p = JSON.parse(t.content);
                                      if (p.dose) parsedDose = p.dose;
                                      if (p.instruction) parsedInst = p.instruction;
                                      if (p.duration) parsedDur = p.duration;
                                    } catch (e) {}
                                  }
                                  return {
                                    ...d,
                                    dose: parsedDose,
                                    instruction: parsedInst,
                                    duration: parsedDur,
                                    isTemplate: !!t,
                                  };
                                }),
                              ];

                              // Deduplicate by prescriptionName / name
                              const seen = new Set<string>();
                              const uniqueList = combinedList
                                .filter((item) => {
                                  const key = (item.prescriptionName || item.name).toLowerCase().trim();
                                  if (seen.has(key)) return false;
                                  seen.add(key);
                                  return true;
                                })
                                .slice(0, 12);

                              if (uniqueList.length === 0) {
                                return (
                                  <div className="p-3 text-center text-slate-400 text-xs">
                                    No medicines found matching &quot;{drugSearchQuery}&quot;
                                  </div>
                                );
                              }

                              return uniqueList.map((drug) => (
                                <div
                                  key={drug.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectDrug(index, drug);
                                  }}
                                  className="p-2 hover:bg-sky-50 cursor-pointer border-b border-slate-100 text-xs transition"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-blue-900">
                                      {drug.prescriptionName || drug.name}
                                    </span>
                                    {drug.isTemplate && (
                                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                                        ⭐ Template
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex justify-between mt-0.5">
                                    <span>{drug.generic}</span>
                                    <span className="text-slate-400">{drug.company}</span>
                                  </div>
                                  <div className="mt-1 flex items-center space-x-1.5 text-[10px] bg-slate-100/90 text-blue-800 font-semibold px-1.5 py-0.5 rounded">
                                    <span>💡 Auto-fill:</span>
                                    <span className="font-mono text-emerald-700">{drug.dose}</span>
                                    <span>•</span>
                                    <span>{drug.instruction}</span>
                                    <span>•</span>
                                    <span className="text-purple-700">{drug.duration}</span>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={med.dose}
                          onChange={(e) =>
                            handleMedicineChange(index, 'dose', convertEnglishToBanglaDigits(e.target.value))
                          }
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
                <div className="space-y-1">
                  {adviceList.map((adv, idx) => (
                    <div key={idx} className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...adviceList];
                          updated[idx] = '';
                          setAdviceList(updated);
                        }}
                        className="w-5 h-5 border border-slate-300 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded flex items-center justify-center font-bold text-xs"
                      >
                        x
                      </button>
                      <input
                        type="text"
                        value={adv}
                        onChange={(e) => {
                          const updated = [...adviceList];
                          updated[idx] = convertPhoneticToBangla(e.target.value);
                          setAdviceList(updated);
                        }}
                        placeholder="নরম ও ঠান্ডা খাবার খাবেন..."
                        className="w-full px-2 py-0.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center -mt-1 relative z-10">
                <button
                  type="button"
                  onClick={() => {
                    setTemplateModalType('advice');
                    setShowTemplateModal(true);
                  }}
                  className="w-12 h-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-b-md flex items-center justify-center shadow transition cursor-pointer"
                  title="Advice Presets"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
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
                <div className="border border-slate-400 bg-white rounded overflow-hidden">
                  <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-300 text-center font-bold text-[11px] py-1 text-slate-700">
                    <div className="col-span-1">X</div>
                    <div className="col-span-5">Particularis</div>
                    <div className="col-span-3">Quadrant</div>
                    <div className="col-span-3">Price/ TK.</div>
                  </div>
                  <div className="divide-y divide-slate-200 bg-[#f7f9fc]">
                    {contractRows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-12 items-center gap-1 p-1">
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...contractRows];
                              updated[idx] = { particulars: '', quadrant: defaultQuadrant(), price: 0 };
                              setContractRows(updated);
                            }}
                            className="w-5 h-5 border border-slate-300 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded flex items-center justify-center font-bold text-xs"
                          >
                            x
                          </button>
                        </div>
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={row.particulars}
                            onChange={(e) => {
                              const updated = [...contractRows];
                              updated[idx] = { ...row, particulars: e.target.value };
                              setContractRows(updated);
                            }}
                            placeholder="e.g. RCT + Zirconia Crown"
                            className="w-full px-1.5 py-1 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                        <div className="col-span-3">
                          <div className="border border-slate-300 bg-white rounded flex flex-col justify-between h-8">
                            <div className="flex border-b border-slate-300 flex-1">
                              <input
                                type="text"
                                value={row.quadrant.ur}
                                onChange={(e) => {
                                  const updated = [...contractRows];
                                  updated[idx] = { ...row, quadrant: { ...row.quadrant, ur: e.target.value } };
                                  setContractRows(updated);
                                }}
                                className="w-1/2 text-center text-[9px] font-mono border-r border-slate-300"
                                placeholder="UR"
                              />
                              <input
                                type="text"
                                value={row.quadrant.ul}
                                onChange={(e) => {
                                  const updated = [...contractRows];
                                  updated[idx] = { ...row, quadrant: { ...row.quadrant, ul: e.target.value } };
                                  setContractRows(updated);
                                }}
                                className="w-1/2 text-center text-[9px] font-mono"
                                placeholder="UL"
                              />
                            </div>
                            <div className="flex flex-1">
                              <input
                                type="text"
                                value={row.quadrant.lr}
                                onChange={(e) => {
                                  const updated = [...contractRows];
                                  updated[idx] = { ...row, quadrant: { ...row.quadrant, lr: e.target.value } };
                                  setContractRows(updated);
                                }}
                                className="w-1/2 text-center text-[9px] font-mono border-r border-slate-300"
                                placeholder="LR"
                              />
                              <input
                                type="text"
                                value={row.quadrant.ll}
                                onChange={(e) => {
                                  const updated = [...contractRows];
                                  updated[idx] = { ...row, quadrant: { ...row.quadrant, ll: e.target.value } };
                                  setContractRows(updated);
                                }}
                                className="w-1/2 text-center text-[9px] font-mono"
                                placeholder="LL"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            value={row.price || ''}
                            onChange={(e) => {
                              const updated = [...contractRows];
                              updated[idx] = { ...row, price: Number(e.target.value) };
                              setContractRows(updated);
                            }}
                            placeholder="0"
                            className="w-full px-1.5 py-1 border border-slate-300 rounded text-xs bg-white text-right font-semibold"
                          />
                        </div>
                      </div>
                    ))}
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
                    value={discountTk || ''}
                    onChange={(e) => {
                      setDiscountTk(Number(e.target.value));
                      setDiscountPercent(0);
                    }}
                    placeholder="0"
                    className="w-full px-2 py-0.5 border border-slate-300 rounded bg-white text-right font-medium"
                  />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-700 font-semibold w-28">Discount (%)</span>
                  <input
                    type="number"
                    value={discountPercent || ''}
                    onChange={(e) => {
                      setDiscountPercent(Number(e.target.value));
                      setDiscountTk(0);
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

          {/* PAYMENT ENTRY SECTION (Matching Screenshot 2) */}
          <div className="bg-[#e4eff9] border border-[#b2d2ec] rounded p-2.5 shadow-sm text-xs mb-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-slate-900 text-sm">Payment Entry</h3>
              <div className="flex items-center space-x-1">
                <span className="text-slate-600 font-semibold text-[11px]">Contact Status</span>
                <select
                  value={contractStatus}
                  onChange={(e: any) => setContractStatus(e.target.value)}
                  className="px-2 py-0.5 border border-yellow-400 rounded bg-[#fffc80] font-bold text-yellow-950 text-xs"
                >
                  <option value="Open">Open</option>
                  <option value="In-Progress">In-Progress</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-12 md:col-span-4 flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-xs uppercase">PAID TODAY:</span>
                <input
                  type="number"
                  value={paidToday || ''}
                  onChange={(e) => setPaidToday(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-2.5 py-1 border-2 border-blue-400 rounded bg-white text-right font-bold text-blue-900 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="col-span-12 md:col-span-8 bg-white p-2 rounded border border-slate-300">
                <div className="text-blue-700 font-bold text-[11px] mb-1">Current Deed Info</div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-1 rounded border border-slate-200">
                    <span className="text-slate-500 text-[10px] block">Total Bill</span>
                    <span className="font-bold text-slate-800 text-xs">৳ {payableAmount}</span>
                  </div>
                  <div className="bg-emerald-50 p-1 rounded border border-emerald-200">
                    <span className="text-emerald-700 text-[10px] block">Total Paid</span>
                    <span className="font-bold text-emerald-800 text-xs">৳ {totalPaid}</span>
                  </div>
                  <div className="bg-red-50 p-1 rounded border border-red-200">
                    <span className="text-red-700 text-[10px] block">Total Due</span>
                    <span className="font-bold text-red-800 text-xs">৳ {totalDue}</span>
                  </div>
                </div>
              </div>
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
                  if (templateModalType === 'cost') return t.type === 'cost';
                  if (templateModalType === 'advice') return t.type === 'advice';
                  if (templateModalType === 'drug') return t.type === 'drug';
                  if (templateModalType === 'treatment') return t.type === 'treatment';
                  return true;
                })
                .map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      if (templateModalType === 'advice' && tmpl.content) {
                        const emptyIdx = adviceList.findIndex((a) => !a.trim());
                        if (emptyIdx !== -1) {
                          const updated = [...adviceList];
                          updated[emptyIdx] = tmpl.content!;
                          setAdviceList(updated);
                        } else {
                          setAdviceList((prev) => [...prev, tmpl.content!]);
                        }
                      } else if (templateModalType === 'cost' && tmpl.price) {
                        const emptyIdx = contractRows.findIndex((c) => !c.particulars.trim());
                        if (emptyIdx !== -1) {
                          const updated = [...contractRows];
                          updated[emptyIdx] = { ...updated[emptyIdx], particulars: tmpl.name, price: tmpl.price };
                          setContractRows(updated);
                        } else {
                          setContractRows([...contractRows, { particulars: tmpl.name, quadrant: defaultQuadrant(), price: tmpl.price }]);
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

      {/* PRINT PREVIEW / PRINTABLE SHEET */}
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
