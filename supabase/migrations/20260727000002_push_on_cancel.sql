-- Push notification when an appointment is cancelled
CREATE OR REPLACE FUNCTION public.trigger_appointment_cancelled_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_cancelled_notification ON public.appointments;
CREATE TRIGGER on_appointment_cancelled_notification
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_appointment_cancelled_notification();
