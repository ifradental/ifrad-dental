import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DrugModel } from '@/lib/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          message: 'MongoDB connection not available. Running in local/offline mode.',
          total: 0,
          drugs: [],
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { generic: regex },
        { company: regex },
        { indication: regex },
      ];
    }

    const total = await DrugModel.countDocuments(filter);
    const drugs = await DrugModel.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      drugs,
    });
  } catch (error: any) {
    console.error('Error fetching drugs from MongoDB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'MongoDB connection not configured.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { drugs, drug } = body;

    // Handle single drug upsert
    if (drug && typeof drug === 'object') {
      const drugId = drug.id || `drug_${Date.now()}`;
      const saved = await DrugModel.findOneAndUpdate(
        { id: drugId },
        { $set: { ...drug, id: drugId, updatedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return NextResponse.json({
        success: true,
        message: `Drug ${saved.name || drugId} saved to MongoDB.`,
        drug: saved,
      });
    }

    // Handle batch drugs upsert
    if (drugs && Array.isArray(drugs)) {
      const bulkOps = drugs.map((d: any) => ({
        updateOne: {
          filter: { id: d.id },
          update: { $set: { ...d, updatedAt: new Date() } },
          upsert: true,
        },
      }));

      const res = await DrugModel.bulkWrite(bulkOps);
      return NextResponse.json({
        success: true,
        message: `Batch upserted ${drugs.length} drugs to MongoDB.`,
        result: {
          matched: res.matchedCount,
          upserted: res.upsertedCount,
          modified: res.modifiedCount,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid payload: provide "drug" object or "drugs" array.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error saving drug to MongoDB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save drug to MongoDB' },
      { status: 500 }
    );
  }
}
