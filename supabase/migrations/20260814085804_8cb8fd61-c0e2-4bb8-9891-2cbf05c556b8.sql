CREATE OR REPLACE FUNCTION public.get_most_active_barbers(_days integer DEFAULT 30, _limit integer DEFAULT 5)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  business_name text,
  bookings integer,
  calendar_updates integer,
  clients integer,
  services integer,
  last_active timestamp with time zone,
  activity_score integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH since AS (SELECT now() - make_interval(days => GREATEST(_days, 1)) AS ts),
  apt AS (
    SELECT a.user_id,
           COUNT(*) FILTER (WHERE a.created_at >= (SELECT ts FROM since))::int AS bookings,
           COUNT(*) FILTER (WHERE a.updated_at >= (SELECT ts FROM since) AND a.updated_at > a.created_at)::int AS calendar_updates,
           MAX(GREATEST(a.created_at, a.updated_at)) AS last_active
    FROM public.appointments a
    GROUP BY a.user_id
  ),
  cus AS (
    SELECT c.user_id, COUNT(*)::int AS clients FROM public.customers c GROUP BY c.user_id
  ),
  svc AS (
    SELECT s.user_id, COUNT(*)::int AS services FROM public.services s WHERE s.deleted_at IS NULL GROUP BY s.user_id
  )
  SELECT p.id,
         p.full_name,
         p.business_name,
         COALESCE(apt.bookings, 0),
         COALESCE(apt.calendar_updates, 0),
         COALESCE(cus.clients, 0),
         COALESCE(svc.services, 0),
         apt.last_active,
         (COALESCE(apt.bookings, 0) * 3 + COALESCE(apt.calendar_updates, 0) * 2 + COALESCE(cus.clients, 0))::int
  FROM public.profiles p
  LEFT JOIN apt ON apt.user_id = p.id
  LEFT JOIN cus ON cus.user_id = p.id
  LEFT JOIN svc ON svc.user_id = p.id
  WHERE p.deleted_at IS NULL
  ORDER BY 9 DESC, apt.last_active DESC NULLS LAST
  LIMIT GREATEST(_limit, 1);
END;
$$;

REVOKE ALL ON FUNCTION public.get_most_active_barbers(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_most_active_barbers(integer, integer) TO authenticated;