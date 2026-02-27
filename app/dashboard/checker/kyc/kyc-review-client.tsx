'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Loader2,
  User,
  FileText,
} from 'lucide-react';
import { KYC_STATUS_LABELS, KYC_STATUS_COLORS, ACCOUNT_TYPE_OPTIONS, ANNUAL_INCOME_OPTIONS } from '@/lib/constants';
import type { KycApplication } from '@/lib/types';

interface KycReviewClientProps {
  initialStats: {
    pendingCount: number;
    underReviewCount: number;
    approvedCount: number;
    rejectedCount: number;
  };
  initialApplications: KycApplication[];
}

function getLabel(options: readonly { value: string; label: string }[], value: string): string {
  const option = options.find((opt) => opt.value === value);
  return option?.label || value;
}

export default function KycReviewClient({ initialStats, initialApplications }: KycReviewClientProps) {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);
  const [applications, setApplications] = useState(initialApplications);

  // Sync server props when router.refresh() re-runs the server component
  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  useEffect(() => {
    setApplications(initialApplications);
  }, [initialApplications]);
  const [selectedApp, setSelectedApp] = useState<KycApplication | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleViewApplication = (app: KycApplication) => {
    setSelectedApp(app);
    setIsViewDialogOpen(true);
  };

  const handleActionClick = (app: KycApplication, action: 'approve' | 'reject') => {
    setSelectedApp(app);
    setActionType(action);
    setNotes('');
    setIsActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedApp || !actionType) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/kyc/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kyc_id: selectedApp.id,
          action: actionType,
          notes,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to process KYC application');
      }

      // Remove from list
      setApplications(apps => apps.filter(a => a.id !== selectedApp.id));
      setIsActionDialogOpen(false);
      setIsViewDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error processing KYC:', error);
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkUnderReview = async (app: KycApplication) => {
    try {
      const response = await fetch('/api/kyc/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kyc_id: app.id,
          action: 'under_review',
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update KYC status');
      }

      // Update local state
      setApplications(apps =>
        apps.map(a =>
          a.id === app.id ? { ...a, kyc_status: 'under_review' } : a
        )
      );
      router.refresh();
    } catch (error) {
      console.error('Error updating KYC status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">KYC Review</h1>
        <p className="text-muted-foreground">Review and approve user KYC applications</p>
      </div>

      {/* Stats Grid */}
      <StatsGrid>
        <StatsCard
          title="Pending Review"
          value={stats.pendingCount}
          description="New applications"
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title="Under Review"
          value={stats.underReviewCount}
          description="Being processed"
          icon={AlertCircle}
        />
        <StatsCard
          title="Approved"
          value={stats.approvedCount}
          description="All time"
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title="Rejected"
          value={stats.rejectedCount}
          description="All time"
          icon={XCircle}
          variant="destructive"
        />
      </StatsGrid>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pending KYC Applications
          </CardTitle>
          <CardDescription>
            Review and process pending KYC applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending KYC applications</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono text-sm">
                      {app.application_id}
                    </TableCell>
                    <TableCell>
                      {app.first_name} {app.last_name}
                    </TableCell>
                    <TableCell>
                      {getLabel(ACCOUNT_TYPE_OPTIONS, app.account_type)}
                    </TableCell>
                    <TableCell>
                      {new Date(app.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={KYC_STATUS_COLORS[app.kyc_status]}>
                        {KYC_STATUS_LABELS[app.kyc_status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewApplication(app)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {app.kyc_status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkUnderReview(app)}
                          >
                            Start Review
                          </Button>
                        )}
                        {app.kyc_status === 'under_review' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleActionClick(app, 'approve')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleActionClick(app, 'reject')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Application Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KYC Application Details</DialogTitle>
            <DialogDescription>
              Application ID: {selectedApp?.application_id}
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Full Name</p>
                    <p className="font-medium">{selectedApp.first_name} {selectedApp.last_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">
                      {new Date(selectedApp.dob).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">PAN Number</p>
                    <p className="font-medium font-mono">{selectedApp.pan}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Aadhaar Number</p>
                    <p className="font-medium font-mono">
                      {selectedApp.aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="font-semibold">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Mobile</p>
                    <p className="font-medium">{selectedApp.mobile}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedApp.email}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Current Address</p>
                    <p className="font-medium">{selectedApp.address_current}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Permanent Address</p>
                    <p className="font-medium">{selectedApp.address_permanent}</p>
                  </div>
                </div>
              </div>

              {/* Employment & Account */}
              <div className="space-y-3">
                <h3 className="font-semibold">Employment & Account</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Account Type</p>
                    <p className="font-medium">{getLabel(ACCOUNT_TYPE_OPTIONS, selectedApp.account_type)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Occupation</p>
                    <p className="font-medium">{selectedApp.occupation}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Annual Income</p>
                    <p className="font-medium">{getLabel(ANNUAL_INCOME_OPTIONS, selectedApp.annual_income)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">PEP Status</p>
                    <Badge variant={selectedApp.pep ? 'destructive' : 'secondary'}>
                      {selectedApp.pep ? 'Yes - Politically Exposed' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Nominee Information */}
              {selectedApp.nominee_name && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Nominee Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nominee Name</p>
                      <p className="font-medium">{selectedApp.nominee_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Relationship</p>
                      <p className="font-medium capitalize">{selectedApp.nominee_relation}</p>
                    </div>
                    {selectedApp.nominee_dob && (
                      <div>
                        <p className="text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">
                          {new Date(selectedApp.nominee_dob).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedApp?.kyc_status === 'under_review' && (
              <>
                <Button
                  variant="default"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleActionClick(selectedApp, 'approve');
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleActionClick(selectedApp, 'reject');
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve KYC Application' : 'Reject KYC Application'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'This will approve the KYC application and allow the user to access the dashboard.'
                : 'Please provide a reason for rejection.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm">
                <span className="text-muted-foreground">Applicant:</span>{' '}
                <span className="font-medium">
                  {selectedApp?.first_name} {selectedApp?.last_name}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Application ID:</span>{' '}
                <span className="font-mono">{selectedApp?.application_id}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">
                {actionType === 'approve' ? 'Notes (Optional)' : 'Rejection Reason *'}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  actionType === 'approve'
                    ? 'Add any notes...'
                    : 'Please explain why this application is being rejected...'
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsActionDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={isProcessing || (actionType === 'reject' && !notes.trim())}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : actionType === 'approve' ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Approval
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
