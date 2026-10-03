-- Lets a client send a one-tap "on my way" / "running late" status to their
-- barber. Inserted into public.notifications so it lands in the barber's
-- notification bell (and native push via realtime listeners).

CREATE OR REPLACE FUNCTION public.notify_barber_eta(_appointment_id uuid, _kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_appt  record;
  v_title text;
  v_body  text;
BEGIN
  IF auth.uid() IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF _kind NOT IN ('on_my_way', 'running_late') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;

  -- Only the client who owns the booking (matched by email, like
  -- get_my_bookings/get_booking_location) may send an update.
  SELECT
    a.id,
    a.user_id AS barber_id,
    a.appointment_date,
    a.appointment_time,
    c.name    AS client_name
  INTO v_appt
  FROM public.appointments a
  JOIN public.customers c ON c.id = a.customer_id
  WHERE a.id = _appointment_id
    AND lower(coalesce(c.email, '')) = v_email
    AND coalesce(a.status, 'scheduled') <> 'cancelled'
    AND a.appointment_date >= CURRENT_DATE
  LIMIT 1;

  IF v_appt.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Keep only the latest ETA status per appointment so the barber isn't
  -- spammed when a client updates ("on my way" -> "running late").
  DELETE FROM public.notifications
   WHERE appointment_id = v_appt.id
     AND type = 'client_eta';

  v_title := CASE WHEN _kind = 'on_my_way' THEN 'Client on the way' ELSE 'Client running late' END;
  v_body := coalesce(nullif(v_appt.client_name, ''), 'A client')
    || CASE WHEN _kind = 'on_my_way' THEN ' is on the way' ELSE ' is running a bit late' END
    || ' for the ' || to_char(v_appt.appointment_time, 'HH24:MI') || ' slot.';

  INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
  VALUES (v_appt.barber_id, 'client_eta', v_title, v_body, v_appt.id);

  RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_barber_eta(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.notify_barber_eta(uuid, text) TO authenticated;
