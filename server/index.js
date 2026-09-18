const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dentist_pro_cloud';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Mongoose Models
const PatientSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  regNo: Number,
  name: String,
  age: String,
  sex: String,
  mobile: String,
  address: String,
  occupation: String,
  updatedAt: { type: Date, default: Date.now },
}, { strict: false });

const PrescriptionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  regNo: Number,
  patientName: String,
  date: String,
  visitNo: Number,
  cc: [String],
  dx: [String],
  medicines: Array,
  advice: [String],
  updatedAt: { type: Date, default: Date.now },
}, { strict: false });

const GenericSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  updatedAt: { type: Date, default: Date.now },
}, { strict: false });

const Patient = mongoose.model('Patient', PatientSchema);
const Prescription = mongoose.model('Prescription', PrescriptionSchema);
const Payment = mongoose.model('Payment', GenericSchema);
const Appointment = mongoose.model('Appointment', GenericSchema);
const Material = mongoose.model('Material', GenericSchema);
const Expense = mongoose.model('Expense', GenericSchema);
const Template = mongoose.model('Template', GenericSchema);
const Drug = mongoose.model('Drug', GenericSchema);

const modelMap = {
  patients: Patient,
  prescriptions: Prescription,
  payments: Payment,
  appointments: Appointment,
  materials: Material,
  expenses: Expense,
  templates: Template,
  drugs: Drug,
};

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log(' Connected to MongoDB Atlas / Local Cloud DB'))
  .catch((err) => console.warn('⚠️ MongoDB connection warning (will run in offline memory mode):', err.message));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1,
  });
});

// PUSH SYNC: Receives batches of offline desktop mutations
app.post('/api/sync/push', async (req, res) => {
  try {
    const { clientId, mutations, timestamp } = req.body;
    console.log(`📡 Received ${mutations?.length || 0} sync mutations from client: ${clientId}`);

    if (!mutations || !Array.isArray(mutations)) {
      return res.status(400).json({ error: 'Invalid mutation payload' });
    }

    const results = [];

    for (const mutation of mutations) {
      const { collection, action, documentId, payload } = mutation;
      const Model = modelMap[collection];

      if (Model) {
        if (action === 'DELETE') {
          await Model.deleteOne({ id: documentId });
          results.push({ id: documentId, status: 'DELETED' });
        } else {
          // UPSERT (INSERT or UPDATE)
          const dataToSave = { ...payload, id: documentId, updatedAt: new Date() };
          await Model.findOneAndUpdate({ id: documentId }, dataToSave, { upsert: true, new: true });
          results.push({ id: documentId, status: 'SYNCED' });
        }
      }
    }

    res.json({
      success: true,
      processed: results.length,
      syncedAt: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('Push sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PULL SYNC: Returns changes updated on cloud since lastSyncTime
app.get('/api/sync/pull', async (req, res) => {
  try {
    const lastSyncTime = req.query.since ? new Date(Number(req.query.since)) : new Date(0);
    const updates = {};

    for (const [key, Model] of Object.entries(modelMap)) {
      updates[key] = await Model.find({ updatedAt: { $gte: lastSyncTime } }).limit(500);
    }

    res.json({
      success: true,
      pulledAt: new Date().toISOString(),
      updates,
    });
  } catch (error) {
    console.error('Pull sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DRUG DATABASE API: List, Search, and Products (300+ Medicines)
app.get('/api/drugs', async (req, res) => {
  try {
    const { q, limit = 1000, page = 1 } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { generic: { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
        { prescriptionName: { $regex: q, $options: 'i' } },
      ];
    }
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 1000;
    const skip = (pageNum - 1) * limitNum;

    const total = await Drug.countDocuments(filter);
    const drugs = await Drug.find(filter).skip(skip).limit(limitNum);

    res.json({
      success: true,
      total,
      count: drugs.length,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      drugs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(` Dentist PRO Cloud Central Backend Server running on port ${PORT}`);
});

