'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PrescriptionsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const regNo = searchParams.get('regNo');
    if (regNo) {
      router.replace(`/patients?regNo=${encodeURIComponent(regNo)}`);
    } else {
      router.replace('/patients');
    }
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-slate-500">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium text-slate-600">রোগী ব্যবস্থাপনা পেজে রিডাইরেক্ট করা হচ্ছে...</p>
      </div>
    </div>
  );
}

export default function ViewAllPrescriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm font-semibold text-slate-600">
          রিডাইরেক্ট হচ্ছে...
        </div>
      }
    >
      <PrescriptionsRedirect />
    </Suspense>
  );
}
