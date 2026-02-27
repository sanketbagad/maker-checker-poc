import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { TABLES } from '@/lib/constants';
import { sendCredentialsEmail, generateTemporaryPassword } from '@/lib/email';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * Helper: require superadmin role for admin API routes.
 */
async function requireSuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from(TABLES.PROFILES)
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'superadmin') {
    return { error: 'Forbidden — SuperAdmin access required', status: 403, user: null, profile: null };
  }

  return { error: null, status: 200, user, profile };
}

/**
 * GET /api/admin/users
 * List all users with optional role filter and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error, status, user } = await requireSuperAdmin(supabase);
    if (error) return NextResponse.json({ error }, { status });

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    let query = supabase
      .from(TABLES.PROFILES)
      .select('*', { count: 'exact' });

    if (role) {
      query = query.eq('role', role);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: users, count, error: fetchError } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: users || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (err) {
    console.error('Error in GET /api/admin/users:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Create a new checker or admin user.
 * The user receives their credentials via email.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error, status, user: adminUser } = await requireSuperAdmin(supabase);
    if (error) return NextResponse.json({ error }, { status });

    const body = await request.json();
    const { email, full_name, role } = body;

    // Validate
    if (!email || !full_name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, full_name, role' },
        { status: 400 }
      );
    }

    if (!['checker', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be either "checker" or "admin"' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from(TABLES.PROFILES)
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();

    // Create user via Supabase Admin API (requires service role key)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set' },
        { status: 500 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Send credentials email FIRST — only create the user if email delivery succeeds
    const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login`;
    const emailResult = await sendCredentialsEmail({
      to: email.toLowerCase(),
      fullName: full_name,
      role,
      temporaryPassword,
      loginUrl,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: `Failed to send credentials email: ${emailResult.error || 'Unknown error'}. User was not created.` },
        { status: 500 }
      );
    }

    // Email sent successfully — now create the user
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        full_name,
        role,
        created_by_admin: true,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: createError.message || 'Failed to create user' },
        { status: 500 }
      );
    }

    // The handle_new_user trigger will auto-create the profile,
    // but let's ensure the role is set correctly
    await adminSupabase
      .from(TABLES.PROFILES)
      .update({ role, full_name })
      .eq('id', newUser.user.id);

    // Create audit log
    await supabase.from(TABLES.AUDIT_LOGS).insert({
      user_id: adminUser!.id,
      action: 'USER_CREATED',
      entity_type: 'profile',
      entity_id: newUser.user.id,
      new_values: {
        email: email.toLowerCase(),
        full_name,
        role,
        email_sent: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} user created successfully. Credentials have been sent via email.`,
      data: {
        id: newUser.user.id,
        email: email.toLowerCase(),
        full_name,
        role,
        email_sent: true,
      },
    });
  } catch (err) {
    console.error('Error in POST /api/admin/users:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
