'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/lib/types';
import { USER_ROLES } from '@/lib/constants';

// Types
interface DashboardContextValue {
  profile: Profile;
  isMaker: boolean;
  isChecker: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  refreshData: () => void;
}

interface DashboardProviderProps {
  children: React.ReactNode;
  profile: Profile;
}

// Context
const DashboardContext = createContext<DashboardContextValue | null>(null);

// Provider Component
export function DashboardProvider({ children, profile }: DashboardProviderProps) {
  const router = useRouter();

  const isMaker = profile.role === USER_ROLES.MAKER;
  const isChecker = profile.role === USER_ROLES.CHECKER;
  const isAdmin = profile.role === USER_ROLES.ADMIN;
  const isSuperAdmin = profile.role === USER_ROLES.SUPERADMIN;

  const refreshData = useCallback(() => {
    router.refresh();
  }, [router]);

  const value = useMemo<DashboardContextValue>(
    () => ({
      profile,
      isMaker,
      isChecker,
      isAdmin,
      isSuperAdmin,
      refreshData,
    }),
    [profile, isMaker, isChecker, isAdmin, isSuperAdmin, refreshData]
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

// Hook
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

// Selector hooks for specific values to minimize re-renders
export function useProfile() {
  const { profile } = useDashboard();
  return profile;
}

export function useUserRole() {
  const { isMaker, isChecker, isAdmin, isSuperAdmin, profile } = useDashboard();
  return { role: profile.role, isMaker, isChecker, isAdmin, isSuperAdmin };
}
