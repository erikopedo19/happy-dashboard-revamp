-- Barber-side cancel appointment RPC
-- Allows barbers to cancel appointments they own, with notification creation.

CREATE OR REPLACE FUNCTION public.cancel_appointment_by_barber(_appointment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt RECORD;
  v_user_id uuid := auth.uid();
BEGIN
  SELECT a.id, a.user_id, a.status, a.appointment_date, a.appointment_time,
         c.name AS customer_name, s.name AS service_name
  INTO v_appt
  FROM public.appointments a
  LEFT JOIN public.customers c ON c.id = a.customer_id
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE a.id = _appointment_id;

  IF v_appt IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appointment not found');
  END IF;

  IF v_appt.user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_appt.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', true, 'already', true);
  END IF;

  IF v_appt.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel a completed appointment');
  END IF;

  UPDATE public.appointments
  SET status = 'cancelled', updated_at = now()
  WHERE id = _appointment_id;

  INSERT INTO public.notifications (user_id, type, title, body, appointment_id)
  VALUES (
    v_appt.user_id,
    'booking_cancelled',
    'Appointment cancelled',
    COALESCE(v_appt.customer_name, 'Customer') || ' cancelled their ' ||
      COALESCE(v_appt.service_name, 'appointment') || ' on ' ||
      to_char(v_appt.appointment_date, 'Mon DD') || ' at ' || to_char(v_appt.appointment_time, 'HH24:MI'),
    v_appt.id
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_appointment_by_barber(uuid) TO authenticated;
