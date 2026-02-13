import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats';
import {
  Users,
  UserPlus,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Activity,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { TABLES, TRANSACTION_STATUS, KYC_STATUS } from '@/lib/constants';

async function getAdminStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [
    { count: totalUsers },
    { count: makerCount },
    { count: checkerCount },
    { count: adminCount },
    { count: totalTransactions },
    { count: pendingTransactions },
    { count: approvedToday },
    { count: rejectedToday },
    { count: flaggedTransactions },
    { count: totalKyc },
    { count: pendingKyc },
    { count: approvedKyc },
    { count: todayAuditCount },
    { data: recentUsers },
    { data: recentAuditLogs },
  ] = await Promise.all([
    supabase.from(TABLES.PROFILES).select('*', { count: 'exact', head: true }),
    supabase.from(TABLES.PROFILES).select('*', { count: 'exact', head: true }).eq('role', 'maker'),
    supabase.from(TABLES.PROFILES).select('*', { count: 'exact', head: true }).eq('role', 'checker'),
    supabase
      .from(TABLES.PROFILES)
      .select('*', { count: 'exact', head: true })
      .in('role', ['admin', 'superadmin']),
    supabase.from(TABLES.TRANSACTIONS).select('*', { count: 'exact', head: true }),
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*', { count: 'exact', head: true })
      .eq('status', TRANSACTION_STATUS.PENDING),
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*', { count: 'exact', head: true })
      .eq('status', TRANSACTION_STATUS.APPROVED)
      .gte('updated_at', todayISO),
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*', { count: 'exact', head: true })
      .eq('status', TRANSACTION_STATUS.REJECTED)
      .gte('updated_at', todayISO),
    supabase
      .from(TABLES.TRANSACTIONS)
      .select('*', { count: 'exact', head: true })
      .eq('status', TRANSACTION_STATUS.FLAGGED),
    supabase.from(TABLES.KYC_APPLICATIONS).select('*', { count: 'exact', head: true }),
    supabase
      .from(TABLES.KYC_APPLICATIONS)
      .select('*', { count: 'exact', head: true })
      .eq('kyc_status', KYC_STATUS.PENDING),
    supabase
      .from(TABLES.KYC_APPLICATIONS)
      .select('*', { count: 'exact', head: true })
      .eq('kyc_status', KYC_STATUS.APPROVED),
    supabase
      .from(TABLES.AUDIT_LOGS)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO),
    supabase
      .from(TABLES.PROFILES)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from(TABLES.AUDIT_LOGS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  return {
    totalUsers: totalUsers || 0,
    makerCount: makerCount || 0,
    checkerCount: checkerCount || 0,
    adminCount: adminCount || 0,
    totalTransactions: totalTransactions || 0,
    pendingTransactions: pendingTransactions || 0,
    approvedToday: approvedToday || 0,
    rejectedToday: rejectedToday || 0,
    flaggedTransactions: flaggedTransactions || 0,
    totalKyc: totalKyc || 0,
    pendingKyc: pendingKyc || 0,
    approvedKyc: approvedKyc || 0,
    todayAuditCount: todayAuditCount || 0,
    recentUsers: recentUsers || [],
    recentAuditLogs: recentAuditLogs || [],
  };
}

const ROLE_COLORS: Record<string, string> = {
  maker: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  checker: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  superadmin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default async function SuperAdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Verify superadmin role from profiles DB (source of truth)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'superadmin') {
    redirect('/dashboard/maker');
  }

  const stats = await getAdminStats(supabase);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SuperAdmin Dashboard</h1>
          <p className="text-muted-foreground">Complete system oversight and user management</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/users?action=create">
            <UserPlus className="mr-2 h-4 w-4" />
            Create User
          </Link>
        </Button>
      </div>

      {/* User Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          User Overview
        </h2>
        <StatsGrid columns={4}>
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            description="All registered users"
            icon={Users}
          />
          <StatsCard
            title="Makers"
            value={stats.makerCount}
            description="Relationship Managers"
            icon={FileText}
            variant="info"
          />
          <StatsCard
            title="Checkers"
            value={stats.checkerCount}
            description="Compliance Officers"
            icon={UserCheck}
            variant="success"
          />
          <StatsCard
            title="Admins"
            value={stats.adminCount}
            description="System Administrators"
            icon={Shield}
            variant="warning"
          />
        </StatsGrid>
      </div>

      {/* Transaction Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Transaction Overview
        </h2>
        <StatsGrid columns={4}>
          <StatsCard
            title="Total Transactions"
            value={stats.totalTransactions}
            description="All time"
            icon={FileText}
          />
          <StatsCard
            title="Pending Review"
            value={stats.pendingTransactions}
            description="Awaiting approval"
            icon={Clock}
            variant="warning"
          />
          <StatsCard
            title="Approved Today"
            value={stats.approvedToday}
            description="Since midnight"
            icon={CheckCircle}
            variant="success"
          />
          <StatsCard
            title="Flagged"
            value={stats.flaggedTransactions}
            description="Require attention"
            icon={AlertTriangle}
            variant="destructive"
          />
        </StatsGrid>
      </div>

      {/* KYC & Audit Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="KYC Applications"
          value={stats.totalKyc}
          description={`${stats.pendingKyc} pending, ${stats.approvedKyc} approved`}
          icon={UserCheck}
          variant="info"
        />
        <StatsCard
          title="KYC Pending Review"
          value={stats.pendingKyc}
          description="Awaiting compliance"
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title="Audit Events Today"
          value={stats.todayAuditCount}
          description="Since midnight"
          icon={Activity}
        />
      </div>

      {/* Recent Users & Audit Logs */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Users</CardTitle>
              <CardDescription>Latest registered accounts</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/users">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>
              ) : (
                stats.recentUsers.map(
                  (u: { id: string; full_name: string; email: string; role: string; created_at: string }) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                          {(u.full_name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.full_name || 'No name'}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <Badge className={ROLE_COLORS[u.role] || ''} variant="secondary">
                        {u.role}
                      </Badge>
                    </div>
                  )
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Latest system audit events</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/audit">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentAuditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
              ) : (
                stats.recentAuditLogs.map(
                  (log: { id: string; action: string; entity_type: string; created_at: string }) => (
                    <div key={log.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.entity_type} &middot;{' '}
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
