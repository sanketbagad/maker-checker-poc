import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BlacklistManager } from '@/components/dashboard/blacklist-manager';
import { BlacklistSkeleton } from '@/components/dashboard/skeletons';
import { Ban } from 'lucide-react';
import { TABLES } from '@/lib/constants';

// Server component that fetches data
async function BlacklistContent({ userId }: { userId: string }) {
  const supabase = await createClient();
  
  const { data: entries } = await supabase
    .from(TABLES.BLACKLIST)
    .select('*')
    .order('created_at', { ascending: false });

  return <BlacklistManager entries={entries || []} userId={userId} />;
}

export default async function BlacklistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-destructive/10">
          <Ban className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blacklist Management</h1>
          <p className="text-muted-foreground">Manage blocked accounts and entities</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blocked Accounts</CardTitle>
          <CardDescription>
            Transactions involving these accounts will be flagged for review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<BlacklistSkeleton />}>
            <BlacklistContent userId={user.id} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
