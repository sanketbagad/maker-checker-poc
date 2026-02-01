import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { TRANSACTION_TYPE_LABELS, STATUS_COLORS, SEVERITY_COLORS, TABLES } from '@/lib/constants';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import type { TransactionStatus, TransactionType, PolicyViolation } from '@/lib/types';
import { cn } from '@/lib/utils';

// Server component for policy violations (can load independently)
async function PolicyViolationsSection({ transactionId }: { transactionId: string }) {
  const supabase = await createClient();
  
  const { data: violations } = await supabase
    .from(TABLES.POLICY_VIOLATIONS)
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (!violations || violations.length === 0) {
    return null;
  }

  return (
    <Card className="border-warning/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Policy Violations
        </CardTitle>
        <CardDescription>
          {violations.length} policy violation(s) detected
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {violations.map((violation: PolicyViolation) => (
            <div
              key={violation.id}
              className={cn(
                'p-3 rounded-lg border',
                SEVERITY_COLORS[violation.severity]
              )}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <Badge variant="outline" className="mb-2 text-xs capitalize">
                    {violation.severity} severity
                  </Badge>
                  <p className="text-sm">{violation.violation_details}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Detected: {formatDateTime(violation.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PolicyViolationsSkeleton() {
  return (
    <Card className="border-warning/50">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 rounded-lg border space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: transaction } = await supabase
    .from(TABLES.TRANSACTIONS)
    .select('*')
    .eq('id', id)
    .single();

  if (!transaction) {
    notFound();
  }

  const userRole = user.user_metadata?.role || 'maker';
  const backUrl = userRole === 'checker' ? '/dashboard/checker' : '/dashboard/maker';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backUrl}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Transaction Details</h1>
          <p className="text-sm text-muted-foreground font-mono">ID: {transaction.id}</p>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            'text-sm px-3 py-1 capitalize',
            STATUS_COLORS[transaction.status as TransactionStatus]
          )}
        >
          {transaction.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <Badge variant="outline">
                {TRANSACTION_TYPE_LABELS[transaction.transaction_type as TransactionType]}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-lg">
                {formatCurrency(transaction.amount, transaction.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency</span>
              <span>{transaction.currency}</span>
            </div>
            {transaction.description && (
              <div>
                <span className="text-muted-foreground block mb-1">Description</span>
                <p className="text-sm bg-muted p-2 rounded">{transaction.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Source</p>
                <p className="font-mono text-sm">{transaction.source_account}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Destination</p>
                <p className="font-mono text-sm">{transaction.destination_account}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Created</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(transaction.created_at)}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  By: {transaction.created_by.slice(0, 8)}...
                </p>
              </div>
            </div>
            
            {transaction.checked_by && (
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-full',
                  transaction.status === 'approved' ? 'bg-success/10' : 'bg-destructive/10'
                )}>
                  {transaction.status === 'approved' ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="font-medium capitalize">{transaction.status}</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(transaction.updated_at)}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    By: {transaction.checked_by.slice(0, 8)}...
                  </p>
                  {transaction.checker_notes && (
                    <p className="text-sm mt-2 p-2 bg-muted rounded">
                      {transaction.checker_notes}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Policy violations loaded with Suspense for parallel data fetching */}
      <Suspense fallback={<PolicyViolationsSkeleton />}>
        <PolicyViolationsSection transactionId={id} />
      </Suspense>
    </div>
  );
}
