-- Soft-delete support for services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS services_deleted_at_idx ON public.services(deleted_at);

-- Cleanup function: hard-delete services whose pending appointments are all completed/past
CREATE OR REPLACE FUNCTION public.cleanup_pending_services()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.services s
  WHERE s.deleted_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.service_id = s.id
        AND COALESCE(a.status,'scheduled') NOT IN ('cancelled','completed')
        AND (a.appointment_date > CURRENT_DATE
             OR (a.appointment_date = CURRENT_DATE AND a.appointment_time >= CURRENT_TIME))
    );
END;
$function$;