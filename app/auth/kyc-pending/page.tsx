'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KYC_STATUS_LABELS, KYC_STATUS_COLORS, KYC_STATUS } from '@/lib/constants';
import { signOut } from '@/app/auth/actions';
import type { KycApplication } from '@/lib/types';

const statusIcons = {
  pending: Clock,
  under_review: AlertCircle,
  approved: CheckCircle,
  rejected: XCircle,
};

export default function KycPendingPage() {
  const router = useRouter();
  const [kycData, setKycData] = useState<KycApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKycStatus = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const response = await fetch('/api/kyc/status');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch KYC status');
      }

      if (!result.data) {
        // No KYC application found, redirect to onboarding
        router.push('/auth/onboarding');
        return;
      }

      setKycData(result.data);

      // If approved, redirect to dashboard
      if (result.data.kyc_status === KYC_STATUS.APPROVED) {
        router.push('/dashboard/maker');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKycStatus();
    
    // Poll for status updates every 30 seconds
    const interval = setInterval(() => {
      fetchKycStatus(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading KYC status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Error</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => fetchKycStatus()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!kycData) {
    return null;
  }

  const StatusIcon = statusIcons[kycData.kyc_status as keyof typeof statusIcons] || Clock;
  const isRejected = kycData.kyc_status === KYC_STATUS.REJECTED;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">SecureControl</h1>
              <p className="text-sm text-muted-foreground">KYC Verification Status</p>
            </div>
          </div>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </form>
        </div>

        <Card className="border-border">
          <CardHeader className="text-center">
            <div className={`mx-auto p-4 rounded-full w-fit mb-2 ${
              isRejected ? 'bg-destructive/10' : 'bg-warning/10'
            }`}>
              <StatusIcon className={`h-10 w-10 ${
                isRejected ? 'text-destructive' : 'text-warning'
              }`} />
            </div>
            <CardTitle className="text-xl">
              {isRejected ? 'KYC Application Rejected' : 'KYC Verification Pending'}
            </CardTitle>
            <CardDescription>
              Application ID: {kycData.application_id}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Badge className={KYC_STATUS_COLORS[kycData.kyc_status]}>
                {KYC_STATUS_LABELS[kycData.kyc_status]}
              </Badge>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{kycData.first_name} {kycData.last_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Submitted</span>
                <span className="font-medium">
                  {new Date(kycData.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {kycData.reviewed_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reviewed</span>
                  <span className="font-medium">
                    {new Date(kycData.reviewed_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {isRejected && kycData.checker_notes && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive mb-1">Rejection Reason</p>
                <p className="text-sm text-muted-foreground">{kycData.checker_notes}</p>
              </div>
            )}

            {!isRejected && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-center text-muted-foreground">
                  Your KYC application is being reviewed by our team. This usually takes 1-2 business days.
                  You will be notified once your application is processed.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            {isRejected ? (
              <Button className="w-full" asChild>
                <Link href="/auth/onboarding">
                  Submit New Application
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fetchKycStatus(true)}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Status
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Need help? Contact support@securecontrol.com
        </p>
      </div>
    </div>
  );
}
