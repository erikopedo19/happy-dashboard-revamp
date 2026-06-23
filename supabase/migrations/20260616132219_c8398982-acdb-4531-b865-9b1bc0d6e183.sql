
-- 1) CUSTOMERS: drop permissive insert policies, keep proper ones
DROP POLICY IF EXISTS "Users can insert own customers" ON public.customers;
DROP POLICY IF EXISTS "Users and public can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Public users can create customers for booking" ON public.customers;
-- Keep authenticated_insert_own_customers (auth.uid() = user_id).
-- Public bookings go through SECURITY DEFINER RPC create_public_booking, so no anon insert policy needed.

-- 2) CANCELLATION WAITLIST: enforce client_user_id matches caller
DROP POLICY IF EXISTS "anyone authenticated can join waitlist" ON public.cancellation_waitlist;
CREATE POLICY "authenticated can join waitlist as self"
  ON public.cancellation_waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_user_id = auth.uid()
    AND lower(client_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

-- 3) SUBSCRIBERS: lock down writes to service_role only
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
REVOKE INSERT, UPDATE, DELETE ON public.subscribers FROM anon, authenticated;
-- service_role bypasses RLS so Stripe webhook continues to work.

-- 4) MEMBERSHIPS: prevent self role escalation, fix owner update bug
DROP POLICY IF EXISTS "Users can update their memberships" ON public.memberships;
DROP POLICY IF EXISTS "Owners can update memberships" ON public.memberships;

CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND org_id = _org_id AND role = 'owner'
  );
$$;

CREATE POLICY "Owners can update memberships in their org"
  ON public.memberships
  FOR UPDATE
  TO authenticated
  USING (public.is_org_owner(auth.uid(), org_id))
  WITH CHECK (public.is_org_owner(auth.uid(), org_id));

-- 5) SUPER ADMIN: server-side check, no client-side email
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) = 'erikballiu19@gmail.com'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
