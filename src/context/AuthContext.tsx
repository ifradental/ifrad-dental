'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, seedInitialDataIfNeeded, type Employee } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';

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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingSplash: boolean;
  skipSplash: () => void;
  login: (usernameOrMobile: string, password: string, fallbackRole?: 'doctor' | 'staff' | 'admin' | string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingSplash, setIsLoadingSplash] = useState<boolean>(true);

  const skipSplash = () => setIsLoadingSplash(false);

  useEffect(() => {
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
      const allEmployees = await db.employees.toArray();
      const matchedEmp = allEmployees.find((e) => {
        const empUser = (e.username || '').trim().toLowerCase();
        const empMobile = (e.mobile || '').trim();
        const empMobileDigits = empMobile.replace(/[-\s]/g, '');
        const empEmail = (e.email || '').trim().toLowerCase();

        const isUserMatch = Boolean(empUser && empUser === cleanInput);
        const isMobileMatch = Boolean(empMobile && (empMobile === usernameOrMobile.trim() || empMobileDigits === rawMobile));
        const isEmailMatch = Boolean(empEmail && empEmail === cleanInput);

        return isUserMatch || isMobileMatch || isEmailMatch;
      });

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
    setUser(null);
    localStorage.removeItem('dentist_pro_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoadingSplash, skipSplash, login, logout, updateUser }}>
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
