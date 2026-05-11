
-- Keep email_logs lean: prune old rows + cap retention to 30 days
DELETE FROM public.email_logs WHERE created_at < now() - interval '30 days';

CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs (created_at);

CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.email_logs WHERE created_at < now() - interval '30 days';
$$;

-- Helpful indexes to keep query plans cheap as the app grows
CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON public.appointments (user_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_customers_user ON public.customers (user_id);
