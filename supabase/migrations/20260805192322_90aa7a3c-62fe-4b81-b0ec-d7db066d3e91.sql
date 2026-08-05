CREATE OR REPLACE FUNCTION public.limit_public_booking_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent integer;
BEGIN
  IF auth.uid() IS NULL THEN
    SELECT count(*) INTO v_recent
    FROM public.appointments a
    WHERE a.user_id = NEW.user_id
      AND a.created_at > now() - interval '10 minutes';

    IF v_recent >= 6 THEN
      RAISE EXCEPTION 'Too many booking attempts for this business. Please try again in a few minutes.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.limit_public_booking_rate() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS limit_public_booking_rate_trg ON public.appointments;
CREATE TRIGGER limit_public_booking_rate_trg
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.limit_public_booking_rate();