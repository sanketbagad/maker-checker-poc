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
import { TABLES, KYC_STATUS_LABELS, KYC_STATUS_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default async function AdminKycPage() {
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

  const { data: kycApplications } = await supabase
    .from(TABLES.KYC_APPLICATIONS)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All KYC Applications</h1>
        <p className="text-muted-foreground">System-wide KYC overview for compliance oversight</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">KYC Applications</CardTitle>
          <CardDescription>All KYC applications across the system</CardDescription>
        </CardHeader>
        <CardContent>
          {!kycApplications || kycApplications.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No KYC applications found</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application ID</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead>Account Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Reviewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kycApplications.map((kyc) => (
                    <TableRow key={kyc.id}>
                      <TableCell className="font-mono text-xs">
                        {kyc.application_id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {kyc.first_name} {kyc.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{kyc.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{kyc.pan}</TableCell>
                      <TableCell className="capitalize text-sm">{kyc.account_type}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'text-xs',
                            KYC_STATUS_COLORS[kyc.kyc_status] || ''
                          )}
                        >
                          {KYC_STATUS_LABELS[kyc.kyc_status] || kyc.kyc_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(kyc.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {kyc.reviewed_at
                          ? new Date(kyc.reviewed_at).toLocaleDateString()
                          : '—'}
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
