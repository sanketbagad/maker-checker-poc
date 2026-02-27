import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PendingTransactionList } from '@/components/dashboard/pending-transaction-list';
import { PendingTransactionListSkeleton } from '@/components/dashboard/skeletons';
import { TABLES, TRANSACTION_STATUS } from '@/lib/constants';

// Server component that fetches data
async function PendingTransactionsContent({ userId }: { userId: string }) {
  const supabase = await createClient();
  
  const { data: transactions } = await supabase
    .from(TABLES.TRANSACTIONS)
    .select(`
      *,
      policy_violations (
        id,
        violation_details,
        severity,
        rule_id
      )
    `)
    .eq('status', TRANSACTION_STATUS.PENDING)
    .order('created_at', { ascending: true });

  return (
    <PendingTransactionList 
      transactions={transactions || []} 
      userId={userId}
    />
  );
}

export default async function PendingReviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get count for header (fast query)
  const { count } = await supabase
    .from(TABLES.TRANSACTIONS)
    .select('*', { count: 'exact', head: true })
    .eq('status', TRANSACTION_STATUS.PENDING);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pending Review</h1>
        <p className="text-muted-foreground">Review and approve or reject pending transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions Awaiting Review</CardTitle>
          <CardDescription>
            {count || 0} transactions pending your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<PendingTransactionListSkeleton count={5} />}>
            <PendingTransactionsContent userId={user.id} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
