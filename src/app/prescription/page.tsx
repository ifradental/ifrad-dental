'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Calendar, LayoutDashboard } from 'lucide-react';
import { PrescriptionEditor } from '@/components/prescription/PrescriptionEditor';
import { useAuth } from '@/context/AuthContext';

function PrescriptionContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const userRole = (user?.role || '').toLowerCase();
  const isReceptionistOrCashier = userRole.includes('receptionist') || userRole.includes('cashier');

  // Block access for Receptionist / Cashier
  if (isReceptionistOrCashier) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-rose-200 shadow-xl max-w-md w-full p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-slate-900">
              অ্যাক্সেস সংরক্ষিত (Access Restricted)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              প্রেসক্রিপশন তৈরি বা সম্পাদনার ক্ষমতা শুধুমাত্র <strong className="text-blue-900">ডাক্তার (ডেন্টাল সার্জন)</strong> এবং <strong className="text-blue-900">অ্যাডমিনিস্ট্রেটরের</strong> জন্য সংরক্ষিত।
            </p>
            <p className="text-[11px] text-slate-400">
              বর্তমান লগইন পদবী: <span className="font-semibold text-rose-600">{user?.designation || 'রিসেপশনিস্ট ও ক্যাশ সহকারী'}</span>
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            <Link
              href="/appointments"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
            >
              <Calendar className="w-4 h-4" />
              <span>সিরিয়াল ও অ্যাপয়েন্টমেন্ট</span>
            </Link>
            <Link
              href="/dashboard"
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition flex items-center justify-center space-x-1.5"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>ড্যাশবোর্ডে ফিরুন</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const regNoParam = searchParams.get('regNo');
  const initialRegNo = regNoParam && !isNaN(parseInt(regNoParam, 10)) ? parseInt(regNoParam, 10) : undefined;
  const initialAppointmentId = searchParams.get('apntId') || undefined;
  const initialName = searchParams.get('name') || undefined;
  const initialAge = searchParams.get('age') || undefined;
  const initialSex = searchParams.get('sex') || undefined;
  const initialMobile = searchParams.get('mobile') || undefined;
  const initialProblem = searchParams.get('problem') || undefined;
  const initialDoctorName = searchParams.get('doctor') || undefined;
  const initialPrescriptionId = searchParams.get('rxId') || undefined;

  return (
    <PrescriptionEditor
      initialRegNo={initialRegNo}
      initialAppointmentId={initialAppointmentId}
      initialPrescriptionId={initialPrescriptionId}
      initialName={initialName}
      initialAge={initialAge}
      initialSex={initialSex}
      initialMobile={initialMobile}
      initialProblem={initialProblem}
      initialDoctorName={initialDoctorName}
    />
  );
}

export default function PrescriptionPage() {
  return (
    <div className="min-h-full bg-[#eaf2fb] p-1">
      <Suspense
        fallback={
          <div className="p-8 text-center text-sm font-semibold text-slate-600">
            প্রেসক্রিপশন লোড হচ্ছে...
          </div>
        }
      >
        <PrescriptionContent />
      </Suspense>
    </div>
  );
}
