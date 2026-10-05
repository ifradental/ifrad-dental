'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface DentalLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'fullscreen' | 'inline';
  text?: string;
  subtext?: string;
  cardMode?: boolean;
  className?: string;
}

export function DentalLoadingSpinner({
  size = 'md',
  text = 'ইফরা ডেন্টাল ডেটা লোড ও সিঙ্ক হচ্ছে...',
  subtext = 'অনুগ্রহ করে একটু অপেক্ষা করুন',
  cardMode = true,
  className = '',
}: DentalLoadingSpinnerProps) {
  // Dimension definitions
  const dimensions = {
    sm: {
      wrapper: 'py-6 px-4',
      svgSize: 'w-10 h-10',
      ringSize: 'w-14 h-14',
      textSize: 'text-xs',
      subtextSize: 'text-[10px]',
    },
    md: {
      wrapper: 'py-14 px-6',
      svgSize: 'w-14 h-14',
      ringSize: 'w-20 h-20',
      textSize: 'text-sm',
      subtextSize: 'text-xs',
    },
    lg: {
      wrapper: 'py-20 px-8',
      svgSize: 'w-20 h-20',
      ringSize: 'w-28 h-28',
      textSize: 'text-base',
      subtextSize: 'text-xs',
    },
    fullscreen: {
      wrapper: 'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4',
      svgSize: 'w-20 h-20',
      ringSize: 'w-32 h-32',
      textSize: 'text-base font-black text-white',
      subtextSize: 'text-xs text-slate-300',
    },
    inline: {
      wrapper: 'py-3 px-3 inline-flex items-center gap-2.5',
      svgSize: 'w-6 h-6',
      ringSize: 'w-8 h-8',
      textSize: 'text-xs font-bold',
      subtextSize: 'text-[10px]',
    },
  }[size];

  // Dental Tooth SVG Component
  const ToothSvg = () => (
    <svg
      viewBox="0 0 100 100"
      className={`${dimensions.svgSize} drop-shadow-md text-teal-600 transition-all duration-300`}
      fill="currentColor"
    >
      <defs>
        <linearGradient id="dentalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      {/* Molar Dental Tooth Contours */}
      <path
        d="M26 22 
           C 20 28, 16 40, 20 54 
           C 23 66, 27 76, 33 88 
           C 36 94, 43 92, 45 84 
           C 47 74, 48 64, 50 64 
           C 52 64, 53 74, 55 84 
           C 57 92, 64 94, 67 88 
           C 73 76, 77 66, 80 54 
           C 84 40, 80 28, 74 22 
           C 66 14, 56 18, 50 21 
           C 44 18, 34 14, 26 22 Z"
        fill="url(#dentalGrad)"
      />

      {/* Dental Enamel Highlight Contour */}
      <path
        d="M 32 28 
           C 28 32, 26 40, 28 48 
           C 30 52, 33 50, 33 46 
           C 33 38, 38 32, 46 30 
           C 49 29, 48 26, 44 26 
           C 39 26, 35 27, 32 28 Z"
        fill="#ffffff"
        opacity="0.55"
      />

      {/* Inner Enamel Spark */}
      <circle cx="68" cy="32" r="3.5" fill="#ffffff" opacity="0.8" />
      <circle cx="74" cy="40" r="2" fill="#ffffff" opacity="0.6" />
    </svg>
  );

  if (size === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2.5 text-slate-700 ${className}`}>
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-teal-500/20 border-t-teal-600 animate-spin" />
          <ToothSvg />
        </div>
        {text && <span className={`${dimensions.textSize} font-bold text-slate-700`}>{text}</span>}
      </div>
    );
  }

  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* Dental Icon with Dual Orbital Spinning Medical Rings */}
      <div className="relative flex items-center justify-center mb-4">
        {/* Soft Background Pulse Aura */}
        <div className="absolute -inset-2 bg-gradient-to-tr from-cyan-400/20 via-teal-400/20 to-indigo-500/20 rounded-full blur-xl animate-pulse" />

        {/* Outer Orbital Rotating Ring with Dot */}
        <div className={`${dimensions.ringSize} rounded-full border-2 border-dashed border-teal-400/40 animate-[spin_6s_linear_infinite] flex items-start justify-center`}>
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-md shadow-cyan-400/50 -mt-1.5 animate-ping" />
        </div>

        {/* Inner Counter-Rotating Gradient Ring */}
        <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-teal-500 border-r-indigo-500 border-b-cyan-400 animate-[spin_2s_linear_infinite]" />

        {/* Center Floating Tooth Icon */}
        <div className="relative z-10 flex items-center justify-center animate-[bounce_2.5s_ease-in-out_infinite]">
          <ToothSvg />
          {/* Sparkle badge */}
          <div className="absolute -top-1 -right-1 p-1 bg-amber-400 text-slate-900 rounded-full shadow-md animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Loading Text */}
      {text && (
        <div className="space-y-1">
          <div className={`font-black tracking-tight ${dimensions.textSize} ${size === 'fullscreen' ? 'text-white' : 'text-slate-800'}`}>
            <span className="bg-gradient-to-r from-teal-700 via-indigo-700 to-cyan-700 bg-clip-text text-transparent">
              {text}
            </span>
          </div>
          {subtext && (
            <p className={`font-medium ${dimensions.subtextSize} ${size === 'fullscreen' ? 'text-slate-300' : 'text-slate-400'} flex items-center justify-center gap-1.5`}>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping inline-block" />
              <span>{subtext}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (size === 'fullscreen') {
    return (
      <div className={dimensions.wrapper}>
        <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-xl max-w-sm w-full mx-auto">
          {content}
        </div>
      </div>
    );
  }

  if (cardMode) {
    return (
      <div className={`w-full bg-white/95 rounded-3xl border border-slate-200/80 shadow-sm backdrop-blur-xs ${dimensions.wrapper}`}>
        {content}
      </div>
    );
  }

  return <div className={`w-full ${dimensions.wrapper}`}>{content}</div>;
}

export default DentalLoadingSpinner;
