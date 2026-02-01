import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    
    // Get user role to redirect appropriately
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role || 'maker';
    
    return NextResponse.redirect(
      new URL(role === 'checker' ? '/dashboard/checker' : '/dashboard/maker', requestUrl.origin)
    );
  }

  return NextResponse.redirect(new URL('/auth/error', requestUrl.origin));
}
