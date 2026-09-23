import Dexie, { type Table } from 'dexie';
import { MEDX_DRUG_DATABASE } from './medxDrugs';

export interface Patient {
  id: string;
  regNo: number;
  name: string;
  age: string;
  sex: 'M' | 'F' | 'Other' | string;
  mobile: string;
  address: string;
  occupation: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineItem {
  no: number;
  brand: string;
  dose: string;
  instruction: string;
  duration: string;
}

export interface ContractInfo {
  contractNo: string;
  particulars: string;
  quadrant: string;
  price: number;
  totalBill: number;
  discountTk: number;
  discountPercent: number;
  payableAmount: number;
  status: 'Open' | 'Closed' | 'In-Progress';
}

export interface PaymentEntry {
  paidToday: number;
  totalBill: number;
  totalPaid: number;
  totalDue: number;
}

export interface OTNotes {
  date?: string;
  time?: string;
  indication?: string;
  operationName?: string;
  procedure?: string;
  preOpDx?: string;
  postOpFinding?: string;
  anesthesiaType?: string;
}

export interface Prescription {
  id: string;
  regNo: number;
  patientId?: string;
  patientName: string;
  age: string;
  sex: string;
  mobile: string;
  address: string;
  occupation: string;
  date: string;
  visitNo: number;
  // Clinical Tabs (Left)
  cc: string[]; // Chief Complaints
  ho: Record<string, boolean>; // History checkboxes: HTN, DM, Asthma, COPD, IHD, CKD, CLD, CVD, Smoking, Tobacco Chewing, Malignancy, Allergy, Psychiatric disorder, Depression, Drug Abuse
  hoCustomText: string;
  oe: string[]; // On Examination (Tooth Quadrant / Note)
  ix: string[]; // Investigation
  dd: string[]; // Differential Diagnosis
  dx: string[]; // Diagnosis
  treatmentPlan: string[];
  treatmentDone: string[];
  specialNote: string[];
  drugHistory: string[];
  // Medicine & Advice (Right)
  medicines: MedicineItem[];
  advice: string[];
  nextVisitDate: string;
  revisitText: string;
  timeSlot?: string;
  referredBy?: string;
  // Contract & Financials
  contract?: ContractInfo;
  payment?: PaymentEntry;
  // Auxiliary
  otNotes?: OTNotes;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface Drug {
  id: string;
  name: string;
  strength: string;
  form: string; // TAB., CAP., SYR., INJ., DROP, GEL, MOUTHWASH
  prescriptionName: string; // e.g. TAB. ACE PLUS 500mg+65mg
  company: string;
  generic: string;
  indication?: string;
  drugClass?: string;
  createdAt: string;
}

export interface TemplateItem {
  id: string;
  type: 
    | 'treatment' 
    | 'advice' 
    | 'drug' 
    | 'dose' 
    | 'food' 
    | 'duration' 
    | 'cost' 
    | 'company_priority' 
    | 'refer_to' 
    | 'cc'
    | 'oe'
    | 'dx'
    | 'ix'
    | 'investigation'
    | 'plan'
    | 'done'
    | 'note'
    | 'cc_auto' 
    | 'oe_auto'
    | 'dx_auto' 
    | 'ix_auto' 
    | 'advice_auto' 
    | 'note_auto' 
    | 'plan_auto' 
    | 'drug_auto'
    | 'drughistory'
    | 'drughistory_auto'
    | (string & {});
  name: string;
  category?: string;
  content?: string;
  price?: number;
  priority?: number;
  count?: number; // Usage frequency for autosave learning
}

export interface Appointment {
  id: string;
  regNo?: number;
  name: string;
  age: string;
  sex: string;
  mobile: string;
  address?: string;
  problem?: string;
  doctorId?: string;
  doctorName?: string;
  date: string;
  time: string;
  paid: number;
  visitFee?: number;
  reference?: string;
  status: 'Scheduled' | 'Waiting' | 'In-Progress' | 'Completed' | 'Cancelled';
  serial: number;
  apntNo: string;
  createdAt: string;
  prescriptionId?: string;
}

export interface PaymentRecord {
  id: string;
  regNo: number;
  name: string;
  mobile: string;
  date: string;
  particulars: string;
  totalBill: number;
  discount: number;
  payableAmount: number;
  paidAmount: number;
  dueAmount: number;
  method?: string; // Cash, bKash, Nagad, Card, Bank Transfer, Other
  note?: string;
  addedBy?: string;
  status?: string;
  createdAt: string;
}

export interface TreatmentSession {
  id: string;
  regNo: number;
  sessionNo: number;
  date: string;
  time?: string;
  doctor?: string;
  assistant?: string;
  treatmentType: string;
  teeth: string[];
  status: 'Completed' | 'In Progress' | 'Scheduled' | 'Planned' | 'Cancelled' | 'Follow-up Required';
  
  // Before Treatment
  beforeCondition?: string;
  symptoms?: string;
  diagnosis?: string;
  toothCondition?: string;
  painLevelBefore?: number;
  clinicalFindings?: string;
  xrayScanNote?: string;
  beforePhotos?: string[];
  beforeDoctorNotes?: string;

  // Treatment Performed
  procedureName?: string;
  procedureDetails?: string;
  materialsUsed?: string;
  medicationUsed?: string;
  duration?: string;
  treatmentDoctorNotes?: string;

  // After Treatment
  afterCondition?: string;
  painLevelAfter?: number;
  treatmentResult?: string;
  clinicalObservation?: string;
  postInstructions?: string;
  followUpRequired?: boolean;
  afterPhotos?: string[];
  afterDoctorNotes?: string;

  // Next Treatment
  nextDate?: string;
  nextTreatment?: string;
  nextTeeth?: string[];
  nextPurpose?: string;
  nextInstructions?: string;

