import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // If a ?next= param was provided (e.g. password recovery), redirect there
    const next = requestUrl.searchParams.get('next');
    if (next) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
    
    // Get user role from profiles DB (source of truth)
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single();

    const role = profile?.role || user?.user_metadata?.role || 'maker';

    let redirectPath = '/dashboard/maker';
    if (role === 'superadmin') redirectPath = '/dashboard/admin';
    else if (role === 'checker' || role === 'admin') redirectPath = '/dashboard/checker';
    
    return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
  }

  return NextResponse.redirect(new URL('/auth/error', requestUrl.origin));
}
