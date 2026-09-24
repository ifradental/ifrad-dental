import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, isDbConnected } from '@/lib/mongodb';
import { EmployeeModel, OtpModel, ensureDefaultAdminInMongo } from '@/lib/models';
import { sendOtpEmail, isSmtpConfigured } from '@/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  const visibleStart = user.slice(0, 2);
  const visibleEnd = user.slice(-1);
  return `${visibleStart}***${visibleEnd}@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier } = body;

    if (!identifier || !identifier.trim()) {
      return NextResponse.json(
        { success: false, error: 'ইউজারনেম অথবা নিবন্ধিত মোবাইল নম্বর লিখুন।' },
        { status: 400 }
      );
    }

    const cleanId = identifier.trim().toLowerCase();
    const rawMobile = identifier.trim().replace(/[-\s]/g, '');

    // Connect to database
    let dbConnected = false;
    try {
      await connectToDatabase();
      dbConnected = isDbConnected();
    } catch (e: any) {
      console.warn('MongoDB connection issue during send-otp:', e.message);
    }

    let employee: any = null;

    if (dbConnected) {
      employee = await EmployeeModel.findOne({
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
    }

    // Determine target email
    let targetEmail = employee?.email?.trim();
    let targetName = employee?.name || 'ব্যবহারকারী';

    // If identifier is admin and no email found yet
    if (!targetEmail && (cleanId === 'admin' || cleanId === '01800000000')) {
      targetEmail = process.env.SMTP_USER || 'admin@ifradental.com';
    }

    if (!targetEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'এই অ্যাকাউন্টের সাথে কোনো নিবন্ধিত ইমেইল পাওয়া যায়নি! অনুগ্রহ করে ক্লিনিক এডমিনের সাথে যোগাযোগ করুন।',
        },
        { status: 404 }
      );
    }

    // Generate 6-digit random code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save to OtpModel in MongoDB if connected
    if (dbConnected) {
      await OtpModel.deleteMany({ identifier: cleanId });
      await OtpModel.create({
        identifier: cleanId,
        email: targetEmail,
        code: otpCode,
        expiresAt,
      });
    }

    // Send email via SMTP
    const emailResult = await sendOtpEmail({
      toEmail: targetEmail,
      userName: targetName,
      otpCode,
    });

    const masked = maskEmail(targetEmail);
    const smtpReady = isSmtpConfigured();

    return NextResponse.json({
      success: true,
      maskedEmail: masked,
      smtpConfigured: smtpReady,
      simulated: emailResult.simulated,
      // In local dev when SMTP is not configured, send code in response so user can test without real SMTP
      devOtp: !smtpReady ? otpCode : undefined,
      message: `আপনার নিবন্ধিত ইমেইল (${masked})-এ ৬ ডিজিটের ভেরিফিকেশন কোড পাঠানো হয়েছে।`,
    });
  } catch (error: any) {
    console.error('Error in /api/auth/send-otp:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'ভেরিফিকেশন কোড পাঠাতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
