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
    const sinceDate = sinceParam ? new Date(Number(sinceParam)) : new Date(0);

    const updates: Record<string, any[]> = {};

    for (const [key, Model] of Object.entries(modelMap)) {
      const records = await Model.find({
        updatedAt: { $gte: sinceDate },
      })
        .limit(1000)
        .lean();

      updates[key] = records;
    }

    return NextResponse.json({
      success: true,
      pulledAt: new Date().toISOString(),
      updates,
    });
  } catch (error: any) {
    console.error('Error in /api/sync/pull:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during pull' },
      { status: 500 }
    );
  }
}
