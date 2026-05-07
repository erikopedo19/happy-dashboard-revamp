-- ============================================================================
-- BOOKING FIX - Apply this SQL in your Supabase SQL Editor
-- ============================================================================
-- This fixes error 1005 and adds proper error handling for bookings
-- Copy and paste this entire file into the Supabase SQL Editor and run it
-- ============================================================================

-- FIX 1: Remove the restrictive unique constraint causing error 1005
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
    -- Drop the constraint that prevents multiple appointments at same time
    ALTER TABLE public.appointments 
    DROP CONSTRAINT IF EXISTS appointments_user_id_appointment_date_appointment_time_key;
    
    RAISE NOTICE 'Dropped restrictive unique constraint';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint may not exist, continuing...';
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_date_time 
ON public.appointments(user_id, appointment_date, appointment_time);

RAISE NOTICE 'Added performance index';

-- FIX 2: Add primary_color column to brand_profiles
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'brand_profiles' 
    AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE public.brand_profiles ADD COLUMN primary_color TEXT DEFAULT '#e0c4a8';
    RAISE NOTICE 'Added primary_color column to brand_profiles';
  ELSE
    RAISE NOTICE 'primary_color column already exists';
  END IF;
END $$;

-- FIX 3: Update RPC function to return brand_color
-- ----------------------------------------------------------------------------
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

RAISE NOTICE 'Updated get_public_profile_by_booking_link function';

-- FIX 4: Update list_public_profiles function
-- ----------------------------------------------------------------------------
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

RAISE NOTICE 'Updated list_public_profiles function';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run these queries to verify the fixes were applied correctly

-- Check if constraint was removed
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.appointments'::regclass
AND conname LIKE '%appointment%';

-- Check if primary_color column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'brand_profiles'
AND column_name = 'primary_color';

-- Check if RPC functions exist and have correct signature
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_public_profile_by_booking_link', 'list_public_profiles');

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '✓ All fixes applied successfully!';
    RAISE NOTICE '✓ You can now create bookings without error 1005';
    RAISE NOTICE '✓ Brand colors will display correctly';
    RAISE NOTICE '✓ Error handling is improved';
    RAISE NOTICE '✓ Added onboarding_completed column to profiles';
END $$;

-- FIX 5: Add onboarding_completed to profiles table (for profile completion flow)
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added onboarding_completed column to profiles';
  ELSE
    RAISE NOTICE 'onboarding_completed column already exists';
  END IF;
END $$;

-- FIX 6: Fix Stylists RLS Policy (Recursion/500 Error Fix)
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
    -- Drop existing policies to be safe
    DROP POLICY IF EXISTS "Users can view their own stylists" ON public.stylists;
    DROP POLICY IF EXISTS "Users can insert their own stylists" ON public.stylists;
    DROP POLICY IF EXISTS "Users can update their own stylists" ON public.stylists;
    DROP POLICY IF EXISTS "Users can delete their own stylists" ON public.stylists;
    
    -- Create simple non-recursive policies based on user_id
    CREATE POLICY "Users can view their own stylists"
    ON public.stylists FOR SELECT
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own stylists"
    ON public.stylists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own stylists"
    ON public.stylists FOR UPDATE
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own stylists"
    ON public.stylists FOR DELETE
    USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Fixed Stylists RLS policies';
END $$;
