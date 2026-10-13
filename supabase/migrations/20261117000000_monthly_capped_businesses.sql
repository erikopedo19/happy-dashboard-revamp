CREATE OR REPLACE FUNCTION public.list_monthly_capped_businesses()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH month_bounds AS (
    SELECT
      date_trunc('month', CURRENT_DATE)::date AS month_start,
      (date_trunc('month', CURRENT_DATE) + interval '1 month')::date AS month_end
  ),
  latest_subscriber AS (
    SELECT DISTINCT ON (s.user_id)
      s.user_id,
      s.subscribed,
      s.subscription_end
    FROM public.subscribers s
    ORDER BY s.user_id, s.updated_at DESC
  ),
  monthly_bookings AS (
    SELECT a.user_id, COUNT(*) AS booking_count
    FROM public.appointments a
    CROSS JOIN month_bounds m
    WHERE a.appointment_date >= m.month_start
      AND a.appointment_date < m.month_end
      AND COALESCE(a.status, '') NOT IN ('cancelled', 'canceled', 'no_show', 'no-show')
    GROUP BY a.user_id
    HAVING COUNT(*) >= 20
  )
  SELECT b.user_id
  FROM monthly_bookings b
  LEFT JOIN latest_subscriber s ON s.user_id = b.user_id
  WHERE NOT (
    COALESCE(s.subscribed, false)
    AND (s.subscription_end IS NULL OR s.subscription_end > now())
  );
$$;

GRANT EXECUTE ON FUNCTION public.list_monthly_capped_businesses() TO anon, authenticated;
