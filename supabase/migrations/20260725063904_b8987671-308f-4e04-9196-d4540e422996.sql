CREATE OR REPLACE FUNCTION public.trigger_send_booking_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'extensions'
AS $function$
DECLARE
  v_customer RECORD;
  v_service RECORD;
  v_profile RECORD;
  v_stylist_name text := NULL;
  v_stylist_avatar text := NULL;
  v_app_url text := 'https://cutzioo.com';
  v_fn_url text := 'https://idcifrhzlmxcdihzdtmn.supabase.co/functions/v1/send-booking-confirmation';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2lmcmh6bG14Y2RpaHpkdG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTI3NjgsImV4cCI6MjA3OTQ4ODc2OH0.D2aMLYk9XJbBJNeoTv1bh_btt6L5OFosAMqNms_-TWg';
  v_date_long text;
BEGIN
  SELECT name, email, phone INTO v_customer FROM public.customers WHERE id = NEW.customer_id;
  SELECT name, price, duration INTO v_service FROM public.services WHERE id = NEW.service_id;
  SELECT full_name, business_name, brand_color, sender_email, sender_name, address, timezone
    INTO v_profile FROM public.profiles WHERE id = NEW.user_id;

  IF NEW.stylist_id IS NOT NULL THEN
    SELECT name, avatar_url INTO v_stylist_name, v_stylist_avatar
      FROM public.stylists WHERE id = NEW.stylist_id;
  END IF;

  IF v_customer.email IS NULL AND v_customer.phone IS NULL THEN
    RETURN NEW;
  END IF;

  v_date_long := to_char(NEW.appointment_date, 'FMDay, FMMonth FMDD, YYYY');

  PERFORM net.http_post(
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
      'durationMinutes', COALESCE(v_service.duration, 30),
      'appointmentDate', v_date_long,
      'appointmentDateIso', to_char(NEW.appointment_date, 'YYYY-MM-DD'),
      'appointmentTime', to_char(NEW.appointment_time, 'HH24:MI'),
      'timezone', COALESCE(v_profile.timezone, 'UTC'),
      'price', COALESCE(NEW.price, v_service.price),
      'notes', NEW.notes,
      'address', v_profile.address,
      'stylistName', v_stylist_name,
      'stylistAvatar', v_stylist_avatar,
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
  INSERT INTO public.email_logs(recipient_email, status, error_message, email_type)
  VALUES (COALESCE(v_customer.email,'unknown'), 'trigger_error', SQLERRM, 'booking_confirmation');
  RETURN NEW;
END;
$function$;

-- RPC to get today's booking counts per barber (for sorting the Find Barber list)
CREATE OR REPLACE FUNCTION public.list_today_booking_counts()
RETURNS TABLE(user_id uuid, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.user_id, COUNT(*)::bigint
  FROM public.appointments a
  WHERE a.appointment_date = (now() AT TIME ZONE 'UTC')::date
    AND COALESCE(a.status,'') <> 'cancelled'
  GROUP BY a.user_id;
$$;

GRANT EXECUTE ON FUNCTION public.list_today_booking_counts() TO anon, authenticated;