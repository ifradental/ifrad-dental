const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ifrad_dental';

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
    therapeuticCategory: String,
    adultDose: String,
    pediatricDose: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { strict: false, timestamps: true }
);

const DrugModel = mongoose.models.Drug || mongoose.model('Drug', DrugSchema);

async function migrateDrugs() {
  console.log('Connecting to MongoDB at:', MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@'));
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('Connected to MongoDB successfully.');

    // 1. Remove dummy / test drugs
    console.log('Cleaning up any dummy or corrupted drug entries...');
    const deleteDummyRes = await DrugModel.deleteMany({
      $or: [
        { name: { $regex: /dummy|sample|test drug/i } },
        { generic: { $regex: /dummy|sample|test/i } },
        { company: { $regex: /dummy|sample|test/i } },
      ],
    });
    console.log(`Removed ${deleteDummyRes.deletedCount} dummy records from MongoDB.`);

    // 2. Load 21,200 real drugs from drugsData.json
    const drugsPath = path.join(__dirname, '../src/lib/drugsData.json');
    if (!fs.existsSync(drugsPath)) {
      throw new Error('drugsData.json not found at ' + drugsPath);
    }

    const rawData = fs.readFileSync(drugsPath, 'utf8');
    const drugs = JSON.parse(rawData);
    console.log(`Loaded ${drugs.length} genuine pharmaceutical drug records from database.`);

    // 3. Batch bulkWrite into MongoDB in chunks of 2,000
    const CHUNK_SIZE = 2000;
    let totalUpserted = 0;
    let totalModified = 0;

    for (let i = 0; i < drugs.length; i += CHUNK_SIZE) {
      const chunk = drugs.slice(i, i + CHUNK_SIZE);
      const bulkOps = chunk.map((item, idx) => {
        const drugId = item.id || `med_${i + idx + 1}`;
        const presName = item.prescriptionName || `${item.form || 'TAB.'} ${item.name} ${item.strength || ''}`.trim();
        return {
          updateOne: {
            filter: { id: drugId },
            update: {
              $set: {
                id: drugId,
                name: item.name,
                strength: item.strength || '',
                form: item.form || 'TAB.',
                prescriptionName: presName,
                company: item.company || '',
                generic: item.generic || '',
                indication: item.indication || `${item.therapeuticCategory || 'Dental Medication'}`,
                drugClass: item.drugClass || '',
                therapeuticCategory: item.therapeuticCategory || '',
                adultDose: item.adultDose || '',
                pediatricDose: item.pediatricDose || '',
                updatedAt: new Date(),
              },
              $setOnInsert: {
                createdAt: new Date(),
              },
            },
            upsert: true,
          },
        };
      });

      const res = await DrugModel.bulkWrite(bulkOps, { ordered: false });
      totalUpserted += res.upsertedCount || 0;
      totalModified += res.modifiedCount || 0;
      console.log(`Processed chunk ${i / CHUNK_SIZE + 1}/${Math.ceil(drugs.length / CHUNK_SIZE)} (Upserted: ${res.upsertedCount}, Modified: ${res.modifiedCount})`);
    }

    const finalCount = await DrugModel.countDocuments();
    console.log(`Migration Complete! Total Drugs in MongoDB Atlas: ${finalCount}`);
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

migrateDrugs();
