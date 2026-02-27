import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 *
 * Sends a password reset email via Supabase Auth.
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      console.error('[FORGOT PASSWORD]', error);
      // Don't reveal whether the email exists
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('[FORGOT PASSWORD] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
