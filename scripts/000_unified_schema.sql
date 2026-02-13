-- ============================================================================
-- SecureControl Banking System — Unified Schema
-- ============================================================================
-- Single source of truth. Run this for a clean database setup.
-- Replaces: 001_create_schema.sql, 002_create_kyc_schema.sql, 003_create_superadmin_schema.sql
-- ============================================================================

-- ============================================================================
-- 0. Clean slate
-- ============================================================================
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.policy_violations CASCADE;
DROP TABLE IF EXISTS public.blacklist CASCADE;
DROP TABLE IF EXISTS public.policy_rules CASCADE;
DROP TABLE IF EXISTS public.kyc_applications CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS violation_severity CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES — user accounts linked to Supabase Auth
-- ============================================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'maker'
                CHECK (role IN ('maker', 'checker', 'admin', 'superadmin')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  kyc_completed BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- 2. TRANSACTIONS
-- ============================================================================
CREATE TABLE public.transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_type    TEXT NOT NULL
                        CHECK (transaction_type IN ('fund_transfer','payment_approval','account_change','loan_approval')),
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected','flagged')),
  amount              DECIMAL(15,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  description         TEXT,
  source_account      TEXT NOT NULL,
  destination_account TEXT NOT NULL,
  created_by          UUID NOT NULL REFERENCES auth.users(id),
  checked_by          UUID REFERENCES auth.users(id),
  checker_notes       TEXT,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_created_by ON public.transactions(created_by);
CREATE INDEX idx_transactions_status     ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);

-- ============================================================================
-- 3. POLICY RULES
-- ============================================================================
CREATE TABLE public.policy_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name       TEXT NOT NULL,
  description     TEXT,
  rule_type       TEXT NOT NULL
                    CHECK (rule_type IN ('amount_threshold','duplicate_detection','blacklist_check','time_based')),
  threshold_value DECIMAL(15,2),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. POLICY VIOLATIONS
-- ============================================================================
CREATE TABLE public.policy_violations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id    UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  rule_id           UUID REFERENCES public.policy_rules(id),
  violation_details TEXT NOT NULL,
  severity          TEXT NOT NULL
                      CHECK (severity IN ('low','medium','high','critical')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_violations_transaction ON public.policy_violations(transaction_id);

-- ============================================================================
-- 5. BLACKLIST
-- ============================================================================
CREATE TABLE public.blacklist (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_number TEXT NOT NULL,
  entity_name    TEXT,
  reason         TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blacklist_account ON public.blacklist(account_number);

-- ============================================================================
-- 6. AUDIT LOGS
-- ============================================================================
CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user    ON public.audit_logs(user_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_action  ON public.audit_logs(action);

-- ============================================================================
-- 7. KYC APPLICATIONS
-- ============================================================================
CREATE TABLE public.kyc_applications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id   TEXT UNIQUE NOT NULL
                     DEFAULT ('KYC-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(FLOOR(RANDOM()*999999)::TEXT, 6, '0')),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  dob              DATE NOT NULL,
  pan              TEXT NOT NULL CHECK (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
  aadhaar          TEXT NOT NULL CHECK (aadhaar ~ '^\d{12}$'),

  -- Account
  account_type     TEXT NOT NULL CHECK (account_type IN ('savings','current','salary')),
  identity         TEXT,

  -- Contact
  mobile           TEXT NOT NULL CHECK (mobile ~ '^\d{10}$'),
  email            TEXT NOT NULL,

  -- Address
  address_current  TEXT NOT NULL,
  address_permanent TEXT,

  -- Employment
  occupation       TEXT,
  annual_income    TEXT CHECK (annual_income IS NULL OR annual_income IN (
                     'below_2.5L','2.5L_5L','5L_10L','10L_25L','25L_50L','above_50L')),
  pep              BOOLEAN NOT NULL DEFAULT false,

  -- Nominee
  nominee_name     TEXT,
  nominee_relation TEXT,
  nominee_dob      DATE,

  -- Review
  kyc_status       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (kyc_status IN ('pending','approved','rejected','under_review')),
  checker_id       UUID REFERENCES auth.users(id),
  checker_notes    TEXT,
  reviewed_at      TIMESTAMPTZ,

  -- Balance
  balance          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  available        DECIMAL(15,2) NOT NULL DEFAULT 0.00,

  -- Timestamps
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kyc_user   ON public.kyc_applications(user_id);
CREATE INDEX idx_kyc_status ON public.kyc_applications(kyc_status);
CREATE INDEX idx_kyc_checker ON public.kyc_applications(checker_id);

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklist         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_applications  ENABLE ROW LEVEL SECURITY;

-- ── helper: is the current user a privileged role? ──────────────────────────
CREATE OR REPLACE FUNCTION public.is_privileged()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('checker','admin','superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- ── profiles ────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_update_superadmin" ON public.profiles
  FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "profiles_delete_superadmin" ON public.profiles
  FOR DELETE USING (public.is_superadmin());

-- ── transactions ────────────────────────────────────────────────────────────
CREATE POLICY "txn_select" ON public.transactions
  FOR SELECT USING (true);

CREATE POLICY "txn_insert_maker" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "txn_update_privileged" ON public.transactions
  FOR UPDATE USING (public.is_privileged());

-- ── policy_rules ────────────────────────────────────────────────────────────
CREATE POLICY "rules_select" ON public.policy_rules
  FOR SELECT USING (true);

CREATE POLICY "rules_manage_privileged" ON public.policy_rules
  FOR ALL USING (public.is_privileged());

-- ── policy_violations ───────────────────────────────────────────────────────
CREATE POLICY "violations_select" ON public.policy_violations
  FOR SELECT USING (true);

CREATE POLICY "violations_insert" ON public.policy_violations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "violations_update_privileged" ON public.policy_violations
  FOR UPDATE USING (public.is_privileged());

-- ── blacklist ───────────────────────────────────────────────────────────────
CREATE POLICY "blacklist_select" ON public.blacklist
  FOR SELECT USING (true);

CREATE POLICY "blacklist_manage_privileged" ON public.blacklist
  FOR INSERT WITH CHECK (public.is_privileged());

CREATE POLICY "blacklist_update_privileged" ON public.blacklist
  FOR UPDATE USING (public.is_privileged());

CREATE POLICY "blacklist_delete_privileged" ON public.blacklist
  FOR DELETE USING (public.is_privileged());

-- ── audit_logs ──────────────────────────────────────────────────────────────
CREATE POLICY "audit_select" ON public.audit_logs
  FOR SELECT USING (true);

CREATE POLICY "audit_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ── kyc_applications ────────────────────────────────────────────────────────
CREATE POLICY "kyc_select" ON public.kyc_applications
  FOR SELECT USING (auth.uid() = user_id OR public.is_privileged());

CREATE POLICY "kyc_insert_own" ON public.kyc_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kyc_update_own_pending" ON public.kyc_applications
  FOR UPDATE USING (
    (auth.uid() = user_id AND kyc_status = 'pending')
    OR public.is_privileged()
  );

-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================

-- Auto-create profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'maker')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-set updated_at on any table that has it
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated    BEFORE UPDATE ON public.profiles          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON public.transactions     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_policy_rules_updated BEFORE UPDATE ON public.policy_rules     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_blacklist_updated    BEFORE UPDATE ON public.blacklist         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_kyc_updated         BEFORE UPDATE ON public.kyc_applications  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-sync kyc_completed flag when KYC status changes
CREATE OR REPLACE FUNCTION public.handle_kyc_approval()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kyc_status = 'approved' AND OLD.kyc_status != 'approved' THEN
    UPDATE public.profiles SET kyc_completed = true WHERE id = NEW.user_id;
  ELSIF NEW.kyc_status != 'approved' AND OLD.kyc_status = 'approved' THEN
    UPDATE public.profiles SET kyc_completed = false WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_kyc_status_change ON public.kyc_applications;
CREATE TRIGGER on_kyc_status_change
  BEFORE UPDATE ON public.kyc_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_kyc_approval();

-- ============================================================================
-- 10. SEED DATA
-- ============================================================================

-- Default policy rules
INSERT INTO public.policy_rules (rule_name, description, rule_type, threshold_value, is_active) VALUES
  ('High Amount Threshold',      'Flag transactions above ₹10,000',                       'amount_threshold',    10000, true),
  ('Very High Amount Threshold', 'Flag transactions above ₹50,000 — requires escalation', 'amount_threshold',    50000, true),
  ('Duplicate Detection',        'Detect potential duplicate transactions within 24 hours', 'duplicate_detection', NULL,  true),
  ('After Hours Transaction',    'Flag transactions outside business hours (9AM–6PM)',     'time_based',          NULL,  true),
  ('Blacklist Check',            'Flag transactions involving blacklisted accounts',       'blacklist_check',     NULL,  true);

-- Sample blacklist entries
INSERT INTO public.blacklist (account_number, entity_name, reason, is_active) VALUES
  ('9999999999', 'Known Fraud Account',    'Previously involved in fraudulent activities', true),
  ('8888888888', 'Suspicious Entity Corp', 'Under investigation for money laundering',     true),
  ('7777777777', 'Blocked Trading Co',     'Sanctioned entity',                            true);

-- ============================================================================
-- 11. SUPERADMIN SEED — run after the user has signed up
-- ============================================================================
-- Option A: If user already exists, promote them:
--   UPDATE public.profiles SET role = 'superadmin' WHERE email = 'sanketbagad486@gmail.com';
--   UPDATE auth.users SET raw_user_meta_data = jsonb_set(
--     COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"superadmin"'
--   ) WHERE email = 'sanketbagad486@gmail.com';
--
-- Option B: Use the seed script (recommended):
--   npx tsx scripts/seed-superadmin.ts
