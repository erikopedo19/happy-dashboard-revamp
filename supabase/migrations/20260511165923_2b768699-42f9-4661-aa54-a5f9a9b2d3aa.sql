
-- 1. profiles: remove broad public read; add owner-scoped read
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 2. customers: remove all anon/public access
DROP POLICY IF EXISTS "Anon can select customers for booking" ON public.customers;
DROP POLICY IF EXISTS "Anon can update customers for booking" ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
DROP POLICY IF EXISTS "anon_can_insert_customers" ON public.customers;

-- 3. appointments: remove all anon/public access
DROP POLICY IF EXISTS "Anon can view appointments for availability" ON public.appointments;
DROP POLICY IF EXISTS "Public users can view appointments for booking" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "anon_can_insert_appointments" ON public.appointments;

-- 4. memberships: prevent privilege escalation via self-insert
-- (memberships are created via accept_invitation/create_workspace SECURITY DEFINER functions)
DROP POLICY IF EXISTS "Users can insert their memberships" ON public.memberships;

-- 5. stylist_services: remove anon read
DROP POLICY IF EXISTS "Anon can view stylist_services for booking" ON public.stylist_services;

-- 6. SECURITY DEFINER RPC for public booking page (only minimal data)
CREATE OR REPLACE FUNCTION public.get_booked_slots(_business_id uuid, _date date)
RETURNS TABLE(appointment_time time without time zone, service_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.appointment_time, a.service_id
  FROM public.appointments a
  WHERE a.user_id = _business_id
    AND a.appointment_date = _date
    AND COALESCE(a.status, 'scheduled') <> 'cancelled';
$$;

CREATE OR REPLACE FUNCTION public.get_public_stylist_services(_business_id uuid)
RETURNS TABLE(stylist_id uuid, service_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ss.stylist_id, ss.service_id
  FROM public.stylist_services ss
  WHERE ss.user_id = _business_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_slots(uuid, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_stylist_services(uuid) TO anon, authenticated;

-- 7. Pin search_path on functions missing it
ALTER FUNCTION public.update_products_updated_at() SET search_path = public;
ALTER FUNCTION public.accept_invitation(text) SET search_path = public;
ALTER FUNCTION public.generate_org_slug(text) SET search_path = public;
ALTER FUNCTION public.check_stylist_appointment() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 8. Revoke EXECUTE on internal SECURITY DEFINER functions from anon
REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_workspace(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_organizations() FROM anon;
