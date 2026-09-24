'use client';

import React, { useState, useEffect } from 'react';
import { Heading1, Save, Upload, Eye, Image as ImageIcon, Sparkles, Trash2, CheckCircle2, Cloud, RefreshCw } from 'lucide-react';
import { db, type ClinicSettings } from '@/lib/db';
import { syncEngine, type SyncStatus } from '@/lib/syncEngine';

export default function HeaderEditPage() {
  const [clinicName, setClinicName] = useState<string>('ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার');
  const [doctor1, setDoctor1] = useState({
    name: 'ডা. নাহিদ হাসান',
    degrees: 'বিডিএস, বিসিএস (স্বাস্থ্য)',
    designation: 'ডেন্টাল সার্জন',
    hospital: 'ঢাকা ডেন্টাল কলেজ ও হাসপাতাল',
    bmdcReg: '৯৩২৭',
    mobile: '০১৮৩৩-৩৩৭৮৮৮',
  });
  const [doctor2, setDoctor2] = useState({
    name: 'ডা. আমেনা হোসেন নিদ্রা',
    degrees: 'বিডিএস (ডিইউ)',
    designation: 'ডেন্টাল সার্জন',
    hospital: 'সাফেনা উইমেন্স ডেন্টাল কলেজ হাসপাতাল',
    bmdcReg: '১৫৯৪৮',
  });
  const [doctor3, setDoctor3] = useState({
    name: 'ডা. মাহবুব আজাদ',
    degrees: 'বিডিএস (ডিইউ), পিজিটি',
    designation: 'ডেন্টাল সার্জন',
    hospital: 'ঢাকা ডেন্টাল কলেজ ও হাসপাতাল',
    bmdcReg: '৬১৭৯',
  });

  const [footerText, setFooterText] = useState<string>(
    'নন্দীপাড়া ব্রিজ সংলগ্ন (২য় তলা), খিলগাঁও, ঢাকা। রোগী দেখার সময়: সকাল ১০টা থেকে দুপুর ২টা, বিকাল ৪টা থেকে রাত ১০টা। যোগাযোগ: 01833-337888'
  );
  const [displayLogo, setDisplayLogo] = useState<boolean>(true);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [backgroundColor, setBackgroundColor] = useState<string>('#FFFFFF');

  // Watermark Settings
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [watermarkType, setWatermarkType] = useState<'logo' | 'text' | 'custom_image'>('logo');
  const [watermarkText, setWatermarkText] = useState<string>('IFRA DENTAL CENTER');
  const [watermarkCustomUrl, setWatermarkCustomUrl] = useState<string>('');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.07);

  // Live Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [mongoConnected, setMongoConnected] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string>('');

  useEffect(() => {
    async function loadSettings() {
      let s = await db.settings.get('default_settings');
      if (!s) {
        try {
          const res = await fetch('/api/settings');
          const data = await res.json();
          if (data.success && data.settings) {
            s = data.settings;
            await db.settings.put(s);
          }
        } catch (e) {
          console.warn('Failed to load initial settings from MongoDB:', e);
        }
      }
      if (s) {
        setClinicName(s.clinicName || 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার');
        if (s.doctor1) setDoctor1(s.doctor1);
        if (s.doctor2) setDoctor2(s.doctor2);
        if (s.doctor3) setDoctor3(s.doctor3);
        if (s.footerText) setFooterText(s.footerText);
        setDisplayLogo(s.displayLogo ?? true);
        if (s.logoUrl) setLogoUrl(s.logoUrl);
        if (s.backgroundColor) setBackgroundColor(s.backgroundColor);

        if (s.watermarkSettings) {
          setShowWatermark(s.watermarkSettings.showWatermark ?? true);
          setWatermarkType(s.watermarkSettings.type || 'logo');
          setWatermarkText(s.watermarkSettings.text || s.clinicName || 'DENTAL CLINIC');
          setWatermarkCustomUrl(s.watermarkSettings.customImageUrl || '');
          setWatermarkOpacity(s.watermarkSettings.opacity ?? 0.07);
        } else {
          setWatermarkText(s.clinicName || 'IFRA DENTAL CENTER');
        }
      }
    }
    loadSettings();

    // Check MongoDB connectivity
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.settings) {
          setMongoConnected(true);
        }
      })
      .catch(() => {});

    const unsub = syncEngine.subscribe((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });

    return () => unsub();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('ছবির সাইজ সর্বোচ্চ ১০ মেগাবাইট (10MB) হতে পারবে।');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setLogoUrl(base64);
      setDisplayLogo(true);

      // Upload to Cloudinary for optimized WebP delivery
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'logos');
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            setLogoUrl(data.url);
          }
        }
      } catch (err) {
        console.warn('Cloudinary upload fallback to base64:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleWatermarkImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('ছবির সাইজ সর্বোচ্চ ১০ মেগাবাইট (10MB) হতে পারবে।');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setWatermarkCustomUrl(base64);

      // Upload to Cloudinary
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'watermarks');
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            setWatermarkCustomUrl(data.url);
          }
        }
      } catch (err) {
        console.warn('Cloudinary watermark upload fallback:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const existing = await db.settings.get('default_settings');
    const updatedSettings: ClinicSettings = {
      ...(existing || ({} as any)),
      id: 'default_settings',
      clinicName,
      doctor1,
      doctor2,
      doctor3,
      footerText,
      displayLogo,
      logoUrl,
      backgroundColor,
      watermarkSettings: {
        showWatermark,
        type: watermarkType,
        text: watermarkText,
        customImageUrl: watermarkCustomUrl,
        opacity: watermarkOpacity,
      },
    };

    // 1. Save to local Dexie IndexedDB
    await db.settings.put(updatedSettings);

    // 2. Queue in syncEngine for offline-first resilience
    await syncEngine.logMutation('settings', 'UPDATE', 'default_settings', updatedSettings);

    // 3. Directly POST to MongoDB endpoint for immediate cloud persistence
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMongoConnected(true);
        setSyncFeedback('✅ হেডার এবং ওয়াটারমার্ক সেটিংস MongoDB ডেটাবেজে সফলভাবে আপডেট হয়েছে!');
      } else {
        setSyncFeedback('⚠️ লোকাল ডেটাবেজে সেভ হয়েছে, ক্লাউড সিঙ্ক ব্যাকগ্রাউন্ডে চলছে...');
      }
    } catch (err) {
      console.error('Direct MongoDB update error:', err);
      setSyncFeedback('⚠️ লোকাল ডেটাবেজে সেভ হয়েছে, ক্লাউড সিঙ্ক ব্যাকগ্রাউন্ডে চলছে...');
    }

    // 4. Notify other open tabs & components (Sidebar, Dashboard, etc.)
    window.dispatchEvent(new Event('storage'));

    setTimeout(() => {
      setSyncFeedback('');
    }, 5000);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback('');
    try {
      const res = await syncEngine.triggerSync();
      if (res.success) {
        setMongoConnected(true);
        setSyncFeedback(
          res.syncedCount > 0
            ? `✅ সফলভাবে ক্লাউড সিঙ্ক সম্পন্ন হয়েছে (${res.syncedCount} items)`
            : '✅ সকল ডেটা ইতিমধ্যে MongoDB ডেটাবেজে আপ-টু-ডেট আছে।'
        );
      } else {
        setSyncFeedback(`⚠️ সিঙ্ক ওয়ার্নিং: ${res.message}`);
      }
    } catch {
      setSyncFeedback('❌ ক্লাউড সিঙ্ক করতে সমস্যা হয়েছে। দয়া করে ইন্টারনেট ও ডেটাবেজ চেক করুন।');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(''), 5000);
    }
  };

  return (
    <div className="p-3 max-w-[1550px] mx-auto text-slate-800">
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4">
        {/* Header Title & Save Button */}
        <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-slate-200 gap-3">
          <div className="flex items-center space-x-2">
            <Heading1 className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-base font-bold text-blue-950">
                Prescription Header, Logo & Watermark Designer
              </h1>
              <p className="text-xs text-slate-500">
                প্রেসক্রিপশনের হেডার, নিজস্ব লোগো ও প্রেসক্রিপশন শিটের ওয়াটারমার্ক সেটআপ করুন
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* MongoDB Sync Status Badge */}
            <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border ${
              mongoConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <Cloud className={`w-3.5 h-3.5 ${mongoConnected ? 'text-emerald-600' : 'text-amber-500'}`} />
              <span>{mongoConnected ? 'MongoDB Synced' : 'Checking Cloud...'}</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px]">
                  {pendingCount} pending
                </span>
              )}
            </div>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium flex items-center space-x-1.5 border border-slate-300 transition disabled:opacity-50"
              title="Force sync changes with MongoDB"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Header & Watermark</span>
            </button>
          </div>
        </div>

        {/* Feedback notification banner */}
        {syncFeedback && (
          <div className={`mb-4 p-3 rounded-md text-xs font-medium flex items-center justify-between border ${
            syncFeedback.startsWith('✅')
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : syncFeedback.startsWith('⚠️')
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <span>{syncFeedback}</span>
            <button
              onClick={() => setSyncFeedback('')}
              className="text-slate-400 hover:text-slate-600 text-xs ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Live Preview with Header & Watermark */}
        <div className="mb-6">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center space-x-1.5">
            <Eye className="w-4 h-4 text-blue-600" />
            <span>প্রেসক্রিপশন প্যাড প্রিভিউ (Prescription Sheet Live Preview)</span>
          </div>

          <div
            className="border-2 border-slate-300 rounded-lg bg-white shadow-md overflow-hidden text-center"
            style={{ backgroundColor }}
          >
            {/* Header Content (Pristine, No Watermark) */}
            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="flex items-center justify-center space-x-3 mb-2">
                {displayLogo && (
                  logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Clinic Logo"
                      className="max-h-16 max-w-[140px] object-contain"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center text-blue-900 font-bold text-2xl">
                      🦷
                    </div>
                  )
                )}
                <h2 className="text-2xl font-bold font-serif text-blue-950">{clinicName}</h2>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs divide-x divide-slate-300 pt-2 border-t border-slate-200">
                <div>
                  <div className="font-bold text-blue-950 text-[13px]">{doctor1.name}</div>
                  <div className="text-slate-600 text-[11px]">{doctor1.degrees}</div>
                  <div className="font-medium text-[11px]">{doctor1.designation}</div>
                  <div className="text-slate-500 text-[10px]">{doctor1.hospital}</div>
                  <div className="text-slate-500 text-[10px]">বিএমডিসি রেজি নং- {doctor1.bmdcReg}</div>
                </div>
                <div>
                  <div className="font-bold text-blue-950 text-[13px]">{doctor2.name}</div>
                  <div className="text-slate-600 text-[11px]">{doctor2.degrees}</div>
                  <div className="font-medium text-[11px]">{doctor2.designation}</div>
                  <div className="text-slate-500 text-[10px]">{doctor2.hospital}</div>
                  <div className="text-slate-500 text-[10px]">বিএমডিসি রেজি নং- {doctor2.bmdcReg}</div>
                </div>
                <div>
                  <div className="font-bold text-blue-950 text-[13px]">{doctor3.name}</div>
                  <div className="text-slate-600 text-[11px]">{doctor3.degrees}</div>
                  <div className="font-medium text-[11px]">{doctor3.designation}</div>
                  <div className="text-slate-500 text-[10px]">{doctor3.hospital}</div>
                  <div className="text-slate-500 text-[10px]">বিএমডিসি রেজি নং- {doctor3.bmdcReg}</div>
                </div>
              </div>
            </div>

            {/* Simulated Prescription Body Area with Watermark ONLY here */}
            <div className="p-6 relative min-h-[220px] bg-slate-50/50 flex flex-col justify-between overflow-hidden">
              {/* Watermark strictly in body */}
              {showWatermark && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
                  style={{ opacity: watermarkOpacity }}
                >
                  {watermarkType === 'logo' && (
                    logoUrl ? (
                      <img src={logoUrl} alt="Watermark Logo" className="w-56 h-56 object-contain" />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-7xl font-bold text-blue-950">
                        🦷
                      </div>
                    )
                  )}

                  {watermarkType === 'custom_image' && watermarkCustomUrl && (
                    <img src={watermarkCustomUrl} alt="Custom Watermark" className="w-56 h-56 object-contain" />
                  )}

                  {watermarkType === 'text' && (
                    <div className="text-4xl font-extrabold uppercase font-serif tracking-widest text-blue-950 -rotate-12 whitespace-nowrap">
                      {watermarkText || clinicName}
                    </div>
                  )}
                </div>
              )}

              {/* Sample simulated content */}
              <div className="relative z-10 grid grid-cols-12 gap-4 text-left">
                <div className="col-span-4 border-r border-slate-300 pr-3 space-y-2 text-[11px] text-slate-600">
                  <div className="font-bold text-blue-950 border-b border-blue-200 pb-0.5">C/C (Complaints)</div>
                  <div>• Dental Caries</div>
                  <div>• Toothache</div>
                  <div className="font-bold text-blue-950 border-b border-blue-200 pb-0.5 pt-1">O/E (Examination)</div>
                  <div>• Deep cavity in 26</div>
                </div>
                <div className="col-span-8 space-y-2 text-[11px] text-slate-700">
                  <div className="font-serif italic text-2xl font-bold text-blue-950">℞</div>
                  <div className="font-bold text-blue-950 text-xs">1. Cap. Amoxicillin 500mg</div>
                  <div className="pl-3 text-slate-600">1+1+1 — খাবার পর — ৫ দিন</div>
                  <div className="font-bold text-blue-950 text-xs mt-1">2. Tab. Ketorolac 10mg</div>
                  <div className="pl-3 text-slate-600">1+0+1 — ভরা পেটে — ৩ দিন</div>
                </div>
              </div>

              <div className="relative z-10 pt-4 mt-4 border-t border-slate-300 text-center text-[10px] text-slate-500">
                {footerText}
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Sections */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* 1. CLINIC NAME & LOGO UPLOAD */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-7 bg-sky-50 border border-sky-200 rounded-lg p-3.5 space-y-2">
              <label className="block text-slate-800 font-bold">
                ক্লিনিকের নাম / Clinic Name (বাংলা অথবা English)
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="যেমন: ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার"
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold text-sm bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Logo Setup */}
            <div className="col-span-12 md:col-span-5 bg-blue-50/80 border border-blue-200 rounded-lg p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950 flex items-center space-x-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>ক্লিনিক লোগো (Clinic Logo)</span>
                </span>
                <label className="flex items-center space-x-1 cursor-pointer select-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={displayLogo}
                    onChange={(e) => setDisplayLogo(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>লোগো দেখান</span>
                </label>
              </div>

              <div className="flex items-center space-x-3 mt-2">
                {logoUrl ? (
                  <div className="relative group">
                    <img
                      src={logoUrl}
                      alt="Uploaded Logo"
                      className="w-12 h-12 rounded-lg object-contain border border-blue-400 bg-white p-1"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute -top-1.5 -right-1.5 bg-red-600 text-white p-0.5 rounded-full shadow hover:bg-red-700"
                      title="লোগো ডিলিট করুন"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg border-2 border-dashed border-blue-300 flex items-center justify-center text-blue-700 font-bold bg-white text-xl">
                    🦷
                  </div>
                )}

                <div className="flex-1">
                  <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>লোগো আপলোড করুন (PNG/JPG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <div className="text-[10px] text-slate-500 mt-1">সর্বোচ্চ ৩ মেগাবাইট (স্বচ্ছ PNG বাঞ্ছনীয়)</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. WATERMARK SETTINGS & IMAGE UPLOAD SECTION */}
          <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-lg p-4 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between border-b border-emerald-200 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-600 text-white rounded">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-950 text-sm">
                    প্রেসক্রিপশন শিট ওয়াটারমার্ক সেটআপ ও ছবি আপলোড (Watermark Setup & Image Upload)
                  </h3>
                  <p className="text-[11px] text-emerald-800">
                    প্রেসক্রিপশন প্রিন্ট করার সময় বডিতে হালকা ব্যাকগ্রাউন্ড ওয়াটারমার্ক শো করবে (হেডারে কোনো প্রভাব ফেলবে না)
                  </p>
                </div>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-md border border-emerald-300 shadow-sm select-none">
                <input
                  type="checkbox"
                  checked={showWatermark}
                  onChange={(e) => setShowWatermark(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0 w-4 h-4"
                />
                <span className="font-bold text-emerald-950 text-xs">ওয়াটারমার্ক সক্রিয় রাখুন (Enable Watermark)</span>
              </label>
            </div>

            {showWatermark && (
              <div className="space-y-4 pt-1">
                {/* Mode Selector Tabs */}
                <div>
                  <label className="block text-slate-800 font-bold mb-1.5">ওয়াটারমার্কের ধরন সিলেক্ট করুন (Watermark Source):</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setWatermarkType('logo')}
                      className={`p-2.5 rounded-lg border text-left transition flex items-center space-x-2.5 ${
                        watermarkType === 'logo'
                          ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-sm'
                          : 'border-slate-300 bg-white/70 hover:bg-white text-slate-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${watermarkType === 'logo' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'}`}>
                        {watermarkType === 'logo' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">১. ক্লিনিক লোগো (Clinic Logo)</div>
                        <div className="text-[10px] text-slate-500">উপরে আপলোড করা মূল লোগো ব্যবহার হবে</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWatermarkType('custom_image')}
                      className={`p-2.5 rounded-lg border text-left transition flex items-center space-x-2.5 ${
                        watermarkType === 'custom_image'
                          ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-sm'
                          : 'border-slate-300 bg-white/70 hover:bg-white text-slate-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${watermarkType === 'custom_image' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'}`}>
                        {watermarkType === 'custom_image' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">২. আলাদা ওয়াটারমার্ক ছবি আপলোড</div>
                        <div className="text-[10px] text-slate-500">বিশেষ কোনো ওয়াটারমার্ক ইমেজ ফাইল থাকলে</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWatermarkType('text')}
                      className={`p-2.5 rounded-lg border text-left transition flex items-center space-x-2.5 ${
                        watermarkType === 'text'
                          ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-sm'
                          : 'border-slate-300 bg-white/70 hover:bg-white text-slate-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${watermarkType === 'text' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'}`}>
                        {watermarkType === 'text' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">৩. টেক্সট ওয়াটারমার্ক (Text)</div>
                        <div className="text-[10px] text-slate-500">ক্লিনিকের নাম বা কোনো লেখা কোণাকুণি থাকবে</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Sub-panels based on selection */}
                <div className="bg-white p-3.5 rounded-lg border border-emerald-200">
                  {watermarkType === 'logo' && (
                    <div className="flex items-center space-x-4">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo Preview" className="w-16 h-16 object-contain p-1 border border-slate-200 rounded" />
                      ) : (
                        <div className="w-16 h-16 rounded border-2 border-dashed border-slate-300 flex items-center justify-center text-3xl text-slate-400">
                          🦷
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-800 text-xs">
                          {logoUrl ? 'মূল ক্লিনিক লোগো ওয়াটারমার্ক হিসেবে প্রস্তুত আছে' : 'এখনও কোনো ক্লিনিক লোগো আপলোড করা হয়নি'}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {logoUrl
                            ? 'প্রেসক্রিপশন প্রিন্ট করার সময় এই লোগোটি হালকা অপাসিটিতে ওয়াটারমার্ক হিসেবে শিটে ব্যাকগ্রাউন্ডে থাকবে।'
                            : 'উপরে "ক্লিনিক লোগো" অপশন থেকে একটি লোগো আপলোড করুন অথবা নিচে আলাদা ওয়াটারমার্ক ছবি আপলোড করুন।'}
                        </p>
                      </div>
                    </div>
                  )}

                  {watermarkType === 'custom_image' && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 text-xs">ওয়াটারমার্ক ইমেজ ফাইল সিলেক্ট করুন:</span>
                        <span className="text-[11px] text-slate-500">সর্বোচ্চ ৩ মেগাবাইট (স্বচ্ছ/Transparent PNG বা JPG বাঞ্ছনীয়)</span>
                      </div>

                      <div className="flex items-center space-x-4">
                        {watermarkCustomUrl ? (
                          <div className="relative group">
                            <img
                              src={watermarkCustomUrl}
                              alt="Custom Watermark Preview"
                              className="w-20 h-20 object-contain p-1 border-2 border-emerald-500 rounded-lg bg-slate-50 shadow-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setWatermarkCustomUrl('')}
                              className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700 transition"
                              title="ওয়াটারমার্ক ছবি ডিলিট করুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-lg border-2 border-dashed border-emerald-300 flex flex-col items-center justify-center text-emerald-600 bg-emerald-50/50">
                            <ImageIcon className="w-6 h-6 mb-0.5" />
                            <span className="text-[9px] font-bold">নো ইমেজ</span>
                          </div>
                        )}

                        <div className="flex-1 space-y-2">
                          <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow transition">
                            <Upload className="w-4 h-4" />
                            <span>{watermarkCustomUrl ? 'নতুন ওয়াটারমার্ক ছবি পরিবর্তন করুন' : 'ওয়াটারমার্ক ছবি আপলোড করুন (Upload Image)'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleWatermarkImageUpload}
                              className="hidden"
                            />
                          </label>

                          {watermarkCustomUrl && (
                            <div className="text-emerald-800 text-xs font-semibold flex items-center space-x-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>ওয়াটারমার্ক ইমেজ সক্রিয় আছে! প্রিভিউতে দেখতে পারেন।</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {watermarkType === 'text' && (
                    <div className="space-y-1.5">
                      <label className="block text-slate-800 font-bold text-xs">ওয়াটারমার্ক টেক্সট / স্লোগান লিখুন:</label>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="যেমন: IFRA DENTAL CENTER অথবা গোপনীয়"
                        className="w-full px-3 py-2 border border-slate-300 rounded font-semibold text-xs bg-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {/* Opacity Slider */}
                <div className="bg-white p-3 rounded-lg border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800 text-xs">ওয়াটারমার্কের দৃশ্যমানতা / স্বচ্ছতা (Opacity):</span>
                      <span className="font-mono text-emerald-900 font-bold bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded text-xs">
                        {Math.round(watermarkOpacity * 100)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      ওয়াটারমার্ক যাতে ওষুধের লেখা পড়তে বাধা না দেয় সেজন্য সাধারণত ৬% থেকে ১০% এর মধ্যে রাখা ভালো।
                    </p>
                  </div>

                  <div className="w-full sm:w-64 space-y-1">
                    <input
                      type="range"
                      min="0.03"
                      max="0.25"
                      step="0.01"
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>খুব হালকা (3%)</span>
                      <span>স্ট্যান্ডার্ড (8%)</span>
                      <span>বেশি স্পষ্ট (25%)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. DOCTORS PROFILE GRID */}
          <div className="grid grid-cols-12 gap-3">
            {/* Doctor 1 */}
            <div className="col-span-12 md:col-span-4 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 shadow-sm">
              <div className="font-bold text-blue-900 border-b pb-1 flex justify-between items-center">
                <span>Doctor 1 (Main Surgeon)</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">প্রধান</span>
              </div>
              <input
                type="text"
                value={doctor1.name}
                onChange={(e) => setDoctor1({ ...doctor1, name: e.target.value })}
                placeholder="Doctor Name (e.g. ডা. নাহিদ হাসান)"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white font-semibold"
              />
              <input
                type="text"
                value={doctor1.degrees}
                onChange={(e) => setDoctor1({ ...doctor1, degrees: e.target.value })}
                placeholder="Degrees (e.g. বিডিএস, বিসিএস)"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
              <input
                type="text"
                value={doctor1.designation}
                onChange={(e) => setDoctor1({ ...doctor1, designation: e.target.value })}
                placeholder="Designation (e.g. ডেন্টাল সার্জন)"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
              <input
                type="text"
                value={doctor1.hospital}
                onChange={(e) => setDoctor1({ ...doctor1, hospital: e.target.value })}
                placeholder="Hospital / Institute"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
              <input
                type="text"
                value={doctor1.bmdcReg}
                onChange={(e) => setDoctor1({ ...doctor1, bmdcReg: e.target.value })}
                placeholder="BMDC Reg No"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
            </div>

            {/* Doctor 2 */}
            <div className="col-span-12 md:col-span-4 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 shadow-sm">
              <div className="font-bold text-blue-900 border-b pb-1">Doctor 2</div>
              <input
                type="text"
                value={doctor2.name}
                onChange={(e) => setDoctor2({ ...doctor2, name: e.target.value })}
                placeholder="Doctor Name"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white font-semibold"
              />
              <input
                type="text"
                value={doctor2.degrees}
                onChange={(e) => setDoctor2({ ...doctor2, degrees: e.target.value })}
                placeholder="Degrees"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
              <input
                type="text"
                value={doctor2.designation}
                onChange={(e) => setDoctor2({ ...doctor2, designation: e.target.value })}
                placeholder="Designation"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
              <input
                type="text"
                value={doctor2.hospital}
                onChange={(e) => setDoctor2({ ...doctor2, hospital: e.target.value })}
                placeholder="Hospital"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
              <input
                type="text"
                value={doctor2.bmdcReg}
                onChange={(e) => setDoctor2({ ...doctor2, bmdcReg: e.target.value })}
                placeholder="BMDC Reg No"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
            </div>

            {/* Doctor 3 */}
            <div className="col-span-12 md:col-span-4 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 shadow-sm">
              <div className="font-bold text-blue-900 border-b pb-1">Doctor 3</div>
              <input
                type="text"
                value={doctor3.name}
                onChange={(e) => setDoctor3({ ...doctor3, name: e.target.value })}
                placeholder="Doctor Name"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white font-semibold"
              />
              <input
                type="text"
                value={doctor3.degrees}
                onChange={(e) => setDoctor3({ ...doctor3, degrees: e.target.value })}
                placeholder="Degrees"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
              <input
                type="text"
                value={doctor3.designation}
                onChange={(e) => setDoctor3({ ...doctor3, designation: e.target.value })}
                placeholder="Designation"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
              <input
                type="text"
                value={doctor3.hospital}
                onChange={(e) => setDoctor3({ ...doctor3, hospital: e.target.value })}
                placeholder="Hospital"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
              <input
                type="text"
                value={doctor3.bmdcReg}
                onChange={(e) => setDoctor3({ ...doctor3, bmdcReg: e.target.value })}
                placeholder="BMDC Reg No"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
            </div>
          </div>

          {/* 4. FOOTER TEXT */}
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 space-y-1">
            <label className="block text-slate-800 font-bold">
              Footer Text / ক্লিনিকের পূর্ণাঙ্গ ঠিকানা, সময়সূচী ও হেল্পলাইন (বাংলা)
            </label>
            <textarea
              rows={3}
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-xs focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

