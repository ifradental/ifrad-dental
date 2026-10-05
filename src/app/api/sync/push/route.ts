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
          error: 'MongoDB connection not configured (MONGODB_URI missing). Data preserved in local DB.',
          processed: 0,
          results: [],
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { mutations } = body;

    if (!mutations || !Array.isArray(mutations)) {
      return NextResponse.json({ success: false, error: 'Invalid mutations payload' }, { status: 400 });
    }

    if (mutations.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        total: 0,
        syncedAt: new Date().toISOString(),
        results: [],
      });
    }

    // Process mutations concurrently in parallel batches
    const results = await Promise.all(
      mutations.map(async (mutation) => {
        const { id: queueId, collection, action, documentId, payload } = mutation;
        const Model = modelMap[collection];

        if (!Model) {
          return {
            id: queueId || documentId,
            documentId,
            collection,
            status: 'FAILED' as const,
            error: `Collection "${collection}" is not supported in MongoDB schema`,
          };
        }

        try {
          if (action === 'DELETE') {
            await Model.deleteOne({ id: documentId });
            return { id: queueId || documentId, documentId, collection, status: 'DELETED' as const };
          } else {
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

            return { id: queueId || documentId, documentId, collection, status: 'UPSERTED' as const };
          }
        } catch (mutationErr: any) {
          console.error(`Failed to sync mutation for ${collection}/${documentId}:`, mutationErr.message);
          return {
            id: queueId || documentId,
            documentId,
            collection,
            status: 'FAILED' as const,
            error: mutationErr.message || 'Database write error',
          };
        }
      })
    );

    const successCount = results.filter((r) => r.status === 'UPSERTED' || r.status === 'DELETED').length;

    return NextResponse.json({
      success: successCount > 0 || mutations.length === 0,
      processed: successCount,
      total: mutations.length,
      syncedAt: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error('Error in /api/sync/push:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during sync' },
      { status: 500 }
    );
  }
}

