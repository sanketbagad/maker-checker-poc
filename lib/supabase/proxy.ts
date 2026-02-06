import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/sign-up', '/auth/sign-up-success', '/auth/callback', '/auth/error', '/']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))

  // Auth routes for KYC flow (accessible to authenticated users without KYC)
  const kycRoutes = ['/auth/onboarding', '/auth/kyc-pending']
  const isKycRoute = kycRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))

  // API routes that should be accessible
  const isApiRoute = pathname.startsWith('/api/')

  // If no user and trying to access protected route
  if (!user && !isPublicRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in
  if (user) {
    // Redirect away from auth pages (except KYC routes) to appropriate location
    if (isPublicRoute && pathname !== '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/maker'
      return NextResponse.redirect(url)
    }

    // Check KYC status for makers accessing dashboard
    if (pathname.startsWith('/dashboard')) {
      const role = user.user_metadata?.role || 'maker'
      
      // Only check KYC for makers, not checkers or admins
      if (role === 'maker') {
        // Check if user has completed KYC
        const { data: profile } = await supabase
          .from('profiles')
          .select('kyc_completed')
          .eq('id', user.id)
          .single()

        // Check if there's an existing KYC application
        const { data: kycApp } = await supabase
          .from('kyc_applications')
          .select('kyc_status')
          .eq('user_id', user.id)
          .single()

        if (!profile?.kyc_completed) {
          const url = request.nextUrl.clone()
          
          if (!kycApp) {
            // No KYC application, redirect to onboarding
            url.pathname = '/auth/onboarding'
          } else if (kycApp.kyc_status !== 'approved') {
            // KYC application exists but not approved
            url.pathname = '/auth/kyc-pending'
          }
          
          if (url.pathname !== pathname) {
            return NextResponse.redirect(url)
          }
        }
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
