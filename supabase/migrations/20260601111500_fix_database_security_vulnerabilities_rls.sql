-- Migration: Fix database security vulnerabilities and enforce robust RLS policies
-- Date: 2026-06-01
-- Description: Addresses core RLS issues:
--   1. Restricts subscribers UPDATE to only the subscriber's own user_id.
--   2. Restricts notifications INSERT to only the user's own user_id (system triggers run as security definer and bypass this).
--   3. Restricts memberships UPDATE to only organization owners, preventing role self-escalation.
--   4. Restricts customers INSERT so authenticated users can only insert their own records, while anonymous users can create records for bookings.

-- 1. Fix subscribers UPDATE policy (Prevent subscription tier escalation)
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
CREATE POLICY "update_own_subscription" ON public.subscribers
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Fix notifications INSERT policy (Prevent anonymous/arbitrary notification injection)
DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
CREATE POLICY "System inserts notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Fix memberships UPDATE policy (Prevent membership role self-escalation)
DROP POLICY IF EXISTS "Users can update their memberships" ON public.memberships;
CREATE POLICY "Owners can update memberships" ON public.memberships
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = memberships.org_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- 4. Fix customers INSERT policy (Prevent authenticated users from inserting customers for others)
DROP POLICY IF EXISTS "Users and public can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Public users can create customers for booking" ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;

CREATE POLICY "authenticated_insert_own_customers" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "anon_insert_booking_customers" ON public.customers
  FOR INSERT TO anon
  WITH CHECK (true);
