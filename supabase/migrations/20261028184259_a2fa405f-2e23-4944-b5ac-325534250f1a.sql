DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.validate_appointment_availability'::regproc);
  d := replace(d, $r$  IF ((v_slot_min - v_start_min) % v_slot_interval) <> 0 THEN
    RAISE EXCEPTION 'Selected time does not match the barber availability intervals';
  END IF;
$r$, '');
  EXECUTE d;
END $$;