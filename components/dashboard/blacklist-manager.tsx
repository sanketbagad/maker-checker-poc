'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2, Trash2, Ban } from 'lucide-react';
import { TABLES, AUDIT_ACTIONS } from '@/lib/constants';
import type { BlacklistEntry } from '@/lib/types';

// Types
interface BlacklistManagerProps {
  entries: BlacklistEntry[];
  userId: string;
}

interface FormData {
  account_number: string;
  entity_name: string;
  reason: string;
}

const initialFormState: FormData = {
  account_number: '',
  entity_name: '',
  reason: '',
};

// Subcomponents
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-3 rounded-full bg-muted mb-4">
        <Ban className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">No blacklist entries</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Add accounts or entities to flag suspicious transactions
      </p>
    </div>
  );
}

function BlacklistRow({
  entry,
  onToggle,
  onDelete,
}: {
  entry: BlacklistEntry;
  onToggle: (entry: BlacklistEntry) => void;
  onDelete: (entry: BlacklistEntry) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-mono">{entry.account_number}</TableCell>
      <TableCell>{entry.entity_name || '-'}</TableCell>
      <TableCell className="max-w-[200px] truncate">{entry.reason || '-'}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch checked={entry.is_active} onCheckedChange={() => onToggle(entry)} />
          <Badge variant={entry.is_active ? 'destructive' : 'secondary'}>
            {entry.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(entry)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function AddEntryDialog({
  isOpen,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  onFormChange: (data: FormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Blacklist Entry</DialogTitle>
          <DialogDescription>
            Add an account or entity to the blacklist. Transactions involving this
            account will be flagged.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                placeholder="e.g., 1234567890"
                value={formData.account_number}
                onChange={(e) =>
                  onFormChange({ ...formData, account_number: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity_name">Entity Name (Optional)</Label>
              <Input
                id="entity_name"
                placeholder="e.g., ABC Corporation"
                value={formData.entity_name}
                onChange={(e) =>
                  onFormChange({ ...formData, entity_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Why is this account being blacklisted?"
                value={formData.reason}
                onChange={(e) => onFormChange({ ...formData, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Ban className="mr-2 h-4 w-4" />
                  Add to Blacklist
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export function BlacklistManager({ entries, userId }: BlacklistManagerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormState);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const supabase = createClient();

    const { error } = await supabase.from(TABLES.BLACKLIST).insert({
      account_number: formData.account_number,
      entity_name: formData.entity_name || null,
      reason: formData.reason || null,
      is_active: true,
      created_by: userId,
    });

    if (!error) {
      await supabase.from(TABLES.AUDIT_LOGS).insert({
        user_id: userId,
        action: AUDIT_ACTIONS.BLACKLIST_ADDED,
        entity_type: 'blacklist',
        entity_id: formData.account_number,
        new_values: formData,
      });
    }

    setIsSubmitting(false);
    setIsOpen(false);
    setFormData(initialFormState);
    router.refresh();
  }

  async function toggleActive(entry: BlacklistEntry) {
    const supabase = createClient();

    await supabase
      .from(TABLES.BLACKLIST)
      .update({ is_active: !entry.is_active })
      .eq('id', entry.id);

    await supabase.from(TABLES.AUDIT_LOGS).insert({
      user_id: userId,
      action: entry.is_active ? 'BLACKLIST_DEACTIVATE' : 'BLACKLIST_ACTIVATE',
      entity_type: 'blacklist',
      entity_id: entry.id,
      old_values: { is_active: entry.is_active },
      new_values: { is_active: !entry.is_active },
    });

    router.refresh();
  }

  async function deleteEntry(entry: BlacklistEntry) {
    const supabase = createClient();

    await supabase.from(TABLES.BLACKLIST).delete().eq('id', entry.id);

    await supabase.from(TABLES.AUDIT_LOGS).insert({
      user_id: userId,
      action: AUDIT_ACTIONS.BLACKLIST_REMOVED,
      entity_type: 'blacklist',
      entity_id: entry.id,
      old_values: entry,
    });

    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddEntryDialog
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          formData={formData}
          onFormChange={setFormData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Number</TableHead>
                <TableHead>Entity Name</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <BlacklistRow
                  key={entry.id}
                  entry={entry}
                  onToggle={toggleActive}
                  onDelete={deleteEntry}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
