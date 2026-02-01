'use client';

import dynamic from 'next/dynamic';
import {
  PendingTransactionListSkeleton,
  TransactionTableSkeleton,
  BlacklistSkeleton,
  PolicyRulesSkeleton,
  AuditLogSkeleton,
} from './skeletons';

// Lazy load heavy client components with loading fallbacks
export const LazyPendingTransactionList = dynamic(
  () => import('./pending-transaction-list').then((mod) => ({ default: mod.PendingTransactionList })),
  {
    loading: () => <PendingTransactionListSkeleton />,
    ssr: false,
  }
);

export const LazySimpleTransactionTable = dynamic(
  () => import('./transaction-table/index').then((mod) => ({ default: mod.SimpleTransactionTable })),
  {
    loading: () => <TransactionTableSkeleton />,
    ssr: true,
  }
);

export const LazyBlacklistManager = dynamic(
  () => import('./blacklist-manager').then((mod) => ({ default: mod.BlacklistManager })),
  {
    loading: () => <BlacklistSkeleton />,
    ssr: false,
  }
);

export const LazyPolicyRulesManager = dynamic(
  () => import('./policy-rules-manager').then((mod) => ({ default: mod.PolicyRulesManager })),
  {
    loading: () => <PolicyRulesSkeleton />,
    ssr: false,
  }
);

export const LazyAuditLogTable = dynamic(
  () => import('./audit-log-table').then((mod) => ({ default: mod.AuditLogTable })),
  {
    loading: () => <AuditLogSkeleton />,
    ssr: true,
  }
);

// Re-export the Transaction Table compound component for non-lazy usage
export { TransactionTable, SimpleTransactionTable } from './transaction-table/index';
