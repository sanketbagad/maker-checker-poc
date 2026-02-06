// User Types
export enum UserType {
  MAKER = 'maker',
  CHECKER = 'checker',
  ADMIN = 'admin',
}

export type UserRole = 'maker' | 'checker' | 'admin';

export type TransactionType = 'fund_transfer' | 'payment_approval' | 'account_change' | 'loan_approval';

export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

// KYC Types
export type KycStatus = 'pending' | 'approved' | 'rejected' | 'under_review';

export type AccountType = 'savings' | 'current' | 'salary';

export type AnnualIncome = 'below_2.5L' | '2.5L_5L' | '5L_10L' | '10L_25L' | '25L_50L' | 'above_50L';

export interface KycApplication {
  id: string;
  application_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  dob: string;
  pan: string;
  aadhaar: string;
  account_type: AccountType;
  identity: string | null;
  mobile: string;
  email: string;
  address_current: string;
  address_permanent: string;
  occupation: string;
  annual_income: AnnualIncome;
  pep: boolean;
  nominee_name: string | null;
  nominee_relation: string | null;
  nominee_dob: string | null;
  kyc_status: KycStatus;
  checker_id: string | null;
  checker_notes: string | null;
  reviewed_at: string | null;
  balance: number;
  available: number;
  created_at: string;
  updated_at: string;
  // Relations
  user?: Profile;
  checker?: Profile;
}

export interface KycFormData {
  // Step 1: Personal Information
  first_name: string;
  last_name: string;
  dob: string;
  pan: string;
  aadhaar: string;
  // Step 2: Contact Information
  mobile: string;
  email: string;
  address_current: string;
  address_permanent: string;
  // Step 3: Employment & Account
  account_type: AccountType;
  occupation: string;
  annual_income: AnnualIncome;
  pep: boolean;
  // Step 4: Nominee Information
  nominee_name: string;
  nominee_relation: string;
  nominee_dob: string;
}

// Profile
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// Transaction
export interface Transaction {
  id: string;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  source_account: string;
  destination_account: string;
  description: string | null;
  status: TransactionStatus;
  created_by: string;
  checked_by: string | null;
  created_at: string;
  updated_at: string;
  checker_notes: string | null;
  metadata: Record<string, unknown> | null;
  // Relations
  creator?: Profile;
  checker?: Profile;
  violations?: PolicyViolation[];
  policy_violations?: PolicyViolation[];
}

// Policy
export interface PolicyRule {
  id: string;
  rule_name: string;
  rule_type: string;
  threshold_value: number | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

export interface PolicyViolation {
  id: string;
  transaction_id: string;
  rule_id: string;
  violation_details: string;
  severity: SeverityLevel;
  created_at: string;
  rule?: PolicyRule;
}

// Blacklist
export interface BlacklistEntry {
  id: string;
  account_number: string;
  entity_name: string | null;
  reason: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

// Audit
export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user?: Profile;
}

// Dashboard Stats
export interface DashboardStats {
  pendingCount: number;
  approvedToday: number;
  rejectedToday: number;
  flaggedCount: number;
  totalAmount: number;
}

// Form Data Types
export interface TransactionFormData {
  transaction_type: TransactionType;
  amount: string;
  currency: string;
  source_account: string;
  destination_account: string;
  description: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
