'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Lock, 
  Camera, 
  Printer, 
  Sliders, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Phone, 
  Mail, 
  Edit3, 
  Building, 
  Key, 
  Cloud, 
  RefreshCw,
  X,
  FileText
} from 'lucide-react';
import { db, type ClinicSettings, type Employee } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'print' | 'options' | 'cloud'>('profile');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // 1. User Profile State (View & Edit Modes)
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    username: '',
    mobile: '',
    email: '',
    designation: '',
    avatar: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // 2. Clinic Settings State
  const [clinicName, setClinicName] = useState<string>('ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার');
  const [footerText, setFooterText] = useState<string>('ধন্যবাদ, সুস্থ দাঁত সুন্দর হাসি। প্রয়োজনে যোগাযোগ করুন।');
  const [visitFee, setVisitFee] = useState<number>(500);
  const [revisitFee, setRevisitFee] = useState<number>(400);
  const [revisitValidityDays, setRevisitValidityDays] = useState<number>(15);
  const [lastRegNo, setLastRegNo] = useState<number>(4200);

  // Print Setup
  const [headerHeightCm, setHeaderHeightCm] = useState<number>(4.5);
  const [leftSideWidthCm, setLeftSideWidthCm] = useState<number>(6.5);
  const [rightSideWidthCm, setRightSideWidthCm] = useState<number>(13.5);
  const [prescriptionFontSizePt, setPrescriptionFontSizePt] = useState<number>(10.5);
  const [displayBarcode, setDisplayBarcode] = useState<boolean>(true);
  const [displayVisitNo, setDisplayVisitNo] = useState<boolean>(true);
  const [displayFooter, setDisplayFooter] = useState<boolean>(true);
  const [displayGenericName, setDisplayGenericName] = useState<boolean>(false);
  const [displaySignature, setDisplaySignature] = useState<boolean>(true);

  // Cloud Sync
  const [cloudSyncUrl, setCloudSyncUrl] = useState<string>('http://localhost:5000/api/sync');
  const [cloudSyncApiKey, setCloudSyncApiKey] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Load current user profile data from db.employees
      let targetEmp: Employee | undefined;
      if (user?.employeeId) {
        targetEmp = await db.employees.get(user.employeeId);
      }
      if (!targetEmp && (user?.role === 'admin' || user?.username === 'admin')) {
        targetEmp = await db.employees.get('emp_admin');
        if (!targetEmp) {
          targetEmp = await db.employees.where('role').equals('Admin').first();
        }
      }

      if (targetEmp) {
        setProfileForm({
          name: targetEmp.name || user?.name || '',
          username: targetEmp.username || (user?.username !== targetEmp.mobile ? user?.username : '') || '',
          mobile: targetEmp.mobile || user?.mobile || '',
          email: targetEmp.email || user?.email || '',
          designation: targetEmp.designation || (targetEmp.role === 'Admin' ? 'Clinic Administrator' : 'Dental Surgeon'),
          avatar: targetEmp.avatar || user?.avatar || '',
          currentPassword: targetEmp.password || '',
          newPassword: '',
          confirmPassword: '',
        });
      } else if (user) {
        setProfileForm({
          name: user.name || '',
          username: user.username || '',
          mobile: user.mobile || '',
          email: user.email || '',
          designation: user.designation || (user.role === 'admin' ? 'Clinic Administrator' : 'Dental Surgeon'),
          avatar: user.avatar || '',
          currentPassword: user.role === 'admin' ? 'admin' : '',
          newPassword: '',
          confirmPassword: '',
        });
      }

      // Load Clinic DB Settings
      const settings = await db.settings.get('default_settings');
      if (settings) {
        setClinicName(settings.clinicName || 'ইফরা ডেন্টাল এন্ড ফিজিওথেরাপি সেন্টার');
        setFooterText(settings.footerText || '');
        setVisitFee(settings.visitFee ?? 500);
        setRevisitFee(settings.revisitFee ?? 400);
        setRevisitValidityDays(settings.revisitValidityDays ?? 15);
        setLastRegNo(settings.lastRegNo ?? 4200);

        if (settings.printSettings) {
          setHeaderHeightCm(settings.printSettings.headerHeightCm ?? 4.5);
          setLeftSideWidthCm(settings.printSettings.leftSideWidthCm ?? 6.5);
          setRightSideWidthCm(settings.printSettings.rightSideWidthCm ?? 13.5);
          setPrescriptionFontSizePt(settings.printSettings.prescriptionFontSizePt ?? 10.5);
          setDisplayBarcode(settings.printSettings.displayBarcode ?? true);
          setDisplayVisitNo(settings.printSettings.displayVisitNo ?? true);
          setDisplayFooter(settings.printSettings.displayFooter ?? true);
          setDisplayGenericName(settings.printSettings.displayGenericName ?? false);
          setDisplaySignature(settings.printSettings.displaySignature ?? true);
        }

        setCloudSyncUrl(settings.cloudSyncUrl || 'http://localhost:5000/api/sync');
        setCloudSyncApiKey(settings.cloudSyncApiKey || '');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => {
      setSaveSuccessMsg('');
    }, 4000);
  };

  // Profile Save (Updates both db.employees and AuthContext session)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      alert('নাম ফাঁকা রাখা যাবে না!');
      return;
    }

    if (profileForm.newPassword) {
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        alert('নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না!');
        return;
      }
      if (profileForm.newPassword.length < 4) {
        alert('পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে!');
        return;
      }
    }

    try {
      const cleanUsername = profileForm.username.trim().toLowerCase().replace(/\s+/g, '') || undefined;
      const cleanMobile = profileForm.mobile.trim();

      // Determine target employee ID
      let targetId = user?.employeeId;
      if (!targetId && (user?.role === 'admin' || user?.username === 'admin')) {
        targetId = 'emp_admin';
      }
      if (!targetId) {
        targetId = `emp_${Date.now()}`;
      }

      let existingEmp = await db.employees.get(targetId);
      if (!existingEmp && (user?.role === 'admin' || user?.username === 'admin')) {
        existingEmp = await db.employees.where('role').equals('Admin').first();
        if (existingEmp) {
          targetId = existingEmp.id;
        }
      }

      // Check unique username if changing
      if (cleanUsername) {
        const conflict = await db.employees
          .where('username')
          .equals(cleanUsername)
          .first();
        if (conflict && conflict.id !== targetId) {
          alert(`"${cleanUsername}" ইউজারনেমটি ইতিমধ্যে অন্য একজন ব্যবহার করছেন! অনুগ্রহ করে ভিন্ন ইউজারনেম দিন।`);
          return;
        }
      }

      // Determine final password
      let finalPassword = existingEmp?.password || (user?.role === 'admin' ? 'admin' : '');
      if (profileForm.newPassword.trim()) {
        finalPassword = profileForm.newPassword.trim();
      }

      const now = new Date().toISOString();
      const employeeRecord: Employee = {
        id: targetId,
        name: profileForm.name.trim(),
        username: cleanUsername,
        password: finalPassword,
        mobile: cleanMobile,
        email: profileForm.email.trim(),
        role: existingEmp?.role || (user?.role === 'admin' ? 'Admin' : 'Doctor'),
        designation: profileForm.designation.trim() || (existingEmp ? existingEmp.designation : 'Clinic Administrator'),
        joiningDate: existingEmp?.joiningDate || now.split('T')[0],
        status: 'Active',
        avatar: profileForm.avatar,
        createdAt: existingEmp?.createdAt || now,
        updatedAt: now,
      };

      await db.employees.put(employeeRecord);

      // Update AuthContext session & localStorage
      const updatedFields: any = {
        name: employeeRecord.name,
        username: employeeRecord.username || employeeRecord.mobile,
        mobile: employeeRecord.mobile,
        email: employeeRecord.email,
        designation: employeeRecord.designation,
        avatar: employeeRecord.avatar,
        employeeId: targetId,
        role: employeeRecord.role.toLowerCase(),
      };
      updateUser(updatedFields);

      // Update local state
      setProfileForm((prev) => ({
        ...prev,
        name: employeeRecord.name,
        username: employeeRecord.username || '',
        mobile: employeeRecord.mobile,
        email: employeeRecord.email || '',
        designation: employeeRecord.designation,
        avatar: employeeRecord.avatar || '',
        currentPassword: finalPassword,
        newPassword: '',
        confirmPassword: '',
      }));

      setIsEditingProfile(false);
      showNotification('আপনার প্রোফাইল, ইউজারনেম ও পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('প্রোফাইল আপডেট করতে সমস্যা হয়েছে!');
    }
  };

  // Avatar Image Upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('ছবির আকার সর্বোচ্চ ২ মেগাবাইট (2MB) হতে পারবে!');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm((prev) => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Clinic & Print Settings Save
  const handleSaveClinicSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const existing = (await db.settings.get('default_settings')) || ({} as any);

      const updatedSettings: ClinicSettings = {
        ...existing,
        id: 'default_settings',
        clinicName,
        footerText,
        visitFee: Number(visitFee),
        revisitFee: Number(revisitFee),
        revisitValidityDays: Number(revisitValidityDays),
        lastRegNo: Number(lastRegNo),
        printSettings: {
          ...existing.printSettings,
          headerHeightCm: Number(headerHeightCm),
          leftSideWidthCm: Number(leftSideWidthCm),
          rightSideWidthCm: Number(rightSideWidthCm),
          prescriptionFontSizePt: Number(prescriptionFontSizePt),
          displayBarcode,
          displayVisitNo,
          displayFooter,
          displayGenericName,
          displaySignature,
        },
        cloudSyncUrl,
        cloudSyncApiKey,
      };

      await db.settings.put(updatedSettings);
      showNotification('সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে!');
    } catch (err) {
      console.error('Failed to save clinic settings:', err);
      alert('সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে!');
    }
  };

  return (
    <div className="p-4 max-w-[1200px] mx-auto text-slate-800 space-y-4">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-800 via-sky-700 to-blue-900 rounded-xl p-4 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/20">
            <Settings className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">সিস্টেম ও প্রোফাইল সেটিংস (Settings)</h1>
            <p className="text-xs text-sky-100">প্রোফাইল পরিবর্তন, পাসওয়ার্ড, প্রেসক্রিপশন প্রিন্ট ক্যালিব্রেশন ও ভিজিট ফি</p>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="flex items-center space-x-1.5 bg-emerald-500/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold animate-in fade-in shadow-md">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-blue-700 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>ব্যবহারকারী প্রোফাইল ও নিরাপত্তা</span>
        </button>

        <button
          onClick={() => setActiveTab('print')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'print'
              ? 'bg-blue-700 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>প্রেসক্রিপশন প্রিন্ট ক্যালিব্রেশন</span>
        </button>

        <button
          onClick={() => setActiveTab('options')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'options'
              ? 'bg-blue-700 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>ফি ও রেজিস্ট্রেশন অপশন</span>
        </button>

        <button
          onClick={() => setActiveTab('cloud')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'cloud'
              ? 'bg-blue-700 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>ক্লাউড সিঙ্ক কনফিগারেশন</span>
        </button>
      </div>

      {/* TAB 1: USER PROFILE & SECURITY */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isEditingProfile ? 'প্রোফাইল তথ্য ও পাসওয়ার্ড সম্পাদনা' : 'আমার অ্যাকাউন্ট প্রোফাইল'}
              </h2>
              <p className="text-xs text-slate-500">আপনার ব্যক্তিগত তথ্য, লগইন ইউজারনেম ও পাসওয়ার্ড পরিচালনা করুন</p>
            </div>

            {!isEditingProfile ? (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>প্রোফাইল এডিট করুন</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center space-x-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>বাতিল</span>
              </button>
            )}
          </div>

          {/* VIEW MODE */}
          {!isEditingProfile ? (
            <div className="grid grid-cols-12 gap-6 items-center">
              <div className="col-span-12 sm:col-span-4 flex flex-col items-center text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-24 h-24 rounded-full bg-blue-700 text-white text-3xl font-bold flex items-center justify-center shadow-md overflow-hidden border-4 border-white mb-3">
                  {profileForm.avatar ? (
                    <img src={profileForm.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{profileForm.name ? profileForm.name.charAt(0) : 'U'}</span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-base">{profileForm.name || 'User'}</h3>
                <span className="text-xs text-blue-700 font-semibold mt-0.5">{profileForm.designation}</span>
                <span className="mt-2 px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full uppercase">
                  রোল: {user?.role || 'Doctor'}
                </span>
              </div>

              <div className="col-span-12 sm:col-span-8 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-400 font-semibold block">লগইন ইউজারনেম:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {profileForm.username ? `@${profileForm.username}` : '(সেট করা নেই)'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-400 font-semibold block">মোবাইল নম্বর:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {profileForm.mobile || '(দেওয়া হয়নি)'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-400 font-semibold block">ইমেইল ঠিকানা:</span>
                    <span className="text-slate-800 font-medium">
                      {profileForm.email || '(দেওয়া হয়নি)'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-400 font-semibold block">নিরাপত্তা ও পাসওয়ার্ড:</span>
                    <span className="font-mono text-slate-700">•••••••• (সুরক্ষিত)</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center space-x-2 text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>এই প্রোফাইলটি আপনার অফলাইন ডেন্টাল সিস্টেমে সফলভাবে অনুমোদিত।</span>
                </div>
              </div>
            </div>
          ) : (
            /* EDIT MODE */
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-12 gap-4">
                {/* Avatar Preview & Upload */}
                <div className="col-span-12 sm:col-span-3 flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="relative w-24 h-24 rounded-full bg-blue-700 text-white text-3xl font-bold flex items-center justify-center shadow-md overflow-hidden border-4 border-white mb-2">
                    {profileForm.avatar ? (
                      <img src={profileForm.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{profileForm.name ? profileForm.name.charAt(0) : 'U'}</span>
                    )}
                  </div>

                  <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold cursor-pointer transition shadow-xs flex items-center space-x-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>ছবি আপলোড</span>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                  {profileForm.avatar && (
                    <button
                      type="button"
                      onClick={() => setProfileForm((prev) => ({ ...prev, avatar: '' }))}
                      className="mt-1 text-[10px] text-red-600 hover:underline"
                    >
                      ছবি মুছুন
                    </button>
                  )}
                </div>

                {/* Profile Fields */}
                <div className="col-span-12 sm:col-span-9 grid grid-cols-12 gap-3">
                  <div className="col-span-12 sm:col-span-6">
                    <label className="font-bold text-slate-700 block mb-1">
                      পূর্ণ নাম <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-6">
                    <label className="font-bold text-slate-700 block mb-1">পদবি (Designation)</label>
                    <input
                      type="text"
                      value={profileForm.designation}
                      onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-6">
                    <label className="font-bold text-slate-700 block mb-1">
                      লগইন ইউজারনেম (Username)
                    </label>
                    <input
                      type="text"
                      value={profileForm.username}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          username: e.target.value.toLowerCase().replace(/\s+/g, ''),
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-6">
                    <label className="font-bold text-slate-700 block mb-1">মোবাইল নম্বর</label>
                    <input
                      type="tel"
                      value={profileForm.mobile}
                      onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="col-span-12">
                    <label className="font-bold text-slate-700 block mb-1">ইমেইল ঠিকানা</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>পাসওয়ার্ড পরিবর্তন (Password Change)</span>
                </h4>
                <p className="text-[11px] text-slate-500">পাসওয়ার্ড পরিবর্তন না করতে চাইলে নিচের ঘরগুলো খালি রাখুন।</p>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 sm:col-span-6">
                    <label className="block text-slate-700 font-semibold mb-1">নতুন পাসওয়ার্ড</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={profileForm.newPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                        placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড"
                        className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="col-span-12 sm:col-span-6">
                    <label className="block text-slate-700 font-semibold mb-1">কনফার্ম নতুন পাসওয়ার্ড</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={profileForm.confirmPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                      placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs shadow flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>প্রোফাইল সেভ করুন</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: PRINT SETUP & MARGINS */}
      {activeTab === 'print' && (
        <form onSubmit={handleSaveClinicSettings} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5 text-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">A4 / Letter প্রেসক্রিপশন প্রিন্ট ক্যালিব্রেশন (cm / pt)</h2>
            <p className="text-xs text-slate-500">ছাপানো প্যাড এবং কম্পিউটারে স্বয়ংক্রিয় মার্জিন ও লেআউট নির্ধারণ করুন</p>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
            <h3 className="font-bold text-sm text-blue-900 mb-3 flex items-center space-x-2">
              <Printer className="w-4 h-4 text-blue-600" />
              <span>মার্জিন ও কলাম মাপ (Margins & Layout)</span>
            </h3>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-6 md:col-span-3">
                <label className="block text-slate-700 font-semibold mb-1">
                  হেডার প্যাড টপ স্পেস (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={headerHeightCm}
                  onChange={(e) => setHeaderHeightCm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">ফিজিক্যাল প্যাডের জন্য ফাঁকা জায়গা</p>
              </div>

              <div className="col-span-6 md:col-span-3">
                <label className="block text-slate-700 font-semibold mb-1">বাম কলামের প্রস্থ (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={leftSideWidthCm}
                  onChange={(e) => setLeftSideWidthCm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                />
              </div>

              <div className="col-span-6 md:col-span-3">
                <label className="block text-slate-700 font-semibold mb-1">ডান কলামের প্রস্থ (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={rightSideWidthCm}
                  onChange={(e) => setRightSideWidthCm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                />
              </div>

              <div className="col-span-6 md:col-span-3">
                <label className="block text-slate-700 font-semibold mb-1">প্রেসক্রিপশন ফন্ট সাইজ (pt)</label>
                <input
                  type="number"
                  step="0.5"
                  value={prescriptionFontSizePt}
                  onChange={(e) => setPrescriptionFontSizePt(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-center font-bold font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 mt-4 pt-3 border-t border-sky-200">
              <div className="col-span-6 md:col-span-4 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="barcode"
                  checked={displayBarcode}
                  onChange={(e) => setDisplayBarcode(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="barcode" className="font-semibold text-slate-700 cursor-pointer">
                  প্রেসক্রিপশনে বারকোড দেখান
                </label>
              </div>

              <div className="col-span-6 md:col-span-4 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="visitno"
                  checked={displayVisitNo}
                  onChange={(e) => setDisplayVisitNo(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="visitno" className="font-semibold text-slate-700 cursor-pointer">
                  ভিজিট নম্বর দেখান (Visit No)
                </label>
              </div>

              <div className="col-span-6 md:col-span-4 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="footer"
                  checked={displayFooter}
                  onChange={(e) => setDisplayFooter(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="footer" className="font-semibold text-slate-700 cursor-pointer">
                  ক্লিনিক ফুটার প্রদর্শন করুন
                </label>
              </div>

              <div className="col-span-6 md:col-span-4 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="generic"
                  checked={displayGenericName}
                  onChange={(e) => setDisplayGenericName(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="generic" className="font-semibold text-slate-700 cursor-pointer">
                  ওষুধের সাথে জেনেরিক নাম দেখান
                </label>
              </div>

              <div className="col-span-6 md:col-span-4 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sig"
                  checked={displaySignature}
                  onChange={(e) => setDisplaySignature(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="sig" className="font-semibold text-slate-700 cursor-pointer">
                  ডাক্তার সিগনেচার স্পেস দেখান
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow text-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>প্রিন্ট সেটিংস সংরক্ষণ করুন</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: FEES & REGISTRATION OPTIONS */}
      {activeTab === 'options' && (
        <form onSubmit={handleSaveClinicSettings} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">ভিজিট ফি ও রেজিস্ট্রেশন নম্বর ব্যবস্থাপনা</h2>
            <p className="text-xs text-slate-500">রোগীর স্ট্যান্ডার্ড পরামর্শ ফি, রি-ভিজিট মেয়াদ এবং পরবর্তী রেজি নং</p>
          </div>

          <div className="grid grid-cols-12 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="col-span-12 sm:col-span-6">
              <label className="block text-slate-700 font-semibold mb-1">ক্লিনিক / সেন্টারের নাম</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
              />
            </div>

            <div className="col-span-12 sm:col-span-6">
              <label className="block text-slate-700 font-semibold mb-1">বর্তমান সর্বশেষ রেজি নং (Last Reg No)</label>
              <input
                type="number"
                value={lastRegNo}
                onChange={(e) => setLastRegNo(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-blue-900"
              />
            </div>

            <div className="col-span-12 sm:col-span-4">
              <label className="block text-slate-700 font-semibold mb-1">স্ট্যান্ডার্ড ভিজিট ফি (TK)</label>
              <input
                type="number"
                value={visitFee}
                onChange={(e) => setVisitFee(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-emerald-700 font-mono"
              />
            </div>

            <div className="col-span-12 sm:col-span-4">
              <label className="block text-slate-700 font-semibold mb-1">রি-ভিজিট ফি (TK)</label>
              <input
                type="number"
                value={revisitFee}
                onChange={(e) => setRevisitFee(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-emerald-700 font-mono"
              />
            </div>

            <div className="col-span-12 sm:col-span-4">
              <label className="block text-slate-700 font-semibold mb-1">রি-ভিজিট মেয়াদ (দিন)</label>
              <input
                type="number"
                value={revisitValidityDays}
                onChange={(e) => setRevisitValidityDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
              />
            </div>

            <div className="col-span-12">
              <label className="block text-slate-700 font-semibold mb-1">প্রেসক্রিপশন ফুটার নোট / শুভেচ্ছা বার্তা</label>
              <textarea
                rows={2}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow text-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>অপশন সংরক্ষণ করুন</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: CLOUD SYNC CONFIGURATION */}
      {activeTab === 'cloud' && (
        <form onSubmit={handleSaveClinicSettings} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">ক্লাউড সিঙ্ক ও সার্ভার কনফিগারেশন</h2>
            <p className="text-xs text-slate-500">অনলাইন সেন্ট্রাল সার্ভার বা MongoDB-তে ডাটা স্বয়ংক্রিয় ব্যাকআপের জন্য</p>
          </div>

          <div className="grid grid-cols-12 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="col-span-12">
              <label className="block text-slate-700 font-semibold mb-1">Cloud Sync API URL</label>
              <input
                type="url"
                value={cloudSyncUrl}
                onChange={(e) => setCloudSyncUrl(e.target.value)}
                placeholder="http://yourserver.com/api/sync"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
              />
            </div>

            <div className="col-span-12">
              <label className="block text-slate-700 font-semibold mb-1">API Key / Token</label>
              <input
                type="password"
                value={cloudSyncApiKey}
                onChange={(e) => setCloudSyncApiKey(e.target.value)}
                placeholder="সেন্ট্রাল সার্ভার সিক্রেট কি"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow text-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>ক্লাউড কনফিগারেশন সংরক্ষণ করুন</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
