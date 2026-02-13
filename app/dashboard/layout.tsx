import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardProvider } from '@/contexts/dashboard-context';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import type { Profile } from '@/lib/types';
import { USER_ROLES } from '@/lib/constants';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Read profile from DB (source of truth for role)
  const { data: dbProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const profile: Profile = {
    id: user.id,
    email: dbProfile?.email || user.email || '',
    full_name: dbProfile?.full_name || user.user_metadata?.full_name || 'User',
    role: dbProfile?.role || user.user_metadata?.role || USER_ROLES.MAKER,
    is_active: dbProfile?.is_active ?? true,
    kyc_completed: dbProfile?.kyc_completed ?? false,
    created_at: dbProfile?.created_at || user.created_at || new Date().toISOString(),
    updated_at: dbProfile?.updated_at || user.updated_at || new Date().toISOString(),
  };

  return (
    <DashboardProvider profile={profile}>
      <div className="min-h-screen bg-background">
        <DashboardSidebar profile={profile} />
        <div className="lg:pl-72">
          <DashboardHeader profile={profile} />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </DashboardProvider>
  );
}
