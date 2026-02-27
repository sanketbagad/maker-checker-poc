'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  UserPlus,
  Search,
  Loader2,
  CheckCircle2,
  Mail,
  AlertCircle,
  RefreshCw,
  Users,
  Shield,
  UserCheck,
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  kyc_completed?: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  maker: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  checker: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  superadmin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  maker: <Users className="h-3.5 w-3.5" />,
  checker: <UserCheck className="h-3.5 w-3.5" />,
  admin: <Shield className="h-3.5 w-3.5" />,
  superadmin: <Shield className="h-3.5 w-3.5" />,
};

export default function UserManagementClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showCreateOnLoad = searchParams.get('action') === 'create';

  // List state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(showCreateOnLoad);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    full_name: '',
    role: 'checker',
  });
  const [createResult, setCreateResult] = useState<{
    type: 'success' | 'error';
    message: string;
    data?: {
      email: string;
      full_name: string;
      role: string;
      email_sent: boolean;
    };
  } | null>(null);

  const limit = 15;

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/users?${params}`);
      const result = await res.json();

      if (result.success) {
        setUsers(result.data);
        setTotalUsers(result.total);
      }
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [page, roleFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateResult(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const result = await res.json();

      if (!res.ok) {
        setCreateResult({ type: 'error', message: result.error });
        return;
      }

      setCreateResult({
        type: 'success',
        message: result.message,
        data: result.data,
      });

      // Refresh user list
      fetchUsers();
    } catch {
      setCreateResult({ type: 'error', message: 'An unexpected error occurred' });
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({ email: '', full_name: '', role: 'checker' });
    setCreateResult(null);
  };

  const totalPages = Math.ceil(totalUsers / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">
            Create and manage checkers, admins, and system users
          </p>
        </div>
        <Button
          onClick={() => {
            resetCreateForm();
            setIsCreateOpen(true);
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="maker">Makers</SelectItem>
                <SelectItem value="checker">Checkers</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="superadmin">SuperAdmins</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchUsers} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Users ({totalUsers})
          </CardTitle>
          <CardDescription>
            All registered users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>KYC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                              {(u.full_name || u.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {u.full_name || 'No name'}
                              </p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${ROLE_COLORS[u.role] || ''} gap-1`}
                            variant="secondary"
                          >
                            {ROLE_ICONS[u.role]}
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {u.role === 'maker' ? (
                            <Badge
                              variant="secondary"
                              className={
                                u.kyc_completed
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                              }
                            >
                              {u.kyc_completed ? 'Verified' : 'Pending'}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} &middot; {totalUsers} users total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {createResult?.type === 'success' ? (
            // Success view
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  User Created Successfully
                </DialogTitle>
                <DialogDescription>{createResult.message}</DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{createResult.data?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{createResult.data?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <Badge
                    className={ROLE_COLORS[createResult.data?.role || ''] || ''}
                    variant="secondary"
                  >
                    {createResult.data?.role}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Email Sent</span>
                  {createResult.data?.email_sent ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1">
                      <Mail className="h-3 w-3" />
                      Sent
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Not Sent
                    </Badge>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetCreateForm();
                    setIsCreateOpen(false);
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    resetCreateForm();
                  }}
                >
                  Create Another
                </Button>
              </DialogFooter>
            </div>
          ) : (
            // Create form view
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Create a checker or admin account. The user will receive their login
                  credentials via email.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    placeholder="Enter full name"
                    value={createForm.full_name}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, full_name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@company.com"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, email: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={createForm.role}
                    onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v }))}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checker">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          Checker (Compliance Officer)
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-purple-600" />
                          Admin (System Administrator)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {createForm.role === 'checker'
                      ? 'Checkers can review and approve/reject transactions and KYC applications.'
                      : 'Admins have full access to review transactions, KYC, and manage policies.'}
                  </p>
                </div>

                {createResult?.type === 'error' && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <p className="text-sm text-destructive">{createResult.message}</p>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Email Notification</p>
                      <p className="text-xs text-muted-foreground">
                        A secure temporary password will be generated and sent to the
                        user&apos;s email address. They will be prompted to change it on first
                        login.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetCreateForm();
                    setIsCreateOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
