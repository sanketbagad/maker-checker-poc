'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserType, type UserRole } from '@/lib/types';

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  // Registration is only for makers - checkers and admins are created by admin
  const role = UserType.MAKER;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      data: {
        full_name: fullName,
        role: role,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/auth/sign-up-success');
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Get user role to redirect to appropriate dashboard
  const { data: { user } } = await supabase.auth.getUser();

  // Read role from profiles table (source of truth) instead of user_metadata
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, kyc_completed, mfa_enabled')
    .eq('id', user!.id)
    .single();

  // If MFA is enabled, don't redirect yet — return mfa_required
  if (profile?.mfa_enabled) {
    return { mfa_required: true };
  }

  return completeSignInRedirect(user!, profile);
}

/**
 * After MFA verification, determine the redirect destination.
 * Returns { redirectTo } instead of calling redirect() so the
 * client can navigate via router.push().
 */
export async function completeSignIn(): Promise<{ redirectTo?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Session expired' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, kyc_completed')
    .eq('id', user.id)
    .single();

  return { redirectTo: await getSignInDestination(user, profile) };
}

async function getSignInDestination(
  user: { id: string; user_metadata: Record<string, any> },
  profile: { role: string; kyc_completed: boolean } | null
): Promise<string> {
  const role = (profile?.role || user.user_metadata?.role || 'maker') as UserRole;

  if (role === 'superadmin') return '/dashboard/admin';
  if (role === 'checker' || role === 'admin') return '/dashboard/checker';

  if (!profile?.kyc_completed) {
    const supabase = await createClient();
    const { data: kycApp } = await supabase
      .from('kyc_applications')
      .select('kyc_status')
      .eq('user_id', user.id)
      .single();

    if (!kycApp) return '/auth/onboarding';
    if (kycApp.kyc_status !== 'approved') return '/auth/kyc-pending';
  }

  return '/dashboard/maker';
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}
