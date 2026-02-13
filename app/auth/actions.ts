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
    .select('role, kyc_completed')
    .eq('id', user!.id)
    .single();

  const role = (profile?.role || user?.user_metadata?.role || 'maker') as UserRole;

  // For superadmins, redirect to admin dashboard
  if (role === 'superadmin') {
    redirect('/dashboard/admin');
  }

  // For checkers and admins, redirect directly to checker dashboard
  if (role === 'checker' || role === 'admin') {
    redirect('/dashboard/checker');
  }

  if (!profile?.kyc_completed) {
    // Check if there's an existing KYC application
    const { data: kycApp } = await supabase
      .from('kyc_applications')
      .select('kyc_status')
      .eq('user_id', user!.id)
      .single();

    if (!kycApp) {
      redirect('/auth/onboarding');
    } else if (kycApp.kyc_status !== 'approved') {
      redirect('/auth/kyc-pending');
    }
  }

  redirect('/dashboard/maker');
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
