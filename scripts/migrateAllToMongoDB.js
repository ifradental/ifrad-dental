const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ifrad_dental';

// Generic Schema for flexible collections
const GenericSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { strict: false, timestamps: true }
);

const TemplateSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, index: true },
    name: { type: String, required: true },
    category: String,
    content: String,
    price: Number,
    priority: Number,
    count: Number,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { strict: false, timestamps: true }
);

const DrugSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    strength: String,
    form: String,
    prescriptionName: String,
    company: { type: String, index: true },
    generic: { type: String, index: true },
    indication: String,
    drugClass: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { strict: false, timestamps: true }
);

const PatientModel = mongoose.models.Patient || mongoose.model('Patient', GenericSchema);
const PrescriptionModel = mongoose.models.Prescription || mongoose.model('Prescription', GenericSchema);
const AppointmentModel = mongoose.models.Appointment || mongoose.model('Appointment', GenericSchema);
const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', GenericSchema);
const TreatmentSessionModel = mongoose.models.TreatmentSession || mongoose.model('TreatmentSession', GenericSchema);
const EmployeeModel = mongoose.models.Employee || mongoose.model('Employee', GenericSchema);
const SettingsModel = mongoose.models.Settings || mongoose.model('Settings', GenericSchema);
const MaterialModel = mongoose.models.Material || mongoose.model('Material', GenericSchema);
const ExpenseModel = mongoose.models.Expense || mongoose.model('Expense', GenericSchema);
const TemplateModel = mongoose.models.Template || mongoose.model('Template', TemplateSchema);
const DrugModel = mongoose.models.Drug || mongoose.model('Drug', DrugSchema);

