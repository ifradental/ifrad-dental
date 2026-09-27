'use client';

import React from 'react';
import { type ClinicSettings } from '@/lib/db';

export interface ToothQuadrant {
  ur: string;
  ul: string;
  lr: string;
  ll: string;
}

export interface PrescriptionPrintSheetProps {
  prescription: {
    id?: string;
    regNo: number | string;
    visitNo?: number;
    patientName: string;
    age?: string;
    sex?: string;
    date: string;
    address?: string;
    occupation?: string;
    mobile?: string;
    medicines?: {
      brand: string;
      dose?: string;
      instruction?: string;
      duration?: string;
    }[];
    cc?: string[];
    ho?: Record<string, boolean>;
    hoCustomText?: string;
    oe?: string[];
    ix?: string[];
    dd?: string[];
    dx?: string[];
    treatmentPlan?: string[];
    treatmentDone?: string[];
    specialNote?: string[];
    advice?: string[];
    nextVisitDate?: string;
    revisitText?: string;
    timeSlot?: string;
  };
  clinicSettings?: ClinicSettings | null;
  printMode?: 'full' | 'without_header';
  printHeaderMarginCm?: number;
  printIncludeQuadrant?: boolean;
  printIncludeHo?: boolean;
  printIncludeAdvice?: boolean;
  printIncludeNextVisit?: boolean;
  printIncludeSignature?: boolean;
  printIncludeFooter?: boolean;
  printIncludeWatermark?: boolean;
  ccQuadrants?: ToothQuadrant[];
  oeQuadrants?: ToothQuadrant[];
  dxQuadrants?: ToothQuadrant[];
}

export const fallbackClinicSettings: ClinicSettings = {
  id: 'default_settings',
  clinicName: 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার',
  doctor1: {
    name: 'ডা. নাহিদ হাসান',
    degrees: 'বিডিএস, বিসিএস (স্বাস্থ্য)',
    designation: 'ডেন্টাল সার্জন',
    hospital: 'ঢাকা ডেন্টাল কলেজ ও হাসপাতাল',
    bmdcReg: '৯৩২৭',
    mobile: '০১৮৩৩-৩৩৭৮৮৮',
  },
  doctor2: {
    name: 'ডা. আমেনা হোসেন নিদ্রা',
    degrees: 'বিডিএস (ডিইউ)',
    designation: 'ডেন্টাল সার্জন',
    hospital: 'সাফেনা উইমেন্স ডেন্টাল কলেজ হাসপাতাল',
    bmdcReg: '১৫৯৪৮',
  },
  doctor3: {
    name: 'ডা. মাহবুব আজাদ',
    degrees: 'বিডিএস (ডিইউ), পিজিটি',
    designation: 'ডেন্টাল সার্জন',
    hospital: 'ঢাকা ডেন্টাল কলেজ ও হাসপাতাল',
    bmdcReg: '৬১৭৯',
  },
  displayLogo: true,
  logoUrl: '',
  backgroundColor: '#FFFFFF',
  footerText:
    'ঠিকানাঃ নন্দীপাড়া ব্রিজ সংলগ্ন (২য় তলা), খিলগাঁও, ঢাকা।\nসিরিয়ালের জন্যঃ ০১৮৩৩-৩৩৭৮৮৮, অফিসঃ ০২-৪৭২৬৯১১৩\nরোগী দেখার সময়ঃ সকাল ১০ টা হতে দুপুর ২টা, বিকাল ৪টা হতে রাত ১০টা\nE-mail: ifradental@gmail.com, www.ifradental.com',
  cloudSyncUrl: '/api/sync',
  cloudSyncApiKey: 'DENTIST_SECRET_KEY_2026',
  visitFee: 500,
  revisitFee: 300,
  revisitValidityDays: 15,
  lastRegNo: 1000,
  watermarkSettings: {
    showWatermark: true,
    type: 'logo',
    text: 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার',
    opacity: 0.1,
  },
  printSettings: {
    headerHeightCm: 5.6,
    ptInfoFontSizePt: 10,
    ptInfoMarginTopPx: 0,
    leftSideWidthCm: 6.2,
    rightSideWidthCm: 14.8,
    prescriptionFontSizePt: 10,
    lineGapPt: 4,
    rxFontSizePt: 16,
    banglaFontSizePt: 10,
    adviceFontSizePt: 10,
    headerType: 'Text Header',
    previewHeader: 'With Header',
    displayFooter: true,
    footerHeightCm: 2.2,
    displayBarcode: true,
    displayVisitNo: true,
    displayGenericName: false,
    displaySignature: true,
    displayRx: true,
  },
};

