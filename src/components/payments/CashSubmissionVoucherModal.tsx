'use client';

import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  ShieldCheck, 
  Building2, 
  Phone, 
  Calendar 
} from 'lucide-react';
import { type CashSubmission, type ClinicSettings } from '@/lib/db';
import { getClinicHeaderDetails } from '@/components/appointments/ThermalTokenModal';

// Helper to convert number to Bangla currency words
function numberToBanglaWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'শূন্য টাকা মাত্র';
  return `${num.toLocaleString('bn-BD')} টাকা মাত্র`;
}

/**
 * Direct Standalone Window Print Engine for Cash Submission Vouchers
 */
export function printCashSubmissionWindow(
  submission: CashSubmission,
  clinicSettings: ClinicSettings | null | undefined,
  paperFormat: 'thermal' | 'a4' = 'thermal',
  thermalWidth: '80mm' | '58mm' = '80mm'
) {
  const printWindow = window.open('', '_blank', 'width=750,height=800');
  if (!printWindow) {
    alert('দয়া করে ব্রাউজারের পপ-আপ অনুমতি দিন যাতে ভাউচার প্রিন্ট উইন্ডো খোলা যায়।');
    return;
  }

  const { clinicName, clinicAddress, hotline } = getClinicHeaderDetails(clinicSettings);
  const inWords = numberToBanglaWords(submission.totalAmount);
  const now = new Date();
  const printTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  let htmlContent = '';

  if (paperFormat === 'thermal') {
    const widthMm = thermalWidth === '58mm' ? 52 : 74;
    htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cash Handover Voucher #${submission.submissionNo} - ${submission.cashierName}</title>
  <style>
    @page {
      size: ${thermalWidth} auto;
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
      font-size: ${thermalWidth === '58mm' ? '10px' : '11px'};
      line-height: 1.3;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .clinic-title {
      font-size: ${thermalWidth === '58mm' ? '12px' : '14px'};
      font-weight: 900;
      line-height: 1.2;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .clinic-sub {
      font-size: ${thermalWidth === '58mm' ? '8.5px' : '9.5px'};
      color: #222;
      margin-bottom: 2px;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 4px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 5px 0;
    }
    .receipt-header {
      border: 1.5px solid #000;
      padding: 2px 4px;
      margin: 4px 0;
      text-align: center;
      font-weight: 900;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${thermalWidth === '58mm' ? '9.5px' : '10.5px'};
      margin: 3px 0;
    }
    .info-table td {
      padding: 1.5px 0;
      vertical-align: top;
    }
    .bill-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
      font-size: ${thermalWidth === '58mm' ? '10px' : '11px'};
    }
    .bill-table td {
      padding: 2px 0;
    }
    .paid-badge {
      font-size: 13px;
      font-weight: 900;
    }
    .sig-area {
      display: flex;
      justify-content: space-between;
      margin-top: 22px;
      padding-top: 2px;
      font-size: 9px;
      text-align: center;
    }
    .sig-box {
      width: 45%;
      border-top: 1px dotted #000;
      padding-top: 2px;
    }
    .footer-note {
      text-align: center;
      font-size: 8.5px;
      color: #555;
      margin-top: 10px;
      padding-top: 4px;
      border-top: 1px dashed #777;
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="clinic-title">${clinicName}</div>
    <div class="clinic-sub">${clinicAddress}</div>
    <div class="clinic-sub">হটলাইন: ${hotline}</div>
  </div>

  <div class="receipt-header">
    ক্যাশ জমার রশিদ (HANDOVER SLIP)
  </div>

  <table class="info-table">
    <tr>
      <td><strong>Voucher No:</strong></td>
      <td class="text-right font-bold">${submission.submissionNo}</td>
    </tr>
    <tr>
      <td><strong>Date & Time:</strong></td>
      <td class="text-right">${submission.submissionDate} (${submission.submissionTime || printTimeStr})</td>
    </tr>
    <tr>
      <td><strong>Cashier:</strong></td>
      <td class="text-right font-bold">${submission.cashierName}</td>
    </tr>
    ${submission.shiftPeriod ? `
    <tr>
      <td><strong>Shift:</strong></td>
      <td class="text-right">${submission.shiftPeriod}</td>
    </tr>` : ''}
    <tr>
      <td><strong>Status:</strong></td>
      <td class="text-right font-bold">${submission.status === 'Approved' ? 'APPROVED (গৃহীত)' : 'PENDING (অপেক্ষমান)'}</td>
    </tr>
  </table>

  <div class="double-divider"></div>

  <table class="bill-table">
    <tr>
      <td>নগদ ক্যাশ (Cash Amount):</td>
      <td class="text-right font-bold">৳ ${submission.cashAmount.toLocaleString()}</td>
    </tr>
    ${submission.digitalAmount > 0 ? `
    <tr>
      <td>ডিজিটাল / বিকাশ (Digital):</td>
      <td class="text-right font-bold">৳ ${submission.digitalAmount.toLocaleString()}</td>
    </tr>` : ''}
    <tr style="border-top: 1.5px solid #000; border-bottom: 1.5px solid #000;">
      <td style="padding: 3px 0;"><strong>সর্বমোট জমা (TOTAL):</strong></td>
      <td class="text-right paid-badge">৳ ${submission.totalAmount.toLocaleString()}</td>
    </tr>
  </table>

  <div style="font-size: 9px; margin: 3px 0;">
    <strong>কথায়:</strong> ${inWords}
  </div>

  ${submission.notes ? `
  <div class="divider"></div>
  <div style="font-size: 9px;"><strong>নোট:</strong> ${submission.notes}</div>
  ` : ''}

  ${submission.status === 'Approved' ? `
  <div class="divider"></div>
  <div style="font-size: 9.5px; background: #f0fdf4; padding: 2px 4px; border: 1px dashed #16a34a;">
    ✓ <strong>ক্যাশ বুঝে নিয়েছেন:</strong> ${submission.approvedBy || 'Admin'}<br/>
    <strong>অনুমোদনের সময়:</strong> ${submission.approvedAt ? new Date(submission.approvedAt).toLocaleString('bn-BD') : submission.submissionDate}
  </div>
  ` : ''}

  <div class="sig-area">
    <div class="sig-box">
      <strong>জমাদানকারী</strong><br/>
      <span style="font-size: 8px;">(${submission.cashierName})</span>
    </div>
    <div class="sig-box">
      <strong>গ্রহীতা (Admin)</strong><br/>
      <span style="font-size: 8px;">(${submission.approvedBy || 'অ্যাডমিন / হিসাব'})</span>
    </div>
  </div>

  <div class="footer-note">
    ইফরা ডেন্টাল সেন্টার - ক্যাশ হ্যান্ডওভার ভাউচার<br/>
    সফটওয়্যার সহায়তা: Ifrad Dental System
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.close();
      }, 300);
    };
  </script>
</body>
</html>`;
  } else {
    // A4 Official Voucher Design
    htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cash Handover Voucher #${submission.submissionNo} - ${submission.cashierName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, 'Kalpurush', sans-serif;
      color: #0f172a;
      background: #fff;
      font-size: 13px;
      line-height: 1.4;
      padding: 0;
    }
    .header-container {
      border-bottom: 2px solid #047857;
      padding-bottom: 12px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .clinic-title {
      font-size: 22px;
      font-weight: 800;
      color: #065f46;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .clinic-subtitle {
      font-size: 12px;
      color: #475569;
      margin-bottom: 2px;
    }
    .receipt-title-badge {
      background: #047857;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 4px;
      display: inline-block;
      text-align: right;
    }
    .grid-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 18px;
      font-size: 12.5px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 2.5px 0;
    }
    .meta-label {
      color: #64748b;
      font-weight: 600;
    }
    .meta-value {
      font-weight: 700;
      color: #0f172a;
    }
    .table-voucher {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 13px;
    }
    .table-voucher th {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 9px 12px;
      font-weight: 700;
      color: #334155;
    }
    .table-voucher td {
      border: 1px solid #cbd5e1;
      padding: 9px 12px;
    }
    .total-row {
      background: #ecfdf5;
      font-weight: 900;
      font-size: 15px;
      color: #065f46;
    }
    .notes-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 15px 0;
      font-size: 12px;
    }
    .approval-banner {
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 15px 0;
      font-size: 12.5px;
      color: #14532d;
    }
    .signature-container {
      display: flex;
      justify-content: space-between;
      margin-top: 55px;
      padding: 0 20px;
    }
    .sig-block {
      text-align: center;
      width: 200px;
    }
    .sig-line {
      border-top: 1.5px solid #475569;
      margin-bottom: 5px;
    }
    .sig-title {
      font-weight: 700;
      font-size: 12px;
      color: #1e293b;
    }
    .sig-subtitle {
      font-size: 10.5px;
      color: #64748b;
    }
    .footer-container {
      margin-top: 35px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 10px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div>
      <div class="clinic-title">${clinicName}</div>
      <div class="clinic-subtitle">${clinicAddress}</div>
      <div class="clinic-subtitle">জরুরি হটলাইন: ${hotline}</div>
    </div>
    <div style="text-align: right;">
      <div class="receipt-title-badge">ক্যাশ জমার অফিশিয়াল ভাউচার</div>
      <div style="font-family: monospace; font-weight: bold; margin-top: 4px; color: #475569;">
        VOUCHER: #${submission.submissionNo}
      </div>
    </div>
  </div>

  <div class="grid-meta">
    <div>
      <div class="meta-row">
        <span class="meta-label">জমাদানকারী (Cashier):</span>
        <span class="meta-value">${submission.cashierName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">শিফট / সময়কাল:</span>
        <span class="meta-value">${submission.shiftPeriod || 'Regular Shift'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">জমার তারিখ ও সময়:</span>
        <span class="meta-value">${submission.submissionDate} (${submission.submissionTime || printTimeStr})</span>
      </div>
    </div>

    <div>
      <div class="meta-row">
        <span class="meta-label">ভাউচার স্ট্যাটাস:</span>
        <span class="meta-value" style="color: ${submission.status === 'Approved' ? '#047857' : '#d97706'};">
          ${submission.status === 'Approved' ? '✓ Approved & Received (গৃহীত)' : '⏳ Pending Approval (অপেক্ষমান)'}
        </span>
      </div>
      ${submission.approvedBy ? `
      <div class="meta-row">
        <span class="meta-label">অনুমোদনকারী (Admin):</span>
        <span class="meta-value">${submission.approvedBy}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">অনুমোদনের তারিখ:</span>
        <span class="meta-value">${submission.approvedAt ? new Date(submission.approvedAt).toLocaleString('bn-BD') : submission.submissionDate}</span>
      </div>` : ''}
    </div>
  </div>

  <table class="table-voucher">
    <thead>
      <tr>
        <th style="width: 50px; text-align: center;">SL</th>
        <th>বিবরণ ও পেমেন্ট মেথড (Particulars)</th>
        <th style="width: 140px; text-align: center;">পদ্ধতি (Method)</th>
        <th style="width: 150px; text-align: right;">পরিমাণ (Amount - ৳)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">১</td>
        <td><strong>ক্যাশ কাউন্টার কালেকশন (নগদ টাকা)</strong></td>
        <td style="text-align: center;">Cash (নগদ)</td>
        <td style="text-align: right; font-weight: bold; font-family: monospace;">৳ ${submission.cashAmount.toLocaleString()}</td>
      </tr>
      ${submission.digitalAmount > 0 ? `
      <tr>
        <td style="text-align: center;">২</td>
        <td><strong>ডিজিটাল ও মোবাইল ব্যাংকিং (বিকাশ / নগদ / কার্ড)</strong></td>
        <td style="text-align: center;">Digital / MFS</td>
        <td style="text-align: right; font-weight: bold; font-family: monospace;">৳ ${submission.digitalAmount.toLocaleString()}</td>
      </tr>` : ''}
      <tr class="total-row">
        <td colspan="3" style="text-align: right; font-weight: 800;">সর্বমোট জমাদান (GRAND TOTAL):</td>
        <td style="text-align: right; font-family: monospace; font-size: 16px;">৳ ${submission.totalAmount.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div style="font-size: 12.5px; margin: 8px 0; color: #334155;">
    <strong>কথায়:</strong> ${inWords}
  </div>

  ${submission.notes ? `
  <div class="notes-box">
    <strong>বিশেষ মন্তব্য / নোট:</strong> ${submission.notes}
  </div>` : ''}

  ${submission.status === 'Approved' ? `
  <div class="approval-banner">
    ✓ <strong>অনুমোদনের নিশ্চয়তা:</strong> অ্যাডমিন <strong>${submission.approvedBy || 'Admin'}</strong> কর্তৃক ক্যাশ সম্পূর্ণভাবে বুঝে নিয়ে সফটওয়্যারে গৃহীত (Approved) হিসেবে নথিভুক্ত করা হয়েছে।
  </div>` : ''}

  <div class="signature-container">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-title">জমাদানকারীর স্বাক্ষর (Cashier)</div>
      <div class="sig-subtitle">${submission.cashierName}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-title">গ্রহীতার স্বাক্ষর (Admin / Receiver)</div>
      <div class="sig-subtitle">${submission.approvedBy ? `${submission.approvedBy} (অনুমোদিত)` : 'অ্যাডমিন / হিসাবরক্ষণ'}</div>
    </div>
  </div>

  <div class="footer-container">
    ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার | সিস্টেম জেনারেটেড অফিশিয়াল ক্যাশ হ্যান্ডওভার ভাউচার | প্রিন্ট সময়: ${printTimeStr}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.close();
      }, 300);
    };
  </script>
</body>
</html>`;
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

interface CashSubmissionVoucherModalProps {
  submission: CashSubmission;
  clinicSettings?: ClinicSettings | null;
  onClose: () => void;
}

export default function CashSubmissionVoucherModal({
  submission,
  clinicSettings,
  onClose,
}: CashSubmissionVoucherModalProps) {
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');
  const [thermalWidth, setThermalWidth] = useState<'80mm' | '58mm'>('80mm');

  const handlePrint = () => {
    printCashSubmissionWindow(submission, clinicSettings, printFormat, thermalWidth);
  };

  const clinicName = clinicSettings?.clinicName || 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার';
  const clinicAddress = clinicSettings?.address || clinicSettings?.footerText?.split('.')[0] || 'নন্দীপাড়া ব্রিজ সংলগ্ন (২য় তলা), খিলগাঁও, ঢাকা';
  const hotline = clinicSettings?.hotline || '01833-337888';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-300">
        {/* Modal Top Control Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cash Handover Voucher / জমার ভাউচার</h3>
              <span className="text-[10px] text-slate-300">Voucher No: #{submission.submissionNo}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Format Selector */}
            <div className="bg-white/10 p-0.5 rounded-lg flex items-center text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  printFormat === 'thermal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                POS Thermal ({thermalWidth})
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  printFormat === 'a4' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                A4 Voucher
              </button>
            </div>

            {printFormat === 'thermal' && (
              <select
                value={thermalWidth}
                onChange={(e: any) => setThermalWidth(e.target.value)}
                className="bg-slate-800 text-white border border-white/20 rounded-md px-2 py-1 text-xs"
              >
                <option value="80mm">80mm</option>
                <option value="58mm">58mm</option>
              </select>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Voucher</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          {/* 1. THERMAL POS RECEIPT PREVIEW */}
          {printFormat === 'thermal' ? (
            <div className="w-[320px] bg-white p-4 rounded-lg shadow border border-slate-300 text-slate-900 font-mono text-xs">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h2 className="font-bold text-sm tracking-tight text-slate-900">{clinicName}</h2>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">{clinicAddress}</p>
                <p className="text-[10px] text-slate-600">হটলাইন: {hotline}</p>
                <div className="mt-2 inline-block bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  ক্যাশ জমার রশিদ / HANDOVER SLIP
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Voucher No:</span>
                  <span className="font-bold">{submission.submissionNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Time:</span>
                  <span>{submission.submissionDate} {submission.submissionTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cashier:</span>
                  <span className="font-bold">{submission.cashierName}</span>
                </div>
                {submission.shiftPeriod && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shift / Period:</span>
                    <span>{submission.shiftPeriod}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className={`font-bold ${submission.status === 'Approved' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {submission.status === 'Approved' ? 'APPROVED (গৃহীত)' : 'PENDING (অপেক্ষমান)'}
                  </span>
                </div>
              </div>

              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1.5">
                <div className="flex justify-between text-slate-700">
                  <span>নগদ ক্যাশ (Cash Amount):</span>
                  <span className="font-bold">৳ {submission.cashAmount.toLocaleString()}</span>
                </div>
                {submission.digitalAmount > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>ডিজিটাল / বিকাশ (Digital):</span>
                    <span className="font-bold">৳ {submission.digitalAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-300 text-slate-900">
                  <span>সর্বমোট জমা (Total):</span>
                  <span className="text-emerald-800">৳ {submission.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {submission.notes && (
                <div className="py-2 border-b border-dashed border-slate-400 text-[10px] text-slate-600">
                  <span className="font-bold">নোট:</span> {submission.notes}
                </div>
              )}

              {submission.status === 'Approved' && (
                <div className="py-2 border-b border-dashed border-slate-400 text-[10px] text-emerald-800 bg-emerald-50/50 p-1.5 rounded">
                  <div>✓ ক্যাশ বুঝে নিয়েছেন: <strong>{submission.approvedBy || 'Admin'}</strong></div>
                  <div>তারিখ ও সময়: {submission.approvedAt ? new Date(submission.approvedAt).toLocaleString('bn-BD') : submission.submissionDate}</div>
                </div>
              )}

              <div className="pt-8 grid grid-cols-2 gap-4 text-center text-[10px]">
                <div className="border-t border-slate-400 pt-1">
                  <span>জমাদানকারীর স্বাক্ষর</span>
                  <div className="text-[9px] text-slate-500">({submission.cashierName})</div>
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <span>গ্রহীতার স্বাক্ষর</span>
                  <div className="text-[9px] text-slate-500">({submission.approvedBy || 'অ্যাডমিন / হিসাব'})</div>
                </div>
              </div>

              <div className="mt-4 text-center text-[9px] text-slate-400">
                Generated by Ifrad Dental Management Software
              </div>
            </div>
          ) : (
            /* 2. STANDARD A4 PREVIEW */
            <div className="w-full max-w-xl bg-white p-8 rounded-xl shadow border border-slate-300 text-slate-900 text-xs">
              <div className="flex justify-between items-start pb-4 border-b-2 border-emerald-800">
                <div>
                  <h2 className="text-lg font-black text-emerald-950 tracking-tight">{clinicName}</h2>
                  <p className="text-slate-600 text-xs mt-0.5">{clinicAddress}</p>
                  <p className="text-slate-600 text-xs">জরুরি যোগাযোগ / হটলাইন: {hotline}</p>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-800 text-white font-bold text-xs px-3 py-1 rounded">
                    ক্যাশ জমার অফিশিয়াল ভাউচার
                  </span>
                  <div className="text-xs font-mono font-bold text-slate-700 mt-2">
                    Voucher: #{submission.submissionNo}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 my-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <div>
                    <span className="text-slate-500">জমাদানকারী (Cashier): </span>
                    <strong className="text-slate-900">{submission.cashierName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">শিফট / সময়কাল: </span>
                    <span>{submission.shiftPeriod || 'Regular Shift'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">জমার তারিখ: </span>
                    <span>{submission.submissionDate} ({submission.submissionTime})</span>
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <div>
                    <span className="text-slate-500">স্ট্যাটাস: </span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        submission.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {submission.status === 'Approved' ? '✓ Approved & Received' : '⏳ Pending Approval'}
                    </span>
                  </div>
                  {submission.approvedBy && (
                    <div>
                      <span className="text-slate-500">অনুমোদনকারী: </span>
                      <strong className="text-slate-900">{submission.approvedBy}</strong>
                    </div>
                  )}
                  {submission.approvedAt && (
                    <div className="text-[11px] text-slate-500">
                      {new Date(submission.approvedAt).toLocaleString('bn-BD')}
                    </div>
                  )}
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-slate-300 my-4 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                    <th className="p-2.5 border-r border-slate-300">বিবরণ / Particulars</th>
                    <th className="p-2.5 border-r border-slate-300">পদ্ধতি (Method)</th>
                    <th className="p-2.5 text-right">পরিমাণ (Amount - ৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5 border-r border-slate-200 font-medium">ক্যাশ কাউন্টার কালেকশন (নগদ)</td>
                    <td className="p-2.5 border-r border-slate-200">Cash</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">৳ {submission.cashAmount.toLocaleString()}</td>
                  </tr>
                  {submission.digitalAmount > 0 && (
                    <tr>
                      <td className="p-2.5 border-r border-slate-200 font-medium">ডিজিটাল পেমেন্ট (বিকাশ / নগদ / কার্ড)</td>
                      <td className="p-2.5 border-r border-slate-200">Digital / MFS</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">৳ {submission.digitalAmount.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="bg-emerald-50 font-black text-emerald-950 text-sm">
                    <td colSpan={2} className="p-2.5 border-r border-slate-300 text-right">সর্বমোট জমা (Grand Total):</td>
                    <td className="p-2.5 text-right text-emerald-800">৳ {submission.totalAmount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {submission.notes && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 mb-6">
                  <strong>বিশেষ মন্তব্য / নোট:</strong> {submission.notes}
                </div>
              )}

              <div className="pt-16 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                    জমাদানকারীর স্বাক্ষর (Cashier)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{submission.cashierName}</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                    গ্রহীতার স্বাক্ষর (Admin / Receiver)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {submission.approvedBy ? `${submission.approvedBy} (অনুমোদিত)` : 'অ্যাডমিন / হিসাবরক্ষণ'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

