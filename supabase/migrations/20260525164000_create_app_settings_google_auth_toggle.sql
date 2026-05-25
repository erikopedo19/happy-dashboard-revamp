CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Anyone can read app settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (true);

INSERT INTO public.app_settings (key, value)
VALUES ('auth', jsonb_build_object('show_google_button', true))
ON CONFLICT (key) DO NOTHING;
