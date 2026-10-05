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
  const initialFocus = searchParams.get('focus') || undefined;

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
      initialFocus={initialFocus}
    />
  );
}

import { DentalLoadingSpinner } from '@/components/DentalLoadingSpinner';

export default function PrescriptionPage() {
  return (
    <div className="min-h-full bg-[#eaf2fb] p-1">
      <Suspense
        fallback={
          <DentalLoadingSpinner
            size="md"
            text="প্রেসক্রিপশন এডিটর লোড হচ্ছে..."
            subtext="ক্লিনিক্যাল ডেটা ও ড্রাগ ডাটাবেজ প্রস্তুত করা হচ্ছে..."
            cardMode={true}
          />
        }
      >
        <PrescriptionContent />
      </Suspense>
    </div>
  );
}
