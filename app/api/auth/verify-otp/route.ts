import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { UserType } from '@/lib/types';
import { getOTPData, deleteOTPData, updateOTPAttempts, MAX_OTP_ATTEMPTS } from '@/lib/otp-utils';
import { sendNotificationEmail } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Get stored OTP data from cookie
    const storedData = await getOTPData();

    if (!storedData) {
      return NextResponse.json(
        { error: 'OTP expired or not found. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Verify email matches
    if (storedData.email !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email mismatch. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Check expiry
    if (Date.now() > storedData.expiresAt) {
      await deleteOTPData();
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Check attempts
    if (storedData.attempts >= MAX_OTP_ATTEMPTS) {
      await deleteOTPData();
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      const newAttempts = storedData.attempts + 1;
      await updateOTPAttempts(newAttempts);
      const remaining = MAX_OTP_ATTEMPTS - newAttempts;
      return NextResponse.json(
        { error: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` },
        { status: 400 }
      );
    }

    // OTP verified - create user account
    const { firstName, lastName, password } = storedData;
    
    if (!firstName || !lastName || !password) {
      return NextResponse.json(
        { error: 'Registration data not found. Please start over.' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();

    // Use service-role client to create user with email already confirmed
    // (since we verified via OTP, no need for Supabase's own email confirmation)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create user via admin API — email_confirm: true skips Supabase's own confirmation email
    const { data: authData, error: signUpError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        role: UserType.MAKER,
      },
    });

    if (signUpError) {
      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 }
      );
    }

    // Clean up OTP cookie
    await deleteOTPData();

    // Send welcome email (fire and forget — don't block sign-in)
    sendNotificationEmail(
      email,
      firstName,
      'Welcome to SecureControl — Registration Successful',
      `Congratulations! Your account has been successfully created and verified.<br><br>
       <strong>Next step:</strong> Complete your KYC onboarding to start using the banking system. 
       You will be guided through the KYC form after logging in.<br><br>
       If you have any questions, please contact your system administrator.`
    ).catch((err) => console.error('[VERIFY-OTP] Welcome email error:', err));

    // Sign in the user immediately after registration
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // User created but sign-in failed, they can log in manually
      return NextResponse.json({
        success: true,
        message: 'Account created successfully. Please log in.',
        redirectTo: '/auth/login',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Account created and verified successfully',
      redirectTo: '/auth/onboarding',
      user: {
        id: authData.user?.id,
        email: authData.user?.email,
        firstName,
        lastName,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}
