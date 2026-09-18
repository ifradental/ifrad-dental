'use client';

import React, { useState, useEffect } from 'react';
import { HardDrive, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function SplashScreen() {
  const { skipSplash } = useAuth();
  const [progress, setProgress] = useState(30);
  const [statusText, setStatusText] = useState('Initializing Dentist PRO Core Engine...');

  useEffect(() => {
    const p1 = setTimeout(() => {
      setProgress(80);
      setStatusText('Local Offline DB & Presets Ready...');
    }, 60);

    const p2 = setTimeout(() => {
      setProgress(100);
      setStatusText('Ready! Loading Portal...');
    }, 150);

    const autoExit = setTimeout(() => {
      skipSplash();
    }, 250);

    return () => {
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(autoExit);
    };
  }, [skipSplash]);

  return (
    <div 
      onClick={skipSplash}
      className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center text-white select-none overflow-hidden cursor-pointer"
      title="Click anywhere to enter immediately"
    >
      {/* Background Glow effects */}
      <div className="absolute w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -top-20 -left-20 pointer-events-none animate-pulse" />
      <div className="absolute w-96 h-96 bg-sky-500/15 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

      {/* Main Card Container */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-8 py-9 bg-slate-900/80 border border-sky-500/25 rounded-2xl shadow-2xl backdrop-blur-md text-center">
        {/* Animated Brand Emblem */}
        <div className="relative mb-5">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-sky-400 rounded-3xl p-1 shadow-lg shadow-sky-500/30 flex items-center justify-center animate-pulse duration-700">
            <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
              <span className="text-3xl filter drop-shadow">🦷</span>
            </div>
          </div>
          <div className="absolute -top-1 -right-1 bg-yellow-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow border border-yellow-200">
            PRO 7.0
          </div>
        </div>

        {/* Title and Subtitle */}
        <h1 className="text-2xl font-extrabold tracking-tight text-white font-sans">
          Dentist <span className="text-sky-400">PRO</span>
        </h1>
        <p className="text-xs text-sky-200/80 font-medium mt-0.5">
          Modern Dental Management & Electronic Medical Record
        </p>

        {/* Badges */}
        <div className="flex items-center space-x-2 mt-3.5 text-[10px]">
          <span className="flex items-center space-x-1 bg-sky-500/10 text-sky-300 px-2.5 py-1 rounded-full border border-sky-400/20">
            <HardDrive className="w-3 h-3 text-sky-400" />
            <span>100% Offline-First</span>
          </span>
          <span className="flex items-center space-x-1 bg-emerald-500/10 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-400/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Auto Cloud Sync</span>
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full mt-6 space-y-1.5">
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span className="truncate pr-2">{statusText}</span>
            <span className="text-sky-400 font-bold">{progress}%</span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full transition-all duration-300 ease-out shadow-sm shadow-sky-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Quick Skip Button */}
        <div className="mt-6 flex items-center justify-between w-full pt-3 border-t border-slate-800 text-[10px] text-slate-500">
          <span>Desktop Edition</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              skipSplash();
            }}
            className="text-sky-400 hover:text-sky-300 font-semibold flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-white/5 transition"
          >
            <span>Skip / প্রবেশ করুন</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
