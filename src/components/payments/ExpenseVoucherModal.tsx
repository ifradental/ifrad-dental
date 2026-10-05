'use client';

import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  Clock, 
  FileText, 
  User, 
  Phone, 
  ShieldCheck, 
  Receipt,
  Layers,
  Building2
} from 'lucide-react';
import type { ExpenseRecord, ClinicSettings } from '@/lib/db';
import { getClinicHeaderDetails } from '@/components/appointments/ThermalTokenModal';

// Helper to convert number to Bangla words
function numberToBanglaWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'শূন্য টাকা মাত্র';
  return `${num.toLocaleString('bn-BD')} টাকা মাত্র`;
}

export interface ExpenseVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseRecord | null;
  clinicSettings: ClinicSettings | null;
  autoPrint?: boolean;
}

/**
 * Direct Print Engine for Thermal (80mm/58mm) and A4 Standard Expense Vouchers
 */
export function printExpenseVoucherWindow(
  expense: ExpenseRecord,
  clinicSettings: ClinicSettings | null,
  paperFormat: 'thermal' | 'a4' = 'thermal',
  thermalWidth: '80mm' | '58mm' = '80mm'
) {
  const printWindow = window.open('', '_blank', 'width=750,height=800');
  if (!printWindow) {
    alert('দয়া করে ব্রাউজারের পপ-আপ অনুমতি দিন যাতে ভাউচার প্রিন্ট উইন্ডো খোলা যায়।');
    return;
  }

  const { clinicName, clinicSubtitle, clinicAddress, hotline } = getClinicHeaderDetails(clinicSettings);
  const voucherNo = expense.voucherNo || expense.id.replace('exp_', 'EXP-');
  const amount = Number(expense.amount) || 0;
  const inWords = numberToBanglaWords(amount);
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const deptLabel = 
    expense.department === 'physiotherapy'
      ? 'ফিজিওথেরাপি বিভাগ'
      : expense.department === 'dental'
      ? 'ডেন্টাল বিভাগ'
      : 'সার্বিক ক্লিনিক';

  let htmlContent = '';

  if (paperFormat === 'thermal') {
    const widthMm = thermalWidth === '58mm' ? 52 : 74;
    htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Expense Voucher #${voucherNo} - ${expense.title}</title>
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
      padding: 8px 4px 16px 4px;
      color: #000;
      background: #fff;
      font-size: 11px;
      line-height: 1.35;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: monospace, Courier, monospace; }
    
    .clinic-title {
      font-size: 14px;
      font-weight: 900;
      line-height: 1.2;
      margin-bottom: 2px;
    }
    .clinic-sub {
      font-size: 9.5px;
      margin-bottom: 2px;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 6px 0;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border: 1px solid #000;
      border-radius: 4px;
      font-weight: 800;
      font-size: 11px;
      margin: 4px 0;
      text-transform: uppercase;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .table td {
      padding: 2px 0;
      vertical-align: top;
    }
    .total-box {
      border: 1.5px solid #000;
      padding: 6px;
      margin: 6px 0;
      text-align: center;
      background: #f9f9f9;
    }
    .amount-large {
      font-size: 18px;
      font-weight: 900;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 4px;
      font-size: 9px;
    }
    .sig-line {
      border-top: 1px solid #000;
      padding-top: 2px;
      width: 42%;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="clinic-title">${clinicName}</div>
    <div class="clinic-sub">${clinicSubtitle}</div>
    <div style="font-size: 9px;">${clinicAddress}</div>
    ${hotline ? `<div style="font-size: 9.5px; font-weight: bold;">হটলাইন: ${hotline}</div>` : ''}
    
    <div class="divider"></div>
    <div class="badge">অফিসিয়াল খরচ ভাউচার (EXPENSE VOUCHER)</div>
    <div style="font-size: 10px; font-weight: bold; margin-top: 2px;">আওতাধীন: ${deptLabel}</div>
  </div>

  <table class="table" style="margin-top: 4px;">
    <tr>
      <td style="width: 50%;"><strong>ভাউচার নং:</strong> <span class="font-mono font-bold">${voucherNo}</span></td>
      <td style="width: 50%;" class="text-right"><strong>তারিখ:</strong> ${expense.date}</td>
    </tr>
    <tr>
      <td colspan="2"><strong>খরচের খাত:</strong> ${expense.category}</td>
    </tr>
    <tr>
      <td colspan="2"><strong>বিবরণ:</strong> ${expense.title}</td>
    </tr>
    <tr>
      <td><strong>খরচকারী:</strong> ${expense.spentBy || 'Admin'}</td>
      <td class="text-right"><strong>মেথড:</strong> ${expense.paymentMethod || 'Cash'}</td>
    </tr>
    ${expense.note ? `<tr><td colspan="2"><strong>মন্তব্য:</strong> ${expense.note}</td></tr>` : ''}
  </table>

  <div class="total-box">
    <div style="font-size: 10px; font-weight: bold;">পরিশোধিত খরচের পরিমাণ</div>
    <div class="amount-large font-mono">৳ ${amount.toLocaleString()}</div>
    <div style="font-size: 9px; margin-top: 2px; font-style: italic;">কথায়: ${inWords}</div>
  </div>

  <div class="signatures">
    <div class="sig-line">খরচকারী / গ্রহীতা</div>
    <div class="sig-line">অনুমোদনকারী স্বাক্ষর</div>
  </div>

  <div class="divider" style="margin-top: 14px;"></div>
  <div class="text-center" style="font-size: 8.5px; color: #555;">
    ইফরা ডেন্টাল ও ফিজিওথেরাপি সেন্ট্রাল একাউন্টস ম্যানেজমেন্ট<br>
    প্রিন্ট সময়: ${timeStr} | তারিখ: ${expense.date}
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
</html>`;
  } else {
    // A4 Standard Voucher
    htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Expense Voucher #${voucherNo} - ${expense.title}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, 'Kalpurush', sans-serif; color: #1e293b; background: #fff; line-height: 1.4; padding: 10px; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .clinic-name { font-size: 24px; font-weight: 900; color: #0f172a; }
    .clinic-info { font-size: 12px; color: #475569; }
    .badge { background: #f43f5e; color: #fff; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 800; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .amount-card { background: #fff1f2; border: 2px solid #fecdd3; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
    .sig-block { border-top: 1px solid #94a3b8; width: 220px; text-align: center; padding-top: 6px; font-size: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="clinic-name">${clinicName}</div>
      <div class="clinic-info">${clinicSubtitle}</div>
      <div class="clinic-info">${clinicAddress} | হটলাইন: ${hotline || '-'}</div>
    </div>
    <div style="text-align: right;">
      <div class="badge">EXPENSE VOUCHER</div>
      <div style="font-size: 14px; font-weight: bold; margin-top: 6px; font-family: monospace;">#${voucherNo}</div>
      <div style="font-size: 12px; color: #64748b;">তারিখ: ${expense.date}</div>
    </div>
  </div>

  <div class="card">
    <table style="width: 100%; font-size: 13px;">
      <tr>
        <td style="padding: 6px 0; width: 20%; color: #64748b;">বিভাগ (Department):</td>
        <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${deptLabel}</td>
        <td style="padding: 6px 0; width: 20%; color: #64748b;">পেমেন্ট মেথড:</td>
        <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${expense.paymentMethod || 'Cash'}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;">খরচের খাত (Category):</td>
        <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${expense.category}</td>
        <td style="padding: 6px 0; color: #64748b;">খরচকারী / কর্মকর্তা:</td>
        <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${expense.spentBy || 'Admin'}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;">খরচের বিবরণ / টাইটেল:</td>
        <td colspan="3" style="padding: 6px 0; font-weight: bold; font-size: 15px; color: #0f172a;">${expense.title}</td>
      </tr>
      ${expense.note ? `<tr><td style="padding: 6px 0; color: #64748b;">মন্তব্য (Note):</td><td colspan="3" style="padding: 6px 0;">${expense.note}</td></tr>` : ''}
    </table>
  </div>

  <div class="amount-card">
    <div style="font-size: 14px; color: #9f1239; font-weight: bold; text-transform: uppercase;">পরিশোধিত মোট খরচের পরিমাণ</div>
    <div style="font-size: 32px; font-weight: 900; color: #881337; font-family: monospace; margin: 6px 0;">৳ ${amount.toLocaleString()}</div>
    <div style="font-size: 13px; color: #475569; font-style: italic;">কথায়: ${inWords}</div>
  </div>

  <div class="signatures">
    <div class="sig-block">খরচকারী / গ্রহীতার স্বাক্ষর</div>
    <div class="sig-block">হিসাবরক্ষক / ক্যাশিয়ার</div>
    <div class="sig-block">অনুমোদনকারী কর্মকর্তা</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
</html>`;
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export default function ExpenseVoucherModal({
  isOpen,
  onClose,
  expense,
  clinicSettings,
  autoPrint = false,
}: ExpenseVoucherModalProps) {
  const [paperFormat, setPaperFormat] = useState<'thermal' | 'a4'>('thermal');
  const [thermalWidth, setThermalWidth] = useState<'80mm' | '58mm'>('80mm');

  React.useEffect(() => {
    if (isOpen && autoPrint && expense) {
      printExpenseVoucherWindow(expense, clinicSettings, paperFormat, thermalWidth);
    }
  }, [isOpen, autoPrint, expense, clinicSettings, paperFormat, thermalWidth]);

  if (!isOpen || !expense) return null;

  const { clinicName, clinicSubtitle, clinicAddress, hotline } = getClinicHeaderDetails(clinicSettings);
  const voucherNo = expense.voucherNo || expense.id.replace('exp_', 'EXP-');
  const amount = Number(expense.amount) || 0;
  const inWords = numberToBanglaWords(amount);
  const deptLabel = 
    expense.department === 'physiotherapy'
      ? '⚡ ফিজিওথেরাপি বিভাগ'
      : expense.department === 'dental'
      ? '🦷 ডেন্টাল বিভাগ'
      : '🏥 সার্বিক ক্লিনিক';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Top Bar */}
        <div className="p-4 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold">
              💸
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">অফিসিয়াল খরচ ভাউচার</h3>
              <p className="text-[11px] text-rose-100 font-mono">ভাউচার নং: #{voucherNo}</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => printExpenseVoucherWindow(expense, clinicSettings, paperFormat, thermalWidth)}
              className="px-3 py-1.5 bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl shadow transition flex items-center space-x-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট করুন</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Selector Tabs */}
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <span className="font-bold text-slate-600 mr-1">প্রিন্ট সাইজ:</span>
            <button
              type="button"
              onClick={() => setPaperFormat('thermal')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                paperFormat === 'thermal' ? 'bg-rose-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              থার্মাল (POS)
            </button>
            <button
              type="button"
              onClick={() => setPaperFormat('a4')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                paperFormat === 'a4' ? 'bg-rose-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              A4 স্ট্যান্ডার্ড
            </button>
          </div>

          {paperFormat === 'thermal' && (
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setThermalWidth('80mm')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  thermalWidth === '80mm' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setThermalWidth('58mm')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  thermalWidth === '58mm' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                58mm
              </button>
            </div>
          )}
        </div>

        {/* Voucher Preview Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Header Preview */}
          <div className="text-center pb-3 border-b border-slate-200">
            <h4 className="font-black text-base text-slate-900">{clinicName}</h4>
            <p className="text-[11px] text-slate-500">{clinicSubtitle}</p>
            <p className="text-[11px] text-slate-400">{clinicAddress}</p>
            {hotline && <p className="text-[11px] font-bold text-slate-600">হটলাইন: {hotline}</p>}

            <div className="mt-2 inline-block px-3 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[11px]">
              {deptLabel}
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">ভাউচার নং:</span>
              <span className="font-mono font-bold text-slate-900">#{voucherNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">তারিখ:</span>
              <span className="font-mono text-slate-800">{expense.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">ক্যাটাগরি:</span>
              <span className="font-bold text-slate-800">{expense.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">বিবরণ / শিরোনাম:</span>
              <span className="font-bold text-slate-900 text-right">{expense.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">অনুমোদনকারী / খরচকারী:</span>
              <span className="text-slate-800">{expense.spentBy || 'Admin'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">পেমেন্ট মেথড:</span>
              <span className="font-bold text-slate-800">{expense.paymentMethod || 'Cash'}</span>
            </div>
            {expense.note && (
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500 font-medium">মন্তব্য:</span>
                <span className="text-slate-700 italic text-right">{expense.note}</span>
              </div>
            )}
          </div>

          {/* Amount Box */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-1">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
              পরিশোধিত মোট খরচের পরিমাণ
            </span>
            <div className="text-2xl font-black font-mono text-rose-950">
              ৳ {amount.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-600 italic block">
              কথায়: {inWords}
            </span>
          </div>

          {/* Signature Line Preview */}
          <div className="pt-6 flex justify-between text-[11px] text-slate-500 font-medium">
            <div className="text-center border-t border-slate-300 pt-1 w-28">
              খরচকারী স্বাক্ষর
            </div>
            <div className="text-center border-t border-slate-300 pt-1 w-28">
              অনুমোদনকারী
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
          >
            বন্ধ করুন
          </button>

          <button
            type="button"
            onClick={() => printExpenseVoucherWindow(expense, clinicSettings, paperFormat, thermalWidth)}
            className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>ভাউচার প্রিন্ট করুন (Print Voucher)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
