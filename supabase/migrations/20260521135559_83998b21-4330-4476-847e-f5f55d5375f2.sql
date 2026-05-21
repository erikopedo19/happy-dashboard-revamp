
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_send_booking_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_customer RECORD;
  v_service RECORD;
  v_profile RECORD;
  v_app_url text := 'https://cutzioo.com';
  v_fn_url text := 'https://idcifrhzlmxcdihzdtmn.supabase.co/functions/v1/send-booking-confirmation';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2lmcmh6bG14Y2RpaHpkdG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTI3NjgsImV4cCI6MjA3OTQ4ODc2OH0.D2aMLYk9XJbBJNeoTv1bh_btt6L5OFosAMqNms_-TWg';
  v_date_long text;
BEGIN
  SELECT name, email, phone INTO v_customer FROM public.customers WHERE id = NEW.customer_id;
  SELECT name, price INTO v_service FROM public.services WHERE id = NEW.service_id;
  SELECT full_name, business_name, brand_color, sender_email, sender_name
    INTO v_profile FROM public.profiles WHERE id = NEW.user_id;

  IF v_customer.email IS NULL AND v_customer.phone IS NULL THEN
    RETURN NEW;
  END IF;

  v_date_long := to_char(NEW.appointment_date, 'FMDay, FMMonth FMDD, YYYY');

  PERFORM extensions.net.http_post(
    url := v_fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'apikey', v_anon
    ),
    body := jsonb_build_object(
      'userId', NEW.user_id,
      'customerEmail', v_customer.email,
      'customerName', COALESCE(v_customer.name, 'there'),
      'customerPhone', v_customer.phone,
      'businessName', COALESCE(v_profile.business_name, v_profile.full_name, 'Your appointment'),
      'serviceName', COALESCE(v_service.name, 'Service'),
      'appointmentDate', v_date_long,
      'appointmentTime', to_char(NEW.appointment_time, 'HH24:MI'),
      'price', COALESCE(NEW.price, v_service.price),
      'notes', NEW.notes,
      'bookingId', substring(NEW.id::text, 1, 8),
      'cancelToken', NEW.cancel_token,
      'manageUrl', v_app_url || '/manage/' || NEW.cancel_token,
      'accentColor', COALESCE(v_profile.brand_color, '#e0c4a8'),
      'senderEmail', COALESCE(v_profile.sender_email, 'noreply@cutzioo.com'),
      'senderName', COALESCE(v_profile.sender_name, v_profile.business_name, v_profile.full_name, 'Cutzioo')
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_send_email ON public.appointments;
CREATE TRIGGER on_appointment_send_email
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_send_booking_email();
