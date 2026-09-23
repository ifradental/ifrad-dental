'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoginScreen } from '@/components/auth/LoginScreen';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoadingSplash } = useAuth();

  useEffect(() => {
    if (!isLoadingSplash && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoadingSplash, router]);

  return <LoginScreen />;
}

