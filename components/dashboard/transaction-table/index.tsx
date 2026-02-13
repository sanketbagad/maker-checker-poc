'use client';

import React, { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { Transaction } from '@/lib/types';
import { TRANSACTION_TYPE_LABELS, STATUS_COLORS } from '@/lib/constants';
import { formatCurrency, formatDate, truncate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Context for compound components
interface TransactionTableContextValue {
  transactions: Transaction[];
  userRole: 'maker' | 'checker';
  showActions: boolean;
  onView?: (id: string) => void;
  onApprove?: (transaction: Transaction) => void;
  onReject?: (transaction: Transaction) => void;
}

const TransactionTableContext = createContext<TransactionTableContextValue | null>(null);

function useTransactionTable() {
  const context = useContext(TransactionTableContext);
  if (!context) {
    throw new Error('TransactionTable components must be used within TransactionTable.Root');
  }
  return context;
}

// Root Component
interface RootProps {
  children: React.ReactNode;
  transactions: Transaction[];
  userRole?: 'maker' | 'checker';
  showActions?: boolean;
  onView?: (id: string) => void;
  onApprove?: (transaction: Transaction) => void;
  onReject?: (transaction: Transaction) => void;
}

function Root({
  children,
  transactions,
  userRole = 'maker',
  showActions = true,
  onView,
  onApprove,
  onReject,
}: RootProps) {
  return (
    <TransactionTableContext.Provider
      value={{ transactions, userRole, showActions, onView, onApprove, onReject }}
    >
      {transactions.length === 0 ? <EmptyState /> : children}
    </TransactionTableContext.Provider>
  );
}

// Empty State Component
function EmptyState() {
  const { userRole } = useTransactionTable();
  
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-3 rounded-full bg-muted mb-4">
        <AlertTriangle className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">No transactions found</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {userRole === 'maker'
          ? 'Create a new transaction to get started'
          : 'No transactions pending review'}
      </p>
    </div>
  );
}

// Table Component
function TableWrapper({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border">{children}</div>;
}

// Header Component
interface HeaderProps {
  columns?: ('id' | 'type' | 'amount' | 'source' | 'destination' | 'status' | 'created' | 'actions')[];
}

function Header({ columns = ['id', 'type', 'amount', 'source', 'destination', 'status', 'created', 'actions'] }: HeaderProps) {
  const { showActions } = useTransactionTable();
  
  const columnConfig = {
    id: { label: 'ID', className: '' },
    type: { label: 'Type', className: '' },
    amount: { label: 'Amount', className: '' },
    source: { label: 'Source', className: 'hidden md:table-cell' },
    destination: { label: 'Destination', className: 'hidden md:table-cell' },
    status: { label: 'Status', className: '' },
    created: { label: 'Created', className: 'hidden lg:table-cell' },
    actions: { label: 'Actions', className: 'w-[70px]' },
  };
  
  const visibleColumns = showActions ? columns : columns.filter(c => c !== 'actions');
  
  return (
    <TableHeader>
      <TableRow>
        {visibleColumns.map((col) => (
          <TableHead key={col} className={columnConfig[col].className}>
            {columnConfig[col].label}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

// Body Component
function Body() {
  const { transactions } = useTransactionTable();
  
  return (
    <TableBody>
      {transactions.map((transaction) => (
        <Row key={transaction.id} transaction={transaction} />
      ))}
    </TableBody>
  );
}

// Row Component
function Row({ transaction }: { transaction: Transaction }) {
  const { showActions } = useTransactionTable();
  
  return (
    <TableRow>
      <IdCell transaction={transaction} />
      <TypeCell transaction={transaction} />
      <AmountCell transaction={transaction} />
      <SourceCell transaction={transaction} />
      <DestinationCell transaction={transaction} />
      <StatusCell transaction={transaction} />
      <DateCell transaction={transaction} />
      {showActions && <ActionsCell transaction={transaction} />}
    </TableRow>
  );
}

// Cell Components
function IdCell({ transaction }: { transaction: Transaction }) {
  return (
    <TableCell className="font-mono text-xs">
      {truncate(transaction.id)}
    </TableCell>
  );
}

function TypeCell({ transaction }: { transaction: Transaction }) {
  return (
    <TableCell>
      <Badge variant="outline" className="font-normal">
        {TRANSACTION_TYPE_LABELS[transaction.transaction_type] || transaction.transaction_type}
      </Badge>
    </TableCell>
  );
}

function AmountCell({ transaction }: { transaction: Transaction }) {
  return (
    <TableCell className="font-medium">
      {formatCurrency(transaction.amount, transaction.currency)}
    </TableCell>
  );
}

function SourceCell({ transaction }: { transaction: Transaction }) {
  return (
    <TableCell className="hidden md:table-cell font-mono text-xs">
      {transaction.source_account}
    </TableCell>
  );
}

function DestinationCell({ transaction }: { transaction: Transaction }) {
  return (
    <TableCell className="hidden md:table-cell font-mono text-xs">
      {transaction.destination_account}
    </TableCell>
  );
}

function StatusCell({ transaction }: { transaction: Transaction }) {
  return (
    <TableCell>
      <Badge
        variant="outline"
        className={cn('capitalize', STATUS_COLORS[transaction.status])}
      >
        {transaction.status}
      </Badge>
    </TableCell>
  );
}

function DateCell({ transaction }: { transaction: Transaction }) {
  return (
    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
      {formatDate(transaction.created_at)}
    </TableCell>
  );
}

function ActionsCell({ transaction }: { transaction: Transaction }) {
  const router = useRouter();
  const { userRole, onView, onApprove, onReject } = useTransactionTable();
  
  function handleView() {
    if (onView) {
      onView(transaction.id);
    } else {
      router.push(`/dashboard/transaction/${transaction.id}`);
    }
  }
  
  return (
    <TableCell>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleView}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          {userRole === 'checker' && transaction.status === 'pending' && (
            <>
              <DropdownMenuItem
                onClick={() => onApprove?.(transaction)}
                className="text-success focus:text-success"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onReject?.(transaction)}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TableCell>
  );
}

// Compound Component Export
export const TransactionTable = {
  Root,
  Table: TableWrapper,
  Header,
  Body,
  Row,
  EmptyState,
  // Cells
  IdCell,
  TypeCell,
  AmountCell,
  SourceCell,
  DestinationCell,
  StatusCell,
  DateCell,
  ActionsCell,
};

// Convenience component for basic usage
export function SimpleTransactionTable({
  transactions,
  userRole = 'maker',
  showActions = true,
  onView,
  onApprove,
  onReject,
}: Omit<RootProps, 'children'>) {
  return (
    <TransactionTable.Root
      transactions={transactions}
      userRole={userRole}
      showActions={showActions}
      onView={onView}
      onApprove={onApprove}
      onReject={onReject}
    >
      <TransactionTable.Table>
        <Table>
          <TransactionTable.Header />
          <TransactionTable.Body />
        </Table>
      </TransactionTable.Table>
    </TransactionTable.Root>
  );
}
