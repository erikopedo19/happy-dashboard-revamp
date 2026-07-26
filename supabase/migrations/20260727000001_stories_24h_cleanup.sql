-- Stories expire after 24h and are cleaned up hourly

-- 1. New stories expire after 24 hours
ALTER TABLE public.stories
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');

-- 2. Back-fill existing stories to expire 24h after creation
UPDATE public.stories
  SET expires_at = created_at + interval '24 hours'
  WHERE expires_at > created_at + interval '24 hours';

-- 3. Cleanup function (re-create to be sure it is current)
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.stories WHERE expires_at <= now();
$$;

-- 4. Schedule hourly cleanup via pg_cron, replacing any old edge-function-based job
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('cleanup-expired-stories');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM cron.schedule(
    'cleanup-expired-stories',
    '0 * * * *',
    'SELECT public.cleanup_expired_stories();'
  );
END $$;
