import { NextRequest, NextResponse } from 'next/server';
import { setOTPData, generateOTP, OTP_EXPIRY_MS } from '@/lib/otp-utils';

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

    // In production, send OTP via email service (SendGrid, AWS SES, etc.)
    // For demo, we'll log it to console and return it in development
    console.log(`[OTP] Email: ${email}, OTP: ${otp}`);

    // In development, return OTP for testing
    const isDev = process.env.NODE_ENV === 'development';

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully to your email',
      expiresIn: Math.floor(OTP_EXPIRY_MS / 1000), // seconds
      ...(isDev && { devOtp: otp }), // Only in development for testing
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
