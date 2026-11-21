ALTER TABLE public.microsites ALTER COLUMN theme SET DEFAULT 'noir';

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

    -- The on_appointment_barber_booked trigger already notifies the owner; only add a row if it did not.
    INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
    SELECT
      p_business_id, 'booking_created', 'New booking',
      p_customer_name || ' booked ' || COALESCE(v_service_name,'a service') || ' on ' ||
        to_char(p_appointment_date, 'Mon DD') || ' at ' || to_char(p_appointment_time, 'HH24:MI'),
      v_appointment_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.appointment_id = v_appointment_id
        AND n.type = 'booking_created'
        AND n.user_id = p_business_id
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