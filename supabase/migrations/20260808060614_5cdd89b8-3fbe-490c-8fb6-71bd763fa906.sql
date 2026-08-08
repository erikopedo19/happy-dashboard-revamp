ALTER TABLE public.marketing_email_log ADD COLUMN IF NOT EXISTS period text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS marketing_email_log_unique_campaign
  ON public.marketing_email_log (user_id, campaign, period);

DROP FUNCTION IF EXISTS public.marketing_email_candidates(integer);

CREATE OR REPLACE FUNCTION public.marketing_email_candidates(_limit integer DEFAULT 30)
RETURNS TABLE(user_id uuid, campaign text, full_name text, total_appointments integer, month_appointments integer, cancelled_appointments integer, weekly_counts jsonb, period text, priority integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH bounds AS (
    SELECT date_trunc('month', now()) - interval '1 month' AS m_start,
           date_trunc('month', now()) AS m_end
  ),
  base AS (
    SELECT p.id,
           COALESCE(NULLIF(p.full_name, ''), p.business_name) AS name,
           p.created_at,
           p.booking_link,
           (SELECT COUNT(*) FROM public.appointments a WHERE a.user_id = p.id)::int AS total_appts,
           (SELECT COUNT(*) FROM public.appointments a, bounds b
             WHERE a.user_id = p.id AND a.created_at >= b.m_start AND a.created_at < b.m_end
               AND COALESCE(a.status,'') <> 'cancelled')::int AS month_appts,
           (SELECT COUNT(*) FROM public.appointments a, bounds b
             WHERE a.user_id = p.id AND a.created_at >= b.m_start AND a.created_at < b.m_end
               AND a.status = 'cancelled')::int AS cancelled_appts,
           (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', 'W' || w.wk, 'booked', w.booked, 'cancelled', w.cancelled) ORDER BY w.wk), '[]'::jsonb)
              FROM (
                SELECT LEAST(4, GREATEST(1, (EXTRACT(day FROM a.created_at)::int - 1) / 7 + 1)) AS wk,
                       COUNT(*) FILTER (WHERE COALESCE(a.status,'') <> 'cancelled')::int AS booked,
                       COUNT(*) FILTER (WHERE a.status = 'cancelled')::int AS cancelled
                FROM public.appointments a, bounds b
                WHERE a.user_id = p.id AND a.created_at >= b.m_start AND a.created_at < b.m_end
                GROUP BY 1
              ) w) AS weekly,
           (SELECT COUNT(*) FROM public.appointments a
             WHERE a.user_id = p.id AND a.created_at >= now() - interval '14 days')::int AS recent_appts
    FROM public.profiles p
    WHERE p.deleted_at IS NULL
  ),
  picked AS (
    SELECT 'welcome_24h'::text AS campaign, ''::text AS period, 1 AS priority, b.* FROM base b
      WHERE b.created_at >= now() - interval '24 hours' AND b.created_at <= now() - interval '1 hour'
    UNION ALL
    SELECT 'monthly_recap', to_char(date_trunc('month', now() - interval '1 month')::date, 'YYYY-MM'), 2, b.* FROM base b
      WHERE b.created_at < date_trunc('month', now())
        AND EXTRACT(day FROM now())::int <= 3
        AND EXTRACT(hour FROM now())::int BETWEEN 9 AND 11
    UNION ALL
    SELECT 'activation_setup', '', 3, b.* FROM base b
      WHERE b.created_at <= now() - interval '3 days'
        AND (b.booking_link IS NULL OR b.booking_link = '')
    UNION ALL
    SELECT 'milestone_200', '', 4, b.* FROM base b
      WHERE b.total_appts BETWEEN 100 AND 199
    UNION ALL
    SELECT 'inactive_14d', '', 5, b.* FROM base b
      WHERE b.created_at <= now() - interval '21 days' AND b.recent_appts = 0
  ),
  filtered AS (
    SELECT DISTINCT ON (p.id) p.id AS uid, p.campaign, p.period, p.name,
           p.total_appts, p.month_appts, p.cancelled_appts, p.weekly, p.priority
    FROM picked p
    -- never repeat the same campaign (monthly recap is unique per month via period)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.marketing_email_log l
      WHERE l.user_id = p.id AND l.campaign = p.campaign AND l.period = p.period
    )
    -- at most one marketing email per person per 30 days
    AND NOT EXISTS (
      SELECT 1 FROM public.marketing_email_log l2
      WHERE l2.user_id = p.id AND l2.created_at >= now() - interval '30 days'
    )
    ORDER BY p.id, p.priority
  )
  SELECT uid, campaign, name, total_appts, month_appts, cancelled_appts, weekly, period, priority
  FROM filtered
  ORDER BY priority, uid
  LIMIT GREATEST(COALESCE(_limit, 30), 0);
$function$;