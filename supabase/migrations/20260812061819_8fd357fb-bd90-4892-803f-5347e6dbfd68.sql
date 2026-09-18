DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-subscription-expired') THEN
    PERFORM cron.unschedule('send-subscription-expired');
  END IF;
  PERFORM cron.schedule(
    'send-subscription-expired',
    '0 8 * * *',
    $c$
      SELECT net.http_post(
        url := 'https://idcifrhzlmxcdihzdtmn.supabase.co/functions/v1/send-subscription-expired',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{}'::jsonb
      );
    $c$
  );
END $$;