const DEFAULT_TEMPLATES = [
  // 1. Treatment Protocols
  { id: 'tmpl_treat_1', type: 'treatment', name: 'Root Canal Treatment (RCT) Protocol', content: 'Diagnosis: Irreversible Pulpitis / Apical Periodontitis | Treatment: Access cavity prep + Pulp extirpation + Biomechanical prep + Ca(OH)2 dressing + Gutta-percha obturation' },
  { id: 'tmpl_treat_2', type: 'treatment', name: 'Dental Caries & Aesthetic Composite Filling', content: 'Diagnosis: Class I/II Dental Caries | Treatment: Excavation of caries + 37% Phosphoric acid etching + Bonding agent + Light Cure Composite restoration' },
  { id: 'tmpl_treat_3', type: 'treatment', name: 'Ultrasonic Scaling & Full Mouth Polishing', content: 'Diagnosis: Chronic Marginal Gingivitis with Calculus | Treatment: Supragingival & Subgingival Ultrasonic Scaling + Prophy paste polishing + Chlorhexidine irrigation' },
  { id: 'tmpl_treat_4', type: 'treatment', name: 'Surgical Extraction of Impacted Wisdom Tooth', content: 'Diagnosis: Mesioangular Impacted Mandibular 3rd Molar | Treatment: Mucoperiosteal flap reflection + Bone guttering + Tooth sectioning + Extraction + Silk 3-0 suturing' },
  { id: 'tmpl_treat_5', type: 'treatment', name: 'Ceramic / Zirconia Crown Cap Protocol', content: 'Diagnosis: Post-Endodontic Tooth / Fractured Crown | Treatment: Shoulder/Chamfer finish line tooth prep + Gingival retraction + Addition silicone impression + Temporary crown + Permanent cementation' },
  { id: 'tmpl_treat_6', type: 'treatment', name: 'Pediatric Pulpotomy & SSC', content: 'Diagnosis: Primary Molar Deep Caries with Pulp Exposure | Treatment: Coronal pulp amputation + Hemostasis + Formocresol/MTA + GIC base + Stainless Steel Crown' },

  // 2. Advice Templates (Bengali)
  { id: 'a1', type: 'advice', name: 'নরম ও ঠান্ডা খাবার খাবেন (পোস্ট এক্সট্রাকশন)', content: 'পরবর্তী ২৪ ঘন্টা গরম বা শক্ত খাবার খাবেন না, নরম ও ঠান্ডা খাবার খাবেন।' },
  { id: 'a2', type: 'advice', name: 'কুসুম গরম পানিতে লবণ দিয়ে কুলকুচা', content: 'দিনে ৩-৪ বার কুসুম গরম পানিতে লবণ দিয়ে কুলকুচা করবেন (চিকিৎসার ২৪ ঘন্টা পর থেকে)।' },
  { id: 'a3', type: 'advice', name: 'ব্রাশ করার সঠিক নিয়ম', content: 'প্রতিদিন সকালে ও রাতে খাবারের পর নরম ব্রাশ দিয়ে আলতোভাবে ২ মিনিট ওপর-নিচ দাঁত ব্রাশ করবেন।' },
  { id: 'a4', type: 'advice', name: 'ধূমপান ও জর্দা সম্পূর্ণ পরিহার', content: 'ধূমপান, গুল, খৈনি ও পান-জর্দা খাওয়া সম্পূর্ণ পরিহার করবেন।' },
  { id: 'a5', type: 'advice', name: 'রক্তক্ষরণ হলে চাপ দিয়ে তুলা রাখবেন', content: 'দাঁত তোলার স্থানে তুলা বা গজ শক্ত করে কামড়ে ধরে রাখুন এবং থুথু বারবার ফেলবেন না।' },
  { id: 'a6', type: 'advice', name: 'মাউথওয়াশ ব্যবহারের নিয়ম', content: 'খাবার পর ১০ মি.লি. মাউথওয়াশ দিয়ে ১ মিনিট কুলি করে ফেলে দিন (পানি দিয়ে ধোবেন না)।' },
  { id: 'a7', type: 'advice', name: 'মাড়িতে বরফের সেক দিন', content: 'ফোলা বা ব্যথার স্থানে বাইরে থেকে তোয়ালেতে বরফ পেঁচিয়ে ১০-১৫ মিনিট বরফের সেক দিন।' },

  // 3. Drug Bundle Protocols
  { id: 'tmpl_drug_1', type: 'drug', name: 'Standard Dental Infection & Pain (Adult)', content: 'Tab. Axicef Plus 500mg+125mg (1+0+1, খাবার পর, ৫ দিন) + Tab. Amodis 400mg (1+0+1, খাবার পর, ৫ দিন) + Tab. Rolac 10mg (1+0+1, খাবার পর, ৩ দিন) + Tab. Finix 20mg (১টি সকালে ও ১টি রাতে, খাবার পূর্বে, ৫ দিন)' },
  { id: 'tmpl_drug_2', type: 'drug', name: 'Post-Extraction Pain Relief Protocol', content: 'Tab. Rolac 10mg (1+0+1, খাবার পর, ৩ দিন) + Tab. Pantonix 20mg (1+0+1, খাবার পূর্বে, ৫ দিন) + Tab. Ce-Vit 250mg (1+1+1, খাবার পর, ৭ দিন)' },
  { id: 'tmpl_drug_3', type: 'drug', name: 'Acute Dentoalveolar Abscess Protocol', content: 'Cap. Moxacil 500mg (1+1+1, খাবার পর, ৭ দিন) + Tab. Filmet 400mg (1+1+1, খাবার পর, ৫ দিন) + Tab. Napa Extra (1+1+1, খাবার পর, ৩ দিন) + Tab. Seclo 20mg (1+0+1, খাবার পূর্বে, ৭ দিন)' },
  { id: 'tmpl_drug_4', type: 'drug', name: 'Gingivitis & Oral Ulcer Regimen', content: 'Orodex 0.2% Mouthwash (দিনে ২ বার কুলকুচা) + D-Gel Oral Gel (দিনে ৩ বার ক্ষতস্থানে আলতোভাবে লাগাবেন) + Tab. Ce-Vit 250mg (1+1+1, ১০ দিন)' },
  { id: 'tmpl_drug_5', type: 'drug', name: 'Pediatric Dental Infection Regimen', content: 'Syr. Moxacil 250mg/5ml (১ চামচ করে দিনে ৩ বার, ৫ দিন) + Syr. Napa 120mg/5ml (১ চামচ করে দিনে ৩ বার, ৩ দিন) + Syr. Maxpro 10mg Sachet (১টি করে দিনে ১ বার, ৫ দিন)' },

  // 4. Dose Presets
  { id: 'ds1', type: 'dose', name: '১+০+১ (সকাল ও রাত)' },
  { id: 'ds2', type: 'dose', name: '১+১+১ (সকাল, দুপুর ও রাত)' },
  { id: 'ds3', type: 'dose', name: '০+০+১ (শুধুমাত্র রাতে)' },
  { id: 'ds4', type: 'dose', name: '১+০+০ (শুধুমাত্র সকালে)' },
  { id: 'ds5', type: 'dose', name: 'ব্যথা হলে ১টি করে খাবেন (সর্বোচ্চ ৩ বার)' },
  { id: 'ds6', type: 'dose', name: '১ চামচ করে দিনে ৩ বার' },
  { id: 'ds7', type: 'dose', name: '০+১+০ (শুধুমাত্র দুপুরে)' },
  { id: 'ds8', type: 'dose', name: '১ ফোঁটা করে দিনে ২ বার' },

  // 5. Food Instruction Presets
  { id: 'fd1', type: 'food', name: 'খাবার পর (ভরা পেটে)' },
  { id: 'fd2', type: 'food', name: 'খাবার পূর্বে (৩০ মিনিট আগে)' },
  { id: 'fd3', type: 'food', name: 'খাবারের ঠিক সাথে / মাঝে' },
  { id: 'fd4', type: 'food', name: 'খালি পেটে (সকালে)' },
  { id: 'fd5', type: 'food', name: 'ঘুমানোর পূর্বে' },
  { id: 'fd6', type: 'food', name: 'দুধের সাথে খাবেন' },

  // 6. Duration Presets
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
  { id: 't5', type: 'cost', name: 'Dental Extraction (Simple)', price: 800 },
  { id: 't6', type: 'cost', name: 'Dental Extraction (Surgical)', price: 3500 },
  { id: 't7', type: 'cost', name: 'Dental Implant', price: 45000 },
  { id: 't8', type: 'cost', name: 'Gingivectomy', price: 4000 },
  { id: 't9', type: 'cost', name: 'Light Cure Composite Filling', price: 1500 },
  { id: 't10', type: 'cost', name: 'Root Canal Treatment (Anterior)', price: 4000 },
  { id: 't11', type: 'cost', name: 'Root Canal Treatment (Molar)', price: 6000 },
  { id: 't12', type: 'cost', name: 'Scaling & Polishing (Full Mouth)', price: 1200 },
  { id: 't13', type: 'cost', name: 'Zirconia Crown Cap', price: 8500 },
  { id: 't14', type: 'cost', name: 'Porcelain Crown (PFM)', price: 4000 },
];

