
CREATE OR REPLACE FUNCTION public.get_my_bookings()
RETURNS TABLE(
  id uuid,
  appointment_date date,
  appointment_time time without time zone,
  status text,
  service_name text,
  barber_id uuid,
  barber_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.appointment_date,
    a.appointment_time,
    COALESCE(a.status, 'scheduled') AS status,
    s.name AS service_name,
    a.user_id AS barber_id,
    p.full_name AS barber_name
  FROM public.appointments a
  JOIN public.customers c ON c.id = a.customer_id
  LEFT JOIN public.services s ON s.id = a.service_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE lower(c.email) = lower((auth.jwt() ->> 'email'))
  ORDER BY a.appointment_date DESC, a.appointment_time DESC
  LIMIT 50;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_bookings() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_bookings() TO authenticated;
