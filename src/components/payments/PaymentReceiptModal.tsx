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
  Share2,
  Receipt,
  Layers
} from 'lucide-react';
import type { PaymentRecord, Prescription, ClinicSettings } from '@/lib/db';
import { getClinicHeaderDetails } from '@/components/appointments/ThermalTokenModal';

// Helper to convert number to Bangla words (simple converter)
function numberToBanglaWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'শূন্য টাকা মাত্র';

  const units = ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ', 
                 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ'];
  
  if (num <= 20) {
    return `${units[num]} টাকা মাত্র`;
  }
  
  // Format with standard locale currency word representation fallback
  return `${num.toLocaleString('bn-BD')} টাকা মাত্র`;
}

export interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
  prescription?: Prescription | null;
  clinicSettings: ClinicSettings | null;
  autoPrint?: boolean;
}

/**
 * Direct Print Engine for Thermal (80mm/58mm) and A4 Standard Invoices
 */
export function printReceiptWindow(
  payment: PaymentRecord,
  prescription: Prescription | null | undefined,
  clinicSettings: ClinicSettings | null,
  paperFormat: 'thermal' | 'a4' = 'thermal',
  thermalWidth: '80mm' | '58mm' = '80mm'
) {
  const printWindow = window.open('', '_blank', 'width=750,height=800');
  if (!printWindow) {
    alert('দয়া করে ব্রাউজারের পপ-আপ অনুমতি দিন যাতে রসিদ প্রিন্ট উইন্ডো খোলা যায়।');
    return;
  }

  const { clinicName, clinicSubtitle, clinicAddress, hotline, visitingHours } = getClinicHeaderDetails(clinicSettings);
  const docName = prescription?.doctorName || clinicSettings?.doctor1?.name || 'ডা. নাহিদ হাসান';
  const docDegrees = clinicSettings?.doctor1?.degrees || 'বিডিএস, বিসিএস (স্বাস্থ্য)';
  const docDesignation = clinicSettings?.doctor1?.designation || 'ডেন্টাল সার্জন';
  const docHospital = clinicSettings?.doctor1?.hospital || 'ঢাকা ডেন্টাল কলেজ ও হাসপাতাল';
  
  const receiptNo = payment.id.replace('pay_', 'REC-');
  const paidAmount = Number(payment.paidAmount) || 0;
  const totalBill = Number(payment.totalBill) || Number(payment.payableAmount) || paidAmount;
  const dueAmount = Number(payment.dueAmount) || 0;
  const inWords = numberToBanglaWords(paidAmount);
  const paymentTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  let htmlContent = '';

  if (paperFormat === 'thermal') {
    const widthMm = thermalWidth === '58mm' ? 52 : 74;
    htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Money Receipt #${receiptNo} - ${payment.name}</title>
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
      font-weight: 600;
      margin-bottom: 2px;
    }
    .clinic-contact {
      font-size: ${thermalWidth === '58mm' ? '8px' : '9px'};
      color: #333;
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
      font-size: ${thermalWidth === '58mm' ? '13px' : '15px'};
      font-weight: 900;
    }
    .footer-note {
      font-size: 8px;
      color: #444;
      margin-top: 5px;
      text-align: center;
      line-height: 1.2;
    }
    .sig-area {
      margin-top: 15px;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="clinic-title">${clinicName}</div>
    <div class="clinic-sub">${clinicSubtitle}</div>
    <div class="clinic-contact">${clinicAddress}</div>
    <div class="clinic-contact">মোবাইল: ${hotline}</div>
  </div>

  <div class="receipt-header">MONEY RECEIPT (ক্যাশ মেমো)</div>

  <table class="info-table">
    <tr>
      <td style="width: 40%;"><strong>Receipt No:</strong></td>
      <td class="text-right font-bold">${receiptNo}</td>
    </tr>
    <tr>
      <td><strong>Date & Time:</strong></td>
      <td class="text-right">${payment.date || new Date().toISOString().split('T')[0]} (${paymentTimeStr})</td>
    </tr>
    <tr>
      <td><strong>Reg. No:</strong></td>
      <td class="text-right font-bold">${payment.regNo}</td>
    </tr>
    <tr>
      <td><strong>Patient Name:</strong></td>
      <td class="text-right font-bold">${payment.name}</td>
    </tr>
    ${payment.mobile ? `
    <tr>
      <td><strong>Mobile:</strong></td>
      <td class="text-right">${payment.mobile}</td>
    </tr>` : ''}
    <tr>
      <td><strong>Doctor:</strong></td>
      <td class="text-right">${docName}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <table class="info-table">
    <tr>
      <td><strong>Particulars:</strong></td>
      <td class="text-right font-bold">${payment.particulars || 'Dental Treatment Fee'}</td>
    </tr>
    <tr>
      <td><strong>Method:</strong></td>
      <td class="text-right">${payment.method || 'Cash'} ${payment.note ? `(${payment.note})` : ''}</td>
    </tr>
  </table>

  <div class="double-divider"></div>

  <table class="bill-table">
    <tr>
      <td>Total Bill:</td>
      <td class="text-right font-bold">৳ ${totalBill.toLocaleString()}</td>
    </tr>
    <tr style="border-top: 1px solid #000; border-bottom: 1px solid #000;">
      <td style="padding: 3px 0;"><strong>PAID TODAY (জমা):</strong></td>
      <td class="text-right paid-badge">৳ ${paidAmount.toLocaleString()}</td>
    </tr>
    <tr>
      <td style="padding-top: 3px;">Due Balance (বকেয়া):</td>
      <td class="text-right font-bold" style="padding-top: 3px; color: ${dueAmount > 0 ? '#000' : '#444'};">
        ৳ ${dueAmount.toLocaleString()}
      </td>
    </tr>
  </table>

  <div class="divider"></div>

  <div style="font-size: 9px; margin: 3px 0;">
    <strong>কথায়:</strong> ${inWords}
  </div>

  <div class="sig-area">
    <div>
      <div style="border-top: 1px dotted #000; padding-top: 2px;">রোগীর স্বাক্ষর</div>
    </div>
    <div class="text-right">
      <div style="border-top: 1px dotted #000; padding-top: 2px;">ক্যাশিয়ার: ${payment.addedBy || 'Cashier'}</div>
    </div>
  </div>

  <div class="footer-note">
    সুস্থ দাঁত, সুন্দর হাসি - ইফরা ডেন্টাল কেয়ার<br/>
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
    // A4 Standard Dental Invoice Design
    htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice #${receiptNo} - ${payment.name}</title>
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
      color: #1e293b;
      background: #fff;
      font-size: 13px;
      line-height: 1.4;
      padding: 0;
    }
    .header-container {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .clinic-brand {
      flex: 1;
    }
    .clinic-title {
      font-size: 22px;
      font-weight: 800;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: -0.3px;
      margin-bottom: 2px;
    }
    .clinic-subtitle {
      font-size: 13px;
      color: #475569;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .clinic-details {
      font-size: 11px;
      color: #64748b;
      line-height: 1.3;
    }
    .receipt-badge-box {
      text-align: right;
    }
    .receipt-title-badge {
      background: #0284c7;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 4px;
      display: inline-block;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .receipt-meta {
      font-size: 11px;
      color: #475569;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .meta-item {
      display: flex;
      margin-bottom: 4px;
      font-size: 12px;
    }
    .meta-label {
      width: 110px;
      font-weight: 600;
      color: #64748b;
    }
    .meta-val {
      flex: 1;
      font-weight: 700;
      color: #0f172a;
    }
    .table-custom {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .table-custom th {
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 700;
      padding: 8px 10px;
      text-align: left;
      font-size: 12px;
      border-bottom: 2px solid #bae6fd;
    }
    .table-custom td {
      padding: 10px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12.5px;
    }
    .summary-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 10px;
      margin-bottom: 30px;
    }
    .words-box {
      flex: 1;
      padding-right: 20px;
    }
    .in-words-card {
      background: #f1f5f9;
      border-left: 3px solid #0284c7;
      padding: 8px 12px;
      font-size: 12px;
      color: #334155;
    }
    .calculation-box {
      width: 320px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    .calc-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 12px;
      font-size: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .calc-row.highlight {
      background: #ecfdf5;
      font-size: 14px;
      font-weight: 800;
      color: #065f46;
      border-top: 1.5px solid #10b981;
      border-bottom: 1.5px solid #10b981;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
      padding-top: 10px;
    }
    .sig-line {
      width: 200px;
      text-align: center;
      border-top: 1px solid #64748b;
      padding-top: 5px;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
    }
    .footer-terms {
      margin-top: 30px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 10px;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="clinic-brand">
      <div class="clinic-title">${clinicName}</div>
      <div class="clinic-subtitle">${clinicSubtitle}</div>
      <div class="clinic-details">
        ${clinicAddress} | হেল্পলাইন: ${hotline}<br/>
        রোগী দেখার সময়: ${visitingHours || 'সকাল ১০:০০ - দুপুর ২:০০, বিকাল ৪:০০ - রাত ১০:০০'}
      </div>
    </div>
    <div class="receipt-badge-box">
      <div class="receipt-title-badge">MONEY RECEIPT / ক্যাশ রসিদ</div>
      <div class="receipt-meta">
        <strong>Receipt No:</strong> ${receiptNo}<br/>
        <strong>Date:</strong> ${payment.date || new Date().toISOString().split('T')[0]}<br/>
        <strong>Time:</strong> ${paymentTimeStr}
      </div>
    </div>
  </div>

  <div class="meta-grid">
    <div>
      <div class="meta-item">
        <span class="meta-label">Patient Name:</span>
        <span class="meta-val">${payment.name}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Reg. Number:</span>
        <span class="meta-val font-mono">${payment.regNo}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Mobile Number:</span>
        <span class="meta-val">${payment.mobile || '-'}</span>
      </div>
    </div>
    <div>
      <div class="meta-item">
        <span class="meta-label">Doctor Name:</span>
        <span class="meta-val">${docName}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Doctor Details:</span>
        <span class="meta-val">${docDegrees}, ${docDesignation}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Payment Method:</span>
        <span class="meta-val">${payment.method || 'Cash'} ${payment.note ? `(${payment.note})` : ''}</span>
      </div>
    </div>
  </div>

  <table class="table-custom">
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th>Particulars / Description</th>
        <th style="width: 150px;">Payment Type</th>
        <th style="width: 130px; text-align: right;">Total Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center; font-weight: 600; color: #64748b;">1</td>
        <td>
          <strong>${payment.particulars || 'Dental Consultation & Procedure'}</strong>
          ${prescription?.treatmentPlan?.length ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Plan: ${prescription.treatmentPlan.join(', ')}</div>` : ''}
        </td>
        <td>${payment.method || 'Cash Payment'}</td>
        <td style="text-align: right; font-weight: 700;">৳ ${totalBill.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary-container">
    <div class="words-box">
      <div class="in-words-card">
        <strong>In Words (কথায়):</strong> ${inWords}
      </div>
      <div style="margin-top: 15px; font-size: 11px; color: #64748b;">
        <strong>কালেকশন তথ্য:</strong><br/>
        টাকা গ্রহণকারী: <strong>${payment.addedBy || 'Cashier Desk'}</strong><br/>
        স্ট্যাটাস: <span style="color: #059669; font-weight: 700;">সফলভাবে পরিশোধিত (PAID)</span>
      </div>
    </div>

    <div class="calculation-box">
      <div class="calc-row">
        <span>Total Bill (মোট বিল):</span>
        <span class="font-bold">৳ ${totalBill.toLocaleString()}</span>
      </div>
      <div class="calc-row highlight">
        <span>PAID TODAY (আজকের জমা):</span>
        <span>৳ ${paidAmount.toLocaleString()}</span>
      </div>
      <div class="calc-row">
        <span>Due Balance (বকেয়া):</span>
        <span style="font-weight: 700; color: ${dueAmount > 0 ? '#dc2626' : '#059669'};">৳ ${dueAmount.toLocaleString()}</span>
      </div>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-line">
      গ্রহীতার স্বাক্ষর<br/>(Accounts / Cashier)
    </div>
    <div class="sig-line">
      কর্তৃপক্ষের স্বাক্ষর<br/>(Authorized Signatory)
    </div>
  </div>

  <div class="footer-terms">
    * এই রসিদটি কম্পিউটার দ্বারা স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত। পরবর্তী চিকিৎসা ও অ্যাপয়েন্টমেন্টে অংশগ্রহণের জন্য রসিদটি প্রদর্শন করুন।
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

export default function PaymentReceiptModal({
  isOpen,
  onClose,
  payment,
  prescription,
  clinicSettings,
  autoPrint = false,
}: PaymentReceiptModalProps) {
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');
  const [thermalWidth, setThermalWidth] = useState<'80mm' | '58mm'>('80mm');

  if (!isOpen || !payment) return null;

  const { clinicName, clinicSubtitle, clinicAddress, hotline } = getClinicHeaderDetails(clinicSettings);
  const docName = prescription?.doctorName || clinicSettings?.doctor1?.name || 'ডা. নাহিদ হাসান';
  const receiptNo = payment.id.replace('pay_', 'REC-');
  const paidAmount = Number(payment.paidAmount) || 0;
  const totalBill = Number(payment.totalBill) || Number(payment.payableAmount) || paidAmount;
  const dueAmount = Number(payment.dueAmount) || 0;
  const inWords = numberToBanglaWords(paidAmount);

  const handlePrint = () => {
    printReceiptWindow(payment, prescription, clinicSettings, printFormat, thermalWidth);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-white rounded-xl border border-slate-300 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="p-3.5 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <span>পেমেন্ট মানি রিসিট (Payment Receipt)</span>
                <span className="text-[10px] bg-emerald-600/80 px-2 py-0.2 rounded-full font-mono font-normal">
                  #{receiptNo}
                </span>
              </h2>
              <p className="text-[10px] text-blue-200">
                রোগী: {payment.name} | রেজি নং: {payment.regNo} | জমা: ৳ {paidAmount.toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Bar */}
        <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-bold text-slate-700">প্রিন্ট ফরম্যাট নির্বাচন:</span>
            <div className="inline-flex rounded-md shadow-xs bg-white p-0.5 border border-slate-300">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                  printFormat === 'thermal'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>থার্মাল পিওএস (Thermal POS Slip)</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                  printFormat === 'a4'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>স্ট্যান্ডার্ড এ৪ রিসিট (A4 Invoice)</span>
              </button>
            </div>
          </div>

          {printFormat === 'thermal' && (
            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-slate-500 font-semibold">কাগজের সাইজ:</span>
              <select
                value={thermalWidth}
                onChange={(e: any) => setThermalWidth(e.target.value)}
                className="px-2 py-0.5 border border-slate-300 rounded bg-white text-xs font-semibold text-slate-700"
              >
                <option value="80mm">80mm (৩ ইঞ্চি)</option>
                <option value="58mm">58mm (২ ইঞ্চি)</option>
              </select>
            </div>
          )}
        </div>

        {/* Receipt Live Visual Preview */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-200/70 flex justify-center">
          {printFormat === 'thermal' ? (
            /* THERMAL POS PREVIEW */
            <div 
              style={{ width: thermalWidth === '58mm' ? '240px' : '310px' }}
              className="bg-white p-3.5 rounded shadow-md border border-slate-300 font-mono text-[11px] text-slate-900 space-y-2 select-none"
            >
              <div className="text-center">
                <div className="font-extrabold text-sm uppercase leading-tight">{clinicName}</div>
                <div className="text-[10px] text-slate-600 font-sans mt-0.5">{clinicSubtitle}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">{clinicAddress}</div>
                <div className="text-[9px] text-slate-600 font-bold">Hotline: {hotline}</div>
              </div>

              <div className="border border-black py-0.5 text-center font-bold text-[10px] tracking-wider my-1 bg-slate-50">
                MONEY RECEIPT (ক্যাশ মেমো)
              </div>

              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-bold">{receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{payment.date || new Date().toISOString().split('T')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reg. No:</span>
                  <span className="font-bold text-blue-900">{payment.regNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold">{payment.name}</span>
                </div>
                {payment.mobile && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mobile:</span>
                    <span>{payment.mobile}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Doctor:</span>
                  <span className="font-semibold">{docName}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 my-1.5"></div>

              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Particulars:</span>
                  <span className="font-bold text-right truncate max-w-[170px]">{payment.particulars || 'Treatment Fee'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span>{payment.method || 'Cash'} {payment.note ? `(${payment.note})` : ''}</span>
                </div>
              </div>

              <div className="border-t-2 border-black my-1.5"></div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Bill:</span>
                  <span className="font-semibold">৳ {totalBill.toLocaleString()}</span>
                </div>
                <div className="flex justify-between bg-emerald-50 border-y border-emerald-300 py-1 font-bold text-emerald-950 text-sm">
                  <span>PAID TODAY:</span>
                  <span>৳ {paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-700 font-semibold pt-0.5">
                  <span>Due Balance:</span>
                  <span className={dueAmount > 0 ? 'text-red-600' : 'text-slate-700'}>৳ {dueAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 my-1.5"></div>

              <div className="text-[9px] text-slate-700 leading-tight">
                <strong>কথায়:</strong> {inWords}
              </div>

              <div className="flex justify-between pt-4 text-[9px] text-slate-500">
                <span className="border-t border-dotted border-slate-400 pt-0.5">রোগীর স্বাক্ষর</span>
                <span className="border-t border-dotted border-slate-400 pt-0.5">ক্যাশিয়ার: {payment.addedBy || 'Cashier'}</span>
              </div>

              <div className="text-center text-[8px] text-slate-400 pt-2 border-t border-slate-200">
                সুস্থ দাঁত, সুন্দর হাসি — ধন্যবাদ!
              </div>
            </div>
          ) : (
            /* A4 INVOICE PREVIEW */
            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-300 max-w-xl w-full text-xs text-slate-800 space-y-4">
              <div className="flex justify-between items-start border-b-2 border-blue-600 pb-3">
                <div>
                  <h1 className="text-base font-black text-blue-900 uppercase tracking-tight">{clinicName}</h1>
                  <p className="text-xs text-slate-600 font-medium">{clinicSubtitle}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{clinicAddress} | মোবা: {hotline}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-blue-700 text-white font-bold px-2.5 py-1 rounded text-[11px] uppercase">
                    Money Receipt
                  </span>
                  <p className="text-[10px] font-mono text-slate-500 mt-1"><strong>ID:</strong> {receiptNo}</p>
                  <p className="text-[10px] text-slate-500"><strong>Date:</strong> {payment.date}</p>
                </div>
              </div>

              {/* Patient and Doctor Details */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px]">
                <div>
                  <div className="flex"><span className="w-20 text-slate-500">রোগীর নাম:</span><span className="font-bold text-slate-900">{payment.name}</span></div>
                  <div className="flex"><span className="w-20 text-slate-500">রেজি নং:</span><span className="font-mono font-bold text-blue-900">{payment.regNo}</span></div>
                  <div className="flex"><span className="w-20 text-slate-500">মোবাইল:</span><span className="font-mono">{payment.mobile || '-'}</span></div>
                </div>
                <div>
                  <div className="flex"><span className="w-20 text-slate-500">ডাক্তার:</span><span className="font-bold text-slate-900">{docName}</span></div>
                  <div className="flex"><span className="w-20 text-slate-500">পেমেন্ট টাইপ:</span><span className="font-semibold">{payment.method || 'Cash'}</span></div>
                  <div className="flex"><span className="w-20 text-slate-500">নোট/TrxID:</span><span className="font-medium text-slate-700">{payment.note || '-'}</span></div>
                </div>
              </div>

              {/* Breakdown Table */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-sky-50 text-blue-950 border-b border-sky-200">
                    <th className="p-2 w-10 text-center">#</th>
                    <th className="p-2">বিবরণ / Particulars</th>
                    <th className="p-2 w-28 text-right">টাকা (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2 text-center text-slate-400">1</td>
                    <td className="p-2 font-medium">{payment.particulars || 'ডেন্টাল ট্রিটমেন্ট ফি'}</td>
                    <td className="p-2 text-right font-bold">৳ {totalBill.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {/* Summary Bottom */}
              <div className="grid grid-cols-2 gap-4 items-start pt-2">
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-700 space-y-1">
                  <div><strong>কথায়:</strong> {inWords}</div>
                  <div className="text-[10px] text-slate-500 pt-1">রসিদ প্রস্তুতকারী: {payment.addedBy || 'Cashier'}</div>
                </div>

                <div className="bg-slate-50 border border-slate-300 rounded overflow-hidden text-xs">
                  <div className="flex justify-between p-1.5 border-b border-slate-200">
                    <span className="text-slate-600">মোট বিল:</span>
                    <span className="font-bold">৳ {totalBill.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-1.5 bg-emerald-100 text-emerald-950 font-bold border-b border-emerald-200">
                    <span>আজকের জমা (Paid):</span>
                    <span className="text-sm">৳ {paidAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-1.5">
                    <span className="text-slate-600">অবশিষ্ট বকেয়া (Due):</span>
                    <span className={`font-bold ${dueAmount > 0 ? 'text-red-600' : 'text-emerald-700'}`}>৳ {dueAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-8 text-[11px] text-slate-600">
                <div className="border-t border-slate-400 pt-1 w-36 text-center">ক্যাশিয়ারের স্বাক্ষর</div>
                <div className="border-t border-slate-400 pt-1 w-36 text-center">কর্তৃপক্ষের স্বাক্ষর</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>পেমেন্ট ট্রানজ্যাকশন ডাটাবেজে সফলভাবে সংরক্ষিত হয়েছে।</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition"
            >
              বন্ধ করুন (Close)
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded font-bold shadow transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>রসিদ প্রিন্ট করুন ({printFormat === 'thermal' ? `Thermal ${thermalWidth}` : 'A4'})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
