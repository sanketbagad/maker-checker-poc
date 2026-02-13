import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { TABLES, TRANSACTION_STATUS, KYC_STATUS } from '@/lib/constants';

/**
 * GET /api/admin/stats
 * Returns comprehensive system stats for the SuperAdmin dashboard.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from(TABLES.PROFILES)
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [
      // User stats
      { count: totalUsers },
      { count: makerCount },
      { count: checkerCount },
      { count: adminCount },
      // Transaction stats
      { count: totalTransactions },
      { count: pendingTransactions },
      { count: approvedToday },
      { count: rejectedToday },
      { count: flaggedTransactions },
      // KYC stats
      { count: totalKyc },
      { count: pendingKyc },
      { count: approvedKyc },
      { count: rejectedKyc },
      // Audit stats
      { count: todayAuditCount },
      // Recent activity
      { data: recentUsers },
      { data: recentAuditLogs },
    ] = await Promise.all([
      // Users
      supabase.from(TABLES.PROFILES).select('*', { count: 'exact', head: true }),
      supabase.from(TABLES.PROFILES).select('*', { count: 'exact', head: true }).eq('role', 'maker'),
      supabase.from(TABLES.PROFILES).select('*', { count: 'exact', head: true }).eq('role', 'checker'),
      supabase
        .from(TABLES.PROFILES)
        .select('*', { count: 'exact', head: true })
        .in('role', ['admin', 'superadmin']),
      // Transactions
      supabase.from(TABLES.TRANSACTIONS).select('*', { count: 'exact', head: true }),
      supabase
        .from(TABLES.TRANSACTIONS)
        .select('*', { count: 'exact', head: true })
        .eq('status', TRANSACTION_STATUS.PENDING),
      supabase
        .from(TABLES.TRANSACTIONS)
        .select('*', { count: 'exact', head: true })
        .eq('status', TRANSACTION_STATUS.APPROVED)
        .gte('updated_at', todayISO),
      supabase
        .from(TABLES.TRANSACTIONS)
        .select('*', { count: 'exact', head: true })
        .eq('status', TRANSACTION_STATUS.REJECTED)
        .gte('updated_at', todayISO),
      supabase
        .from(TABLES.TRANSACTIONS)
        .select('*', { count: 'exact', head: true })
        .eq('status', TRANSACTION_STATUS.FLAGGED),
      // KYC
      supabase.from(TABLES.KYC_APPLICATIONS).select('*', { count: 'exact', head: true }),
      supabase
        .from(TABLES.KYC_APPLICATIONS)
        .select('*', { count: 'exact', head: true })
        .eq('kyc_status', KYC_STATUS.PENDING),
      supabase
        .from(TABLES.KYC_APPLICATIONS)
        .select('*', { count: 'exact', head: true })
        .eq('kyc_status', KYC_STATUS.APPROVED),
      supabase
        .from(TABLES.KYC_APPLICATIONS)
        .select('*', { count: 'exact', head: true })
        .eq('kyc_status', KYC_STATUS.REJECTED),
      // Audit
      supabase
        .from(TABLES.AUDIT_LOGS)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO),
      // Recent
      supabase
        .from(TABLES.PROFILES)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from(TABLES.AUDIT_LOGS)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: totalUsers || 0,
          makers: makerCount || 0,
          checkers: checkerCount || 0,
          admins: adminCount || 0,
        },
        transactions: {
          total: totalTransactions || 0,
          pending: pendingTransactions || 0,
          approvedToday: approvedToday || 0,
          rejectedToday: rejectedToday || 0,
          flagged: flaggedTransactions || 0,
        },
        kyc: {
          total: totalKyc || 0,
          pending: pendingKyc || 0,
          approved: approvedKyc || 0,
          rejected: rejectedKyc || 0,
        },
        audit: {
          todayCount: todayAuditCount || 0,
        },
        recentUsers: recentUsers || [],
        recentAuditLogs: recentAuditLogs || [],
      },
    });
  } catch (err) {
    console.error('Error in GET /api/admin/stats:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
