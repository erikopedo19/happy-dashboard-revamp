-- Auto review-request emails (premium feature)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_review_emails boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_email_delay_hours integer NOT NULL DEFAULT 24;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS review_email_sent_at timestamptz;

-- Candidate finder for the send-review-request edge function.
-- Returns appointments that finished >= delay hours ago, whose barber has
-- auto_review_emails on, that have no review yet and no request email sent.
CREATE OR REPLACE FUNCTION public.get_pending_review_requests()
RETURNS TABLE(
  appointment_id uuid,
  business_id uuid,
  cancel_token uuid,
  customer_email text,
  customer_name text,
  service_name text,
  appointment_date date,
  appointment_time time,
  business_name text,
  brand_color text,
  sender_email text,
  sender_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.user_id,
    a.cancel_token,
    c.email,
    c.name,
    s.name,
    a.appointment_date,
    a.appointment_time,
    COALESCE(p.business_name, p.full_name, 'Your appointment'),
    COALESCE(p.brand_color, '#e0c4a8'),
    COALESCE(p.sender_email, 'noreply@cutzioo.com'),
    COALESCE(p.sender_name, p.business_name, p.full_name, 'Cutzioo')
  FROM public.appointments a
  JOIN public.profiles p ON p.id = a.user_id
  JOIN public.customers c ON c.id = a.customer_id
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE p.auto_review_emails = true
    AND a.review_email_sent_at IS NULL
    AND COALESCE(a.status, 'scheduled') NOT IN ('cancelled')
    AND c.email IS NOT NULL
    AND (a.appointment_date + a.appointment_time
         + make_interval(hours => COALESCE(p.review_email_delay_hours, 24))) <= now()
    AND (a.appointment_date + a.appointment_time
         + make_interval(hours => COALESCE(p.review_email_delay_hours, 24) + 168)) >= now()
    AND NOT EXISTS (SELECT 1 FROM public.reviews r WHERE r.appointment_id = a.id)
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_pending_review_requests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_review_requests() TO service_role;

CREATE OR REPLACE FUNCTION public.mark_review_email_sent(_appointment_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.appointments SET review_email_sent_at = now() WHERE id = _appointment_id;
$$;

REVOKE ALL ON FUNCTION public.mark_review_email_sent(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_review_email_sent(uuid) TO service_role;