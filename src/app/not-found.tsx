import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-black text-blue-700 font-mono">404</h1>
        <h2 className="text-xl font-bold text-slate-900">পৃষ্ঠাটি খুঁজে পাওয়া যায়নি</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          আপনি যে ঠিকানাটি খুঁজছেন সেটি পরিবর্তিত হয়েছে অথবা বর্তমানে উপলব্ধ নেই।
        </p>
        <Link
          href="/prescription"
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
        >
          প্রেসক্রিপশন ড্যাশবোর্ডে ফিরুন
        </Link>
      </div>
    </div>
  );
}
