'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  User,
  Phone,
  MapPin,
  Briefcase,
  Users,
  ShieldCheck,
} from 'lucide-react';
import {
  ACCOUNT_TYPE_OPTIONS,
  ANNUAL_INCOME_OPTIONS,
  NOMINEE_RELATION_OPTIONS,
  KYC_STATUS_LABELS,
  KYC_STATUS_COLORS,
} from '@/lib/constants';
import type { KycApplication } from '@/lib/types';
import { cn } from '@/lib/utils';

interface KycUpdateClientProps {
  kycApplication: KycApplication;
}

type FormField = {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'checkbox' | 'readonly';
  options?: readonly { value: string; label: string }[];
  placeholder?: string;
  description?: string;
};

const PERSONAL_FIELDS: FormField[] = [
  { key: 'first_name', label: 'First Name', type: 'text', placeholder: 'Enter first name' },
  { key: 'last_name', label: 'Last Name', type: 'text', placeholder: 'Enter last name' },
  { key: 'dob', label: 'Date of Birth', type: 'readonly', description: 'Cannot be changed after KYC submission' },
  { key: 'pan', label: 'PAN Number', type: 'readonly', description: 'Cannot be changed after KYC submission' },
  { key: 'aadhaar', label: 'Aadhaar Number', type: 'readonly', description: 'Cannot be changed after KYC submission' },
];

const CONTACT_FIELDS: FormField[] = [
  { key: 'mobile', label: 'Mobile Number', type: 'tel', placeholder: '10-digit mobile number' },
  { key: 'email', label: 'Email Address', type: 'email', placeholder: 'Enter email address' },
  { key: 'address_current', label: 'Current Address', type: 'text', placeholder: 'Enter current address' },
  { key: 'address_permanent', label: 'Permanent Address', type: 'text', placeholder: 'Enter permanent address' },
];

const EMPLOYMENT_FIELDS: FormField[] = [
  { key: 'occupation', label: 'Occupation', type: 'text', placeholder: 'Enter occupation' },
  { key: 'annual_income', label: 'Annual Income', type: 'select', options: ANNUAL_INCOME_OPTIONS },
  { key: 'account_type', label: 'Account Type', type: 'select', options: ACCOUNT_TYPE_OPTIONS },
  { key: 'pep', label: 'Politically Exposed Person (PEP)', type: 'checkbox' },
];

const NOMINEE_FIELDS: FormField[] = [
  { key: 'nominee_name', label: 'Nominee Name', type: 'text', placeholder: 'Enter nominee name' },
  { key: 'nominee_relation', label: 'Relation', type: 'select', options: NOMINEE_RELATION_OPTIONS },
  { key: 'nominee_dob', label: 'Nominee Date of Birth', type: 'date' },
];

function maskAadhaar(aadhaar: string): string {
  if (!aadhaar || aadhaar.length !== 12) return aadhaar;
  return `XXXX-XXXX-${aadhaar.slice(-4)}`;
}

