-- Team invites: per-member page access, actor-aware push notifications,
-- and client appointment reminders.

-- 1. Page access: which admin pages an invited member can see.
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS allowed_pages text[] DEFAULT NULL;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS allowed_pages text[] DEFAULT NULL;

-- When a membership is created from an accepted invite, copy the pages the
-- owner picked on the invitation. invitations.org_id stores the owner's
-- profile id while memberships.org_id stores organizations.id, so match both.
CREATE OR REPLACE FUNCTION public.backfill_membership_allowed_pages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.allowed_pages IS NOT NULL THEN RETURN NEW; END IF;

  SELECT i.allowed_pages INTO NEW.allowed_pages
  FROM public.invitations i
  WHERE i.allowed_pages IS NOT NULL
    AND lower(i.email) = lower((SELECT p.email FROM public.profiles p WHERE p.id = NEW.user_id))
    AND (
      i.org_id = NEW.org_id
      OR i.org_id = (SELECT o.created_by FROM public.organizations o WHERE o.id = NEW.org_id)
    )
  ORDER BY i.created_at DESC
  LIMIT 1;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS backfill_member_pages ON public.memberships;
CREATE TRIGGER backfill_member_pages
BEFORE INSERT ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.backfill_membership_allowed_pages();

-- Owners/admins need to read all memberships of their org to manage page
-- access (the existing SELECT policy only exposes your own row).
DROP POLICY IF EXISTS "Org admins can view memberships" ON public.memberships;
CREATE POLICY "Org admins can view memberships"
  ON public.memberships
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));

-- 2. Pushes: don't notify the person who made the change.
-- Owner is notified only when someone else (team member, public client)
-- cancels or reschedules; the client only when someone else did it.
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
    IF auth.uid() IS DISTINCT FROM NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
      VALUES (
        NEW.user_id,
        'booking_cancelled',
        'Booking cancelled',
        'A booking was cancelled.',
        NEW.id
      );
    END IF;

    SELECT c.email, s.name
      INTO v_customer_email, v_service_name
    FROM public.customers c
    LEFT JOIN public.services s ON s.id = NEW.service_id
    WHERE c.id = NEW.customer_id;

    IF v_customer_email IS NOT NULL THEN
      SELECT id INTO v_client_id
      FROM public.profiles
      WHERE email = v_customer_email AND role = 'client'
      LIMIT 1;

      IF v_client_id IS NOT NULL AND auth.uid() IS DISTINCT FROM v_client_id THEN
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

  IF auth.uid() IS DISTINCT FROM NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
    VALUES (
      NEW.user_id,
      'booking_rescheduled',
      'Booking rescheduled',
      COALESCE(v_customer_name,'A client') || ' moved their ' || COALESCE(v_service,'appointment') || ' to ' ||
        to_char(NEW.appointment_date, 'Mon DD') || ' at ' || to_char(NEW.appointment_time, 'HH24:MI'),
      NEW.id
    );
  END IF;

  IF v_customer_email IS NOT NULL THEN
    SELECT id INTO v_client_id
    FROM public.profiles
    WHERE email = v_customer_email AND role = 'client'
    LIMIT 1;

    IF v_client_id IS NOT NULL AND auth.uid() IS DISTINCT FROM v_client_id THEN
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

-- 3. Client reminders: one push 24h before and one 2h before, once each.
CREATE OR REPLACE FUNCTION public.send_appointment_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sent int := 0;
  v_count int;
BEGIN
  -- 24h reminder
  INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
  SELECT
    p.id,
    'booking_reminder_24h',
    'Appointment tomorrow',
    COALESCE(s.name, 'Your appointment') || ' is tomorrow at ' || to_char(a.appointment_time, 'HH24:MI'),
    a.id
  FROM public.appointments a
  JOIN public.customers c ON c.id = a.customer_id
  JOIN public.profiles p ON lower(p.email) = lower(c.email) AND p.role = 'client'
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE a.status = 'scheduled'
    AND (a.appointment_date + a.appointment_time) BETWEEN now() + interval '23 hours' AND now() + interval '25 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.appointment_id = a.id AND n.type = 'booking_reminder_24h' AND n.user_id = p.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_sent := v_sent + v_count;

  -- 2h reminder
  INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
  SELECT
    p.id,
    'booking_reminder_2h',
    'Appointment soon',
    COALESCE(s.name, 'Your appointment') || ' starts at ' || to_char(a.appointment_time, 'HH24:MI'),
    a.id
  FROM public.appointments a
  JOIN public.customers c ON c.id = a.customer_id
  JOIN public.profiles p ON lower(p.email) = lower(c.email) AND p.role = 'client'
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE a.status = 'scheduled'
    AND (a.appointment_date + a.appointment_time) BETWEEN now() + interval '105 minutes' AND now() + interval '165 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.appointment_id = a.id AND n.type = 'booking_reminder_2h' AND n.user_id = p.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_sent := v_sent + v_count;

  RETURN v_sent;
END;
$$;

-- The notification insert triggers already call send-push, so a plain DB
-- function on a cron is enough — no extra edge function needed.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('appointment-reminders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'appointment-reminders'
);

SELECT cron.schedule(
  'appointment-reminders',
  '*/30 * * * *',
  $$SELECT public.send_appointment_reminders();$$
);
