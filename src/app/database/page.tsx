'use client';

import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, HardDrive, Cloud, CheckCircle, Wifi, Download, Upload, Server } from 'lucide-react';
import { db } from '@/lib/db';
import { syncEngine, type SyncStatus } from '@/lib/syncEngine';

export default function DatabasePage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncUrl, setSyncUrl] = useState<string>('http://localhost:5000/api/sync');
  const [apiKey, setApiKey] = useState<string>('DENTIST_SECRET_KEY_2026');
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // Local Counts
  const [patientCount, setPatientCount] = useState<number>(0);
  const [prescriptionCount, setPrescriptionCount] = useState<number>(0);
  const [drugCount, setDrugCount] = useState<number>(0);
  const [appointmentCount, setAppointmentCount] = useState<number>(0);
  const [paymentCount, setPaymentCount] = useState<number>(0);
  const [materialCount, setMaterialCount] = useState<number>(0);

  useEffect(() => {
    const unsub = syncEngine.subscribe((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });

    loadStats();
    return () => unsub();
  }, []);

  const loadStats = async () => {
    const s = await db.settings.get('default_settings');
    if (s) {
      setSyncUrl(s.cloudSyncUrl || 'http://localhost:5000/api/sync');
      setApiKey(s.cloudSyncApiKey || 'DENTIST_SECRET_KEY_2026');
    }

    setPatientCount(await db.patients.count());
    setPrescriptionCount(await db.prescriptions.count());
    setDrugCount(await db.drugs.count());
    setAppointmentCount(await db.appointments.count());
    setPaymentCount(await db.payments.count());
    setMaterialCount(await db.materials.count());
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncLogs((prev) => [`[${new Date().toLocaleTimeString()}] Initiating bi-directional sync with MongoDB...`, ...prev]);

    const result = await syncEngine.triggerSync();
    setIsSyncing(false);

    setSyncLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${result.message}`, ...prev]);
    loadStats();
  };

  const handleExportBackup = async () => {
    const backupData = {
      patients: await db.patients.toArray(),
      prescriptions: await db.prescriptions.toArray(),
      drugs: await db.drugs.toArray(),
      templates: await db.templates.toArray(),
      appointments: await db.appointments.toArray(),
      payments: await db.payments.toArray(),
      expenses: await db.expenses.toArray(),
      materials: await db.materials.toArray(),
      settings: await db.settings.toArray(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DentistPRO_Offline_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="p-3 max-w-[1550px] mx-auto text-slate-800">
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h1 className="text-base font-bold text-blue-950">
              Offline Database & Cloud MongoDB Sync Manager
            </h1>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleExportBackup}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center space-x-1 border border-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Local Backup (JSON)</span>
            </button>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center space-x-1 shadow disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync with Cloud Now</span>
            </button>
          </div>
        </div>

        {/* Database Storage Architecture Overview */}
        <div className="grid grid-cols-12 gap-3 mb-4 text-xs">
          {/* Local Storage Card */}
          <div className="col-span-12 md:col-span-6 bg-sky-50 border border-sky-200 rounded p-4 space-y-3">
            <div className="flex items-center space-x-2 font-bold text-blue-900 text-sm pb-1 border-b border-sky-200">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>Local Desktop Storage (Offline PC Database)</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 text-[11px]">Patients</span>
                <div className="text-lg font-bold text-blue-900">{patientCount}</div>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 text-[11px]">Prescriptions</span>
                <div className="text-lg font-bold text-blue-900">{prescriptionCount}</div>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 text-[11px]">Drug DB</span>
                <div className="text-lg font-bold text-blue-900">{drugCount}</div>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 text-[11px]">Appointments</span>
                <div className="text-lg font-bold text-blue-900">{appointmentCount}</div>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 text-[11px]">Payments</span>
                <div className="text-lg font-bold text-blue-900">{paymentCount}</div>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 text-[11px]">Materials</span>
                <div className="text-lg font-bold text-blue-900">{materialCount}</div>
              </div>
            </div>
          </div>

          {/* Cloud Sync Status Card */}
          <div className="col-span-12 md:col-span-6 bg-slate-50 border border-slate-200 rounded p-4 space-y-3">
            <div className="flex items-center justify-between font-bold text-slate-900 text-sm pb-1 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Cloud className="w-4 h-4 text-sky-600" />
                <span>Central Cloud Sync Status</span>
              </div>
              <span
                className={`text-xs px-2.5 py-0.5 rounded font-bold ${
                  syncStatus === 'online'
                    ? 'bg-emerald-100 text-emerald-800'
                    : syncStatus === 'syncing'
                    ? 'bg-amber-100 text-amber-800 animate-pulse'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {syncStatus === 'online' ? 'LIVE CONNECTED' : syncStatus === 'syncing' ? 'SYNCING' : 'OFFLINE MODE'}
              </span>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Pending Local Mutations in Queue:</span>
                <span className="font-bold font-mono text-blue-900">{pendingCount} Records</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Sync Strategy:</span>
                <span className="font-bold text-slate-800">Queue-based Bi-directional with LWW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Target Cloud DB:</span>
                <span className="font-mono font-bold text-emerald-800">MongoDB Atlas Central</span>
              </div>
            </div>
          </div>
        </div>

        {/* Server & API Settings */}
        <div className="bg-sky-50 border border-sky-200 rounded p-4 mb-4 text-xs">
          <h3 className="font-bold text-blue-900 text-sm mb-3 flex items-center space-x-2">
            <Server className="w-4 h-4 text-blue-600" />
            <span>Cloud Sync Endpoint & API Configuration</span>
          </h3>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-8">
              <label className="block text-slate-600 font-semibold mb-1">
                Node.js Central Backend Sync URL
              </label>
              <input
                type="text"
                value={syncUrl}
                onChange={(e) => setSyncUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <label className="block text-slate-600 font-semibold mb-1">Clinic Sync API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Sync Console Logs */}
        <div className="bg-slate-950 text-slate-200 p-3 rounded font-mono text-[11px] h-40 overflow-y-auto">
          <div className="text-emerald-400 font-bold mb-1">[Sync Daemon Console]</div>
          {syncLogs.length === 0 ? (
            <div className="text-slate-500">No recent sync events. Background daemon is listening...</div>
          ) : (
            syncLogs.map((log, i) => <div key={i}>{log}</div>)
          )}
        </div>
      </div>
    </div>
  );
}

