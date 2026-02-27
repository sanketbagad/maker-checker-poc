import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats';
import { SimpleTransactionTable } from '@/components/dashboard/transaction-table';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';
import { TABLES, TRANSACTION_STATUS, DEFAULT_PAGE_SIZE } from '@/lib/constants';

async function getCheckerStats(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [
    { count: pendingCount },
    { count: flaggedCount },
    { count: approvedTodayCount },
    { count: rejectedTodayCount },
    { data: pendingTransactions },
  ] = await Promise.all([
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*', { count: 'exact', head: true })
      .eq('status', TRANSACTION_STATUS.PENDING),
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*', { count: 'exact', head: true })
      .eq('status', TRANSACTION_STATUS.FLAGGED),
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*', { count: 'exact', head: true })
      .eq('status', TRANSACTION_STATUS.APPROVED)
      .eq('checked_by', userId)
      .gte('updated_at', todayISO),
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*', { count: 'exact', head: true })
      .eq('status', TRANSACTION_STATUS.REJECTED)
      .eq('checked_by', userId)
      .gte('updated_at', todayISO),
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*')
      .eq('status', TRANSACTION_STATUS.PENDING)
      .order('created_at', { ascending: true })
      .limit(DEFAULT_PAGE_SIZE),
  ]);

  return {
    pendingCount: pendingCount || 0,
    flaggedCount: flaggedCount || 0,
    approvedTodayCount: approvedTodayCount || 0,
    rejectedTodayCount: rejectedTodayCount || 0,
    pendingTransactions: pendingTransactions || [],
  };
}

export default async function CheckerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const stats = await getCheckerStats(supabase, user.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Checker Dashboard</h1>
          <p className="text-muted-foreground">Review and approve pending transactions</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/checker/pending">
            <Clock className="mr-2 h-4 w-4" />
            View All Pending
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <StatsGrid>
        <StatsCard
          title="Pending Review"
          value={stats.pendingCount}
          description="Awaiting your approval"
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title="Flagged Transactions"
          value={stats.flaggedCount}
          description="Require attention"
          icon={AlertTriangle}
          variant="destructive"
        />
        <StatsCard
          title="Approved Today"
          value={stats.approvedTodayCount}
          description="By you since midnight"
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title="Rejected Today"
          value={stats.rejectedTodayCount}
          description="By you since midnight"
          icon={XCircle}
          variant="destructive"
        />
      </StatsGrid>

      {/* Pending Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Transactions</CardTitle>
          <CardDescription>Transactions awaiting your review (oldest first)</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleTransactionTable
            transactions={stats.pendingTransactions}
            userRole="checker"
            showActions={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
