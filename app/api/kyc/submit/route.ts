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

    // Check if user already has a KYC application
    const { data: existingKyc } = await supabase
      .from(TABLES.KYC_APPLICATIONS)
      .select('id, kyc_status')
      .eq('user_id', user.id)
      .single();

    if (existingKyc) {
      return NextResponse.json(
        { error: 'KYC application already exists', kyc_status: existingKyc.kyc_status },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields only
    const requiredFields = [
      'first_name', 'last_name', 'dob', 'pan', 'aadhaar',
      'mobile', 'email', 'address_current', 'account_type'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate PAN format
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(body.pan.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid PAN format' },
        { status: 400 }
      );
    }

    // Validate Aadhaar format
    if (!/^\d{12}$/.test(body.aadhaar)) {
      return NextResponse.json(
        { error: 'Invalid Aadhaar format' },
        { status: 400 }
      );
    }

    // Validate mobile format
    if (!/^\d{10}$/.test(body.mobile)) {
      return NextResponse.json(
        { error: 'Invalid mobile number format' },
        { status: 400 }
      );
    }

    // Use current address as permanent address if not provided
    const permanentAddress = body.address_permanent?.trim() || body.address_current;

    // Create KYC application
    const { data: kycApplication, error: insertError } = await supabase
      .from(TABLES.KYC_APPLICATIONS)
      .insert({
        user_id: user.id,
        first_name: body.first_name,
        last_name: body.last_name,
        dob: body.dob,
        pan: body.pan.toUpperCase(),
        aadhaar: body.aadhaar,
        account_type: body.account_type,
        mobile: body.mobile,
        email: body.email,
        address_current: body.address_current,
        address_permanent: permanentAddress,
        occupation: body.occupation || null,
        annual_income: body.annual_income || null,
        pep: body.pep || false,
        nominee_name: body.nominee_name || null,
        nominee_relation: body.nominee_relation || null,
        nominee_dob: body.nominee_dob || null,
        kyc_status: KYC_STATUS.PENDING,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating KYC application:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to create KYC application' },
        { status: 500 }
      );
    }

    // Create audit log
    await supabase.from(TABLES.AUDIT_LOGS).insert({
      user_id: user.id,
      action: 'KYC_APPLICATION_SUBMITTED',
      entity_type: 'kyc_application',
      entity_id: kycApplication.id,
      new_values: { kyc_status: KYC_STATUS.PENDING },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: kycApplication.id,
        application_id: kycApplication.application_id,
        kyc_status: kycApplication.kyc_status,
      },
    });
  } catch (error) {
    console.error('Error submitting KYC:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
