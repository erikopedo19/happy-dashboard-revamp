CREATE OR REPLACE FUNCTION public.validate_appointment_availability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_service_duration integer;
  v_start_hour text;
  v_end_hour text;
  v_slot_interval integer;
  v_working_days integer[];
  v_timezone text;
  v_start_min integer;
  v_end_min integer;
  v_slot_min integer;
  v_service_end_min integer;
  v_dow integer;
  v_today text;
  v_now_min integer;
  v_needs_validation boolean := true;
BEGIN
  IF COALESCE(NEW.status, 'scheduled') = 'cancelled' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_needs_validation := NOT (
      NEW.user_id IS NOT DISTINCT FROM OLD.user_id
      AND NEW.service_id IS NOT DISTINCT FROM OLD.service_id
      AND NEW.stylist_id IS NOT DISTINCT FROM OLD.stylist_id
      AND NEW.appointment_date IS NOT DISTINCT FROM OLD.appointment_date
      AND NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time
      AND COALESCE(OLD.status, 'scheduled') <> 'cancelled'
    );
  END IF;

  IF NOT v_needs_validation THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(s.duration, 30)::integer
    INTO v_service_duration
  FROM public.services s
  WHERE s.id = NEW.service_id
    AND s.user_id = NEW.user_id
    AND s.deleted_at IS NULL;

  IF v_service_duration IS NULL THEN
    RAISE EXCEPTION 'Selected service is not available for this barber';
  END IF;

  IF NEW.stylist_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.stylists st
    WHERE st.id = NEW.stylist_id
      AND st.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Selected stylist is not available for this barber';
  END IF;

  SELECT
    COALESCE(a.start_hour, '09:00'),
    COALESCE(a.end_hour, '18:00'),
    GREATEST(COALESCE(a.service_duration, 30), 1),
    COALESCE(a.working_days, ARRAY[0,1,2,3,4,5,6]),
    COALESCE(p.timezone, 'UTC')
    INTO v_start_hour, v_end_hour, v_slot_interval, v_working_days, v_timezone
  FROM public.profiles p
  LEFT JOIN public.agenda_settings a ON a.user_id = p.id
  WHERE p.id = NEW.user_id
  LIMIT 1;

  IF v_start_hour IS NULL THEN
    v_start_hour := '09:00';
    v_end_hour := '18:00';
    v_slot_interval := 30;
    v_working_days := ARRAY[0,1,2,3,4,5,6];
    v_timezone := 'UTC';
  END IF;

  v_start_min := split_part(v_start_hour, ':', 1)::integer * 60 + COALESCE(NULLIF(split_part(v_start_hour, ':', 2), '')::integer, 0);
  v_end_min := split_part(v_end_hour, ':', 1)::integer * 60 + COALESCE(NULLIF(split_part(v_end_hour, ':', 2), '')::integer, 0);
  v_slot_min := EXTRACT(HOUR FROM NEW.appointment_time)::integer * 60 + EXTRACT(MINUTE FROM NEW.appointment_time)::integer;
  v_service_end_min := v_slot_min + v_service_duration;
  v_dow := EXTRACT(DOW FROM NEW.appointment_date)::integer;

  IF NOT (v_dow = ANY(v_working_days)) THEN
    RAISE EXCEPTION 'Selected date is outside the barber availability';
  END IF;

  IF v_slot_min < v_start_min OR v_service_end_min > v_end_min THEN
    RAISE EXCEPTION 'Selected time is outside the barber availability';
  END IF;

  IF ((v_slot_min - v_start_min) % v_slot_interval) <> 0 THEN
    RAISE EXCEPTION 'Selected time does not match the barber availability intervals';
  END IF;

  v_today := to_char(timezone(v_timezone, now()), 'YYYY-MM-DD');
  v_now_min := EXTRACT(HOUR FROM timezone(v_timezone, now()))::integer * 60 + EXTRACT(MINUTE FROM timezone(v_timezone, now()))::integer;

  IF NEW.appointment_date::text < v_today OR (NEW.appointment_date::text = v_today AND v_slot_min <= v_now_min) THEN
    RAISE EXCEPTION 'Selected time has already passed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    LEFT JOIN public.services s ON s.id = a.service_id
    WHERE a.user_id = NEW.user_id
      AND a.appointment_date = NEW.appointment_date
      AND COALESCE(a.status, 'scheduled') <> 'cancelled'
      AND a.id <> NEW.id
      AND (NEW.stylist_id IS NULL OR a.stylist_id IS NULL OR a.stylist_id = NEW.stylist_id)
      AND v_slot_min < (
        EXTRACT(HOUR FROM a.appointment_time)::integer * 60 + EXTRACT(MINUTE FROM a.appointment_time)::integer + COALESCE(s.duration, v_slot_interval, 30)
      )
      AND v_service_end_min > (
        EXTRACT(HOUR FROM a.appointment_time)::integer * 60 + EXTRACT(MINUTE FROM a.appointment_time)::integer
      )
  ) THEN
    RAISE EXCEPTION 'This time slot is already booked';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_appointment_availability_trigger ON public.appointments;
CREATE TRIGGER validate_appointment_availability_trigger
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.validate_appointment_availability();