-- Native client booking features: rebook context, waitlist offers, and real slot claiming.

DROP FUNCTION IF EXISTS public.get_my_bookings();
CREATE OR REPLACE FUNCTION public.get_my_bookings()
RETURNS TABLE(
  id               uuid,
  appointment_date date,
  appointment_time time without time zone,
  status           text,
  service_name     text,
  barber_id        uuid,
  barber_name      text,
  stylist_id       uuid,
  cancel_token     uuid,
  has_review       boolean,
  booking_link     text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    a.id,
    a.appointment_date,
    a.appointment_time,
    COALESCE(a.status, 'scheduled')                                       AS status,
    s.name                                                                AS service_name,
    a.user_id                                                             AS barber_id,
    COALESCE(p.business_name, p.full_name)                               AS barber_name,
    a.stylist_id,
    a.cancel_token,
    EXISTS(SELECT 1 FROM public.reviews rv WHERE rv.appointment_id = a.id) AS has_review,
    p.booking_link
  FROM public.appointments a
  JOIN public.customers c ON c.id = a.customer_id
  LEFT JOIN public.services s ON s.id = a.service_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE lower(c.email) = lower((auth.jwt() ->> 'email'))
  ORDER BY a.appointment_date DESC, a.appointment_time DESC
  LIMIT 50;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_my_bookings() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_bookings() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_rebook_context(_appointment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_user_id uuid := auth.uid();
  v_appointment RECORD;
BEGIN
  IF v_user_id IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT
    a.id,
    a.user_id AS barber_id,
    a.customer_id,
    a.service_id,
    a.stylist_id,
    a.appointment_date,
    a.appointment_time,
    s.name AS service_name,
    s.duration AS service_duration,
    s.price AS service_price,
    c.name AS customer_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    p.business_name,
    p.full_name,
    p.booking_link,
    p.avatar_url,
    p.banner_url,
    p.brand_color,
    p.address,
    p.latitude,
    p.longitude,
    p.timezone,
    p.accepts_waitlist
  INTO v_appointment
  FROM public.appointments a
  JOIN public.customers c ON c.id = a.customer_id
  JOIN public.services s ON s.id = a.service_id
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.id = _appointment_id
    AND lower(coalesce(c.email, '')) = v_email
    AND s.deleted_at IS NULL
  LIMIT 1;

  IF v_appointment.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking details unavailable');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment.id,
    'barber_id', v_appointment.barber_id,
    'customer_id', v_appointment.customer_id,
    'service_id', v_appointment.service_id,
    'stylist_id', v_appointment.stylist_id,
    'appointment_date', v_appointment.appointment_date,
    'appointment_time', v_appointment.appointment_time,
    'service_name', v_appointment.service_name,
    'service_duration', v_appointment.service_duration,
    'service_price', v_appointment.service_price,
    'customer_name', v_appointment.customer_name,
    'customer_email', v_appointment.customer_email,
    'customer_phone', v_appointment.customer_phone,
    'barber_name', coalesce(v_appointment.business_name, v_appointment.full_name),
    'booking_link', v_appointment.booking_link,
    'avatar_url', v_appointment.avatar_url,
    'banner_url', v_appointment.banner_url,
    'brand_color', v_appointment.brand_color,
    'address', v_appointment.address,
    'latitude', v_appointment.latitude,
    'longitude', v_appointment.longitude,
    'timezone', v_appointment.timezone,
    'accepts_waitlist', v_appointment.accepts_waitlist
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_rebook_context(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_booking_location(_appointment_id uuid)
RETURNS TABLE (
  id uuid,
  address text,
  avatar_url text,
  brand_color text,
  google_maps_url text,
  latitude numeric,
  longitude numeric,
  timezone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.address,
    p.avatar_url,
    p.brand_color,
    p.google_maps_url,
    p.latitude,
    p.longitude,
    p.timezone
  FROM public.appointments a
  JOIN public.customers c ON c.id = a.customer_id
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.id = _appointment_id
    AND lower(coalesce(c.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND auth.uid() IS NOT NULL
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_booking_location(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_waitlist_offers()
RETURNS TABLE (
  id uuid,
  status text,
  barber_id uuid,
  barber_name text,
  avatar_url text,
  brand_color text,
  claim_token uuid,
  offered_appointment_id uuid,
  appointment_date date,
  appointment_time time without time zone,
  offer_expires_at timestamptz,
  created_at timestamptz,
  queue_position integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF auth.uid() IS NULL OR v_email = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    w.id,
    w.status,
    w.barber_id,
    coalesce(p.business_name, p.full_name, 'Barber') AS barber_name,
    p.avatar_url,
    p.brand_color,
    w.claim_token,
    w.offered_appointment_id,
    a.appointment_date,
    a.appointment_time,
    w.offer_expires_at,
    w.created_at,
    CASE
      WHEN w.status = 'waiting' THEN (
        SELECT count(*)::integer + 1
        FROM public.cancellation_waitlist older
        WHERE older.barber_id = w.barber_id
          AND older.status = 'waiting'
          AND older.expires_at > now()
          AND older.created_at < w.created_at
      )
      ELSE 0
    END AS queue_position
  FROM public.cancellation_waitlist w
  LEFT JOIN public.profiles p ON p.id = w.barber_id
  LEFT JOIN public.appointments a ON a.id = w.offered_appointment_id
  WHERE (w.client_user_id = auth.uid() OR lower(w.client_email) = v_email)
    AND w.status IN ('waiting', 'offered')
    AND w.expires_at > now()
    AND (w.status <> 'offered' OR w.offer_expires_at > now())
  ORDER BY
    CASE WHEN w.status = 'offered' THEN 0 ELSE 1 END,
    w.created_at ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_waitlist_offers() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_waitlist_offer(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row RECORD;
  v_appointment RECORD;
  v_customer_id uuid;
  v_client_name text;
BEGIN
  SELECT * INTO v_row
  FROM public.cancellation_waitlist
  WHERE claim_token = _token
  FOR UPDATE;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid offer');
  END IF;

  IF v_row.status <> 'offered' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer is no longer available');
  END IF;

  IF v_row.offer_expires_at < now() THEN
    UPDATE public.cancellation_waitlist
       SET status = 'expired', updated_at = now()
     WHERE id = v_row.id;
    RETURN jsonb_build_object('success', false, 'error', 'Offer expired');
  END IF;

  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = v_row.offered_appointment_id
    AND user_id = v_row.barber_id
  FOR UPDATE;

  IF v_appointment.id IS NULL OR coalesce(v_appointment.status, '') <> 'cancelled' THEN
    UPDATE public.cancellation_waitlist
       SET status = 'expired', updated_at = now()
     WHERE id = v_row.id;
    RETURN jsonb_build_object('success', false, 'error', 'This slot is no longer available');
  END IF;

  SELECT c.id INTO v_customer_id
  FROM public.customers c
  WHERE c.user_id = v_row.barber_id
    AND lower(coalesce(c.email, '')) = lower(v_row.client_email)
  LIMIT 1;

  v_client_name := coalesce(nullif(v_row.client_name, ''), 'Client');
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (name, email, user_id)
    VALUES (v_client_name, v_row.client_email, v_row.barber_id)
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.customers
       SET name = coalesce(nullif(v_row.client_name, ''), name)
     WHERE id = v_customer_id;
  END IF;

  UPDATE public.appointments
     SET customer_id = v_customer_id,
         status = 'scheduled',
         cancel_token = gen_random_uuid(),
         review_email_sent_at = NULL,
         updated_at = now()
   WHERE id = v_appointment.id;

  UPDATE public.cancellation_waitlist
     SET status = 'claimed', updated_at = now()
   WHERE id = v_row.id;

  INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
  VALUES (
    v_row.barber_id,
    'waitlist_claimed',
    'Cancellation filled',
    v_client_name || ' claimed ' || to_char(v_appointment.appointment_date, 'Mon DD') ||
      ' at ' || to_char(v_appointment.appointment_time, 'HH24:MI') || ' from the waitlist.',
    v_appointment.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'barber_id', v_row.barber_id,
    'appointment_id', v_appointment.id,
    'customer_id', v_customer_id
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.claim_waitlist_offer(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_waitlist_offer(_token uuid)
RETURNS TABLE (
  status text,
  offer_expires_at timestamptz,
  appointment_date date,
  appointment_time time without time zone,
  barber_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    w.status,
    w.offer_expires_at,
    a.appointment_date,
    a.appointment_time,
    coalesce(p.business_name, p.full_name, 'Barber')
  FROM public.cancellation_waitlist w
  LEFT JOIN public.appointments a ON a.id = w.offered_appointment_id
  LEFT JOIN public.profiles p ON p.id = w.barber_id
  WHERE w.claim_token = _token
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_offer(uuid) TO anon, authenticated;

-- Cancellation offers now stay open for ten minutes and rollover to the next
-- waiting client after expiry.
CREATE OR REPLACE FUNCTION public.trigger_offer_waitlist_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'extensions'
AS $function$
DECLARE
  v_next RECORD;
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2lmcmh6bG14Y2RpaHpkdG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTI3NjgsImV4cCI6MjA3OTQ4ODc2OH0.D2aMLYk9XJbBJNeoTv1bh_btt6L5OFosAMqNms_-TWg';
  v_fn_url text := 'https://idcifrhzlmxcdihzdtmn.supabase.co/functions/v1/waitlist-offer';
BEGIN
  IF NEW.status <> 'cancelled' OR COALESCE(OLD.status, '') = 'cancelled' THEN
    RETURN NEW;
  END IF;

  IF NEW.appointment_date < CURRENT_DATE THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_next
  FROM public.cancellation_waitlist
  WHERE barber_id = NEW.user_id
    AND status = 'waiting'
    AND expires_at > now()
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_next IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.cancellation_waitlist
     SET status = 'offered',
         offered_at = now(),
         offer_expires_at = now() + interval '10 minutes',
         offered_appointment_id = NEW.id,
         updated_at = now()
   WHERE id = v_next.id;

  IF v_next.client_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
    VALUES (
      v_next.client_user_id,
      'waitlist_offer',
      'A slot just opened up!',
      'A cancellation freed ' || to_char(NEW.appointment_date, 'Mon DD') || ' at ' ||
        to_char(NEW.appointment_time, 'HH24:MI') || '. You have 10 minutes to claim it.',
      NEW.id
    );
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_fn_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon,
        'apikey', v_anon
      ),
      body := jsonb_build_object('waitlistId', v_next.id, 'claimToken', v_next.claim_token)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.expire_waitlist_offers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'extensions'
AS $function$
DECLARE
  v_expired RECORD;
  v_next RECORD;
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2lmcmh6bG14Y2RpaHpkdG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTI3NjgsImV4cCI6MjA3OTQ4ODc2OH0.D2aMLYk9XJbBJNeoTv1bh_btt6L5OFosAMqNms_-TWg';
  v_fn_url text := 'https://idcifrhzlmxcdihzdtmn.supabase.co/functions/v1/waitlist-offer';
BEGIN
  FOR v_expired IN
    SELECT * FROM public.cancellation_waitlist
    WHERE status = 'offered'
      AND offer_expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.cancellation_waitlist
       SET status = 'expired', updated_at = now()
     WHERE id = v_expired.id;

    SELECT * INTO v_next
    FROM public.cancellation_waitlist
    WHERE barber_id = v_expired.barber_id
      AND status = 'waiting'
      AND expires_at > now()
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_next IS NOT NULL THEN
      UPDATE public.cancellation_waitlist
         SET status = 'offered',
             offered_at = now(),
             offer_expires_at = now() + interval '10 minutes',
             offered_appointment_id = v_expired.offered_appointment_id,
             updated_at = now()
       WHERE id = v_next.id;

      IF v_next.client_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
        VALUES (
          v_next.client_user_id,
          'waitlist_offer',
          'A slot just opened up!',
          'You are next in line for a cancellation. You have 10 minutes to claim it.',
          v_expired.offered_appointment_id
        );
      END IF;

      BEGIN
        PERFORM net.http_post(
          url := v_fn_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon,
            'apikey', v_anon
          ),
          body := jsonb_build_object('waitlistId', v_next.id, 'claimToken', v_next.claim_token)
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.expire_waitlist_offers() FROM PUBLIC, anon, authenticated;
