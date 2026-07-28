-- Add IP-based booking rate limiting and ensure authenticated clients can book.

-- Track booking attempts per IP.
CREATE TABLE IF NOT EXISTS public.booking_rate_limits (
  ip_address text PRIMARY KEY,
  first_seen timestamp with time zone NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0,
  suspended_until timestamp with time zone
);

ALTER TABLE public.booking_rate_limits ENABLE ROW LEVEL SECURITY;

-- Helper to extract the caller's IP from PostgREST headers or the socket address.
CREATE OR REPLACE FUNCTION public.get_client_ip()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  raw text;
  hdr json;
  ip text;
BEGIN
  raw := current_setting('request.headers', true);
  IF raw IS NOT NULL AND raw <> '' THEN
    BEGIN
      hdr := raw::json;
      ip := hdr->>'x-forwarded-for';
      IF ip IS NULL OR ip = '' THEN
        ip := hdr->>'x-real-ip';
      END IF;
      IF ip IS NULL OR ip = '' THEN
        ip := hdr->>'cf-connecting-ip';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      ip := NULL;
    END;
  END IF;

  IF ip IS NULL OR ip = '' THEN
    ip := inet_client_addr()::text;
  END IF;

  RETURN split_part(ip, ',', 1);
END;
$$;

-- Enforce a limit of 3 booking attempts per minute per IP; suspend for 7 minutes if exceeded.
CREATE OR REPLACE FUNCTION public.check_booking_rate_limit(p_ip text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rec record;
BEGIN
  SELECT * INTO v_rec FROM public.booking_rate_limits WHERE ip_address = p_ip FOR UPDATE;

  IF FOUND THEN
    IF v_rec.suspended_until IS NOT NULL AND v_rec.suspended_until > now() THEN
      RAISE EXCEPTION 'Too many booking attempts. Please try again later.';
    END IF;

    IF v_rec.first_seen < now() - interval '1 minute' THEN
      UPDATE public.booking_rate_limits
      SET first_seen = now(), request_count = 1, suspended_until = NULL
      WHERE ip_address = p_ip;
    ELSE
      IF v_rec.request_count >= 3 THEN
        UPDATE public.booking_rate_limits
        SET suspended_until = now() + interval '7 minutes'
        WHERE ip_address = p_ip;
        RAISE EXCEPTION 'Too many booking attempts. Please try again in 7 minutes.';
      ELSE
        UPDATE public.booking_rate_limits
        SET request_count = request_count + 1
        WHERE ip_address = p_ip;
      END IF;
    END IF;
  ELSE
    INSERT INTO public.booking_rate_limits (ip_address, first_seen, request_count)
    VALUES (p_ip, now(), 1);
  END IF;
END;
$$;

-- Recreate the public booking RPC with rate-limit enforcement and explicit grants.
DROP FUNCTION IF EXISTS public.create_public_booking(
  uuid, text, text, text, uuid, date, time without time zone, text, uuid
);

CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_business_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_service_id uuid,
  p_appointment_date date,
  p_appointment_time time without time zone,
  p_notes text DEFAULT NULL::text,
  p_stylist_id uuid DEFAULT NULL::uuid
)
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
BEGIN
    -- Enforce rate limit per IP.
    PERFORM public.check_booking_rate_limit(public.get_client_ip());

    SELECT s.name, COALESCE(s.duration, 30)::integer, COALESCE(s.price, 0)::numeric(10,2)
      INTO v_service_name, v_service_duration, v_service_price
    FROM public.services s
    WHERE s.id = p_service_id
      AND s.user_id = p_business_id
      AND s.deleted_at IS NULL;

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
          EXTRACT(HOUR FROM a.appointment_time)::integer * 60 + EXTRACT(MINUTE FROM a.appointment_time)::integer + COALESCE(s.duration, v_slot_interval, 30)
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
      price, original_price, discount_percent
    ) VALUES (
      v_customer_id, p_service_id, p_stylist_id, p_appointment_date, p_appointment_time, p_notes, 'scheduled', p_business_id,
      v_final_price, v_service_price, v_applied_discount
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
      'loyalty_discount_applied', v_applied_discount > 0
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_public_booking(uuid, text, text, text, uuid, date, time without time zone, text, uuid) TO anon, authenticated;
