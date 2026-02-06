import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { UserType } from '@/lib/types';
import { getOTPData, deleteOTPData, updateOTPAttempts, MAX_OTP_ATTEMPTS } from '@/lib/otp-utils';

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

    // Create user with Supabase Auth (skip email verification since OTP verified)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          role: UserType.MAKER,
          email_verified: true, // Mark as verified since OTP was verified
        },
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
