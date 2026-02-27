import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendOTPEmail } from '@/lib/email';
import { generateOTP, OTP_EXPIRY_MS } from '@/lib/otp-utils';

/**
 * POST /api/auth/mfa/challenge
 * Body: { action: 'send' | 'verify', email?: string, otp?: string }
 *
 * Used during login:
 *  1. After password auth succeeds and user has mfa_enabled → send challenge
 *  2. User enters OTP → verify → complete sign-in
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { action, email, otp } = await request.json();

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // --- SEND MFA CHALLENGE ---
    if (action === 'send') {
      // The user is already signed in via password at this point.
      // Get the current user from the session.
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      const code = generateOTP();
      const expiresAt = Date.now() + OTP_EXPIRY_MS;

      // Store OTP in user metadata
      await adminSupabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          mfa_login_otp: code,
          mfa_login_otp_expires: expiresAt,
        },
      });

      // Send OTP email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const emailResult = await sendOTPEmail({
        to: user.email!,
        firstName: profile?.full_name?.split(' ')[0] || 'User',
        otp: code,
        expiresInMinutes: 5,
      });
      if (!emailResult.success) {
        return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'MFA code sent to your email',
      });
    }

    // --- VERIFY MFA CHALLENGE ---
    if (action === 'verify') {
      if (!otp) {
        return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      // Refresh metadata
      const { data: { user: adminUser } } = await adminSupabase.auth.admin.getUserById(user.id);
      const storedOTP = adminUser?.user_metadata?.mfa_login_otp;
      const expiresAt = adminUser?.user_metadata?.mfa_login_otp_expires;

      if (!storedOTP || !expiresAt) {
        return NextResponse.json({ error: 'No MFA challenge found. Please try again.' }, { status: 400 });
      }

      if (Date.now() > expiresAt) {
        return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
      }

      if (otp !== storedOTP) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
      }

      // Clear OTP from metadata
      await adminSupabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...adminUser!.user_metadata,
          mfa_login_otp: null,
          mfa_login_otp_expires: null,
        },
      });

      return NextResponse.json({ success: true, verified: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[MFA CHALLENGE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
