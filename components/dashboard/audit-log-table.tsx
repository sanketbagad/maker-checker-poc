'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, History } from 'lucide-react';
import { AUDIT_ACTIONS } from '@/lib/constants';
import { formatDate, truncate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { AuditLog } from '@/lib/types';

// Types
interface AuditLogTableProps {
  logs: AuditLog[];
}

// Constants
const ACTION_COLORS: Record<string, string> = {
  [AUDIT_ACTIONS.TRANSACTION_APPROVED]: 'bg-success/10 text-success border-success/20',
  [AUDIT_ACTIONS.TRANSACTION_REJECTED]: 'bg-destructive/10 text-destructive border-destructive/20',
  [AUDIT_ACTIONS.TRANSACTION_CREATED]: 'bg-primary/10 text-primary border-primary/20',
  [AUDIT_ACTIONS.BLACKLIST_ADDED]: 'bg-destructive/10 text-destructive border-destructive/20',
  [AUDIT_ACTIONS.BLACKLIST_REMOVED]: 'bg-muted text-muted-foreground',
  [AUDIT_ACTIONS.POLICY_UPDATED]: 'bg-warning/10 text-warning-foreground border-warning/20',
  BLACKLIST_ACTIVATE: 'bg-warning/10 text-warning-foreground border-warning/20',
  BLACKLIST_DEACTIVATE: 'bg-muted text-muted-foreground',
  POLICY_RULE_ACTIVATE: 'bg-success/10 text-success border-success/20',
  POLICY_RULE_DEACTIVATE: 'bg-muted text-muted-foreground',
};

const ACTION_LABELS: Record<string, string> = {
  [AUDIT_ACTIONS.TRANSACTION_APPROVED]: 'Transaction Approved',
  [AUDIT_ACTIONS.TRANSACTION_REJECTED]: 'Transaction Rejected',
  [AUDIT_ACTIONS.TRANSACTION_CREATED]: 'Transaction Created',
  [AUDIT_ACTIONS.BLACKLIST_ADDED]: 'Blacklist Entry Added',
  [AUDIT_ACTIONS.BLACKLIST_REMOVED]: 'Blacklist Entry Deleted',
  [AUDIT_ACTIONS.POLICY_UPDATED]: 'Policy Updated',
  BLACKLIST_ACTIVATE: 'Blacklist Entry Activated',
  BLACKLIST_DEACTIVATE: 'Blacklist Entry Deactivated',
  POLICY_RULE_ACTIVATE: 'Policy Rule Activated',
  POLICY_RULE_DEACTIVATE: 'Policy Rule Deactivated',
};

// Subcomponents
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-3 rounded-full bg-muted mb-4">
        <History className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">No audit logs yet</h3>
      <p className="text-sm text-muted-foreground mt-1">
        System activity will be recorded here
      </p>
    </div>
  );
}

function LogDetailsDialog({ log }: { log: AuditLog }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogDescription>
            {ACTION_LABELS[log.action] || log.action} - {formatDate(log.created_at)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-1">Entity Type</p>
              <p className="text-sm text-muted-foreground capitalize">
                {log.entity_type}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Entity ID</p>
              <p className="text-sm text-muted-foreground font-mono">
                {log.entity_id}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">User ID</p>
              <p className="text-sm text-muted-foreground font-mono">{log.user_id}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">IP Address</p>
              <p className="text-sm text-muted-foreground">
                {log.ip_address || 'N/A'}
              </p>
            </div>
          </div>

          {log.old_values && (
            <div>
              <p className="text-sm font-medium mb-2">Previous Values</p>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                {JSON.stringify(log.old_values, null, 2)}
              </pre>
            </div>
          )}

          {log.new_values && (
            <div>
              <p className="text-sm font-medium mb-2">New Values</p>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                {JSON.stringify(log.new_values, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LogRow({ log }: { log: AuditLog }) {
  return (
    <TableRow>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(log.created_at)}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn('font-normal', ACTION_COLORS[log.action] || 'bg-muted')}
        >
          {ACTION_LABELS[log.action] || log.action}
        </Badge>
      </TableCell>
      <TableCell className="capitalize">{log.entity_type}</TableCell>
      <TableCell className="font-mono text-xs">{truncate(log.entity_id)}</TableCell>
      <TableCell className="font-mono text-xs">{truncate(log.user_id)}</TableCell>
      <TableCell>
        <LogDetailsDialog log={log} />
      </TableCell>
    </TableRow>
  );
}

// Main Component
export function AuditLogTable({ logs }: AuditLogTableProps) {
  if (logs.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity Type</TableHead>
            <TableHead>Entity ID</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead className="w-[80px]">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
