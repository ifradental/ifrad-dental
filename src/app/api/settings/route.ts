import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SettingsModel } from '@/lib/models';

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
          settings: null,
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || 'default_settings';

    const settings = await SettingsModel.findOne({ id }).lean();

    return NextResponse.json({
      success: true,
      settings: settings || null,
    });
  } catch (error: any) {
    console.error('Error fetching settings from MongoDB:', error);
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
    const settingsData = body.settings || body;
    const settingsId = settingsData.id || 'default_settings';

    const saved = await SettingsModel.findOneAndUpdate(
      { id: settingsId },
      { $set: { ...settingsData, id: settingsId, updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Clinic settings successfully saved to MongoDB.',
      settings: saved,
    });
  } catch (error: any) {
    console.error('Error saving settings to MongoDB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save settings to MongoDB' },
      { status: 500 }
    );
  }
}
