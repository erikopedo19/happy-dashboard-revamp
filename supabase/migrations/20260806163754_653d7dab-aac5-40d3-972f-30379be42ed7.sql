CREATE TABLE IF NOT EXISTS public.marketing_email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  campaign text not null,
  recipient_email text not null,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

GRANT ALL ON public.marketing_email_log TO service_role;
ALTER TABLE public.marketing_email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_email_log_no_client_access" ON public.marketing_email_log;
CREATE POLICY "marketing_email_log_no_client_access"
  ON public.marketing_email_log FOR SELECT TO authenticated USING (false);

CREATE INDEX IF NOT EXISTS marketing_email_log_user_campaign_idx
  ON public.marketing_email_log (user_id, campaign, created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_email_log_created_idx
  ON public.marketing_email_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.marketing_emails_sent_today()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::int
  FROM public.marketing_email_log
  WHERE status = 'sent'
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
$$;

REVOKE ALL ON FUNCTION public.marketing_emails_sent_today() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_emails_sent_today() TO service_role;

CREATE OR REPLACE FUNCTION public.marketing_email_candidates(_limit integer DEFAULT 30)
RETURNS TABLE (
  user_id uuid,
  campaign text,
  full_name text,
  total_appointments integer,
  month_appointments integer,
  priority integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT p.id,
           COALESCE(NULLIF(p.full_name, ''), p.business_name) AS name,
           p.created_at,
           p.booking_link,
           (SELECT COUNT(*) FROM public.appointments a WHERE a.user_id = p.id)::int AS total_appts,
           (SELECT COUNT(*) FROM public.appointments a
             WHERE a.user_id = p.id AND a.created_at >= now() - interval '30 days')::int AS month_appts,
           (SELECT COUNT(*) FROM public.appointments a
             WHERE a.user_id = p.id AND a.created_at >= now() - interval '14 days')::int AS recent_appts
    FROM public.profiles p
    WHERE p.deleted_at IS NULL
  ),
  picked AS (
    SELECT 'welcome_24h'::text AS campaign, 1 AS priority, b.* FROM base b
      WHERE b.created_at >= now() - interval '24 hours' AND b.created_at <= now() - interval '1 hour'
    UNION ALL
    SELECT 'activation_setup', 2, b.* FROM base b
      WHERE b.created_at <= now() - interval '3 days'
        AND (b.booking_link IS NULL OR b.booking_link = '')
    UNION ALL
    SELECT 'milestone_200', 3, b.* FROM base b
      WHERE b.total_appts BETWEEN 100 AND 199
    UNION ALL
    SELECT 'inactive_14d', 4, b.* FROM base b
      WHERE b.created_at <= now() - interval '21 days' AND b.recent_appts = 0
    UNION ALL
    SELECT 'monthly_recap', 5, b.* FROM base b
      WHERE b.created_at <= now() - interval '30 days'
  ),
  filtered AS (
    SELECT DISTINCT ON (p.id) p.id AS uid, p.campaign, p.name, p.total_appts, p.month_appts, p.priority
    FROM picked p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.marketing_email_log l
      WHERE l.user_id = p.id
        AND l.campaign = p.campaign
        AND l.created_at >= CASE
          WHEN p.campaign IN ('welcome_24h', 'activation_setup') THEN now() - interval '10 years'
          WHEN p.campaign = 'monthly_recap' THEN now() - interval '28 days'
          ELSE now() - interval '30 days'
        END
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.marketing_email_log l2
      WHERE l2.user_id = p.id AND l2.created_at >= now() - interval '3 days'
    )
    ORDER BY p.id, p.priority
  )
  SELECT uid, campaign, name, total_appts, month_appts, priority
  FROM filtered
  ORDER BY priority, uid
  LIMIT GREATEST(COALESCE(_limit, 30), 0);
$$;

REVOKE ALL ON FUNCTION public.marketing_email_candidates(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketing_email_candidates(integer) TO service_role;