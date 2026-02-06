import { NextRequest, NextResponse } from 'next/server';
import { getOTPData, setOTPData, generateOTP, OTP_EXPIRY_MS } from '@/lib/otp-utils';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if there's existing registration data in cookie
    const existingData = await getOTPData();

    if (!existingData || !existingData.firstName || !existingData.lastName || !existingData.password) {
      return NextResponse.json(
        { error: 'No pending registration found. Please start over.' },
        { status: 400 }
      );
    }

    // Verify email matches
    if (existingData.email !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email mismatch. Please start over.' },
        { status: 400 }
      );
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    // Update OTP while keeping registration data
    await setOTPData({
      otp,
      expiresAt,
      attempts: 0,
      firstName: existingData.firstName,
      lastName: existingData.lastName,
      password: existingData.password,
      email: existingData.email,
    });

    // In production, send OTP via email service
    console.log(`[OTP RESEND] Email: ${email}, OTP: ${otp}`);

    // In development, return OTP for testing
    const isDev = process.env.NODE_ENV === 'development';

    return NextResponse.json({
      success: true,
      message: 'New OTP sent successfully',
      expiresIn: Math.floor(OTP_EXPIRY_MS / 1000),
      ...(isDev && { devOtp: otp }),
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to resend OTP. Please try again.' },
      { status: 500 }
    );
  }
}
