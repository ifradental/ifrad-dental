'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Send, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  Trash2,
  UserCheck
} from 'lucide-react';
import { db, type Appointment, type Patient } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';

export default function AppointmentPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [viewFilter, setViewFilter] = useState<'today' | 'all' | 'upcoming'>('today');
  const [searchRegNo, setSearchRegNo] = useState<string>('');

  // Form State
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [sex, setSex] = useState<string>('M');
  const [mobile, setMobile] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('10:00 AM');
  const [paid, setPaid] = useState<number>(500);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    const list = await db.appointments.reverse().toArray();
    setAppointments(list);
  };

  const handleLookupPatient = async () => {
    if (!searchRegNo) return;
    const p = await db.patients.where('regNo').equals(Number(searchRegNo)).first();
    if (p) {
      setName(p.name);
      setAge(p.age);
      setSex(p.sex);
      setMobile(p.mobile);
      setAddress(p.address);
    } else {
      alert(`No patient found with Reg No #${searchRegNo}`);
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const nextSerial = appointments.filter((a) => a.date === date).length + 1;
    const apntItem: Appointment = {
      id: `apnt_${Date.now()}`,
      regNo: searchRegNo ? Number(searchRegNo) : undefined,
      name,
      age,
      sex,
      mobile,
      address,
      date,
      time,
      paid: Number(paid) || 0,
      status: 'Scheduled',
      serial: nextSerial,
      apntNo: `AP-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };

    await db.appointments.put(apntItem);
    await syncEngine.logMutation('appointments', 'INSERT', apntItem.id, apntItem);

    // Reset Form
    setName('');
    setAge('');
    setMobile('');
    setAddress('');
    setSearchRegNo('');
    loadAppointments();
    alert('অ্যাপয়েন্টমেন্ট সফলভাবে যোগ করা হয়েছে!');
  };

  const handleStatusChange = async (id: string, newStatus: Appointment['status']) => {
    await db.appointments.update(id, { status: newStatus });
    const updated = await db.appointments.get(id);
    if (updated) {
      await syncEngine.logMutation('appointments', 'UPDATE', id, updated);
    }
    loadAppointments();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this appointment record?')) {
      await db.appointments.delete(id);
      await syncEngine.logMutation('appointments', 'DELETE', id, { id });
      loadAppointments();
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const filteredAppointments = appointments.filter((a) => {
    if (viewFilter === 'today') return a.date === todayStr;
    if (viewFilter === 'upcoming') return a.date >= todayStr;
    return true;
  });

  return (
    <div className="p-3 max-w-[1550px] mx-auto text-slate-800">
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4">
        {/* Top Header Matching appointment page.png */}
        <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-200 gap-2">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <h1 className="text-base font-bold text-blue-950">Appointment & Serial Management</h1>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => syncEngine.triggerSync()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center space-x-1 shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Cloud SYNC</span>
            </button>
            <button
              onClick={() => alert('Sending SMS reminders to all scheduled patients for today...')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium flex items-center space-x-1 shadow"
            >
              <Send className="w-3.5 h-3.5" />
              <span>SYNC for SMS</span>
            </button>
          </div>
        </div>

        {/* Appointment Entry Form (Matching appointment page.png) */}
        <form onSubmit={handleAddAppointment} className="bg-sky-50 border border-sky-200 rounded p-3 mb-4 text-xs">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-slate-700">Search Reg No:</span>
              <input
                type="number"
                value={searchRegNo}
                onChange={(e) => setSearchRegNo(e.target.value)}
                onBlur={handleLookupPatient}
                placeholder="4200"
                className="w-20 px-2 py-1 border border-slate-300 rounded bg-white font-bold"
              />
              <button
                type="button"
                onClick={handleLookupPatient}
                className="px-2 py-1 bg-sky-600 text-white rounded font-medium"
              >
                Find
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 md:col-span-3">
              <label className="block text-slate-600 font-medium mb-0.5">Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Patient Full Name"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white font-medium"
              />
            </div>

            <div className="col-span-6 md:col-span-1">
              <label className="block text-slate-600 font-medium mb-0.5">Age</label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-center"
              />
            </div>

            <div className="col-span-6 md:col-span-1">
              <label className="block text-slate-600 font-medium mb-0.5">Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full px-1.5 py-1 border border-slate-300 rounded bg-white"
              >
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>

            <div className="col-span-12 md:col-span-2">
              <label className="block text-slate-600 font-medium mb-0.5">Mobile *</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
            </div>

            <div className="col-span-12 md:col-span-2">
              <label className="block text-slate-600 font-medium mb-0.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
              />
            </div>

            <div className="col-span-6 md:col-span-1">
              <label className="block text-slate-600 font-medium mb-0.5">Time</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="10:00 AM"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-center"
              />
            </div>

            <div className="col-span-6 md:col-span-1">
              <label className="block text-slate-600 font-medium mb-0.5">Paid (TK)</label>
              <input
                type="number"
                value={paid}
                onChange={(e) => setPaid(Number(e.target.value))}
                placeholder="500"
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-right font-semibold"
              />
            </div>

            <div className="col-span-12 md:col-span-1 flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold shadow text-xs"
              >
                Add
              </button>
            </div>
          </div>
        </form>

        {/* View Filter Buttons Matching appointment page.png */}
        <div className="flex space-x-1.5 mb-3 text-xs">
          <button
            onClick={() => setViewFilter('today')}
            className={`px-3.5 py-1.5 rounded font-bold ${
              viewFilter === 'today' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Show Today's ({appointments.filter((a) => a.date === todayStr).length})
          </button>
          <button
            onClick={() => setViewFilter('upcoming')}
            className={`px-3.5 py-1.5 rounded font-bold ${
              viewFilter === 'upcoming' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setViewFilter('all')}
            className={`px-3.5 py-1.5 rounded font-bold ${
              viewFilter === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Show All ({appointments.length})
          </button>
        </div>

        {/* Appointment Grid Table */}
        <div className="overflow-x-auto border border-slate-200 rounded text-xs">
          <table className="w-full text-left">
            <thead className="bg-sky-50 text-slate-700 border-b border-slate-200 font-semibold">
              <tr>
                <th className="p-2 w-10 text-center">Serial</th>
                <th className="p-2 w-24">Date</th>
                <th className="p-2 w-20">Time</th>
                <th className="p-2 w-20">Reg. No</th>
                <th className="p-2">Name</th>
                <th className="p-2 w-28">Mobile</th>
                <th className="p-2 w-20 text-right">Paid (TK)</th>
                <th className="p-2 w-28 text-center">Status</th>
                <th className="p-2 w-24 text-center">Option</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppointments.map((apnt) => (
                <tr key={apnt.id} className="hover:bg-sky-50/40">
                  <td className="p-2 text-center font-bold font-mono text-blue-900">{apnt.serial}</td>
                  <td className="p-2 font-medium">{apnt.date}</td>
                  <td className="p-2 text-slate-600">{apnt.time}</td>
                  <td className="p-2 font-mono font-bold text-slate-700">{apnt.regNo || '-'}</td>
                  <td className="p-2 font-bold text-blue-950">{apnt.name}</td>
                  <td className="p-2 font-mono text-slate-600">{apnt.mobile}</td>
                  <td className="p-2 text-right font-bold text-emerald-700">৳ {apnt.paid}</td>
                  <td className="p-2 text-center">
                    <select
                      value={apnt.status}
                      onChange={(e: any) => handleStatusChange(apnt.id, e.target.value)}
                      className={`px-1.5 py-0.5 rounded font-bold text-[11px] border ${
                        apnt.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : apnt.status === 'Waiting'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Waiting">Waiting</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => handleDelete(apnt.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

