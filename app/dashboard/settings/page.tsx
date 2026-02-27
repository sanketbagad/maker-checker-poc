import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsClient } from './settings-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, mfa_enabled')
    .eq('id', user.id)
    .single();

  return (
    <SettingsClient
      profile={{
        id: user.id,
        email: user.email || profile?.email || '',
        fullName: profile?.full_name || '',
        role: profile?.role || 'maker',
        mfaEnabled: profile?.mfa_enabled ?? false,
      }}
    />
  );
}
