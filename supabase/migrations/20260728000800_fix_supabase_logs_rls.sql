-- Fixes for the main error patterns seen in supabase_logs.csv
-- 1) memberships insert failing for the org creator (no admin row yet)
-- 2) missing profiles.role column
-- 3) stylist hard-delete violating FK on appointments

-- 1. Add missing role column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client';
UPDATE public.profiles SET role = COALESCE(role, 'client') WHERE role IS NULL;

-- 2. Allow the user who created an org to seed their own membership row
CREATE OR REPLACE FUNCTION public.is_org_creator(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = _org_id AND created_by = _user_id
  );
$$;

DROP POLICY IF EXISTS "Org admins can insert memberships" ON public.memberships;
CREATE POLICY "Org admins can insert memberships"
  ON public.memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_creator(auth.uid(), org_id)
    OR public.is_org_admin(auth.uid(), org_id)
  );

DROP POLICY IF EXISTS "Org admins can update memberships" ON public.memberships;
CREATE POLICY "Org admins can update memberships"
  ON public.memberships
  FOR UPDATE
  TO authenticated
  USING (public.is_org_creator(auth.uid(), org_id) OR public.is_org_admin(auth.uid(), org_id))
  WITH CHECK (public.is_org_creator(auth.uid(), org_id) OR public.is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS "Org admins can delete memberships" ON public.memberships;
CREATE POLICY "Org admins can delete memberships"
  ON public.memberships
  FOR DELETE
  TO authenticated
  USING (public.is_org_creator(auth.uid(), org_id) OR public.is_org_admin(auth.uid(), org_id));

-- 3. Deleting a stylist should not cascade-delete or block appointments
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_stylist_id_fkey;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_stylist_id_fkey
  FOREIGN KEY (stylist_id) REFERENCES public.stylists(id)
  ON DELETE SET NULL;
