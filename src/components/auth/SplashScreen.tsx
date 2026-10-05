'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';

export function SplashScreen() {
  const { skipSplash } = useAuth();
  const [progress, setProgress] = useState(25);
  const [clinicName, setClinicName] = useState('ইফরা ডেন্টাল সেন্টার');
  const [clinicLogo, setClinicLogo] = useState('');

  useEffect(() => {
    // Load clinic branding if configured
    db.settings.get('default_settings').then((s) => {
      if (s) {
        if (s.clinicName) setClinicName(s.clinicName);
        if (s.logoUrl) setClinicLogo(s.logoUrl);
      }
    }).catch(() => {});

    const p1 = setTimeout(() => {
      setProgress(65);
    }, 120);

    const p2 = setTimeout(() => {
      setProgress(100);
    }, 280);

    const autoExit = setTimeout(() => {
      skipSplash();
    }, 450);

    return () => {
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(autoExit);
    };
  }, [skipSplash]);

  return (
    <div 
      onClick={skipSplash}
      className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center text-white select-none overflow-hidden cursor-pointer"
    >
      {/* Soft Ambient Background Glow */}
      <div className="absolute w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Clean Card */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full mx-4 px-8 py-8 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl text-center">
        {/* Brand Emblem */}
        <div className="mb-4">
          {clinicLogo ? (
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 p-1 flex items-center justify-center shadow-lg">
              <img src={clinicLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <span className="text-3xl filter drop-shadow">🦷</span>
              </div>
            </div>
          )}
        </div>

        {/* Title and Clean Subtitle */}
        <h1 className="text-xl font-bold tracking-tight text-white font-sans">
          {clinicName}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          দাঁতের আধুনিক চিকিৎসা ও স্বাস্থ্যসেবা
        </p>

        {/* Minimal Progress Bar */}
        <div className="w-full mt-6 space-y-2">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-500">
            <span>লোড হচ্ছে...</span>
            <span className="font-mono text-slate-400 font-semibold">{progress}%</span>
          </div>
        </div>

        {/* Subtle Skip Prompt */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 w-full flex justify-center">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              skipSplash();
            }}
            className="text-[11px] text-slate-400 hover:text-cyan-300 font-medium transition cursor-pointer"
          >
            প্রবেশ করতে ক্লিক করুন →
          </button>
        </div>
      </div>
    </div>
  );
}
