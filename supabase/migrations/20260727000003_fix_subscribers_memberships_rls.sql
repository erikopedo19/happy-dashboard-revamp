-- Harden subscribers and memberships RLS against privilege escalation

-- 1) SUBSCRIBERS: remove legacy permissive write policies and deny non-service writes.
--    Service role/Edge Functions bypass RLS and remain the only writers.
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "delete_subscription" ON public.subscribers;
REVOKE INSERT, UPDATE, DELETE ON public.subscribers FROM anon, authenticated;

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

CREATE POLICY "Users can view their memberships"
  ON public.memberships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins can insert memberships"
  ON public.memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can update memberships"
  ON public.memberships
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id))
  WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can delete memberships"
  ON public.memberships
  FOR DELETE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), org_id));
