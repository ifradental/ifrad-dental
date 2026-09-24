import mongoose, { Schema, Model } from 'mongoose';

// Patient Schema
const PatientSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    regNo: { type: Number, index: true },
    name: { type: String, required: true },
    age: String,
    sex: String,
    mobile: { type: String, index: true },
    address: String,
    occupation: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { strict: false, timestamps: true }
);

// Prescription Schema
const PrescriptionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    regNo: { type: Number, index: true },
    patientId: String,
    patientName: String,
    age: String,
    sex: String,
    mobile: String,
    address: String,
    occupation: String,
    date: { type: String, index: true },
    visitNo: Number,
    cc: [String],
    ho: Object,
    hoCustomText: String,
    oe: [String],
    ix: [String],
    dd: [String],
    dx: [String],
    treatmentPlan: [String],
    treatmentDone: [String],
    specialNote: [String],
    drugHistory: [String],
    medicines: Array,
    advice: [String],
    nextVisitDate: String,
    revisitText: String,
    timeSlot: String,
    referredBy: String,
    contract: Object,
    payment: Object,
    otNotes: Object,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { strict: false, timestamps: true }
);

// Appointment Schema
const AppointmentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    regNo: { type: Number, index: true },
    name: String,
    age: String,
    sex: String,
    mobile: String,
    address: String,
    problem: String,
    doctorId: { type: String, index: true },
    doctorName: String,
    date: { type: String, index: true },
    time: String,
    paid: Number,
    visitFee: Number,
    reference: String,
    status: { type: String, index: true },
    serial: Number,
    apntNo: String,
    prescriptionId: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { strict: false, timestamps: true }
);

// Generic Schema for other collections
const GenericSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { strict: false, timestamps: true }
);

export const PatientModel: Model<any> =
  (mongoose.models.Patient as Model<any>) || mongoose.model('Patient', PatientSchema);
export const PrescriptionModel: Model<any> =
  (mongoose.models.Prescription as Model<any>) || mongoose.model('Prescription', PrescriptionSchema);
export const AppointmentModel: Model<any> =
  (mongoose.models.Appointment as Model<any>) || mongoose.model('Appointment', AppointmentSchema);
export const PaymentModel: Model<any> =
  (mongoose.models.Payment as Model<any>) || mongoose.model('Payment', GenericSchema);
export const TreatmentSessionModel: Model<any> =
  (mongoose.models.TreatmentSession as Model<any>) || mongoose.model('TreatmentSession', GenericSchema);
export const EmployeeModel: Model<any> =
  (mongoose.models.Employee as Model<any>) || mongoose.model('Employee', GenericSchema);
export const SettingsModel: Model<any> =
  (mongoose.models.Settings as Model<any>) || mongoose.model('Settings', GenericSchema);
export const MaterialModel: Model<any> =
  (mongoose.models.Material as Model<any>) || mongoose.model('Material', GenericSchema);
export const ExpenseModel: Model<any> =
  (mongoose.models.Expense as Model<any>) || mongoose.model('Expense', GenericSchema);
// Template Schema with indexes on type and id
const TemplateSchema = new Schema(
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

export const TemplateModel: Model<any> =
  (mongoose.models.Template as Model<any>) || mongoose.model('Template', TemplateSchema);

// Drug Schema with indexes for high-speed clinical search
const DrugSchema = new Schema(
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

export const DrugModel: Model<any> =
  (mongoose.models.Drug as Model<any>) || mongoose.model('Drug', DrugSchema);

// OTP Schema for Password Reset Email Verification (TTL 10 mins)
const OtpSchema = new Schema(
  {
    identifier: { type: String, required: true, index: true },
    email: { type: String, required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true }
);

export const OtpModel: Model<any> =
  (mongoose.models.Otp as Model<any>) || mongoose.model('Otp', OtpSchema);

export const modelMap: Record<string, mongoose.Model<any>> = {
  patients: PatientModel,
  prescriptions: PrescriptionModel,
  appointments: AppointmentModel,
  payments: PaymentModel,
  treatmentSessions: TreatmentSessionModel,
  employees: EmployeeModel,
  settings: SettingsModel,
  materials: MaterialModel,
  expenses: ExpenseModel,
  templates: TemplateModel,
  drugs: DrugModel,
};

/**
 * Ensures that the master Admin user exists in MongoDB.
 * If not present, creates it with default credentials (admin / admin).
 */
export async function ensureDefaultAdminInMongo(): Promise<boolean> {
  try {
    const existingAdmin = await EmployeeModel.findOne({
      $or: [{ role: 'Admin' }, { id: 'emp_admin' }, { username: 'admin' }],
    });

    if (!existingAdmin) {
      const now = new Date();
      await EmployeeModel.create({
        id: 'emp_admin',
        name: 'Clinic Administrator',
        username: 'admin',
        password: 'admin',
        mobile: '01800000000',
        email: 'admin@ifradental.com',
        role: 'Admin',
        designation: 'Clinic Administrator',
        status: 'Active',
        joiningDate: now.toISOString().split('T')[0],
        createdAt: now,
        updatedAt: now,
      });
      console.log('✅ Default master Admin user created in MongoDB.');
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn('Notice: Could not check/seed admin in MongoDB:', err.message);
    return false;
  }
}
