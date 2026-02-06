import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { TABLES } from '@/lib/constants';

export async function GET() {
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

    // Get user's KYC application
    const { data: kycApplication, error: fetchError } = await supabase
      .from(TABLES.KYC_APPLICATIONS)
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching KYC application:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch KYC application' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: kycApplication || null,
    });
  } catch (error) {
    console.error('Error fetching KYC status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
