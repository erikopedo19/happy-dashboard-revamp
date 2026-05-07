-- Remove public read access to sensitive profile data and add safe RPCs for booking flows

-- 1) Drop public SELECT policy on profiles
DROP POLICY IF EXISTS "Public users can view profiles by booking link" ON public.profiles;

-- 2) Create a safe RPC to fetch minimal public data by booking link
CREATE OR REPLACE FUNCTION public.get_public_profile_by_booking_link(_booking_link text)
RETURNS TABLE (id uuid, full_name text, booking_link text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.full_name, p.booking_link
  FROM public.profiles AS p
  WHERE p.booking_link = _booking_link
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_by_booking_link(text) TO anon, authenticated;

-- 3) Create a safe RPC to list all public profiles (no sensitive columns)
CREATE OR REPLACE FUNCTION public.list_public_profiles()
RETURNS TABLE (id uuid, full_name text, booking_link text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.full_name, p.booking_link
  FROM public.profiles AS p
  WHERE p.booking_link IS NOT NULL
$$;

GRANT EXECUTE ON FUNCTION public.list_public_profiles() TO anon, authenticated;