  attachments?: string[];
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  particular: string;
  amount: number;
  note?: string;
  createdAt: string;
}

export type EmployeeRole = 'Doctor' | 'Receptionist' | 'Cashier' | 'Staff' | 'Admin';

export interface Employee {
  id: string;
  name: string;
  username?: string;
  password?: string;
  mobile: string;
  email?: string;
  role: EmployeeRole;
  designation: string;
  bmdcReg?: string;
  specialization?: string;
  salary?: number;
  joiningDate: string;
  address?: string;
  nidOrPassport?: string;
  status: 'Active' | 'Inactive';
  avatar?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MaterialItem {
  id: string;
  code: string;
  name: string;
  manufacturer: string;
  lowStockLimit: number;
  supplier: string;
  supplierMobile: string;
  currentStock: number;
  unit: string;
}

export interface StockEntry {
  id: string;
  materialId: string;
  materialName: string;
  date: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier: string;
  expiryDate: string;
  invoiceNo: string;
  createdAt: string;
}

export interface MaterialUsage {
  id: string;
  materialId: string;
  materialName: string;
  date: string;
  quantity: number;
  patientRegNo?: number;
  procedure?: string;
  note?: string;
  createdAt: string;
}

export interface ClinicSettings {
  id: string;
  clinicName: string;
  doctor1: {
    name: string;
    degrees: string;
    designation: string;
    hospital: string;
    bmdcReg: string;
    mobile: string;
  };
  doctor2: {
    name: string;
    degrees: string;
    designation: string;
    hospital: string;
    bmdcReg: string;
  };
  doctor3: {
    name: string;
    degrees: string;
    designation: string;
    hospital: string;
    bmdcReg: string;
  };
  logoUrl?: string;
  displayLogo: boolean;
  backgroundColor: string;
  footerText: string;
  visitFee: number;
  revisitFee: number;
  revisitValidityDays: number;
  lastRegNo: number;
  printSettings: {
    headerHeightCm: number;
    ptInfoFontSizePt: number;
    ptInfoMarginTopPx: number;
    leftSideWidthCm: number;
    rightSideWidthCm: number;
    prescriptionFontSizePt: number;
    lineGapPt: number;
    rxFontSizePt: number;
    banglaFontSizePt: number;
    adviceFontSizePt: number;
    headerType: 'Text Header' | 'Image Header' | 'Without Header';
    previewHeader: 'With Header' | 'Without Header';
    displayFooter: boolean;
    footerHeightCm: number;
    displayBarcode: boolean;
    displayVisitNo: boolean;
    displayGenericName: boolean;
    displaySignature: boolean;
    displayRx: boolean;
  };
  watermarkSettings?: {
    showWatermark: boolean;
    type: 'logo' | 'text' | 'custom_image';
    customImageUrl?: string;
    text?: string;
    opacity: number;
  };
  cloudSyncUrl: string;
  cloudSyncApiKey: string;
  lastSyncedAt?: string;
}

export interface SyncQueueItem {
  id: string;
  collection: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  documentId: string;
  payload: any;
  timestamp: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  error?: string;
}

class DentalDatabase extends Dexie {
  patients!: Table<Patient, string>;
  prescriptions!: Table<Prescription, string>;
  drugs!: Table<Drug, string>;
  templates!: Table<TemplateItem, string>;
  appointments!: Table<Appointment, string>;
  payments!: Table<PaymentRecord, string>;
  expenses!: Table<ExpenseRecord, string>;
  materials!: Table<MaterialItem, string>;
  stockEntries!: Table<StockEntry, string>;
  materialUsages!: Table<MaterialUsage, string>;
  settings!: Table<ClinicSettings, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  treatmentSessions!: Table<TreatmentSession, string>;
  employees!: Table<Employee, string>;

  constructor() {
    super('DentistProDB');
    this.version(1).stores({
      patients: 'id, regNo, name, mobile, createdAt',
      prescriptions: 'id, regNo, patientId, date, createdAt',
      drugs: 'id, name, generic, brand, form, company',
      templates: 'id, type, name, category, count',
      appointments: 'id, regNo, date, status, serial',
      payments: 'id, regNo, date, createdAt',
      expenses: 'id, date, category',
      materials: 'id, code, name, lowStockLimit',
      stockEntries: 'id, materialId, date, expiryDate',
      materialUsages: 'id, materialId, date, patientRegNo',
      settings: 'id',
      syncQueue: 'id, collection, action, status, timestamp',
    });
    this.version(2).stores({
      treatmentSessions: 'id, regNo, sessionNo, date, status, createdAt',
    });
    this.version(3).stores({
      employees: 'id, name, mobile, role, status, joiningDate, createdAt',
    });
    this.version(4).stores({
      employees: 'id, name, username, mobile, role, status, joiningDate, createdAt',
    });
    this.version(5).stores({
      appointments: 'id, regNo, doctorId, date, status, serial, createdAt',
    });
  }
}

export const db = new DentalDatabase();

// Initial Seed Data Initialization Function
export async function seedInitialDataIfNeeded() {
  if (typeof window === 'undefined') return;
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      id: 'default_settings',
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
      backgroundColor: '#FFFFFF',
      footerText: 'নন্দীপাড়া ব্রিজ সংলগ্ন (২য় তলা), খিলগাঁও, ঢাকা। রোগী দেখার সময়: সকাল ১০টা থেকে দুপুর ২টা, বিকাল ৪টা থেকে রাত ১০টা। যোগাযোগ: 01833-337888',
      visitFee: 500,
      revisitFee: 400,
      revisitValidityDays: 60,
      lastRegNo: 4200,
      printSettings: {
        headerHeightCm: 5.6,
        ptInfoFontSizePt: 12,
        ptInfoMarginTopPx: 5,
        leftSideWidthCm: 8,
        rightSideWidthCm: 10,
        prescriptionFontSizePt: 11,
        lineGapPt: 5,
        rxFontSizePt: 18,
        banglaFontSizePt: 10.5,
        adviceFontSizePt: 9.5,
        headerType: 'Image Header',
        previewHeader: 'With Header',
        displayFooter: true,
        footerHeightCm: 2.0,
        displayBarcode: true,
        displayVisitNo: true,
        displayGenericName: false,
        displaySignature: true,
        displayRx: true,
      },
      cloudSyncUrl: 'http://localhost:5000/api/sync',
      cloudSyncApiKey: 'DENTIST_SECRET_KEY_2026',
    });
  }

