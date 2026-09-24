'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Lock, 
  User, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Key, 
  Mail, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Send,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';

export function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  // Dynamic Clinic Branding (Loaded from db / server)
  const [clinicLogo, setClinicLogo] = useState<string>('');
  const [clinicName, setClinicName] = useState<string>('Dentist PRO 7.0');

  // Active view: 'login' or 'forgot'
  const [view, setView] = useState<'login' | 'forgot'>('login');

  // Forgot password sub-step: 1 = send code, 2 = verify code & reset password
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);

  // Login form state
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Forgot password form state
  const [resetIdentifier, setResetIdentifier] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [resetErrorMsg, setResetErrorMsg] = useState<string>('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string>('');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Load Dynamic Clinic Logo and Name from settings (local Dexie & server pull)
  useEffect(() => {
    async function loadDynamicBranding() {
      try {
        // 1. Check local Dexie settings
        const settings = await db.settings.get('default_settings');
        if (settings) {
          if (settings.logoUrl) setClinicLogo(settings.logoUrl);
          if (settings.clinicName) setClinicName(settings.clinicName);
        }

        // 2. Fetch latest settings from serverless pull (useful on fresh browsers/devices)
        try {
          const res = await fetch('/api/sync/pull?since=0');
          if (res.ok) {
            const data = await res.json();
            const serverSettings = data.updates?.settings?.[0];
            if (serverSettings) {
              if (serverSettings.logoUrl) {
                setClinicLogo(serverSettings.logoUrl);
              }
              if (serverSettings.clinicName) {
                setClinicName(serverSettings.clinicName);
              }
              await db.settings.put(serverSettings);
            }
          }
        } catch {
          // Offline, local cache is preserved
        }
      } catch (err) {
        console.warn('Failed to load dynamic branding:', err);
      }
    }

    loadDynamicBranding();
  }, []);

  // Handle standard login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('ইউজারনেম অথবা মোবাইল নম্বর লিখুন!');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('পাসওয়ার্ড লিখুন!');
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await login(username.trim(), password.trim());
      if (success) {
        router.push('/dashboard');
      } else {
        setErrorMsg('ইউজারনেম / মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Send OTP to User's Email via SMTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMsg('');
    setDevOtpHint(null);

    if (!resetIdentifier.trim()) {
      setResetErrorMsg('আপনার ইউজারনেম, মোবাইল নম্বর অথবা ইমেইল লিখুন!');
      return;
    }

    setIsSendingOtp(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: resetIdentifier.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ভেরিফিকেশন কোড পাঠাতে ব্যর্থ হয়েছে!');
      }

      setMaskedEmail(data.maskedEmail || 'নিবন্ধিত ইমেইলে');
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
      setForgotStep(2);
    } catch (err: any) {
      setResetErrorMsg(err.message || 'কোড পাঠাতে সমস্যা হয়েছে!');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Verify OTP and Reset Password in MongoDB & Dexie
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMsg('');
    setResetSuccessMsg('');

    if (!otpCode.trim()) {
      setResetErrorMsg('ইমেইলে পাঠানো ৬ ডিজিটের ভেরিফিকেশন কোডটি লিখুন!');
      return;
    }
    if (!newPassword.trim()) {
      setResetErrorMsg('নতুন পাসওয়ার্ড লিখুন!');
      return;
    }
    if (newPassword.trim().length < 4) {
      setResetErrorMsg('পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetErrorMsg('নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না!');
      return;
    }

    setIsResetting(true);

    try {
      const cleanId = resetIdentifier.trim();
      const cleanOtp = otpCode.trim();

      // 1. Call serverless API to verify OTP and update MongoDB Atlas
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          verificationCode: cleanOtp,
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে!');
      }

      // 2. Also update local Dexie DB for offline synchronization
      try {
        const idLower = cleanId.toLowerCase();
        const rawMobile = cleanId.replace(/[-\s]/g, '');
        const allEmployees = await db.employees.toArray();
        let matchedEmp = allEmployees.find((emp) => {
          const u = (emp.username || '').trim().toLowerCase();
          const m = (emp.mobile || '').trim().replace(/[-\s]/g, '');
          const em = (emp.email || '').trim().toLowerCase();
          return u === idLower || m === rawMobile || em === idLower || emp.id === cleanId;
        });

        if (!matchedEmp && (idLower === 'admin' || idLower === '01800000000')) {
          matchedEmp = await db.employees.get('emp_admin');
        }

        if (matchedEmp) {
          const updated = {
            ...matchedEmp,
            password: newPassword.trim(),
            updatedAt: new Date().toISOString(),
          };
          await db.employees.put(updated);
          await syncEngine.logMutation('employees', 'UPDATE', matchedEmp.id, updated);
          syncEngine.triggerSync().catch(console.warn);
        }
      } catch (dexieErr) {
        console.warn('Local DB update notice:', dexieErr);
      }

      // Success Confirmation
      setResetSuccessMsg('আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
      setUsername(cleanId);
      setPassword('');

      // Auto redirect back to login after 2.5s
      setTimeout(() => {
        setView('login');
        setForgotStep(1);
        setResetSuccessMsg('');
        setResetIdentifier('');
        setOtpCode('');
        setNewPassword('');
        setConfirmPassword('');
        setDevOtpHint(null);
      }, 2500);
    } catch (err: any) {
      setResetErrorMsg(err.message || 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে!');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-sky-950 flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-sky-100/50 overflow-hidden">
        {/* Dynamic Top Header Card with Admin Logo */}
        <div className="bg-gradient-to-r from-blue-800 via-sky-700 to-blue-900 p-6 text-white text-center relative">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-xl mx-auto flex items-center justify-center p-2 mb-3 border-2 border-sky-200 overflow-hidden relative">
            {clinicLogo ? (
              <img
                src={clinicLogo}
                alt={clinicName || 'Clinic Logo'}
                className="w-full h-full object-contain rounded-xl"
              />
            ) : (
              <span className="text-4xl">{view === 'forgot' ? '🔑' : '🦷'}</span>
            )}
          </div>
          <h2 className="text-xl font-black tracking-tight text-white font-sans max-w-sm mx-auto leading-snug">
            {clinicName || 'Dentist PRO 7.0'}
          </h2>
          <p className="text-xs text-sky-100 mt-1">
            {view === 'forgot'
              ? 'ইমেইল ভেরিফিকেশন ও পাসওয়ার্ড রিসেট'
              : 'Dental Management & EMR System (Dentist PRO 7.0)'}
          </p>
        </div>

        {/* VIEW 1: LOGIN FORM */}
        {view === 'login' && (
          <div className="p-6">
            {errorMsg && (
              <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Username অথবা মোবাইল নম্বর (Mobile No.) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. username অথবা 018XXXXXXXX"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Password (পাসওয়ার্ড) <span className="text-red-500">*</span>
                </label>
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
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-blue-600 cursor-pointer"
                  />
                  <span>Remember me on this PC</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setResetErrorMsg('');
                    setResetSuccessMsg('');
                    setResetIdentifier(username);
                    setForgotStep(1);
                    setView('forgot');
                  }}
                  className="text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer transition"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer mt-2"
              >
                <span>{isSubmitting ? 'লগইন হচ্ছে...' : 'Login to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Developer Credit */}
            <div className="mt-5 pt-3 border-t border-slate-100 text-center text-[11px] text-slate-500">
              <span>Developed & Maintained By </span>
              <a
                href="https://webq.com.bd"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition inline-flex items-center gap-0.5"
              >
                WebQ LTD
              </a>
            </div>
          </div>
        )}

        {/* VIEW 2: FORGOT PASSWORD FLOW */}
        {view === 'forgot' && (
          <div className="p-6">
            {resetSuccessMsg ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  আপনার নতুন পাসওয়ার্ড MongoDB Atlas ও লোকাল মেমোরিতে সফলভাবে আপডেট হয়েছে। কিছুক্ষণের মধ্যে লগইন পেজে নিয়ে যাওয়া হচ্ছে...
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setView('login');
                      setResetSuccessMsg('');
                    }}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    এখনই লগইন করুন
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* STEP 1: SEND CODE TO EMAIL */}
                {forgotStep === 1 && (
                  <div>
                    <div className="mb-4">
                      <div className="flex items-center space-x-1.5 text-blue-700 font-bold text-xs mb-1">
                        <Mail className="w-4 h-4" />
                        <span>ধাপ ১: ইমেইল ভেরিফিকেশন কোড গ্রহণ</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        আপনার অ্যাকাউন্টের ইউজারনেম, মোবাইল নম্বর বা ইমেইল দিলে নিবন্ধিত ইমেইলে ৬ ডিজিটের ওটিপি (OTP) পাঠানো হবে।
                      </p>
                    </div>

                    {resetErrorMsg && (
                      <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium flex items-center space-x-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{resetErrorMsg}</span>
                      </div>
                    )}

                    <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          ইউজারনেম / মোবাইল নম্বর / ইমেইল <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={resetIdentifier}
                            onChange={(e) => setResetIdentifier(e.target.value)}
                            placeholder="যেমন: admin অথবা 018XXXXXXXX"
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>

                      <div className="pt-1 space-y-2">
                        <button
                          type="submit"
                          disabled={isSendingOtp}
                          className="w-full py-2.5 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white font-bold rounded-lg shadow transition flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer text-xs"
                        >
                          <Send className={`w-3.5 h-3.5 ${isSendingOtp ? 'animate-bounce' : ''}`} />
                          <span>{isSendingOtp ? 'ইমেইল পাঠানো হচ্ছে...' : 'ইমেইলে ওটিপি কোড পাঠান'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setView('login');
                            setResetErrorMsg('');
                          }}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition flex items-center justify-center space-x-1 cursor-pointer text-xs"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>লগইন পেজে ফিরে যান</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* STEP 2: ENTER OTP & NEW PASSWORD */}
                {forgotStep === 2 && (
                  <div>
                    <div className="mb-4">
                      <div className="flex items-center space-x-1.5 text-blue-700 font-bold text-xs mb-1">
                        <Key className="w-4 h-4" />
                        <span>ধাপ ২: ওটিপি যাচাই ও নতুন পাসওয়ার্ড</span>
                      </div>
                      <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 text-[11px] space-y-1">
                        <div className="flex items-center space-x-1 font-semibold">
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                          <span>কোড পাঠানো হয়েছে: <strong>{maskedEmail}</strong></span>
                        </div>
                        <p className="text-[10px] text-blue-700">
                          আপনার ইমেইল ইনবক্স অথবা স্প্যাম (Spam) ফোল্ডার চেক করে ৬ ডিজিটের কোডটি নিচে দিন।
                        </p>
                      </div>
                    </div>

                    {devOtpHint && (
                      <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center justify-between">
                        <span>টেস্টিং কোড (SMTP ছাড়া): <strong className="font-mono text-xs">{devOtpHint}</strong></span>
                        <button
                          type="button"
                          onClick={() => setOtpCode(devOtpHint)}
                          className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-bold text-[10px]"
                        >
                          কোড বসান
                        </button>
                      </div>
                    )}

                    {resetErrorMsg && (
                      <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium flex items-center space-x-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{resetErrorMsg}</span>
                      </div>
                    )}

                    <form onSubmit={handleVerifyAndReset} className="space-y-3.5 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-slate-700 font-semibold">
                            ৬ ডিজিটের ভেরিফিকেশন কোড (OTP) <span className="text-red-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={isSendingOtp}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${isSendingOtp ? 'animate-spin' : ''}`} />
                            <span>পুনরায় কোড পাঠান</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="______"
                          className="w-full text-center py-2.5 border-2 border-blue-400 rounded-lg text-slate-900 font-mono text-xl tracking-[8px] font-bold focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          নতুন পাসওয়ার্ড (New Password) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Key className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড"
                            className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            tabIndex={-1}
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          নতুন পাসওয়ার্ড নিশ্চিত করুন (Confirm Password) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>

                      <div className="pt-2 space-y-2">
                        <button
                          type="submit"
                          disabled={isResetting}
                          className="w-full py-2.5 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white font-bold rounded-lg shadow transition flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer text-xs"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>{isResetting ? 'যাচাই ও আপডেট হচ্ছে...' : 'পাসওয়ার্ড নিশ্চিত করুন'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setForgotStep(1);
                            setResetErrorMsg('');
                          }}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition flex items-center justify-center space-x-1 cursor-pointer text-xs"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>আগের ধাপে ফিরে যান</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
