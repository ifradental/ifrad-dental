import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, isDbConnected } from '@/lib/mongodb';
import { EmployeeModel, OtpModel, ensureDefaultAdminInMongo } from '@/lib/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, verificationCode, newPassword } = body;

    if (!identifier || !identifier.trim()) {
      return NextResponse.json(
        { success: false, error: 'ইউজারনেম অথবা মোবাইল নম্বর লিখুন।' },
        { status: 400 }
      );
    }

    if (!verificationCode || !verificationCode.trim()) {
      return NextResponse.json(
        { success: false, error: 'ইমেইলে পাঠানো ৬ ডিজিটের ভেরিফিকেশন কোড লিখুন।' },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return NextResponse.json(
        { success: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' },
        { status: 400 }
      );
    }

    // Connect to database if available
    let dbConnected = false;
    try {
      await connectToDatabase();
      dbConnected = isDbConnected();
    } catch (e: any) {
      console.warn('MongoDB connection not available during reset-password:', e.message);
    }

    if (!dbConnected) {
      // Offline fallback: allow local Dexie handler to process
      return NextResponse.json({
        success: true,
        offlineMode: true,
        message: 'লোকাল মোডে পাসওয়ার্ড পরিবর্তন সফল হয়েছে। ক্লাউড সংযোগ পেলে স্বয়ংক্রিয় সিঙ্ক হবে।',
      });
    }

    const cleanId = identifier.trim().toLowerCase();
    const rawMobile = identifier.trim().replace(/[-\s]/g, '');

    let employee = await EmployeeModel.findOne({
      $or: [
        { username: cleanId },
        { mobile: identifier.trim() },
        { mobile: rawMobile },
        { email: cleanId },
        { id: identifier.trim() },
      ],
    });

    if (!employee && (cleanId === 'admin' || cleanId === '01800000000')) {
      await ensureDefaultAdminInMongo();
      employee = await EmployeeModel.findOne({ id: 'emp_admin' });
    }

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'এই ইউজারনেম বা মোবাইল নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি!' },
        { status: 404 }
      );
    }

    // 1. Check OtpModel for matching code
    let isOtpValid = false;
    const otpRecord = await OtpModel.findOne({
      identifier: cleanId,
      code: verificationCode.trim(),
    });

    if (otpRecord) {
      if (new Date(otpRecord.expiresAt).getTime() > Date.now()) {
        isOtpValid = true;
        // Clean up used OTP
        await OtpModel.deleteOne({ _id: otpRecord._id });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'ওটিপি কোডটির মেয়াদ উত্তীর্ণ (Expired) হয়ে গেছে! অনুগ্রহ করে পুনরায় নতুন কোড পাঠান।',
          },
          { status: 400 }
        );
      }
    }

    // 2. Fallback: Emergency recovery via master secret key or registered mobile
    const cleanVerif = verificationCode.trim().replace(/[-\s]/g, '');
    const empMobileClean = (employee.mobile || '').replace(/[-\s]/g, '');
    const masterKey = process.env.SYNC_API_KEY || 'DENTIST_SECRET_KEY_2026';

    const isMobileVerified = empMobileClean && (cleanVerif === empMobileClean || empMobileClean.endsWith(cleanVerif));
    const isMasterKeyVerified = cleanVerif === masterKey;

    if (!isOtpValid && !isMobileVerified && !isMasterKeyVerified) {
      return NextResponse.json(
        {
          success: false,
          error: 'ভেরিফিকেশন কোড (OTP) সঠিক নয়! আপনার ইমেইল চেক করে ৬ ডিজিটের সঠিক কোড দিন।',
        },
        { status: 403 }
      );
    }

    // Update password in MongoDB
    employee.password = newPassword.trim();
    employee.updatedAt = new Date();
    await employee.save();

    return NextResponse.json({
      success: true,
      message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে এবং ক্লাউড ডাটাবেসে সেভ হয়েছে!',
      user: {
        id: employee.id,
        name: employee.name,
        username: employee.username || employee.mobile,
        role: employee.role,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/auth/reset-password:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'সার্ভার ত্রুটি হয়েছে!' },
      { status: 500 }
    );
  }
}
