'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Send, CheckCircle2, Sliders, Smartphone, ShieldAlert, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SMSPage() {
  const { user } = useAuth();
  const [patientMobile, setPatientMobile] = useState<string>('');
  const [smsText, setSmsText] = useState<string>(
    'সম্মানিত রোগী, ইফরা ডেন্টাল এ আপনার পরবর্তী অ্যাপয়েন্টমেন্ট ১০/০৯/২০২৬ সকাল ১০:০০ টায়। ধন্যবাদ।'
  );
  const [smsGateway, setSmsGateway] = useState<string>('Greenweb Bangladesh');
  const [smsApiKey, setSmsApiKey] = useState<string>('GW_BD_DEMO_KEY_9921');
  const [senderId, setSenderId] = useState<string>('IFRA DENTAL');

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin';

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-rose-200 shadow-xl max-w-md w-full p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-slate-900">
              অ্যাক্সেস সংরক্ষিত (Access Restricted)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              এসএমএস গেটওয়ে কনফিগারেশন পেজের অ্যাক্সেস শুধুমাত্র <strong className="text-blue-900">অ্যাডমিনিস্ট্রেটরের</strong> জন্য সংরক্ষিত।
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center space-x-1.5"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>ড্যাশবোর্ডে ফিরুন</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSendSMS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientMobile) return;
    alert(`SMS sent successfully to ${patientMobile} via ${smsGateway}!`);
    setPatientMobile('');
  };

  return (
    <div className="p-3 max-w-[1200px] mx-auto text-slate-800">
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4">
        {/* Top Header */}
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-200">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h1 className="text-base font-bold text-blue-950">Patient SMS Reminder & Gateway Integration</h1>
        </div>

        <div className="grid grid-cols-12 gap-4 text-xs">
          {/* Send SMS Box */}
          <div className="col-span-12 md:col-span-7 bg-sky-50 border border-sky-200 rounded p-4 space-y-3">
            <h3 className="font-bold text-sm text-blue-900 flex items-center space-x-2">
              <Smartphone className="w-4 h-4" />
              <span>Send Instant SMS to Patient</span>
            </h3>

            <form onSubmit={handleSendSMS} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Patient Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={patientMobile}
                  onChange={(e) => setPatientMobile(e.target.value)}
                  placeholder="017XXXXXXXX / 018XXXXXXXX"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Message Content (বাংলা / English)
                </label>
                <textarea
                  rows={4}
                  required
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                />
                <div className="text-[11px] text-slate-500 mt-0.5 flex justify-between">
                  <span>Characters: {smsText.length}</span>
                  <span>1 SMS Unit</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold shadow text-xs flex items-center justify-center space-x-1"
              >
                <Send className="w-4 h-4" />
                <span>Send SMS to Patient</span>
              </button>
            </form>
          </div>

          {/* SMS Gateway Settings */}
          <div className="col-span-12 md:col-span-5 bg-slate-50 border border-slate-200 rounded p-4 space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <Sliders className="w-4 h-4" />
              <span>Gateway Configuration</span>
            </h3>

            <div className="space-y-2.5">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Select Gateway</label>
                <select
                  value={smsGateway}
                  onChange={(e) => setSmsGateway(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="Greenweb Bangladesh">Greenweb Bangladesh</option>
                  <option value="ElitBuzz SMS">ElitBuzz SMS</option>
                  <option value="Banglalink / Grameenphone Direct">GP / BL Direct Masking</option>
                  <option value="Twilio Global">Twilio Global</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">API Key / Token</label>
                <input
                  type="password"
                  value={smsApiKey}
                  onChange={(e) => setSmsApiKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Masking / Sender ID</label>
                <input
                  type="text"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => alert('SMS Gateway settings saved successfully!')}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-xs"
                >
                  Save Gateway Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

