-- Ensures all profile identity fields exist and keeps updated_at current.
-- Safe to re-run; uses IF NOT EXISTS / OR REPLACE everywhere.

-- 1. Identity columns needed for names, images, and business info.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS accepts_waitlist boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS booking_locale text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS dark_mode boolean,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Function + trigger to auto-update updated_at on profile changes.
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profiles_updated_at();

-- 3. Make sure every profile has a row for the authenticated user when missing.
--    This can be called from the client after signup.
CREATE OR REPLACE FUNCTION public.ensure_profile_identity(
  p_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_business_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_banner_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, business_name, avatar_url, banner_url)
  VALUES (p_user_id, p_full_name, p_business_name, p_avatar_url, p_banner_url)
  ON CONFLICT (id) DO UPDATE SET
    full_name     = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    business_name = COALESCE(EXCLUDED.business_name, public.profiles.business_name),
    avatar_url    = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    banner_url    = COALESCE(EXCLUDED.banner_url, public.profiles.banner_url),
    updated_at    = now();
END;
$$;

-- 4. Permissions for authenticated users to manage their own identity fields.
GRANT EXECUTE ON FUNCTION public.ensure_profile_identity(uuid, text, text, text, text) TO authenticated;
