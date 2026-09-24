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
  FileText,
  Database,
  UploadCloud,
  DownloadCloud,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { db, type ClinicSettings, type Employee } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { syncEngine } from '@/lib/syncEngine';

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
  const [clinicLogo, setClinicLogo] = useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
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
  const [cloudSyncUrl, setCloudSyncUrl] = useState<string>('/api/sync');
  const [cloudSyncApiKey, setCloudSyncApiKey] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<{
    checking: boolean;
    mongoConnected: boolean;
    cloudinaryConfigured: boolean;
    mongoMessage: string;
    cloudinaryMessage: string;
    databaseName?: string;
  } | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);
  const [isPullingNow, setIsPullingNow] = useState<boolean>(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'cloud') {
      checkHealth();
    }
  }, [activeTab]);

  const checkHealth = async () => {
    setHealthStatus((prev) => ({
      checking: true,
      mongoConnected: prev?.mongoConnected ?? false,
      cloudinaryConfigured: prev?.cloudinaryConfigured ?? false,
      mongoMessage: 'সংযোগ পরীক্ষা করা হচ্ছে...',
      cloudinaryMessage: 'যাচai করা হচ্ছে...',
    }));
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealthStatus({
          checking: false,
          mongoConnected: !!data.mongo?.connected,
          cloudinaryConfigured: !!data.cloudinary?.configured,
          mongoMessage: data.mongo?.message || (data.mongo?.connected ? 'সংযুক্ত (Connected)' : 'সংযোগের অপেক্ষায়'),
          cloudinaryMessage: data.cloudinary?.message || (data.cloudinary?.configured ? 'সক্রিয় (WebP Optimized)' : 'কনফিগার করা হয়নি'),
          databaseName: data.mongo?.database,
        });
      } else {
        setHealthStatus({
          checking: false,
          mongoConnected: false,
          cloudinaryConfigured: false,
          mongoMessage: `সার্ভার রিসপন্স ত্রুটি (${res.status})`,
          cloudinaryMessage: 'সার্ভার অফলাইন',
        });
      }
    } catch (err: any) {
      setHealthStatus({
        checking: false,
        mongoConnected: false,
        cloudinaryConfigured: false,
        mongoMessage: 'সার্ভার এপিআই অফলাইন বা লোড হচ্ছে না',
        cloudinaryMessage: 'অফলাইন',
      });
    }
  };

  const handleManualSync = async () => {
    setIsSyncingNow(true);
    try {
      const res = await syncEngine.triggerSync();
      showNotification(res.message);
      checkHealth();
    } catch (e: any) {
      showNotification(`সিঙ্ক করতে সমস্যা হয়েছে: ${e.message}`);
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleManualPull = async () => {
    setIsPullingNow(true);
    try {
      const res = await syncEngine.pullUpdates();
      if (res.success) {
        showNotification(
          res.pulledCount > 0
            ? `ক্লাউড থেকে সফলভাবে ${res.pulledCount} টি রেকর্ড আপডেট হয়েছে!`
            : 'ক্লাউডে কোনো নতুন পরিবর্তন নেই (সব ডাটা আপ-টু-ডেট)।'
        );
      } else {
        showNotification('ক্লাউড থেকে ডাটা আনা সম্ভব হয়নি (সার্ভার অফলাইন বা কোনো রেকর্ড নেই)।');
      }
      checkHealth();
    } catch (e: any) {
      showNotification(`ডাটা রিসিভ করতে সমস্যা হয়েছে: ${e.message}`);
    } finally {
      setIsPullingNow(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(id);
    setTimeout(() => setCopiedVar(null), 2000);
  };

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
        if (settings.logoUrl) setClinicLogo(settings.logoUrl);
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

        const initialSyncUrl =
          settings.cloudSyncUrl && !settings.cloudSyncUrl.includes('localhost:5000')
            ? settings.cloudSyncUrl
            : '/api/sync';
        setCloudSyncUrl(initialSyncUrl);
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
      await syncEngine.logMutation('employees', 'UPDATE', employeeRecord.id, employeeRecord);
      syncEngine.triggerSync().catch(console.warn);

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

  // Clinic Logo Upload (Cloudinary with base64 fallback)
  const handleClinicLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('ছবির সাইজ সর্বোচ্চ ১০ মেগাবাইট (10MB) হতে পারবে।');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setClinicLogo(base64);

      // Upload to Cloudinary for optimized WebP delivery
      setIsUploadingLogo(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'logos');
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            setClinicLogo(data.url);
          }
        }
      } catch (err) {
        console.warn('Cloudinary upload fallback to base64:', err);
      } finally {
        setIsUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
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
        logoUrl: clinicLogo,
        displayLogo: true,
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
      await syncEngine.logMutation('settings', 'UPDATE', 'default_settings', updatedSettings);
      syncEngine.triggerSync().catch(console.warn);
      showNotification('ক্লিনিক সেটিংস ও লোগো সফলভাবে সংরক্ষণ করা হয়েছে!');
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
            {/* Clinic Logo Upload Box */}
            <div className="col-span-12 p-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden p-1 shrink-0">
                  {clinicLogo ? (
                    <img src={clinicLogo} alt="Clinic Logo" className="w-full h-full object-contain rounded" />
                  ) : (
                    <span className="text-2xl">🦷</span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">ক্লিনিক লোগো (লগইন স্ক্রিন ও প্রেসক্রিপশন হেডার)</h4>
                  <p className="text-[11px] text-slate-500">লগইন স্ক্রিনে এবং প্রেসক্রিপশনে আপনার এই ক্লিনিক লোগোটি স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold border border-blue-200 cursor-pointer text-xs flex items-center space-x-1.5 transition">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isUploadingLogo ? 'আপলোড হচ্ছে...' : 'লোগো আপলোড'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleClinicLogoUpload}
                    className="hidden"
                    disabled={isUploadingLogo}
                  />
                </label>
                {clinicLogo && (
                  <button
                    type="button"
                    onClick={() => setClinicLogo('')}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                    title="লোগো মুছে ফেলুন"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

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

      {/* TAB 4: CLOUD SYNC & MONGODB CONFIGURATION */}
      {activeTab === 'cloud' && (
        <div className="space-y-5 text-xs">
          {/* Main Status & Header Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">ক্লাউড ডেটাবেস ও ইমেজ অপ্টিমাইজেশন</h2>
                    <p className="text-xs text-slate-500">
                      MongoDB Atlas ক্লাউড স্টোরেজ ও Cloudinary WebP ইমেজ অপ্টিমাইজেশন
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={checkHealth}
                  disabled={healthStatus?.checking}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  title="কানেকশন রিলোড করুন"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${healthStatus?.checking ? 'animate-spin text-blue-600' : ''}`} />
                  <span>{healthStatus?.checking ? 'যাচাই হচ্ছে...' : 'স্ট্যাটাস রিফ্রেশ'}</span>
                </button>
              </div>
            </div>

            {/* 2 Live Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: MongoDB Atlas */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">MongoDB Atlas ডেটাবেস</h3>
                      <p className="text-[11px] text-slate-500">অনলাইন ডাটা স্টোরেজ ও সিঙ্ক</p>
                    </div>
                  </div>
                  {healthStatus?.mongoConnected ? (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-full border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span>সংযুক্ত (Connected)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-[11px] rounded-full border border-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>{healthStatus?.checking ? 'যাচাই হচ্ছে...' : 'সংযোগের অপেক্ষায়'}</span>
                    </span>
                  )}
                </div>

                <div className="text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">
                    স্ট্যাটাস: <span className={healthStatus?.mongoConnected ? 'text-emerald-700' : 'text-amber-700'}>{healthStatus?.mongoMessage || 'অফলাইন / লোকাল ক্যাশ সক্রিয়'}</span>
                  </p>
                  {healthStatus?.databaseName && (
                    <p className="font-mono text-slate-500 text-[10px]">
                      Database: <strong className="text-slate-700">{healthStatus.databaseName}</strong>
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500">
                    রোগী, প্রেসক্রিপশন ও বিলিং-এর প্রতিটি পরিবর্তন স্বয়ংক্রিয়ভাবে ক্লাউডে ব্যাকআপ হয়।
                  </p>
                </div>

                {/* MongoDB Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncingNow}
                    className="w-full py-2 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center space-x-1 transition cursor-pointer disabled:opacity-50 text-[11px]"
                  >
                    <UploadCloud className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-bounce' : ''}`} />
                    <span>{isSyncingNow ? 'সিঙ্ক হচ্ছে...' : 'ক্লাউডে সিঙ্ক (Push)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleManualPull}
                    disabled={isPullingNow}
                    className="w-full py-2 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold flex items-center justify-center space-x-1 transition cursor-pointer disabled:opacity-50 text-[11px]"
                  >
                    <DownloadCloud className={`w-3.5 h-3.5 ${isPullingNow ? 'animate-spin' : ''}`} />
                    <span>{isPullingNow ? 'ডাটা আসছে...' : 'ক্লাউড থেকে আনুন (Pull)'}</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Cloudinary Image Optimization */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">Cloudinary ইমেজ অপ্টিমাইজেশন</h3>
                      <p className="text-[11px] text-slate-500">WebP ফরম্যাট ও হাই-স্পিড CDN</p>
                    </div>
                  </div>
                  {healthStatus?.cloudinaryConfigured ? (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-full border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span>সক্রিয় (Active WebP)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-[11px] rounded-full border border-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>{healthStatus?.checking ? 'যাচাই হচ্ছে...' : 'কী প্রয়োজন'}</span>
                    </span>
                  )}
                </div>

                <div className="text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">
                    স্ট্যাটাস: <span className={healthStatus?.cloudinaryConfigured ? 'text-emerald-700' : 'text-amber-700'}>{healthStatus?.cloudinaryMessage || 'ক্লাউড কী সেট করা হয়নি'}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    লোগো, ওয়াটারমার্ক ও রোগীদের এক্স-রে ছবি স্বয়ংক্রিয়ভাবে সংকুচিত হয়ে WebP তে লোড হয়। Vercel Environment Variables এ সেট করার সাথে সাথে ক্লাউড ডেলিভারি সক্রিয় হয়।
                  </p>
                </div>

                <div className="p-2 bg-purple-50 rounded-lg border border-purple-100 text-[10px] text-purple-900 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>স্মার্ট অটো-কম্প্রেশন: মূল ছবির চেয়ে ৭০-৮০% কম সাইজে ফাস্ট লোড হবে।</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vercel Environment Variables Guide */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-xl p-5 shadow-sm space-y-3.5 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold border border-blue-500/30">
                  Vercel Setup
                </span>
                <h3 className="font-bold text-xs text-white">Vercel-এ হোস্ট করার জন্য প্রয়োজনীয় Environment Variables</h3>
              </div>
              <span className="text-[11px] text-slate-400">Settings &gt; Environment Variables</span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed">
              Vercel ড্যাশবোর্ডে গিয়ে আপনার প্রজেক্টের <strong>Settings &gt; Environment Variables</strong> ট্যাবে নিচের ৪টি ভেরিয়েবল যুক্ত করে সেভ করুন। এরপর Vercel স্বয়ংক্রিয়ভাবে সমস্ত ডাটা MongoDB Atlas-এ স্টোর করবে এবং ছবিগুলো Cloudinary CDN-এর মাধ্যমে পাঠাবে।
            </p>

            <div className="space-y-2 pt-1 font-mono text-[11px]">
              {/* Var 1: MONGODB_URI */}
              <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <div className="truncate mr-2">
                  <span className="text-emerald-400 font-bold">MONGODB_URI</span>
                  <span className="text-slate-400 text-[10px] block truncate">
                    mongodb+srv://&lt;username&gt;:&lt;password&gt;@cluster0.xxxxx.mongodb.net/ifrad_dental?retryWrites=true&amp;w=majority
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('MONGODB_URI', 'var1')}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] flex items-center space-x-1 shrink-0 transition cursor-pointer"
                >
                  {copiedVar === 'var1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedVar === 'var1' ? 'কপি হয়েছে' : 'নাম কপি'}</span>
                </button>
              </div>

              {/* Var 2: CLOUDINARY_CLOUD_NAME */}
              <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <div className="truncate mr-2">
                  <span className="text-purple-400 font-bold">CLOUDINARY_CLOUD_NAME</span>
                  <span className="text-slate-400 text-[10px] block truncate">
                    আপনার Cloudinary ড্যাশবোর্ড থেকে ক্লাউড নেম (যেমন: dxyl8qop)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('CLOUDINARY_CLOUD_NAME', 'var2')}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] flex items-center space-x-1 shrink-0 transition cursor-pointer"
                >
                  {copiedVar === 'var2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedVar === 'var2' ? 'কপি হয়েছে' : 'নাম কপি'}</span>
                </button>
              </div>

              {/* Var 3: CLOUDINARY_API_KEY */}
              <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <div className="truncate mr-2">
                  <span className="text-purple-400 font-bold">CLOUDINARY_API_KEY</span>
                  <span className="text-slate-400 text-[10px] block truncate">
                    আপনার Cloudinary ড্যাশবোর্ড থেকে এপিআই কি (যেমন: 123456789012345)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('CLOUDINARY_API_KEY', 'var3')}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] flex items-center space-x-1 shrink-0 transition cursor-pointer"
                >
                  {copiedVar === 'var3' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedVar === 'var3' ? 'কপি হয়েছে' : 'নাম কপি'}</span>
                </button>
              </div>

              {/* Var 4: CLOUDINARY_API_SECRET */}
              <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <div className="truncate mr-2">
                  <span className="text-purple-400 font-bold">CLOUDINARY_API_SECRET</span>
                  <span className="text-slate-400 text-[10px] block truncate">
                    আপনার Cloudinary ড্যাশবোর্ডের গোপন সিক্রেট কি
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('CLOUDINARY_API_SECRET', 'var4')}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] flex items-center space-x-1 shrink-0 transition cursor-pointer"
                >
                  {copiedVar === 'var4' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedVar === 'var4' ? 'কপি হয়েছে' : 'নাম কপি'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Sync URL form */}
          <form onSubmit={handleSaveClinicSettings} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">কাস্টম সিঙ্ক ইউআরএল ও সিক্রেট কি</h2>
              <p className="text-xs text-slate-500">Vercel বা লোকাল ডেভেলপমেন্টে ডিফল্ট /api/sync ব্যবহার করা হয়</p>
            </div>

            <div className="grid grid-cols-12 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="col-span-12 sm:col-span-6">
                <label className="block text-slate-700 font-semibold mb-1">Cloud Sync API Route URL</label>
                <input
                  type="text"
                  value={cloudSyncUrl}
                  onChange={(e) => setCloudSyncUrl(e.target.value)}
                  placeholder="/api/sync"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">ডিফল্ট: /api/sync (Vercel ও লোকাল উভয়েই অটো কাজ করে)</p>
              </div>

              <div className="col-span-12 sm:col-span-6">
                <label className="block text-slate-700 font-semibold mb-1">API Key / Token</label>
                <input
                  type="password"
                  value={cloudSyncApiKey}
                  onChange={(e) => setCloudSyncApiKey(e.target.value)}
                  placeholder="DENTIST_SECRET_KEY_2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">কাস্টম সার্ভার কানেকশন সিকিউরিটি কি</p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow text-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>কনফিগারেশন সংরক্ষণ করুন</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
