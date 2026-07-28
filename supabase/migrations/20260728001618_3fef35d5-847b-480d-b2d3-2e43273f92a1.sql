CREATE OR REPLACE FUNCTION public.trigger_appointment_barber_booked_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name text;
  v_service_name text;
BEGIN
  SELECT c.name INTO v_customer_name FROM public.customers c WHERE c.id = NEW.customer_id;
  SELECT s.name INTO v_service_name FROM public.services s WHERE s.id = NEW.service_id;

  INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
  VALUES (
    NEW.user_id,
    'booking_created',
    'New booking',
    COALESCE(v_customer_name, 'Someone') || ' booked ' || COALESCE(v_service_name, 'an appointment')
      || ' on ' || to_char(NEW.appointment_date, 'Mon DD') || ' at ' || to_char(NEW.appointment_time, 'HH24:MI'),
    NEW.id
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_barber_booked ON public.appointments;
CREATE TRIGGER on_appointment_barber_booked
AFTER INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.trigger_appointment_barber_booked_notification();