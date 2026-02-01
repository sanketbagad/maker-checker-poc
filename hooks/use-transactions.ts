'use client';

import useSWR, { mutate } from 'swr';
import { createClient } from '@/lib/supabase/client';
import type { Transaction } from '@/lib/types';
import { TABLES, TRANSACTION_STATUS, AUDIT_ACTIONS } from '@/lib/constants';

// Fetcher functions
async function fetchTransactions(key: string): Promise<Transaction[]> {
  const supabase = createClient();
  const params = new URLSearchParams(key.split('?')[1] || '');
  
  let query = supabase.from(TABLES.TRANSACTIONS).select('*');
  
  const status = params.get('status');
  const createdBy = params.get('created_by');
  const limit = params.get('limit');
  const orderBy = params.get('order_by') || 'created_at';
  const orderDir = params.get('order_dir') === 'asc';
  
  if (status) query = query.eq('status', status);
  if (createdBy) query = query.eq('created_by', createdBy);
  if (limit) query = query.limit(parseInt(limit));
  
  query = query.order(orderBy, { ascending: orderDir });
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function fetchTransactionById(id: string): Promise<Transaction | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLES.TRANSACTIONS)
    .select(`
      *,
      policy_violations (*)
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// Hooks
export function useTransactions(params?: {
  status?: string;
  createdBy?: string;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.createdBy) searchParams.set('created_by', params.createdBy);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.orderBy) searchParams.set('order_by', params.orderBy);
  if (params?.orderDir) searchParams.set('order_dir', params.orderDir);
  
  const key = `transactions?${searchParams.toString()}`;
  
  const { data, error, isLoading, isValidating } = useSWR(
    key,
    fetchTransactions,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );
  
  return {
    transactions: data || [],
    isLoading,
    isValidating,
    error,
    refresh: () => mutate(key),
  };
}

export function useTransaction(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? `transaction-${id}` : null,
    () => (id ? fetchTransactionById(id) : null),
    {
      revalidateOnFocus: false,
    }
  );
  
  return {
    transaction: data,
    isLoading,
    error,
    refresh: () => mutate(`transaction-${id}`),
  };
}

// Mutation functions
export async function approveTransaction(transactionId: string, userId: string, notes?: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from(TABLES.TRANSACTIONS)
    .update({
      status: TRANSACTION_STATUS.APPROVED,
      checked_by: userId,
      checker_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId);
  
  if (error) throw error;
  
  // Log audit trail
  await supabase.from(TABLES.AUDIT_LOGS).insert({
    user_id: userId,
    action: AUDIT_ACTIONS.TRANSACTION_APPROVED,
    entity_type: 'transaction',
    entity_id: transactionId,
    new_values: { status: TRANSACTION_STATUS.APPROVED, checker_notes: notes },
  });
  
  // Revalidate caches
  mutate((key: string) => typeof key === 'string' && key.startsWith('transactions'), undefined, { revalidate: true });
  mutate(`transaction-${transactionId}`);
}

export async function rejectTransaction(transactionId: string, userId: string, notes: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from(TABLES.TRANSACTIONS)
    .update({
      status: TRANSACTION_STATUS.REJECTED,
      checked_by: userId,
      checker_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId);
  
  if (error) throw error;
  
  // Log audit trail
  await supabase.from(TABLES.AUDIT_LOGS).insert({
    user_id: userId,
    action: AUDIT_ACTIONS.TRANSACTION_REJECTED,
    entity_type: 'transaction',
    entity_id: transactionId,
    new_values: { status: TRANSACTION_STATUS.REJECTED, checker_notes: notes },
  });
  
  // Revalidate caches
  mutate((key: string) => typeof key === 'string' && key.startsWith('transactions'), undefined, { revalidate: true });
  mutate(`transaction-${transactionId}`);
}

export async function createTransaction(data: {
  transaction_type: string;
  amount: number;
  currency: string;
  source_account: string;
  destination_account: string;
  description?: string;
  created_by: string;
}) {
  const supabase = createClient();
  
  const { data: newTransaction, error } = await supabase
    .from(TABLES.TRANSACTIONS)
    .insert({
      ...data,
      status: TRANSACTION_STATUS.PENDING,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Trigger policy analysis
  if (newTransaction) {
    await fetch('/api/transactions/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: newTransaction.id }),
    });
  }
  
  // Revalidate caches
  mutate((key: string) => typeof key === 'string' && key.startsWith('transactions'), undefined, { revalidate: true });
  
  return newTransaction;
}
