import { NextResponse } from 'next/server';
import { connectToDatabase, isDbConnected } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  let dbStatus = false;
  let dbError = null;

  let adminStatus = false;

  try {
    const conn = await connectToDatabase();
    dbStatus = isDbConnected();
    if (dbStatus) {
      const { EmployeeModel, ensureDefaultAdminInMongo } = await import('@/lib/models');
      let admin = await EmployeeModel.findOne({
        $or: [{ role: 'Admin' }, { id: 'emp_admin' }, { username: 'admin' }],
      });
      if (!admin) {
        await ensureDefaultAdminInMongo();
        admin = await EmployeeModel.findOne({ id: 'emp_admin' });
      }
      adminStatus = !!admin;
    }
  } catch (err: any) {
    dbError = err.message;
  }

  const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  const mongoPayload = {
    connected: dbStatus,
    configured: Boolean(process.env.MONGODB_URI),
    adminExists: adminStatus,
    adminUsername: 'admin',
    message: dbStatus
      ? (adminStatus ? 'সংযুক্ত ও এডমিন সক্রিয় (Connected & Admin Active)' : 'সংযুক্ত (Connected)')
      : (process.env.MONGODB_URI ? 'সংযোগের অপেক্ষায় (Connecting)' : 'MONGODB_URI কনফিগার করা হয়নি'),
    error: dbError,
  };

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    isVercel: Boolean(process.env.VERCEL),
    mongodb: mongoPayload,
    mongo: mongoPayload,
    cloudinary: {
      configured: cloudinaryConfigured,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
      message: cloudinaryConfigured ? 'সক্রিয় (WebP Optimized)' : 'কনফিগার করা হয়নি',
    },
  });
}
