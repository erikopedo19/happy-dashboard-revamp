-- Schedule the automated review-request ("rate your visit") emails.
-- The send-review-request edge function was never being invoked because no
-- pg_cron job existed for it, so no rate emails were ever sent. This migration
-- runs the function every hour via pg_net, matching the UI copy that promises
-- "We check every hour and send to clients whose booking has an email address."

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove any previous version of the job so re-running this migration is safe.
SELECT cron.unschedule('send-review-request') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-review-request'
);

SELECT cron.schedule(
  'send-review-request',
  '0 * * * *',
  $$
  SELECT extensions.net.http_post(
    url := 'https://idcifrhzlmxcdihzdtmn.supabase.co/functions/v1/send-review-request',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2lmcmh6bG14Y2RpaHpkdG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTI3NjgsImV4cCI6MjA3OTQ4ODc2OH0.D2aMLYk9XJbBJNeoTv1bh_btt6L5OFosAMqNms_-TWg',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2lmcmh6bG14Y2RpaHpkdG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTI3NjgsImV4cCI6MjA3OTQ4ODc2OH0.D2aMLYk9XJbBJNeoTv1bh_btt6L5OFosAMqNms_-TWg'
    ),
    body := '{}'::jsonb
  );
  $$
);
