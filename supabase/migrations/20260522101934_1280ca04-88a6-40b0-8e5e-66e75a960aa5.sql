
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS years_experience integer;

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
  INSERT INTO public.email_logs(recipient_email, status, error_message, email_type)
  VALUES (COALESCE(v_customer.email,'unknown'), 'trigger_error', SQLERRM, 'booking_confirmation');
  RETURN NEW;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_public_profile_by_booking_link(text);
CREATE OR REPLACE FUNCTION public.get_public_profile_by_booking_link(_booking_link text)
 RETURNS TABLE(id uuid, full_name text, booking_link text, brand_color text, avatar_url text, banner_url text, address text, phone text, rating numeric, rating_count integer, description text, total_bookings integer, services_count integer, stylists_count integer, years_experience integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    COALESCE(p.business_name, p.full_name, 'Business'),
    p.booking_link,
    COALESCE(p.brand_color, '#e0c4a8'),
    p.avatar_url, p.banner_url, p.address, p.phone,
    COALESCE(p.rating, 5.0), COALESCE(p.rating_count, 0),
    p.description,
    COALESCE((SELECT COUNT(*) FROM public.appointments ap WHERE ap.user_id = p.id AND COALESCE(ap.status,'scheduled') <> 'cancelled'), 0)::int,
    COALESCE((SELECT COUNT(*) FROM public.services sv WHERE sv.user_id = p.id), 0)::int,
    COALESCE((SELECT COUNT(*) FROM public.stylists sty WHERE sty.user_id = p.id AND COALESCE(sty.is_public, true) = true), 0)::int,
    p.years_experience
  FROM public.profiles p
  WHERE p.booking_link = _booking_link
  LIMIT 1
$function$;

DROP POLICY IF EXISTS "Public can view business hours" ON public.business_hours;
CREATE POLICY "Public can view business hours" ON public.business_hours
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT TO anon, authenticated USING (COALESCE(is_active, true) = true);
