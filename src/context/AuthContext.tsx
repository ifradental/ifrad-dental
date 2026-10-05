'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, seedInitialDataIfNeeded, type Employee } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { logActivity } from '@/lib/activityLogger';

export interface User {
  username: string;
  name: string;
  role: 'doctor' | 'staff' | 'admin' | 'receptionist' | 'cashier' | string;
  employeeId?: string;
  designation?: string;
  mobile?: string;
  email?: string;
  avatar?: string;
}

export type ClinicalDepartment = 'all' | 'dental' | 'physiotherapy';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingSplash: boolean;
  activeDepartment: ClinicalDepartment;
  setDepartment: (dept: ClinicalDepartment) => void;
  toggleDepartment: () => void;
  skipSplash: () => void;
  login: (usernameOrMobile: string, password: string, fallbackRole?: 'doctor' | 'staff' | 'admin' | string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingSplash, setIsLoadingSplash] = useState<boolean>(true);
  const [activeDepartment, setActiveDepartmentState] = useState<ClinicalDepartment>('all');

  const setDepartment = (dept: ClinicalDepartment) => {
    setActiveDepartmentState(dept);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ifrad_active_dept', dept);
      window.dispatchEvent(new CustomEvent('ifrad_dept_changed', { detail: dept }));
    }
  };

  const toggleDepartment = () => {
    const nextDept: ClinicalDepartment =
      activeDepartment === 'all'
        ? 'dental'
        : activeDepartment === 'dental'
        ? 'physiotherapy'
        : 'all';
    setDepartment(nextDept);
  };

  const skipSplash = () => setIsLoadingSplash(false);

  useEffect(() => {
    // Check saved department
    if (typeof window !== 'undefined') {
      const savedDept = localStorage.getItem('ifrad_active_dept') as ClinicalDepartment;
      if (savedDept === 'physiotherapy' || savedDept === 'dental' || savedDept === 'all') {
        setActiveDepartmentState(savedDept);
      }
    }

    // Check if user session was remembered in local storage
    const savedUser = localStorage.getItem('dentist_pro_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }

    // Fast non-blocking background DB initialization
    seedInitialDataIfNeeded().catch(console.warn);

    // Guaranteed instant 200ms splash dismissal
    const timer = setTimeout(() => {
      setIsLoadingSplash(false);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  const login = async (
    usernameOrMobile: string,
    password: string,
    fallbackRole?: 'doctor' | 'staff' | 'admin' | string
  ): Promise<boolean> => {
    const cleanInput = (usernameOrMobile || '').trim().toLowerCase();
    const rawMobile = (usernameOrMobile || '').trim().replace(/[-\s]/g, '');

    if (!cleanInput) return false;

    try {
      // 1. Check in Dexie DB employees table
      let allEmployees = await db.employees.toArray();
      const findMatch = (list: typeof allEmployees) =>
        list.find((e) => {
          const empUser = (e.username || '').trim().toLowerCase();
          const empMobile = (e.mobile || '').trim();
          const empMobileDigits = empMobile.replace(/[-\s]/g, '');
          const empEmail = (e.email || '').trim().toLowerCase();

          const isUserMatch = Boolean(empUser && empUser === cleanInput);
          const isMobileMatch = Boolean(
            empMobile && (empMobile === usernameOrMobile.trim() || empMobileDigits === rawMobile)
          );
          const isEmailMatch = Boolean(empEmail && empEmail === cleanInput);

          return isUserMatch || isMobileMatch || isEmailMatch;
        });

      let matchedEmp = findMatch(allEmployees);

      if (!matchedEmp) {
        // Pull latest employees from MongoDB in case registered from another browser
        await syncEngine.pullUpdates().catch(() => {});
        allEmployees = await db.employees.toArray();
        matchedEmp = findMatch(allEmployees);
      }

      if (matchedEmp) {
        if (matchedEmp.status === 'Inactive') {
          throw new Error('এই অ্যাকাউন্টটি নিষ্ক্রিয় (Inactive) রয়েছে! অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।');
        }

        // Strictly verify password set by admin in Employee Management
        if (matchedEmp.password && password === matchedEmp.password) {
          const roleMapped = matchedEmp.role.toLowerCase();
          const loggedUser: User = {
            username: matchedEmp.username || matchedEmp.mobile,
            name: matchedEmp.name,
            role: roleMapped,
            employeeId: matchedEmp.id,
            designation: matchedEmp.designation,
            mobile: matchedEmp.mobile,
            email: matchedEmp.email,
            avatar: matchedEmp.avatar,
          };

          setUser(loggedUser);
          localStorage.setItem('dentist_pro_user', JSON.stringify(loggedUser));

          // Log Login Activity
          logActivity({
            action: 'LOGIN',
            module: 'Auth',
            description: `${loggedUser.name} (${loggedUser.designation || loggedUser.role}) সফলভাবে সিস্টেমে লগইন করেছেন`,
            user: loggedUser,
            metadata: { username: loggedUser.username, role: loggedUser.role },
          });

          return true;
        } else {
          return false;
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Inactive')) {
        throw err;
      }
      console.warn('DB lookup error in login:', err);
    }

    // 2. Master Clinic Administrator access fallback only if NO admin exists in db.employees
    const adminRecordExists = await db.employees.where('role').equals('Admin').count();
    const empAdmin = await db.employees.get('emp_admin');
    if (!empAdmin && adminRecordExists === 0 && cleanInput === 'admin' && password === 'admin') {
      const initialAdmin: Employee = {
        id: 'emp_admin',
        name: 'Clinic Administrator',
        username: 'admin',
        password: 'admin',
        mobile: '01800000000',
        email: 'admin@ifradental.com',
        role: 'Admin',
        designation: 'Clinic Administrator',
        joiningDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.employees.put(initialAdmin);
      await syncEngine.logMutation('employees', 'INSERT', initialAdmin.id, initialAdmin);
      syncEngine.triggerSync().catch(console.warn);

      const loggedUser: User = {
        username: 'admin',
        name: 'Clinic Administrator',
        role: 'admin',
        employeeId: 'emp_admin',
        mobile: '01800000000',
        email: 'admin@ifradental.com',
        designation: 'Clinic Administrator',
      };

      setUser(loggedUser);
      localStorage.setItem('dentist_pro_user', JSON.stringify(loggedUser));

      logActivity({
        action: 'LOGIN',
        module: 'Auth',
        description: 'সিস্টেম অ্যাডমিনিস্ট্রেটর হিসেবে লগইন করা হয়েছে',
        user: loggedUser,
      });

      return true;
    }

    return false;
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      const current = prev || {
        username: 'admin',
        name: 'Clinic Administrator',
        role: 'admin',
      };
      const updated: User = { ...current, ...updatedFields };
      localStorage.setItem('dentist_pro_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    if (user) {
      logActivity({
        action: 'LOGOUT',
        module: 'Auth',
        description: `${user.name} (${user.designation || user.role}) সিস্টেম থেকে লগআউট করেছেন`,
        user,
      });
    }
    setUser(null);
    localStorage.removeItem('dentist_pro_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingSplash,
        activeDepartment,
        setDepartment,
        toggleDepartment,
        skipSplash,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
