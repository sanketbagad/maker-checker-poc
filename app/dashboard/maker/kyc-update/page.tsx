import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { TABLES } from '@/lib/constants';
import KycUpdateClient from './kyc-update-client';

export default async function KycUpdatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch the user's current KYC application
  const { data: kycApplication, error } = await supabase
    .from(TABLES.KYC_APPLICATIONS)
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !kycApplication) {
    redirect('/auth/onboarding');
  }

  return <KycUpdateClient kycApplication={kycApplication} />;
}
