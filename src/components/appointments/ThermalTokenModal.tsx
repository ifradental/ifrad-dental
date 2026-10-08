'use client';

import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  User, 
  Calendar, 
  Clock, 
  Phone, 
  Stethoscope, 
  Hash, 
  FileText,
  DollarSign,
  MapPin
} from 'lucide-react';
import type { Appointment, ClinicSettings } from '@/lib/db';

interface ThermalTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  clinicSettings: ClinicSettings | null;
  autoPrint?: boolean;
}

/**
 * Extracts 100% dynamic clinic header information from Database ClinicSettings
 */
export function getClinicHeaderDetails(clinicSettings: ClinicSettings | null) {
  const clinicName = clinicSettings?.clinicName?.trim() || 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার';
  
  // Tagline / Subtitle Header
  let clinicSubtitle = (clinicSettings as any)?.tagline || (clinicSettings as any)?.subHeader;
  if (!clinicSubtitle) {
    if (clinicSettings?.doctor1?.designation) {
      clinicSubtitle = `${clinicSettings.doctor1.designation} & ফিজিওথেরাপি কেয়ার`;
    } else {
      clinicSubtitle = 'ডেন্টাল এন্ড ফিজিওথেরাপি স্পেশালিস্ট কেয়ার';
    }
  }

  // Address
  let clinicAddress = (clinicSettings as any)?.address?.trim();
  if (!clinicAddress && clinicSettings?.footerText) {
    const parts = clinicSettings.footerText.split('।');
    if (parts.length > 0 && parts[0].trim()) {
      clinicAddress = parts[0].trim();
    }
  }
  if (!clinicAddress) {
    clinicAddress = 'নন্দীপাড়া ব্রিজ সংলগ্ন (২য় তলা), খিলগাঁও, ঢাকা';
  }

  // Hotline / Contact Number
  let hotline = 
    clinicSettings?.doctor1?.mobile?.trim() || 
    (clinicSettings as any)?.hotline || 
    (clinicSettings as any)?.phone || 
    (clinicSettings as any)?.mobile;

  if (!hotline && clinicSettings?.footerText) {
    const match = clinicSettings.footerText.match(/(?:যোগাযোগ|মোবাইল|ফোন|Hotline|Phone|Mob):\s*([0-9\-\+]+)/i);
    if (match && match[1]) {
      hotline = match[1].trim();
    }
  }
  if (!hotline) {
    hotline = '০১৮৩৩-৩৩৭৮৮৮';
  }

  // Visiting hours
  let visitingHours = (clinicSettings as any)?.visitingHours;
  if (!visitingHours && clinicSettings?.footerText) {
    const match = clinicSettings.footerText.match(/রোগী দেখার সময়:\s*([^।]+)/i);
    if (match && match[1]) {
      visitingHours = match[1].trim();
    }
  }

  return {
    clinicName,
    clinicSubtitle,
    clinicAddress,
    hotline,
    visitingHours
  };
}

export function getSerialTypeMeta(serialType?: string) {
  const type = (serialType || 'NEW').toUpperCase();
  switch (type) {
    case 'OLD':
      return {
        code: 'OLD',
        label: 'পুরাতন রোগী',
        subText: 'Old / Follow-up',
        bg: 'bg-indigo-100',
        text: 'text-indigo-800',
        border: 'border-indigo-300',
      };
    case 'LAB':
      return {
        code: 'LAB',
        label: 'ল্যাব সার্ভিস',
        subText: 'Dental Lab Work',
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-300',
      };
    case 'PHYSIO':
      return {
        code: 'PHYSIO',
        label: 'ফিজিওথেরাপি',
        subText: 'Physiotherapy',
        bg: 'bg-teal-100',
        text: 'text-teal-800',
        border: 'border-teal-300',
      };
    case 'NEW':
    default:
      return {
        code: 'NEW',
        label: 'নতুন রোগী',
        subText: 'New Patient',
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        border: 'border-emerald-300',
      };
  }
}

