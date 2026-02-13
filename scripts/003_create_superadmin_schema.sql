-- SuperAdmin Schema Migration
-- Adds 'superadmin' role support to the banking control system
-- Run this AFTER 001_create_schema.sql and 002_create_kyc_schema.sql

-- ============================================================================
-- 1. Update profiles table role constraint to include 'superadmin'
-- ============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('maker', 'checker', 'admin', 'superadmin'));

-- ============================================================================
-- 2. Update the handle_new_user() trigger to support superadmin role
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'maker')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. Update KYC RLS policies to allow superadmin access
--    (original policies from 002 only include checker, admin)
-- ============================================================================

-- SELECT: Users can view own KYC OR checker/admin/superadmin can view all
DROP POLICY IF EXISTS "Users can view their own KYC application" ON public.kyc_applications;
CREATE POLICY "Users can view their own KYC application" ON public.kyc_applications
  FOR SELECT USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('checker', 'admin', 'superadmin')
    )
  );

-- UPDATE: Users can update own pending KYC OR checker/admin/superadmin can update any
DROP POLICY IF EXISTS "Users can update their own pending KYC application" ON public.kyc_applications;
CREATE POLICY "Users can update their own pending KYC application" ON public.kyc_applications
  FOR UPDATE USING (
    (auth.uid() = user_id AND kyc_status = 'pending') 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('checker', 'admin', 'superadmin')
    )
  );

-- UPDATE: Checkers/admins/superadmins can review any KYC application
DROP POLICY IF EXISTS "Checkers can review KYC applications" ON public.kyc_applications;
CREATE POLICY "Checkers can review KYC applications" ON public.kyc_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('checker', 'admin', 'superadmin')
    )
  );

-- ============================================================================
-- 4. Update profiles RLS policies for superadmin
--    (original from 001: SELECT=all, UPDATE=own only, INSERT=own only)
-- ============================================================================

-- SuperAdmin can update any profile (e.g. change roles, deactivate)
DROP POLICY IF EXISTS "Superadmin can update any profile" ON public.profiles;
CREATE POLICY "Superadmin can update any profile" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- SuperAdmin can delete profiles (deactivate users)
DROP POLICY IF EXISTS "Superadmin can delete profiles" ON public.profiles;
CREATE POLICY "Superadmin can delete profiles" ON public.profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- SuperAdmin can insert profiles (for admin-created users via service role)
DROP POLICY IF EXISTS "Superadmin can insert profiles" ON public.profiles;
CREATE POLICY "Superadmin can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- ============================================================================
-- 5. Update transactions RLS for superadmin oversight
--    (original from 001: SELECT=all, INSERT=created_by, UPDATE=all)
--    Already sufficient — superadmin can view/update all. No changes needed.
-- ============================================================================

-- ============================================================================
-- 6. Update policy_rules, policy_violations, blacklist, audit_logs RLS
--    (original from 001: all permissive — SELECT/ALL = true)
--    Already sufficient — superadmin has full access. No changes needed.
-- ============================================================================

-- ============================================================================
-- 7. Seed superadmin: update existing profile if user already signed up
-- ============================================================================
-- If the user already exists in profiles, set their role to superadmin.
-- If the user doesn't exist yet, use the seed script (scripts/seed-superadmin.ts)
-- to create them via the Supabase Admin API.
UPDATE public.profiles SET role = 'superadmin' WHERE email = 'sanketbagad486@gmail.com';

-- Also update auth.users metadata so it stays in sync
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb), 
  '{role}', 
  '"superadmin"'
)
WHERE email = 'sanketbagad486@gmail.com';
