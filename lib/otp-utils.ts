// OTP utilities for registration
// Using cookies to persist OTP data across API routes

import { cookies } from 'next/headers';

interface OTPData {
  otp: string;
  expiresAt: number;
  attempts: number;
  firstName: string;
  lastName: string;
  password: string;
  email: string;
}

const OTP_COOKIE_NAME = 'pending_registration';

// Simple encoding (in production, use proper encryption)
function encode(data: OTPData): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

function decode(encoded: string): OTPData | null {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export async function setOTPData(data: OTPData): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(OTP_COOKIE_NAME, encode(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60, // 10 minutes
    path: '/',
  });
}

export async function getOTPData(): Promise<OTPData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(OTP_COOKIE_NAME);
  if (!cookie?.value) return null;
  return decode(cookie.value);
}

export async function deleteOTPData(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(OTP_COOKIE_NAME);
}

export async function updateOTPAttempts(attempts: number): Promise<void> {
  const data = await getOTPData();
  if (data) {
    data.attempts = attempts;
    await setOTPData(data);
  }
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_OTP_ATTEMPTS = 3;
