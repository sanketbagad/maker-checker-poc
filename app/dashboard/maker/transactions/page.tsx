import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleTransactionTable } from '@/components/dashboard/transaction-table';
import { TransactionFilters } from '@/components/dashboard/transaction-filters';

export default async function MakerTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params.type && params.type !== 'all') {
    query = query.eq('transaction_type', params.type);
  }

  const { data: transactions } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Transactions</h1>
        <p className="text-muted-foreground">View and track all your submitted transactions</p>
      </div>

      <TransactionFilters />

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Showing {transactions?.length || 0} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleTransactionTable 
            transactions={transactions || []} 
            userRole="maker"
            showActions={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
