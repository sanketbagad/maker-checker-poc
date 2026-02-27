import { NextRequest, NextResponse } from 'next/server';
import { setOTPData, generateOTP, OTP_EXPIRY_MS } from '@/lib/otp-utils';
import { sendOTPEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName, password } = await request.json();

    if (!email || !firstName || !lastName || !password) {
      return NextResponse.json(
        { error: 'Email, first name, last name, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    // Store OTP with user registration details in cookie
    await setOTPData({
      otp,
      expiresAt,
      attempts: 0,
      firstName,
      lastName,
      password,
      email: email.toLowerCase(),
    });

    // Send OTP via Resend email
    const emailResult = await sendOTPEmail({
      to: email.toLowerCase(),
      firstName,
      otp,
      expiresInMinutes: Math.floor(OTP_EXPIRY_MS / 60000),
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send OTP email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully to your email',
      expiresIn: Math.floor(OTP_EXPIRY_MS / 1000),
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
