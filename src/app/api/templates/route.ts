import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { TemplateModel } from '@/lib/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          message: 'MongoDB connection not configured. Running in offline/local mode.',
          total: 0,
          templates: [],
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search') || '';

    const filter: any = {};
    if (type) {
      filter.type = type;
    }
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { content: regex }];
    }

    const total = await TemplateModel.countDocuments(filter);
    const templates = await TemplateModel.find(filter)
      .sort({ priority: -1, count: -1, createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      total,
      templates,
    });
  } catch (error: any) {
    console.error('Error fetching templates from MongoDB:', error);
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
    const { template, templates } = body;

    // Handle single template save
    if (template && typeof template === 'object') {
      const tmplId = template.id || `tmpl_${Date.now()}`;
      const saved = await TemplateModel.findOneAndUpdate(
        { id: tmplId },
        { $set: { ...template, id: tmplId, updatedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return NextResponse.json({
        success: true,
        message: `Template "${saved.name || tmplId}" saved to MongoDB.`,
        template: saved,
      });
    }

    // Handle batch templates upsert
    if (templates && Array.isArray(templates)) {
      const bulkOps = templates.map((t: any) => ({
        updateOne: {
          filter: { id: t.id },
          update: { $set: { ...t, updatedAt: new Date() } },
          upsert: true,
        },
      }));

      const res = await TemplateModel.bulkWrite(bulkOps);
      return NextResponse.json({
        success: true,
        message: `Batch upserted ${templates.length} templates to MongoDB.`,
        result: {
          matched: res.matchedCount,
          upserted: res.upsertedCount,
          modified: res.modifiedCount,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid payload: provide "template" object or "templates" array.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error saving template to MongoDB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save template to MongoDB' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'MongoDB connection not configured.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing "id" query parameter' }, { status: 400 });
    }

    await TemplateModel.deleteOne({ id });
    return NextResponse.json({ success: true, message: `Template ${id} deleted from MongoDB.` });
  } catch (error: any) {
    console.error('Error deleting template from MongoDB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete template from MongoDB' },
      { status: 500 }
    );
  }
}
