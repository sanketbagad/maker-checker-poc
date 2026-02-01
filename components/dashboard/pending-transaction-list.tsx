'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { approveTransaction, rejectTransaction } from '@/hooks/use-transactions';
import { TRANSACTION_TYPE_LABELS, SEVERITY_COLORS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Transaction, PolicyViolation } from '@/lib/types';

// Types
interface TransactionWithViolations extends Transaction {
  policy_violations?: PolicyViolation[];
}

interface PendingTransactionListProps {
  transactions: TransactionWithViolations[];
  userId: string;
}

type ActionType = 'approve' | 'reject';

// Components
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-3 rounded-full bg-success/10 mb-4">
        <CheckCircle className="h-6 w-6 text-success" />
      </div>
      <h3 className="text-lg font-medium">All caught up!</h3>
      <p className="text-sm text-muted-foreground mt-1">
        No transactions pending review at this time
      </p>
    </div>
  );
}

function ViolationsList({ violations }: { violations: PolicyViolation[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-warning-foreground">Policy Alerts:</p>
      <div className="space-y-2">
        {violations.map((violation) => (
          <div
            key={violation.id}
            className={cn(
              'text-sm p-2 rounded-md border',
              SEVERITY_COLORS[violation.severity]
            )}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <Badge variant="outline" className="mb-1 text-xs capitalize">
                  {violation.severity}
                </Badge>
                <p>{violation.violation_details}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionCard({
  transaction,
  onApprove,
  onReject,
}: {
  transaction: TransactionWithViolations;
  onApprove: (transaction: Transaction) => void;
  onReject: (transaction: Transaction) => void;
}) {
  const hasViolations =
    transaction.policy_violations && transaction.policy_violations.length > 0;

  return (
    <Card
      className={cn('transition-colors', hasViolations && 'border-warning/50')}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              {TRANSACTION_TYPE_LABELS[transaction.transaction_type] ||
                transaction.transaction_type}
              {hasViolations && (
                <Badge
                  variant="outline"
                  className="bg-warning/10 text-warning-foreground border-warning/20"
                >
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {transaction.policy_violations?.length} Alert
                  {transaction.policy_violations &&
                  transaction.policy_violations.length > 1
                    ? 's'
                    : ''}
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground font-mono">
              ID: {transaction.id.slice(0, 8)}...
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">
              {formatCurrency(transaction.amount, transaction.currency)}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
              <Clock className="h-3 w-3" />
              {formatDate(transaction.created_at)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Flow */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono bg-muted px-2 py-1 rounded">
            {transaction.source_account}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono bg-muted px-2 py-1 rounded">
            {transaction.destination_account}
          </span>
        </div>

        {/* Description */}
        {transaction.description && (
          <p className="text-sm text-muted-foreground">{transaction.description}</p>
        )}

        {/* Violations */}
        {hasViolations && transaction.policy_violations && (
          <ViolationsList violations={transaction.policy_violations} />
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => onApprove(transaction)}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => onReject(transaction)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionDialog({
  transaction,
  actionType,
  notes,
  isProcessing,
  onNotesChange,
  onConfirm,
  onClose,
}: {
  transaction: Transaction | null;
  actionType: ActionType | null;
  notes: string;
  isProcessing: boolean;
  onNotesChange: (notes: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!transaction || !actionType) return null;

  const isApprove = actionType === 'approve';

  return (
    <Dialog
      open={!!transaction}
      onOpenChange={() => {
        if (!isProcessing) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isApprove ? 'Approve Transaction' : 'Reject Transaction'}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? 'Please confirm you want to approve this transaction.'
              : 'Please provide a reason for rejecting this transaction.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-bold">
              {formatCurrency(transaction.amount, transaction.currency)}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isApprove ? 'Notes (Optional)' : 'Rejection Reason'}
            </label>
            <Textarea
              placeholder={
                isApprove
                  ? 'Add any notes for the audit trail...'
                  : 'Please explain why this transaction is being rejected...'
              }
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              required={!isApprove}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing || (!isApprove && !notes.trim())}
            className={
              isApprove ? 'bg-success hover:bg-success/90 text-success-foreground' : ''
            }
            variant={isApprove ? 'default' : 'destructive'}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isApprove ? (
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
  );
}

// Main Component
export function PendingTransactionList({
  transactions,
  userId,
}: PendingTransactionListProps) {
  const router = useRouter();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(
    null
  );
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleAction() {
    if (!selectedTransaction || !actionType) return;

    setIsProcessing(true);

    try {
      if (actionType === 'approve') {
        await approveTransaction(selectedTransaction.id, userId, notes || undefined);
      } else {
        await rejectTransaction(selectedTransaction.id, userId, notes);
      }
    } finally {
      setIsProcessing(false);
      closeDialog();
      router.refresh();
    }
  }

  function openDialog(transaction: Transaction, action: ActionType) {
    setSelectedTransaction(transaction);
    setActionType(action);
  }

  function closeDialog() {
    setSelectedTransaction(null);
    setActionType(null);
    setNotes('');
  }

  if (transactions.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            onApprove={(t) => openDialog(t, 'approve')}
            onReject={(t) => openDialog(t, 'reject')}
          />
        ))}
      </div>

      <ActionDialog
        transaction={selectedTransaction}
        actionType={actionType}
        notes={notes}
        isProcessing={isProcessing}
        onNotesChange={setNotes}
        onConfirm={handleAction}
        onClose={closeDialog}
      />
    </>
  );
}