export function printThermalReceipt(
  appointment: Appointment, 
  clinicSettings: ClinicSettings | null, 
  paperSize: '80mm' | '58mm' = '80mm'
) {
  const widthMm = paperSize === '58mm' ? 52 : 74;
  const printWindow = window.open('', '_blank', 'width=420,height=600');
  if (!printWindow) {
    alert('দয়া করে ব্রাউজারের পপ-আপ অনুমতি দিন যাতে টোকেন প্রিন্ট উইন্ডো খোলা যায়।');
    return;
  }

  const { clinicName, clinicSubtitle, clinicAddress, hotline, visitingHours } = getClinicHeaderDetails(clinicSettings);
  const typeMeta = getSerialTypeMeta(appointment.serialType);
  const fullSerialStr = `${typeMeta.code}-#${appointment.serial}`;
  const docName = appointment.doctorName || clinicSettings?.doctor1?.name || 'ডা. নাহিদ হাসান';
  const formattedFee = (appointment.paid || appointment.visitFee || 0).toLocaleString();
  const dateFormatted = appointment.date || new Date().toISOString().split('T')[0];
  const timeFormatted = appointment.time || '10:00 AM';
  const isPaid = (appointment.paid || 0) > 0;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Serial Token ${fullSerialStr} - ${appointment.name}</title>
  <style>
    @page {
      size: ${paperSize} auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, 'Kalpurush', sans-serif;
      width: ${widthMm}mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 2mm 1.5mm;
      color: #000;
      font-size: ${paperSize === '58mm' ? '10px' : '11px'};
      line-height: 1.3;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .clinic-title {
      font-size: ${paperSize === '58mm' ? '13px' : '15px'};
      font-weight: 900;
      line-height: 1.2;
      margin-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: -0.2px;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 3px 0;
    }
    .token-box {
      border: 2px solid #000;
      padding: 5px 2px;
      margin: 4px 0;
      text-align: center;
      border-radius: 4px;
    }
    .token-number {
      font-size: ${paperSize === '58mm' ? '24px' : '28px'};
      font-weight: 900;
      line-height: 1.1;
      margin: 1px 0;
    }
    .token-id {
      font-size: 9px;
      font-weight: bold;
      font-family: monospace;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${paperSize === '58mm' ? '9.5px' : '10.5px'};
      margin: 3px 0;
    }
    .info-table td {
      padding: 1.5px 0;
      vertical-align: top;
    }
    .info-label {
      width: 32%;
      font-weight: bold;
      color: #000;
    }
    .info-value {
      width: 68%;
      font-weight: 600;
    }
    @media print {
      body {
        padding: 1mm 1.5mm;
      }
    }
  </style>
</head>
<body>
  <!-- DYNAMIC CLINIC HEADER -->
  <div class="text-center">
    <div class="clinic-title">${clinicName}</div>
    <div class="divider"></div>
  </div>

  <!-- SERIAL TOKEN BOX -->
  <div class="token-box">
    <div class="token-number">${fullSerialStr}</div>
    <div class="token-id">টোকেন নং: ${appointment.apntNo || `AP-${appointment.serial}`} • [${typeMeta.label}]</div>
  </div>

  <!-- PATIENT & DOCTOR DETAILS -->
  <table class="info-table">
    <tr>
      <td class="info-label">রোগীর নাম:</td>
      <td class="info-value font-bold">${appointment.name}</td>
    </tr>
    <tr>
      <td class="info-label">অ্যাসাইন ডক্টর:</td>
      <td class="info-value font-bold">${docName}</td>
    </tr>
    <tr>
      <td class="info-label">তারিখ ও সময়:</td>
      <td class="info-value font-bold">${dateFormatted} • ${timeFormatted}</td>
    </tr>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function ThermalTokenModal({
  isOpen,
  onClose,
  appointment,
  clinicSettings,
}: ThermalTokenModalProps) {
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm');

  if (!isOpen || !appointment) return null;

  const { clinicName, clinicSubtitle, clinicAddress, hotline, visitingHours } = getClinicHeaderDetails(clinicSettings);
  const typeMeta = getSerialTypeMeta(appointment.serialType);
  const fullSerialStr = `${typeMeta.code}-#${appointment.serial}`;
  const docName = appointment.doctorName || clinicSettings?.doctor1?.name || 'ডা. নাহিদ হাসান';
  const formattedFee = (appointment.paid || appointment.visitFee || 0).toLocaleString();
  const dateFormatted = appointment.date || new Date().toISOString().split('T')[0];
  const timeFormatted = appointment.time || '10:00 AM';
  const isPaid = (appointment.paid || 0) > 0;

  const handlePrint = () => {
    printThermalReceipt(appointment, clinicSettings, paperSize);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>সিরিয়াল টোকেন স্লিপ</span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {fullSerialStr}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">থার্মাল প্রিন্টারের জন্য প্রস্তুত</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Size Selector */}
        <div className="bg-slate-850 px-5 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">রোল সাইজ (Paper Roll):</span>
          <div className="flex items-center space-x-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setPaperSize('80mm')}
              className={`px-3 py-1 rounded font-bold text-xs transition cursor-pointer ${
                paperSize === '80mm'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              80mm (Standard POS)
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('58mm')}
              className={`px-3 py-1 rounded font-bold text-xs transition cursor-pointer ${
                paperSize === '58mm'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              58mm (Mini POS)
            </button>
          </div>
        </div>

        {/* Modal Body / Realistic POS Slip Preview */}
        <div className="p-5 bg-slate-950 flex justify-center items-center">
          <div 
            className={`bg-white text-black p-3.5 rounded-md shadow-lg border border-slate-300 font-sans transition-all duration-200 ${
              paperSize === '58mm' ? 'w-[210px] text-[10px]' : 'w-[250px] text-xs'
            }`}
          >
            {/* DYNAMIC CLINIC HEADER */}
            <div className="text-center pb-1">
              <h4 className="font-black text-sm uppercase tracking-tight text-slate-900 leading-tight">
                {clinicName}
              </h4>
              <div className="border-t border-dashed border-slate-300 my-1.5"></div>
            </div>

            {/* Token Badge */}
            <div className="border-2 border-slate-900 rounded-lg py-2.5 px-2 my-1.5 text-center bg-slate-50">
              <div className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-mono leading-none">
                {fullSerialStr}
              </div>
              <div className="text-[10px] font-bold font-mono text-slate-600 mt-1">
                টোকেন নং: {appointment.apntNo || `AP-${appointment.serial}`} • [{typeMeta.label}]
              </div>
            </div>

            {/* Info List */}
            <div className="space-y-1.5 py-1 text-slate-800 text-[11px]">
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-600">রোগীর নাম:</span>
                <span className="font-bold text-slate-950 text-right max-w-[140px]">{appointment.name}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-600">অ্যাসাইন ডক্টর:</span>
                <span className="font-bold text-indigo-950 text-right max-w-[140px]">{docName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">তারিখ ও সময়:</span>
                <span className="font-semibold text-slate-900">{dateFormatted} • {timeFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            বন্ধ করুন (Close)
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>থার্মাল প্রিন্ট করুন ({paperSize})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