/**
 * Realistic vector barcode matching exact design in screenshot (* 0 0 4 1 9 8 *)
 */
export function BarcodeDisplay({ value }: { value: number | string }) {
  const numStr = value ? String(value).padStart(6, '0') : '000001';
  // Precise pattern for Code 39 aesthetic barcode stripes
  const bars = [
    2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3,
    2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1,
    1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1
  ];

  return (
    <div className="flex flex-col items-start select-none">
      <svg className="h-6 w-28" viewBox="0 0 115 22" preserveAspectRatio="none">
        {bars.map((w, idx) => {
          const x = bars.slice(0, idx).reduce((acc, curr) => acc + curr + 0.8, 0);
          return (
            <rect
              key={idx}
              x={x}
              y="0"
              width={w * 0.85}
              height="22"
              fill="#000000"
            />
          );
        })}
      </svg>
      <div className="text-[10px] font-mono tracking-[0.2em] font-bold text-black mt-0.5">
        * {numStr.split('').join(' ')} *
      </div>
    </div>
  );
}

export function PrescriptionPrintSheet({
  prescription,
  clinicSettings,
  printMode = 'full',
  printHeaderMarginCm = 5.6,
  printIncludeQuadrant = true,
  printIncludeHo = true,
  printIncludeAdvice = true,
  printIncludeNextVisit = true,
  printIncludeSignature = false,
  printIncludeFooter = true,
  printIncludeWatermark = true,
  ccQuadrants,
  oeQuadrants,
  dxQuadrants,
}: PrescriptionPrintSheetProps) {
  const clinic = clinicSettings || fallbackClinicSettings;
  const docs = ([clinic.doctor1, clinic.doctor2, clinic.doctor3] as Array<{
    name: string;
    degrees?: string;
    designation?: string;
    hospital?: string;
    bmdcReg?: string;
    mobile?: string;
  }>).filter((d) => d && d.name && d.name.trim() !== '');

  const rawLogo = clinic.logoUrl || '';
  const watermarkOpacity = clinic.watermarkSettings?.opacity ?? 0.1;

  // Split footer lines
  const footerLines = clinic.footerText
    ? clinic.footerText.split('\n').filter((l) => l.trim().length > 0)
    : [
        'ঠিকানাঃ নন্দীপাড়া ব্রিজ সংলগ্ন (২য় তলা), খিলগাঁও, ঢাকা।',
        'সিরিয়ালের জন্যঃ ০১৮৩৩-৩৩৭৮৮৮, অফিসঃ ০২-৪৭২৬৯১১৩',
        'রোগী দেখার সময়ঃ সকাল ১০ টা হতে দুপুর ২টা, বিকাল ৪টা হতে রাত ১০টা',
        'E-mail: ifradental@gmail.com, www.ifradental.com',
      ];

  const medicines = prescription.medicines || [];
  const validMeds = medicines.filter((m) => m && m.brand && m.brand.trim() !== '');

  const renderQuadrant = (quad?: ToothQuadrant) => {
    if (!quad || (!quad.ur && !quad.ul && !quad.lr && !quad.ll)) return null;
    return (
      <span className="inline-block align-middle ml-1 font-mono text-[9px] border border-slate-500 bg-white leading-none">
        <span className="flex border-b border-slate-400">
          <span className="w-3.5 h-3 flex items-center justify-center border-r border-slate-400 font-bold text-slate-900">
            {quad.ur || '-'}
          </span>
          <span className="w-3.5 h-3 flex items-center justify-center font-bold text-slate-900">
            {quad.ul || '-'}
          </span>
        </span>
        <span className="flex">
          <span className="w-3.5 h-3 flex items-center justify-center border-r border-slate-400 font-bold text-slate-900">
            {quad.lr || '-'}
          </span>
          <span className="w-3.5 h-3 flex items-center justify-center font-bold text-slate-900">
            {quad.ll || '-'}
          </span>
        </span>
      </span>
    );
  };

  return (
    <div
      id="printable-prescription-sheet"
      className="a4-print-sheet bg-white text-black font-sans relative flex flex-col justify-between overflow-hidden mx-auto shadow-md print:shadow-none"
      style={{
        width: '210mm',
        minWidth: '210mm',
        maxWidth: '210mm',
        height: '297mm',
        minHeight: '297mm',
        maxHeight: '297mm',
        padding: '0.5in', // 0.5 inches margin on all sides
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
      }}
    >
      {/* ==================== 1. TOP HEADER ==================== */}
      <div className="w-full shrink-0 pt-0 mt-0">
        {printMode === 'full' ? (
          <div>
            {/* Clinic Name & Logo Header */}
            <div className="flex items-center justify-center space-x-2.5 pb-0.5 pt-0">
              {clinic.displayLogo !== false && rawLogo ? (
                <img
                  src={rawLogo}
                  alt="Logo"
                  className="w-12 h-12 object-contain rounded-full border border-blue-900/30 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full border-2 border-blue-900 flex items-center justify-center font-serif font-black text-blue-900 text-base shrink-0">
                  🦷
                </div>
              )}
              <h1 className="text-[24px] font-black tracking-tight text-black font-serif text-center leading-tight">
                {clinic.clinicName || 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার'}
              </h1>
            </div>

            {/* Doctors Grid (3 Columns separated by vertical line) */}
            <div className="grid grid-cols-3 mt-1 text-center text-xs divide-x divide-slate-400">
              {docs.map((doc, idx) => (
                <div key={idx} className="px-1 leading-snug">
                  <div className="font-bold text-[#004085] text-[12px]">
                    {doc.name}
                  </div>
                  {doc.degrees && (
                    <div className="text-[9.5px] text-black font-medium mt-0.5">
                      {doc.degrees}
                    </div>
                  )}
                  {doc.designation && (
                    <div className="text-[9.5px] text-black font-bold">
                      {doc.designation}
                    </div>
                  )}
                  {doc.hospital && (
                    <div className="text-[9px] text-slate-800 leading-tight">
                      {doc.hospital}
                    </div>
                  )}
                  {doc.bmdcReg && (
                    <div className="text-[9px] text-slate-900 font-mono mt-0.5">
                      বিএমডিসি রেজি নং- {doc.bmdcReg}
                    </div>
                  )}
                  {doc.mobile && (
                    <div className="text-[9px] text-slate-900 font-mono mt-0.5">
                      মোবাইলঃ {doc.mobile}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Horizontal Line below Doctors */}
            <div className="border-b-2 border-black mt-1.5 mb-1 w-full"></div>
          </div>
        ) : (
          /* Blank spacer for pre-printed pad */
          <div style={{ height: `${printHeaderMarginCm}cm` }} className="w-full"></div>
        )}

        {/* ==================== 2. PATIENT INFO SECTION ==================== */}
        <div className="border-t border-b border-black py-1.5 my-1 text-[11px] leading-tight font-sans">
          <div className="grid grid-cols-12 gap-x-2">
            {/* Line 1 */}
            <div className="col-span-5 flex items-center">
              <span className="font-bold text-black w-16 shrink-0">Name</span>
              <span className="font-bold text-black mr-1.5">:</span>
              <span className="font-semibold text-slate-900 truncate">
                {prescription.patientName || 'Al- Imran'}
              </span>
            </div>
            <div className="col-span-2 flex items-center">
              <span className="font-bold text-black w-10 shrink-0">Age</span>
              <span className="font-bold text-black mr-1.5">:</span>
              <span className="font-medium text-slate-900">
                {prescription.age || '-'}
              </span>
            </div>
            <div className="col-span-2 flex items-center">
              <span className="font-bold text-black w-10 shrink-0">Sex</span>
              <span className="font-bold text-black mr-1.5">:</span>
              <span className="font-medium text-slate-900">
                {prescription.sex || 'M'}
              </span>
            </div>
            <div className="col-span-3 flex items-center">
              <span className="font-bold text-black w-14 shrink-0">Date</span>
              <span className="font-bold text-black mr-1.5">:</span>
              <span className="font-semibold text-slate-900">
                {prescription.date}
              </span>
            </div>

            {/* Line 2 */}
            <div className="col-span-5 flex items-center mt-1">
              <span className="font-bold text-black w-16 shrink-0">Address</span>
              <span className="font-bold text-black mr-1.5">:</span>
              <span className="font-medium text-slate-800 truncate">
                {prescription.address || '-'}
              </span>
            </div>
            <div className="col-span-2 flex items-center mt-1">
              <span className="font-bold text-black w-14 shrink-0">Reg No.</span>
              <span className="font-bold text-black mr-1.5">:</span>
              <span className="font-mono font-bold text-black">
                {prescription.regNo}
              </span>
            </div>
            <div className="col-span-2 flex items-center mt-1">
              <span className="font-bold text-black w-10 shrink-0">Occ</span>
              <span className="font-bold text-black mr-1.5">:</span>
              <span className="font-medium text-slate-800">
                {prescription.occupation || ''}
              </span>
            </div>
            <div className="col-span-3 flex items-center mt-1">
              <span className="font-bold text-black w-14 shrink-0">Mobile</span>
              <span className="font-bold text-black mr-1.5">:</span>
              <span className="font-mono font-semibold text-slate-900">
                {prescription.mobile || '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 3. BODY WITH WATERMARK ==================== */}
      <div className="flex-1 relative flex mt-1 overflow-hidden">
        {/* WATERMARK LAYER (Centered in body, matching screenshot) */}
        {printIncludeWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
            {rawLogo ? (
              <img
                src={rawLogo}
                alt="Watermark"
                className="w-80 h-80 object-contain"
                style={{ opacity: watermarkOpacity }}
              />
            ) : (
              <div
                className="w-72 h-72 rounded-full border-[10px] border-blue-900 flex flex-col items-center justify-center text-center p-4"
                style={{ opacity: watermarkOpacity }}
              >
                <span className="text-6xl mb-2">🦷</span>
                <span className="text-xs font-black uppercase text-blue-950 font-serif">
                  {clinic.clinicName}
                </span>
                <span className="text-[10px] text-blue-900 mt-1">
                  নন্দীপাড়া, খিলগাঁও, ঢাকা
                </span>
              </div>
            )}
          </div>
        )}

        {/* LEFT COLUMN: Barcode, Visit No, Clinical Findings (28% width) */}
        <div className="w-[28%] pr-3 relative z-10 border-r-2 border-black flex flex-col justify-between">
          <div className="space-y-3">
            {/* Barcode & Visit No */}
            <div className="pt-1">
              <BarcodeDisplay value={prescription.regNo} />
              <div className="text-xs font-bold text-black mt-1">
                Visit No: {prescription.visitNo || 1}
              </div>
            </div>

            {/* C/C (Chief Complaints) */}
            {prescription.cc && prescription.cc.filter(Boolean).length > 0 && (
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-black uppercase border-b border-slate-400 pb-0.5 mb-1 text-[10px]">
                  C/C (Chief Complaints)
                </div>
                <div className="space-y-0.5 pl-0.5">
                  {prescription.cc.map((c, i) => {
                    if (!c.trim()) return null;
                    const quad = ccQuadrants?.[i];
                    return (
                      <div key={i} className="flex items-start justify-between">
                        <span className="font-medium">• {c}</span>
                        {printIncludeQuadrant && renderQuadrant(quad)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* H/O (Medical History) */}
            {printIncludeHo &&
              prescription.ho &&
              (Object.entries(prescription.ho).some(([_, val]) => val) ||
                prescription.hoCustomText) && (
                <div className="text-[11px] leading-tight">
                  <div className="font-bold text-black uppercase border-b border-slate-400 pb-0.5 mb-1 text-[10px]">
                    H/O (History)
                  </div>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {Object.entries(prescription.ho)
                      .filter(([_, val]) => val)
                      .map(([key]) => (
                        <span
                          key={key}
                          className="text-[9px] bg-slate-100 font-semibold px-1 py-0.2 rounded border border-slate-300"
                        >
                          {key}
                        </span>
                      ))}
                  </div>
                  {prescription.hoCustomText && (
                    <div className="mt-0.5 text-[10px] text-slate-700 italic">
                      {prescription.hoCustomText}
                    </div>
                  )}
                </div>
              )}

            {/* O/E (On Examination) */}
            {prescription.oe && prescription.oe.filter(Boolean).length > 0 && (
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-black uppercase border-b border-slate-400 pb-0.5 mb-1 text-[10px]">
                  O/E (Examination)
                </div>
                <div className="space-y-0.5 pl-0.5">
                  {prescription.oe.map((o, i) => {
                    if (!o.trim()) return null;
                    const quad = oeQuadrants?.[i];
                    return (
                      <div key={i} className="flex items-start justify-between">
                        <span className="font-medium">• {o}</span>
                        {printIncludeQuadrant && renderQuadrant(quad)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dx (Diagnosis) */}
            {prescription.dx && prescription.dx.filter(Boolean).length > 0 && (
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-black uppercase border-b border-slate-400 pb-0.5 mb-1 text-[10px]">
                  Dx (Diagnosis)
                </div>
                <div className="space-y-0.5 pl-0.5">
                  {prescription.dx.map((d, i) => {
                    if (!d.trim()) return null;
                    const quad = dxQuadrants?.[i];
                    return (
                      <div key={i} className="flex items-start justify-between font-bold text-black">
                        <span>• {d}</span>
                        {printIncludeQuadrant && renderQuadrant(quad)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* I/X (Investigation) */}
            {prescription.ix && prescription.ix.filter(Boolean).length > 0 && (
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-black uppercase border-b border-slate-400 pb-0.5 mb-1 text-[10px]">
                  I/X (Investigation)
                </div>
                <ul className="list-disc list-inside space-y-0.5 pl-0.5 text-black">
                  {prescription.ix.filter(Boolean).map((ix, i) => (
                    <li key={i}>{ix}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Rx. and Medicines (72% width) */}
        <div className="w-[72%] pl-5 relative z-10 flex flex-col justify-between">
          <div className="space-y-3.5">
            {/* Rx. Symbol */}
            <div className="font-serif italic font-black text-3xl text-black select-none leading-none pt-0.5">
              Rx.
            </div>

            {/* Medicines List matching exact screenshot format */}
            <div className="space-y-3 pl-2">
              {validMeds.map((med, idx) => (
                <div key={idx} className="text-xs leading-normal">
                  {/* Line 1: Number & Brand Name */}
                  <div className="font-bold text-[12.5px] text-black">
                    {idx + 1}.&nbsp;&nbsp;{med.brand}
                  </div>

                  {/* Line 2: Dose & Instruction on left, Duration on right */}
                  <div className="pl-5 flex items-center justify-between text-[11px] text-black mt-0.5">
                    <div className="space-x-1.5">
                      {med.dose && (
                        <span className="font-medium text-black">
                          {med.dose}
                        </span>
                      )}
                      {med.instruction && (
                        <span>- {med.instruction}</span>
                      )}
                    </div>

                    {med.duration && (
                      <div className="font-medium text-black pr-2">
                        - {med.duration}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {validMeds.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  কোন ওষুধ প্রেসক্রাইব করা হয়নি
                </div>
              )}
            </div>

            {/* Advice (উপদেশ) */}
            {printIncludeAdvice &&
              prescription.advice &&
              prescription.advice.filter(Boolean).length > 0 && (
                <div className="pt-4 mt-4 border-t border-slate-300 text-xs pl-2">
                  <div className="font-bold text-black mb-1">
                    উপদেশাবলী (Advice):
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-900 pl-1 text-[11px]">
                    {prescription.advice.filter(Boolean).map((adv, idx) => (
                      <li key={idx}>{adv}</li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Next Visit / পরবর্তী সাক্ষাত */}
            {printIncludeNextVisit &&
              (prescription.nextVisitDate ||
                (prescription.revisitText &&
                  prescription.revisitText !== 'প্রয়োজন নেই')) && (
                <div className="pt-2 pl-2 text-xs">
                  <span className="font-bold text-black">পরবর্তী সাক্ষাত: </span>
                  <span className="font-semibold text-slate-900">
                    {prescription.nextVisitDate || prescription.revisitText}
                  </span>
                  {prescription.timeSlot && (
                    <span className="text-slate-700 ml-1">
                      ({prescription.timeSlot})
                    </span>
                  )}
                </div>
              )}
          </div>

          {/* Optional Doctor Signature */}
          {printIncludeSignature && (
            <div className="self-end text-center mt-6 pr-4">
              <div className="w-40 border-b-2 border-black mb-1"></div>
              <div className="text-[10px] font-bold text-black">
                ডাক্তারের স্বাক্ষর / Signature
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== 4. FOOTER BANNER ==================== */}
      <div className="w-full shrink-0 mt-1 pb-0">
        <div className="border-t-2 border-black w-full mb-1"></div>
        {printIncludeFooter && printMode === 'full' && (
          <div className="text-center text-[10px] leading-tight font-sans text-black font-medium">
            {footerLines.map((line, idx) => (
              <p
                key={idx}
                className={
                  idx === 1
                    ? 'font-bold text-black text-[10.5px]'
                    : idx === 0
                    ? 'text-black font-semibold'
                    : 'text-slate-800'
                }
              >
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
