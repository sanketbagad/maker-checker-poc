import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TABLES, KYC_STATUS } from '@/lib/constants';
import KycReviewClient from './kyc-review-client'

async function getKycStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [
    { count: pendingCount },
    { count: underReviewCount },
    { count: approvedCount },
    { count: rejectedCount },
  ] = await Promise.all([
    supabase
      .from(TABLES.KYC_APPLICATIONS)
      .select('*', { count: 'exact', head: true })
      .eq('kyc_status', KYC_STATUS.PENDING),
    supabase
      .from(TABLES.KYC_APPLICATIONS)
      .select('*', { count: 'exact', head: true })
      .eq('kyc_status', KYC_STATUS.UNDER_REVIEW),
    supabase
      .from(TABLES.KYC_APPLICATIONS)
      .select('*', { count: 'exact', head: true })
      .eq('kyc_status', KYC_STATUS.APPROVED),
    supabase
      .from(TABLES.KYC_APPLICATIONS)
      .select('*', { count: 'exact', head: true })
      .eq('kyc_status', KYC_STATUS.REJECTED),
  ]);

  return {
    pendingCount: pendingCount || 0,
    underReviewCount: underReviewCount || 0,
    approvedCount: approvedCount || 0,
    rejectedCount: rejectedCount || 0,
  };
}

async function getPendingKycApplications(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: applications } = await supabase
    .from(TABLES.KYC_APPLICATIONS)
    .select('*')
    .in('kyc_status', [KYC_STATUS.PENDING, KYC_STATUS.UNDER_REVIEW])
    .order('created_at', { ascending: true })
    .limit(20);

  return applications || [];
}

export default async function KycReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if user is a checker or admin
  const { data: profile } = await supabase
    .from(TABLES.PROFILES)
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['checker', 'admin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  const [stats, applications] = await Promise.all([
    getKycStats(supabase),
    getPendingKycApplications(supabase),
  ]);

  return <KycReviewClient initialStats={stats} initialApplications={applications} />;
}
