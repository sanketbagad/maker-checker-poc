import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TABLES } from '@/lib/constants';

export default async function AdminBlacklistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'superadmin') redirect('/dashboard/maker');

  const { data: blacklistEntries } = await supabase
    .from(TABLES.BLACKLIST)
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Blacklist Management</h1>
        <p className="text-muted-foreground">View and manage blacklisted accounts and entities</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Blacklisted Entries</CardTitle>
          <CardDescription>Accounts and entities flagged for restriction</CardDescription>
        </CardHeader>
        <CardContent>
          {!blacklistEntries || blacklistEntries.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No blacklist entries found</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Entity Name</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blacklistEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-sm">{entry.account_number}</TableCell>
                      <TableCell className="text-sm">{entry.entity_name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {entry.reason || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            entry.is_active
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }
                        >
                          {entry.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
