-- Migration: Audit logs, notifications, year-based sequence, and enhanced security
-- Author: TOKIN Engineering System Analysis Plan
-- Date: 2026-08-18

-- ============================================================
-- 1. AUDIT LOGS TABLE & TRIGGERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name     TEXT NOT NULL,
  record_id      UUID NOT NULL,
  operation      TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_data       JSONB,
  new_data       JSONB,
  changed_fields TEXT[],
  ip_address     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_record_idx ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs(actor_id, created_at DESC);

-- Audit Trigger Function
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  changed TEXT[] := '{}';
  key TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    FOR key IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      IF (to_jsonb(OLD) -> key) IS DISTINCT FROM (to_jsonb(NEW) -> key) THEN
        changed := changed || key;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.audit_logs (table_name, record_id, operation, actor_id, old_data, new_data, changed_fields)
  VALUES (
    TG_TABLE_NAME,
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    auth.uid(),
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    CASE TG_OP WHEN 'UPDATE' THEN changed ELSE NULL END
  );
  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Triggers for core entities
DROP TRIGGER IF EXISTS bookings_audit ON public.bookings;
CREATE TRIGGER bookings_audit AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS approvals_audit ON public.approvals;
CREATE TRIGGER approvals_audit AFTER INSERT ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS vehicle_assignments_audit ON public.vehicle_assignments;
CREATE TRIGGER vehicle_assignments_audit AFTER INSERT OR UPDATE ON public.vehicle_assignments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_audit_logs" ON public.audit_logs;
CREATE POLICY "admin_read_audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 2. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  type        TEXT NOT NULL, -- 'approval_required', 'status_changed', 'trip_assigned'
  title       TEXT NOT NULL,
  body        TEXT,
  action_url  TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx 
  ON public.notifications(user_id, is_read, created_at DESC) 
  WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_notifications" ON public.notifications;
CREATE POLICY "user_own_notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. PER-YEAR THREAD-SAFE BOOKING NUMBER SEQUENCE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.booking_year_counters (
  year      INT PRIMARY KEY,
  last_seq  BIGINT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.generate_booking_no()
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  next_seq BIGINT;
BEGIN
  INSERT INTO public.booking_year_counters (year, last_seq)
  VALUES (current_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_seq = public.booking_year_counters.last_seq + 1
  RETURNING last_seq INTO next_seq;
  
  RETURN 'CSR-' || current_year || '-' || LPAD(next_seq::TEXT, 6, '0');
END;
$$;

-- ============================================================
-- 4. PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_using_date_status ON public.bookings(using_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_approver_status ON public.bookings(approver_id, status);

-- ============================================================
-- 5. REFINED RLS ON PROFILES
-- ============================================================
-- Keep profiles accessible for department & company directory lookups while securing write access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
