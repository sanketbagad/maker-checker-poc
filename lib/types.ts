// User Types
export type UserRole = 'maker' | 'checker' | 'admin';

export type TransactionType = 'fund_transfer' | 'payment_approval' | 'account_change' | 'loan_approval';

export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

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
