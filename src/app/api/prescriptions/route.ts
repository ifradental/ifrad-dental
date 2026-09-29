import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PrescriptionModel, PatientModel, AppointmentModel } from '@/lib/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          message: 'MongoDB connection not configured. Running in local mode.',
          total: 0,
          prescriptions: [],
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const regNo = searchParams.get('regNo');
    const date = searchParams.get('date');
    const mobile = searchParams.get('mobile');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (id) {
      const rx = await PrescriptionModel.findOne({ id }).lean();
      if (!rx) {
        return NextResponse.json({ success: false, message: 'Prescription not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, prescription: rx });
    }

    const filter: any = {};
    if (regNo) filter.regNo = Number(regNo);
    if (date) filter.date = date;
    if (mobile) filter.mobile = mobile;
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { patientName: regex },
        { mobile: regex },
        { doctorName: regex },
        { 'medicines.brand': regex },
        { 'medicines.generic': regex },
        { dx: regex },
      ];
    }

    const total = await PrescriptionModel.countDocuments(filter);
    const prescriptions = await PrescriptionModel.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      total,
      prescriptions,
    });
  } catch (error: any) {
    console.error('Error in /api/prescriptions GET:', error);
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
    const { prescription, prescriptions, patient, appointmentId, appointmentStatus } = body;

    // Handle single prescription upsert
    if (prescription && typeof prescription === 'object') {
      const rxId = prescription.id || `rx_${prescription.regNo || 'new'}_${Date.now()}`;
      
      const savedRx = await PrescriptionModel.findOneAndUpdate(
        { id: rxId },
        { $set: { ...prescription, id: rxId, updatedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Also upsert Patient record in MongoDB if patient data provided
      if (patient && typeof patient === 'object' && (patient.id || patient.regNo)) {
        const pId = patient.id || `p_${patient.regNo}`;
        await PatientModel.findOneAndUpdate(
          { $or: [{ id: pId }, { regNo: patient.regNo }] },
          { $set: { ...patient, id: pId, updatedAt: new Date() } },
          { upsert: true, setDefaultsOnInsert: true }
        );
      } else if (prescription.regNo && prescription.patientName) {
        const pId = prescription.patientId || `p_${prescription.regNo}`;
        await PatientModel.findOneAndUpdate(
          { $or: [{ id: pId }, { regNo: prescription.regNo }] },
          {
            $set: {
              id: pId,
              regNo: prescription.regNo,
              name: prescription.patientName,
              age: prescription.age || '',
              sex: prescription.sex || 'M',
              mobile: prescription.mobile || '',
              address: prescription.address || '',
              occupation: prescription.occupation || '',
              updatedAt: new Date(),
            },
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }

      // If appointmentId or workflowStatus is linked, update Appointment in MongoDB
      const targetApntId = appointmentId;
      const effectiveApntStatus =
        appointmentStatus ||
        (prescription.workflowStatus === 'sent_to_cashier'
          ? 'Sent to Cashier'
          : prescription.workflowStatus === 'sent_to_doctor' || prescription.workflowStatus === 'cashier_paid'
          ? 'Payment Done'
          : 'Completed');

      if (targetApntId) {
        await AppointmentModel.findOneAndUpdate(
          { id: targetApntId },
          {
            $set: {
              status: effectiveApntStatus,
              prescriptionId: rxId,
              updatedAt: new Date(),
            },
          }
        );
      } else if (prescription.regNo && prescription.date) {
        // Target only ONE single active/pending appointment for this patient on this date
        const hasMobile = prescription.mobile && prescription.mobile.trim().length >= 5;
        const patientMatch = hasMobile
          ? { $or: [{ regNo: Number(prescription.regNo) }, { mobile: prescription.mobile.trim() }] }
          : { regNo: Number(prescription.regNo) };

        await AppointmentModel.findOneAndUpdate(
          {
            date: prescription.date,
            ...patientMatch,
            status: { $in: ['Waiting', 'In-Progress', 'Scheduled', 'Sent to Cashier'] },
          },
          {
            $set: {
              status: effectiveApntStatus,
              prescriptionId: rxId,
              updatedAt: new Date(),
            },
          },
          { sort: { serial: 1, createdAt: -1 } }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Prescription #${prescription.regNo || rxId} saved to MongoDB.`,
        prescription: savedRx,
      });
    }

    // Handle batch prescriptions upsert
    if (prescriptions && Array.isArray(prescriptions)) {
      const bulkOps = prescriptions.map((r: any) => ({
        updateOne: {
          filter: { id: r.id },
          update: { $set: { ...r, updatedAt: new Date() } },
          upsert: true,
        },
      }));

      const result = await PrescriptionModel.bulkWrite(bulkOps);

      return NextResponse.json({
        success: true,
        message: `Synced ${prescriptions.length} prescriptions to MongoDB.`,
        result,
      });
    }

    return NextResponse.json({ error: 'No prescription data provided' }, { status: 400 });
  } catch (error: any) {
    console.error('Error saving prescription to MongoDB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save prescription to MongoDB' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'MongoDB connection not configured.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Prescription ID is required' }, { status: 400 });
    }

    const updated = await PrescriptionModel.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Prescription ${id} updated in MongoDB.`,
      prescription: updated,
    });
  } catch (error: any) {
    console.error('Error in /api/prescriptions PATCH:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
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
      return NextResponse.json({ error: 'Prescription ID is required' }, { status: 400 });
    }

    const deleted = await PrescriptionModel.findOneAndDelete({ id });

    if (!deleted) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Prescription ${id} deleted from MongoDB.`,
    });
  } catch (error: any) {
    console.error('Error in /api/prescriptions DELETE:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
