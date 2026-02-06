import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { TABLES } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is a checker or admin
    const { data: profile } = await supabase
      .from(TABLES.PROFILES)
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['checker', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Only checkers can view KYC applications' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from(TABLES.KYC_APPLICATIONS)
      .select('*, user:profiles!kyc_applications_user_id_fkey(*)', { count: 'exact' });

    if (status) {
      query = query.eq('kyc_status', status);
    }

    // Get total count and paginated data
    const { data: applications, error: fetchError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error('Error fetching KYC applications:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch KYC applications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: applications,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching KYC list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
