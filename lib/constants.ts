// Transaction Types
export const TRANSACTION_TYPES = {
  FUND_TRANSFER: 'fund_transfer',
  PAYMENT_APPROVAL: 'payment_approval',
  ACCOUNT_CHANGE: 'account_change',
  LOAN_APPROVAL: 'loan_approval',
} as const;

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  [TRANSACTION_TYPES.FUND_TRANSFER]: 'Fund Transfer',
  [TRANSACTION_TYPES.PAYMENT_APPROVAL]: 'Payment Approval',
  [TRANSACTION_TYPES.ACCOUNT_CHANGE]: 'Account Change',
  [TRANSACTION_TYPES.LOAN_APPROVAL]: 'Loan Approval',
};

export const TRANSACTION_TYPE_OPTIONS = [
  { value: TRANSACTION_TYPES.FUND_TRANSFER, label: 'Fund Transfer' },
  { value: TRANSACTION_TYPES.PAYMENT_APPROVAL, label: 'Payment Approval' },
  { value: TRANSACTION_TYPES.ACCOUNT_CHANGE, label: 'Account Change' },
  { value: TRANSACTION_TYPES.LOAN_APPROVAL, label: 'Loan Approval' },
] as const;

// Transaction Statuses
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FLAGGED: 'flagged',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  [TRANSACTION_STATUS.PENDING]: 'bg-warning/10 text-warning-foreground border-warning/20',
  [TRANSACTION_STATUS.APPROVED]: 'bg-success/10 text-success border-success/20',
  [TRANSACTION_STATUS.REJECTED]: 'bg-destructive/10 text-destructive border-destructive/20',
  [TRANSACTION_STATUS.FLAGGED]: 'bg-chart-5/10 text-chart-5 border-chart-5/20',
};

// User Roles
export const USER_ROLES = {
  MAKER: 'maker',
  CHECKER: 'checker',
  ADMIN: 'admin',
} as const;

// Policy Violation Severities
export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const SEVERITY_COLORS: Record<string, string> = {
  [SEVERITY_LEVELS.LOW]: 'bg-muted text-muted-foreground',
  [SEVERITY_LEVELS.MEDIUM]: 'bg-warning/10 text-warning-foreground',
  [SEVERITY_LEVELS.HIGH]: 'bg-chart-3/10 text-chart-3',
  [SEVERITY_LEVELS.CRITICAL]: 'bg-destructive/10 text-destructive',
};

export const SEVERITY_SCORES: Record<string, number> = {
  [SEVERITY_LEVELS.CRITICAL]: 40,
  [SEVERITY_LEVELS.HIGH]: 25,
  [SEVERITY_LEVELS.MEDIUM]: 15,
  [SEVERITY_LEVELS.LOW]: 5,
};

// Policy Rule Types
export const POLICY_RULE_TYPES = {
  AMOUNT_THRESHOLD: 'amount_threshold',
  DUPLICATE_DETECTION: 'duplicate_detection',
  BLACKLIST_CHECK: 'blacklist_check',
  TIME_BASED: 'time_based',
} as const;

// Currency Options
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] as const;
export const DEFAULT_CURRENCY = 'USD';

// Audit Log Actions
export const AUDIT_ACTIONS = {
  TRANSACTION_CREATED: 'TRANSACTION_CREATED',
  TRANSACTION_APPROVED: 'TRANSACTION_APPROVED',
  TRANSACTION_REJECTED: 'TRANSACTION_REJECTED',
  BLACKLIST_ADDED: 'BLACKLIST_ADDED',
  BLACKLIST_REMOVED: 'BLACKLIST_REMOVED',
  POLICY_UPDATED: 'POLICY_UPDATED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
} as const;

// Business Hours Configuration
export const BUSINESS_HOURS = {
  START_HOUR: 9,
  END_HOUR: 18,
  WORKING_DAYS: [1, 2, 3, 4, 5], // Monday to Friday
} as const;

