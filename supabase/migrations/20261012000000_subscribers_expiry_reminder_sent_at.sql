-- Dedupe marker for the "expires soon" reminder email pass in
-- supabase/functions/send-subscription-expired (same pattern as
-- expiration_email_sent_at, but sent BEFORE the end date).
alter table public.subscribers
  add column if not exists expiry_reminder_sent_at timestamptz;
