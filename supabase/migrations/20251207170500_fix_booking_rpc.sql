-- Fix booking RPC to include brand_color from brand_profiles table
-- This resolves the issue where the booking form expects brand_color but the RPC doesn't return it

-- First, add primary_color column to brand_profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'brand_profiles' 
    AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE public.brand_profiles ADD COLUMN primary_color TEXT DEFAULT '#e0c4a8';
  END IF;
END $$;

-- Drop and recreate the RPC function with brand_color support
DROP FUNCTION IF EXISTS public.get_public_profile_by_booking_link(text);

CREATE OR REPLACE FUNCTION public.get_public_profile_by_booking_link(_booking_link text)
RETURNS TABLE (
  id uuid, 
  full_name text, 
  booking_link text,
  brand_color text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    p.id, 
    p.full_name, 
    p.booking_link,
    COALESCE(bp.primary_color, '#e0c4a8') as brand_color
  FROM public.profiles AS p
  LEFT JOIN public.brand_profiles AS bp ON bp.user_id = p.id
  WHERE p.booking_link = _booking_link
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_by_booking_link(text) TO anon, authenticated;

-- Also update list_public_profiles to include brand_color for consistency
DROP FUNCTION IF EXISTS public.list_public_profiles();

CREATE OR REPLACE FUNCTION public.list_public_profiles()
RETURNS TABLE (
  id uuid, 
  full_name text, 
  booking_link text,
  brand_color text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    p.id, 
    p.full_name, 
    p.booking_link,
    COALESCE(bp.primary_color, '#e0c4a8') as brand_color
  FROM public.profiles AS p
  LEFT JOIN public.brand_profiles AS bp ON bp.user_id = p.id
  WHERE p.booking_link IS NOT NULL
$$;

GRANT EXECUTE ON FUNCTION public.list_public_profiles() TO anon, authenticated;
