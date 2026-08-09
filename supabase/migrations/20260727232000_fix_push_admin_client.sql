-- Push notifications for both admin and client on new bookings, cancellations and reschedules.
-- 1. Client notification when a new appointment is booked.
CREATE OR REPLACE FUNCTION public.trigger_appointment_client_booked_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_email text;
  v_client_id uuid;
  v_service_name text;
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;

  SELECT c.email, s.name
    INTO v_customer_email, v_service_name
  FROM public.customers c
  LEFT JOIN public.services s ON s.id = NEW.service_id
  WHERE c.id = NEW.customer_id;

  IF v_customer_email IS NULL THEN RETURN NEW; END IF;

  SELECT id INTO v_client_id
  FROM public.profiles
  WHERE email = v_customer_email
  LIMIT 1;

  IF v_client_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
  VALUES (
    v_client_id,
    'booking_created',
    'Booking confirmed',
    COALESCE(v_service_name, 'Your appointment') || ' on ' || to_char(NEW.appointment_date, 'Mon DD') || ' at ' || to_char(NEW.appointment_time, 'HH24:MI'),
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_client_booked ON public.appointments;
CREATE TRIGGER on_appointment_client_booked
AFTER INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.trigger_appointment_client_booked_notification();

-- 2. Client notification when an appointment is cancelled (also keep admin notification).
CREATE OR REPLACE FUNCTION public.trigger_appointment_cancelled_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_email text;
  v_client_id uuid;
  v_service_name text;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
    VALUES (
      NEW.user_id,
      'booking_cancelled',
      'Booking cancelled',
      'A booking was cancelled.',
      NEW.id
    );

    SELECT c.email, s.name
      INTO v_customer_email, v_service_name
    FROM public.customers c
    LEFT JOIN public.services s ON s.id = NEW.service_id
    WHERE c.id = NEW.customer_id;

    IF v_customer_email IS NOT NULL THEN
      SELECT id INTO v_client_id
      FROM public.profiles
      WHERE email = v_customer_email
      LIMIT 1;

      IF v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
        VALUES (
          v_client_id,
          'booking_cancelled',
          'Booking cancelled',
          COALESCE(v_service_name, 'Your appointment') || ' has been cancelled.',
          NEW.id
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Client notification when an appointment is rescheduled.
CREATE OR REPLACE FUNCTION public.trigger_appointment_rescheduled_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name text;
  v_customer_email text;
  v_client_id uuid;
  v_service text;
BEGIN
  IF COALESCE(NEW.status,'scheduled') = 'cancelled' THEN RETURN NEW; END IF;
  IF NEW.appointment_date IS NOT DISTINCT FROM OLD.appointment_date
     AND NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time THEN
    RETURN NEW;
  END IF;

  SELECT c.name, c.email, s.name
    INTO v_customer_name, v_customer_email, v_service
  FROM public.customers c
  LEFT JOIN public.services s ON s.id = NEW.service_id
  WHERE c.id = NEW.customer_id;

  SELECT s.name INTO v_service FROM public.services s WHERE s.id = NEW.service_id;

  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.appointment_id = NEW.id
      AND n.type = 'booking_rescheduled'
      AND n.created_at > now() - interval '15 seconds'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
  VALUES (
    NEW.user_id,
    'booking_rescheduled',
    'Booking rescheduled',
    COALESCE(v_customer_name,'A client') || ' moved their ' || COALESCE(v_service,'appointment') || ' to ' ||
      to_char(NEW.appointment_date, 'Mon DD') || ' at ' || to_char(NEW.appointment_time, 'HH24:MI'),
    NEW.id
  );

  IF v_customer_email IS NOT NULL THEN
    SELECT id INTO v_client_id
    FROM public.profiles
    WHERE email = v_customer_email
    LIMIT 1;

    IF v_client_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
      VALUES (
        v_client_id,
        'booking_rescheduled',
        'Booking rescheduled',
        'Your ' || COALESCE(v_service,'appointment') || ' was moved to ' ||
          to_char(NEW.appointment_date, 'Mon DD') || ' at ' || to_char(NEW.appointment_time, 'HH24:MI'),
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
