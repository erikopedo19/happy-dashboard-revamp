CREATE OR REPLACE FUNCTION public.get_mobile_dashboard_metrics(p_today date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH bounds AS (
  SELECT
    p_today AS today,
    p_today - 29 AS start_30,
    p_today - 59 AS start_60,
    date_trunc('week', p_today)::date AS week_start
),
user_appointments AS (
  SELECT
    a.id,
    a.appointment_date,
    a.customer_id,
    a.service_id,
    a.status,
    COALESCE(a.price, s.price, 0)::numeric AS amount,
    COALESCE(NULLIF(trim(s.name), ''), 'Other') AS service_name
  FROM public.appointments a
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE a.user_id = auth.uid()
),
summary AS (
  SELECT
    COUNT(*) FILTER (WHERE ua.appointment_date = b.today AND ua.status IS DISTINCT FROM 'cancelled')::integer AS today_bookings,
    COALESCE(SUM(ua.amount) FILTER (WHERE ua.appointment_date = b.today AND ua.status IS DISTINCT FROM 'cancelled'), 0) AS today_revenue,
    COUNT(*) FILTER (WHERE ua.appointment_date >= b.today AND ua.status = 'scheduled')::integer AS upcoming_bookings,
    COUNT(*) FILTER (WHERE ua.appointment_date BETWEEN b.start_30 AND b.today AND ua.status IS DISTINCT FROM 'cancelled')::integer AS bookings_30d,
    COUNT(*) FILTER (WHERE ua.appointment_date BETWEEN b.start_30 AND b.today AND ua.status = 'completed')::integer AS completed_30d,
    COUNT(*) FILTER (WHERE ua.appointment_date BETWEEN b.start_30 AND b.today AND ua.status = 'cancelled')::integer AS cancelled_30d,
    COALESCE(SUM(ua.amount) FILTER (WHERE ua.appointment_date BETWEEN b.start_30 AND b.today AND ua.status IS DISTINCT FROM 'cancelled'), 0) AS revenue_30d,
    COALESCE(SUM(ua.amount) FILTER (WHERE ua.appointment_date BETWEEN b.start_60 AND b.start_30 - 1 AND ua.status IS DISTINCT FROM 'cancelled'), 0) AS revenue_previous_30d
  FROM user_appointments ua
  CROSS JOIN bounds b
),
customer_summary AS (
  SELECT
    (SELECT COUNT(*)::integer FROM public.customers c WHERE c.user_id = auth.uid()) AS total_customers,
    (SELECT COUNT(*)::integer FROM public.customers c CROSS JOIN bounds b WHERE c.user_id = auth.uid() AND c.created_at::date BETWEEN b.start_30 AND b.today) AS new_customers_30d,
    COUNT(*)::integer AS returning_customers_30d
  FROM (
    SELECT ua.customer_id
    FROM user_appointments ua
    CROSS JOIN bounds b
    WHERE ua.appointment_date BETWEEN b.start_30 AND b.today
      AND ua.status IS DISTINCT FROM 'cancelled'
      AND EXISTS (
        SELECT 1
        FROM user_appointments previous
        WHERE previous.customer_id = ua.customer_id
          AND previous.appointment_date < b.start_30
          AND previous.status IS DISTINCT FROM 'cancelled'
      )
    GROUP BY ua.customer_id
  ) returning_customers
),
spark_days AS (
  SELECT generate_series(p_today - 13, p_today, interval '1 day')::date AS day
),
spark AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', d.day,
      'revenue', COALESCE(x.revenue, 0),
      'bookings', COALESCE(x.bookings, 0)
    ) ORDER BY d.day
  ) AS value
  FROM spark_days d
  LEFT JOIN (
    SELECT
      ua.appointment_date AS day,
      SUM(ua.amount) AS revenue,
      COUNT(*)::integer AS bookings
    FROM user_appointments ua
    WHERE ua.appointment_date BETWEEN p_today - 13 AND p_today
      AND ua.status IS DISTINCT FROM 'cancelled'
    GROUP BY ua.appointment_date
  ) x ON x.day = d.day
),
week_days AS (
  SELECT generate_series(
    date_trunc('week', p_today)::date,
    date_trunc('week', p_today)::date + 6,
    interval '1 day'
  )::date AS day
),
week AS (
  SELECT jsonb_agg(
    jsonb_build_object('date', d.day, 'bookings', COALESCE(x.bookings, 0))
    ORDER BY d.day
  ) AS value
  FROM week_days d
  LEFT JOIN (
    SELECT ua.appointment_date AS day, COUNT(*)::integer AS bookings
    FROM user_appointments ua
    CROSS JOIN bounds b
    WHERE ua.appointment_date BETWEEN b.week_start AND b.week_start + 6
      AND ua.status IS DISTINCT FROM 'cancelled'
    GROUP BY ua.appointment_date
  ) x ON x.day = d.day
),
top_services AS (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('name', ranked.service_name, 'bookings', ranked.bookings, 'revenue', ranked.revenue)
    ORDER BY ranked.bookings DESC, ranked.revenue DESC
  ), '[]'::jsonb) AS value
  FROM (
    SELECT
      ua.service_name,
      COUNT(*)::integer AS bookings,
      COALESCE(SUM(ua.amount), 0) AS revenue
    FROM user_appointments ua
    CROSS JOIN bounds b
    WHERE ua.appointment_date BETWEEN b.start_30 AND b.today
      AND ua.status IS DISTINCT FROM 'cancelled'
    GROUP BY ua.service_name
    ORDER BY bookings DESC, revenue DESC
    LIMIT 4
  ) ranked
)
SELECT jsonb_build_object(
  'today_bookings', s.today_bookings,
  'today_revenue', s.today_revenue,
  'upcoming_bookings', s.upcoming_bookings,
  'revenue_30d', s.revenue_30d,
  'revenue_previous_30d', s.revenue_previous_30d,
  'bookings_30d', s.bookings_30d,
  'completed_30d', s.completed_30d,
  'cancelled_30d', s.cancelled_30d,
  'avg_ticket_30d', CASE WHEN s.bookings_30d > 0 THEN round(s.revenue_30d / s.bookings_30d, 2) ELSE 0 END,
  'total_customers', c.total_customers,
  'new_customers_30d', c.new_customers_30d,
  'returning_customers_30d', c.returning_customers_30d,
  'completion_rate', CASE WHEN s.completed_30d + s.cancelled_30d > 0 THEN round((s.completed_30d::numeric / (s.completed_30d + s.cancelled_30d)) * 100)::integer ELSE 0 END,
  'revenue_change', CASE WHEN s.revenue_previous_30d > 0 THEN round(((s.revenue_30d - s.revenue_previous_30d) / s.revenue_previous_30d) * 100)::integer ELSE 0 END,
  'spark', COALESCE(sp.value, '[]'::jsonb),
  'week', COALESCE(w.value, '[]'::jsonb),
  'top_services', ts.value
)
FROM summary s
CROSS JOIN customer_summary c
CROSS JOIN spark sp
CROSS JOIN week w
CROSS JOIN top_services ts;
$$;

REVOKE ALL ON FUNCTION public.get_mobile_dashboard_metrics(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mobile_dashboard_metrics(date) TO authenticated;
