CREATE OR REPLACE FUNCTION public.block_booking_on_time_off()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner boolean := (auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id);
BEGIN
  IF NOT v_is_owner AND EXISTS (
    SELECT 1 FROM public.time_off t
    WHERE t.user_id = NEW.user_id
      AND t.off_date = NEW.appointment_date
  ) THEN
    RAISE EXCEPTION 'The barber is not available on this date';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_booking_on_time_off_trigger ON public.appointments;
CREATE TRIGGER block_booking_on_time_off_trigger
BEFORE INSERT OR UPDATE OF appointment_date ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.block_booking_on_time_off();