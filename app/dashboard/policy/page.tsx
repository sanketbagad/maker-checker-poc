import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PolicyRulesManager } from '@/components/dashboard/policy-rules-manager';
import { PolicyRulesSkeleton } from '@/components/dashboard/skeletons';
import { Settings } from 'lucide-react';
import { TABLES } from '@/lib/constants';

// Server component for active rules
async function ActiveRulesContent({ userId }: { userId: string }) {
  const supabase = await createClient();
  
  const { data: rules } = await supabase
    .from(TABLES.POLICY_RULES)
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return <PolicyRulesManager rules={rules || []} userId={userId} />;
}

// Server component for inactive rules
async function InactiveRulesContent({ userId }: { userId: string }) {
  const supabase = await createClient();
  
  const { data: rules } = await supabase
    .from(TABLES.POLICY_RULES)
    .select('*')
    .eq('is_active', false)
    .order('created_at', { ascending: false });

  return <PolicyRulesManager rules={rules || []} userId={userId} />;
}

export default async function PolicyRulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Policy Rules</h1>
          <p className="text-muted-foreground">Configure automated transaction validation rules</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active Rules</CardTitle>
            <CardDescription>
              These rules are automatically applied to all new transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<PolicyRulesSkeleton count={3} />}>
              <ActiveRulesContent userId={user.id} />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inactive Rules</CardTitle>
            <CardDescription>
              Disabled rules that are not currently being applied
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<PolicyRulesSkeleton count={2} />}>
              <InactiveRulesContent userId={user.id} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
