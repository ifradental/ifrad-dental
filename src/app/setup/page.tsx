'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Printer, Sliders } from 'lucide-react';
import { db, type ClinicSettings } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';

export default function SetupPage() {
  const [activeTab, setActiveTab] = useState<'print' | 'options'>('print');
  const [settings, setSettings] = useState<any>(null);

  // Print Margins & Setup Form State (Matching print setup page.png)
  const [headerHeightCm, setHeaderHeightCm] = useState<number>(5.6);
  const [leftSideWidthCm, setLeftSideWidthCm] = useState<number>(8.0);
  const [rightSideWidthCm, setRightSideWidthCm] = useState<number>(10.0);
  const [prescriptionFontSizePt, setPrescriptionFontSizePt] = useState<number>(11);
  const [rxFontSizePt, setRxFontSizePt] = useState<number>(18);
  const [banglaFontSizePt, setBanglaFontSizePt] = useState<number>(10.5);
  const [adviceFontSizePt, setAdviceFontSizePt] = useState<number>(9.5);
  const [displayBarcode, setDisplayBarcode] = useState<boolean>(true);
  const [displayVisitNo, setDisplayVisitNo] = useState<boolean>(true);
  const [displayFooter, setDisplayFooter] = useState<boolean>(true);

  // Clinic Options State (Matching option page].png)
  const [visitFee, setVisitFee] = useState<number>(500);
  const [revisitFee, setRevisitFee] = useState<number>(400);
  const [revisitValidityDays, setRevisitValidityDays] = useState<number>(60);
  const [lastRegNo, setLastRegNo] = useState<number>(4200);

  useEffect(() => {
    async function load() {
      const s = await db.settings.get('default_settings');
      if (s) {
        setSettings(s);
        setVisitFee(s.visitFee || 500);
        setRevisitFee(s.revisitFee || 400);
        setRevisitValidityDays(s.revisitValidityDays || 60);
        setLastRegNo(s.lastRegNo || 4200);
        if (s.printSettings) {
          setHeaderHeightCm(s.printSettings.headerHeightCm || 5.6);
          setLeftSideWidthCm(s.printSettings.leftSideWidthCm || 8.0);
          setRightSideWidthCm(s.printSettings.rightSideWidthCm || 10.0);
          setPrescriptionFontSizePt(s.printSettings.prescriptionFontSizePt || 11);
          setRxFontSizePt(s.printSettings.rxFontSizePt || 18);
          setBanglaFontSizePt(s.printSettings.banglaFontSizePt || 10.5);
          setAdviceFontSizePt(s.printSettings.adviceFontSizePt || 9.5);
          setDisplayBarcode(s.printSettings.displayBarcode ?? true);
          setDisplayVisitNo(s.printSettings.displayVisitNo ?? true);
          setDisplayFooter(s.printSettings.displayFooter ?? true);
        }
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ClinicSettings = {
      ...(settings || ({} as any)),
      id: 'default_settings',
      visitFee: Number(visitFee),
      revisitFee: Number(revisitFee),
      revisitValidityDays: Number(revisitValidityDays),
      lastRegNo: Number(lastRegNo),
      printSettings: {
        headerHeightCm: Number(headerHeightCm),
        leftSideWidthCm: Number(leftSideWidthCm),
        rightSideWidthCm: Number(rightSideWidthCm),
        prescriptionFontSizePt: Number(prescriptionFontSizePt),
        lineGapPt: 5,
        rxFontSizePt: Number(rxFontSizePt),
        banglaFontSizePt: Number(banglaFontSizePt),
        adviceFontSizePt: Number(adviceFontSizePt),
        headerType: 'Image Header',
        previewHeader: 'With Header',
        displayFooter,
        footerHeightCm: 2.0,
        displayBarcode,
        displayVisitNo,
        displayGenericName: false,
        displaySignature: true,
        displayRx: true,
        ptInfoFontSizePt: 12,
        ptInfoMarginTopPx: 5,
      },
    };

    await db.settings.put(updated);
    await syncEngine.logMutation('settings', 'UPDATE', 'default_settings', updated);
    alert('প্রিন্ট ও অপশন সেটিংস সফলভাবে সেভ হয়েছে!');
  };

  return (
    <div className="p-3 max-w-[1400px] mx-auto text-slate-800">
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h1 className="text-base font-bold text-blue-950">System Configuration & Print Setup</h1>
          </div>

          <div className="flex space-x-1.5 text-xs">
            <button
              onClick={() => setActiveTab('print')}
              className={`px-3.5 py-1.5 rounded font-bold ${
                activeTab === 'print' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Print Setup (Margins & Dimensions)
            </button>
            <button
              onClick={() => setActiveTab('options')}
              className={`px-3.5 py-1.5 rounded font-bold ${
                activeTab === 'options' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Fee & Reg No Options
            </button>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* TAB 1: PRINT SETUP (Matching print setup page.png) */}
          {activeTab === 'print' && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded p-4">
                <h3 className="font-bold text-sm text-blue-900 mb-3 flex items-center space-x-2">
                  <Printer className="w-4 h-4" />
                  <span>A4 / Letter Margins & Layout Calibration (cm / pt)</span>
                </h3>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-6 md:col-span-3">
                    <label className="block text-slate-700 font-semibold mb-1">
                      Header Pad Top Space (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={headerHeightCm}
                      onChange={(e) => setHeaderHeightCm(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Top margin for physical printed doctor pad</p>
                  </div>

                  <div className="col-span-6 md:col-span-3">
                    <label className="block text-slate-700 font-semibold mb-1">Left Column Width (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={leftSideWidthCm}
                      onChange={(e) => setLeftSideWidthCm(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-3">
                    <label className="block text-slate-700 font-semibold mb-1">Right Column Width (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={rightSideWidthCm}
                      onChange={(e) => setRightSideWidthCm(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-3">
                    <label className="block text-slate-700 font-semibold mb-1">Prescription Font Size (pt)</label>
                    <input
                      type="number"
                      value={prescriptionFontSizePt}
                      onChange={(e) => setPrescriptionFontSizePt(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 mt-3 pt-3 border-t border-sky-200">
                  <div className="col-span-6 md:col-span-4 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="barcode"
                      checked={displayBarcode}
                      onChange={(e) => setDisplayBarcode(e.target.checked)}
                      className="rounded text-blue-600 w-4 h-4"
                    />
                    <label htmlFor="barcode" className="font-semibold text-slate-700 cursor-pointer">
                      Display Barcode on Prescription
                    </label>
                  </div>

                  <div className="col-span-6 md:col-span-4 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="visitno"
                      checked={displayVisitNo}
                      onChange={(e) => setDisplayVisitNo(e.target.checked)}
                      className="rounded text-blue-600 w-4 h-4"
                    />
                    <label htmlFor="visitno" className="font-semibold text-slate-700 cursor-pointer">
                      Display Visit Number
                    </label>
                  </div>

                  <div className="col-span-6 md:col-span-4 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="footer"
                      checked={displayFooter}
                      onChange={(e) => setDisplayFooter(e.target.checked)}
                      className="rounded text-blue-600 w-4 h-4"
                    />
                    <label htmlFor="footer" className="font-semibold text-slate-700 cursor-pointer">
                      Display Clinic Footer
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPTIONS (Matching option page].png) */}
          {activeTab === 'options' && (
            <div className="bg-sky-50 border border-sky-200 rounded p-4 space-y-3">
              <h3 className="font-bold text-sm text-blue-900 mb-2 flex items-center space-x-2">
                <Sliders className="w-4 h-4" />
                <span>Visit Fees & Registration Setup</span>
              </h3>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6 md:col-span-3">
                  <label className="block text-slate-700 font-semibold mb-1">Standard Visit Fee (TK)</label>
                  <input
                    type="number"
                    value={visitFee}
                    onChange={(e) => setVisitFee(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold"
                  />
                </div>

                <div className="col-span-6 md:col-span-3">
                  <label className="block text-slate-700 font-semibold mb-1">Re-Visit Fee (TK)</label>
                  <input
                    type="number"
                    value={revisitFee}
                    onChange={(e) => setRevisitFee(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold"
                  />
                </div>

                <div className="col-span-6 md:col-span-3">
                  <label className="block text-slate-700 font-semibold mb-1">Re-Visit Validity (Days)</label>
                  <input
                    type="number"
                    value={revisitValidityDays}
                    onChange={(e) => setRevisitValidityDays(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>

                <div className="col-span-6 md:col-span-3">
                  <label className="block text-slate-700 font-semibold mb-1">Current Last Reg No</label>
                  <input
                    type="number"
                    value={lastRegNo}
                    onChange={(e) => setLastRegNo(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-blue-900"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold shadow text-xs flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