  // Preload initial drug database matching Dentist PRO & Comprehensive Catalog (20,000+ Medicines) in background
  setTimeout(async () => {
    try {
      const drugsCount = await db.drugs.count();
      if (drugsCount < 10000) {
        const chunkSize = 2500;
        for (let i = 0; i < MEDX_DRUG_DATABASE.length; i += chunkSize) {
          const chunk = MEDX_DRUG_DATABASE.slice(i, i + chunkSize).map((item, idx) => ({
            id: `d_seed_${i + idx + 1}`,
            name: item.name,
            strength: item.strength,
            form: item.form,
            prescriptionName: item.prescriptionName,
            company: item.company,
            generic: item.generic,
            indication: item.indication || `${item.therapeuticCategory}`,
            drugClass: item.drugClass,
            createdAt: new Date().toISOString(),
          }));
          await db.drugs.bulkPut(chunk);
        }
      }
    } catch (e) {
      console.warn('Background drug seeding notice:', e);
    }
  }, 50);

  // Preload comprehensive templates matching all 16 Dentist PRO categories
  const templateCount = await db.templates.count();
  if (templateCount < 40) {
    const defaultTemplates: TemplateItem[] = [
      // 1. Treatment Templates
      { id: 'tmpl_treat_1', type: 'treatment', name: 'Root Canal Treatment (RCT) Protocol', content: 'Diagnosis: Irreversible Pulpitis / Apical Periodontitis | Treatment: Access cavity prep + Pulp extirpation + Biomechanical prep + Ca(OH)2 dressing + Gutta-percha obturation' },
      { id: 'tmpl_treat_2', type: 'treatment', name: 'Dental Caries & Aesthetic Composite Filling', content: 'Diagnosis: Class I/II Dental Caries | Treatment: Excavation of caries + 37% Phosphoric acid etching + Bonding agent + Light Cure Composite restoration' },
      { id: 'tmpl_treat_3', type: 'treatment', name: 'Ultrasonic Scaling & Full Mouth Polishing', content: 'Diagnosis: Chronic Marginal Gingivitis with Calculus | Treatment: Supragingival & Subgingival Ultrasonic Scaling + Prophy paste polishing + Chlorhexidine irrigation' },
      { id: 'tmpl_treat_4', type: 'treatment', name: 'Surgical Extraction of Impacted Wisdom Tooth', content: 'Diagnosis: Mesioangular Impacted Mandibular 3rd Molar | Treatment: Mucoperiosteal flap reflection + Bone guttering + Tooth sectioning + Extraction + Silk 3-0 suturing' },
      { id: 'tmpl_treat_5', type: 'treatment', name: 'Ceramic / Zirconia Crown Cap Protocol', content: 'Diagnosis: Post-Endodontic Tooth / Fractured Crown | Treatment: Shoulder/Chamfer finish line tooth prep + Gingival retraction + Addition silicone impression + Temporary crown + Permanent cementation' },
      { id: 'tmpl_treat_6', type: 'treatment', name: 'Pediatric Pulpotomy & SSC', content: 'Diagnosis: Primary Molar Deep Caries with Pulp Exposure | Treatment: Coronal pulp amputation + Hemostasis + Formocresol/MTA + GIC base + Stainless Steel Crown' },

      // 2. Advice Templates (Bengali & English)
      { id: 'a1', type: 'advice', name: 'নরম ও ঠান্ডা খাবার খাবেন (পোস্ট এক্সট্রাকশন)', content: 'পরবর্তী ২৪ ঘন্টা গরম বা শক্ত খাবার খাবেন না, নরম ও ঠান্ডা খাবার খাবেন।' },
      { id: 'a2', type: 'advice', name: 'কুসুম গরম পানিতে লবণ দিয়ে কুলকুচা', content: 'দিনে ৩-৪ বার কুসুম গরম পানিতে লবণ দিয়ে কুলকুচা করবেন (চিকিৎসার ২৪ ঘন্টা পর থেকে)।' },
      { id: 'a3', type: 'advice', name: 'ব্রাশ করার সঠিক নিয়ম', content: 'প্রতিদিন সকালে ও রাতে খাবারের পর নরম ব্রাশ দিয়ে আলতোভাবে ২ মিনিট ওপর-নিচ দাঁত ব্রাশ করবেন।' },
      { id: 'a4', type: 'advice', name: 'ধূমপান ও জর্দা সম্পূর্ণ পরিহার', content: 'ধূমপান, গুল, খৈনি ও পান-জর্দা খাওয়া সম্পূর্ণ পরিহার করবেন।' },
      { id: 'a5', type: 'advice', name: 'রক্তক্ষরণ হলে চাপ দিয়ে তুলা রাখবেন', content: 'দাঁত তোলার স্থানে তুলা বা গজ শক্ত করে কামড়ে ধরে রাখুন এবং থুথু বারবার ফেলবেন না।' },
      { id: 'a6', type: 'advice', name: 'মাউথওয়াশ ব্যবহারের নিয়ম', content: 'খাবার পর ১০ মি.লি. মাউথওয়াশ দিয়ে ১ মিনিট কুলি করে ফেলে দিন (পানি দিয়ে ধোবেন না)।' },
      { id: 'a7', type: 'advice', name: 'মাড়িতে বরফের সেক দিন', content: 'ফোলা বা ব্যথার স্থানে বাইরে থেকে তোয়ালেতে বরফ পেঁচিয়ে ১০-১৫ মিনিট বরফের সেক দিন।' },

      // 3. Drug Templates (Predefined Medication Bundles)
      { id: 'tmpl_drug_1', type: 'drug', name: 'Standard Dental Infection & Pain (Adult)', content: 'Tab. Axicef Plus 500mg+125mg (1+0+1, খাবার পর, ৫ দিন) + Tab. Amodis 400mg (1+0+1, খাবার পর, ৫ দিন) + Tab. Rolac 10mg (1+0+1, খাবার পর, ৩ দিন) + Tab. Finix 20mg (১টি সকালে ও ১টি রাতে, খাবার পূর্বে, ৫ দিন)' },
      { id: 'tmpl_drug_2', type: 'drug', name: 'Post-Extraction Pain Relief Protocol', content: 'Tab. Rolac 10mg (1+0+1, খাবার পর, ৩ দিন) + Tab. Pantonix 20mg (1+0+1, খাবার পূর্বে, ৫ দিন) + Tab. Ce-Vit 250mg (1+1+1, খাবার পর, ৭ দিন)' },
      { id: 'tmpl_drug_3', type: 'drug', name: 'Acute Dentoalveolar Abscess Protocol', content: 'Cap. Moxacil 500mg (1+1+1, খাবার পর, ৭ দিন) + Tab. Filmet 400mg (1+1+1, খাবার পর, ৫ দিন) + Tab. Napa Extra (1+1+1, খাবার পর, ৩ দিন) + Tab. Seclo 20mg (1+0+1, খাবার পূর্বে, ৭ দিন)' },
      { id: 'tmpl_drug_4', type: 'drug', name: 'Gingivitis & Oral Ulcer Regimen', content: 'Orodex 0.2% Mouthwash (দিনে ২ বার কুলকুচা) + D-Gel Oral Gel (দিনে ৩ বার ক্ষতস্থানে আলতোভাবে লাগাবেন) + Tab. Ce-Vit 250mg (1+1+1, ১০ দিন)' },
      { id: 'tmpl_drug_5', type: 'drug', name: 'Pediatric Dental Infection Regimen', content: 'Syr. Moxacil 250mg/5ml (১ চামচ করে দিনে ৩ বার, ৫ দিন) + Syr. Napa 120mg/5ml (১ চামচ করে দিনে ৩ বার, ৩ দিন) + Syr. Maxpro 10mg Sachet (১টি করে দিনে ১ বার, ৫ দিন)' },

      // 4. Dose Templates
      { id: 'ds1', type: 'dose', name: '১+০+১ (সকাল ও রাত)' },
      { id: 'ds2', type: 'dose', name: '১+১+১ (সকাল, দুপুর ও রাত)' },
      { id: 'ds3', type: 'dose', name: '০+০+১ (শুধুমাত্র রাতে)' },
      { id: 'ds4', type: 'dose', name: '১+০+০ (শুধুমাত্র সকালে)' },
      { id: 'ds5', type: 'dose', name: 'ব্যথা হলে ১টি করে খাবেন (সর্বোচ্চ ৩ বার)' },
      { id: 'ds6', type: 'dose', name: '১ চামচ করে দিনে ৩ বার' },
      { id: 'ds7', type: 'dose', name: '০+১+০ (শুধুমাত্র দুপুরে)' },
      { id: 'ds8', type: 'dose', name: '১ ফোঁটা করে দিনে ২ বার' },

      // 5. Food Instruction Templates
      { id: 'fd1', type: 'food', name: 'খাবার পর (ভরা পেটে)' },
      { id: 'fd2', type: 'food', name: 'খাবার পূর্বে (৩০ মিনিট আগে)' },
      { id: 'fd3', type: 'food', name: 'খাবারের ঠিক সাথে / মাঝে' },
      { id: 'fd4', type: 'food', name: 'খালি পেটে (সকালে)' },
      { id: 'fd5', type: 'food', name: 'ঘুমানোর পূর্বে' },
      { id: 'fd6', type: 'food', name: 'দুধের সাথে খাবেন' },

      // 6. Duration Templates
      { id: 'dr1', type: 'duration', name: '০৩ দিন' },
      { id: 'dr2', type: 'duration', name: '০৫ দিন' },
      { id: 'dr3', type: 'duration', name: '০৭ দিন' },
      { id: 'dr4', type: 'duration', name: '১০ দিন' },
      { id: 'dr5', type: 'duration', name: '১৪ দিন' },
      { id: 'dr6', type: 'duration', name: '০১ মাস' },
      { id: 'dr7', type: 'duration', name: '০৩ মাস' },
      { id: 'dr8', type: 'duration', name: 'চলবে (কন্টিনিউ)' },
      { id: 'dr9', type: 'duration', name: 'ব্যথা থাকা পর্যন্ত' },

      // 7. Treatment Costs
      { id: 't1', type: 'cost', name: 'Anterior Composite Splinting', price: 2500 },
      { id: 't2', type: 'cost', name: 'Apexogenesis', price: 15000 },
      { id: 't3', type: 'cost', name: 'Apicoectomy', price: 7000 },
      { id: 't4', type: 'cost', name: 'Complete Denture (Acrylic)', price: 30000 },
      { id: 't5', type: 'cost', name: 'Complete Denture (Flexible)', price: 50000 },
      { id: 't6', type: 'cost', name: 'Consultation Fee (New Patient)', price: 500 },
      { id: 't7', type: 'cost', name: 'Consultation Fee (Revisit)', price: 400 },
      { id: 't8', type: 'cost', name: 'Crown Super Special Cap', price: 5500 },
      { id: 't9', type: 'cost', name: 'Curettage & Root Planing', price: 1000 },
      { id: 't10', type: 'cost', name: 'Dental Implant (Single Unit)', price: 40000 },
      { id: 't11', type: 'cost', name: 'Emax All-Ceramic Crown', price: 14000 },
      { id: 't12', type: 'cost', name: 'Excisional Biopsy', price: 5000 },
      { id: 't13', type: 'cost', name: 'Extraction (Adult Anterior Tooth)', price: 1000 },
      { id: 't14', type: 'cost', name: 'Extraction (Adult Posterior Molar)', price: 1500 },
      { id: 't15', type: 'cost', name: 'Impacted Wisdom Tooth Surgical Extraction', price: 6000 },
      { id: 't16', type: 'cost', name: 'Root Canal Treatment (RCT - Anterior)', price: 3500 },
      { id: 't17', type: 'cost', name: 'Root Canal Treatment (RCT - Molar)', price: 4500 },
      { id: 't18', type: 'cost', name: 'Scaling & Full Mouth Polishing', price: 1200 },
      { id: 't19', type: 'cost', name: 'Zirconia Translucent Crown', price: 9500 },
      { id: 't20', type: 'cost', name: 'Orthodontic Braces (Metal Upper & Lower)', price: 65000 },
      { id: 't21', type: 'cost', name: 'In-Office Tooth Whitening (Bleaching)', price: 12000 },

      // 8. Company Priority
      { id: 'cp1', type: 'company_priority', name: 'Square Pharmaceuticals PLC', priority: 1 },
      { id: 'cp2', type: 'company_priority', name: 'Beximco Pharmaceuticals Ltd.', priority: 2 },
      { id: 'cp3', type: 'company_priority', name: 'Incepta Pharmaceuticals Ltd.', priority: 3 },
      { id: 'cp4', type: 'company_priority', name: 'Renata Limited', priority: 4 },
      { id: 'cp5', type: 'company_priority', name: 'The ACME Laboratories Ltd.', priority: 5 },
      { id: 'cp6', type: 'company_priority', name: 'Healthcare Pharmaceuticals Ltd.', priority: 6 },
      { id: 'cp7', type: 'company_priority', name: 'Eskayef Pharmaceuticals Ltd.', priority: 7 },
      { id: 'cp8', type: 'company_priority', name: 'Aristopharma Ltd.', priority: 8 },
      { id: 'cp9', type: 'company_priority', name: 'Popular Pharmaceuticals Ltd.', priority: 9 },
      { id: 'cp10', type: 'company_priority', name: 'Opsonin Pharma Limited', priority: 10 },

      // 9. Refer to
      { id: 'ref1', type: 'refer_to', name: 'Oral & Maxillofacial Surgeon (ম্যাক্সিলোফেসিয়াল সার্জন)', content: 'Complex surgical extractions, jaw fractures, biopsies and cyst enucleation' },
      { id: 'ref2', type: 'refer_to', name: 'Orthodontist (অর্থোডন্টিস্ট - ব্রেসেস ও আঁকাবাঁকা দাঁত)', content: 'Fixed metal/ceramic braces, clear aligners and malocclusion correction' },
      { id: 'ref3', type: 'refer_to', name: 'Prosthodontist (প্রোস্থোডন্টিস্ট - কৃত্রিম ক্যাপ ও ইমপ্ল্যান্ট)', content: 'Full mouth rehabilitation, dental implants and full dentures' },
      { id: 'ref4', type: 'refer_to', name: 'Endodontist (এন্ডোডন্টিস্ট - রুট ক্যানেল স্পেশালিস্ট)', content: 'Complex curved canals, retreatments, and apicoectomy' },
      { id: 'ref5', type: 'refer_to', name: 'Cardiologist / General Physician', content: 'Hypertension evaluation, uncontrolled diabetes & bleeding profile clearance' },
      { id: 'ref6', type: 'refer_to', name: 'Dhaka Dental College & Hospital (ঢাকা ডেন্টাল কলেজ)', content: 'Mirpur-14, Dhaka' },

      // 10. C/C Autosave
      { id: 'cc1', type: 'cc_auto', name: 'Tooth Pain / দাঁতে তীব্র ব্যথা', count: 120 },
      { id: 'cc2', type: 'cc_auto', name: 'Dental Caries / দাঁতে গর্ত ও ক্যাভিটি', count: 95 },
      { id: 'cc3', type: 'cc_auto', name: 'Gum Bleeding / মাড়ি দিয়ে রক্ত পড়া', count: 65 },
      { id: 'cc4', type: 'cc_auto', name: 'Hypersensitivity / ঠান্ডা বা মিষ্টি খেলে শিরশির করা', count: 50 },
      { id: 'cc5', type: 'cc_auto', name: 'Swelling in Gums / মাড়ি ফোলা ও পুঁজ পড়া', count: 42 },
      { id: 'cc6', type: 'cc_auto', name: 'Broken / Fractured Tooth (দাঁত ভেঙে যাওয়া)', count: 38 },
      { id: 'cc7', type: 'cc_auto', name: 'Food Impaction / দাঁতের ফাঁকে খাবার আটকে থাকা', count: 35 },
      { id: 'cc8', type: 'cc_auto', name: 'Missing Teeth / কৃত্রিম দাঁত বসানো', count: 28 },
      { id: 'cc9', type: 'cc_auto', name: 'Bad Breath / মুখের দুর্গন্ধ (Halitosis)', count: 22 },
      { id: 'cc10', type: 'cc_auto', name: 'Mobile / Shaky Teeth (দাঁত নড়বড়ে হওয়া)', count: 19 },

      // 11. D/X Autosave
      { id: 'dx1', type: 'dx_auto', name: 'Acute Irreversible Pulpitis', count: 88 },
      { id: 'dx2', type: 'dx_auto', name: 'Chronic Apical Periodontitis', count: 72 },
      { id: 'dx3', type: 'dx_auto', name: 'Dental Caries (Class I/II)', count: 64 },
      { id: 'dx4', type: 'dx_auto', name: 'Chronic Marginal Gingivitis', count: 58 },
      { id: 'dx5', type: 'dx_auto', name: 'Chronic Generalized Periodontitis', count: 45 },
      { id: 'dx6', type: 'dx_auto', name: 'Impacted Mandibular Third Molar', count: 39 },
      { id: 'dx7', type: 'dx_auto', name: 'Periapical Abscess with Fistula', count: 33 },
      { id: 'dx8', type: 'dx_auto', name: 'Non-Vital Tooth / Pulp Necrosis', count: 27 },
      { id: 'dx9', type: 'dx_auto', name: 'Dentine Hypersensitivity', count: 25 },
      { id: 'dx10', type: 'dx_auto', name: 'Retained Root Stump', count: 20 },

      // 12. I/X Autosave
      { id: 'ix1', type: 'ix_auto', name: 'IOPA X-Ray (Intraoral Periapical Radiograph)', count: 95 },
      { id: 'ix2', type: 'ix_auto', name: 'OPG (Full Mouth Panoramic Digital X-Ray)', count: 48 },
      { id: 'ix3', type: 'ix_auto', name: 'Blood Sugar (RBS / Fasting)', count: 35 },
      { id: 'ix4', type: 'ix_auto', name: 'Complete Blood Count (CBC with ESR)', count: 25 },
      { id: 'ix5', type: 'ix_auto', name: 'BT, CT, PT, INR (Bleeding Profile)', count: 20 },
      { id: 'ix6', type: 'ix_auto', name: 'CBCT 3D Scan', count: 15 },
      { id: 'ix7', type: 'ix_auto', name: 'Pulp Vitality Electric/Cold Test', count: 30 },

      // 13. Advice Autosave
      { id: 'adv_auto_1', type: 'advice_auto', name: 'পরবর্তী ২৪ ঘন্টা গরম বা শক্ত খাবার খাবেন না, নরম ও ঠান্ডা খাবার খাবেন।', count: 90 },
      { id: 'adv_auto_2', type: 'advice_auto', name: 'দিনে ৩-৪ বার কুসুম গরম পানিতে লবণ দিয়ে কুলকুচা করবেন (২৪ ঘন্টা পর থেকে)।', count: 85 },
      { id: 'adv_auto_3', type: 'advice_auto', name: 'প্রতিদিন সকালে ও রাতে খাবারের পর নরম ব্রাশ দিয়ে ২ মিনিট দাঁত ব্রাশ করবেন।', count: 70 },
      { id: 'adv_auto_4', type: 'advice_auto', name: 'ধূমপান, গুল ও পান-জর্দা খাওয়া সম্পূর্ণ পরিহার করবেন।', count: 60 },
      { id: 'adv_auto_5', type: 'advice_auto', name: 'দাঁত তোলার স্থানে তুলা বা গজ শক্ত করে কামড়ে ধরে রাখুন।', count: 55 },

      // 14. Note Autosave
      { id: 'note1', type: 'note_auto', name: 'Advised not to chew hard food on the affected side.', count: 65 },
      { id: 'note2', type: 'note_auto', name: 'LA (Lignox 2%) administered without immediate complications.', count: 50 },
      { id: 'note3', type: 'note_auto', name: 'Patient informed about RCT procedure, risks and crown necessity.', count: 45 },
      { id: 'note4', type: 'note_auto', name: 'Temporary Cavit filling placed. Keep dry for 1 hour.', count: 38 },
      { id: 'note5', type: 'note_auto', name: 'High blood pressure noted. Physician clearance suggested.', count: 20 },

      // 15. Plan Autosave
      { id: 'plan1', type: 'plan_auto', name: 'Root Canal Treatment (RCT) + Crown / Cap', count: 82 },
      { id: 'plan2', type: 'plan_auto', name: 'Light Cure Composite Aesthetic Filling', count: 75 },
      { id: 'plan3', type: 'plan_auto', name: 'Ultrasonic Scaling + Polishing + Gum Treatment', count: 68 },
      { id: 'plan4', type: 'plan_auto', name: 'Permanent Extraction under Local Anesthesia', count: 55 },
      { id: 'plan5', type: 'plan_auto', name: 'Surgical Odontectomy for Impacted Tooth', count: 32 },
      { id: 'plan6', type: 'plan_auto', name: 'Crown / Cap Placement (Zirconia / Emax)', count: 40 },
      { id: 'plan7', type: 'plan_auto', name: 'Flexible / Acrylic Removable Partial Denture', count: 25 },

      // 16. Drug Autosave
      { id: 'drug_auto_1', type: 'drug_auto', name: 'TAB. AXICEF PLUS 500mg+125mg', count: 110 },
      { id: 'drug_auto_2', type: 'drug_auto', name: 'TAB. AMODIS 400mg', count: 98 },
      { id: 'drug_auto_3', type: 'drug_auto', name: 'TAB. ROLAC 10mg', count: 95 },
      { id: 'drug_auto_4', type: 'drug_auto', name: 'TAB. FINIX 20mg', count: 90 },
      { id: 'drug_auto_5', type: 'drug_auto', name: 'TAB. ROCAL D 500mg+200IU', count: 70 },
      { id: 'drug_auto_6', type: 'drug_auto', name: 'TAB. CEVIT 250mg', count: 65 },
      { id: 'drug_auto_7', type: 'drug_auto', name: 'CAP. MOXACIL 500mg', count: 60 },
      { id: 'drug_auto_8', type: 'drug_auto', name: 'TAB. NAPA EXTRA 500mg+65mg', count: 58 },
      { id: 'drug_auto_9', type: 'drug_auto', name: 'ORODEX MOUTHWASH 0.2%', count: 45 },
      { id: 'drug_auto_10', type: 'drug_auto', name: 'D-GEL ORAL GEL', count: 35 },

      // 17. Drug History Autosave
      { id: 'dh_auto_1', type: 'drughistory_auto', name: 'Tab. Metformin 500mg (1+0+1)', count: 95 },
      { id: 'dh_auto_2', type: 'drughistory_auto', name: 'Tab. Losartan 50mg (0+0+1)', count: 85 },
      { id: 'dh_auto_3', type: 'drughistory_auto', name: 'Tab. Amlodipine 5mg (1+0+0)', count: 80 },
      { id: 'dh_auto_4', type: 'drughistory_auto', name: 'Tab. Ecosprin 75mg (0+1+0)', count: 75 },
      { id: 'dh_auto_5', type: 'drughistory_auto', name: 'Tab. Rosuvastatin 10mg (0+0+1)', count: 65 },
      { id: 'dh_auto_6', type: 'drughistory_auto', name: 'Tab. Bisoprolol 2.5mg (1+0+0)', count: 50 },
      { id: 'dh_auto_7', type: 'drughistory_auto', name: 'Inj. Insulin (Regular / Mixed)', count: 45 },
      { id: 'dh_auto_8', type: 'drughistory_auto', name: 'Tab. Thyrox 50mcg (1+0+0)', count: 40 },
      { id: 'dh_auto_9', type: 'drughistory_auto', name: 'Tab. Clopidogrel 75mg (0+1+0)', count: 35 },
      { id: 'dh_auto_10', type: 'drughistory_auto', name: 'Inhaler Salbutamol / Seretide', count: 30 },
    ];
    await db.templates.bulkPut(defaultTemplates);
  } else {
    // Ensure drug history templates exist even in existing DB
    const dhCount = await db.templates.where('type').equals('drughistory_auto').count();
    if (dhCount === 0) {
      await db.templates.bulkPut([
        { id: 'dh_auto_1', type: 'drughistory_auto', name: 'Tab. Metformin 500mg (1+0+1)', count: 95 },
        { id: 'dh_auto_2', type: 'drughistory_auto', name: 'Tab. Losartan 50mg (0+0+1)', count: 85 },
        { id: 'dh_auto_3', type: 'drughistory_auto', name: 'Tab. Amlodipine 5mg (1+0+0)', count: 80 },
        { id: 'dh_auto_4', type: 'drughistory_auto', name: 'Tab. Ecosprin 75mg (0+1+0)', count: 75 },
        { id: 'dh_auto_5', type: 'drughistory_auto', name: 'Tab. Rosuvastatin 10mg (0+0+1)', count: 65 },
        { id: 'dh_auto_6', type: 'drughistory_auto', name: 'Tab. Bisoprolol 2.5mg (1+0+0)', count: 50 },
        { id: 'dh_auto_7', type: 'drughistory_auto', name: 'Inj. Insulin (Regular / Mixed)', count: 45 },
        { id: 'dh_auto_8', type: 'drughistory_auto', name: 'Tab. Thyrox 50mcg (1+0+0)', count: 40 },
        { id: 'dh_auto_9', type: 'drughistory_auto', name: 'Tab. Clopidogrel 75mg (0+1+0)', count: 35 },
        { id: 'dh_auto_10', type: 'drughistory_auto', name: 'Inhaler Salbutamol / Seretide', count: 30 },
      ]);
    }
  }

