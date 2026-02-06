-- KYC Application Schema for Maker-Checker Banking Control System

-- Drop existing table if exists (for clean re-run)
DROP TABLE IF EXISTS public.kyc_applications CASCADE;

-- KYC Status enum-like constraint
-- 'pending' - Application submitted, waiting for checker review
-- 'approved' - Application approved by checker
-- 'rejected' - Application rejected by checker
-- 'under_review' - Application is being reviewed

-- Account Type constraint
-- 'savings' - Savings account
-- 'current' - Current account
-- 'salary' - Salary account

-- KYC Applications table
CREATE TABLE IF NOT EXISTS public.kyc_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id TEXT UNIQUE NOT NULL DEFAULT ('KYC-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Personal Information (Required)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE NOT NULL,
  pan TEXT NOT NULL CHECK (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
  aadhaar TEXT NOT NULL CHECK (aadhaar ~ '^\d{12}$'),
  
  -- Account Details (Required)
  account_type TEXT NOT NULL CHECK (account_type IN ('savings', 'current', 'salary')),
  identity TEXT, -- Additional identity document reference (Optional)
  
  -- Contact Information (Required)
  mobile TEXT NOT NULL CHECK (mobile ~ '^\d{10}$'),
  email TEXT NOT NULL,
  
  -- Address Information
  address_current TEXT NOT NULL,
  address_permanent TEXT, -- Optional: defaults to current address
  
  -- Employment & Financial Information (Optional)
  occupation TEXT,
  annual_income TEXT CHECK (annual_income IS NULL OR annual_income IN ('below_2.5L', '2.5L_5L', '5L_10L', '10L_25L', '25L_50L', 'above_50L')),
  
  -- Regulatory Information
  pep BOOLEAN DEFAULT false, -- Politically Exposed Person
  
  -- Nominee Information (Optional - can be added later)
  nominee_name TEXT,
  nominee_relation TEXT,
  nominee_dob DATE,
  
  -- KYC Status
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected', 'under_review')),
  checker_id UUID REFERENCES auth.users(id),
  checker_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  
  -- Account Balance (set after approval)
  balance DECIMAL(15, 2) DEFAULT 0.00,
  available DECIMAL(15, 2) DEFAULT 0.00,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add kyc_completed column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_completed BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_kyc_applications_user_id ON public.kyc_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_applications_status ON public.kyc_applications(kyc_status);
CREATE INDEX IF NOT EXISTS idx_kyc_applications_checker_id ON public.kyc_applications(checker_id);

-- Enable Row Level Security
ALTER TABLE public.kyc_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kyc_applications
-- Users can view their own KYC application
CREATE POLICY "Users can view their own KYC application" ON public.kyc_applications
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('checker', 'admin')
  ));

-- Users can insert their own KYC application
CREATE POLICY "Users can insert their own KYC application" ON public.kyc_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending KYC application
CREATE POLICY "Users can update their own pending KYC application" ON public.kyc_applications
  FOR UPDATE USING (
    (auth.uid() = user_id AND kyc_status = 'pending') OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('checker', 'admin'))
  );

-- Checkers and admins can update any KYC application
CREATE POLICY "Checkers can review KYC applications" ON public.kyc_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('checker', 'admin'))
  );

-- Function to update profile's kyc_completed status
CREATE OR REPLACE FUNCTION public.handle_kyc_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kyc_status = 'approved' AND OLD.kyc_status != 'approved' THEN
    UPDATE public.profiles
    SET kyc_completed = true, updated_at = NOW()
    WHERE id = NEW.user_id;
  ELSIF NEW.kyc_status != 'approved' AND OLD.kyc_status = 'approved' THEN
    UPDATE public.profiles
    SET kyc_completed = false, updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for KYC approval
DROP TRIGGER IF EXISTS on_kyc_status_change ON public.kyc_applications;
CREATE TRIGGER on_kyc_status_change
  BEFORE UPDATE ON public.kyc_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_kyc_approval();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_kyc_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
