import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleTransactionTable } from '@/components/dashboard/transaction-table';
import { TABLES } from '@/lib/constants';

export default async function AdminTransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'superadmin') redirect('/dashboard/maker');

  const { data: transactions } = await supabase
    .from(TABLES.TRANSACTIONS)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Transactions</h1>
        <p className="text-muted-foreground">System-wide transaction view for oversight</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions</CardTitle>
          <CardDescription>All transactions across the system</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleTransactionTable
            transactions={transactions || []}
            userRole="checker"
            showActions={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
