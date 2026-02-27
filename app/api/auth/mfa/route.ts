import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendOTPEmail } from '@/lib/email';
import { generateOTP, OTP_EXPIRY_MS } from '@/lib/otp-utils';

/**
 * GET /api/auth/mfa
 * Returns the current user's MFA status.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('mfa_enabled')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      mfaEnabled: profile?.mfa_enabled ?? false,
      email: user.email,
    });
  } catch (error) {
    console.error('[MFA GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/auth/mfa
 * Body: { action: 'enable' | 'disable' | 'send-otp' | 'verify-otp', otp?: string }
 *
 * Flow:
 *  1. User clicks Enable MFA → send-otp → sends OTP to their email
 *  2. User enters OTP → verify-otp → enables MFA if correct
 *  3. User clicks Disable MFA → disable → disables immediately (already authenticated)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, otp } = await request.json();

    // --- SEND OTP (step 1 of enable flow) ---
    if (action === 'send-otp') {
      const code = generateOTP();
      const expiresAt = Date.now() + OTP_EXPIRY_MS;

      // Store the OTP hash in user metadata (server-side via service role)
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // Store OTP data in user metadata
      const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          mfa_otp: code,
          mfa_otp_expires: expiresAt,
        },
      });

      if (updateErr) {
        console.error('[MFA] Failed to store OTP:', updateErr);
        return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 });
      }

      // Send the OTP via email
      const emailResult = await sendOTPEmail({
        to: user.email!,
        firstName: user.user_metadata?.full_name?.split(' ')[0] || 'User',
        otp: code,
        expiresInMinutes: 5,
      });
      if (!emailResult.success) {
        return NextResponse.json({ error: 'Failed to send OTP email' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'OTP sent to your email',
      });
    }

    // --- VERIFY OTP & ENABLE MFA ---
    if (action === 'verify-otp') {
      if (!otp || typeof otp !== 'string') {
        return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
      }

      // Refresh user data to get latest metadata
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      const storedOTP = freshUser?.user_metadata?.mfa_otp;
      const expiresAt = freshUser?.user_metadata?.mfa_otp_expires;

      if (!storedOTP || !expiresAt) {
        return NextResponse.json(
          { error: 'No OTP found. Please request a new one.' },
          { status: 400 }
        );
      }

      if (Date.now() > expiresAt) {
        return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
      }

      if (otp !== storedOTP) {
        return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
      }

      // OTP is valid — enable MFA
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // Clear OTP from metadata & mark MFA enabled in metadata
      await adminSupabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...freshUser!.user_metadata,
          mfa_otp: null,
          mfa_otp_expires: null,
          mfa_enabled: true,
        },
      });

      // Also store in profiles table for quick reads
      await adminSupabase
        .from('profiles')
        .update({ mfa_enabled: true, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      return NextResponse.json({
        success: true,
        message: 'MFA has been enabled successfully',
        mfaEnabled: true,
      });
    }

    // --- DISABLE MFA ---
    if (action === 'disable') {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // Update user metadata
      await adminSupabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          mfa_enabled: false,
          mfa_otp: null,
          mfa_otp_expires: null,
        },
      });

      // Update profiles table
      await adminSupabase
        .from('profiles')
        .update({ mfa_enabled: false, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      return NextResponse.json({
        success: true,
        message: 'MFA has been disabled',
        mfaEnabled: false,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[MFA POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
