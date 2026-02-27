import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditLogTable } from '@/components/dashboard/audit-log-table';
import { AuditLogSkeleton } from '@/components/dashboard/skeletons';
import { History } from 'lucide-react';
import { TABLES, AUDIT_PAGE_SIZE } from '@/lib/constants';

// Server component that fetches data
async function AuditLogsContent() {
  const supabase = await createClient();
  
  const { data: logs } = await supabase
    .from(TABLES.AUDIT_LOGS)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(AUDIT_PAGE_SIZE);

  return <AuditLogTable logs={logs || []} />;
}

export default async function AuditLogsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <History className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground">Complete history of all system actions and changes</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Showing the last {AUDIT_PAGE_SIZE} system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<AuditLogSkeleton rows={10} />}>
            <AuditLogsContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
