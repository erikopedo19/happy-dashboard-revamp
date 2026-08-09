-- Harden subscribers and memberships RLS against privilege escalation

-- 1) SUBSCRIBERS: remove legacy permissive write policies and deny non-service writes.
--    Service role/Edge Functions bypass RLS and remain the only writers.
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "delete_subscription" ON public.subscribers;
REVOKE INSERT, UPDATE, DELETE ON public.subscribers FROM anon, authenticated;
-- Re-grant UPDATE only for the restrictive owner UPDATE policy below.
GRANT UPDATE ON public.subscribers TO authenticated;

-- Allow users to update their own subscriber row but protect billing fields.
CREATE POLICY "update_own_subscription" ON public.subscribers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Block authenticated users from altering subscription/billing columns.
-- Service role / Edge Functions bypass this trigger by checking the session role.
CREATE OR REPLACE FUNCTION public.subscribers_billing_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.subscribed IS DISTINCT FROM OLD.subscribed
     OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.subscription_end IS DISTINCT FROM OLD.subscription_end
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION 'Billing/subscription fields cannot be modified by clients';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscribers_billing_update_guard ON public.subscribers;
CREATE TRIGGER subscribers_billing_update_guard
BEFORE UPDATE ON public.subscribers
FOR EACH ROW
EXECUTE FUNCTION public.subscribers_billing_update_guard();

-- 2) MEMBERSHIPS: restrict writes to org owners/admins to prevent self-service role escalation.
DROP POLICY IF EXISTS "Users can insert their memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can update their memberships" ON public.memberships;
DROP POLICY IF EXISTS "Owners can update memberships" ON public.memberships;
DROP POLICY IF EXISTS "Owners can update memberships in their org" ON public.memberships;
DROP POLICY IF EXISTS "Users can delete their memberships" ON public.memberships;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id
      AND org_id = _org_id
      AND role IN ('owner', 'admin')
  );
$$;

-- Ensure authenticated users can perform the operations that RLS will gate.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;

DROP POLICY IF EXISTS "Users can view their memberships" ON public.memberships;
CREATE POLICY "Users can view their memberships"
  ON public.memberships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Org admins can insert memberships" ON public.memberships;
CREATE POLICY "Org admins can insert memberships"
  ON public.memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS "Org admins can update memberships" ON public.memberships;
CREATE POLICY "Org admins can update memberships"
  ON public.memberships
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id))
  WITH CHECK (public.is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS "Org admins can delete memberships" ON public.memberships;
CREATE POLICY "Org admins can delete memberships"
  ON public.memberships
  FOR DELETE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));
