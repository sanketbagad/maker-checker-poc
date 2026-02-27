-- ============================================================================
-- Notifications table for SecureControl
-- ============================================================================
-- Run this in Supabase SQL Editor after the main schema (000_unified_schema.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info'
                CHECK (type IN ('info','kyc','transaction','policy','user','system')),
  is_read     BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,            -- e.g. 'kyc_application', 'transaction'
  entity_id   TEXT,            -- ID of the related entity for navigation
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user     ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread   ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created  ON public.notifications(created_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Any authenticated user can insert (server-side creates for others via service role)
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Users can only update (mark read) their own notifications
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- ── Enable Realtime ─────────────────────────────────────────────────────────
-- This allows clients to subscribe to INSERT events on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