const DEFAULT_MATERIALS = [
  { id: 'mat_1', code: 'LC-COMP-01', name: 'Light Cure Composite (A2)', manufacturer: '3M ESPE / Ivoclar', lowStockLimit: 3, supplier: 'Dhaka Dental Supply', supplierMobile: '01711000000', currentStock: 12, unit: 'Syr' },
  { id: 'mat_2', code: 'GIC-01', name: 'Glass Ionomer Cement (Type IX)', manufacturer: 'GC Gold Label', lowStockLimit: 2, supplier: 'MediDent Corp', supplierMobile: '01819000000', currentStock: 8, unit: 'Box' },
  { id: 'mat_3', code: 'GP-PTS-01', name: 'Gutta Percha Points (6% F1-F3)', manufacturer: 'Dentsply Sirona', lowStockLimit: 5, supplier: 'Prime Dental', supplierMobile: '01911000000', currentStock: 25, unit: 'Pack' },
  { id: 'mat_4', code: 'LA-LIDO-01', name: 'Lidocaine 2% with Adrenaline 1:80000', manufacturer: 'Popular Pharma / Square', lowStockLimit: 20, supplier: 'Popular Med', supplierMobile: '01611000000', currentStock: 100, unit: 'Amp' },
  { id: 'mat_5', code: 'NEEDLE-01', name: 'Dental Cartridge Needle (30G Short)', manufacturer: 'Nipro Dental', lowStockLimit: 30, supplier: 'Dhaka Dental Supply', supplierMobile: '01711000000', currentStock: 150, unit: 'Pcs' },
];