  // Preload sample materials
  const matCount = await db.materials.count();
  if (matCount === 0) {
    const defaultMaterials: MaterialItem[] = [
      { id: 'm1', code: '30', name: 'UST GEL', manufacturer: 'MEDPHYSIO', lowStockLimit: 1, supplier: 'IBRAHIM', supplierMobile: '01834920000', currentStock: 8, unit: 'Pcs' },
      { id: 'm2', code: '29', name: 'BABY TOOTH FORCEP', manufacturer: 'DARAZ', lowStockLimit: 7, supplier: 'DARAZ', supplierMobile: '01900000000', currentStock: 12, unit: 'Set' },
      { id: 'm3', code: '28', name: 'DICLOGEL', manufacturer: 'INCEPTA', lowStockLimit: 5, supplier: 'ASRAFUL', supplierMobile: '01709650000', currentStock: 15, unit: 'Tube' },
      { id: 'm4', code: '25', name: 'PUNCH BIOPSY BLADE', manufacturer: 'MIDFORT', lowStockLimit: 10, supplier: 'MIDFORT', supplierMobile: '01800000000', currentStock: 25, unit: 'Box' },
      { id: 'm5', code: '24', name: 'COMPOSITE RESIN KIT', manufacturer: '3M ESPE', lowStockLimit: 2, supplier: 'DENTAL ZONE', supplierMobile: '01711223344', currentStock: 6, unit: 'Kit' },
      { id: 'm6', code: '23', name: 'LOCAL ANESTHESIA (LIGNOX 2%)', manufacturer: 'INDOCO', lowStockLimit: 10, supplier: 'MED CARE', supplierMobile: '01688997766', currentStock: 45, unit: 'Ampoule' }
    ];
    await db.materials.bulkAdd(defaultMaterials);
  }