export default function KycUpdateClient({ kycApplication }: KycUpdateClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    type: 'success' | 'error';
    message: string;
    changedFields?: string[];
  } | null>(null);

  // Initialize form data from current KYC application
  const [formData, setFormData] = useState<Record<string, string | boolean>>({
    first_name: kycApplication.first_name || '',
    last_name: kycApplication.last_name || '',
    mobile: kycApplication.mobile || '',
    email: kycApplication.email || '',
    address_current: kycApplication.address_current || '',
    address_permanent: kycApplication.address_permanent || '',
    occupation: kycApplication.occupation || '',
    annual_income: kycApplication.annual_income || '',
    account_type: kycApplication.account_type || '',
    pep: kycApplication.pep || false,
    nominee_name: kycApplication.nominee_name || '',
    nominee_relation: kycApplication.nominee_relation || '',
    nominee_dob: kycApplication.nominee_dob || '',
  });

  // Track which fields have been modified
  const getChangedFields = useCallback(() => {
    const changed: string[] = [];
    for (const key of Object.keys(formData)) {
      const original = kycApplication[key as keyof KycApplication];
      const current = formData[key];
      if (String(current ?? '') !== String(original ?? '')) {
        changed.push(key);
      }
    }
    return changed;
  }, [formData, kycApplication]);

  const changedFields = getChangedFields();
  const hasChanges = changedFields.length > 0;

  const isPendingOrUnderReview =
    kycApplication.kyc_status === 'pending' || kycApplication.kyc_status === 'under_review';

  const handleInputChange = (key: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setSubmitResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await fetch('/api/kyc/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubmitResult({
          type: 'error',
          message: result.error || 'Failed to submit KYC update.',
        });
        return;
      }

      setSubmitResult({
        type: 'success',
        message: result.message || 'KYC update submitted successfully.',
        changedFields: result.data?.changed_fields,
      });
    } catch {
      setSubmitResult({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.key];
    const isChanged = changedFields.includes(field.key);

    if (field.type === 'readonly') {
      let displayValue = String(kycApplication[field.key as keyof KycApplication] ?? '');
      if (field.key === 'aadhaar') displayValue = maskAadhaar(displayValue);
      return (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">{field.label}</Label>
          <div className="flex items-center gap-2">
            <Input value={displayValue} disabled className="bg-muted/50 cursor-not-allowed" />
            <Badge variant="outline" className="shrink-0 text-xs">
              Locked
            </Badge>
          </div>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
      );
    }

    if (field.type === 'select' && field.options) {
      return (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key} className="text-sm font-medium">
            {field.label}
            {isChanged && (
              <Badge variant="secondary" className="ml-2 text-xs bg-primary/10 text-primary">
                Modified
              </Badge>
            )}
          </Label>
          <Select
            value={String(value || '')}
            onValueChange={(v) => handleInputChange(field.key, v)}
            disabled={isPendingOrUnderReview}
          >
            <SelectTrigger
              id={field.key}
              className={cn(isChanged && 'border-primary ring-1 ring-primary/20')}
            >
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <div key={field.key} className="flex items-center gap-3 py-2">
          <input
            id={field.key}
            type="checkbox"
            checked={!!value}
            onChange={(e) => handleInputChange(field.key, e.target.checked)}
            disabled={isPendingOrUnderReview}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor={field.key} className="text-sm font-medium cursor-pointer">
            {field.label}
            {isChanged && (
              <Badge variant="secondary" className="ml-2 text-xs bg-primary/10 text-primary">
                Modified
              </Badge>
            )}
          </Label>
        </div>
      );
    }

    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key} className="text-sm font-medium">
          {field.label}
          {isChanged && (
            <Badge variant="secondary" className="ml-2 text-xs bg-primary/10 text-primary">
              Modified
            </Badge>
          )}
        </Label>
        <Input
          id={field.key}
          type={field.type}
          value={String(value || '')}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          disabled={isPendingOrUnderReview}
          className={cn(isChanged && 'border-primary ring-1 ring-primary/20')}
        />
      </div>
    );
  };

  // ---- Success confirmation view ----
  if (submitResult?.type === 'success') {
    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/40">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-green-800 dark:text-green-300">
                  KYC Update Submitted
                </h2>
                <p className="text-sm text-green-700 dark:text-green-400 max-w-md">
                  {submitResult.message}
                </p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20 max-w-md w-full">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Pending Compliance Verification
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Your KYC updates will not take effect until reviewed and approved by the
                      Compliance team. You will be notified once the review is complete.
                    </p>
                  </div>
                </div>
              </div>

              {submitResult.changedFields && submitResult.changedFields.length > 0 && (
                <div className="rounded-lg border p-4 max-w-md w-full">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Fields submitted for review:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {submitResult.changedFields.map((field) => (
                      <Badge key={field} variant="secondary" className="text-xs capitalize">
                        {field.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => router.push('/dashboard/maker')}>
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => {
                    setSubmitResult(null);
                    router.refresh();
                  }}
                >
                  View Updated KYC
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">KYC Update</h1>
          <p className="text-muted-foreground">
            Update your KYC information. Changes require compliance approval.
          </p>
        </div>
        <Badge className={cn('text-sm px-3 py-1', KYC_STATUS_COLORS[kycApplication.kyc_status])}>
          {KYC_STATUS_LABELS[kycApplication.kyc_status]}
        </Badge>
      </div>

      {/* Pending / Under Review Banner */}
      {isPendingOrUnderReview && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  KYC Review in Progress
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Your KYC application is currently being reviewed. Fields cannot be edited until
                  the review is complete. You will be able to make changes after the review.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Banner */}
      {submitResult?.type === 'error' && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Submission Failed</p>
                <p className="text-xs text-destructive/80 mt-1">{submitResult.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KYC Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </div>
            <CardDescription>
              Identity documents (PAN, Aadhaar) are locked after initial KYC submission.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {PERSONAL_FIELDS.map(renderField)}
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Contact Details</CardTitle>
            </div>
            <CardDescription>Update your phone, email, and address information.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {CONTACT_FIELDS.map(renderField)}
          </CardContent>
        </Card>

        {/* Employment & Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Employment & Account</CardTitle>
            </div>
            <CardDescription>Update your employment and account preferences.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {EMPLOYMENT_FIELDS.map(renderField)}
          </CardContent>
        </Card>

        {/* Nominee Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Nominee Details</CardTitle>
            </div>
            <CardDescription>Update nominee information for your account.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {NOMINEE_FIELDS.map(renderField)}
          </CardContent>
        </Card>

        <Separator />

        {/* Summary & Submit */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 mb-4">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Compliance Review Required</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All KYC updates must be verified and approved by the Compliance team before they
                  take effect. Your existing KYC details will remain active until the update is
                  approved.
                </p>
              </div>
            </div>

            {hasChanges && (
              <div className="rounded-lg border p-3 mb-4 bg-muted/30">
                <p className="text-sm font-medium mb-2">
                  {changedFields.length} field{changedFields.length > 1 ? 's' : ''} modified:
                </p>
                <div className="flex flex-wrap gap-2">
                  {changedFields.map((field) => (
                    <Badge key={field} variant="secondary" className="text-xs capitalize">
                      {field.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/maker')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!hasChanges || isSubmitting || isPendingOrUnderReview}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit for Compliance Verification'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
