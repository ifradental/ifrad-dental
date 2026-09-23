'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Edit3, 
  DollarSign, 
  FileText, 
  Send, 
  Calendar,
  Activity
} from 'lucide-react';
import { db, type Prescription, type Patient } from '@/lib/db';

function PrescriptionsContent() {
  const searchParams = useSearchParams();
  const regNoParam = searchParams.get('regNo');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>(regNoParam || '');
  const [clinicSettings, setClinicSettings] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      const allRx = await db.prescriptions.reverse().toArray();
      setPrescriptions(allRx);

      if (regNoParam) {
        const foundIdx = allRx.findIndex((r) => r.regNo?.toString() === regNoParam);
        if (foundIdx !== -1) {
          setSelectedIndex(foundIdx);
        }
      }

      const settings = await db.settings.get('default_settings');
      setClinicSettings(settings);
    }
    loadData();
  }, [regNoParam]);

  const filteredPrescriptions = prescriptions.filter(
    (rx) =>
      rx.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.regNo?.toString().includes(searchQuery) ||
      rx.mobile?.includes(searchQuery)
  );

  const currentRx = filteredPrescriptions[selectedIndex] || filteredPrescriptions[0];

  return (
    <div className="p-3 max-w-[1550px] mx-auto text-slate-800">
      <div className="grid grid-cols-12 gap-3">
        {/* LEFT PATIENT & HISTORY LIST SIDEBAR */}
        <div className="col-span-12 md:col-span-4 bg-white rounded-lg border border-slate-300 p-3 shadow-sm flex flex-col h-[820px]">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
            <h2 className="font-bold text-sm text-blue-900">Patient EMR Records</h2>
            <span className="text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-medium">
              {filteredPrescriptions.length} Records
            </span>
          </div>

          {/* Search Box */}
          <div className="relative my-2">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Reg No, Name, Mobile..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Patient History List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
            {filteredPrescriptions.map((rx, idx) => (
              <div
                key={rx.id}
                onClick={() => setSelectedIndex(idx)}
                className={`p-2.5 cursor-pointer transition rounded my-0.5 ${
                  selectedIndex === idx
                    ? 'bg-sky-100/90 border-l-4 border-blue-600 font-semibold'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-blue-950 text-[13px]">{rx.patientName}</span>
                  <span className="bg-emerald-100 text-emerald-800 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                    Reg #{rx.regNo}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>{rx.date} (Visit #{rx.visitNo})</span>
                  <span>{rx.mobile || 'No Mobile'}</span>
                </div>
                {rx.dx && rx.dx.length > 0 && (
                  <div className="text-[10px] text-blue-800 mt-1 truncate">
                    Dx: {rx.dx.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Action Buttons (Matching EMR Screenshot) */}
          <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-1.5 text-xs">
            <Link
              href="/prescription"
              className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-center font-medium flex items-center justify-center space-x-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>New Prescription</span>
            </Link>
            <button
              onClick={() => alert('Sending SMS reminder to patient...')}
              className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-center font-medium flex items-center justify-center space-x-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send SMS</span>
            </button>
          </div>
        </div>

        {/* RIGHT FULL EMR & PRESCRIPTION SHEET VIEWER (Matching emr.png) */}
        <div className="col-span-12 md:col-span-8 bg-white rounded-lg border border-slate-300 p-5 shadow-sm h-[820px] overflow-y-auto">
          {currentRx ? (
            <div className="space-y-4">
              {/* Pagination / Record Navigation Header */}
              <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-700 text-sm">
                    Prescription: {selectedIndex + 1} / {filteredPrescriptions.length}
                  </span>
                  <div className="flex space-x-1">
                    <button
                      disabled={selectedIndex === 0}
                      onClick={() => setSelectedIndex((prev) => Math.max(0, prev - 1))}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded text-xs font-semibold flex items-center"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <button
                      disabled={selectedIndex >= filteredPrescriptions.length - 1}
                      onClick={() => setSelectedIndex((prev) => Math.min(filteredPrescriptions.length - 1, prev + 1))}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded text-xs font-semibold flex items-center"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center space-x-1 shadow"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Prescription</span>
                  </button>
                </div>
              </div>

              {/* Printable Letterhead & Medical Record Preview */}
              <div className="p-4 border border-slate-200 rounded font-serif bg-white relative min-h-[680px]">
                {/* Clinic Header */}
                {clinicSettings && (
                  <div className="text-center border-b-2 border-slate-800 pb-3 mb-3">
                    <h1 className="text-2xl font-bold font-sans text-slate-900">
                      {clinicSettings.clinicName}
                    </h1>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-sans mt-2 divide-x divide-slate-300">
                      <div>
                        <div className="font-bold text-blue-950">{clinicSettings.doctor1.name}</div>
                        <div className="text-[11px] text-slate-600">{clinicSettings.doctor1.degrees}</div>
                        <div className="text-[10px] text-slate-500">{clinicSettings.doctor1.designation}</div>
                        <div className="text-[10px] text-slate-500">বিএমডিসি নং- {clinicSettings.doctor1.bmdcReg}</div>
                      </div>
                      <div>
                        <div className="font-bold text-blue-950">{clinicSettings.doctor2.name}</div>
                        <div className="text-[11px] text-slate-600">{clinicSettings.doctor2.degrees}</div>
                        <div className="text-[10px] text-slate-500">{clinicSettings.doctor2.designation}</div>
                        <div className="text-[10px] text-slate-500">বিএমডিসি নং- {clinicSettings.doctor2.bmdcReg}</div>
                      </div>
                      <div>
                        <div className="font-bold text-blue-950">{clinicSettings.doctor3.name}</div>
                        <div className="text-[11px] text-slate-600">{clinicSettings.doctor3.degrees}</div>
                        <div className="text-[10px] text-slate-500">{clinicSettings.doctor3.designation}</div>
                        <div className="text-[10px] text-slate-500">বিএমডিসি নং- {clinicSettings.doctor3.bmdcReg}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Patient Banner */}
                <div className="border-b border-slate-300 pb-2 mb-3 text-xs font-sans">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <span className="font-semibold text-slate-600">Name:</span>{' '}
                      <span className="font-bold text-slate-900">{currentRx.patientName}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-semibold text-slate-600">Age:</span>{' '}
                      <span>{currentRx.age}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-semibold text-slate-600">Sex:</span>{' '}
                      <span>{currentRx.sex}</span>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="font-semibold text-slate-600">Date:</span>{' '}
                      <span className="font-bold">{currentRx.date}</span>
                    </div>
                    <div className="col-span-5">
                      <span className="font-semibold text-slate-600">Address:</span>{' '}
                      <span>{currentRx.address || 'Dhaka'}</span>
                    </div>
                    <div className="col-span-4">
                      <span className="font-semibold text-slate-600">Reg No:</span>{' '}
                      <span className="font-bold font-mono text-blue-900">{currentRx.regNo}</span>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="font-semibold text-slate-600">Mobile:</span>{' '}
                      <span>{currentRx.mobile}</span>
                    </div>
                  </div>
                </div>

                {/* Content Body */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Left Column */}
                  <div className="col-span-4 border-r border-slate-200 pr-3 space-y-2 text-xs font-sans">
                    <div className="font-bold text-slate-900">Visit No: {currentRx.visitNo}</div>

                    {currentRx.cc && currentRx.cc.length > 0 && (
                      <div>
                        <div className="font-bold text-blue-900">C/C:</div>
                        <ul className="list-disc list-inside text-slate-700">
                          {currentRx.cc.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentRx.dx && currentRx.dx.length > 0 && (
                      <div>
                        <div className="font-bold text-blue-900">DX:</div>
                        <div className="text-slate-800 font-semibold">{currentRx.dx.join(', ')}</div>
                      </div>
                    )}

                    {currentRx.treatmentPlan && currentRx.treatmentPlan.length > 0 && (
                      <div>
                        <div className="font-bold text-blue-900">Treatment Plan:</div>
                        <ul className="list-disc list-inside text-slate-700 text-[11px]">
                          {currentRx.treatmentPlan.map((tp, i) => (
                            <li key={i}>{tp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentRx.treatmentDone && currentRx.treatmentDone.length > 0 && (
                      <div>
                        <div className="font-bold text-blue-900">Treatment Done:</div>
                        <ul className="list-disc list-inside text-slate-700 text-[11px]">
                          {currentRx.treatmentDone.map((td, i) => (
                            <li key={i}>{td}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right Column Rx */}
                  <div className="col-span-8 space-y-3">
                    <div className="font-serif italic font-bold text-2xl text-slate-900 pb-1 border-b border-slate-200">
                      Rx.
                    </div>
                    <div className="space-y-2 font-sans text-xs">
                      {currentRx.medicines?.map((m, idx) => (
                        <div key={idx} className="pb-1 border-b border-slate-100">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>{idx + 1}. {m.brand}</span>
                            <span>{m.duration}</span>
                          </div>
                          <div className="text-slate-600 pl-3">
                            {m.dose} {m.instruction && `- ${m.instruction}`}
                          </div>
                        </div>
                      ))}
                    </div>

                    {currentRx.advice && currentRx.advice.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 font-sans text-xs">
                        <div className="font-bold text-slate-800 mb-1">উপদেশঃ</div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                          {currentRx.advice.map((adv, i) => (
                            <li key={i}>{adv}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <FileText className="w-12 h-12 mb-2 stroke-1" />
              <p>No prescription selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ViewAllPrescriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm font-semibold text-slate-600">
          ইএমআর রেকর্ড লোড হচ্ছে...
        </div>
      }
    >
      <PrescriptionsContent />
    </Suspense>
  );
}

