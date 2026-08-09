-- Soft-delete support for stylists.
-- A removed stylist is hidden from every booking/public surface immediately
-- (deleted_at set + is_public flipped to false), but the row is kept so their
-- remaining appointments stay intact. Once they have no more pending/future
-- appointments, cleanup_pending_stylists() hard-deletes the row for good.

ALTER TABLE public.stylists ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS stylists_deleted_at_idx ON public.stylists(deleted_at);

-- Cleanup function: hard-delete stylists that were soft-removed and whose
-- appointments are all completed/cancelled or in the past. Mirrors
-- cleanup_pending_services(). The existing on_stylist_deleted trigger unassigns
-- any lingering future appointments (there should be none by this point).
CREATE OR REPLACE FUNCTION public.cleanup_pending_stylists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.stylists st
  WHERE st.deleted_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.stylist_id = st.id
        AND COALESCE(a.status,'scheduled') NOT IN ('cancelled','completed')
        AND (a.appointment_date > CURRENT_DATE
             OR (a.appointment_date = CURRENT_DATE AND a.appointment_time >= CURRENT_TIME))
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_pending_stylists() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_pending_stylists() TO authenticated, service_role;

-- Run cleanup every hour so leaving stylists disappear once their last
-- appointment has passed, without any manual step.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('cleanup-pending-stylists') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-pending-stylists'
);

SELECT cron.schedule(
  'cleanup-pending-stylists',
  '5 * * * *',
  $$SELECT public.cleanup_pending_stylists();$$
);
