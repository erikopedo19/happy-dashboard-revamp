ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paypal_email text,
  ADD COLUMN IF NOT EXISTS paypal_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_paypal_email_format
    CHECK (paypal_email IS NULL OR (length(paypal_email) <= 254 AND paypal_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  ADD CONSTRAINT profiles_paypal_enabled_needs_email
    CHECK (paypal_enabled = false OR paypal_email IS NOT NULL);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS paypal_order_id text,
  ADD COLUMN IF NOT EXISTS paypal_capture_id text,
  ADD COLUMN IF NOT EXISTS paypal_payee_email text;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_provider_check CHECK (provider IN ('stripe', 'paypal')),
  ADD CONSTRAINT payments_paypal_order_id_key UNIQUE (paypal_order_id);

DROP FUNCTION IF EXISTS public.get_public_profile_by_booking_link(text);

CREATE FUNCTION public.get_public_profile_by_booking_link(_booking_link text)
 RETURNS TABLE(id uuid, full_name text, booking_link text, brand_color text, booking_theme text, avatar_url text, banner_url text, address text, phone text, rating numeric, rating_count integer, description text, total_bookings integer, services_count integer, stylists_count integer, booking_locale text, currency text, ask_phone boolean, ask_notes boolean, payments_enabled boolean, paypal_enabled boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    COALESCE(p.business_name, p.full_name, 'Business') AS full_name,
    p.booking_link,
    COALESCE(p.brand_color, '#e0c4a8') AS brand_color,
    p.booking_theme,
    p.avatar_url,
    p.banner_url,
    p.address,
    p.phone,
    COALESCE(p.rating, 5.0) AS rating,
    COALESCE(p.rating_count, 0) AS rating_count,
    p.description,
    COALESCE(a.total_bookings, 0)::integer AS total_bookings,
    COALESCE(s.services_count, 0)::integer AS services_count,
    COALESCE(st.stylists_count, 0)::integer AS stylists_count,
    COALESCE(p.booking_locale, 'en') AS booking_locale,
    COALESCE(p.currency, 'EUR') AS currency,
    COALESCE(p.ask_phone, true) AS ask_phone,
    COALESCE(p.ask_notes, true) AS ask_notes,
    COALESCE(p.payments_enabled, false) AS payments_enabled,
    (COALESCE(p.paypal_enabled, false) AND p.paypal_email IS NOT NULL) AS paypal_enabled
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total_bookings
    FROM public.appointments ap
    WHERE ap.user_id = p.id
      AND COALESCE(ap.status, 'scheduled') <> 'cancelled'
  ) a ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS services_count
    FROM public.services sv
    WHERE sv.user_id = p.id
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS stylists_count
    FROM public.stylists sty
    WHERE sty.user_id = p.id
      AND COALESCE(sty.is_public, true) = true
  ) st ON true
  WHERE p.booking_link = _booking_link
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_by_booking_link(text) TO anon, authenticated, service_role;