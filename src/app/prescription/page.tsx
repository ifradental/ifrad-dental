'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PrescriptionEditor } from '@/components/prescription/PrescriptionEditor';

function PrescriptionContent() {
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
