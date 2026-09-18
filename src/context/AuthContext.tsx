'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { seedInitialDataIfNeeded } from '@/lib/db';

interface User {
  username: string;
  name: string;
  role: 'doctor' | 'staff' | 'admin';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingSplash: boolean;
  skipSplash: () => void;
  login: (username: string, password: string, role: 'doctor' | 'staff' | 'admin') => Promise<boolean>;
  logout: () => void;
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

  const login = async (username: string, password: string, role: 'doctor' | 'staff' | 'admin'): Promise<boolean> => {
    // Offline authentication check
    if ((username.toLowerCase() === 'doctor' && password === '1234') ||
        (username.toLowerCase() === 'admin' && password === 'admin') ||
        (username.toLowerCase() === 'staff' && password === '1234') ||
        (password === '1234')) {
      
      const loggedUser: User = {
        username,
        name: role === 'doctor' ? 'ডা. নাহিদ হাসান (BDS, BCS)' : 'Clinic Administrator',
        role,
      };

      setUser(loggedUser);
      localStorage.setItem('dentist_pro_user', JSON.stringify(loggedUser));
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dentist_pro_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoadingSplash, skipSplash, login, logout }}>
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
