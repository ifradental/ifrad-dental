import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { AppointmentModel } from '@/lib/models';

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
          appointments: [],
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const doctorId = searchParams.get('doctorId');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';

    const filter: any = {};
    if (date) filter.date = date;
    if (doctorId && doctorId !== 'ALL') filter.doctorId = doctorId;
    if (status && status !== 'ALL') filter.status = status;
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { mobile: regex },
        { apntNo: regex },
        { problem: regex },
      ];
    }

    const total = await AppointmentModel.countDocuments(filter);
    const appointments = await AppointmentModel.find(filter)
      .sort({ serial: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      total,
      appointments,
    });
  } catch (error: any) {
    console.error('Error fetching appointments from MongoDB:', error);
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
    const { appointment, appointments } = body;

    // Handle single appointment upsert
    if (appointment && typeof appointment === 'object') {
      const apntId = appointment.id || `apnt_${Date.now()}`;
      const saved = await AppointmentModel.findOneAndUpdate(
        { id: apntId },
        { $set: { ...appointment, id: apntId, updatedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return NextResponse.json({
        success: true,
        message: `Appointment for "${saved.name || apntId}" saved to MongoDB.`,
        appointment: saved,
      });
    }

    // Handle batch appointments upsert
    if (appointments && Array.isArray(appointments)) {
      const bulkOps = appointments.map((a: any) => ({
        updateOne: {
          filter: { id: a.id },
          update: { $set: { ...a, updatedAt: new Date() } },
          upsert: true,
        },
      }));

      const res = await AppointmentModel.bulkWrite(bulkOps);
      return NextResponse.json({
        success: true,
        message: `Batch upserted ${appointments.length} appointments to MongoDB.`,
        result: {
          matched: res.matchedCount,
          upserted: res.upsertedCount,
          modified: res.modifiedCount,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid payload: provide "appointment" object or "appointments" array.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error saving appointment to MongoDB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save appointment to MongoDB' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ success: false, message: 'MongoDB not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { id, status, prescriptionId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing appointment "id"' }, { status: 400 });
    }

    const updateFields: any = { updatedAt: new Date() };
    if (status) updateFields.status = status;
    if (prescriptionId) updateFields.prescriptionId = prescriptionId;

    const updated = await AppointmentModel.findOneAndUpdate(
      { id },
      { $set: updateFields },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: `Appointment ${id} status updated to ${status} in MongoDB.`,
      appointment: updated,
    });
  } catch (error: any) {
    console.error('Error updating appointment in MongoDB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ success: false, message: 'MongoDB not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing "id" query parameter' }, { status: 400 });
    }

    await AppointmentModel.deleteOne({ id });
    return NextResponse.json({ success: true, message: `Appointment ${id} deleted from MongoDB.` });
  } catch (error: any) {
    console.error('Error deleting appointment from MongoDB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete appointment' },
      { status: 500 }
    );
  }
}
