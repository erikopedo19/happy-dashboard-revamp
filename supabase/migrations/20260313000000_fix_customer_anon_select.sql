-- Fix: Allow anonymous users to read customer records during public booking
-- The .select().single() after .insert() requires SELECT permission
-- Without this, "failed to create customer record" errors occur for public bookings

-- Allow anon to read customers (needed for checking existing customers during booking)
CREATE POLICY "Anon users can read customers for booking"
ON public.customers
FOR SELECT
TO anon
USING (true);

-- Re-create the public insert policy that was dropped by a previous migration
DROP POLICY IF EXISTS "Public users can create customers for booking" ON public.customers;
CREATE POLICY "Public users can create customers for booking"
ON public.customers
FOR INSERT
TO anon
WITH CHECK (true);

-- Also allow anon to update customer info during booking (name/phone changes)
CREATE POLICY "Anon users can update customers for booking"
ON public.customers
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
