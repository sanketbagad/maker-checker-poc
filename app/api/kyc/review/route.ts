import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { TABLES, KYC_STATUS } from '@/lib/constants';

export async function POST(request: Request) {
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
        { error: 'Unauthorized - Only checkers can review KYC applications' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { kyc_id, action, notes } = body;

    if (!kyc_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: kyc_id and action' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'under_review'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, reject, or under_review' },
        { status: 400 }
      );
    }

    // Get the KYC application
    const { data: kycApplication, error: fetchError } = await supabase
      .from(TABLES.KYC_APPLICATIONS)
      .select('*')
      .eq('id', kyc_id)
      .single();

    if (fetchError || !kycApplication) {
      return NextResponse.json(
        { error: 'KYC application not found' },
        { status: 404 }
      );
    }

    const newStatus = action === 'approve' 
      ? KYC_STATUS.APPROVED 
      : action === 'reject' 
        ? KYC_STATUS.REJECTED 
        : KYC_STATUS.UNDER_REVIEW;

    // Update the KYC application
    const { data: updatedKyc, error: updateError } = await supabase
      .from(TABLES.KYC_APPLICATIONS)
      .update({
        kyc_status: newStatus,
        checker_id: user.id,
        checker_notes: notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', kyc_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating KYC application:', updateError);
      return NextResponse.json(
        { error: 'Failed to update KYC application' },
        { status: 500 }
      );
    }

    // If approved, update the profile's kyc_completed status
    if (newStatus === KYC_STATUS.APPROVED) {
      await supabase
        .from(TABLES.PROFILES)
        .update({ kyc_completed: true })
        .eq('id', kycApplication.user_id);
    }

    // Create audit log
    await supabase.from(TABLES.AUDIT_LOGS).insert({
      user_id: user.id,
      action: `KYC_${action.toUpperCase()}`,
      entity_type: 'kyc_application',
      entity_id: kyc_id,
      old_values: { kyc_status: kycApplication.kyc_status },
      new_values: { kyc_status: newStatus, checker_notes: notes },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedKyc.id,
        kyc_status: updatedKyc.kyc_status,
        reviewed_at: updatedKyc.reviewed_at,
      },
    });
  } catch (error) {
    console.error('Error reviewing KYC:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
