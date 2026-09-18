'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ShieldCheck, Stethoscope, UserCheck, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<'doctor' | 'staff' | 'admin'>('doctor');
  const [username, setUsername] = useState<string>('doctor');
  const [password, setPassword] = useState<string>('1234');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const success = await login(username, password, role);
      if (success) {
        router.push('/dashboard');
      } else {
        setErrorMsg('ইউজারনেম অথবা পাসওয়ার্ড সঠিক নয়! (Demo: doctor / 1234)');
      }
    } catch (err: any) {
      setErrorMsg('Login failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (userType: 'doctor' | 'admin') => {
    if (userType === 'doctor') {
      setRole('doctor');
      setUsername('doctor');
      setPassword('1234');
    } else {
      setRole('admin');
      setUsername('admin');
      setPassword('admin');
    }
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-sky-950 flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-sky-100/50 overflow-hidden">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-blue-800 via-sky-700 to-blue-900 p-6 text-white text-center relative">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg mx-auto flex items-center justify-center text-3xl mb-3 border-2 border-sky-200">
            🦷
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white font-sans">
            Dentist <span className="text-yellow-300">PRO 7.0</span>
          </h2>
          <p className="text-xs text-sky-100 mt-1">Dental Management & EMR System (Offline Desktop)</p>
        </div>

        {/* Form Container */}
        <div className="p-6">
          {/* Role Selection Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setRole('doctor');
                setUsername('doctor');
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-md transition ${
                role === 'doctor'
                  ? 'bg-blue-700 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor (ডাক্তার)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole('staff');
                setUsername('staff');
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-md transition ${
                role === 'staff'
                  ? 'bg-blue-700 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Staff / Receptionist</span>
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Username / মোবাইল নং</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. doctor"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Remember me on this PC</span>
              </label>

              <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Offline Authorized</span>
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <span>Login to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Footer */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Quick Fill:</span>
            <div className="flex space-x-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('doctor')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium border border-slate-200"
              >
                Doctor (1234)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium border border-slate-200"
              >
                Admin (admin)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
