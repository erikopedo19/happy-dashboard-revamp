
-- 1. Add cancel_token to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancel_token uuid UNIQUE DEFAULT gen_random_uuid();

UPDATE public.appointments SET cancel_token = gen_random_uuid() WHERE cancel_token IS NULL;

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  appointment_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System inserts notifications" ON public.notifications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

-- 3. Get appointment by token (public)
CREATE OR REPLACE FUNCTION public.get_appointment_by_token(_token uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', a.id,
    'appointment_date', a.appointment_date,
    'appointment_time', a.appointment_time,
    'status', COALESCE(a.status,'scheduled'),
    'notes', a.notes,
    'service', jsonb_build_object('id', s.id, 'name', s.name, 'duration', s.duration, 'price', s.price),
    'business', jsonb_build_object(
      'id', p.id,
      'name', COALESCE(p.business_name, p.full_name),
      'brand_color', COALESCE(p.brand_color, '#e0c4a8'),
      'avatar_url', p.avatar_url,
      'banner_url', p.banner_url,
      'address', p.address,
      'phone', p.phone
    ),
    'customer', jsonb_build_object('name', c.name, 'email', c.email, 'phone', c.phone)
  )
  FROM public.appointments a
  JOIN public.services s ON s.id = a.service_id
  JOIN public.profiles p ON p.id = a.user_id
  JOIN public.customers c ON c.id = a.customer_id
  WHERE a.cancel_token = _token
  LIMIT 1;
$$;

-- 4. Cancel by token
CREATE OR REPLACE FUNCTION public.cancel_appointment_by_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_appt RECORD;
BEGIN
  SELECT a.id, a.user_id, a.status, a.appointment_date, a.appointment_time,
         c.name AS customer_name, s.name AS service_name
  INTO v_appt
  FROM public.appointments a
  JOIN public.customers c ON c.id = a.customer_id
  JOIN public.services s ON s.id = a.service_id
  WHERE a.cancel_token = _token;

  IF v_appt IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_appt.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', true, 'already', true);
  END IF;

  UPDATE public.appointments SET status = 'cancelled', updated_at = now()
  WHERE cancel_token = _token;

  INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
  VALUES (
    v_appt.user_id,
    'booking_cancelled',
    'Booking cancelled',
    v_appt.customer_name || ' cancelled their ' || v_appt.service_name || ' on ' ||
      to_char(v_appt.appointment_date, 'Mon DD') || ' at ' || to_char(v_appt.appointment_time, 'HH24:MI'),
    v_appt.id
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Reschedule by token
CREATE OR REPLACE FUNCTION public.reschedule_appointment_by_token(
  _token uuid, _new_date date, _new_time time
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_appt RECORD;
BEGIN
  SELECT a.id, a.user_id, a.appointment_date, a.appointment_time,
         c.name AS customer_name, s.name AS service_name
  INTO v_appt
  FROM public.appointments a
  JOIN public.customers c ON c.id = a.customer_id
  JOIN public.services s ON s.id = a.service_id
  WHERE a.cancel_token = _token;

  IF v_appt IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- conflict check
  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE user_id = v_appt.user_id
      AND appointment_date = _new_date
      AND appointment_time = _new_time
      AND COALESCE(status,'scheduled') <> 'cancelled'
      AND id <> v_appt.id
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
$$;

-- 6. Update create_public_booking to also push a notification + return token
CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_business_id uuid, p_customer_name text, p_customer_email text,
  p_customer_phone text, p_service_id uuid, p_appointment_date date,
  p_appointment_time time without time zone, p_notes text DEFAULT NULL::text
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_customer_id uuid;
    v_appointment_id uuid;
    v_token uuid;
    v_service_name text;
BEGIN
    SELECT id INTO v_customer_id FROM customers
    WHERE email = p_customer_email AND user_id = p_business_id;

    IF v_customer_id IS NULL THEN
      INSERT INTO customers (name, email, phone, user_id)
      VALUES (p_customer_name, p_customer_email, p_customer_phone, p_business_id)
      RETURNING id INTO v_customer_id;
    ELSE
      UPDATE customers SET name = p_customer_name, phone = p_customer_phone WHERE id = v_customer_id;
    END IF;

    INSERT INTO appointments (
      customer_id, service_id, appointment_date, appointment_time, notes, status, user_id
    ) VALUES (
      v_customer_id, p_service_id, p_appointment_date, p_appointment_time, p_notes, 'scheduled', p_business_id
    ) RETURNING id, cancel_token INTO v_appointment_id, v_token;

    SELECT name INTO v_service_name FROM services WHERE id = p_service_id;

    INSERT INTO notifications (user_id, type, title, body, appointment_id)
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
      'cancel_token', v_token
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7. Realtime
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
