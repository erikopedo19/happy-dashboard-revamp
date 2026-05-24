ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS longitude numeric;

DROP FUNCTION IF EXISTS public.list_public_profiles();

CREATE OR REPLACE FUNCTION public.list_public_profiles()
 RETURNS TABLE(id uuid, full_name text, booking_link text, brand_color text, avatar_url text, banner_url text, rating numeric, rating_count integer, description text, latitude numeric, longitude numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.booking_link,
         COALESCE(p.brand_color,'#e0c4a8'),
         p.avatar_url, p.banner_url,
         COALESCE(p.rating, 5.0),
         COALESCE(p.rating_count, 0),
         p.description, p.latitude, p.longitude
  FROM public.profiles p
  WHERE p.booking_link IS NOT NULL
    AND COALESCE(p.is_public, false) = true
$$;

CREATE OR REPLACE FUNCTION public.list_public_shops()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'solo', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'kind','solo','id', p.id,'name', p.full_name,
        'booking_link', p.booking_link,
        'brand_color', COALESCE(p.brand_color,'#e0c4a8'),
        'avatar_url', p.avatar_url,'banner_url', p.banner_url,
        'rating', COALESCE(p.rating, 5.0),
        'rating_count', COALESCE(p.rating_count, 0),
        'description', p.description,
        'latitude', p.latitude,'longitude', p.longitude
      ))
      FROM public.profiles p
      WHERE COALESCE(p.is_public, false) = true
        AND p.booking_link IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.memberships m WHERE m.user_id = p.id)
    ), '[]'::jsonb),
    'teams', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'kind','team','id', t.id,'name', t.name,
        'description', t.description,'logo_url', t.logo_url,
        'banner_url', t.banner_url,'color', t.color,
        'address', t.address,'latitude', t.latitude,'longitude', t.longitude,
        'stylists', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', s.id,'name', s.name,'title', s.title,
            'avatar_url', s.avatar_url,'specialties', s.specialties
          ))
          FROM public.stylists s WHERE s.org_id = t.org_id
        ), '[]'::jsonb)
      ))
      FROM public.teams t
      WHERE COALESCE(t.is_public, false) = true
    ), '[]'::jsonb)
  )
$$;

DROP POLICY IF EXISTS "Public can view public teams" ON public.teams;
CREATE POLICY "Public can view public teams" ON public.teams
  FOR SELECT TO anon, authenticated
  USING (COALESCE(is_public, false) = true);
