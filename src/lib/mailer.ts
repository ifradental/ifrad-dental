import nodemailer from 'nodemailer';

interface SendOtpEmailParams {
  toEmail: string;
  userName: string;
  otpCode: string;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

export async function sendOtpEmail({
  toEmail,
  userName,
  otpCode,
}: SendOtpEmailParams): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"ইফরা ডেন্টাল সেন্টার" <${user || 'noreply@ifradental.com'}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #1e40af, #0284c7); padding: 30px 20px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 22px; font-weight: bold; }
          .header p { margin: 5px 0 0 0; font-size: 13px; opacity: 0.9; }
          .content { padding: 30px 24px; text-align: center; }
          .greeting { font-size: 15px; font-weight: 600; margin-bottom: 12px; text-align: left; }
          .desc { font-size: 13px; color: #64748b; line-height: 1.6; text-align: left; margin-bottom: 24px; }
          .otp-box { background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center; }
          .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #15803d; font-family: monospace; }
          .expire-text { font-size: 12px; color: #dc2626; margin-top: 8px; font-weight: 500; }
          .security-note { font-size: 12px; color: #94a3b8; text-align: left; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🦷 ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার</h1>
            <p>Dental Management System (Dentist PRO 7.0)</p>
          </div>
          <div class="content">
            <div class="greeting">আসসালামু আলাইকুম, ${userName || 'ইউজার'}</div>
            <div class="desc">
              আপনার একাউন্টের পাসওয়ার্ড পরিবর্তন করার জন্য অনুরোধ পাওয়া গেছে। নিচে আপনার ৬ ডিজিটের গোপন ভেরিফিকেশন কোড দেওয়া হলো:
            </div>

            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
              <div class="expire-text">⏱️ এই কোডটি আগামী ১০ মিনিটের জন্য কার্যকর থাকবে।</div>
            </div>

            <div class="security-note">
              ⚠️ <strong>সতর্কতা:</strong> আপনি যদি এই অনুরোধ না করে থাকেন, তবে এই ইমেইলটি উপেক্ষা করুন এবং আপনার ক্লিনিক অ্যাডমিনের সাথে যোগাযোগ করুন। কাউকে এই ওটিপি কোডটি শেয়ার করবেন না।
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ইফরা ডেন্টাল সেন্টার। সর্বস্বত্ব সংরক্ষিত।
          </div>
        </div>
      </body>
    </html>
  `;

  if (isSmtpConfigured()) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject: `[${otpCode}] পাসওয়ার্ড রিসেট ভেরিফিকেশন কোড - ইফরা ডেন্টাল সেন্টার`,
      text: `আপনার পাসওয়ার্ড রিসেট ভেরিফিকেশন কোড হলো: ${otpCode} (কার্যকারিতা: ১০ মিনিট)`,
      html: htmlContent,
    });

    console.log(`📧 OTP Email sent via SMTP to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } else {
    // Development or SMTP not configured fallback
    console.warn(`⚠️ SMTP is not configured in .env.local!`);
    console.log(`🔑 [SIMULATED EMAIL OTP] To: ${toEmail} | Code: ${otpCode}`);
    return { success: true, simulated: true };
  }
}
