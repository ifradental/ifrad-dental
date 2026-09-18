'use client';

import { useEffect } from 'react';
import { seedInitialDataIfNeeded } from '@/lib/db';

export function ClientInit() {
  useEffect(() => {
    seedInitialDataIfNeeded().catch(console.error);
  }, []);

  return null;
}

