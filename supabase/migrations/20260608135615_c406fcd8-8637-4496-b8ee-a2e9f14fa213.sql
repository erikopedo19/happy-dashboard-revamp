CREATE TABLE public.microsites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  published BOOLEAN NOT NULL DEFAULT true,
  headline TEXT,
  tagline TEXT,
  about TEXT,
  hero_url TEXT,
  logo_url TEXT,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  instagram TEXT,
  facebook TEXT,
  tiktok TEXT,
  website_url TEXT,
  hours TEXT,
  address TEXT,
  theme TEXT NOT NULL DEFAULT 'editorial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.microsites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.microsites TO authenticated;
GRANT ALL ON public.microsites TO service_role;

ALTER TABLE public.microsites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own microsite"
  ON public.microsites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can read published microsites"
  ON public.microsites FOR SELECT
  USING (published = true);

CREATE OR REPLACE FUNCTION public.touch_microsites_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_microsites_updated_at
  BEFORE UPDATE ON public.microsites
  FOR EACH ROW EXECUTE FUNCTION public.touch_microsites_updated_at();

CREATE OR REPLACE FUNCTION public.get_microsite_by_slug(_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id,
      'business_name', COALESCE(p.business_name, p.full_name),
      'full_name', p.full_name,
      'booking_link', p.booking_link,
      'brand_color', COALESCE(p.brand_color, '#0A84FF'),
      'avatar_url', p.avatar_url,
      'banner_url', p.banner_url,
      'address', p.address,
      'phone', p.phone,
      'description', p.description,
      'rating', COALESCE(p.rating, 5.0),
      'rating_count', COALESCE(p.rating_count, 0)
    ),
    'microsite', to_jsonb(m.*),
    'services', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration) ORDER BY s.name)
      FROM public.services s
      WHERE s.user_id = p.id AND s.deleted_at IS NULL
    ), '[]'::jsonb)
  )
  FROM public.profiles p
  LEFT JOIN public.microsites m ON m.user_id = p.id AND m.published = true
  WHERE p.booking_link = _slug
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_microsite_by_slug(TEXT) TO anon, authenticated;