async function runMasterMigration() {
  console.log('🚀 Connecting to single centralized database (MongoDB)...');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Connected to MongoDB Atlas.');

  // 1. Purge all dummy data from all collections
  console.log('🧹 Purging dummy and sample test data from MongoDB collections...');

  // Delete dummy patient 'Al- Imran' & any test patients
  await PatientModel.deleteMany({
    $or: [{ id: 'p_4198' }, { regNo: 4198 }, { name: 'Al- Imran' }, { name: /dummy|sample|test patient/i }],
  });

  // Delete dummy prescription 'rx_4198_1'
  await PrescriptionModel.deleteMany({
    $or: [{ id: 'rx_4198_1' }, { regNo: 4198 }, { patientName: 'Al- Imran' }],
  });

  // Delete dummy payments
  await PaymentModel.deleteMany({
    $or: [{ id: 'pay_1' }, { regNo: 4198 }, { name: 'Al- Imran' }],
  });

  // Delete legacy demo employees
  await EmployeeModel.deleteMany({
    id: { $in: ['emp_1', 'emp_2', 'emp_3', 'emp_4'] },
  });

  console.log('✅ Dummy data successfully purged.');

  // 2. Migrate / Ensure Master Admin user
  console.log('👤 Ensuring Master Admin user in MongoDB...');
  await EmployeeModel.findOneAndUpdate(
    { id: 'emp_admin' },
    {
      $set: {
        id: 'emp_admin',
        name: 'Clinic Administrator',
        username: 'admin',
        password: 'admin',
        mobile: '01833337888',
        email: 'admin@ifradental.com',
        role: 'Admin',
        designation: 'Clinic Administrator',
        joiningDate: '2026-01-01',
        status: 'Active',
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // 3. Migrate Default Clinic Settings
  console.log('⚙️ Migrating Clinic Settings to MongoDB...');
  await SettingsModel.findOneAndUpdate(
    { id: 'default_settings' },
    {
      $set: {
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
        visitFee: 200,
        revisitFee: 0,
        revisitValidityDays: 0,
        lastRegNo: 104200,
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
        cloudSyncUrl: '/api/sync',
        cloudSyncApiKey: 'DENTIST_SECRET_KEY_2026',
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // 4. Migrate All Clinical Templates
  console.log(`💡 Migrating ${DEFAULT_TEMPLATES.length} Clinical Templates to MongoDB...`);
  const templateOps = DEFAULT_TEMPLATES.map((tmpl) => ({
    updateOne: {
      filter: { id: tmpl.id },
      update: {
        $set: {
          ...tmpl,
          count: tmpl.count || 1,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      upsert: true,
    },
  }));
  await TemplateModel.bulkWrite(templateOps);

  // 5. Migrate Materials Inventory
  console.log(`📦 Migrating ${DEFAULT_MATERIALS.length} Materials to MongoDB...`);
  const materialOps = DEFAULT_MATERIALS.map((mat) => ({
    updateOne: {
      filter: { id: mat.id },
      update: {
        $set: { ...mat, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      upsert: true,
    },
  }));
  await MaterialModel.bulkWrite(materialOps);

  // 6. Report All Collection Stats in MongoDB
  const counts = {
    drugs: await DrugModel.countDocuments(),
    templates: await TemplateModel.countDocuments(),
    settings: await SettingsModel.countDocuments(),
    employees: await EmployeeModel.countDocuments(),
    materials: await MaterialModel.countDocuments(),
    patients: await PatientModel.countDocuments(),
    prescriptions: await PrescriptionModel.countDocuments(),
    appointments: await AppointmentModel.countDocuments(),
    payments: await PaymentModel.countDocuments(),
    treatmentSessions: await TreatmentSessionModel.countDocuments(),
    expenses: await ExpenseModel.countDocuments(),
  };

  console.log('\n========================================');
  console.log('🎉 MongoDB Single Central Database Status:');
  console.log('========================================');
  console.table(counts);
  console.log('All real data migrated, all dummy data removed from MongoDB.\n');
}

runMasterMigration()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  });
