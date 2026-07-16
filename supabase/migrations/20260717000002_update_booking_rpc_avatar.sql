-- Update get_public_profile_by_booking_link to ensure avatar_url and banner_url are returned
-- for the public booking page barber avatar display.

DROP FUNCTION IF EXISTS public.get_public_profile_by_booking_link(text);

CREATE FUNCTION public.get_public_profile_by_booking_link(_booking_link text)
RETURNS TABLE(
  id uuid,
  full_name text,
  booking_link text,
  brand_color text,
  avatar_url text,
  banner_url text,
  address text,
  phone text,
  rating numeric,
  rating_count integer,
  description text,
  total_bookings integer,
  services_count integer,
  stylists_count integer,
  years_experience integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    COALESCE(p.business_name, p.full_name, 'Business') AS full_name,
    p.booking_link,
    COALESCE(p.brand_color, '#e0c4a8') AS brand_color,
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
    p.years_experience
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
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_by_booking_link(text) TO anon, authenticated;
