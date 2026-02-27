import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats';
import { SimpleTransactionTable } from '@/components/dashboard/transaction-table';
import { FileText, CheckCircle, XCircle, AlertTriangle, Plus } from 'lucide-react';
import Link from 'next/link';
import { TABLES, TRANSACTION_STATUS, DEFAULT_PAGE_SIZE } from '@/lib/constants';

async function getMakerStats(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [
    { count: totalCount },
    { count: pendingCount },
    { count: approvedTodayCount },
    { count: rejectedTodayCount },
    { data: recentTransactions },
  ] = await Promise.all([
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId),
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('status', TRANSACTION_STATUS.PENDING),
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('status', TRANSACTION_STATUS.APPROVED)
      .gte('updated_at', todayISO),
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('status', TRANSACTION_STATUS.REJECTED)
      .gte('updated_at', todayISO),
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(DEFAULT_PAGE_SIZE),
  ]);

  return {
    totalCount: totalCount || 0,
    pendingCount: pendingCount || 0,
    approvedTodayCount: approvedTodayCount || 0,
    rejectedTodayCount: rejectedTodayCount || 0,
    recentTransactions: recentTransactions || [],
  };
}

export default async function MakerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const stats = await getMakerStats(supabase, user.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maker Dashboard</h1>
          <p className="text-muted-foreground">Create and track your transactions</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/maker/new">
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <StatsGrid>
        <StatsCard
          title="Total Transactions"
          value={stats.totalCount}
          description="All time"
          icon={FileText}
        />
        <StatsCard
          title="Pending Review"
          value={stats.pendingCount}
          description="Awaiting checker approval"
          icon={AlertTriangle}
          variant="warning"
        />
        <StatsCard
          title="Approved Today"
          value={stats.approvedTodayCount}
          description="Since midnight"
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title="Rejected Today"
          value={stats.rejectedTodayCount}
          description="Since midnight"
          icon={XCircle}
          variant="destructive"
        />
      </StatsGrid>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest transaction submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleTransactionTable
            transactions={stats.recentTransactions}
            userRole="maker"
            showActions={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
