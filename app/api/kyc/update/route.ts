import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { TABLES, KYC_STATUS } from '@/lib/constants';

/**
 * POST /api/kyc/update
 * Allows a Maker (Relationship Manager) to submit KYC field updates.
 * Updates are stored with status 'pending' and do NOT take effect until
 * approved by a Checker (Compliance Officer).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the existing KYC application for this user
    const { data: existingKyc, error: fetchError } = await supabase
      .from(TABLES.KYC_APPLICATIONS)
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingKyc) {
      return NextResponse.json(
        { error: 'No KYC application found. Please complete onboarding first.' },
        { status: 404 }
      );
    }

    // Only allow updates when the current KYC is approved (or rejected for re-submission)
    if (existingKyc.kyc_status === KYC_STATUS.PENDING || existingKyc.kyc_status === KYC_STATUS.UNDER_REVIEW) {
      return NextResponse.json(
        {
          error:
            'Your KYC application is currently under review. Please wait for the current review to complete before submitting updates.',
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Editable KYC fields (identity docs like PAN/Aadhaar are NOT editable)
    const editableFields = [
      'first_name',
      'last_name',
      'mobile',
      'email',
      'address_current',
      'address_permanent',
      'occupation',
      'annual_income',
      'account_type',
      'pep',
      'nominee_name',
      'nominee_relation',
      'nominee_dob',
    ];

    // Build the changeset — only include fields that actually changed
    const changes: Record<string, unknown> = {};
    const oldValues: Record<string, unknown> = {};

    for (const field of editableFields) {
      if (body[field] !== undefined && body[field] !== existingKyc[field]) {
        changes[field] = body[field];
        oldValues[field] = existingKyc[field];
      }
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json(
        { error: 'No changes detected. Please modify at least one field.' },
        { status: 400 }
      );
    }

    // Validate fields if they are being changed
    if (changes.mobile && !/^\d{10}$/.test(String(changes.mobile))) {
      return NextResponse.json({ error: 'Invalid mobile number format' }, { status: 400 });
    }

    if (changes.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(changes.email))) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (changes.first_name && String(changes.first_name).trim().length === 0) {
      return NextResponse.json({ error: 'First name cannot be empty' }, { status: 400 });
    }

    if (changes.last_name && String(changes.last_name).trim().length === 0) {
      return NextResponse.json({ error: 'Last name cannot be empty' }, { status: 400 });
    }

    // Apply changes and reset status to pending for compliance verification
    const { data: updatedKyc, error: updateError } = await supabase
      .from(TABLES.KYC_APPLICATIONS)
      .update({
        ...changes,
        kyc_status: KYC_STATUS.PENDING,
        checker_id: null,
        checker_notes: null,
        reviewed_at: null,
      })
      .eq('id', existingKyc.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating KYC application:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update KYC application' },
        { status: 500 }
      );
    }

    // Create audit log
    await supabase.from(TABLES.AUDIT_LOGS).insert({
      user_id: user.id,
      action: 'KYC_UPDATE_SUBMITTED',
      entity_type: 'kyc_application',
      entity_id: existingKyc.id,
      old_values: oldValues,
      new_values: changes,
    });

    return NextResponse.json({
      success: true,
      message: 'KYC update submitted successfully. Changes are pending compliance verification.',
      data: {
        id: updatedKyc.id,
        application_id: updatedKyc.application_id,
        kyc_status: updatedKyc.kyc_status,
        changed_fields: Object.keys(changes),
      },
    });
  } catch (error) {
    console.error('Error updating KYC:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
