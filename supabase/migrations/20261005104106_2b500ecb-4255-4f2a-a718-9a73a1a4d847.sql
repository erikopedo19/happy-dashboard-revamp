ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_service boolean NOT NULL DEFAULT false;
DROP FUNCTION IF EXISTS public.list_public_profiles();
CREATE FUNCTION public.list_public_profiles()
 RETURNS TABLE(id uuid, full_name text, business_name text, booking_link text, brand_color text, avatar_url text, banner_url text, rating numeric, rating_count integer, description text, latitude numeric, longitude numeric, home_service boolean, address text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.business_name, p.booking_link,
         COALESCE(p.brand_color,'#e0c4a8'), p.avatar_url, p.banner_url,
         COALESCE(p.rating, 5.0), COALESCE(p.rating_count, 0),
         p.description, p.latitude, p.longitude, p.home_service, p.address
  FROM public.profiles p
  WHERE p.booking_link IS NOT NULL AND COALESCE(p.is_public, false) = true AND p.deleted_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION public.list_public_profiles() TO anon, authenticated;