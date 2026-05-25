
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('expire-waitlist-offers') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-waitlist-offers'
);

SELECT cron.schedule(
  'expire-waitlist-offers',
  '* * * * *',
  $$SELECT public.expire_waitlist_offers();$$
);
