  -- The previous security lint migration dropped the email trigger.
  -- This recreates it without a hardcoded anon JWT: FUNCTION_SECRET is read from
  -- app.settings.function_secret when set, otherwise the call is unauthenticated.

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
    v_secret text;
    v_headers jsonb;
    v_date_long text;
  BEGIN
    SELECT name, email, phone INTO v_customer FROM public.customers WHERE id = NEW.customer_id;
    SELECT name, price, duration INTO v_service FROM public.services WHERE id = NEW.service_id;
    SELECT business_name, full_name, brand_color, sender_email, sender_name, address, timezone
      INTO v_profile FROM public.profiles WHERE id = NEW.user_id;

    IF NEW.stylist_id IS NOT NULL THEN
      SELECT name, avatar_url INTO v_stylist_name, v_stylist_avatar
        FROM public.stylists WHERE id = NEW.stylist_id;
    END IF;

    IF v_customer.email IS NULL AND v_customer.phone IS NULL THEN
      RETURN NEW;
    END IF;

    v_secret := current_setting('app.settings.function_secret', true);
    v_headers := jsonb_build_object('Content-Type', 'application/json');
    IF v_secret IS NOT NULL AND v_secret <> '' THEN
      v_headers := v_headers || jsonb_build_object('x-functions-secret', v_secret);
    END IF;

    v_date_long := to_char(NEW.appointment_date, 'FMDay, FMMonth FMDD, YYYY');

    PERFORM net.http_post(
      url := v_fn_url,
      headers := v_headers,
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
      ),
      timeout_milliseconds := 5000
    );

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.email_logs(recipient_email, status, error_message, email_type)
    VALUES (COALESCE(v_customer.email,'unknown'), 'trigger_error', SQLERRM, 'booking_confirmation');
    RETURN NEW;
  END;
  $function$;

  DROP TRIGGER IF EXISTS appointments_send_booking_email ON public.appointments;
  CREATE TRIGGER appointments_send_booking_email
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_send_booking_email();