// Duplicate Detection Window (in hours)
export const DUPLICATE_DETECTION_WINDOW_HOURS = 24;

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const AUDIT_PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// Navigation Items
export const MAKER_NAV_ITEMS = [
  { href: '/dashboard/maker', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/dashboard/maker/transactions', label: 'My Transactions', icon: 'FileText' },
  { href: '/dashboard/maker/new', label: 'New Transaction', icon: 'CheckSquare' },
] as const;

export const CHECKER_NAV_ITEMS = [
  { href: '/dashboard/checker', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/dashboard/checker/pending', label: 'Pending Review', icon: 'FileText' },
  { href: '/dashboard/checker/kyc', label: 'KYC Review', icon: 'UserCheck' },
  { href: '/dashboard/checker/flagged', label: 'Flagged', icon: 'AlertTriangle' },
  { href: '/dashboard/checker/blacklist', label: 'Blacklist', icon: 'Ban' },
] as const;

export const COMMON_NAV_ITEMS = [
  { href: '/dashboard/audit', label: 'Audit Logs', icon: 'History' },
  { href: '/dashboard/policy', label: 'Policy Rules', icon: 'Settings' },
] as const;

// API Routes
export const API_ROUTES = {
  ANALYZE_TRANSACTION: '/api/transactions/analyze',
} as const;

// Table Names (Supabase)
export const TABLES = {
  PROFILES: 'profiles',
  TRANSACTIONS: 'transactions',
  POLICY_RULES: 'policy_rules',
  POLICY_VIOLATIONS: 'policy_violations',
  BLACKLIST: 'blacklist',
  AUDIT_LOGS: 'audit_logs',
  KYC_APPLICATIONS: 'kyc_applications',
} as const;

// KYC Status
export const KYC_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  UNDER_REVIEW: 'under_review',
} as const;

export const KYC_STATUS_LABELS: Record<string, string> = {
  [KYC_STATUS.PENDING]: 'Pending Review',
  [KYC_STATUS.APPROVED]: 'Approved',
  [KYC_STATUS.REJECTED]: 'Rejected',
  [KYC_STATUS.UNDER_REVIEW]: 'Under Review',
};

export const KYC_STATUS_COLORS: Record<string, string> = {
  [KYC_STATUS.PENDING]: 'bg-warning/10 text-warning-foreground border-warning/20',
  [KYC_STATUS.APPROVED]: 'bg-success/10 text-success border-success/20',
  [KYC_STATUS.REJECTED]: 'bg-destructive/10 text-destructive border-destructive/20',
  [KYC_STATUS.UNDER_REVIEW]: 'bg-primary/10 text-primary border-primary/20',
};

// Account Types
export const ACCOUNT_TYPES = {
  SAVINGS: 'savings',
  CURRENT: 'current',
  SALARY: 'salary',
} as const;

export const ACCOUNT_TYPE_OPTIONS = [
  { value: ACCOUNT_TYPES.SAVINGS, label: 'Savings Account' },
  { value: ACCOUNT_TYPES.CURRENT, label: 'Current Account' },
  { value: ACCOUNT_TYPES.SALARY, label: 'Salary Account' },
] as const;

// Annual Income Options
export const ANNUAL_INCOME_OPTIONS = [
  { value: 'below_2.5L', label: 'Below ₹2.5 Lakhs' },
  { value: '2.5L_5L', label: '₹2.5 - 5 Lakhs' },
  { value: '5L_10L', label: '₹5 - 10 Lakhs' },
  { value: '10L_25L', label: '₹10 - 25 Lakhs' },
  { value: '25L_50L', label: '₹25 - 50 Lakhs' },
  { value: 'above_50L', label: 'Above ₹50 Lakhs' },
] as const;

// Nominee Relations
export const NOMINEE_RELATION_OPTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'other', label: 'Other' },
] as const;

// KYC Onboarding Steps
export const KYC_STEPS = [
  { id: 1, title: 'Personal Information', description: 'Basic details and identity' },
  { id: 2, title: 'Contact Details', description: 'Phone, email and address' },
  { id: 3, title: 'Employment & Account', description: 'Work and account type' },
  { id: 4, title: 'Nominee Details', description: 'Nominee information' },
] as const;
