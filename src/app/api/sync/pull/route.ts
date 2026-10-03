import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { modelMap } from '@/lib/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json({
        success: false,
        message: 'MongoDB connection not configured. Running in offline/client mode.',
        updates: {},
      });
    }

    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get('since');
    const sinceNum = Number(sinceParam || 0);
    const isFullSync = !sinceParam || isNaN(sinceNum) || sinceNum === 0;
    const sinceDate = !isFullSync ? new Date(sinceNum) : new Date(0);

    const updates: Record<string, any[]> = {};
    const allIds: Record<string, string[]> = {};

    await Promise.all(
      Object.entries(modelMap).map(async ([key, Model]) => {
        try {
          const filter = isFullSync
            ? {}
            : {
                $or: [
                  { updatedAt: { $gte: sinceDate } },
                  { createdAt: { $gte: sinceDate } },
                ],
              };

          const [records, idDocs] = await Promise.all([
            Model.find(filter).limit(5000).lean(),
            Model.find({}, { id: 1 }).lean(),
          ]);

          updates[key] = records;
          allIds[key] = idDocs.map((d: any) => d.id).filter(Boolean);
        } catch (err: any) {
          console.warn(`Failed pulling collection ${key}:`, err.message);
          updates[key] = [];
          allIds[key] = [];
        }
      })
    );

    return NextResponse.json({
      success: true,
      pulledAt: new Date().toISOString(),
      isFullSync,
      updates,
      allIds,
    });
  } catch (error: any) {
    console.error('Error in /api/sync/pull:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during pull' },
      { status: 500 }
    );
  }
}
