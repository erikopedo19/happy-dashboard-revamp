-- Top banners table. Managed by super admins.
-- Safe to re-run; uses IF NOT EXISTS / OR REPLACE.

CREATE TABLE IF NOT EXISTS public.banners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  button_text text,
  button_link text,
  variant text NOT NULL DEFAULT 'default',
  gradient_colors jsonb,
  active boolean NOT NULL DEFAULT true,
  dismissable boolean NOT NULL DEFAULT true,
  auto_dismiss integer, -- milliseconds
  priority integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_variant CHECK (variant IN ('default','minimal','popup','destructive','warning','success','info','announcement'))
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Active banners are viewable by everyone
DROP POLICY IF EXISTS "Active banners are viewable by everyone" ON public.banners;
CREATE POLICY "Active banners are viewable by everyone"
  ON public.banners
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Super admins can manage banners
DROP POLICY IF EXISTS "Super admins can manage banners" ON public.banners;
CREATE POLICY "Super admins can manage banners"
  ON public.banners
  FOR ALL
  TO authenticated
  USING (is_super_admin() = true)
  WITH CHECK (is_super_admin() = true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS banners_updated_at ON public.banners;
CREATE TRIGGER banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW
  EXECUTE FUNCTION public.set_banners_updated_at();
