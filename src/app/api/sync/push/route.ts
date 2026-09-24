import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { modelMap } from '@/lib/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const db = await connectToDatabase();

    if (!db) {
      return NextResponse.json(
        {
          success: false,
          message: 'MongoDB connection not configured (MONGODB_URI missing). Data preserved in local DB.',
        },
        { status: 200 }
      );
    }

    const body = await req.json();
    const { clientId, mutations } = body;

    if (!mutations || !Array.isArray(mutations)) {
      return NextResponse.json({ error: 'Invalid mutations payload' }, { status: 400 });
    }

    const results: { id: string; collection: string; status: string }[] = [];

    for (const mutation of mutations) {
      const { collection, action, documentId, payload } = mutation;
      const Model = modelMap[collection];

      if (!Model) {
        console.warn(`Collection ${collection} not mapped in Mongoose models.`);
        continue;
      }

      if (action === 'DELETE') {
        await Model.deleteOne({ id: documentId });
        results.push({ id: documentId, collection, status: 'DELETED' });
      } else {
        // UPSERT (INSERT or UPDATE)
        const dataToSave = {
          ...payload,
          id: documentId,
          updatedAt: new Date(),
        };

        await Model.findOneAndUpdate(
          { id: documentId },
          { $set: dataToSave },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        results.push({ id: documentId, collection, status: 'UPSERTED' });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      syncedAt: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error('Error in /api/sync/push:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during sync' },
      { status: 500 }
    );
  }
}
