-- Maker-Checker Banking Control System Schema
-- Drop existing tables if they exist (for clean re-run)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.policy_violations CASCADE;
DROP TABLE IF EXISTS public.blacklist CASCADE;
DROP TABLE IF EXISTS public.policy_rules CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS violation_severity CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles with roles (Maker or Checker)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('maker', 'checker', 'admin')) DEFAULT 'maker',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('fund_transfer', 'payment_approval', 'account_change', 'loan_approval')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  source_account TEXT NOT NULL,
  destination_account TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  checked_by UUID REFERENCES auth.users(id),
  checker_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy rules configuration
CREATE TABLE IF NOT EXISTS public.policy_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('amount_threshold', 'duplicate_detection', 'blacklist_check', 'time_based')),
  threshold_value DECIMAL(15, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy violations detected
CREATE TABLE IF NOT EXISTS public.policy_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.policy_rules(id),
  violation_details TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blacklist entries
CREATE TABLE IF NOT EXISTS public.blacklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_number TEXT NOT NULL,
  entity_name TEXT,
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log for all actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for transactions
CREATE POLICY "Users can view all transactions" ON public.transactions
  FOR SELECT USING (true);

CREATE POLICY "Makers can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Checkers can update transactions" ON public.transactions
  FOR UPDATE USING (true);

-- RLS Policies for policy_rules
CREATE POLICY "Anyone can view policy rules" ON public.policy_rules
  FOR SELECT USING (true);

CREATE POLICY "Anyone can modify policy rules" ON public.policy_rules
  FOR ALL USING (true);

-- RLS Policies for policy_violations
CREATE POLICY "Users can view all violations" ON public.policy_violations
  FOR SELECT USING (true);

CREATE POLICY "System can insert violations" ON public.policy_violations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Checkers can update violations" ON public.policy_violations
  FOR UPDATE USING (true);

-- RLS Policies for blacklist
CREATE POLICY "Users can view blacklist" ON public.blacklist
  FOR SELECT USING (true);

CREATE POLICY "Users can manage blacklist" ON public.blacklist
  FOR ALL USING (true);

-- RLS Policies for audit_logs
CREATE POLICY "Users can view audit logs" ON public.audit_logs
  FOR SELECT USING (true);

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Trigger function to auto-create profile on signup
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

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default policy rules
INSERT INTO public.policy_rules (rule_name, description, rule_type, threshold_value, is_active) VALUES
  ('High Amount Threshold', 'Flag transactions above $10,000', 'amount_threshold', 10000, true),
  ('Very High Amount Threshold', 'Flag transactions above $50,000 - requires escalation', 'amount_threshold', 50000, true),
  ('Duplicate Detection', 'Detect potential duplicate transactions within 24 hours', 'duplicate_detection', NULL, true),
  ('After Hours Transaction', 'Flag transactions created outside business hours (9AM-6PM)', 'time_based', NULL, true),
  ('Blacklist Check', 'Flag transactions involving blacklisted accounts', 'blacklist_check', NULL, true);

-- Insert sample blacklist entries
INSERT INTO public.blacklist (account_number, entity_name, reason, is_active) VALUES
  ('9999999999', 'Known Fraud Account', 'Previously involved in fraudulent activities', true),
  ('8888888888', 'Suspicious Entity Corp', 'Under investigation for money laundering', true),
  ('7777777777', 'Blocked Trading Co', 'Sanctioned entity', true);
