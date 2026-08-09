-- Harden security lint findings: subscribers INSERT, notifications INSERT, unauthenticated email trigger, and SECURITY DEFINER views

-- 1. subscribers: ensure no public/anonymous INSERT policy remains
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "insert_own_subscription" ON public.subscribers;

REVOKE INSERT, UPDATE, DELETE ON public.subscribers FROM anon, authenticated;
GRANT UPDATE ON public.subscribers TO authenticated;

DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
CREATE POLICY "update_own_subscription" ON public.subscribers
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. notifications: restrict INSERT to service_role only
DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
CREATE POLICY "System inserts notifications" ON public.notifications
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 3. Make any user-defined views security invoker so they respect RLS of the querying user
ALTER VIEW IF EXISTS public.diag_orphaned_appointments SET (security_invoker = true);

-- 4. Remove the DB trigger that calls send-booking-confirmation with a hardcoded anon JWT.
--    The book-appointment Edge Function now invokes send-booking-confirmation with a shared FUNCTION_SECRET.
DROP TRIGGER IF EXISTS appointments_send_booking_email ON public.appointments;
DROP TRIGGER IF EXISTS on_appointment_send_email ON public.appointments;
DROP FUNCTION IF EXISTS public.trigger_send_booking_email();
