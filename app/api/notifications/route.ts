import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/notifications
 * Fetch the current user's notifications (most recent first).
 * Query params: ?unread=true (optional — only unread), &limit=20 (default 30)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 100);

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[NOTIFICATIONS] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Also get unread count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return NextResponse.json({
      data: data || [],
      unreadCount: count || 0,
    });
  } catch (error) {
    console.error('[NOTIFICATIONS] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read.
 * Body: { id: string } — mark one as read
 * Body: { all: true } — mark all as read
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (body.all === true) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (body.id) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', body.id)
        .eq('user_id', user.id);

      if (error) {
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Provide id or all: true' }, { status: 400 });
  } catch (error) {
    console.error('[NOTIFICATIONS] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
