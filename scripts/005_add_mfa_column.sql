-- ============================================================================
-- Add mfa_enabled column to profiles
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add the column (safe to re-run — IF NOT EXISTS is implicit with DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'mfa_enabled'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
END
$$;
