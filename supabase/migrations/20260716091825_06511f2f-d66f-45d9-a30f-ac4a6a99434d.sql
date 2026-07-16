
CREATE TABLE public.fake_barbershops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  city text,
  country text,
  locale text,
  avatar_url text,
  banner_url text,
  brand_color text DEFAULT '#e0c4a8',
  rating numeric DEFAULT 5.0,
  rating_count integer DEFAULT 0,
  latitude numeric,
  longitude numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fake_barbershops TO anon, authenticated;
GRANT ALL ON public.fake_barbershops TO service_role;

ALTER TABLE public.fake_barbershops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fake barbershops"
  ON public.fake_barbershops FOR SELECT
  USING (true);

INSERT INTO public.app_settings (key, value)
VALUES ('fake_shops', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
