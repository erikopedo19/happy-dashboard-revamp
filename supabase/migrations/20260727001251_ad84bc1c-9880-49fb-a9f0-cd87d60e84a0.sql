DROP TRIGGER IF EXISTS on_notification_insert_send_push ON public.notifications;

CREATE OR REPLACE FUNCTION public.trigger_appointment_rescheduled_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer text;
  v_service text;
BEGIN
  IF COALESCE(NEW.status,'scheduled') = 'cancelled' THEN RETURN NEW; END IF;
  IF NEW.appointment_date IS NOT DISTINCT FROM OLD.appointment_date
     AND NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time THEN
    RETURN NEW;
  END IF;

  SELECT c.name INTO v_customer FROM public.customers c WHERE c.id = NEW.customer_id;
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
    COALESCE(v_customer,'A client') || ' moved their ' || COALESCE(v_service,'appointment') || ' to ' ||
      to_char(NEW.appointment_date, 'Mon DD') || ' at ' || to_char(NEW.appointment_time, 'HH24:MI'),
    NEW.id
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_rescheduled_notification ON public.appointments;
CREATE TRIGGER on_appointment_rescheduled_notification
AFTER UPDATE OF appointment_date, appointment_time ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.trigger_appointment_rescheduled_notification();