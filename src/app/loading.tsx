import React from 'react';
import { DentalLoadingSpinner } from '@/components/DentalLoadingSpinner';

export default function RootLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <DentalLoadingSpinner
        size="lg"
        text="ইফরা ডেন্টাল পোর্টাল লোড হচ্ছে..."
        subtext="রোগী, অ্যাপয়েন্টমেন্ট ও ক্লিনিক্যাল মডিউল প্রস্তুত করা হচ্ছে..."
        cardMode={true}
      />
    </div>
  );
}
