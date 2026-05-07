-- Fix customer insert policy to allow both authenticated users and anonymous bookings
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can insert own customers" ON public.customers;

-- Create a new policy that allows:
-- 1. Authenticated users to insert customers with their own user_id
-- 2. Anonymous users to insert customers (for public bookings)
CREATE POLICY "Users and public can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (
  -- Either the user is authenticated and inserting their own customer
  (auth.uid() = user_id)
  OR
  -- Or it's an anonymous user (for public bookings)
  (auth.role() = 'anon')
);

-- Also ensure the public booking policy is present
-- (This is idempotent - won't fail if it already exists)
DROP POLICY IF EXISTS "Public users can create customers for booking" ON public.customers;
