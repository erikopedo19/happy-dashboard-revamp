ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS duration_minutes integer;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_duration_minutes_range CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 720);
COMMENT ON COLUMN public.appointments.duration_minutes IS 'Booked length when it differs from the primary service, e.g. several services in one visit.';
DROP FUNCTION IF EXISTS public.create_public_booking(uuid, text, text, text, uuid, date, time without time zone, text, uuid);
CREATE OR REPLACE FUNCTION public.create_public_booking(p_business_id uuid, p_customer_name text, p_customer_email text, p_customer_phone text, p_service_id uuid, p_appointment_date date, p_appointment_time time without time zone, p_notes text DEFAULT NULL::text, p_stylist_id uuid DEFAULT NULL::uuid, p_service_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_customer_id uuid;
    v_appointment_id uuid;
    v_token uuid;
    v_service_name text;
    v_service_duration integer;
    v_service_price numeric(10,2);
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
    v_overlap_exists boolean;
    v_loyalty_enabled boolean := false;
    v_loyalty_percent integer := 20;
    v_recent_bookings integer := 0;
    v_applied_discount integer := 0;
    v_final_price numeric(10,2);
    v_service_ids uuid[];
    v_service_count integer;
    v_duration_override integer;
BEGIN
    SELECT COALESCE(array_agg(DISTINCT x), ARRAY[]::uuid[]) INTO v_service_ids
    FROM unnest(COALESCE(NULLIF(p_service_ids, ARRAY[]::uuid[]), ARRAY[p_service_id])) AS x
    WHERE x IS NOT NULL;
    v_service_count := COALESCE(array_length(v_service_ids, 1), 0);
    IF v_service_count = 0 OR v_service_count > 6 OR NOT (p_service_id = ANY(v_service_ids)) THEN
      RETURN json_build_object('success', false, 'error', 'Choose between 1 and 6 services.');
    END IF;

    SELECT string_agg(s.name, ' + ' ORDER BY array_position(p_service_ids, s.id) NULLS FIRST, s.name),
           SUM(COALESCE(s.duration, 30))::integer, SUM(COALESCE(s.price, 0))::numeric(10,2)
      INTO v_service_name, v_service_duration, v_service_price
    FROM public.services s
    WHERE s.id = ANY(v_service_ids)
      AND s.user_id = p_business_id
      AND s.deleted_at IS NULL
    HAVING count(*) = v_service_count;
    v_duration_override := CASE WHEN v_service_count > 1 THEN v_service_duration ELSE NULL END;

    IF v_service_duration IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Selected service is no longer available.');
    END IF;

    IF p_stylist_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.stylists st
      WHERE st.id = p_stylist_id
        AND st.user_id = p_business_id
        AND COALESCE(st.is_public, true) = true
    ) THEN
      RETURN json_build_object('success', false, 'error', 'Selected stylist is no longer available.');
    END IF;

    SELECT
      COALESCE(a.start_hour, '09:00'),
      COALESCE(a.end_hour, '18:00'),
      GREATEST(COALESCE(a.service_duration, 30), 1),
      COALESCE(a.working_days, ARRAY[0,1,2,3,4,5,6]),
      COALESCE(p.timezone, 'UTC'),
      COALESCE(p.loyalty_discount_enabled, false),
      COALESCE(p.loyalty_discount_percent, 20)
      INTO v_start_hour, v_end_hour, v_slot_interval, v_working_days, v_timezone, v_loyalty_enabled, v_loyalty_percent
    FROM public.profiles p
    LEFT JOIN public.agenda_settings a ON a.user_id = p.id
    WHERE p.id = p_business_id
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
    v_slot_min := EXTRACT(HOUR FROM p_appointment_time)::integer * 60 + EXTRACT(MINUTE FROM p_appointment_time)::integer;
    v_service_end_min := v_slot_min + v_service_duration;
    v_dow := EXTRACT(DOW FROM p_appointment_date)::integer;

    IF NOT (v_dow = ANY(v_working_days)) THEN
      RETURN json_build_object('success', false, 'error', 'Selected date is outside the barber availability.');
    END IF;

    IF v_slot_min < v_start_min OR v_service_end_min > v_end_min THEN
      RETURN json_build_object('success', false, 'error', 'Selected time is outside the barber availability.');
    END IF;

    IF ((v_slot_min - v_start_min) % v_slot_interval) <> 0 THEN
      RETURN json_build_object('success', false, 'error', 'Selected time does not match the barber availability intervals.');
    END IF;

    v_today := to_char(timezone(v_timezone, now()), 'YYYY-MM-DD');
    v_now_min := EXTRACT(HOUR FROM timezone(v_timezone, now()))::integer * 60 + EXTRACT(MINUTE FROM timezone(v_timezone, now()))::integer;

    IF p_appointment_date::text < v_today OR (p_appointment_date::text = v_today AND v_slot_min <= v_now_min) THEN
      RETURN json_build_object('success', false, 'error', 'Selected time has already passed.');
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.appointments a
      LEFT JOIN public.services s ON s.id = a.service_id
      WHERE a.user_id = p_business_id
        AND a.appointment_date = p_appointment_date
        AND COALESCE(a.status, 'scheduled') <> 'cancelled'
        AND (p_stylist_id IS NULL OR a.stylist_id IS NULL OR a.stylist_id = p_stylist_id)
        AND v_slot_min < (
          EXTRACT(HOUR FROM a.appointment_time)::integer * 60 + EXTRACT(MINUTE FROM a.appointment_time)::integer + COALESCE(a.duration_minutes, s.duration, v_slot_interval, 30)
        )
        AND v_service_end_min > (
          EXTRACT(HOUR FROM a.appointment_time)::integer * 60 + EXTRACT(MINUTE FROM a.appointment_time)::integer
        )
    ) INTO v_overlap_exists;

    IF v_overlap_exists THEN
      RETURN json_build_object('success', false, 'error', 'This time slot is already booked. Please choose another time.');
    END IF;

    SELECT id INTO v_customer_id FROM public.customers
    WHERE lower(email) = lower(p_customer_email) AND user_id = p_business_id;

    IF v_customer_id IS NULL THEN
      INSERT INTO public.customers (name, email, phone, user_id)
      VALUES (p_customer_name, p_customer_email, p_customer_phone, p_business_id)
      RETURNING id INTO v_customer_id;
    ELSE
      UPDATE public.customers SET name = p_customer_name, phone = p_customer_phone WHERE id = v_customer_id;
    END IF;

    IF v_loyalty_enabled THEN
      SELECT count(*)::integer INTO v_recent_bookings
      FROM public.appointments a
      WHERE a.user_id = p_business_id
        AND a.customer_id = v_customer_id
        AND COALESCE(a.status, 'scheduled') <> 'cancelled'
        AND a.appointment_date >= p_appointment_date - 7
        AND a.appointment_date < p_appointment_date;

      IF v_recent_bookings > 1 THEN
        v_applied_discount := v_loyalty_percent;
      END IF;
    END IF;

    v_final_price := round(v_service_price * (100 - v_applied_discount) / 100.0, 2);

    INSERT INTO public.appointments (
      customer_id, service_id, stylist_id, appointment_date, appointment_time, notes, status, user_id,
      price, original_price, discount_percent, duration_minutes
    ) VALUES (
      v_customer_id, p_service_id, p_stylist_id, p_appointment_date, p_appointment_time, p_notes, 'scheduled', p_business_id,
      v_final_price, v_service_price, v_applied_discount, v_duration_override
    ) RETURNING id, cancel_token INTO v_appointment_id, v_token;

    INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
    VALUES (
      p_business_id, 'booking_created', 'New booking',
      p_customer_name || ' booked ' || COALESCE(v_service_name,'a service') || ' on ' ||
        to_char(p_appointment_date, 'Mon DD') || ' at ' || to_char(p_appointment_time, 'HH24:MI'),
      v_appointment_id
    );

    RETURN json_build_object(
      'success', true,
      'customer_id', v_customer_id,
      'appointment_id', v_appointment_id,
      'cancel_token', v_token,
      'original_price', v_service_price,
      'final_price', v_final_price,
      'discount_percent', v_applied_discount,
      'loyalty_discount_applied', v_applied_discount > 0,
      'duration_minutes', v_service_duration
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.create_public_booking(uuid, text, text, text, uuid, date, time without time zone, text, uuid, uuid[]) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_booked_slots(_business_id uuid, _date date)
 RETURNS TABLE(appointment_time time without time zone, service_id uuid, stylist_id uuid, service_duration integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.appointment_time, a.service_id, a.stylist_id,
    COALESCE(a.duration_minutes, s.duration, 30)::integer AS service_duration
  FROM public.appointments a
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE a.user_id = _business_id
    AND a.appointment_date = _date
    AND COALESCE(a.status, 'scheduled') <> 'cancelled'
  ORDER BY a.appointment_time;
$function$;

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
      AND NEW.duration_minutes IS NOT DISTINCT FROM OLD.duration_minutes
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
  v_service_duration := COALESCE(NEW.duration_minutes, v_service_duration);

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

  v_today := to_char(timezone(v_timezone, now()), 'YYYY-MM-DD');
  v_now_min := EXTRACT(HOUR FROM timezone(v_timezone, now()))::integer * 60 + EXTRACT(MINUTE FROM timezone(v_timezone, now()))::integer;

  IF NEW.appointment_date::text < v_today OR (NEW.appointment_date::text = v_today AND v_slot_min <= v_now_min) THEN
    RAISE EXCEPTION 'Selected time has already passed';
  END IF;

  IF COALESCE(current_setting('app.agenda_swap', true), '') <> '1' AND EXISTS (
    SELECT 1
    FROM public.appointments a
    LEFT JOIN public.services s ON s.id = a.service_id
    WHERE a.user_id = NEW.user_id
      AND a.appointment_date = NEW.appointment_date
      AND COALESCE(a.status, 'scheduled') <> 'cancelled'
      AND a.id <> NEW.id
      AND (NEW.stylist_id IS NULL OR a.stylist_id IS NULL OR a.stylist_id = NEW.stylist_id)
      AND v_slot_min < (
        EXTRACT(HOUR FROM a.appointment_time)::integer * 60 + EXTRACT(MINUTE FROM a.appointment_time)::integer + COALESCE(a.duration_minutes, s.duration, v_slot_interval, 30)
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

CREATE OR REPLACE FUNCTION public.reschedule_appointment_by_token(_token uuid, _new_date date, _new_time time without time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_appt RECORD;
BEGIN
  SELECT a.id, a.user_id, a.appointment_date, a.appointment_time, a.stylist_id,
         COALESCE(a.duration_minutes, s.duration, 30) AS duration,
         c.name AS customer_name, s.name AS service_name
  INTO v_appt
  FROM public.appointments a
  JOIN public.customers c ON c.id = a.customer_id
  JOIN public.services s ON s.id = a.service_id
  WHERE a.cancel_token = _token;

  IF v_appt IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointments o
    LEFT JOIN public.services os ON os.id = o.service_id
    WHERE o.user_id = v_appt.user_id
      AND o.appointment_date = _new_date
      AND COALESCE(o.status,'scheduled') <> 'cancelled'
      AND o.id <> v_appt.id
      AND (v_appt.stylist_id IS NULL OR o.stylist_id IS NULL OR o.stylist_id = v_appt.stylist_id)
      AND _new_time < o.appointment_time + make_interval(mins => COALESCE(o.duration_minutes, os.duration, 30))
      AND o.appointment_time < _new_time + make_interval(mins => v_appt.duration)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That time is already booked');
  END IF;

  UPDATE public.appointments
  SET appointment_date = _new_date,
      appointment_time = _new_time,
      status = 'scheduled',
      updated_at = now()
  WHERE cancel_token = _token;

  INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
  VALUES (
    v_appt.user_id,
    'booking_rescheduled',
    'Booking rescheduled',
    v_appt.customer_name || ' moved their ' || v_appt.service_name || ' to ' ||
      to_char(_new_date, 'Mon DD') || ' at ' || to_char(_new_time, 'HH24:MI'),
    v_appt.id
  );

  RETURN jsonb_build_object('success', true);
END;
$function$;
NOTIFY pgrst, 'reload schema';