'use client';

import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, ArrowLeft, Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import { createTransaction } from '@/hooks/use-transactions';
import { createClient } from '@/lib/supabase/client';
import {
  TRANSACTION_TYPE_OPTIONS,
  CURRENCIES,
  DEFAULT_CURRENCY,
} from '@/lib/constants';
import type { TransactionFormData, TransactionType } from '@/lib/types';

// Extended options with descriptions
const TRANSACTION_TYPE_DESCRIPTIONS: Record<string, string> = {
  fund_transfer: 'Transfer funds between accounts',
  payment_approval: 'Approve vendor or bill payment',
  account_change: 'Modify account settings or limits',
  loan_approval: 'Process loan disbursement',
};

const CURRENCY_LABELS: Record<string, string> = {
  INR: 'INR - Indian Rupee',
  USD: 'USD - US Dollar',
  EUR: 'EUR - Euro',
  GBP: 'GBP - British Pound',
  JPY: 'JPY - Japanese Yen',
  CAD: 'CAD - Canadian Dollar',
  AUD: 'AUD - Australian Dollar',
};

const initialFormState: TransactionFormData = {
  transaction_type: '' as TransactionType,
  amount: '',
  currency: DEFAULT_CURRENCY,
  source_account: '',
  destination_account: '',
  description: '',
};

export default function NewTransactionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TransactionFormData>(initialFormState);

  const updateField = <K extends keyof TransactionFormData>(
    field: K,
    value: TransactionFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in to create a transaction');
        setIsSubmitting(false);
        return;
      }

      await createTransaction({
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        source_account: formData.source_account,
        destination_account: formData.destination_account,
        description: formData.description || undefined,
        created_by: user.id,
      });

      router.push('/dashboard/maker');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/maker">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Transaction</h1>
          <p className="text-muted-foreground">Submit a new transaction for approval</p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>
            Fill in the transaction details below. All transactions require checker approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label htmlFor="transaction_type">Transaction Type</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(value) => updateField('transaction_type', value as TransactionType)}
                required
              >
                <SelectTrigger id="transaction_type">
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {TRANSACTION_TYPE_DESCRIPTIONS[type.value]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => updateField('amount', e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => updateField('currency', value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {CURRENCY_LABELS[currency] || currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Source Account */}
            <div className="space-y-2">
              <Label htmlFor="source_account">Source Account</Label>
              <Input
                id="source_account"
                placeholder="e.g., 1234567890"
                value={formData.source_account}
                onChange={(e) => updateField('source_account', e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Destination Account */}
            <div className="space-y-2">
              <Label htmlFor="destination_account">Destination Account</Label>
              <Input
                id="destination_account"
                placeholder="e.g., 0987654321"
                value={formData.destination_account}
                onChange={(e) => updateField('destination_account', e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter transaction details or notes..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit for Review
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
