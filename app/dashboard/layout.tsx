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

  // Construct profile from user metadata
  const profile: Profile = {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || 'User',
    role: user.user_metadata?.role || USER_ROLES.MAKER,
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at || new Date().toISOString(),
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
