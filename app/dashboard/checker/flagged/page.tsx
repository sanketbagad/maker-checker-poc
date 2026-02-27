import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PendingTransactionList } from '@/components/dashboard/pending-transaction-list';
import { AlertTriangle } from 'lucide-react';

export default async function FlaggedTransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get transactions that have policy violations
  const { data: violations } = await supabase
    .from('policy_violations')
    .select('transaction_id')
    .order('created_at', { ascending: false });

  const transactionIds = [...new Set(violations?.map(v => v.transaction_id) || [])];

  let transactions: any[] = [];
  
  if (transactionIds.length > 0) {
    const { data } = await supabase
      .from('transactions')
      .select(`
        *,
        policy_violations (
          id,
          violation_details,
          severity,
          rule_id
        )
      `)
      .in('id', transactionIds)
      .in('status', ['pending', 'flagged'])
      .order('created_at', { ascending: true });
    
    transactions = data || [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Flagged Transactions</h1>
          <p className="text-muted-foreground">Transactions with policy violations that require special attention</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>High-Risk Transactions</CardTitle>
          <CardDescription>
            {transactions.length} transactions flagged by the policy analyzer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PendingTransactionList 
            transactions={transactions} 
            userId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
