-- Offers table for limited-time promotions. Managed by super admins.
-- Safe to re-run; uses IF NOT EXISTS / OR REPLACE.

CREATE TABLE IF NOT EXISTS public.offers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  discount text NOT NULL DEFAULT '',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Anyone can view active, non-expired offers
DROP POLICY IF EXISTS "Active offers are viewable by everyone" ON public.offers;
CREATE POLICY "Active offers are viewable by everyone"
  ON public.offers
  FOR SELECT
  TO anon, authenticated
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

-- Super admins can manage offers
DROP POLICY IF EXISTS "Super admins can manage offers" ON public.offers;
CREATE POLICY "Super admins can manage offers"
  ON public.offers
  FOR ALL
  TO authenticated
  USING (is_super_admin() = true)
  WITH CHECK (is_super_admin() = true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS offers_updated_at ON public.offers;
CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_offers_updated_at();