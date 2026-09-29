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
  const docName = appointment.doctorName || clinicSettings?.doctor1?.name || 'ডা. নাহিদ হাসান';
  const formattedFee = (appointment.paid || appointment.visitFee || 0).toLocaleString();
  const dateFormatted = appointment.date || new Date().toISOString().split('T')[0];
  const timeFormatted = appointment.time || '10:00 AM';
  const isPaid = (appointment.paid || 0) > 0;
  const printTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Serial Token #${appointment.serial} - ${appointment.name}</title>
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
      padding: 3mm 1.5mm;
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
      font-size: ${paperSize === '58mm' ? '12px' : '14px'};
      font-weight: 900;
      line-height: 1.2;
      margin-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: -0.2px;
    }
    .clinic-sub {
      font-size: ${paperSize === '58mm' ? '8.5px' : '9.5px'};
      color: #111;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .clinic-contact {
      font-size: ${paperSize === '58mm' ? '8px' : '9px'};
      color: #222;
      margin-bottom: 1.5px;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 4px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 5px 0;
    }
    .token-box {
      border: 2px solid #000;
      padding: 4px 2px;
      margin: 5px 0;
      text-align: center;
      border-radius: 4px;
    }
    .token-label {
      font-size: ${paperSize === '58mm' ? '9px' : '10.5px'};
      font-weight: bold;
    }
    .token-number {
      font-size: ${paperSize === '58mm' ? '24px' : '30px'};
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
      width: 34%;
      font-weight: bold;
      color: #000;
    }
    .info-value {
      width: 66%;
      font-weight: 600;
    }
    .footer-note {
      font-size: ${paperSize === '58mm' ? '8px' : '9px'};
      text-align: center;
      line-height: 1.25;
      margin-top: 3px;
    }
    .barcode-line {
      letter-spacing: 3px;
      font-family: monospace;
      font-weight: bold;
      font-size: 13px;
      margin: 3px 0;
      text-align: center;
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
    <div class="clinic-sub">${clinicSubtitle}</div>
    <div class="clinic-contact font-bold">হটলাইন: ${hotline}</div>
    <div class="clinic-contact">${clinicAddress}</div>
    ${visitingHours ? `<div class="clinic-contact" style="font-size: 8px;">সময়: ${visitingHours}</div>` : ''}
    <div class="divider"></div>
    <div class="font-bold" style="font-size: ${paperSize === '58mm' ? '9.5px' : '11px'};">*** রোগী সিরিয়াল টোকেন স্লিপ ***</div>
  </div>

  <!-- SERIAL TOKEN BOX -->
  <div class="token-box">
    <div class="token-label">আপনার সিরিয়াল নম্বর (SERIAL NO)</div>
    <div class="token-number">#${appointment.serial}</div>
    <div class="token-id">টোকেন নং: ${appointment.apntNo || `AP-${appointment.serial}`}</div>
  </div>

  <!-- PATIENT & DOCTOR DETAILS -->
  <table class="info-table">
    <tr>
      <td class="info-label">রেজি. নং:</td>
      <td class="info-value font-bold" style="font-family: monospace;">#${appointment.regNo || 'New'}</td>
    </tr>
    <tr>
      <td class="info-label">রোগীর নাম:</td>
      <td class="info-value font-bold">${appointment.name}</td>
    </tr>
    <tr>
      <td class="info-label">বয়স ও লিঙ্গ:</td>
      <td class="info-value">${appointment.age || '-'} Y / ${appointment.sex === 'F' ? 'মহিলা' : 'পুরুষ'}</td>
    </tr>
    <tr>
      <td class="info-label">মোবাইল:</td>
      <td class="info-value" style="font-family: monospace; font-weight: bold;">${appointment.mobile}</td>
    </tr>
    <tr>
      <td class="info-label">তারিখ ও সময়:</td>
      <td class="info-value font-bold">${dateFormatted} • ${timeFormatted}</td>
    </tr>
    <tr>
      <td class="info-label">অ্যাসাইন ডক্টর:</td>
      <td class="info-value font-bold">${docName}</td>
    </tr>
    ${appointment.problem ? `
    <tr>
      <td class="info-label">সমস্যা:</td>
      <td class="info-value">${appointment.problem}</td>
    </tr>` : ''}
  </table>

  <div class="divider"></div>

  <!-- FINANCIALS -->
  <table class="info-table">
    <tr>
      <td class="info-label font-bold" style="font-size: ${paperSize === '58mm' ? '10px' : '11px'};">কনসালটেশন ফি:</td>
      <td class="info-value text-right font-bold" style="font-size: ${paperSize === '58mm' ? '11px' : '12px'};">৳ ${formattedFee}</td>
    </tr>
    <tr>
      <td class="info-label">পেমেন্ট স্ট্যাটাস:</td>
      <td class="info-value text-right font-bold">${isPaid ? '[PAID / পরিশোধিত]' : '[DUE / বকেয়া]'}</td>
    </tr>
  </table>

  <div class="double-divider"></div>

  <!-- FOOTER & BARCODE -->
  <div class="text-center">
    <div class="barcode-line">||||| |||||| ||||| |||||||</div>
    <div class="footer-note font-bold">অনুগ্রহ করে সিরিয়াল ডাকা পর্যন্ত ওয়েটিং রুমে অপেক্ষা করুন।</div>
    <div class="footer-note">রোগী দেখার সময় পরিস্থিতির উপর নির্ভর করে কিছুটা পরিবর্তন হতে পারে।</div>
    <div class="divider"></div>
    <div style="font-size: 8.5px; font-weight: 600;">সুস্বাস্থ্য কামনায় — ${clinicName}</div>
    <div style="font-size: 8px; color: #555; margin-top: 2px;">ইস্যু সময়: ${printTimeStr}</div>
  </div>

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
                  #{appointment.serial}
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
            className={`bg-white text-black p-4 rounded-md shadow-lg border border-slate-300 font-sans transition-all duration-200 ${
              paperSize === '58mm' ? 'w-[230px] text-[11px]' : 'w-[290px] text-xs'
            }`}
          >
            {/* DYNAMIC CLINIC HEADER */}
            <div className="text-center pb-2">
              <h4 className="font-black text-sm uppercase tracking-tight text-slate-900 leading-tight">
                {clinicName}
              </h4>
              <p className="text-[10px] font-semibold text-slate-700 mt-0.5">{clinicSubtitle}</p>
              <p className="text-[10px] font-mono font-bold text-slate-800">হটলাইন: {hotline}</p>
              <p className="text-[9.5px] text-slate-600 leading-tight mt-0.5">{clinicAddress}</p>
              {visitingHours && (
                <p className="text-[8.5px] text-slate-500 font-medium mt-0.5">সময়: {visitingHours}</p>
              )}
              <div className="border-t border-dashed border-slate-400 my-2"></div>
              <div className="font-bold text-[11px] tracking-wider text-slate-800 uppercase">
                *** রোগী সিরিয়াল টোকেন ***
              </div>
            </div>

            {/* Token Badge */}
            <div className="border-2 border-slate-900 rounded-lg p-2.5 my-2 text-center bg-slate-50">
              <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                আপনার সিরিয়াল নম্বর
              </div>
              <div className="text-3xl font-black text-slate-950 my-0.5 tracking-tight">
                #{appointment.serial}
              </div>
              <div className="text-[10px] font-bold font-mono text-slate-600">
                টোকেন নং: {appointment.apntNo || `AP-${appointment.serial}`}
              </div>
            </div>

            {/* Info List */}
            <div className="space-y-1.5 py-1 text-slate-800">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-slate-600">রেজি. নং:</span>
                <span className="font-mono font-bold text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded">
                  #{appointment.regNo || 'New'}
                </span>
              </div>
              <div className="flex justify-between items-start text-[11px]">
                <span className="font-bold text-slate-600">রোগীর নাম:</span>
                <span className="font-bold text-slate-950 text-right max-w-[150px]">{appointment.name}</span>
              </div>
              <div className="flex justify-between items-center text-[10.5px]">
                <span className="font-bold text-slate-600">বয়স ও লিঙ্গ:</span>
                <span className="font-medium text-slate-900">
                  {appointment.age || '-'} Y / {appointment.sex === 'F' ? 'মহিলা' : 'পুরুষ'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10.5px]">
                <span className="font-bold text-slate-600">মোবাইল:</span>
                <span className="font-mono font-bold text-slate-900">{appointment.mobile}</span>
              </div>
              <div className="flex justify-between items-center text-[10.5px]">
                <span className="font-bold text-slate-600">তারিখ ও সময়:</span>
                <span className="font-semibold text-slate-900">{dateFormatted} • {timeFormatted}</span>
              </div>
              <div className="flex justify-between items-start text-[10.5px]">
                <span className="font-bold text-slate-600">ডাক্তার:</span>
                <span className="font-bold text-indigo-950 text-right max-w-[140px]">{docName}</span>
              </div>
              {appointment.problem && (
                <div className="flex justify-between items-start text-[10px]">
                  <span className="font-bold text-slate-600">সমস্যা:</span>
                  <span className="text-slate-800 text-right max-w-[140px]">{appointment.problem}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-400 my-2"></div>

            {/* Fee Section */}
            <div className="space-y-1 text-slate-900">
              <div className="flex justify-between items-center font-bold text-xs">
                <span>কনসালটেশন ফি:</span>
                <span className="text-sm font-mono text-emerald-800">৳ {formattedFee}</span>
              </div>
              <div className="flex justify-between items-center text-[10.5px]">
                <span className="font-medium text-slate-600">পেমেন্ট স্ট্যাটাস:</span>
                <span className={`font-bold ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isPaid ? 'পরিশোধিত (PAID)' : 'বকেয়া (DUE)'}
                </span>
              </div>
            </div>

            <div className="border-t-2 border-slate-900 my-2"></div>

            {/* Footer */}
            <div className="text-center pt-1">
              <div className="font-mono text-xs tracking-widest my-1">||||| |||||| ||||| |||||||</div>
              <p className="text-[9px] font-bold text-slate-800">
                অনুগ্রহ করে সিরিয়াল ডাকা পর্যন্ত ওয়েটিং রুমে অপেক্ষা করুন।
              </p>
              <p className="text-[8.5px] text-slate-500 mt-0.5">
                রোগী দেখার সময় পরিস্থিতির উপর নির্ভর করে কিছুটা পরিবর্তন হতে পারে।
              </p>
              <div className="border-t border-dashed border-slate-300 my-1.5"></div>
              <p className="text-[8.5px] font-semibold text-slate-700">ধন্যবাদ — {clinicName}</p>
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
