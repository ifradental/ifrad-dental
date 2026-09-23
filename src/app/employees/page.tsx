'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Stethoscope,
  UserCheck,
  CreditCard,
  ShieldCheck,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Lock,
  Key,
  User,
  Filter,
  X,
  FileBadge,
  DollarSign,
  Briefcase,
  Layers,
  Sparkles,
  Award
} from 'lucide-react';
import { db, type Employee, type EmployeeRole } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Modal States
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [showFormPassword, setShowFormPassword] = useState<boolean>(false);
  const [showViewingPassword, setShowViewingPassword] = useState<boolean>(false);

  // Form State
  const initialForm = {
    name: '',
    username: '',
    password: '',
    mobile: '',
    email: '',
    role: 'Doctor' as EmployeeRole,
    designation: 'ডেন্টাল সার্জন',
    bmdcReg: '',
    specialization: 'BDS',
    salary: 0,
    joiningDate: new Date().toISOString().split('T')[0],
    address: '',
    nidOrPassport: '',
    status: 'Active' as 'Active' | 'Inactive',
    note: '',
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const list = await db.employees.toArray();
      // Sort: Active first, then by name
      list.sort((a, b) => {
        if (a.status === b.status) {
          return a.name.localeCompare(b.name);
        }
        return a.status === 'Active' ? -1 : 1;
      });
      setEmployees(list);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Open Create Modal
  const handleOpenAddModal = () => {
    setEditingEmployeeId(null);
    setShowFormPassword(false);
    setFormData(initialForm);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setShowFormPassword(false);
    setFormData({
      name: emp.name || '',
      username: emp.username || '',
      password: emp.password || '',
      mobile: emp.mobile || '',
      email: emp.email || '',
      role: emp.role || 'Staff',
      designation: emp.designation || '',
      bmdcReg: emp.bmdcReg || '',
      specialization: emp.specialization || '',
      salary: emp.salary || 0,
      joiningDate: emp.joiningDate || new Date().toISOString().split('T')[0],
      address: emp.address || '',
      nidOrPassport: emp.nidOrPassport || '',
      status: emp.status || 'Active',
      note: emp.note || '',
    });
    setShowAddModal(true);
  };

  // Handle Save (Create / Update)
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('কর্মচারীর নাম আবশ্যক!');
      return;
    }
    if (!formData.mobile.trim()) {
      alert('মোবাইল নম্বর আবশ্যক!');
      return;
    }
    if (!formData.password.trim()) {
      alert('লগইন পাসওয়ার্ড প্রদান করা আবশ্যক!');
      return;
    }

    const cleanUsername = formData.username.trim().toLowerCase().replace(/\s+/g, '');
    const empId = editingEmployeeId || `emp_${Date.now()}`;

    // Validate unique username if provided
    if (cleanUsername) {
      const existing = employees.find(
        (emp) => emp.username && emp.username.toLowerCase() === cleanUsername && emp.id !== empId
      );
      if (existing) {
        alert(`"${cleanUsername}" ইউজারনেমটি ইতিমধ্যে "${existing.name}"-এর জন্য ব্যবহৃত হচ্ছে! অনুগ্রহ করে ভিন্ন ইউজারনেম দিন।`);
        return;
      }
    }

    try {
      const now = new Date().toISOString();

      const employeeRecord: Employee = {
        id: empId,
        name: formData.name.trim(),
        username: cleanUsername || undefined,
        password: formData.password.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        role: formData.role,
        designation: formData.designation.trim() || getDefaultDesignation(formData.role),
        bmdcReg: formData.role === 'Doctor' ? formData.bmdcReg.trim() : undefined,
        specialization: formData.role === 'Doctor' ? formData.specialization.trim() : undefined,
        salary: Number(formData.salary) || 0,
        joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
        address: formData.address.trim(),
        nidOrPassport: formData.nidOrPassport.trim(),
        status: formData.status,
        note: formData.note.trim(),
        createdAt: editingEmployeeId
          ? employees.find((e) => e.id === editingEmployeeId)?.createdAt || now
          : now,
        updatedAt: now,
      };

      await db.employees.put(employeeRecord);
      await syncEngine.logMutation(
        'employees',
        editingEmployeeId ? 'UPDATE' : 'INSERT',
        employeeRecord.id,
        employeeRecord
      );

      setShowAddModal(false);
      setEditingEmployeeId(null);
      await loadEmployees();

      // If viewing, update viewing
      if (viewingEmployee?.id === employeeRecord.id) {
        setViewingEmployee(employeeRecord);
      }
    } catch (err) {
      console.error('Failed to save employee:', err);
      alert('সংরক্ষণ করতে সমস্যা হয়েছে!');
    }
  };

  // Toggle Employee Status
  const handleToggleStatus = async (emp: Employee) => {
    const nextStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    const updated = { ...emp, status: nextStatus, updatedAt: new Date().toISOString() };
    await db.employees.update(emp.id, { status: nextStatus, updatedAt: updated.updatedAt });
    await syncEngine.logMutation('employees', 'UPDATE', emp.id, updated);
    await loadEmployees();
  };

  // Delete Employee
  const handleDeleteEmployee = async (id: string, name: string) => {
    if (confirm(`আপনি কি নিশ্চিত "${name}"-কে তালিকা থেকে মুছে ফেলতে চান?`)) {
      await db.employees.delete(id);
      await syncEngine.logMutation('employees', 'DELETE', id, { id });
      if (viewingEmployee?.id === id) setViewingEmployee(null);
      await loadEmployees();
    }
  };

  // Default designation helper based on role
  const getDefaultDesignation = (role: EmployeeRole): string => {
    switch (role) {
      case 'Doctor':
        return 'ডেন্টাল সার্জন';
      case 'Receptionist':
        return 'ফ্রন্ট ডেস্ক এক্সিকিউটিভ';
      case 'Cashier':
        return 'ক্যাশিয়ার ও হিসাব সহকারী';
      case 'Staff':
        return 'ক্লিনিক্যাল অ্যাসিস্ট্যান্ট';
      default:
        return 'স্টাফ';
    }
  };

  // Helper when changing role in form
  const handleRoleChange = (newRole: EmployeeRole) => {
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      designation: prev.designation === getDefaultDesignation(prev.role)
        ? getDefaultDesignation(newRole)
        : prev.designation,
    }));
  };

  // Filtered list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Role filter
      if (selectedRole !== 'All' && emp.role !== selectedRole) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'All' && emp.status !== selectedStatus) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchUsername = (emp.username || '').toLowerCase().includes(q);
        const matchMobile = (emp.mobile || '').toLowerCase().includes(q);
        const matchDesignation = (emp.designation || '').toLowerCase().includes(q);
        const matchEmail = (emp.email || '').toLowerCase().includes(q);
        const matchBmdc = (emp.bmdcReg || '').toLowerCase().includes(q);
        if (!matchName && !matchUsername && !matchMobile && !matchDesignation && !matchEmail && !matchBmdc) {
          return false;
        }
      }
      return true;
    });
  }, [employees, selectedRole, selectedStatus, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === 'Active').length;
    const doctors = employees.filter((e) => e.role === 'Doctor').length;
    const receptionists = employees.filter((e) => e.role === 'Receptionist').length;
    const cashiers = employees.filter((e) => e.role === 'Cashier').length;
    const staff = employees.filter((e) => e.role === 'Staff').length;
    return { total, active, doctors, receptionists, cashiers, staff };
  }, [employees]);

  // Role style helper
  const getRoleBadgeStyle = (role: EmployeeRole) => {
    switch (role) {
      case 'Doctor':
        return {
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          avatarBg: 'bg-indigo-600 text-white',
          border: 'border-indigo-300',
          icon: <Stethoscope className="w-3.5 h-3.5" />,
          labelBn: 'ডাক্তার',
        };
      case 'Receptionist':
        return {
          bg: 'bg-purple-100 text-purple-800 border-purple-200',
          avatarBg: 'bg-purple-600 text-white',
          border: 'border-purple-300',
          icon: <UserCheck className="w-3.5 h-3.5" />,
          labelBn: 'রিসেপশনিস্ট',
        };
      case 'Cashier':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          avatarBg: 'bg-emerald-600 text-white',
          border: 'border-emerald-300',
          icon: <CreditCard className="w-3.5 h-3.5" />,
          labelBn: 'ক্যাশিয়ার',
        };
      case 'Staff':
      default:
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
          avatarBg: 'bg-amber-600 text-white',
          border: 'border-amber-300',
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
          labelBn: 'স্টাফ',
        };
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 font-sans text-xs">
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-white rounded-xl shadow-xs border border-blue-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Employee Management
              </h1>
              <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[11px]">
                কর্মকর্তা ও কর্মচারী
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Manage clinic doctors, receptionists, cashiers, and staff roles, records & login access
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center space-x-1.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New Employee (নতুন কর্মী যোগ করুন)</span>
          </button>
        </div>
      </div>

      {/* 2. STATS & KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold uppercase">
            <span>Total Employees</span>
            <Users className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900">{metrics.total}</span>
            <span className="text-[10px] font-bold text-emerald-600">{metrics.active} Active</span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-0.5">মোট কর্মরত স্টাফ</span>
        </div>

        <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-200 shadow-xs">
          <div className="flex items-center justify-between text-indigo-700 text-[10px] font-semibold uppercase">
            <span>Doctors</span>
            <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-indigo-950">{metrics.doctors}</span>
          </div>
          <span className="text-[9px] text-indigo-500 block mt-0.5">ডেন্টাল সার্জন</span>
        </div>

        <div className="bg-purple-50/80 p-3 rounded-xl border border-purple-200 shadow-xs">
          <div className="flex items-center justify-between text-purple-700 text-[10px] font-semibold uppercase">
            <span>Receptionists</span>
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-purple-950">{metrics.receptionists}</span>
          </div>
          <span className="text-[9px] text-purple-500 block mt-0.5">ফ্রন্ট ডেস্ক কর্মকর্তা</span>
        </div>

        <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-[10px] font-semibold uppercase">
            <span>Cashiers</span>
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-emerald-950">{metrics.cashiers}</span>
          </div>
          <span className="text-[9px] text-emerald-500 block mt-0.5">হিসাব ও ক্যাশ সহকারী</span>
        </div>

        <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-[10px] font-semibold uppercase">
            <span>Clinical Staff</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-amber-950">{metrics.staff}</span>
          </div>
          <span className="text-[9px] text-amber-600 block mt-0.5">চেয়ারসাইড অ্যাসিস্ট্যান্ট</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold uppercase">
            <span>Active Rate</span>
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-slate-800">
              {metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 0}%
            </span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-0.5">সক্রিয় কর্মচারী শতকরা</span>
        </div>
      </div>

      {/* 3. FILTER & TOOLBAR BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* ROLE TABS */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            {(['All', 'Doctor', 'Receptionist', 'Cashier', 'Staff'] as const).map((role) => {
              const isSelected = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {role === 'Doctor' && <Stethoscope className="w-3 h-3" />}
                  {role === 'Receptionist' && <UserCheck className="w-3 h-3" />}
                  {role === 'Cashier' && <CreditCard className="w-3 h-3" />}
                  {role === 'Staff' && <ShieldCheck className="w-3 h-3" />}
                  <span>{role === 'All' ? 'All Roles (সকল)' : role}</span>
                </button>
              );
            })}
          </div>

          {/* VIEW MODE TOGGLE & STATUS FILTER */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Status (সব স্ট্যাটাস)</option>
              <option value="Active">Active Only (সক্রিয়)</option>
              <option value="Inactive">Inactive Only (নিষ্ক্রিয়)</option>
            </select>

            <div className="border border-slate-200 rounded-lg p-0.5 bg-slate-100 flex items-center">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                  viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Grid
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH INPUT */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee by Name, Phone, Username, Role, Designation, or BMDC Reg..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. EMPLOYEE LIST (TABLE OR GRID) */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-2"></div>
          <p className="font-semibold text-xs">লোড হচ্ছে...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">কোনো কর্মচারী পাওয়া যায়নি</h3>
          <p className="text-slate-500 text-xs mt-1">
            নতুন কর্মচারী যোগ করতে উপরের &quot;+ Add New Employee&quot; বাটনে ক্লিক করুন।
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Employee Name</th>
                  <th className="py-2.5 px-3">Role & Designation</th>
                  <th className="py-2.5 px-3">Login Identifier</th>
                  <th className="py-2.5 px-3">Contact Info</th>
                  <th className="py-2.5 px-3">Joining Date</th>
                  <th className="py-2.5 px-3 text-right">Salary</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => {
                  const roleStyle = getRoleBadgeStyle(emp.role);
                  return (
                    <tr key={emp.id} className="hover:bg-blue-50/40 transition-colors group">
                      {/* Name & Avatar & Role */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-8 h-8 rounded-full ${roleStyle.avatarBg} flex items-center justify-center font-bold text-xs shadow-xs shrink-0`}
                          >
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {emp.name}
                            </div>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${roleStyle.bg}`}
                              >
                                {roleStyle.icon}
                                <span>{emp.role}</span>
                              </span>
                              {emp.bmdcReg && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  BMDC: {emp.bmdcReg}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{emp.designation}</div>
                        {emp.specialization && (
                          <div className="text-[10px] text-slate-500 line-clamp-1">
                            {emp.specialization}
                          </div>
                        )}
                      </td>

                      {/* Login Credentials */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1 text-blue-900 font-mono font-bold text-[11px] bg-blue-50 px-2 py-0.5 rounded w-fit border border-blue-100">
                          <Key className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>{emp.username ? `@${emp.username}` : emp.mobile}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Pass: {emp.password ? '••••••••' : 'সেট করা নেই'}
                        </div>
                      </td>

                      {/* Mobile & Email */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1 text-slate-700 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{emp.mobile}</span>
                        </div>
                        {emp.email && (
                          <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-0.5">
                            <Mail className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[140px]">{emp.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Joining Date */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                        <div className="flex items-center space-x-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{emp.joiningDate || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Salary */}
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                        {emp.salary ? `৳ ${emp.salary.toLocaleString()}` : '-'}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(emp)}
                          title="Click to toggle status"
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                            emp.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              emp.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          ></span>
                          <span>{emp.status}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingEmployee(emp)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                            title="View Employee Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(emp)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                            title="Edit Employee"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW (ID CARDS) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredEmployees.map((emp) => {
            const roleStyle = getRoleBadgeStyle(emp.role);
            return (
              <div
                key={emp.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-xl ${roleStyle.avatarBg} flex items-center justify-center font-bold text-sm shadow-xs`}
                      >
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{emp.name}</h4>
                        <span className="text-[11px] text-slate-500">{emp.designation}</span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${roleStyle.bg}`}
                    >
                      {roleStyle.icon}
                      <span>{emp.role}</span>
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-slate-600">
                    <div className="flex items-center justify-between bg-blue-50/70 px-2 py-1 rounded border border-blue-100 text-[11px]">
                      <span className="text-blue-700 flex items-center gap-1 font-semibold">
                        <Key className="w-3 h-3 text-blue-500" /> Login User:
                      </span>
                      <span className="font-mono font-bold text-blue-900">
                        {emp.username ? `@${emp.username}` : emp.mobile}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Mobile:
                      </span>
                      <span className="font-semibold text-slate-800">{emp.mobile}</span>
                    </div>

                    {emp.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Email:
                        </span>
                        <span className="text-slate-700 truncate max-w-[150px]">{emp.email}</span>
                      </div>
                    )}

                    {emp.bmdcReg && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <FileBadge className="w-3 h-3" /> BMDC Reg:
                        </span>
                        <span className="font-mono font-bold text-indigo-900">{emp.bmdcReg}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Joining:
                      </span>
                      <span>{emp.joiningDate || 'N/A'}</span>
                    </div>

                    {emp.salary ? (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> Salary:
                        </span>
                        <span className="font-bold text-slate-800">৳ {emp.salary.toLocaleString()}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(emp)}
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      emp.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        emp.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    ></span>
                    <span>{emp.status}</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setViewingEmployee(emp)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] flex items-center gap-1 transition"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(emp)}
                      className="p-1 text-slate-500 hover:text-indigo-600 rounded transition"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. CREATE / EDIT EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-300 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white px-5 py-3 flex justify-between items-center font-bold shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-sky-200" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">
                    {editingEmployeeId ? 'Edit Employee Record' : '+ Add New Employee'}
                  </h3>
                  <span className="text-xs text-sky-200 font-normal">
                    ক্লিনিক কর্মকর্তা ও কর্মচারী তথ্য ও সিস্টেম লগইন নিবন্ধন
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveEmployee} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* ROLE SELECTION CHIPS */}
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  Select Role (পদমর্যাদা নির্বাচন করুন) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { role: 'Doctor', labelBn: 'ডাক্তার', icon: <Stethoscope className="w-4 h-4" />, color: 'indigo' },
                      { role: 'Receptionist', labelBn: 'রিসেপশনিস্ট', icon: <UserCheck className="w-4 h-4" />, color: 'purple' },
                      { role: 'Cashier', labelBn: 'ক্যাশিয়ার', icon: <CreditCard className="w-4 h-4" />, color: 'emerald' },
                      { role: 'Staff', labelBn: 'ক্লিনিক্যাল স্টাফ', icon: <ShieldCheck className="w-4 h-4" />, color: 'amber' },
                    ] as const
                  ).map((r) => {
                    const isSelected = formData.role === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => handleRoleChange(r.role)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`p-1.5 rounded-lg ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {r.icon}
                          </span>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                          </span>
                        </div>
                        <div>
                          <div className={`font-bold text-xs ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                            {r.role}
                          </div>
                          <span className="text-[10px] text-slate-500 block">{r.labelBn}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BASIC DETAILS */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 sm:col-span-7">
                  <label className="font-bold text-slate-700 block mb-1">
                    Employee Name (সম্পূর্ণ নাম) <span className="text-red-500">*</span>
                  </label>
                    <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. কর্মচারীর পূর্ণ নাম"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="col-span-12 sm:col-span-5">
                  <label className="font-bold text-slate-700 block mb-1">
                    Designation (পদবি) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. ডেন্টাল সার্জন / ফ্রন্ট ডেস্ক অফিসার"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="col-span-12 sm:col-span-6">
                  <label className="font-bold text-slate-700 block mb-1">
                    Mobile Number (মোবাইল নম্বর) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="e.g. 01833-337888"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="col-span-12 sm:col-span-6">
                  <label className="font-bold text-slate-700 block mb-1">Email Address (ইমেইল)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="staff@ifradental.com"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* SYSTEM LOGIN CREDENTIALS SECTION */}
                <div className="col-span-12 bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-indigo-50/80 p-3.5 rounded-xl border border-blue-200 shadow-xs">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-blue-950">
                        System Login Credentials (সিস্টেম লগইন তথ্য ও পাসওয়ার্ড)
                      </h4>
                      <p className="text-[10px] text-blue-700">
                        এই ইউজারনেম + পাসওয়ার্ড অথবা মোবাইল নম্বর + পাসওয়ার্ড দিয়ে কর্মী সফটওয়্যারে লগইন করতে পারবেন।
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 mt-2">
                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">
                        Login Username (ইউজারনেম)
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) =>
                            setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })
                          }
                          placeholder="e.g. nahid বা doctor বা sadia"
                          className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-blue-300 rounded text-xs font-mono font-bold text-blue-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        (ঐচ্ছিক: ফাঁকা রাখলে মোবাইল নম্বর দিয়ে সরাসরি লগইন করতে পারবে)
                      </span>
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <label className="font-bold text-slate-700 block mb-1">
                        Login Password (লগইন পাসওয়ার্ড) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type={showFormPassword ? 'text' : 'password'}
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="পাসওয়ার্ড দিন (যেমন: pass@123)"
                          className="w-full pl-8 pr-8 py-1.5 bg-white border border-blue-300 rounded text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFormPassword(!showFormPassword)}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                          title={showFormPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                        >
                          {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        লগইন পাসওয়ার্ড (Login Password) - এটি দিয়ে কর্মী লগইন করবেন
                      </span>
                    </div>
                  </div>
                </div>

                {/* DOCTOR SPECIFIC FIELDS */}
                {formData.role === 'Doctor' && (
                  <>
                    <div className="col-span-12 sm:col-span-6 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-200">
                      <label className="font-bold text-indigo-950 block mb-1">
                        BMDC Reg Number (বিএমডিসি রেজি নং)
                      </label>
                      <input
                        type="text"
                        value={formData.bmdcReg}
                        onChange={(e) => setFormData({ ...formData, bmdcReg: e.target.value })}
                        placeholder="e.g. ৯৩২৭ / A-12345"
                        className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded text-xs font-bold text-indigo-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-200">
                      <label className="font-bold text-indigo-950 block mb-1">
                        Specialization & Degrees (ডিগ্রী ও অভিজ্ঞতা)
                      </label>
                      <input
                        type="text"
                        value={formData.specialization}
                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                        placeholder="e.g. BDS, PGT, Endodontics"
                        className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded text-xs focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </>
                )}

                <div className="col-span-6 sm:col-span-4">
                  <label className="font-bold text-slate-700 block mb-1">Joining Date (যোগদানের তারিখ)</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 font-semibold focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="col-span-6 sm:col-span-4">
                  <label className="font-bold text-slate-700 block mb-1">Monthly Salary (মাসিক বেতন - ৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.salary || ''}
                    onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-right font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="col-span-12 sm:col-span-4">
                  <label className="font-bold text-slate-700 block mb-1">Status (স্ট্যাটাস)</label>
                  <select
                    value={formData.status}
                    onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="Active">Active (সক্রিয়)</option>
                    <option value="Inactive">Inactive (নিষ্ক্রিয় / প্রাক্তন)</option>
                  </select>
                </div>

                <div className="col-span-12 sm:col-span-6">
                  <label className="font-bold text-slate-700 block mb-1">NID / Passport Number</label>
                  <input
                    type="text"
                    value={formData.nidOrPassport}
                    onChange={(e) => setFormData({ ...formData, nidOrPassport: e.target.value })}
                    placeholder="জাতীয় পরিচয়পত্র নম্বর"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="col-span-12 sm:col-span-6">
                  <label className="font-bold text-slate-700 block mb-1">Present Address (বর্তমান ঠিকানা)</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="খিলগাঁও, ঢাকা..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="col-span-12">
                  <label className="font-bold text-slate-700 block mb-1">Special Notes / Remarks (মন্তব্য)</label>
                  <textarea
                    rows={2}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="অন্যান্য তথ্য, দায়িত্ব বা কাজের সময়সূচি..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600 font-sans"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg text-xs shadow-sm flex items-center space-x-1.5 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingEmployeeId ? 'Update Employee' : 'Save Employee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. VIEW EMPLOYEE PROFILE MODAL */}
      {viewingEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-300 max-h-[90vh] flex flex-col">
            {/* Header */}
            {(() => {
              const roleStyle = getRoleBadgeStyle(viewingEmployee.role);
              return (
                <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-5 relative">
                  <button
                    type="button"
                    onClick={() => setViewingEmployee(null)}
                    className="absolute right-3 top-3 text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-14 h-14 rounded-2xl ${roleStyle.avatarBg} flex items-center justify-center text-xl font-black shadow-lg border-2 border-white/20`}
                    >
                      {viewingEmployee.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-extrabold text-white">{viewingEmployee.name}</h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${roleStyle.bg}`}
                        >
                          {roleStyle.icon}
                          <span>{viewingEmployee.role}</span>
                        </span>
                      </div>
                      <p className="text-xs text-sky-200 mt-0.5">{viewingEmployee.designation}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Mobile</span>
                  <span className="font-bold text-slate-900">{viewingEmployee.mobile}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Status</span>
                  <span
                    className={`font-bold inline-flex items-center gap-1 text-[11px] ${
                      viewingEmployee.status === 'Active' ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        viewingEmployee.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    ></span>
                    {viewingEmployee.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Email</span>
                  <span className="font-medium text-slate-700">{viewingEmployee.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Joining Date</span>
                  <span className="font-medium text-slate-700">{viewingEmployee.joiningDate || 'N/A'}</span>
                </div>
              </div>

              {viewingEmployee.role === 'Doctor' && (
                <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Doctor Credentials</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-indigo-600 font-semibold block">BMDC Reg No:</span>
                      <span className="font-mono font-bold text-indigo-900">
                        {viewingEmployee.bmdcReg || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-600 font-semibold block">Specialization:</span>
                      <span className="font-medium text-slate-800">
                        {viewingEmployee.specialization || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SYSTEM LOGIN ACCESS CREDENTIALS */}
              <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 space-y-2">
                <div className="text-[11px] font-bold text-blue-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    <span>System Login Credentials (সিস্টেম লগইন তথ্য)</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 font-semibold px-1.5 py-0.5 rounded">
                    Authorized
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Username (ইউজারনেম):</span>
                    <span className="font-mono font-bold text-blue-900">
                      {viewingEmployee.username ? `@${viewingEmployee.username}` : '(খালি - মোবাইল দিয়ে লগইন)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Password (পাসওয়ার্ড):</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-slate-800">
                        {showViewingPassword ? (viewingEmployee.password || 'সেট করা নেই') : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowViewingPassword(!showViewingPassword)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        title={showViewingPassword ? 'Hide password' : 'Show password'}
                      >
                        {showViewingPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-blue-800 bg-white/70 p-1.5 rounded border border-blue-100">
                  💡 কর্মী <strong>{viewingEmployee.username || viewingEmployee.mobile}</strong> অথবা <strong>{viewingEmployee.mobile}</strong> এবং তার পাসওয়ার্ড দিয়ে সফটওয়্যারে লগইন করতে পারবেন।
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-3">
                {viewingEmployee.salary ? (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">মাসিক বেতন / সম্মানী:</span>
                    <span className="font-bold text-slate-900">৳ {viewingEmployee.salary.toLocaleString()}</span>
                  </div>
                ) : null}

                {viewingEmployee.nidOrPassport && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">এনআইডি / পাসপোর্ট:</span>
                    <span className="font-medium text-slate-800">{viewingEmployee.nidOrPassport}</span>
                  </div>
                )}

                {viewingEmployee.address && (
                  <div className="flex justify-between items-start py-1 border-b border-slate-100">
                    <span className="text-slate-500">ঠিকানা:</span>
                    <span className="font-medium text-slate-800 text-right max-w-[250px]">
                      {viewingEmployee.address}
                    </span>
                  </div>
                )}

                {viewingEmployee.note && (
                  <div className="pt-2">
                    <span className="text-slate-500 block mb-0.5">মন্তব্য / নোট:</span>
                    <p className="bg-slate-50 p-2 rounded border border-slate-200 text-slate-700 italic">
                      {viewingEmployee.note}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const emp = viewingEmployee;
                  setViewingEmployee(null);
                  handleOpenEditModal(emp);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingEmployee(null)}
                className="px-4 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold rounded-lg text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