  // Preload a sample patient & prescription matching the screenshot
  const patientsCount = await db.patients.count();
  if (patientsCount === 0) {
    const samplePatient: Patient = {
      id: 'p_4198',
      regNo: 4198,
      name: 'Al- Imran',
      age: '30',
      sex: 'M',
      mobile: '01682519091',
      address: '01 No Road Dokkhingan',
      occupation: 'Job Holder',
      createdAt: '2026-09-03T10:00:00.000Z',
      updatedAt: '2026-09-03T10:00:00.000Z',
    };
    await db.patients.add(samplePatient);

    const samplePrescription: Prescription = {
      id: 'rx_4198_1',
      regNo: 4198,
      patientId: 'p_4198',
      patientName: 'Al- Imran',
      age: '30',
      sex: 'M',
      mobile: '01682519091',
      address: '01 No Road Dokkhingan',
      occupation: 'Job Holder',
      date: '03/09/2026',
      visitNo: 1,
      cc: ['Severe toothache in lower right molar', 'Gum bleeding during brushing'],
      ho: {
        HTN: false,
        DM: false,
        Asthma: false,
        Smoking: true,
      },
      hoCustomText: 'No major drug allergies reported.',
      oe: ['Tooth 46 deep dental caries with pulp exposure'],
      ix: ['IOPA X-Ray of 46'],
      dd: ['Acute Irreversible Pulpitis'],
      dx: ['Acute Apical Periodontitis with Pulpitis'],
      treatmentPlan: ['Root Canal Treatment (RCT) in 46', 'Scaling & Root Planing'],
      treatmentDone: ['Access cavity preparation done under LA', 'Pulp extirpation and canal dressed with Ca(OH)2'],
      specialNote: ['Advised not to chew hard food on right side'],
      drugHistory: ['Took Tab. Ace 500mg 2 days ago'],
      medicines: [
        { no: 1, brand: 'TAB. AXICEF PLUS 500mg+125mg', dose: '১+০+১', instruction: 'খাবার পর', duration: '০৫ দিন' },
        { no: 2, brand: 'TAB. AMODIS 400mg', dose: '১+০+১', instruction: 'খাবার পর', duration: '৭ দিন' },
        { no: 3, brand: 'TAB. ROLAC 10mg', dose: '১+০+১', instruction: 'খাবার পর ব্যথা হলে', duration: '২ দিন' },
        { no: 4, brand: 'TAB. FINIX 20mg', dose: '১ টি সকালে ও ১ টি রাতে খাবেন', instruction: 'আহারের ৩০ মি. পূর্বে', duration: '২ দিন' },
        { no: 5, brand: 'TAB. ROCAL D 500mg+200IU', dose: '১টি করে দুপুরে খাবেন', instruction: 'খাবার পর', duration: '৩ মাস' },
        { no: 6, brand: 'TAB. CEVIT 250mg', dose: '১+১+১', instruction: 'খাবার পর', duration: '১০ দিন' },
      ],
      advice: [
        'পরবর্তী ২৪ ঘন্টা গরম বা শক্ত খাবার খাবেন না, নরম ও ঠান্ডা খাবার খাবেন।',
        'দিনে ৩-৪ বার কুসুম গরম পানিতে লবণ দিয়ে কুলকুচা করবেন (২৪ ঘন্টা পর থেকে)।',
        'প্রতিদিন সকালে ও রাতে খাবারের পর নরম ব্রাশ দিয়ে আলতোভাবে দাঁত ব্রাশ করবেন।'
      ],
      nextVisitDate: '10/09/2026',
      revisitText: '০৭ দিন পর পুনরায় দেখা করবেন (RCT 2nd Sitting)',
      contract: {
        contractNo: '1',
        particulars: 'RCT #46 + Crown',
        quadrant: 'Lower Right (Quadrant 4)',
        price: 8000,
        totalBill: 8000,
        discountTk: 500,
        discountPercent: 0,
        payableAmount: 7500,
        status: 'In-Progress'
      },
      payment: {
        paidToday: 3000,
        totalBill: 7500,
        totalPaid: 3000,
        totalDue: 4500
      },
      createdAt: '2026-09-03T10:30:00.000Z',
      updatedAt: '2026-09-03T10:30:00.000Z',
      synced: true,
    };
    await db.prescriptions.add(samplePrescription);

    // Add payment entry
    await db.payments.add({
      id: 'pay_1',
      regNo: 4198,
      name: 'Al- Imran',
      mobile: '01682519091',
      date: '03-09-2026',
      particulars: 'RCT 1st Installment',
      totalBill: 7500,
      discount: 500,
      payableAmount: 7500,
      paidAmount: 3000,
      dueAmount: 4500,
      createdAt: '2026-09-03T10:30:00.000Z'
    });
  }

  // Remove any legacy demo employees so employee data is 100% dynamic
  const demoIds = ['emp_1', 'emp_2', 'emp_3', 'emp_4'];
  for (const id of demoIds) {
    const existing = await db.employees.get(id);
    if (
      existing &&
      (existing.name === 'ডা. নাহিদ হাসান' ||
        existing.name === 'সাদিয়া আফরিন' ||
        existing.name === 'তানভীর আহমেদ' ||
        existing.name === 'রিনা আক্তার')
    ) {
      await db.employees.delete(id);
    }
  }

  // Ensure master Admin exists in db.employees if no admin exists yet
  const adminEmp = await db.employees.get('emp_admin');
  const anyAdmin = await db.employees.where('role').equals('Admin').first();
  if (!adminEmp && !anyAdmin) {
    await db.employees.add({
      id: 'emp_admin',
      name: 'Clinic Administrator',
      username: 'admin',
      password: 'admin',
      mobile: '01800000000',
      email: 'admin@ifradental.com',
      role: 'Admin',
      designation: 'Clinic Administrator',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

